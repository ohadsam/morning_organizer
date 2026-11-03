# Releasing & one-time setup

## What the pipeline does
| Trigger | Workflow | Result |
|---|---|---|
| any push / PR | `ci.yml` → *web* + *android* jobs | static+security checks, unit tests, Playwright e2e, Android unit tests, lint, release APK (artifact) |
| push to `main` | `ci.yml` → *release* job | new GitHub Release `build-N` containing `morning-organizer.apk` (marked **latest**, newest 10 kept) |
| push to `main` touching `web/**` | `pages.yml` | PWA published on GitHub Pages |

The PWA's *Download Android app* button points at `releases/latest/download/morning-organizer.apk`, so it always serves the newest APK.

## One-time setup (repository owner)
1. **Pages**: Settings → Pages → Source: *GitHub Actions*.
2. **Stable APK signature (recommended)** - without it every build is signed with a throw-away debug key and phones must uninstall before updating:
   ```bash
   keytool -genkeypair -v -keystore release.jks -alias morning -keyalg RSA -keysize 4096 -validity 36500
   base64 -w0 release.jks   # paste into the secret below
   ```
   Add repository secrets `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS` (and optionally `KEY_PASSWORD`). **Never commit the keystore** (`*.keystore`/`*.jks` are git-ignored). Back it up: losing it means users must reinstall.
3. Workflow permissions: Settings → Actions → General → *Read and write permissions* (needed by the release job).

## Shipping a change
Follow `.claude/skills/release-checklist/SKILL.md`. In short: `npm run bump -- patch|minor`, CHANGELOG + user guide, `npm run check && npm test && npm run e2e`, push, watch CI, confirm the release appeared.

## Local development
`npm install && npm run serve` → http://localhost:8080 . Android needs the Android SDK (`dl.google.com`); in restricted sandboxes rely on CI.
