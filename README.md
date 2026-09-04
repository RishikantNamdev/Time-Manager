# Timetable Manager

> **24-Hour Time Budgeting & Productivity Engine**  
> A rigorous, deterministic time allocation and schedule intelligence system built for high-performance engineers and knowledge workers.

---

## Overview

Most calendar and to-do apps treat daily time as an infinite scroll. **Timetable Manager** enforces a strict mathematical reality: **every day contains an exact, non-negotiable budget of 1,440 minutes.**

By treating time like a finite financial balance sheet, the engine calculates your allocated vs. available minutes in real-time, accounts for restorative sleep and meal blocks, flags overlapping scheduling collisions, and calculates gaps between focus sessions.

---

## Key Features

### 1. 24-Hour Day Budget Pool (1,440 Minutes)
- **Strict 1,440-Minute Daily Pool:** Real-time pool metrics compute allocated task minutes, downtime rest minutes, and available time remaining.
- **Dynamic Over-Budget Alerts:** Immediate visual warnings when scheduled blocks exceed 1,440 minutes.
- **Overnight Rollover Engine:** Seamless calculation across midnight windows (e.g., `23:00` – `07:00` = `480m`).
- **Fixed vs. Floating Allocation:**
  - *Fixed Blocks:* Locked to specific clock windows on the timeline (e.g., `09:00 – 11:30`).
  - *Floating Goals:* Duration-only targets (e.g., `Read 45m`) that deduct from available pool time without set start/end times.

### 2. Multi-View Architecture
- **Daily Schedule:** Chronological timeline feed, live KPIs, interactive checkable task cards, and quick category filtering.
- **7-Day Comparison Grid:** Side-by-side weekly comparison of Monday through Sunday with mini 1,440-minute stacked progress bars and one-click "Open Day" deep-links.
- **Productivity & Progress Analytics:**
  - **Work-to-Rest Ratio:**
    $$\text{Work-to-Rest Ratio} = \frac{\text{Total Task Minutes}}{\text{Total Break/Rest Minutes}}$$
    Normalized to `X.X : 1` with health and focus descriptors (*Optimal Recovery*, *Balanced Output*, *High Strain*).
  - **Completion Velocity:** Weekly task completion percentage and remaining backlog counter.
  - **Category Breakdown:** Proportional distribution across `Work`, `Personal`, `Health`, `Learning`, and `Rest`.
  - **Priority Breakdown:** High (Rose), Medium (Amber), and Low (Emerald) volume and time commitments.
- **Master Routine Manager (Global Habits Layer):**
  - Define baseline habits (Sleep, Morning Routine, Lunch, Daily Review).
  - Recurrence rules: `Daily`, `Weekdays (M-F)`, `Weekends`, or `Custom` days.
  - **Inheritance & Exception Architecture:** Daily schedules dynamically inherit master routines. Local edits and deletions on specific days create overrides and exclusions without mutating the global template.

### 3. Timeline Intelligence: Collisions & Gap Fillers
- **Collision & Overlap Detection:** Automatically identifies `(startA < endB && endA > startB)` intervals, rendering conflict warning banners with exact overlapping minute counts.
- **Free Slot Gap Calculation:** Automatically detects unscheduled time windows between blocks and renders interactive `+ Free Slot (Xm)` cards that pre-fill the creation dialog upon click.

### 4. Zero-Install Standalone Distribution & Offline PWA
- **Progressive Web App (PWA):** Web manifest and offline cache-first service worker for installable native desktop/mobile experience.
- **Standalone Single-File Build:** Generates a self-contained `dist/standalone.html` file (~798 kB) bundling all scripts, CSS, fonts, and SVGs. Opens directly from your local file system without Node.js, an internet connection, or a server.
- **Data Portability:** One-click JSON backup export and validated JSON restore with schema integrity checking.

---

## Design System & Aesthetics

Built on a Vercel-inspired stark monochrome design system specified in [`DESIGN.md`](./DESIGN.md):
- **Typography:** Authentic [Geist](https://vercel.com/font) geometric sans paired with [Geist Mono](https://vercel.com/font/mono) for technical labels and numbers.
- **Surfaces:** Pure white (`#ffffff`), 98% soft canvas (`#fafafa`), and ink black (`#171717`).
- **Elevation:** Stacked multi-stop natural light shadows (`shadow-level-1`, `shadow-level-2`, `shadow-level-3`, `shadow-level-5`) with hairline border rings.
- **Keyboard-First Controls:**
  - `Escape` dismisses open modals.
  - `Enter` submits modal dialogs.
  - `Shift + Enter` enters newlines in description textareas.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Core** | React 18, TypeScript 5, Vite 6 |
| **Styling** | Tailwind CSS 3, PostCSS, Autoprefixer |
| **Typography** | `@fontsource/geist-sans`, `@fontsource/geist-mono` |
| **State Management** | Zustand |
| **Persistence** | IndexedDB via `idb-keyval` (with `localStorage` fallback) |
| **Icons** | Lucide React |
| **Standalone Packaging** | `vite-plugin-singlefile` |
| **CI / CD** | GitHub Actions (`.github/workflows/deploy.yml`) to GitHub Pages |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0 or newer)
- `npm` (version 9.0 or newer)

### Installation

```bash
# Clone repository
git clone https://github.com/RishikantNamdev/Time-Manager.git
cd Time-Manager

# Install production and development dependencies
npm install
```

### Development Server

Start the local development server with hot module replacement (HMR):

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `vite` | Starts local development server on port 5173 |
| `npm run build` | `tsc && vite build` | Typechecks and compiles standard production web bundle to `dist/` |
| `npm run build:singlefile` | `tsc && vite build --config vite.config.singlefile.ts && ...` | Compiles zero-install `dist/standalone.html` single-file app |
| `npm run preview` | `vite preview` | Serves the production build locally for verification |

---

## Deployment to GitHub Pages

This repository includes an automated GitHub Actions workflow in [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml).

To deploy:
1. Push your changes to the `main` branch.
2. In your GitHub repository settings, navigate to **Pages**.
3. Under **Build and deployment > Source**, select **GitHub Actions**.
4. The deployment pipeline will automatically build and publish the application.
