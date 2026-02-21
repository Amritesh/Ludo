import { motion } from 'framer-motion';
import { getCellCoords, getYardCoords } from '../utils/coords';
import type { Color } from '../types/game';

interface PieceProps {
  color: Color;
  index: number;
  position: number;
  canMove: boolean;
  onClick: () => void;
}

export default function Piece({ color, index, position, canMove, onClick }: PieceProps) {
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
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={canMove ? onClick : undefined}
      className={`absolute w-[6.66%] h-[6.66%] p-1 z-10 ${canMove ? 'cursor-pointer' : ''}`}
    >
      <div className={`w-full h-full rounded-full border-2 border-white shadow-lg relative flex items-center justify-center ${colorClasses[color]} ${canMove ? 'ring-4 ring-white ring-opacity-50 scale-110' : ''}`}>
        <div className="w-1/2 h-1/2 rounded-full bg-white opacity-30"></div>
        {canMove && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 rounded-full border-2 border-white"
          />
        )}
      </div>
    </motion.div>
  );
}
