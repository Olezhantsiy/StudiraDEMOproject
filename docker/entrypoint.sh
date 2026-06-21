#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
until python - <<'PY'
import os
import sys

import psycopg

try:
    psycopg.connect(
        dbname=os.environ.get("DB_NAME", "studira"),
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", "root"),
        host=os.environ.get("DB_HOST", "db"),
        port=os.environ.get("DB_PORT", "5432"),
    ).close()
except Exception:
    sys.exit(1)
PY
do
  sleep 1
done

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

exec "$@"
