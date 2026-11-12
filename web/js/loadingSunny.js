// The motion of the loading sunrise (pure): the sun rises and sinks, the rays open one by one. 2.4 s loop, smoothstep between keyframes (from the kit's LOADING-MOTION).
export const LOOP_MS = 2400;
const KF = [[0, 0, 0.65], [0.25, -12, 0.8], [0.5, -19, 1], [0.75, -8, 0.85], [1, 0, 0.65]];   // [u, sun dy, ray opacity]
const smooth = (t) => 3 * t * t - 2 * t * t * t;
/** The sun's lift and the rays' opacity at loop position `u` (0..1, wraps); `ray` (0..8) delays one ray a little so they open in turn. */
export function frameAt(u, ray = 0) {
  const x = (((u - 0.025 * ray) % 1) + 1) % 1;
  for (let i = 1; i < KF.length; i++) if (x <= KF[i][0]) { const a = KF[i - 1], b = KF[i], k = smooth((x - a[0]) / (b[0] - a[0])); return { dy: a[1] + (b[1] - a[1]) * k, opacity: a[2] + (b[2] - a[2]) * k }; }
  return { dy: 0, opacity: KF[0][2] };
}
