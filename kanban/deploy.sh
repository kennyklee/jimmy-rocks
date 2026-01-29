#!/bin/bash
set -e

echo '=== Pulling latest code ==='
cd /opt/apps/kanban
git pull origin main

echo '=== Rebuilding container ==='
cd /opt/docker/kanban
docker compose down
docker compose up -d --build

echo '=== Deploy complete ==='
docker ps | grep kanban
