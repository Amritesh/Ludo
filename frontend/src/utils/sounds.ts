export const playSound = (action: 'ROLL' | 'MOVE' | 'CUT' | 'HOME' | 'WIN') => {
  const sounds = {
    ROLL: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Dice roll
    MOVE: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Click/Move
    CUT: 'https://assets.mixkit.co/active_storage/sfx/2533/2533-preview.mp3', // Capture
    HOME: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Score
    WIN: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3', // Win
  };

  const audio = new Audio(sounds[action]);
  audio.play().catch(e => console.warn('Sound play failed:', e));
};
