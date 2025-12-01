import React from 'react';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';
import { Player } from '../types';
import { COLOR_MAP } from '../constants';

interface ControlPanelProps {
  currentPlayer: Player;
  diceValue: number | null;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  message: string;
  turnCount: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  currentPlayer, 
  diceValue, 
  isRolling, 
  canRoll, 
  onRoll,
  message,
  turnCount
}) => {
  const colors = COLOR_MAP[currentPlayer.color];

  const renderDice = (val: number) => {
    const props = { size: '60%', strokeWidth: 3, className: "text-slate-700 drop-shadow-sm" };
    switch(val) {
      case 1: return <Dice1 {...props} />;
      case 2: return <Dice2 {...props} />;
      case 3: return <Dice3 {...props} />;
      case 4: return <Dice4 {...props} />;
      case 5: return <Dice5 {...props} />;
      case 6: return <Dice6 {...props} />;
      default: return <Dice1 {...props} />;
    }
  };

  return (
    <div className="flex flex-col w-full h-full gap-2">
      
      {/* TURN BADGE */}
      <div className={`
        flex items-center justify-between px-3 py-2 rounded-xl 
        bg-white border-2 border-slate-100 shadow-sm
      `}>
          <div className="flex flex-col leading-none">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">CURRENT</span>
              <span className="font-black text-sm text-slate-800 truncate max-w-[80px]">{currentPlayer.name}</span>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 border-white shadow-sm ${colors.bg}`} />
      </div>

      <div className="flex-1 flex gap-2 min-h-0">
          {/* Dice Box */}
          <div className="w-1/2 bg-white rounded-2xl border-b-4 border-slate-200 flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-b from-black/5 to-transparent"/>
            {diceValue ? renderDice(diceValue) : (
              <div className="text-4xl font-black text-slate-100 select-none">?</div>
            )}
          </div>

          {/* GO Button */}
          <div className="w-1/2 h-full">
              <button
                onClick={onRoll}
                disabled={!canRoll || isRolling}
                className={`
                  w-full h-full rounded-2xl font-black text-xl relative overflow-hidden flex items-center justify-center transition-all
                  ${!canRoll || isRolling 
                    ? 'bg-slate-100 text-slate-300 border-b-4 border-slate-200 cursor-not-allowed' 
                    : `bg-yellow-400 text-yellow-900 border-b-[6px] border-yellow-600 active:border-b-0 active:translate-y-[6px] hover:bg-yellow-300`
                  }
                `}
              >
                <span className="relative z-10 drop-shadow-sm tracking-wide">{isRolling ? '...' : 'GO'}</span>
              </button>
          </div>
      </div>
    </div>
  );
};