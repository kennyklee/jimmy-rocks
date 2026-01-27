# Kanban

A clean, minimal kanban board for Kenny & Jimmy.

## Features

- 4 columns: Backlog, To Do, In Progress, Done
- Drag and drop between columns
- Priority levels (low, medium, high, urgent)
- Comments/updates thread per item
- Dark mode UI (Linear-inspired)
- Mobile responsive
- Auto-refresh every 10 seconds

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla JS, CSS
- **Data:** JSON file storage

## Local Development

```bash
npm install
npm run dev
```

Runs on http://localhost:3333

## Deployment

Deployed via Docker. See `/opt/docker/kanban/docker-compose.yml`

```bash
cd /opt/docker/kanban
docker compose up -d --build
```

## Access

- **URL:** http://srv1243045.tail8f0298.ts.net:3333
- **Network:** Tailscale only (internal)

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/board` | GET | Get full board state |
| `/api/items` | POST | Create new item |
| `/api/items/:id` | PUT | Update item |
| `/api/items/:id` | DELETE | Delete item |
| `/api/items/:id/move` | POST | Move item to column |
| `/api/items/:id/comments` | POST | Add comment |

## Data

Data is stored in a Docker volume (`kanban-data`), not tracked in git.
