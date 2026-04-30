# __PROJECT_NAME__ — Backend (FastAPI)

__DESCRIPTION__

## Setup

```bash
# Recommended: uv (https://docs.astral.sh/uv/)
uv venv
uv pip install -e ".[dev]"

# Or plain pip
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
```

Copy env file:
```bash
cp .env.example .env
# fill in keys
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs for interactive API docs.

## Docker

```bash
docker build -t __PROJECT_KEBAB__-backend .
docker run -p 8000:8000 --env-file .env __PROJECT_KEBAB__-backend
```

## Project layout

```
app/
├── main.py             # FastAPI entrypoint
├── core/
│   ├── config.py       # Settings via pydantic-settings
│   ├── auth.py         # Auth dependency (verifies caller's token)
│   └── db.py           # DB / data-stack client
└── routers/
    ├── health.py
    ├── users.py
    └── storage.py
```
