const sounds: Record<string, HTMLAudioElement> = {
  ROLL: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
  MOVE: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
  CUT: new Audio('https://assets.mixkit.co/active_storage/sfx/2533/2533-preview.mp3'),
  HOME: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'),
  WIN: new Audio('https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3'),
};

export const playSound = (action: 'ROLL' | 'MOVE' | 'CUT' | 'HOME' | 'WIN') => {
  const audio = sounds[action];
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.warn('Sound play failed:', e));
  }
};
