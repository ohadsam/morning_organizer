// "Who sees this routine?" (pure): a routine with no owners is seen by everyone on the device, otherwise only by the people named.
/** -> null when there is only one person (nothing to explain), else { kind: 'all' } or { kind: 'some', names: [...] } (names of people that still exist). */
export function whoSees(tpl, profiles) {
  const people = Array.isArray(profiles) ? profiles : []; if (people.length < 2) return null;
  const owners = Array.isArray(tpl?.owners) ? tpl.owners : []; if (!owners.length) return { kind: 'all' };
  const names = people.filter((p) => owners.includes(p.id)).map((p) => String(p.name || '').trim() || '—');
  return names.length ? { kind: 'some', names } : { kind: 'all' };
}
