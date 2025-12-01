import React, { forwardRef } from 'react';
import { Player, HexBuff } from '../types';
import { COLOR_MAP } from '../constants';
import { Building2 } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  isActive: boolean;
  onHexMouseEnter?: (e: React.MouseEvent, hex: HexBuff) => void;
  onHexMouseLeave?: () => void;
}

export const PlayerCard = forwardRef<HTMLDivElement, PlayerCardProps>(({ player, isActive, onHexMouseEnter, onHexMouseLeave }, ref) => {
  const colors = COLOR_MAP[player.color];
  
  return (
    <div 
      ref={ref}
      className={`
        flex flex-col p-2 rounded-xl border-2
        transition-all duration-300 w-full relative
        ${isActive 
            ? 'bg-white border-black/5 shadow-md scale-[1.02] z-10' 
            : 'bg-white/40 border-transparent opacity-70 grayscale-[0.5] hover:opacity-100'
        }
        ${player.money < 0 ? 'bg-rose-100 opacity-50' : ''}
      `}
    >
      {/* Top Row: Avatar, Name, Money */}
      <div className="flex items-center justify-between w-full mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`
                w-8 h-8 rounded-lg ${colors.bg} 
                border-b-2 ${colors.border} 
                flex items-center justify-center text-sm shadow-sm shrink-0 text-white
            `}>
                <span className="drop-shadow-md">{player.avatar}</span>
            </div>
            <div className="flex flex-col min-w-0 leading-none gap-0.5">
                <span className={`font-black text-xs truncate ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                  {player.name}
                </span>
                {player.isJailed && <span className="text-[8px] font-bold bg-rose-500 text-white px-1 rounded w-fit">JAIL</span>}
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 pl-2 leading-none gap-1">
             <div className={`font-black text-xs ${player.money < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                ¥{player.money}
             </div>
             {player.properties.length > 0 && (
                <div className="flex items-center text-[9px] font-bold text-slate-400 bg-slate-100 px-1 rounded-full">
                    <Building2 size={8} className="mr-0.5"/>{player.properties.length}
                </div>
             )}
          </div>
      </div>

      {/* Bottom Row: Hex Buff Slots */}
      <div className="flex gap-1 h-6 w-full overflow-x-auto scrollbar-hide items-center bg-black/5 rounded-lg px-1">
          {player.hexBuffs.length === 0 && (
              <span className="text-[8px] text-slate-400 w-full text-center italic">空空如也...</span>
          )}
          {player.hexBuffs.map((hex, idx) => (
              <div 
                key={hex.id + idx} 
                className="relative group shrink-0 cursor-help"
                onMouseEnter={(e) => onHexMouseEnter?.(e, hex)}
                onMouseLeave={() => onHexMouseLeave?.()}
              >
                  {/* Hexagon Icon */}
                  <div 
                    className={`
                        w-5 h-5 flex items-center justify-center text-[10px] clip-hex 
                        ${hex.rarity === 'PRISMATIC' ? 'bg-gradient-to-br from-indigo-400 to-purple-500 text-white' : 
                          hex.rarity === 'GOLD' ? 'bg-gradient-to-br from-yellow-300 to-amber-500 text-white shadow-inner' : 
                          'bg-slate-300 text-slate-600'}
                    `}
                  >
                    {hex.icon}
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
});

PlayerCard.displayName = 'PlayerCard';