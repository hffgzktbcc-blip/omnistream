# ⚡ OmniStream — The All-in-One Entertainment Hub

**OmniStream** is an all-in-one entertainment streaming & reader web application combining **Comics & Manga**, **Anime**, **Movies & TV Shows**, **E-Books**, **Audiobooks**, **Live Sports Streams**, and **RSS Feed News** into a unified, high-performance web experience.

---

## 🌟 Features Across All Hubs

### 1. 📚 Comics & Manga Reader
- **Smart Guided Panel View (`P`):**
  - Advanced Canvas-based gutter profiling and sequential panel bounding box detection.
  - Cinematic animated camera zoom and pan transitions focused directly on panels.
  - Interactive Page Overview & minimap.
- **Single Page (`S`) & Double Page (`D`):**
  - Smooth slide transitions with optional *First Page Cover* offset toggle.
- **Vertical Scroll / Webtoon Mode (`V`):**
  - Infinite vertical canvas with custom gutter spacing (0px, 8px, 16px).
- **Reading Direction:** Instant switch between Left-to-Right (Western) and Right-to-Left (Manga).
- **Multi-Source Catalog:** MangaDex API, Internet Archive Graphic Novels (Marvel, DC, Image), Webtoons, and custom URL scraper.
- **Local Files:** Direct drag-and-drop support for `.cbz` and `.zip` archives.

### 2. 🎌 Anime Streaming
- **Multi-Server Streaming Engines:** Instant playback via rock-solid high-speed CDNs (2Embed VIP, VidLink Pro 4K, SuperEmbed).
- **TMDB & AniList Integration:** Synchronized anime metadata, cover art, episode guides, and seasons.
- **Integrated Theater Player:** Season/episode picker with auto-next and ad-shielding sandbox.

### 3. 🎬 Movies & TV Shows
- **Full TMDB Catalog:** Trending movies, popular TV series, top-rated cinematic masterpieces.
- **Multi-Source Video Engine:** Switch seamlessly between 4K/HD streaming servers (VidLink Pro, 2Embed, Vidsrc, AutoEmbed).
- **Season & Episode Selector:** Easy navigation across TV show seasons with thumbnail previews.

### 4. 📖 Modern E-Books & Web Novels
- **Multi-Source Discovery:** Millions of titles searchable via OpenLibrary and Web Novel catalogs.
- **In-App Digital Reader:** Customizable typography (Inter, Serif, Mono), font sizing, line height, and color themes.
- **OceanofPDF One-Click Access:** Direct links to download and import full books into your local offline shelf.
- **Local File Uploads:** Drag-and-drop `.epub`, `.txt`, and `.md` files for instant offline reading.

### 5. 🎧 Audiobooks & Background Player
- **Multi-Source Catalog:** Stream full audiobooks and dramatized editions from YouTube, LibriVox, and Internet Archive Audio.
- **Persistent Global MiniPlayer:** Background audio playback engine that continues playing seamlessly while you browse comics, anime, or other tabs.
- **Playback Controls:** Scrubbing bar, playback speed toggles (0.75x to 2x), 15s skip buttons, and chapter navigation.

### 6. ⚽ Live Sports
- **Global Match Center:** Live coverage across Premier League Football, NBA Basketball, Formula 1 Grand Prix, and UFC / MMA fights.
- **Multi-Server Live Feeds:** Direct embed players with server switching to bypass buffering or broadcast restrictions.

### 7. 📰 RSS Puller
- **Curated Feeds:** Breaking headlines from Anime News Network, IGN, GoodReads, BBC World News, and Formula 1.
- **Custom RSS Importer:** Paste any valid RSS or Atom feed URL to aggregate articles inside the app.

### 8. 🛡️ Security & Performance
- **Protected Image Proxy (`/api/proxy-image`):** DNS-validated SSRF protection blocking private RFC1918, loopback, and link-local ranges, with upstream `image/*` content-type verification.
- **Local Storage Library:** Bookmarks, reading percentages, favorites, and custom uploaded books persisted in browser storage.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Right Arrow` / `Space` | Next Panel / Next Page |
| `Left Arrow` / `Shift+Space` | Previous Panel / Previous Page |
| `P` | Toggle Smart Guided Panel View |
| `S` | Single Page Mode |
| `D` | Double Page Spread Mode |
| `V` | Vertical Scroll / Webtoon Mode |
| `F` | Toggle Fullscreen |
| `B` | Add Bookmark |
| `Esc` | Return to Library / Close Modal |

---

## 🚀 Running the App

```bash
cd /Users/nathanaelgovender/Developer/comic-reader

# Install dependencies (if needed)
npm install

# Start both Express Backend API (:3001) and Vite Dev Server (:5173)
npm run dev
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3001](http://localhost:3001)
