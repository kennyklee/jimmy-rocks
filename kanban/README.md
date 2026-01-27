# Kanban

A clean, minimal kanban board for Kenny & Jimmy.

## Features

- **5 columns:** Backlog, Todo, Doing, Review, Done
- **Drag and drop** between columns
- **Assignees** — tasks assigned to Kenny or Jimmy (default: Jimmy)
- **Priority levels** — low, medium, high, urgent
- **Comments/updates** thread per item
- **Metrics dashboard** — cycle time, throughput, stage analytics
- **Stage history tracking** — time spent in each column
- Dark mode UI (Linear-inspired)
- Mobile responsive
- Auto-refresh every 10 seconds

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla JS, CSS, Chart.js
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

- **Board:** http://srv1243045.tail8f0298.ts.net:3333
- **Metrics:** http://srv1243045.tail8f0298.ts.net:3333/metrics.html
- **Network:** Tailscale only (internal)

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/board` | GET | Get full board state |
| `/api/metrics` | GET | Get metrics and analytics |
| `/api/items` | POST | Create new item |
| `/api/items/:id` | PUT | Update item |
| `/api/items/:id` | DELETE | Delete item |
| `/api/items/:id/move` | POST | Move item to column |
| `/api/items/:id/comments` | POST | Add comment |

## Metrics

The metrics dashboard (`/metrics.html`) provides:

- **Overview cards** — total tasks, completed, in-progress, avg cycle time
- **Tasks by Column** — doughnut chart
- **Tasks by Assignee** — doughnut chart
- **Avg Time per Stage** — bar chart showing bottlenecks
- **Throughput** — line chart of tasks completed over time
- **Cycle Time table** — individual task completion times

## Data Model

```javascript
{
  id: "item-123",
  title: "Task title",
  description: "Details...",
  priority: "high",
  assignee: "jimmy",        // kenny | jimmy | null
  createdAt: "2026-01-27T...",
  createdBy: "kenny",
  comments: [...],
  stageHistory: [           // Tracks column transitions
    { column: "todo", enteredAt: "2026-01-27T..." },
    { column: "doing", enteredAt: "2026-01-27T..." }
  ]
}
```

## Data

Data is stored in a Docker volume (`kanban-data`), not tracked in git.
