#!/usr/bin/env bash
# Run the public demo at http://127.0.0.1:8000 (pip install -r requirements.txt first).
set -euo pipefail
cd "$(dirname "$0")"
exec uvicorn server.app:app --host 127.0.0.1 --port "${PORT:-8000}"
