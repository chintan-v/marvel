# 🎬 Marvel Cinematic Universe (MCU) Streaming Hub

A modern, responsive web application listing all Marvel movies in chronological release date order, with one-click direct access to stream each movie on **CineHD** (`https://cinehd.vc/home`).

---

## 🚀 How to Run the Website

Because this is built with lightweight vanilla HTML, CSS, and JavaScript, **no installation or build steps are required**.

### Option 1: Direct in your browser
Simply double-click [`index.html`](file:///c:/Users/chint/OneDrive/Desktop/Marvel/index.html) or right-click and choose **Open with > Chrome / Edge / Firefox / Brave**.

### Option 2: Local HTTP Server (Optional)
If you have Python or Node installed, you can start a local development server:
```bash
# Using Python:
python -m http.server 3000

# Or using npx serve:
npx serve .
```
Then visit `http://localhost:3000`.

---

## 🍿 Streaming Integrations (CineHD & AutoEmbed)

The application supports direct movie streaming via official TMDb movie IDs:
- **AutoEmbed**: `https://watch-v2.autoembed.app/movie/{tmdb_id}` (e.g. Iron Man 2 → `/movie/10138`)
- **CineHD**: `https://cinehd.vc/movie/{tmdb_id}`
- All **39 Marvel movies** are mapped to their verified TMDb IDs, meaning **clicking any movie card, title, or watch button opens that exact movie's streaming page directly**.
- Examples:
  - *Iron Man (2008)* → `/movie/1726`
  - *Iron Man 2 (2010)* → `/movie/10138`
  - *The Avengers (2012)* → `/movie/24428`
  - *Avengers: Endgame (2019)* → `/movie/299534`
  - *Deadpool & Wolverine (2024)* → `/movie/533535`

---

## ✨ Features

- **Release Date Chronological Order**: Complete MCU catalog from *Iron Man (2008)* through Phase 5 and upcoming Phase 6 releases.
- **One-Click Streaming**:
  - Clicking a movie title, poster, or watch button opens the movie in a new tab.
- **Customizable Streaming Settings**:
  - Easily switch between **AutoEmbed Direct** (`https://watch-v2.autoembed.app/movie/{tmdb_id}`), **CineHD Direct** (`https://cinehd.vc/movie/{tmdb_id}`), or search providers (Disney+, Netflix, Prime Video, Google).
  - Individual override: Click the ✏️ **edit icon** on any movie card to paste a custom direct URL for that specific film.
- **Search & Filter**:
  - Real-time instant search by title, hero, director, or release year.
  - Phase filter tabs: **All Phases**, **Phase 1**, **Phase 2**, **Phase 3**, **Phase 4**, **Phase 5**, **Phase 6**.
  - Sorting options: Earliest Release First, Latest Release First, and Alphabetical (A–Z).
- **MCU Watch Tracker**:
  - Mark movies as watched with the checkmark button.
  - Live progress bar and completion counter stored safely in your browser's `localStorage`.

---

## 🛠️ Project Structure

- [`index.html`](file:///c:/Users/chint/OneDrive/Desktop/Marvel/index.html): Main application interface and configuration modals.
- [`styles.css`](file:///c:/Users/chint/OneDrive/Desktop/Marvel/styles.css): High-end Marvel Studios cinematic dark theme with responsive grid layout and neon accents.
- [`movies.js`](file:///c:/Users/chint/OneDrive/Desktop/Marvel/movies.js): Complete MCU movie dataset with TMDb IDs, release dates, phases, runtimes, directors, official posters, and synopses.
- [`app.js`](file:///c:/Users/chint/OneDrive/Desktop/Marvel/app.js): Core dynamic filtering, CineHD URL resolution, storage persistence, and modal controls.
