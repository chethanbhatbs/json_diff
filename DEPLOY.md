# Deploy JSON Diff (free tier)

Three free services, ~20 minutes:

- **MongoDB Atlas** — free 512 MB cluster (database)
- **Render** — free Python web service (FastAPI backend)
- **Vercel** — free static hosting (React frontend)

---

## 1. MongoDB Atlas (5 min)

1. Sign up at https://www.mongodb.com/cloud/atlas/register
2. Create a **free M0 cluster** (any region close to you)
3. **Database Access** → Add user → username + password (save these)
4. **Network Access** → Add IP → **Allow access from anywhere** (`0.0.0.0/0`)
5. **Database** → Connect → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<user>` and `<pass>` with the credentials from step 3.

---

## 2. Render — Backend (8 min)

1. Sign up at https://render.com using your GitHub account
2. **New +** → **Blueprint**
3. Pick the **`chethanbhatbs/json_diff`** repo. Render auto-detects `render.yaml`.
4. Render asks for the two secret env vars:
   - `MONGO_URL` → paste your Atlas connection string from step 1
   - `REACT_APP_BACKEND_URL` → leave blank for now (we'll set this after deploy)
5. Click **Apply**. Wait ~3–5 minutes for the first build.
6. Once deployed, copy the public URL — e.g. `https://json-diff-api.onrender.com`
7. Back in Render → your service → **Environment** → set `REACT_APP_BACKEND_URL` to that URL. Click **Save Changes** (triggers a redeploy).

> Free tier sleeps after 15 minutes idle. First request after sleep takes ~30 seconds to wake.

---

## 3. Vercel — Frontend (5 min)

1. Sign up at https://vercel.com using your GitHub account
2. **Add New** → **Project** → import **`chethanbhatbs/json_diff`**
3. Configure:
   - **Root Directory** → `frontend`
   - **Framework Preset** → Create React App
4. **Environment Variables** → add:
   - Name: `REACT_APP_BACKEND_URL`
   - Value: your Render backend URL from step 2 (e.g. `https://json-diff-api.onrender.com`)
5. Click **Deploy**. ~2 minutes.
6. Copy the Vercel URL — e.g. `https://json-diff.vercel.app`

---

## 4. (Optional) Custom domain

In Vercel → Project → **Settings** → **Domains** → add your domain. Vercel walks you through the DNS changes.

---

## Local development

```bash
# Backend
cd backend
cp .env.example .env       # edit MONGO_URL
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend (in another terminal)
cd frontend
cp .env.example .env       # REACT_APP_BACKEND_URL=http://localhost:8001
npm install --legacy-peer-deps
npm start
```

---

## Troubleshooting

- **Render build fails on Python version** — `render.yaml` pins Python 3.11.9; bump if dependencies need newer.
- **CORS error in browser** — backend currently allows all origins (`allow_origins=["*"]`). If you tighten it, add your Vercel URL.
- **Mongo connection timeout** — check Atlas Network Access allows `0.0.0.0/0` (or add Render's IPs).
- **Frontend can't reach backend** — confirm `REACT_APP_BACKEND_URL` is set in Vercel and the value has no trailing slash.
