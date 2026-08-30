# Task: fix confirmed bugs in the OmniComic/OmniStream reader

Repo: `/Users/nathanaelgovender/Developer/comic-reader`
Stack: React 19 + Vite + Tailwind 4 frontend (`src/`), Express backend (`server/index.js`, ~1,876 lines).
Run with `npm run dev` — Vite on :5173, API on :3001, `/api` proxied.

Every issue below was reproduced against the running app. Do not re-litigate whether
they are real; the evidence is included so you can go straight to fixing. Work through
them in order. After each fix, verify it in the browser or with `curl` and report what
you saw. Run `npx tsc --noEmit` before finishing (it is currently clean — keep it clean).

---

## 1. Dead hero CTA: "Launch Panel View Demo"

Clicking it fires `GET /api/comics/sample` (200 OK) and then nothing happens — no reader,
no error.

Cause: `src/App.tsx` ~line 379 gates on `if (sample.chapters && sample.pages)`, but the
server's `/api/comics/sample` response has no `chapters` key. Confirmed:

    top-level keys: [id, source, title, description, cover, author, year, type, status, total, pages]
    has chapters? false

The offline fallback object in `src/services/api.ts` ~line 86 *does* include `chapters`,
so the demo only works when the backend is down.

Fix: add a `chapters` array to the server's sample payload so it matches the `Comic` type
in `src/types/comic.ts`. Also make the guard in `handleLaunchSample` fail loudly instead
of silently returning — a silent no-op on a primary CTA should never be possible.

Verify: click the button, confirm the reader opens on the 4-page sample.

---

## 2. Empty MangaDex chapters produce an unrecoverable infinite spinner

Repro: open the manga "Na Honjaman Level-Up" from the Comics tab, click "Start Issue #1".
`GET /api/comics/chapter/mangadex/f7d2cb75-83b2-426b-bdbd-032870c30abb` returns
`200 {"chapterId":"...","source":"mangadex","total":0,"pages":[]}`.

Root cause is upstream — MangaDex itself returns an empty chapter for these (they are
externally hosted / licensed):

    GET https://api.mangadex.org/at-home/server/f7d2cb75-83b2-426b-bdbd-032870c30abb
    {"result":"ok","baseUrl":"...","chapter":{"hash":"","data":[],"dataSaver":[]}}

`src/components/Reader/ReaderContainer.tsx` ~line 279 then renders a bare
"Loading Comic Pages..." spinner forever. There is no error, no back button. Escape does
exit, but nothing tells the user that.

Three fixes required:

a) `server/index.js`, mangadex branch of `app.get('/api/comics/chapter/:source/:chapterId')`
   (~line 676): the existing guard only checks `!serverData.chapter || !serverData.chapter.data`.
   Also treat `data.length === 0` as a 404 with a clear message. Critically, do **not**
   call `setCache` on that path — right now a transient empty result is cached as a
   success for 30 minutes, so retrying does not help.

b) Filter out unreadable chapters at the list stage. MangaDex chapter objects carry
   `attributes.externalUrl`; chapters with a non-null value have no hosted pages. Find
   where the chapter list is built (`/api/comics/details/:source/:id`) and exclude them,
   or mark them so the UI can disable them.

c) `ReaderContainer.tsx`: replace the empty-pages spinner with a real error state —
   a message explaining the chapter has no readable pages plus a visible button that
   calls `onExit()`. The reader should never present a spinner it cannot exit.

Verify: reopen that same chapter, confirm you get an explanatory error and can get back
to the library by clicking, not just by guessing Escape.

---

## 3. Archive.org page counts are fabricated

`server/index.js` ~line 720, the `source === 'archive'` branch. When an archive item has
no loose image files, the code invents a page count:

    const totalPages = parseInt(metaData.metadata?.imagecount || metaData.metadata?.pages || '28', 10);

then generates `https://archive.org/download/{id}/page/n{i}_w1600.jpg` for each.

For "Invincible [Compendiums]" (`invincible-compendiums`) both `imagecount` and `pages`
are undefined, so it falls through to the hardcoded `28`. The item is a ~2 GB CBR of a
roughly 1,000-page compendium. The reader displays a confident "Page 1 of 28" and the
rest of the book is simply unreachable.

The generated URLs *do* resolve (302 -> BookReaderImages.php -> 200 image/jpeg), so the
URL scheme is correct — only the count is wrong.

