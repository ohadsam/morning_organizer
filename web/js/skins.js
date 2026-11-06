// Looks the person can choose from (pure). Each skin is a colour palette (light + dark) applied by css/app.css through data-skin on <html>.
// "Easy read" additionally switches to a wider, calmer text style (clear sans-serif, more letter / word / line spacing) that many readers find easier.
export const SKINS = ['default', 'ocean', 'forest', 'sunset', 'candy', 'slate', 'calm', 'bold'];
/** Preview colours for the picker: [background, brand]. */
export const SKIN_SWATCH = { default: ['#f6f4ff', '#6c5ce7'], ocean: ['#eef7fb', '#0b6fc4'], forest: ['#f1f8f3', '#1f7a4d'], sunset: ['#fff6f0', '#c2410c'], candy: ['#fff0f6', '#be185d'], calm: ['#f1f4f5', '#596c78'], bold: ['#f8f9fc', '#1747a5'], slate: ['#f4f5f7', '#475569'] };
export const sanitizeSkin = (s) => (SKINS.includes(s) ? s : 'default');
