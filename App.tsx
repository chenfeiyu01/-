import React, { useState, useEffect, useCallback, useRef, createRef } from 'react';
import { 
  TileType, Player, LogEntry, Tile, HexBuff, NetMessage, NetSyncPayload, PlayerColor
} from './types';
import { INITIAL_TILES, INITIAL_MONEY, SALARY, CHANCE_CARDS, BOARD_SIZE, PLAYER_CONFIGS, POSSIBLE_NAMES, HEX_BUFFS, COLOR_MAP } from './constants';
import { BoardTile } from './components/BoardTile';
import { PlayerToken } from './components/PlayerToken';
import { ControlPanel } from './components/ControlPanel';
import { PlayerCard } from './components/PlayerCard';
import { RotateCcw, Trophy, Play, ArrowUpCircle, DollarSign, Cloud, Sparkles, Skull, Bot, Hexagon, Wifi, Users, Copy } from 'lucide-react';
// @ts-ignore
import { Peer } from 'peerjs';

// Grid mapping (32 tiles -> 9x9)
const getGridStyle = (index: number) => {
  const totalCols = 9;
  const totalRows = 9;
  
  if (index >= 0 && index <= 8) {
    // Bottom Row (Right to Left)
    return { gridColumn: `${totalCols - index}`, gridRow: `${totalRows}` };
  } else if (index >= 9 && index <= 16) {
    // Left Column (Bottom to Top)
    return { gridColumn: '1', gridRow: `${totalRows - (index - 8)}` };
  } else if (index >= 17 && index <= 24) {
    // Top Row (Left to Right)
    // Index 16 is at Col 1. Index 17 should start at Col 2.
    // 17 - 15 = 2.
    return { gridColumn: `${index - 15}`, gridRow: '1' };
  } else {
    // Right Column (Top to Bottom)
    return { gridColumn: `${totalCols}`, gridRow: `${index - 23}` };
  }
};

interface MoneyAnim {
  id: string;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  amount: number;
}

