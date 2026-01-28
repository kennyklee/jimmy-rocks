# Kanban

A clean, minimal kanban board for Kenny & Jimmy.

## Features

### Core
- **5 columns:** Backlog, Todo, Doing, Review, Done
- **Drag and drop** — between columns and reorder within
- **Assignees** — Kenny, Jimmy, Dev, QA (default: Jimmy)
- **Priority levels** — low, medium, high, urgent
- **Ticket numbers** — #1, #2, etc. for easy reference
- **Tags** — required for every task (auto-defaults to "needs-triage" if you don't choose one). Examples: code/feature, code/bugfix, blocked, self-improvement, etc.

### Collaboration
- **Comments thread** — per-task conversation
- **@mentions** — type @jimmy, @dev, or @qa, Tab to autocomplete
- **Auto-comments** — system logs moves, assignments, blocks
- **Notifications API** — webhook for @jimmy/@dev/@qa mentions and comments

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

## Multi-Agent Team

This project is run by a small multi-agent team with clear handoffs:

- **@Jimmy (PM):** Creates tasks, clarifies scope/acceptance criteria, coordinates handoffs, and keeps the board organized.
- **@Dev:** Implements changes and commits locally. Does **not** push or deploy. Tags @QA when ready for review.
- **@QA:** Reviews changes, runs verification, then **pushes**, **deploys**, and moves tasks to **Done**.

## Workflow

1. **@Jimmy (PM)** creates tasks → Backlog or Todo
2. **@Dev** picks up work → moves to Doing
3. **@Dev** completes implementation → commits locally and moves to Review (tagging @QA)
4. **@QA** reviews, pushes, deploys → moves to Done

**Rules:**
- Tags are required on every task (defaults to "needs-triage")
- Dev never moves directly to Done (always Review first)
- **Only @QA moves tasks to Done**
- Use @mentions in comments to coordinate (@jimmy, @dev, @qa)

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
  tags: ["needs-triage", "code/feature"],
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
