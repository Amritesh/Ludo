import { motion } from 'framer-motion';
import { getCellCoords, getYardCoords } from '../utils/coords';
import type { Color } from '../types/game';

interface PieceProps {
  color: Color;
  index: number;
  position: number;
  canMove: boolean;
  isTurn: boolean;
  onClick: () => void;
}

export default function Piece({ color, index, position, canMove, isTurn, onClick }: PieceProps) {
  const coords = position === -1 
    ? getYardCoords(color, index)
    : getCellCoords(position, color);

  const colorClasses: Record<Color, string> = {
    RED: 'bg-red-500',
    GREEN: 'bg-green-500',
    YELLOW: 'bg-yellow-500',
    BLUE: 'bg-blue-500',
  };

  return (
    <motion.div
      initial={false}
      animate={{
        left: `${(coords.x / 15) * 100}%`,
        top: `${(coords.y / 15) * 100}%`,
        scale: canMove ? 1.1 : 1,
      }}
      whileHover={canMove ? { scale: 1.2 } : {}}
      whileTap={canMove ? { scale: 0.9 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={(e) => {
        if (canMove) {
          e.stopPropagation();
          onClick();
        }
      }}
      className={`absolute w-[6.66%] h-[6.66%] p-0.5 z-10 ${canMove ? 'cursor-pointer z-30' : ''}`}
    >
      {/* Larger hit area for mobile */}
      {canMove && (
        <div className="absolute -inset-3 rounded-full" />
      )}
      <div className={`w-full h-full rounded-full border-2 border-white shadow-lg relative flex items-center justify-center ${colorClasses[color]} ${canMove ? 'ring-4 ring-white ring-opacity-50' : ''} ${isTurn && !canMove ? 'opacity-90 shadow-sm' : ''}`}>
        <div className="w-1/2 h-1/2 rounded-full bg-white opacity-30"></div>
        {canMove && (
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute -inset-1 rounded-full border-2 border-white"
          />
        )}
        {isTurn && (
           <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 rounded-full bg-white"
          />
        )}
      </div>
    </motion.div>
  );
}
