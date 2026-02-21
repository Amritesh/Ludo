const BOARD_SIZE = 15;

export default function Board() {
  const cells = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      let color = 'bg-white';

      // Yards
      if (x < 6 && y < 6) color = 'bg-red-100';
      if (x > 8 && y < 6) color = 'bg-green-100';
      if (x > 8 && y > 8) color = 'bg-blue-100';
      if (x < 6 && y > 8) color = 'bg-yellow-100';

      // Inner Yard Circles (Decorative)
      if ((x === 1 || x === 4) && (y === 1 || y === 4)) { /* handled by bg */ }

      // Home Lanes
      if (x === 7 && y > 0 && y < 7) color = 'bg-green-500';
      if (x === 7 && y > 8 && y < 14) color = 'bg-red-500';
      if (y === 7 && x > 0 && x < 7) color = 'bg-yellow-500';
      if (y === 7 && x > 8 && x < 14) color = 'bg-blue-500';

      // Safe Squares & Start Squares
      const safeSquares = [
        [6, 2], [8, 1], // Top
        [1, 6], [2, 8], // Left
        [6, 13], [8, 12], // Bottom
        [13, 8], [12, 6], // Right
      ];
      
      const isStart = (x === 6 && y === 13) || (x === 1 && y === 6) || (x === 8 && y === 1) || (x === 13 && y === 8);
      
      if (safeSquares.some(([sx, sy]) => sx === x && sy === y)) {
        color = 'bg-slate-200';
      }

      // Center
      if (x >= 6 && x <= 8 && y >= 6 && y <= 8) {
          if (x === 7 && y === 7) color = 'bg-slate-800';
          else color = 'bg-slate-50';
      }

      cells.push(
        <div
          key={`${x}-${y}`}
          className={`relative border-[0.5px] border-slate-200 ${color} flex items-center justify-center`}
          style={{ gridColumnStart: x + 1, gridRowStart: y + 1 }}
        >
          {isStart && <div className="w-2 h-2 rounded-full opacity-20 bg-black"></div>}
        </div>
      );
    }
  }

  return (
    <div className="relative aspect-square w-full max-w-[600px] grid grid-cols-15 grid-rows-15 bg-white shadow-2xl rounded-lg overflow-hidden border-4 border-slate-800">
      {cells}
      
      {/* Decorative Yards */}
      <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-red-500 border-r-4 border-b-4 border-slate-800 flex items-center justify-center">
        <div className="w-[70%] h-[70%] bg-white rounded-xl shadow-inner grid grid-cols-2 grid-rows-2 p-4 gap-4">
          <div className="bg-red-500 rounded-full shadow-md"></div>
          <div className="bg-red-500 rounded-full shadow-md"></div>
          <div className="bg-red-500 rounded-full shadow-md"></div>
          <div className="bg-red-500 rounded-full shadow-md"></div>
        </div>
      </div>
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-green-500 border-l-4 border-b-4 border-slate-800 flex items-center justify-center">
        <div className="w-[70%] h-[70%] bg-white rounded-xl shadow-inner grid grid-cols-2 grid-rows-2 p-4 gap-4">
          <div className="bg-green-500 rounded-full shadow-md"></div>
          <div className="bg-green-500 rounded-full shadow-md"></div>
          <div className="bg-green-500 rounded-full shadow-md"></div>
          <div className="bg-green-500 rounded-full shadow-md"></div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-yellow-500 border-r-4 border-t-4 border-slate-800 flex items-center justify-center">
        <div className="w-[70%] h-[70%] bg-white rounded-xl shadow-inner grid grid-cols-2 grid-rows-2 p-4 gap-4">
          <div className="bg-yellow-500 rounded-full shadow-md"></div>
          <div className="bg-yellow-500 rounded-full shadow-md"></div>
          <div className="bg-yellow-500 rounded-full shadow-md"></div>
          <div className="bg-yellow-500 rounded-full shadow-md"></div>
        </div>
      </div>
      <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-blue-500 border-l-4 border-t-4 border-slate-800 flex items-center justify-center">
        <div className="w-[70%] h-[70%] bg-white rounded-xl shadow-inner grid grid-cols-2 grid-rows-2 p-4 gap-4">
          <div className="bg-blue-500 rounded-full shadow-md"></div>
          <div className="bg-blue-500 rounded-full shadow-md"></div>
          <div className="bg-blue-500 rounded-full shadow-md"></div>
          <div className="bg-blue-500 rounded-full shadow-md"></div>
        </div>
      </div>

      {/* Center Home Triangle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20%] h-[20%] bg-slate-800 flex items-center justify-center">
        <div className="relative w-full h-full overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full border-[30px] border-transparent border-t-green-500 border-r-blue-500 border-b-red-500 border-l-yellow-500"></div>
        </div>
      </div>
    </div>
  );
}
