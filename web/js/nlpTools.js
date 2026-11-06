// NLP-style self-reflection tools (pure data + helpers). NLP (neuro-linguistic programming) is a popular set of coaching techniques; the research
// evidence for it is limited and mixed, so the app offers only gentle, familiar exercises (clear goals, reframing, a calming anchor, precise words,
// seeing a situation from other sides, mental rehearsal) as self-help - never as therapy, never with claims about results.
// Every tool is a short list of steps: a question to answer ('text'), a quiet moment ('pause'), or the "words" step of the precise-words tool.

/** id -> { icon, steps: [{ id, type, sec? }] }. Texts: nlp_<tool> (name), nlpd_<tool> (one line), nlpq_<tool>_<step> (question), nlph_<tool>_<step> (hint). */
export const TOOLS = {
  outcome: { icon: '🎯', steps: [{ id: 'want', type: 'text' }, { id: 'know', type: 'text' }, { id: 'when', type: 'text' }, { id: 'mine', type: 'text' }, { id: 'worth', type: 'text' }, { id: 'first', type: 'text' }] },
  reframe: { icon: '🖼️', steps: [{ id: 'what', type: 'text' }, { id: 'else', type: 'text' }, { id: 'useful', type: 'text' }, { id: 'new', type: 'text' }] },
  anchor: { icon: '⚓', steps: [{ id: 'moment', type: 'text' }, { id: 'picture', type: 'pause', sec: 30 }, { id: 'press', type: 'pause', sec: 10 }, { id: 'test', type: 'pause', sec: 10 }, { id: 'word', type: 'text' }] },
  clarify: { icon: '🔎', steps: [{ id: 'said', type: 'text' }, { id: 'words', type: 'words' }, { id: 'precise', type: 'text' }] },
  perspectives: { icon: '👀', steps: [{ id: 'situation', type: 'text' }, { id: 'me', type: 'text' }, { id: 'other', type: 'text' }, { id: 'observer', type: 'text' }, { id: 'do', type: 'text' }] },
  rehearse: { icon: '🎬', steps: [{ id: 'situation', type: 'text' }, { id: 'see', type: 'text' }, { id: 'resource', type: 'text' }, { id: 'play', type: 'pause', sec: 30 }, { id: 'sign', type: 'text' }] },
};
export const TOOL_IDS = Object.keys(TOOLS);
export const isTool = (id) => typeof id === 'string' && Object.hasOwn(TOOLS, id);
export const keys = (tool, step) => ({ q: `nlpq_${tool}_${step}`, h: `nlph_${tool}_${step}` });

// Words that often hide a "story" (absolute, must, can't). Matched as whole words in the person's own sentence; each kind has one gentle question.
const WORDS = {
  en: { all: ['always', 'never', 'everyone', 'everybody', 'nobody', 'no one', 'nothing', 'everything', 'every time', 'all the time', 'completely'], must: ['must', 'have to', 'has to', 'should', 'need to', 'ought to'], cant: ["can't", 'cannot', 'impossible', "won't be able", 'unable', "couldn't"] },
  he: { all: ['תמיד', 'אף פעם', 'אף אחד', 'כולם', 'כל הזמן', 'שום דבר', 'הכול', 'כל פעם', 'לגמרי', 'בחיים לא'], must: ['חייב', 'חייבת', 'צריך', 'צריכה', 'מוכרח', 'מוכרחה', 'אסור'], cant: ['לא יכול', 'לא יכולה', 'לא מסוגל', 'לא מסוגלת', 'בלתי אפשרי', 'אי אפשר', 'לא מצליח', 'לא מצליחה'] },
};
export const KINDS = ['all', 'must', 'cant'];
const norm = (s) => String(s ?? '').toLowerCase().replace(/[׳’]/g, "'").replace(/[.,!?;:()"״]/g, ' ').replace(/\s+/g, ' ').trim();
/** The words in a sentence worth a second look: [{ word, kind }] (each once, in order of appearance). */
export function flagWords(text, lang = 'he') {
  const said = ` ${norm(text)} `, list = WORDS[lang === 'he' ? 'he' : 'en'], found = [];
  for (const kind of KINDS) for (const w of list[kind]) { const at = said.indexOf(` ${norm(w)} `); if (at >= 0 && !found.some((f) => f.word === w)) found.push({ word: w, kind, at }); }
  return found.sort((a, b) => a.at - b.at).map(({ word, kind }) => ({ word, kind }));
}
/** What goes into the journal note: "question: answer" lines for every answered step. */
export function composeNote(tool, answers, t) {
  if (!isTool(tool)) return '';
  const lines = TOOLS[tool].steps.filter((s) => s.type === 'text' && String(answers?.[s.id] ?? '').trim()).map((s) => `${t(keys(tool, s.id).q)} ${String(answers[s.id]).trim()}`);
  return lines.length ? `${t(`nlp_${tool}`)}\n${lines.join('\n')}`.slice(0, 3900) : '';
}
