let ctx: AudioContext | null = null;

export const getSharedAudioCtx = () => {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return ctx;
};
