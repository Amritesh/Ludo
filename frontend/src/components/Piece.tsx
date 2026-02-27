import { motion } from 'framer-motion';
import { getCellCoords, getYardCoords } from '../utils/coords';
import type { Color, StackType } from '../types/game';

interface PieceProps {
  color: Color;
  index: number;
  position: number;
  canMove: boolean;
  isTurn: boolean;
  onClick: () => void;
  stackType?: StackType;
  stackSize?: number;
  stackIndex?: number; // index within the stack for offset
}

export default function Piece({ 
  color, 
  index, 
  position, 
  canMove, 
  isTurn, 
  onClick, 
  stackType = 'SINGLE',
  stackSize = 1,
  stackIndex = 0
}: PieceProps) {
  const coords = position === -1 
    ? getYardCoords(color, index)
    : getCellCoords(position, color);

  const colorClasses: Record<Color, string> = {
    RED: 'bg-red-500',
    GREEN: 'bg-green-500',
    YELLOW: 'bg-yellow-500',
    BLUE: 'bg-blue-500',
  };

  // Offset pieces in a stack slightly so they are all visible
  const offset = stackSize > 1 ? (stackIndex - (stackSize - 1) / 2) * 4 : 0;

  const isInvincible = stackType === 'MULTI_STACK_3' || stackType === 'MULTI_STACK_4' || stackType === 'ALLIED_STACK';
  const isHeavyPair = stackType === 'HEAVY_PAIR';

  return (
    <motion.div
      initial={false}
      animate={{
        left: `calc(${(coords.x / 15) * 100}% + ${offset}px)`,
        top: `calc(${(coords.y / 15) * 100}% - ${offset}px)`,
        scale: canMove ? 1.1 : 1,
        zIndex: isTurn ? 30 : 10 + stackIndex,
      }}
      whileHover={canMove ? { scale: 1.2, zIndex: 40 } : {}}
      whileTap={canMove ? { scale: 0.9 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={(e) => {
        if (canMove) {
          e.stopPropagation();
          onClick();
        }
      }}
      className={`absolute w-[6.66%] h-[6.66%] p-0.5 ${canMove ? 'cursor-pointer' : ''}`}
    >
      <div className={`w-full h-full rounded-full border-2 shadow-lg relative flex items-center justify-center transition-all ${colorClasses[color]} 
        ${isHeavyPair ? 'border-slate-900 border-4' : 'border-white'}
        ${canMove ? 'ring-4 ring-yellow-400 ring-opacity-100 shadow-[0_0_15px_rgba(250,204,21,0.8)]' : ''} 
        ${isTurn && !canMove ? 'opacity-90 shadow-sm' : ''}
      `}>
        
        {/* Shield Aura for Invincible Stacks */}
        {isInvincible && (
          <motion.div
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3],
              rotate: 360 
            }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            className="absolute -inset-2 rounded-full border-2 border-dashed border-yellow-400 bg-yellow-400/10"
          />
        )}

        {/* Bonded Ring for Heavy Pairs */}
        {isHeavyPair && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="absolute -inset-1 rounded-full border-2 border-slate-900 border-t-transparent"
          />
        )}

        <div className="w-1/2 h-1/2 rounded-full bg-white opacity-30"></div>
        
        {canMove && (
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute -inset-2 rounded-full border-2 border-yellow-400"
          />
        )}
      </div>
    </motion.div>
  );
}
