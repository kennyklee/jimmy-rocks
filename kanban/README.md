# Kanban

A clean, minimal kanban board for Kenny & Jimmy.

## Features

### Core
- **5 columns:** Backlog, Todo, Doing, Review, Done
- **Drag and drop** — between columns and reorder within
- **Assignees** — Kenny or Jimmy (default: Jimmy)
- **Priority levels** — low, medium, high, urgent
- **Ticket numbers** — #1, #2, etc. for easy reference
- **Tags** — categorize with code/feature, code/bugfix, blocked, self-improvement, etc.

### Collaboration
- **Comments thread** — per-task conversation
- **@mentions** — type @kenny or @jimmy, Tab to autocomplete
- **Auto-comments** — system logs moves, assignments, blocks
- **Notifications API** — webhook for @jimmy mentions, Kenny comments

### Search & Filter
- **Text search** — filter by title/description
- **Tag filter** — dropdown to filter by any tag

### Metrics & Analytics
- **Dashboard** — /metrics.html
- **Cycle time** — time from start to done
- **Stage history** — time spent in each column
- **Throughput** — tasks completed over time

### UI/UX
- **Dark mode** — Linear-inspired design
- **Drag and drop** — Purple box placeholder shows drop position, auto-scroll near edges
- **Deep linking** — ?task=item-123 opens modal
- **Mobile responsive**
- **Auto-refresh** — every 10 seconds
- **Keyboard shortcuts** — n (new), j/k (navigate), Escape (close), Cmd+Enter (submit)
- **Undo** — Ctrl+Z to undo moves and deletes


## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla JS, CSS, Chart.js
- **Data:** JSON file storage (Docker volume)

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/board` | GET | Full board state |
| `/api/metrics` | GET | Analytics data |
| `/api/items` | GET | All items (flat) |
| `/api/items` | POST | Create item |
| `/api/items/:id` | PUT | Update item |
| `/api/items/:id` | DELETE | Delete item |
| `/api/items/:id/move` | POST | Move to column |
| `/api/items/:id/comments` | POST | Add comment |
| `/api/notifications` | GET | Pending notifications |
| `/api/notifications/:id` | DELETE | Clear notification |

## Deployment

**Docker (production):**
```bash
cd /opt/docker/kanban
docker compose up -d --build
```

**Local dev:**
```bash
npm install
npm run dev  # or: node server.js
```

## Access

- **Board:** http://100.108.213.40:3333/
- **Metrics:** http://100.108.213.40:3333/metrics.html
- **Network:** Tailscale only (internal)

## Workflow

1. Kenny creates tasks → Backlog or Todo
2. Jimmy picks up → moves to Doing
3. Jimmy completes → moves to Review
4. Kenny approves → moves to Done

**Rules:**
- Jimmy never moves directly to Done (always Review first)
- Only Kenny moves tasks to Done
- Use @jimmy in comments to ping Jimmy

## Data

Stored in Docker volume `kanban-data`. Not tracked in git.

```javascript
{
  id: "item-123",
  number: 1,
  title: "Task title",
  description: "Details...",
  priority: "high",
  assignee: "jimmy",
  tags: ["code/feature", "blocked"],
  createdAt: "2026-01-27T...",
  createdBy: "kenny",
  comments: [...],
  stageHistory: [
    { column: "todo", enteredAt: "..." },
    { column: "doing", enteredAt: "..." }
  ]
}
```

---

*Built by Jimmy for Kenny & Jimmy collaboration.*
