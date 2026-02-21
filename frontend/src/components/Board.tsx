const BOARD_SIZE = 15;

export default function Board() {
  const cells = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      let color = 'bg-white';

      // Yards Background
      if (x < 6 && y < 6) color = 'bg-green-50/50';
      if (x > 8 && y < 6) color = 'bg-yellow-50/50';
      if (x > 8 && y > 8) color = 'bg-blue-50/50';
      if (x < 6 && y > 8) color = 'bg-red-50/50';

      // Home Lanes
      if (x === 7 && y > 0 && y < 7) color = 'bg-yellow-500';
      if (x === 7 && y > 8 && y < 14) color = 'bg-red-500';
      if (y === 7 && x > 0 && x < 7) color = 'bg-green-500';
      if (y === 7 && x > 8 && x < 14) color = 'bg-blue-500';

      // Safe Squares & Start Squares
      const safeSquares = [
        [6, 2], [8, 1], // Top
        [1, 6], [2, 8], // Left
        [6, 13], [8, 12], // Bottom
        [13, 8], [12, 6], // Right
      ];
      
      const isStart = (x === 6 && y === 13) || (x === 1 && y === 6) || (x === 8 && y === 1) || (x === 13 && y === 8);
      const isSafe = safeSquares.some(([sx, sy]) => sx === x && sy === y);
      
      if (isSafe) {
        color = 'bg-slate-100';
      }

      // Center
      if (x >= 6 && x <= 8 && y >= 6 && y <= 8) {
          color = 'bg-white';
      }

      cells.push(
        <div
          key={`${x}-${y}`}
          className={`relative border-[0.5px] border-slate-100 ${color} flex items-center justify-center`}
          style={{ gridColumnStart: x + 1, gridRowStart: y + 1 }}
        >
          {isStart && (
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 opacity-50" />
          )}
          {isSafe && !isStart && (
            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          )}
        </div>
      );
    }
  }

  return (
    <div className="relative aspect-square w-full bg-white shadow-2xl rounded-2xl overflow-hidden border-8 border-white ring-1 ring-slate-100">
      <div className="absolute inset-0 grid grid-cols-15 grid-rows-15">
        {cells}
      </div>
      
      {/* Yards */}
      {/* Green Yard */}
      <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-green-500 p-[6.66%]">
        <div className="w-full h-full bg-white rounded-3xl shadow-inner relative">
          <div className="absolute top-[16.66%] left-[16.66%] w-[16.66%] h-[16.66%] bg-green-500 rounded-full shadow-md"></div>
          <div className="absolute top-[16.66%] right-[16.66%] w-[16.66%] h-[16.66%] bg-green-500 rounded-full shadow-md"></div>
          <div className="absolute bottom-[16.66%] left-[16.66%] w-[16.66%] h-[16.66%] bg-green-500 rounded-full shadow-md"></div>
          <div className="absolute bottom-[16.66%] right-[16.66%] w-[16.66%] h-[16.66%] bg-green-500 rounded-full shadow-md"></div>
        </div>
      </div>
      {/* Yellow Yard */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-yellow-500 p-[6.66%]">
        <div className="w-full h-full bg-white rounded-3xl shadow-inner relative">
          <div className="absolute top-[16.66%] left-[16.66%] w-[16.66%] h-[16.66%] bg-yellow-500 rounded-full shadow-md"></div>
          <div className="absolute top-[16.66%] right-[16.66%] w-[16.66%] h-[16.66%] bg-yellow-500 rounded-full shadow-md"></div>
          <div className="absolute bottom-[16.66%] left-[16.66%] w-[16.66%] h-[16.66%] bg-yellow-500 rounded-full shadow-md"></div>
          <div className="absolute bottom-[16.66%] right-[16.66%] w-[16.66%] h-[16.66%] bg-yellow-500 rounded-full shadow-md"></div>
        </div>
      </div>
      {/* Red Yard */}
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-red-500 p-[6.66%]">
        <div className="w-full h-full bg-white rounded-3xl shadow-inner relative">
          <div className="absolute top-[16.66%] left-[16.66%] w-[16.66%] h-[16.66%] bg-red-500 rounded-full shadow-md"></div>
          <div className="absolute top-[16.66%] right-[16.66%] w-[16.66%] h-[16.66%] bg-red-500 rounded-full shadow-md"></div>
          <div className="absolute bottom-[16.66%] left-[16.66%] w-[16.66%] h-[16.66%] bg-red-500 rounded-full shadow-md"></div>
          <div className="absolute bottom-[16.66%] right-[16.66%] w-[16.66%] h-[16.66%] bg-red-500 rounded-full shadow-md"></div>
        </div>
      </div>
      {/* Blue Yard */}
      <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-blue-500 p-[6.66%]">
        <div className="w-full h-full bg-white rounded-3xl shadow-inner relative">
          <div className="absolute top-[16.66%] left-[16.66%] w-[16.66%] h-[16.66%] bg-blue-500 rounded-full shadow-md"></div>
          <div className="absolute top-[16.66%] right-[16.66%] w-[16.66%] h-[16.66%] bg-blue-500 rounded-full shadow-md"></div>
          <div className="absolute bottom-[16.66%] left-[16.66%] w-[16.66%] h-[16.66%] bg-blue-500 rounded-full shadow-md"></div>
          <div className="absolute bottom-[16.66%] right-[16.66%] w-[16.66%] h-[16.66%] bg-blue-500 rounded-full shadow-md"></div>
        </div>
      </div>

      {/* Center Home Triangle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20%] h-[20%] bg-white rounded-full shadow-xl flex items-center justify-center z-10 p-1 border-4 border-white ring-1 ring-slate-100">
        <div className="relative w-full h-full rounded-full overflow-hidden rotate-45">
           <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-yellow-500"></div>
           <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-500"></div>
           <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-green-500"></div>
           <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-red-500"></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
        </div>
      </div>
    </div>
  );
}
