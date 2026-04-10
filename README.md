# JSON Diff

A full-stack web app to compare and diff two JSON objects side-by-side with syntax highlighting, nested object expansion, and difference detection.

## Features

- Upload or paste two JSON files
- Side-by-side diff view with color-coded additions, deletions, and modifications
- Nested object/array expansion
- Syntax highlighting
- Handles large JSON files (up to 30MB)
- Shareable comparison links
- Excel export of diff results
- Clean, modern UI built with Shadcn/Radix components

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Radix UI / Shadcn, Tailwind CSS |
| Backend | Python, FastAPI, Uvicorn |
| Testing | pytest, requests |

## Prerequisites

- **Node.js** v18+ and npm
- **Python** 3.9+
- **pip**

## Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/chethanbhatbs/json_diff.git
cd json_diff
```

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install fastapi uvicorn python-dotenv pydantic openpyxl motor httpx python-multipart requests
uvicorn server:app --host 0.0.0.0 --port 8000
```

The API server starts at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

The app opens at `http://localhost:3000`.

### 4. Run both together

Open two terminals:

```bash
# Terminal 1 — Backend
cd backend && python3 -m venv venv && source venv/bin/activate && pip install fastapi uvicorn python-dotenv pydantic openpyxl motor httpx python-multipart requests && uvicorn server:app --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
cd frontend && npm install --legacy-peer-deps && npm start
```

Then open **http://localhost:3000** in your browser.

## Testing

```bash
# Backend tests (server must be running on port 8000)
cd backend
source venv/bin/activate
REACT_APP_BACKEND_URL=http://localhost:8000 python -m pytest tests/ -v
```

## Project Structure

```
json_diff/
├── frontend/          # React app (Radix UI, Tailwind)
│   ├── src/
│   └── package.json
├── backend/           # Python API server
│   ├── server.py
│   ├── requirements.txt
│   └── tests/
├── test_data_file1.json   # Sample test data
├── test_data_file2.json
└── README.md
```

## License

MIT
