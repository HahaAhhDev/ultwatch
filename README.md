# UltraWatch

Stream movies, TV shows, and anime in a sleek, ad-free, iOS 26-inspired glassmorphic interface.

## Features

- Movies, TV Shows, and Anime streaming
- iOS 26 glassmorphic UI (tinted black + white)
- Built-in ad blocker (blocks popups and ad scripts)
- Smart Buffer bandwidth optimization (keeps 1080p playable on 1Mbps connections)
- Continue watching, watchlist, favorites (localStorage-based, no database required)
- Multiple player sources
- Chromecast support
- Subtitle support
- Responsive design (mobile, tablet, desktop)

## Setup

No environment variables required. No database required. All data is stored locally in the browser.

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

The build output is in `dist/` and is ready for Vercel deployment. A `vercel.json` with SPA rewrites is included.

## Deploy to Vercel

1. Push to your repository
2. Import the project in Vercel
3. Vercel will auto-detect Vite and deploy with the included `vercel.json` configuration
