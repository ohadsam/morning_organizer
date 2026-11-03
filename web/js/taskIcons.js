// Suggests an emoji for a task from its name (Hebrew + English keywords). Pure. Users can always pick another.
const MAP = [
  [/teeth|tooth|brush|שיני|מברשת/i, '🪥'], [/shower|bath|wash|מקלחת|אמבט|רחצ|שטיפ/i, '🚿'], [/toilet|bathroom|שירותים|אמבטיה/i, '🚽'],
  [/dress|cloth|shirt|wear|מתלבש|בגדים|לבוש/i, '👕'], [/breakfast|eat|food|cereal|ארוח|אוכל|אוכלים|בוקר טוב/i, '🥣'], [/coffee|tea|קפה|תה/i, '☕'],
  [/bag|backpack|school|תיק|בית ספר|ספרים/i, '🎒'], [/shoe|sock|נעל|גרב/i, '👟'], [/wake|up|stretch|קמ|מתמתח|התעור/i, '⏰'], [/hair|comb|שיער|מסרק|סירוק/i, '💇'],
  [/plan|schedule|todo|תכנון|תכנן|משימות/i, '📝'], [/read|book|homework|קריאה|ספר|שיעורי/i, '📚'], [/dog|pet|feed|כלב|חתול|האכל/i, '🐶'], [/water|drink|מים|שתי/i, '💧'],
  [/exercise|sport|run|yoga|ספורט|התעמל|ריצה|יוגה/i, '🏃'], [/bed|sleep|מיטה|לישון|סדר/i, '🛏️'], [/out|leave|door|bus|יוצא|דלת|אוטובוס|יציאה/i, '🚪'],
];
export const DEFAULT_ICON = '⭐';
export const PICKER_ICONS = ['🦷', '🧼', '🚽', '🧦', '👖', '🧥', '🍎', '🥪', '🥛', '🍌', '🧃', '🥕', '🐱', '🐰', '🦁', '🐼', '🌈', '☀️', '🌙', '🚗', '🚌', '🚲', '⚽', '🎹', '🧩', '✏️', '🎨', '🧸', '💤', '🧘', '⏰', '🚿', '🪥', '👕', '🥣', '☕', '🎒', '👟', '💇', '📝', '📚', '🐶', '💧', '🏃', '🛏️', '🚪', '🧸', '🎨', '🎵', '⭐'];
export function suggestIcon(name) {
  const s = String(name || '');
  for (const [re, ic] of MAP) if (re.test(s)) return ic;
  return DEFAULT_ICON;
}
