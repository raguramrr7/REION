export const OrbState = {
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
  ERROR: 'error',
} as const;

export type OrbState = typeof OrbState[keyof typeof OrbState];

export interface Transcript {
  user:      string | null;
  assistant: string | null;
}

export interface VoiceStore {
  orbState:   OrbState;
  audioLevel: number;          // 0–100 from analyser
  transcript: Transcript;
  isRecording: boolean;

  setOrbState:   (state: OrbState) => void;
  setAudioLevel: (level: number)  => void;
  setTranscript: (t: Partial<Transcript>) => void;
  clearTranscript: () => void;
  setIsRecording: (v: boolean) => void;
}