const App: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<'SETUP' | 'LOBBY' | 'PLAYING' | 'GAME_OVER'>('SETUP');
  const [playerCount, setPlayerCount] = useState(4);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tiles, setTiles] = useState<Tile[]>(INITIAL_TILES);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [isAutoPlay, setIsAutoPlay] = useState(false); 
  
  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
      type: 'BUY' | 'BUILD', 
      tileId: number, 
      price: number,
      level?: number
  } | null>(null);
  
  // Hextech System State
  const [hexModalOpen, setHexModalOpen] = useState(false);
  const [availableHexes, setAvailableHexes] = useState<HexBuff[]>([]);
  const [triggerReason, setTriggerReason] = useState<string>('');
  
  // Global Tooltip State
  const [tooltipData, setTooltipData] = useState<{hex: HexBuff, x: number, y: number} | null>(null);

  // Elimination Alert State
  const [eliminatedPlayer, setEliminatedPlayer] = useState<Player | null>(null);

  const [turnCount, setTurnCount] = useState(1);
  const [moneyAnims, setMoneyAnims] = useState<MoneyAnim[]>([]);

  // --- MULTIPLAYER STATE ---
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [inputRoomCode, setInputRoomCode] = useState("");
  const [myPeerId, setMyPeerId] = useState("");
  const [connectedPeers, setConnectedPeers] = useState<any[]>([]); // For Host
  const [hostConn, setHostConn] = useState<any>(null); // For Client
  const [myPlayerId, setMyPlayerId] = useState("p1"); // 'p1' for Host, others for Client

  const peerRef = useRef<any>(null);
  const connectionsRef = useRef<Map<string, any>>(new Map()); // connectionId -> DataConnection

  const logsEndRef = useRef<HTMLDivElement>(null);
  const playerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Refs to handle async state staleness
  const playersRef = useRef(players);
  const tilesRef = useRef(tiles);
  const currentPlayerIndexRef = useRef(currentPlayerIndex);
  const gameStatusRef = useRef(gameStatus);
  const isAutoPlayRef = useRef(isAutoPlay);
  const isHostRef = useRef(isHost);

  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { tilesRef.current = tiles; }, [tiles]);
  useEffect(() => { currentPlayerIndexRef.current = currentPlayerIndex; }, [currentPlayerIndex]);
  useEffect(() => { gameStatusRef.current = gameStatus; }, [gameStatus]);
  useEffect(() => { isAutoPlayRef.current = isAutoPlay; }, [isAutoPlay]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  // --- NETWORK LOGIC ---

  const generateRoomCode = () => Math.floor(1000 + Math.random() * 9000).toString();

  // Host creates room
  const createRoom = () => {
      const code = generateRoomCode();
      setRoomCode(code);
      initPeer(code, true);
  };

  // Client joins room
  const joinRoom = () => {
      if (inputRoomCode.length !== 4) return;
      initPeer(inputRoomCode, false);
  };

  const initPeer = (code: string, host: boolean) => {
      // setIsMultiplayer(true); // Already set in setup
      setGameStatus('LOBBY');

      const fullId = `poly-pop-${code}-${host ? 'host' : Math.floor(Math.random() * 1000)}`;
      
      const peer = new Peer(fullId);
      peerRef.current = peer;

      peer.on('open', (id: string) => {
          setMyPeerId(id);
          if (!host) {
              // Client: Connect to Host
              const conn = peer.connect(`poly-pop-${code}-host`);
              setupClientConnection(conn);
          }
      });

      peer.on('connection', (conn: any) => {
          if (host) {
              setupHostConnection(conn);
          }
      });

      peer.on('error', (err: any) => {
          console.error(err);
          addLog(`网络错误: ${err.type}`, 'danger');
      });
  };

  // HOST: Handle incoming client connections
  const setupHostConnection = (conn: any) => {
      conn.on('open', () => {
          connectionsRef.current.set(conn.peer, conn);
          
          // Add temporary player placeholder for lobby
          setPlayers(prev => {
              const newP = [...prev];
              // Don't add if already exists (reconnect)
              if (!newP.find(p => p.id === conn.peer)) {
                  const idx = newP.length;
                  const config = PLAYER_CONFIGS[idx % PLAYER_CONFIGS.length];
                  newP.push({
                      id: conn.peer,
                      name: `Player ${idx + 1}`,
                      color: config.color,
                      avatar: config.avatar,
                      money: INITIAL_MONEY,
                      position: 0,
                      isJailed: false,
                      jailTurns: 0,
                      isAI: false,
                      properties: [],
                      hexBuffs: [],
                      laps: 0,
                      triggers: { hasStartHex: false, hasFirstLapHex: false, hasLowMoneyHex: false }
                  });
              }
              // Sync new player list to everyone
              broadcastSync(newP, tilesRef.current, 'LOBBY');
              return newP;
          });
      });

      conn.on('data', (data: NetMessage) => {
          handleHostMessage(data, conn.peer);
      });

      conn.on('close', () => {
          connectionsRef.current.delete(conn.peer);
          // Optional: Remove player or mark disconnected
      });
  };

  // CLIENT: Handle connection to host
  const setupClientConnection = (conn: any) => {
      setHostConn(conn);
      conn.on('open', () => {
          setMyPlayerId(peerRef.current.id);
          addLog("已连接到房间！等待房主开始...", 'success');
      });

      conn.on('data', (data: NetMessage) => {
          handleClientMessage(data);
      });
  };

  // HOST: Logic to handle client actions
  const handleHostMessage = (msg: NetMessage, playerId: string) => {
      if (msg.type === 'ACTION') {
          const action = msg.payload;
          // Security check: is it this player's turn?
          const currentP = playersRef.current[currentPlayerIndexRef.current];
          if (currentP.id !== playerId) return; 

          if (action.action === 'ROLL') {
              handleRollDice(currentPlayerIndexRef.current);
          } else if (action.action === 'BUY') {
              setPendingAction({ type: 'BUY', tileId: action.data.tileId, price: action.data.price });
              executePendingAction();
          } else if (action.action === 'BUILD') {
              setPendingAction({ type: 'BUILD', tileId: action.data.tileId, price: action.data.price, level: action.data.level });
              executePendingAction();
          } else if (action.action === 'SELECT_HEX') {
              // Client chose a hex
              const hex = action.data.hex;
              // We need to apply it locally on host
              const pIdx = playersRef.current.findIndex(p => p.id === playerId);
              if (pIdx !== -1) {
                  const newPlayers = [...playersRef.current];
                  newPlayers[pIdx].hexBuffs.push(hex);
                  setPlayers(newPlayers);
                  setHexModalOpen(false);
                  addLog(`${newPlayers[pIdx].name} 选择了海克斯: ${hex.name}`, 'success');
              }
              broadcastGameState();
          } else if (action.action === 'SKIP_ACTION') {
              setModalOpen(false);
              setPendingAction(null);
              nextTurn(currentPlayerIndexRef.current);
          }
      }
  };

  // CLIENT: Logic to handle state updates
  const handleClientMessage = (msg: NetMessage) => {
      if (msg.type === 'SYNC') {
          const payload = msg.payload as NetSyncPayload;
          setPlayers(payload.players);
          setTiles(payload.tiles);
          setCurrentPlayerIndex(payload.currentPlayerIndex);
          setDiceValue(payload.diceValue);
          setIsRolling(payload.isRolling);
          setLogs(payload.logs);
          setTurnCount(payload.turnCount);
          setModalOpen(payload.modalOpen);
          setPendingAction(payload.pendingAction);
          setHexModalOpen(payload.hexModalOpen);
          setAvailableHexes(payload.availableHexes);
          setTriggerReason(payload.triggerReason);
          
          if (payload.moneyAnims && payload.moneyAnims.length > 0) {
              setMoneyAnims(prev => [...prev, ...payload.moneyAnims]);
          }
      } else if (msg.type === 'START_GAME') {
          setGameStatus('PLAYING');
      }
  };

  // HOST: Broadcast state to all clients
  const broadcastGameState = useCallback(() => {
      if (!isHostRef.current || connectionsRef.current.size === 0) return;
      
      const payload: NetSyncPayload = {
          players: playersRef.current,
          tiles: tilesRef.current,
          currentPlayerIndex: currentPlayerIndexRef.current,
          diceValue: diceValue,
          isRolling: isRolling,
          logs: logs,
          turnCount: turnCount,
          modalOpen: modalOpen,
          pendingAction: pendingAction,
          hexModalOpen: hexModalOpen,
          availableHexes: availableHexes,
          triggerReason: triggerReason,
          moneyAnims: [] // We sync anims separately usually, or rely on state changes
      };

      broadcastSyncRaw(payload);
  }, [diceValue, isRolling, logs, turnCount, modalOpen, pendingAction, hexModalOpen, availableHexes, triggerReason]);

  const broadcastSync = (p: Player[], t: Tile[], status?: string) => {
      if (!isHostRef.current) return;
      // Partial sync for lobby
      connectionsRef.current.forEach(conn => {
          conn.send({ type: 'SYNC', payload: { players: p, tiles: t, logs: [], moneyAnims: [] } });
          if (status === 'START') conn.send({ type: 'START_GAME' });
      });
  };

  const broadcastSyncRaw = (payload: NetSyncPayload) => {
      connectionsRef.current.forEach(conn => {
          conn.send({ type: 'SYNC', payload });
      });
  };

  // Automatically broadcast on state change for HOST
  useEffect(() => {
      if (isHost && gameStatus === 'PLAYING') {
          broadcastGameState();
      }
  }, [players, tiles, currentPlayerIndex, diceValue, isRolling, modalOpen, hexModalOpen, isHost, gameStatus, broadcastGameState]);

  // --- ACTIONS WRAPPERS ---

  const requestAction = (action: string, data?: any) => {
      if (isMultiplayer && !isHost) {
          hostConn?.send({ type: 'ACTION', payload: { action, data } });
      } else {
          // I am Host or Single Player
          if (action === 'ROLL') handleRollDice(currentPlayerIndex);
          else if (action === 'BUY') executePendingAction(); // data is implicit in pendingAction
          else if (action === 'BUILD') executePendingAction();
          else if (action === 'SKIP_ACTION') {
              setModalOpen(false);
              setPendingAction(null);
              nextTurn(currentPlayerIndex);
          }
          else if (action === 'SELECT_HEX') selectHex(data.hex);
      }
  };

  // --- EXISTING LOGIC MODIFIED ---

  const initHostLobby = () => {
      // Host automatically adds self as P1
      const p1: Player = {
          id: 'p1',
          name: 'Host (You)',
          color: PLAYER_CONFIGS[0].color,
          avatar: PLAYER_CONFIGS[0].avatar,
          money: INITIAL_MONEY,
          position: 0,
          isJailed: false,
          jailTurns: 0,
          isAI: false,
          properties: [],
          hexBuffs: [],
          laps: 0,
          triggers: { hasStartHex: false, hasFirstLapHex: false, hasLowMoneyHex: false }
      };
      setPlayers([p1]);
      setMyPlayerId('p1');
  };

  const exitLobby = () => {
      if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
      }
      connectionsRef.current.clear();
      setHostConn(null);
      
      setPlayers([]);
      setGameStatus('SETUP');
      setIsMultiplayer(false);
      setIsHost(false);
      setRoomCode("");
      setInputRoomCode("");
  };

  const startMultiplayerGame = () => {
      // Fill remaining spots with AI? Or just start with current humans?
      // For simplicity, let's fill up to 4 with AI if needed, or just play with humans.
      // Let's just use current connected players.
      if (players.length < 2) {
          alert("至少需要 2 名玩家才能开始游戏！\n请等待朋友加入，或开启另一个浏览器窗口测试。");
          return;
      }
      
      // Init game state
      setTiles(INITIAL_TILES.map(t => ({...t, ownerId: null, level: 0}))); 
      setCurrentPlayerIndex(0);
      setDiceValue(null);
      setWinner(null);
      setLogs([]);
      setTurnCount(1);
      setIsAutoPlay(false);
      setGameStatus('PLAYING');

      // Trigger Start Hex for everyone
      const newPlayers = [...players];
      newPlayers.forEach((p, i) => {
          // Auto-assign start hex for MP to keep flow smooth.
          const opts = pickRandomHexes();
          p.hexBuffs.push(opts[0]);
          p.triggers.hasStartHex = true; 
      });
      setPlayers(newPlayers);
      
      // Send Start Signal
      connectionsRef.current.forEach(conn => {
          conn.send({ type: 'START_GAME' });
          conn.send({ type: 'SYNC', payload: { 
              players: newPlayers, 
              tiles: INITIAL_TILES, 
              currentPlayerIndex: 0, 
              logs: [{id:'0', message:'游戏开始！', type:'info'}],
              turnCount: 1,
              modalOpen: false,
              hexModalOpen: false
          }});
      });
  };

  // --- Tooltip Handlers ---
  const handleHexEnter = (e: React.MouseEvent, hex: HexBuff) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setTooltipData({
          hex,
          x: rect.left + rect.width / 2,
          y: rect.top
      });
  };
  
  const handleHexLeave = () => {
      setTooltipData(null);
  };

  // --- Hextech Logic ---
  const pickRandomHexes = () => {
      const shuffled = [...HEX_BUFFS].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 3);
  };

  const hasHex = (player: Player, effectId: string) => {
      return player.hexBuffs.some(r => r.effectId === effectId);
  };

  // Central trigger check function
  const checkHexTriggers = (playerIdx: number, playersList: Player[]) => {
      const player = playersList[playerIdx];
      if (!player) return false;
      
      // In Multiplayer, we simplify: only show modal for current player on their screen
      // Host handles logic.
      
      let triggerFound = false;
      let reason = "";

      // 1. Game Start (Usually handled in startGame, but safety check)
      if (!player.triggers.hasStartHex) {
          triggerFound = true;
          reason = "游戏开始奖励";
          player.triggers.hasStartHex = true;
      }
      // 2. First Lap
      else if (player.laps >= 1 && !player.triggers.hasFirstLapHex) {
          triggerFound = true;
          reason = "完成首圈环游奖励";
          player.triggers.hasFirstLapHex = true;
      }
      // 3. Low Money Crisis
      else if (player.money < 1000 && !player.triggers.hasLowMoneyHex && player.money >= 0) {
          triggerFound = true;
          reason = "绝境求生补助";
          player.triggers.hasLowMoneyHex = true;
      }

      if (triggerFound) {
          if (player.isAI || (player.id === 'p1' && isAutoPlayRef.current)) {
              const options = pickRandomHexes();
              const choice = options[0];
              player.hexBuffs.push(choice);
              addLog(`${player.name} 触发[${reason}]，自动获得: ${choice.name}`, 'info');
          } else {
              // Human manual select
              // If MP and it's not host (and logic runs on host), we need to tell client to open modal
              // We do this by setting hexModalOpen state on Host, which syncs to Client.
              // We check if the player is the Host or a Client.
              
              setAvailableHexes(pickRandomHexes());
              setTriggerReason(reason);
              setHexModalOpen(true);
              return true; 
          }
      }
      return false;
  };

  const selectHex = (hex: HexBuff) => {
      if (isMultiplayer && !isHost) {
          requestAction('SELECT_HEX', { hex });
          return;
      }

      const newPlayers = playersRef.current.map((p, i) => {
          if (i === currentPlayerIndex) {
              return { ...p, hexBuffs: [...p.hexBuffs, hex] };
          }
          return p;
      });
      
      setPlayers(newPlayers);
      const player = newPlayers[currentPlayerIndex];
      addLog(`${player.name} 选择了海克斯: ${hex.name}`, 'success');
      setHexModalOpen(false);
  };

  // --- Initialization ---
  const startGame = (count: number) => {
    // Single Player Setup
    setIsMultiplayer(false);
    setIsHost(false);
    const newPlayers: Player[] = [];
    newPlayers.push({
        id: 'p1',
        name: '你 (玩家)',
        color: PLAYER_CONFIGS[0].color,
        avatar: PLAYER_CONFIGS[0].avatar,
        money: INITIAL_MONEY,
        position: 0,
        isJailed: false,
        jailTurns: 0,
        isAI: false,
        properties: [],
        hexBuffs: [],
        laps: 0,
        triggers: { hasStartHex: false, hasFirstLapHex: false, hasLowMoneyHex: false }
    });

    for (let i = 1; i < count; i++) {
        const config = PLAYER_CONFIGS[i % PLAYER_CONFIGS.length];
        newPlayers.push({
            id: `cpu_${i}`,
            name: POSSIBLE_NAMES[i - 1] || `Bot ${i}`,
            color: config.color,
            avatar: config.avatar,
            money: INITIAL_MONEY,
            position: 0,
            isJailed: false,
            jailTurns: 0,
            isAI: true,
            properties: [],
            riskTolerance: Math.random() * 0.5 + 0.3,
            hexBuffs: [],
            laps: 0,
            triggers: { hasStartHex: false, hasFirstLapHex: false, hasLowMoneyHex: false }
        });
    }
    
    // Trigger AIs Initial Hex immediately
    for(let i=1; i<newPlayers.length; i++) {
       const ai = newPlayers[i];
       const opts = pickRandomHexes();
       ai.hexBuffs.push(opts[0]);
       ai.triggers.hasStartHex = true;
    }

    setPlayers(newPlayers);
    setTiles(INITIAL_TILES.map(t => ({...t, ownerId: null, level: 0}))); 
    setCurrentPlayerIndex(0);
    setDiceValue(null);
    setWinner(null);
    setLogs([]);
    setTurnCount(1);
    setIsAutoPlay(false);
    setGameStatus('PLAYING');
    addLog(`游戏开始！共有 ${count} 位玩家参与。`, 'info');

    if (!isAutoPlayRef.current) {
        setAvailableHexes(pickRandomHexes());
        setTriggerReason("游戏开始奖励");
        setHexModalOpen(true);
        newPlayers[0].triggers.hasStartHex = true;
    } else {
        const opts = pickRandomHexes();
        newPlayers[0].hexBuffs.push(opts[0]);
        newPlayers[0].triggers.hasStartHex = true;
    }
  };

  // --- Logging ---
  const addLog = (message: string, type: 'info' | 'success' | 'danger' | 'warning' = 'info') => {
    setLogs(prev => [...prev.slice(-15), { id: Date.now().toString() + Math.random(), message, type }]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- Animation System ---
  const triggerMoneyAnimation = (fromId: string | 'BANK', toId: string | 'BANK', amount: number) => {
      // Animation is visual only, but if we are host, we should probably sync it
      // For simplicity, we just set it locally. The sync will pick up anims if we put them in state.
      // But coords are local dom based.
      // Let's keep it local for now, it's just eye candy.
      
      const getCoords = (id: string): {x: number, y: number} => {
          if (id === 'BANK') {
              return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
          }
          const el = playerRefs.current.get(id);
          if (el) {
              const rect = el.getBoundingClientRect();
              return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          }
          return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      };

      const start = getCoords(fromId);
      const end = getCoords(toId);
      const animId = Date.now() + Math.random().toString();

      setMoneyAnims(prev => [...prev, {
          id: animId,
          sx: start.x,
          sy: start.y,
          ex: end.x,
          ey: end.y,
          amount
      }]);

      setTimeout(() => {
          setMoneyAnims(prev => prev.filter(a => a.id !== animId));
      }, 1000);
  };

  // --- Game Logic ---

  const nextTurn = useCallback((lastPlayerIndex: number) => {
    if (gameStatusRef.current !== 'PLAYING') return;

    // Only Host or Single Player runs logic
    if (isMultiplayer && !isHost) return;

    setDiceValue(null);
    const currentPlayers = playersRef.current;
    
    const activePlayersCount = currentPlayers.filter(p => p.money >= 0).length;
    if (activePlayersCount <= 1) {
        const win = currentPlayers.find(p => p.money >= 0);
        if (win) {
            setWinner(win);
            setGameStatus('GAME_OVER');
        }
        return;
    }

    let nextIndex = (lastPlayerIndex + 1) % currentPlayers.length;
    while (currentPlayers[nextIndex].money < 0) {
        nextIndex = (nextIndex + 1) % currentPlayers.length;
    }

    setCurrentPlayerIndex(nextIndex);
    if (nextIndex === 0) setTurnCount(c => c + 1);

    const nextPlayer = currentPlayers[nextIndex];
    
    // Check triggers at start of turn
    const paused = checkHexTriggers(nextIndex, currentPlayers);
    if (paused) return; // Wait for user to pick

    const isAuto = nextPlayer.isAI || (nextPlayer.id === 'p1' && isAutoPlayRef.current && !isMultiplayer);

    if (isAuto) {
      setTimeout(() => {
          handleRollDice(nextIndex);
      }, 1000);
    }
  }, [isMultiplayer, isHost]); 

  // Watch for AutoPlay toggle to trigger turn if stuck
  useEffect(() => {
      if (isAutoPlay && !isMultiplayer) {
          if (gameStatusRef.current === 'PLAYING' && !diceValue && !isRolling && !modalOpen && !hexModalOpen) {
              const player = playersRef.current[currentPlayerIndex];
              if (player && !player.isAI && player.id === 'p1') {
                  handleRollDice(currentPlayerIndex);
              }
          }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoPlay]);

  const handleLandOnTile = useCallback((playerIndex: number, finalPosition: number) => {
    // Only Host Logic
    if (isMultiplayer && !isHostRef.current) return;

    const currentTiles = tilesRef.current;
    const currentPlayers = playersRef.current;
    const tile = currentTiles[finalPosition];
    
    const updatedPlayers = [...currentPlayers];
    const currentPlayer = {...updatedPlayers[playerIndex]};
    updatedPlayers[playerIndex] = currentPlayer;

    if (currentPlayer.money < 0) {
        nextTurn(playerIndex);
        return;
    }

    let shouldPauseForUser = false;
    const isAuto = currentPlayer.isAI || (currentPlayer.id === 'p1' && isAutoPlayRef.current && !isMultiplayer);

    switch (tile.type) {
        case TileType.PROPERTY:
            if (tile.ownerId === null) {
                // Buy Logic
                let buyCost = tile.price || 1000;
                if (hasHex(currentPlayer, 'BUILD_DISCOUNT')) buyCost = Math.floor(buyCost * 0.7);

                if (isAuto) {
                    const riskFactor = currentPlayer.riskTolerance || 0.5;
                    const threshold = 2000 * (1 - riskFactor); 
                    const shouldBuy = currentPlayer.isAI 
                        ? (currentPlayer.money >= buyCost && (currentPlayer.money - buyCost > threshold))
                        : (currentPlayer.money >= buyCost);

                    if (shouldBuy) {
                         currentPlayer.money -= buyCost;
                         currentPlayer.properties.push(tile.id);
                         const updatedTiles = [...currentTiles];
                         updatedTiles[finalPosition] = { ...tile, ownerId: currentPlayer.id };
                         setTiles(updatedTiles);
                         triggerMoneyAnimation(currentPlayer.id, 'BANK', buyCost);
                         addLog(`${currentPlayer.name} 购入 ${tile.name} (¥${buyCost})`, 'success');
                    }
                } else {
                    if (currentPlayer.money >= buyCost) {
                        setPendingAction({ type: 'BUY', tileId: tile.id, price: buyCost });
                        setModalOpen(true);
                        shouldPauseForUser = true;
                    } else {
                        addLog("资金不足，无法购买", 'warning');
                    }
                }
            } else if (tile.ownerId === currentPlayer.id) {
                // Build Logic
                let buildCost = (tile.price || 1000) * 0.5;
                if (hasHex(currentPlayer, 'BUILD_DISCOUNT')) buildCost = Math.floor(buildCost * 0.7);

                let levelsToBuild = 1;
                if (hasHex(currentPlayer, 'DOUBLE_BUILD')) levelsToBuild = 2;

                if (tile.level < 5) {
                    // Cap at 5
                    if (tile.level + levelsToBuild > 5) levelsToBuild = 5 - tile.level;

                    if (isAuto) {
                         const shouldBuild = currentPlayer.isAI 
                            ? (currentPlayer.money > buildCost * 2)
                            : (currentPlayer.money > buildCost);

                         if (shouldBuild) {
                             currentPlayer.money -= buildCost;
                             const updatedTiles = [...currentTiles];
                             updatedTiles[finalPosition] = { ...tile, level: tile.level + levelsToBuild };
                             setTiles(updatedTiles);
                             triggerMoneyAnimation(currentPlayer.id, 'BANK', buildCost);
                             addLog(`${currentPlayer.name} 在 ${tile.name} 升级了房产`, 'success');
                         }
                    } else {
                        if (currentPlayer.money >= buildCost) {
                            setPendingAction({ type: 'BUILD', tileId: tile.id, price: buildCost, level: tile.level });
                            setModalOpen(true);
                            shouldPauseForUser = true;
                        }
                    }
                }
            } else {
                // Pay Rent
                const baseRent = tile.rent || 0;
                let finalRent = baseRent * (1 + 0.5 * tile.level);
                
                const ownerIndex = updatedPlayers.findIndex(p => p.id === tile.ownerId);
                if (ownerIndex !== -1 && updatedPlayers[ownerIndex].money >= 0) {
                    const owner = updatedPlayers[ownerIndex];
                    
                    if (hasHex(owner, 'RENT_BOOST')) finalRent = Math.floor(finalRent * 1.3);
                    if (hasHex(currentPlayer, 'ABSORB_RENT')) currentPlayer.money += Math.floor(finalRent * 0.2);
                    if (hasHex(currentPlayer, 'ROBBERY')) {
                         const stealAmt = 200;
                         if (owner.money >= stealAmt) {
                             currentPlayer.money += stealAmt;
                             owner.money -= stealAmt;
                             addLog(`${currentPlayer.name} 妙手空空！偷了 ${owner.name} ¥200`, 'warning');
                         }
                    }

                    currentPlayer.money -= finalRent;
                    updatedPlayers[ownerIndex] = {
                        ...owner,
                        money: owner.money + finalRent
                    };
                    triggerMoneyAnimation(currentPlayer.id, owner.id, finalRent);
                    addLog(`${currentPlayer.name} 支付租金 ¥${finalRent.toFixed(0)} 给 ${owner.name}`, 'danger');
                }
            }
            break;

        case TileType.CHANCE:
        case TileType.CASINO:
            const card = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
            let amount = card.money;
            currentPlayer.money += amount;
            if (amount > 0) triggerMoneyAnimation('BANK', currentPlayer.id, amount);
            else triggerMoneyAnimation(currentPlayer.id, 'BANK', Math.abs(amount));
            addLog(`${tile.name}: ${card.text}`, amount > 0 ? 'success' : 'danger');
            break;

        case TileType.JAIL:
            if (tile.id === 24) {
                if (hasHex(currentPlayer, 'JAIL_BREAK')) {
                    addLog(`${currentPlayer.name} 使用越狱大师，免于坐牢！`, 'success');
                } else {
                    addLog(`${currentPlayer.name} 被捕入狱！`, 'danger');
                    currentPlayer.position = 8;
                    currentPlayer.isJailed = true;
                    currentPlayer.jailTurns = 3;
                }
            }
            break;

        case TileType.TAX:
            let tax = tile.rent || 500;
            if (hasHex(currentPlayer, 'TAX_EXEMPT')) {
                addLog(`${currentPlayer.name} 避税天堂生效，免除税款！`, 'success');
                tax = 0;
            }
            currentPlayer.money -= tax;
            if (tax > 0) {
                triggerMoneyAnimation(currentPlayer.id, 'BANK', tax);
                addLog(`${currentPlayer.name} 缴税 ¥${tax}`, 'danger');
            }
            break;
    }

    // Bankruptcy Check
    if (currentPlayer.money < 0) {
        setEliminatedPlayer(currentPlayer);
        setTimeout(() => setEliminatedPlayer(null), 3000);
        addLog(`${currentPlayer.name} 破产了！`, 'danger');
        const updatedTiles = currentTiles.map(t => t.ownerId === currentPlayer.id ? { ...t, ownerId: null, level: 0 } : t);
        setTiles(updatedTiles);
    }

    // --- CHECK CRISIS HEX TRIGGER ---
    setPlayers(updatedPlayers);
    const paused = checkHexTriggers(playerIndex, updatedPlayers);
    
    if (!shouldPauseForUser && !paused) nextTurn(playerIndex);

  }, [nextTurn, isMultiplayer]); // Added dependencies

  const executePendingAction = () => {
      if (isMultiplayer && !isHost) {
          // If Client, send action
          if (pendingAction) {
              requestAction(pendingAction.type, { 
                  tileId: pendingAction.tileId, 
                  price: pendingAction.price, 
                  level: pendingAction.level 
              });
          }
          return;
      }

      if (!pendingAction) return;
      const currentPlayers = [...playersRef.current];
      const currentTiles = [...tilesRef.current];
      const player = currentPlayers[currentPlayerIndex];
      const tileIndex = currentTiles.findIndex(t => t.id === pendingAction.tileId);
      const tile = currentTiles[tileIndex];

      if (player && tileIndex !== -1) {
          player.money -= pendingAction.price;
          triggerMoneyAnimation(player.id, 'BANK', pendingAction.price);

          if (pendingAction.type === 'BUY') {
             player.properties.push(pendingAction.tileId);
             currentTiles[tileIndex] = { ...tile, ownerId: player.id, level: 0 };
             addLog(`${player.name} 购入 ${tile.name}`, 'success');
          } else if (pendingAction.type === 'BUILD') {
             let levels = 1;
             if (hasHex(player, 'DOUBLE_BUILD')) levels = 2;
             const newLevel = Math.min(5, tile.level + levels);
             currentTiles[tileIndex] = { ...tile, level: newLevel };
             addLog(`${player.name} 升级了 ${tile.name} (Lv.${newLevel})`, 'success');
          }
          
          setPlayers(currentPlayers);
          setTiles(currentTiles);
      }
      setModalOpen(false);
      setPendingAction(null);
      
      const paused = checkHexTriggers(currentPlayerIndex, currentPlayers);
      if (!paused) nextTurn(currentPlayerIndex);
  };

  const handleRollDice = async (playerIdx: number) => {
    if (isMultiplayer && !isHost) {
        requestAction('ROLL');
        return;
    }

    if (gameStatusRef.current !== 'PLAYING') return;
    const player = playersRef.current[playerIdx];
    if (!player) return;

    if (player.isJailed) {
       const newPlayers = [...playersRef.current];
       if (player.jailTurns > 0) {
           addLog(`${player.name} 狱中... (${player.jailTurns})`, 'warning');
           newPlayers[playerIdx].jailTurns -= 1;
           if (newPlayers[playerIdx].jailTurns === 0) newPlayers[playerIdx].isJailed = false;
           setPlayers(newPlayers);
           nextTurn(playerIdx);
           return;
       }
    }

    setIsRolling(true);
    // Broadcast rolling state
    if (isHost) broadcastGameState();

    const interval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      let finalRoll = Math.floor(Math.random() * 6) + 1;
      if (hasHex(player, 'DICE_BOOST')) finalRoll += 1;
      
      setDiceValue(finalRoll);
      setIsRolling(false);
      movePlayer(playerIdx, finalRoll);
    }, 600);
  };

  const movePlayer = (playerIdx: number, steps: number) => {
    let currentPos = playersRef.current[playerIdx].position;
    let stepsLeft = steps;
    
    const stepInterval = setInterval(() => {
        const prevPos = currentPos;
        currentPos = (currentPos + 1) % BOARD_SIZE;
        
        // Pass Start Logic
        if (currentPos === 0) {
             const pList = [...playersRef.current];
             const p = pList[playerIdx];
             if (p) {
                 p.laps += 1;
                 let salary = SALARY;
                 if (hasHex(p, 'SALARY_BOOST')) salary *= 2;
                 if (hasHex(p, 'BANK_INTEREST')) {
                     const interest = Math.floor(p.money * 0.1);
                     p.money += interest;
                 }
                 p.money += salary;
                 triggerMoneyAnimation('BANK', p.id, salary);
                 addLog(`${p.name} 经过起点，获得工资 ¥${salary}`, 'success');

                 const paused = checkHexTriggers(playerIdx, pList);
                 if (paused) {
                     clearInterval(stepInterval); 
                     setPlayers(pList);
                 }
             }
             setPlayers(pList);
        }

        setPlayers(prev => {
            const p = [...prev];
            if (p[playerIdx]) p[playerIdx].position = currentPos;
            return p;
        });

        stepsLeft--;
        if (stepsLeft === 0) {
            clearInterval(stepInterval);
            
            const pList = [...playersRef.current];
            const paused = checkHexTriggers(playerIdx, pList);

            if (!paused) {
                setTimeout(() => {
                    handleLandOnTile(playerIdx, currentPos);
                }, 300);
            }
        }
    }, 150);
  };

  // --- RENDER ---
  const currentPlayer = players[currentPlayerIndex];

  if (gameStatus === 'LOBBY') {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-sky-50 relative overflow-hidden">
              {/* EXIT BUTTON */}
              <button 
                onClick={exitLobby} 
                className="absolute top-6 left-6 p-3 bg-white rounded-full shadow-md text-slate-500 hover:text-slate-800 hover:scale-110 transition-all z-20"
                title="返回主页"
              >
                  <RotateCcw size={24} />
              </button>

              <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full text-center border-4 border-slate-100 relative z-10">
                  <h2 className="text-3xl font-black mb-6 text-slate-800 flex items-center justify-center gap-3">
                      <Users size={32} /> {isHost ? "游戏大厅 (房主)" : "游戏大厅"}
                  </h2>
                  
                  {isHost ? (
                      <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-100 mb-6">
                          <p className="text-slate-500 font-bold mb-2">房间号 (邀请码)</p>
                          <div className="text-6xl font-black text-emerald-600 tracking-widest flex items-center justify-center gap-4 cursor-pointer" onClick={() => navigator.clipboard.writeText(roomCode)}>
                              {roomCode}
                              <Copy size={24} className="opacity-50 hover:opacity-100" />
                          </div>
                      </div>
                  ) : (
                      <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-100 mb-6">
                          <p className="text-slate-500 font-bold mb-2">已连接到房间</p>
                          <div className="text-4xl font-black text-blue-600 tracking-widest">
                             Waiting...
                          </div>
                      </div>
                  )}

                  <div className="mb-8">
                      <h3 className="font-bold text-left mb-2 text-slate-400 uppercase text-sm">已加入玩家 ({players.length})</h3>
                      <div className="space-y-2">
                          {players.map(p => (
                              <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                  <div className={`w-8 h-8 rounded-lg ${COLOR_MAP[p.color].bg} flex items-center justify-center text-white`}>{p.avatar}</div>
                                  <span className="font-bold text-slate-700">{p.name}</span>
                                  {p.id === myPlayerId && <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-500 font-bold">YOU</span>}
                                  {p.id === 'p1' && <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded font-bold">HOST</span>}
                              </div>
                          ))}
                      </div>
                  </div>

                  {isHost ? (
                      <button onClick={startMultiplayerGame} className="w-full py-4 bg-emerald-500 text-white rounded-xl text-xl font-black hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-200">
                          开始游戏
                      </button>
                  ) : (
                      <div className="text-slate-400 font-bold animate-pulse">等待房主开始游戏...</div>
                  )}
              </div>
          </div>
      );
  }

  if (gameStatus === 'SETUP') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
         <div className="absolute top-10 left-10 text-blue-200 opacity-60 animate-float"><Cloud size={120} fill="currentColor" /></div>
         <div className="absolute bottom-20 right-20 text-blue-200 opacity-60 animate-float-delayed"><Cloud size={100} fill="currentColor" /></div>

        <div className="relative z-10 p-10 bg-white neo-border shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-[3rem] text-center max-w-md w-full transform rotate-[-1deg]">
            <h1 className="text-6xl font-black mb-2 text-black tracking-tighter drop-shadow-sm">
                POLY<span className="text-sky-500">POP</span>
            </h1>
            <p className="text-slate-500 font-bold mb-8 text-xl tracking-widest">3D CARTOON TYCOON</p>
            
            {/* TABS */}
            <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
                 <button 
                    onClick={() => setIsMultiplayer(false)} 
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${!isMultiplayer ? 'bg-white shadow-sm text-black' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                    单机模式
                 </button>
                 <button 
                    onClick={() => { setIsMultiplayer(true); setIsHost(true); }}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${isMultiplayer ? 'bg-white shadow-sm text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                    联机大厅
                 </button>
            </div>

            {!isMultiplayer ? (
                <>
                    <div className="bg-yellow-50 p-6 rounded-3xl border-2 border-black/10 mb-8">
                        <p className="text-black font-black text-lg mb-4 uppercase tracking-wide">Players</p>
                        <div className="flex items-center justify-center gap-6">
                            <button onClick={() => setPlayerCount(c => Math.max(2, c - 1))} className="w-16 h-16 rounded-2xl bg-white border-b-4 border-slate-300 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center text-3xl font-black">-</button>
                            <span className="text-6xl font-black w-20 text-center text-slate-800">{playerCount}</span>
                            <button onClick={() => setPlayerCount(c => Math.min(8, c + 1))} className="w-16 h-16 rounded-2xl bg-white border-b-4 border-slate-300 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center text-3xl font-black">+</button>
                        </div>
                    </div>
                    <button onClick={() => startGame(playerCount)} className="w-full py-6 bg-sky-400 text-white text-3xl font-black rounded-2xl border-b-8 border-sky-700 active:border-b-0 active:translate-y-2 transition-all shadow-lg flex items-center justify-center gap-3">
                        START
                    </button>
                </>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="bg-sky-50 p-6 rounded-3xl border-2 border-sky-100 mb-4">
                        <p className="text-sky-800 font-bold mb-4">局域网/互联网联机</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => { initHostLobby(); createRoom(); }} className="w-full py-4 bg-sky-500 text-white font-black rounded-xl hover:bg-sky-600 shadow-md flex items-center justify-center gap-2">
                                <Wifi /> 创建房间 (房主)
                            </button>
                            
                            <div className="relative mt-2">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-sky-200"></div></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-sky-50 px-2 text-sky-400 font-bold">OR JOIN</span></div>
                            </div>
                            
                            <div className="flex gap-2 mt-2">
                                <input 
                                    type="text" 
                                    placeholder="输入房间号" 
                                    maxLength={4}
                                    value={inputRoomCode}
                                    onChange={(e) => setInputRoomCode(e.target.value)}
                                    className="flex-1 px-4 rounded-xl border-2 border-slate-200 font-black text-center text-xl focus:border-sky-500 outline-none"
                                />
                                <button onClick={joinRoom} className="px-6 bg-slate-800 text-white font-black rounded-xl hover:bg-slate-700">
                                    加入
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    );
  }
  
  // Logic to determine if controls are active
  // If MP: Only active if it's my turn AND I am connected (myPlayerId matches current player ID)
  // If SP: Always active unless rolling/modal
  const isMyTurn = isMultiplayer 
    ? (currentPlayer?.id === myPlayerId) 
    : (!currentPlayer?.isAI && !isAutoPlay);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden relative perspective-container">
      
      {/* GLOBAL TOOLTIP (Fixed Z-Index High) */}
      {tooltipData && (
          <div 
              className="fixed z-[99999] pointer-events-none bg-slate-800 text-white p-3 rounded-xl shadow-xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-150"
              style={{ 
                  left: tooltipData.x, 
                  top: tooltipData.y - 10, 
                  transform: 'translate(-50%, -100%)' 
              }}
          >
              <div className={`font-black text-xs mb-1 uppercase tracking-wider ${
                    tooltipData.hex.rarity === 'PRISMATIC' ? 'text-purple-300' : 
                    tooltipData.hex.rarity === 'GOLD' ? 'text-amber-300' : 'text-slate-300'
              }`}>
                  {tooltipData.hex.name}
              </div>
              <div className="text-[10px] leading-tight opacity-90 max-w-[120px] text-center">
                  {tooltipData.hex.description}
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
          </div>
      )}

      {/* Network Info HUD */}
      {isMultiplayer && (
          <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-1">
              <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg">
                  <Wifi size={12} className={hostConn || connectionsRef.current.size > 0 ? "text-green-400" : "text-slate-400"} />
                  {isHost ? `Room: ${roomCode}` : `Connected`}
              </div>
              <div className="bg-white/90 backdrop-blur px-2 py-1 rounded border border-slate-200 text-[10px] font-bold text-slate-500">
                  ID: {myPlayerId.substring(0,6)}...
              </div>
          </div>
      )}

      {/* Background Elements */}
      <div className="fixed top-[10%] left-[5%] text-white/40 animate-float pointer-events-none z-0">
        <Cloud size={180} fill="currentColor" />
      </div>
      <div className="fixed bottom-[15%] right-[5%] text-white/30 animate-float-delayed pointer-events-none z-0">
        <Cloud size={140} fill="currentColor" />
      </div>

      {moneyAnims.map(anim => (
          <div 
            key={anim.id} 
            className="flying-money flex items-center gap-1"
            style={{ '--sx': `${anim.sx}px`, '--sy': `${anim.sy}px`, '--ex': `${anim.ex}px`, '--ey': `${anim.ey}px` } as React.CSSProperties}
          >
             <DollarSign size={28} strokeWidth={4} className="drop-shadow-sm"/> 
             <span className="text-2xl">{anim.amount.toFixed(0)}</span>
          </div>
      ))}

      <div className="absolute top-4 left-4 z-50 flex gap-2">
         <button 
            onClick={() => setGameStatus('SETUP')} 
            className="p-3 bg-white rounded-xl border-b-4 border-slate-300 hover:bg-rose-50 active:border-b-0 active:translate-y-1 transition-all text-slate-700"
            title="Exit / Restart"
         >
           <RotateCcw size={24} strokeWidth={3} />
         </button>
         
         {!isMultiplayer && (
             <button 
                onClick={() => setIsAutoPlay(!isAutoPlay)}
                className={`
                    p-3 rounded-xl border-b-4 transition-all text-slate-700 flex items-center gap-2 font-black
                    ${isAutoPlay 
                        ? 'bg-green-400 border-green-600 text-white active:translate-y-1 active:border-b-0' 
                        : 'bg-white border-slate-300 hover:bg-green-50 active:translate-y-1 active:border-b-0'
                    }
                `}
                title="Toggle Auto Play"
             >
               <Bot size={24} strokeWidth={3} />
               {isAutoPlay && <span className="text-xs">托管中</span>}
             </button>
         )}
      </div>

      <div className="flex-1 flex items-center justify-center w-full h-full p-4 perspective-stage">
        
        {/* 3D TILT CONTAINER */}
        <div 
            className="relative aspect-square h-full max-h-[95vh] max-w-[95vh] w-full flex flex-col transition-transform duration-700"
            style={{ 
                transform: 'rotateX(20deg) scale(0.95)', 
                transformStyle: 'preserve-3d' 
            }}
        >
             <div className="absolute inset-0 bg-black/10 translate-y-10 blur-2xl rounded-full z-[-1]" />

             <div className="grid grid-cols-9 grid-rows-9 gap-1 bg-slate-50 p-2 rounded-[2.5rem] shadow-[0px_10px_0px_0px_rgba(0,0,0,0.1)] w-full h-full border-4 border-white/50 backdrop-blur-sm">
                 {Array.from({ length: BOARD_SIZE }).map((_, index) => {
                   const tile = tiles[index];
                   if (!tile) return null;
                   const style = getGridStyle(index);
                   const playersHere = players.filter(p => p.position === index && p.money >= 0);
                   const owner = tile.ownerId ? players.find(p => p.id === tile.ownerId) : null;
                   
                   const rowIndex = parseInt(style.gridRow as string) || 1;

                   return (
                     <div key={tile.id} style={{ ...style, zIndex: rowIndex * 10 }} className="relative min-w-0 min-h-0">
                        <BoardTile 
                            tile={tile} 
                            ownerColor={owner?.color}
                            playersOnTile={playersHere.map((p, idx) => (
                                <PlayerToken key={p.id} player={p} index={idx} totalOnTile={playersHere.length} />
                            ))}
                        />
                     </div>
                   );
                 })}

                 {/* CENTER CONTROL PIT */}
                 <div className="col-start-2 col-end-9 row-start-2 row-end-9 flex flex-col p-2 relative z-0">
                     <div className="absolute inset-0 bg-slate-200/50 rounded-xl shadow-inner border-4 border-white/40" />
                     
                     <div className="relative z-10 flex flex-col h-full gap-2 p-1 sm:p-4">
                        {winner ? (
                            <div className="flex flex-col items-center justify-center h-full animate-bounce">
                                <Trophy size={120} className="text-yellow-400 drop-shadow-lg mb-4" strokeWidth={3} fill="currentColor" />
                                <h2 className="text-5xl font-black text-slate-800 tracking-tighter">WINNER!</h2>
                                <div className="bg-white px-10 py-3 rounded-full border-b-8 border-slate-200 text-3xl font-black text-slate-800 mt-4">
                                    {winner.name}
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Player Cards Grid */}
                                <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide mask-image-gradient">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 auto-rows-min pb-2">
                                        {players.map((p, idx) => (
                                            <PlayerCard 
                                                key={p.id} 
                                                player={p} 
                                                isActive={currentPlayerIndex === idx} 
                                                ref={(el) => { if(el) playerRefs.current.set(p.id, el); }}
                                                onHexMouseEnter={handleHexEnter}
                                                onHexMouseLeave={handleHexLeave}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Bottom Controls */}
                                <div className="flex gap-3 h-32 sm:h-36 shrink-0 mt-2">
                                    <div className="flex-1 bg-white/80 backdrop-blur rounded-2xl border-2 border-white shadow-sm p-3 overflow-y-auto scrollbar-hide flex flex-col-reverse text-xs font-bold text-slate-600">
                                        <div ref={logsEndRef} />
                                        {logs.slice().reverse().map((log) => (
                                            <div key={log.id} className={`mb-1.5 pb-1 border-b border-dashed border-slate-200 last:border-0 ${log.type === 'danger' ? 'text-rose-500' : log.type === 'success' ? 'text-emerald-600' : ''}`}>
                                                {log.message}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="w-32 sm:w-40 shrink-0">
                                        <ControlPanel 
                                            currentPlayer={currentPlayer}
                                            diceValue={diceValue}
                                            isRolling={isRolling}
                                            canRoll={isMyTurn && !isRolling && !modalOpen && !hexModalOpen}
                                            onRoll={() => requestAction('ROLL')}
                                            message={!isMyTurn ? "WAIT" : "ROLL"}
                                            turnCount={turnCount}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                     </div>
                 </div>
             </div>
        </div>
      </div>

      {/* ELIMINATION MODAL */}
      {eliminatedPlayer && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center pointer-events-none">
           <div className="bg-rose-600 text-white p-8 rounded-3xl shadow-2xl border-8 border-white animate-alert flex flex-col items-center transform rotate-[-3deg]">
               <Skull size={64} className="mb-4" />
               <h2 className="text-5xl font-black uppercase tracking-tighter mb-2">WASTED</h2>
               <p className="text-2xl font-bold">{eliminatedPlayer.name} 出局!</p>
           </div>
        </div>
      )}

      {/* HEX BUFF SELECTION MODAL (TFT Style) */}
      {hexModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
             <div className="w-full max-w-4xl flex flex-col items-center animate-in zoom-in duration-300">
                 <div className="text-center mb-10">
                     <h3 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-sky-300 to-sky-500 mb-2 flex items-center justify-center gap-4 drop-shadow-lg">
                         <Hexagon fill="currentColor" className="text-sky-400" /> 
                         海克斯科技 
                         <Hexagon fill="currentColor" className="text-sky-400" />
                     </h3>
                     <p className="text-xl text-sky-100 font-bold tracking-widest bg-sky-900/50 px-6 py-2 rounded-full inline-block border border-sky-500/50">
                         {triggerReason}
                     </p>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full px-4">
                     {availableHexes.map((hex) => (
                         <button 
                            key={hex.id}
                            onClick={() => selectHex(hex)}
                            disabled={!isMyTurn}
                            className={`
                                relative group overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(56,189,248,0.3)]
                                flex flex-col items-center text-center p-6 bg-slate-800 text-white
                                ${hex.rarity === 'PRISMATIC' ? 'border-purple-400 shadow-purple-500/20' : 
                                  hex.rarity === 'GOLD' ? 'border-amber-400 shadow-amber-500/20' : 
                                  'border-slate-400 shadow-slate-500/20'}
                                ${!isMyTurn ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                            `}
                         >
                            <div className={`
                                w-20 h-20 mb-4 flex items-center justify-center text-4xl rounded-full bg-slate-900/50 shadow-inner
                                ${hex.rarity === 'PRISMATIC' ? 'text-purple-300' : 
                                  hex.rarity === 'GOLD' ? 'text-amber-300' : 
                                  'text-slate-300'}
                            `}>
                                {hex.icon}
                            </div>
                            <h4 className={`text-xl font-black mb-2 uppercase tracking-wide ${
                                hex.rarity === 'PRISMATIC' ? 'text-purple-300' : 
                                hex.rarity === 'GOLD' ? 'text-amber-300' : 
                                'text-slate-200'}
                            `}>
                                {hex.name}
                            </h4>
                            <p className="text-sm text-slate-400 font-bold leading-relaxed">
                                {hex.description}
                            </p>
                            <div className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest opacity-50">
                                {hex.rarity}
                            </div>
                         </button>
                     ))}
                 </div>
                 {!isMyTurn && <div className="text-white mt-4 font-bold animate-pulse">等待对方选择...</div>}
             </div>
          </div>
      )}

      {/* PROPERTY ACTION MODAL */}
      {modalOpen && pendingAction && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-3xl border-b-8 border-slate-200 shadow-2xl max-w-sm w-full animate-in zoom-in duration-200 transform rotate-1">
             <h3 className="text-2xl font-black text-center mb-4 text-slate-800">
               {pendingAction.type === 'BUY' ? '购买地产' : '升级建筑'}
             </h3>
             
             <div className="bg-slate-50 rounded-xl p-4 mb-6 border-2 border-slate-100 flex flex-col items-center">
                 <div className="text-5xl mb-2">
                    {tiles[tiles.findIndex(t => t.id === pendingAction.tileId)].type === TileType.PROPERTY ? '🏠' : '🏗️'}
                 </div>
                 <div className="font-black text-xl text-slate-700 mb-1">
                    {tiles[tiles.findIndex(t => t.id === pendingAction.tileId)].name}
                 </div>
                 <div className="text-sm font-bold text-slate-400">
                    {pendingAction.type === 'BUY' ? '当前售价' : '升级费用'}
                 </div>
                 <div className="text-3xl font-black text-emerald-500">
                    ¥{pendingAction.price}
                 </div>
             </div>

             <div className="flex gap-3">
               <button 
                  onClick={() => requestAction('SKIP_ACTION')}
                  disabled={!isMyTurn}
                  className="flex-1 py-3 rounded-xl font-bold bg-slate-100 text-slate-400 border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50"
               >
                 放弃
               </button>
               <button 
                  onClick={() => requestAction(pendingAction.type)}
                  disabled={!isMyTurn}
                  className="flex-1 py-3 rounded-xl font-bold bg-emerald-500 text-white border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
               >
                 {pendingAction.type === 'BUY' ? '购买' : '升级'}
               </button>
             </div>
             {!isMyTurn && <div className="text-center text-slate-400 text-xs mt-2 font-bold">等待对方操作...</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;