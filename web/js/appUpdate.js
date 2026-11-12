// The answer of the Android app's "Check for a new version" (pure): the native side sends {type:'update', ok, latest, newer, current}; the page never trusts its shape.
const V = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
/** -> { state: 'new' | 'latest' | 'fail', latest, current } */
export function interpretUpdate(d) {
  const latest = typeof d?.latest === 'string' && V.test(d.latest) ? d.latest : '', current = typeof d?.current === 'string' && V.test(d.current) ? d.current : '';
  if (!d || d.ok !== true || !latest) return { state: 'fail', latest: '', current };
  return { state: d.newer === true ? 'new' : 'latest', latest, current };
}
