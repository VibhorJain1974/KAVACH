'use client';

import { useRef, useImperativeHandle, forwardRef } from 'react';

export interface AudioFallbackRef {
  play: () => void;
}

const AudioFallback = forwardRef<AudioFallbackRef>((_, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useImperativeHandle(ref, () => ({
    play: () => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    },
  }));

  return (
    <audio ref={audioRef} preload="auto" style={{ display: 'none' }}>
      <source src="/hindi_alert.mp3" type="audio/mpeg" />
    </audio>
  );
});

AudioFallback.displayName = 'AudioFallback';
export default AudioFallback;
