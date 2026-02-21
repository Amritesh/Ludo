export const BOARD_DIM = 15;

export const getCellCoords = (index: number, color?: string): { x: number; y: number } => {
  // Common path (0-51) mapping to 15x15 grid
  // This is a simplified mapping for a standard Ludo layout
  const path: [number, number][] = [
    // RED side (starts bottom left of the cross)
    [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], // Up
    [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], // Left
    [0, 7], // Mid left
    [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], // Right
    [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], // Up
    [7, 0], // Mid top
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], // Down
    [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], // Right
    [14, 7], // Mid right
    [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], // Left
    [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], // Down
    [7, 14], // Mid bottom
    [6, 14], // Back to start (RED)
  ];

  if (index >= 0 && index < 52) {
    const [x, y] = path[index];
    return { x, y };
  }

  // Home lanes (52-57)
  if (index >= 52 && index <= 57) {
    const offset = index - 52;
    if (color === 'RED') return { x: 7, y: 13 - offset };
    if (color === 'GREEN') return { x: 1 + offset, y: 7 };
    if (color === 'YELLOW') return { x: 7, y: 1 + offset };
    if (color === 'BLUE') return { x: 13 - offset, y: 7 };
  }

  // Home (58)
  if (index === 58) return { x: 7, y: 7 };

  // Yard positions (special handling in Piece component)
  return { x: 0, y: 0 };
};

export const getYardCoords = (color: string, pieceIndex: number): { x: number; y: number } => {
  const bases: Record<string, [number, number]> = {
    RED: [0, 9],
    GREEN: [0, 0],
    YELLOW: [9, 0],
    BLUE: [9, 9],
  };
  const [bx, by] = bases[color];
  // Centers for 4 spots in a 6x6 yard
  const offsets = [[1, 1], [4, 1], [1, 4], [4, 4]];
  const [ox, oy] = offsets[pieceIndex];
  return { x: bx + ox, y: by + oy };
};
