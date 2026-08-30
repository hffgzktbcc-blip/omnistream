# Task: fix the video player failure modes and harden the app

Repo: `/Users/nathanaelgovender/Developer/comic-reader` (package name `omnistream`)
Stack: React 19 + Vite + Tailwind 4 (`src/`), Express backend (`server/index.js`).
Run with `npm run dev` — Vite on :5200, API on :3001, `/api` proxied.
Not a git repo. **Before changing anything, run `git init && git add -A && git commit -m "baseline"`**
so this work is revertable.

Two user-visible bugs were reproduced in the browser:
- Movies: player opens, then sits forever. The iframe area renders the embed provider's
  own text "Please Disable Sandbox". Console shows 403, 403, then repeated 404s.
- Anime: clicking play navigates the entire browser tab away from the app.

Both trace to iframe configuration. Work through the tasks below in order. Verify each in
the browser and report what you saw. Run `npx tsc --noEmit` before finishing.

---

## 1. Make all four players sandbox their iframes consistently

Current state, verified:

| File | `sandbox` attribute |
|---|---|
| `src/components/Common/UnifiedVideoPlayer.tsx` line ~321 | present |
| `src/components/Anime/AnimePlayerModal.tsx` line ~313 | **absent** |
| `src/components/Media/MediaPlayerModal.tsx` line ~254 | **absent** |
| `src/components/Sports/SportsPlayerModal.tsx` | **absent** |

An un-sandboxed cross-origin iframe may navigate the top-level window once it has a user
gesture. Clicking play supplies that gesture, which is why the Anime tab gets hijacked.

Add the same `sandbox` attribute to all four. Use:

    sandbox="allow-scripts allow-forms allow-presentation allow-pointer-lock"

Note this **drops `allow-same-origin`**, which `UnifiedVideoPlayer.tsx:321` currently
includes. `allow-scripts` together with `allow-same-origin` on untrusted third-party
content largely defeats the sandbox, because the frame keeps its real origin and can act
with its own credentials. Also drop `allow-downloads`. Do not add `allow-top-navigation`
or `allow-popups` to any of them.

Expected consequence: embeds that demand an un-sandboxed frame will refuse to play. That
is the correct outcome — task 2 makes that refusal legible instead of an infinite spinner.
**Do not "fix" a refusing embed by weakening or removing the sandbox.**

---

## 2. Replace infinite spinners with a real terminal error state

Today a provider that 403s or 404s leaves `loadingServer` true forever with no way out but
closing the modal. In each of the four players:

- Give the iframe an `onLoad` handler and a load timeout (~15s). If the timeout fires
  before load, treat that server as failed.
- On failure, automatically advance to the next entry in the server list.
- When the whole server list is exhausted, stop. Render a terminal error state: a short
  message that no playable source was found, the number of servers tried, a "Retry"
  button, and a clearly visible "Close" button.
- Never leave a spinner with no exit. Escape must always close the player, and there must
  always be a visible control that does the same.

There is an existing toast system at `src/context/ToastContext.tsx` (`useToast`) — use it
for transient "trying next server" feedback rather than adding new alert dialogs.

---

## 3. Remove the false security badge

`src/services/omniShield.ts` and the duplicated `useEffect` blocks in
`UnifiedVideoPlayer.tsx:77`, `AnimePlayerModal.tsx:69`, `MediaPlayerModal.tsx:38` and
`SportsPlayerModal.tsx:29` override `window.open` on the **parent** document. Code running
inside a cross-origin iframe has its own separate `window` object and is completely
unaffected by that override. OmniShield cannot intercept anything a third-party embed does.

Meanwhile the UI asserts protection that does not exist:
- `UnifiedVideoPlayer.tsx:239` — "OmniShield 2.0 Active (Verified Stream • Zero Popups)"
- `AnimePlayerModal.tsx:232` — "OmniShield 2.0 Active (Verified Stream • Zero Popups)"
- `MediaPlayerModal.tsx:196` — "OmniShield Active • Direct Stream"

Remove these three badge strings. Keep the `window.open` override (it is harmless and does
catch same-document popups) but delete the "Verified Stream", "Zero Popups" and
"Verified" / "Zero Ads" claims wherever they appear, including the server display names in
`MediaPlayerModal.tsx` (e.g. "Server 1: VidLink Pro 4K (Ultra HD • Zero Ads)") and the
comment "100% Verified, Active High-Speed Streaming Mirrors". Nothing in the codebase
verifies these sources; the UI must not claim otherwise.

---

## 4. Bind the dev servers to loopback

`server/index.js:4767` binds `0.0.0.0`, and `vite.config.ts` sets `host: '0.0.0.0'` with
`port: 5200`. Both are currently reachable from the local network (confirmed at
192.168.1.57:3001 and :5200).

Change both to bind `127.0.0.1` by default, and make the bind host configurable via an
env var (e.g. `HOST=0.0.0.0 npm run dev`) for the case where casting to another device on
the LAN is actually wanted. Update the README to document it.

---

## 5. Add a Content-Security-Policy and standard security headers

There is no CSP today. Add `helmet` (or equivalent hand-rolled headers) to the Express app
and a `<meta http-equiv="Content-Security-Policy">` to `index.html`, with at minimum:

- `frame-src` restricted to an explicit allowlist of the embed hosts actually used, so an
  embed cannot silently redirect the frame to an arbitrary domain.
- `frame-ancestors 'none'` so the app itself cannot be framed.
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.
- Headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `X-Frame-Options: DENY`, and `Permissions-Policy` denying camera, microphone,
  geolocation, and payment.

Keep the CSP in report-only mode first if that makes it easier to see what breaks, then
enforce it. Report which directives had to be loosened and why.

---

## 6. Fix the service worker registration error

The console shows on every load:

    [error] An unknown error occurred when fetching the script.
    [warn] Service Worker registration error: Failed to register a ServiceWorker for scope ...

Find the registration call and either ship the missing service worker file referenced by
`public/manifest.json`, or remove the registration if a service worker is not wanted. Do
not leave a permanent console error.

---

## Notes and constraints

- The movie/anime/TV embed hosts in `src/services/streamingService.ts` (`vidlink.pro`,
  `multiembed.mov`, `vidsrc.me`, `vidsrc.in`, `vidsrc.pm`, `autoembed.co`, `2embed.cc`)
  are untrusted third-party sources. Treat them as hostile input throughout. Do not add
  new ones, and do not relax any sandbox, CSP, or CORS rule to accommodate them.
- Do not restructure `server/index.js` into route modules in this pass; keep the
  changeset reviewable.
- Do not touch the comics, e-books, or audiobooks reading paths.
- Leave the `/api/proxy-image` SSRF hardening as it is — it is correct (verified: a
  `127.0.0.1` probe returns 403, redirect hops capped at 5).
