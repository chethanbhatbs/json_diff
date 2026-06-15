<h1 align="center">JSON Diff</h1>

<p align="center">
 Compare two JSON files side-by-side - color-coded diffs, nested expansion, share links, Excel export.<br>
 <sub>React · FastAPI · MongoDB</sub>
</p>

<p align="center">
 <a href="#"><img src="https://img.shields.io/badge/🌐_Live_Demo-coming_soon-blue?style=for-the-badge" alt="Live Demo" /></a>
 <a href="DEPLOY.md"><img src="https://img.shields.io/badge/⚡_Deploy_your_own-Free_tier-2ea44f?style=for-the-badge" alt="Deploy" /></a>
</p>

> **Live URL:** _add your Vercel URL here after deploying - see [DEPLOY.md](DEPLOY.md)_

---

## What it does

- Paste or upload two JSONs (up to 30 MB) → see a side-by-side diff
- Color-coded additions, deletions, modifications
- Collapsible nested objects and arrays
- Syntax highlighting
- **Share links** - comparisons live at a URL anyone can open
- **Excel export** - diff result as a styled `.xlsx`
- **History** - your past comparisons saved and searchable

---

## Run it locally

```bash
# Backend (port 8001)
cd backend
cp .env.example .env # edit MONGO_URL - pointing to local Mongo or Atlas
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend (port 3000) - in another terminal
cd frontend
cp .env.example .env # REACT_APP_BACKEND_URL=http://localhost:8001
npm install --legacy-peer-deps
npm start
```

Open http://localhost:3000.

---

## Deploy your own

Full step-by-step in **[DEPLOY.md](DEPLOY.md)** - MongoDB Atlas + Render + Vercel, all free tier, ~20 minutes.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Radix UI / Shadcn, Tailwind CSS |
| Backend | FastAPI, Uvicorn, Motor (async MongoDB) |
| Database | MongoDB (Atlas in production) |
| Diff engine | Python `difflib` for word/text diffs; custom JSON walker for structural diffs |
| Export | `openpyxl` for styled Excel output |

---

<p align="center">
 <sub>Built with <a href="https://emergent.sh">Emergent</a> + <a href="https://claude.ai/code">Claude Code</a> · refined by hand</sub>
</p>
