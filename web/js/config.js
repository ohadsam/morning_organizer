// Single place for deployment constants.
export const REPO = 'ohadsam/morning_organizer';
export const APK_URL = `https://github.com/${REPO}/releases/latest/download/morning-organizer.apk`;
export const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;
export const PAGES_URL = 'https://ohadsam.github.io/morning_organizer/';
// Hard limits applied to every template, whether typed, imported or received over NFC.
export const LIMITS = Object.freeze({
  maxTasks: 100, maxName: 80, maxTemplates: 200, maxTaskSec: 24 * 3600,
  maxShareChars: 64 * 1024, maxRuns: 2000,
});
export const APP_NAME_EN = 'SonRise';