Fix: derive the real page count from archive.org's BookReader metadata rather than
guessing. If it genuinely cannot be determined, do not fabricate a number — return
something the UI can render as "length unknown" instead of a false total.

Verify: open Invincible from the "Western Comics (DC / Marvel)" filter and confirm the
page count is either correct or honestly unknown.

---

## 4. Page images render into a blank void with no loading state

Highest-impact UX problem. Archive pages take 5-10 seconds because each request goes
through a redirect chain into `BookReaderImages.php`. During that window the reader shows
completely empty space — no skeleton, no spinner, no reserved dimensions. The app looks
broken.

Fix in the reader page components (`src/components/Reader/PaginationView.tsx`,
`PageCanvas.tsx`, `ReaderContainer.tsx`):
- Reserve the page's aspect box so layout does not jump when the image lands.
- Show a skeleton or spinner scoped to the page area while the image loads.
- Preload page N+1 (and N-1) in the background so forward navigation feels instant.

Verify: navigate forward through several Invincible pages and confirm you always see a
loading affordance, never blank space.

---

## 5. Panel detection races the image load

In Panel View the indicator was observed changing from `Panel 1 / 1` to `Panel 1 / 3` on
the *same* page a few seconds later: detection re-runs once the full-resolution image
arrives, and arrow-key presses during that window act on stale panel data.

Fix: track a detection-settled state in `src/services/panelDetector.ts` /
`src/components/Reader/PanelView.tsx`, and either queue or ignore panel navigation until
detection for the current page has completed. Show that detection is in progress.

---

## 6. Panel detection produces false panels on covers and splash pages

On the Invincible cover, the detector treated the "INVINCIBLE" logo lettering as three
separate panels. The camera framing math itself is correct — the active panel box measured
214-1078px in a 1280px viewport, properly centred and fitted — so this is purely a
heuristic problem in `src/services/panelDetector.ts`.

Fix: reject implausible panel regions, e.g. very wide-and-short bands typical of logo
lettering, and regions whose union does not sensibly tile the page. Consider treating
page 1 as a single full-page panel by default.

---

## 7. SECURITY: `/api/proxy-image` is a fully open proxy

`server/index.js` line ~131. No scheme allowlist, no host allowlist, no content-type
check, and it sets `Access-Control-Allow-Origin: *`. Combined with the wide-open
`app.use(cors())` on line 112, any web page the user visits can use this server to read
their local network and read the responses cross-origin. Both confirmed:

    GET /api/proxy-image?url=http://127.0.0.1:3001/api/comics/sample
      -> 200, Content-Type: application/json

    GET /api/proxy-image?url=https://example.com/
      -> 200, Content-Type: text/html

Fix, minimum:
- Reject any scheme other than `http:` / `https:`.
- Resolve the hostname and block loopback, link-local, and RFC1918 private ranges
  (guard against DNS rebinding by validating the resolved IP, not just the hostname).
- Require the upstream `Content-Type` to start with `image/`; reject otherwise.
- Cap the redirect chain (the handler currently re-redirects the client with no hop limit).
- Tighten `cors()` to the dev origin instead of allowing everything.

Verify: re-run both curl commands above and confirm they are now rejected, while a real
MangaDex or archive.org cover still loads in the app.

---

## 8. Replace `alert()` error handling

Seven native `alert()` calls: `src/App.tsx` lines ~350, 367, 430, 450, 472, 523 and
`src/components/RSS/RSSPuller.tsx` line ~129. They break fullscreen reading and clash
with an otherwise polished UI. Add a small toast component and route these through it.

---

## 9. Naming is inconsistent

The package is `comic-reader`, `README.md` says "OmniComic", the UI header says
"OmniStream", and the app has tabs for Comics, Anime, Movies, E-Books, Audiobooks, Sports
and RSS. `README.md` documents only the comic features and does not mention that the rest
of the app exists.

Pick one name, apply it consistently across `package.json`, `README.md`, `index.html` and
the header component, and update the README to cover the non-comic tabs.

---

## Out of scope — do not do these

- Do not "fix" the duplicated `/api/comics/popular` requests in dev; that is React
  StrictMode double-invoking effects and is expected.
- Do not restructure `server/index.js` into multiple route files as part of this pass.
  It is worth doing, but keep this changeset reviewable.
- Do not touch the "AI Intel" feature. It is a hardcoded string template with no model
  behind it, which the repo owner is deciding about separately.
