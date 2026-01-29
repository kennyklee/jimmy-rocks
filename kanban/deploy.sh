#!/bin/bash
set -e

cd /opt/apps/kanban

echo '=== Pulling latest code ==='
git pull origin main

echo '=== Rebuilding container ==='
docker compose down
docker compose up -d --build

echo '=== Deploy complete ==='
docker ps | grep kanban
