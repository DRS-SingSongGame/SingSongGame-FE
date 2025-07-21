import { getSharedAudioCtx } from "@/lib/sharedAudioCtx";

declare global {
  interface HTMLAudioElement {
    _srcNode?: MediaElementAudioSourceNode;
    _echoAttached?: boolean;
  }
}

export function attachEcho(audioEl: HTMLAudioElement) {
  const ctx = getSharedAudioCtx();
  if (audioEl._echoAttached) return;         // 이미 체인 붙었으면 종료

  /** ✦ 핵심: SourceNode 재사용 또는 신규 생성 */
  const src =
    audioEl._srcNode ?? (audioEl._srcNode = ctx.createMediaElementSource(audioEl));

  // ───── echo chain once ─────
  const delay = ctx.createDelay(5);
  delay.delayTime.value = 0.33;

  const feedback = ctx.createGain();
  feedback.gain.value = 0.4;

  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.value = 3500;

  const wet = ctx.createGain();
  wet.gain.value = 0.6;

  const dry = ctx.createGain();
  dry.gain.value = 1;

  delay.connect(feedback).connect(lpf).connect(delay);
  src.connect(dry).connect(ctx.destination);            // dry
  src.connect(delay).connect(wet).connect(ctx.destination); // wet

  audioEl._echoAttached = true;   // 플래그 마킹
}
