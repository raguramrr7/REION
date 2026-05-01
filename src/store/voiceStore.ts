import { create } from 'zustand';
import { OrbState, type VoiceStore } from '../types/voice';

export const useVoiceStore = create<VoiceStore>((set) => ({
  orbState:    OrbState.IDLE,
  audioLevel:  0,
  isRecording: false,
  transcript:  { user: null, assistant: null },

  setOrbState:   (state) => set({ orbState: state }),
  setAudioLevel: (level) => set({ audioLevel: level }),
  setIsRecording: (v)    => set({ isRecording: v }),
  setTranscript: (t)     => set((s) => ({ transcript: { ...s.transcript, ...t } })),
  clearTranscript: ()    => set({ transcript: { user: null, assistant: null } }),
}));
