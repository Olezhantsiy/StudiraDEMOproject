#!/bin/bash
set -euo pipefail

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "==> Building and starting Studira..."
$COMPOSE up -d --build

echo "==> Waiting for backend..."
sleep 5

echo "==> Create superuser (skip if already exists):"
echo "    $COMPOSE exec backend python manage.py createsuperuser"

echo ""
echo "Done. App: http://$(hostname -I | awk '{print $1}')/"
