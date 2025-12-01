import React from 'react';
import { Tile, TileType, PlayerColor } from '../types';
import { COLOR_MAP } from '../constants';

interface BoardTileProps {
  tile: Tile;
  playersOnTile: React.ReactNode;
  ownerColor?: PlayerColor;
}

// A Voxel-style 3D building component with Window Texture
const BuildingStack = ({ level, colorClass }: { level: number, colorClass: string }) => {
  if (level === 0) return null;

  const isLandmark = level >= 5;

  return (
    <div className="absolute bottom-1 right-1 flex flex-col-reverse items-center gap-[1px] z-0 pointer-events-none">
       {Array.from({ length: level }).map((_, i) => (
         <div 
            key={i} 
            className={`
                w-4 h-3 sm:w-5 sm:h-4 rounded-sm border border-black/30
                ${isLandmark && i === level - 1 ? 'bg-yellow-300 landmark-glow' : colorClass} 
                building-block building-windows
            `}
            style={{
                // Make higher floors slightly lighter/smaller for perspective
                width: `${100 - i * 5}%`,
                zIndex: level - i
            }}
         />
       ))}
       {/* Roof/Number */}
       <div className={`
          text-[8px] font-black px-1 rounded-full border border-black shadow-sm -mb-2 relative z-10
          ${isLandmark ? 'bg-yellow-400 text-yellow-900' : 'bg-white text-slate-800'}
       `}>
         Lv.{level}
       </div>
    </div>
  );
};

export const BoardTile: React.FC<BoardTileProps> = ({ tile, playersOnTile, ownerColor }) => {
  
  const isOwned = !!ownerColor;
  const isProperty = tile.type === TileType.PROPERTY;
  
  const getTileColors = () => {
     if (isProperty && ownerColor) {
         return COLOR_MAP[ownerColor];
     }
     // Default colors for unowned
     switch(tile.type) {
        case TileType.PROPERTY: return { bg: 'bg-white', border: 'border-slate-800', shadow: 'shadow-slate-300', text: 'text-slate-800' };
        case TileType.START: return { bg: 'bg-white', border: 'border-slate-800', shadow: 'shadow-slate-300', text: 'text-slate-800' };
        case TileType.JAIL: return { bg: 'bg-slate-200', border: 'border-slate-800', shadow: 'shadow-slate-400', text: 'text-slate-600' };
        case TileType.PARKING: return { bg: 'bg-blue-100', border: 'border-blue-800', shadow: 'shadow-blue-300', text: 'text-blue-800' };
        case TileType.TAX: return { bg: 'bg-rose-100', border: 'border-rose-800', shadow: 'shadow-rose-300', text: 'text-rose-800' };
        case TileType.CHANCE: return { bg: 'bg-amber-100', border: 'border-amber-800', shadow: 'shadow-amber-300', text: 'text-amber-800' };
        case TileType.CASINO: return { bg: 'bg-indigo-100', border: 'border-indigo-800', shadow: 'shadow-indigo-300', text: 'text-indigo-800' };
        default: return { bg: 'bg-white', border: 'border-slate-800', shadow: 'shadow-slate-300', text: 'text-black' };
     }
  };

  const colors = getTileColors();
  
  // Calculate Rent text
  const currentRent = tile.rent ? tile.rent * (1 + 0.5 * tile.level) : 0;

  return (
    <div 
      className="relative w-full h-full transition-transform duration-100"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* --- LAYER 1: BACKGROUND & INFO (Clipped) --- */}
      <div 
          className={`
            absolute inset-0 rounded-xl overflow-hidden flex flex-col
            ${colors.bg} 
            border-2 ${colors.border}
            shadow-[0px_4px_0px_0px_rgba(0,0,0,0.2)]
          `}
      >
          {/* Top Half: Info */}
          <div className={`
             h-1/2 w-full flex flex-col items-center relative
             ${isOwned ? 'border-b-2 border-black/10' : 'border-b border-slate-100'}
          `}>
             {!isOwned && isProperty && tile.color && (
                 <div className={`w-full h-1.5 shrink-0 ${tile.color} border-b border-black/5`} />
             )}
             <div className="flex-1 w-full flex flex-col items-center justify-center px-1 pb-1 gap-0.5 min-h-0">
                 <span className={`
                    text-[10px] sm:text-[11px] font-black text-center leading-3 sm:leading-3
                    ${isOwned ? 'text-white drop-shadow-md' : (tile.type === TileType.PROPERTY ? 'text-slate-800' : colors.text)}
                    z-10
                 `}>
                   {tile.name}
                 </span>
                 {isProperty && (
                     <div className="shrink-0 z-10 mt-0.5">
                        {isOwned ? (
                            <span className="bg-black/20 backdrop-blur-sm text-white px-1.5 py-[1px] rounded-[4px] text-[9px] font-bold whitespace-nowrap border border-white/20">
                                ¥{currentRent.toFixed(0)}
                            </span>
                        ) : (
                            <span className="text-slate-400 text-[9px] font-bold whitespace-nowrap bg-slate-100 px-1 rounded-[3px]">
                                ¥{tile.price}
                            </span>
                        )}
                     </div>
                 )}
             </div>
          </div>

          {/* Bottom Half: Watermark & Dot */}
          <div className="h-1/2 w-full relative p-1">
              {!isProperty && tile.icon && (
                <div className="absolute inset-0 flex items-center justify-center opacity-20 text-current transform scale-110 pointer-events-none z-0">
                   {React.cloneElement(tile.icon as React.ReactElement<any>, { size: 32 })}
                </div>
              )}
              {isOwned && (
                 <div className={`
                    absolute bottom-1 right-1 w-3 h-3 rounded-full border border-black/20
                    bg-white/30 backdrop-blur-sm flex items-center justify-center z-10
                 `}>
                    <div className={`w-1.5 h-1.5 rounded-full bg-white`} />
                 </div>
             )}
          </div>
      </div>

      {/* --- LAYER 2: 3D CONTENT (Unclipped) --- */}
      <div className="absolute inset-0 pointer-events-none z-20 flex flex-col">
          {/* Top spacer to match layout */}
          <div className="h-1/2 w-full" />
          
          {/* Bottom content area */}
          <div className="h-1/2 w-full relative p-1">
             {/* Buildings */}
             {isOwned && tile.level > 0 && (
                 <BuildingStack level={tile.level} colorClass={isOwned ? 'bg-white' : 'bg-gray-200'} />
             )}

             {/* Players */}
             <div className="absolute inset-0 flex items-center justify-center z-30">
                 {playersOnTile}
             </div>
          </div>
      </div>
    </div>
  );
};