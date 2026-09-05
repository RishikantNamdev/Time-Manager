# Timetable Manager

> **Live Application**: [https://time-manager-flame-eight.vercel.app/](https://time-manager-flame-eight.vercel.app/)

A zero-friction, offline-first 24-hour time budget manager and routine scheduler built with React, TypeScript, Vite, and Tailwind CSS. Designed to treat time as a strict daily currency with zero pre-loaded clutter and full user data ownership.

---

### Core Features

- **24-Hour Daily Time Budget Engine**:
  - Treats each day as a finite 24-hour resource pool (1,440 minutes).
  - Live metric visualization tracking allocated time, breaks, and remaining free budget.
  - Built-in collision and overlap detection with rollover protections.

- **7-Day Grid & Timeline Management**:
  - Full weekly view with granular per-day scheduling.
  - Master Routine Inheritance: configure weekly recurring templates that automatically inherit across schedules.
  - Task and break categorization with dynamic color coding.

- **Clean Slate Architecture**:
  - Zero mock/seed data on first launch—starts with an empty, distraction-free canvas.
  - Dedicated "Clear All Tasks & Reset" utility to return to a clean schedule instantly.

- **Dark Mode Support**:
  - Built-in theme switcher (Light / Dark mode) with automated system-preference fallback (`prefers-color-scheme`).
  - Persistent theme selection via `localStorage`.

- **PWA & Offline-First Persistence**:
  - IndexedDB storage engine ensuring all schedule data persists locally across reloads and offline sessions.
  - Fully compliant Progressive Web App (PWA) with installable manifest and service worker caching.

- **Data Portability & Standalone Build**:
  - Zero vendor lock-in: export and restore full schedule state via structured JSON files.
  - Dedicated single-file compilation target (`npm run build:singlefile`) producing an entirely self-contained HTML artifact (`dist/standalone.html`) runnable directly in any browser without a web server.

---

### Tech Stack

- **Framework**: React 18+ with TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Storage**: IndexedDB
- **Deployment**: Vercel

---

### Getting Started

#### Prerequisites
- Node.js (v20 or v22 recommended)
- npm or pnpm

#### Installation

```bash
# Clone the repository
git clone https://github.com/RishikantNamdev/Time-Manager.git
cd Time-Manager

# Install dependencies
npm install
```

#### Development

```bash
npm run dev
```

#### Production Builds

```bash
# Standard production build (outputs to dist/)
npm run build

# Standalone single-file HTML build (outputs dist/standalone.html)
npm run build:singlefile
```

---

### Deployment

Configured for continuous deployment via **Vercel**:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Base Path**: `/` (root)
