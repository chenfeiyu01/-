import React from 'react';
import { Player } from '../types';
import { COLOR_MAP } from '../constants';

interface PlayerTokenProps {
  player: Player;
  index: number; 
  totalOnTile: number;
}

export const PlayerToken: React.FC<PlayerTokenProps> = ({ player, index, totalOnTile }) => {
  const colors = COLOR_MAP[player.color];
  
  // Stagger players if on same tile
  const offsetX = totalOnTile > 1 ? (index - (totalOnTile - 1) / 2) * 8 : 0;
  const offsetY = totalOnTile > 1 ? (index % 2) * 4 : 0;
  
  return (
    <div 
      className="absolute transition-all duration-500 ease-out"
      style={{
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        zIndex: 30 + index
      }}
    >
      {/* The Token Body - Rotated to stand up against the tilted board */}
      <div 
        className={`
            w-8 h-8 sm:w-10 sm:h-10 
            flex items-center justify-center
            transform -rotate-x-12 origin-bottom transition-transform hover:scale-125
        `}
        style={{
            // We counter-rotate X to make it look like it's standing up
            transform: 'rotateX(-20deg) translateY(-5px)', 
        }}
      >
          {/* Shadow */}
          <div className="absolute bottom-0 w-6 h-2 bg-black/20 rounded-[100%] blur-[1px] translate-y-1" />

          {/* Character Body */}
          <div className={`
             relative w-full h-full rounded-xl border-2 border-black
             ${colors.bg} flex items-center justify-center
             shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
             text-lg select-none
             animate-bounce
          `}
          style={{ animationDuration: '2s', animationDelay: `${index * 0.2}s` }}
          title={player.name}
          >
             {/* Avatar */}
             <span className="drop-shadow-md filter">{player.avatar}</span>
             
             {/* Reflection/Highlight */}
             <div className="absolute top-1 left-1 w-2 h-2 bg-white/40 rounded-full" />
          </div>
      </div>
    </div>
  );
};