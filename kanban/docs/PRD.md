# Kanban v2 — Product Requirements Document

## Overview

Enhance the kanban board with assignment, ownership, and notification features to enable seamless collaboration between Kenny and Jimmy.

## Goals

1. Clear ownership of tasks at all times
2. Automatic notifications when action is needed
3. Visibility into what's blocked and why
4. Daily summary to start the day focused

## Non-Goals

- Multi-user beyond Kenny & Jimmy
- Complex workflow automation
- Time tracking
- Integrations with external tools (for now)

---

## Features

### 1. Assignee

Each task has an assignee indicating who owns it.

- **Values:** kenny | jimmy | unassigned
- **Default:** unassigned
- **UI:** Dropdown or avatar selector on task card and detail view

### 2. Creator

Track who created each task.

- **Values:** kenny | jimmy
- **Set automatically** based on current user selection
- **Immutable** after creation
- **UI:** Shown in task detail view

### 3. Blocked Status

Flag tasks that are waiting on someone.

- **Values:** blocked_by_kenny | blocked_by_jimmy | null
- **UI:** Visual indicator (badge/icon) on task card
- **Can coexist with assignee** (e.g., assigned to Jimmy, blocked by Kenny)

### 4. Auto-Comments

System automatically logs changes as comments.

**Triggers:**
- Assignment changes: "Assigned to {name}"
- Blocked status changes: "Blocked by {name}" / "Unblocked"
- Task moved to Done: "Completed by {name}"

**Format:**
- Author: "system"
- Visually distinct from user comments

### 5. Telegram Notifications

Jimmy sends Telegram messages to Kenny when:

| Event | Message |
|-------|---------|
| Task assigned to Kenny | "New task for you: {title} — {link}" |
| Task blocked by Kenny | "Blocked on you: {title} — {link}" |
| Task completed by Jimmy | "Done: {title} — {link}" |

**Link format:** Deep link to task detail view (e.g., `?task={id}`)

### 6. Daily Standup

Telegram message sent at configurable time (default 8am PT).

**Content:**
```
Morning standup

Your tasks:
- {task 1} — {link}
- {task 2} — {link}

Blocked on you:
- {task 3} — {link}

Jimmy completed yesterday:
- {task 4}
```

**Configuration:**
- Time stored in app config (environment variable or config file)
- Timezone: America/Los_Angeles

### 7. Jimmy Auto-Pickup

When a task is assigned to Jimmy:
- System adds comment: "On it"
- Jimmy begins working on the task

---

## Data Model Changes

```javascript
// Existing item fields
{
  id: string,
  title: string,
  description: string,
  priority: "low" | "medium" | "high" | "urgent",
  createdAt: string,
  createdBy: "kenny" | "jimmy",  // Already exists, ensure populated
  comments: Comment[],
  
  // New fields
  assignee: "kenny" | "jimmy" | null,
  blockedBy: "kenny" | "jimmy" | null
}
```

---

## API Changes

### Updated Endpoints

**PUT /api/items/:id**
- Accept `assignee` and `blockedBy` fields
- Trigger auto-comments on changes
- Trigger Telegram notifications

### New Endpoints

**GET /api/config**
- Returns app configuration (standup time, etc.)

**PUT /api/config**
- Update configuration

---

## UI Changes

### Task Card
- Show assignee avatar/initial
- Show blocked indicator if blocked

### Task Detail Modal
- Assignee dropdown
- Blocked by dropdown
- Creator shown (read-only)
- System comments styled differently

### URL Deep Linking
- Support `?task={id}` to auto-open task detail modal

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| STANDUP_TIME | 08:00 | Daily standup time (24h format) |
| STANDUP_TIMEZONE | America/Los_Angeles | Timezone for standup |
| TELEGRAM_ENABLED | true | Enable/disable Telegram notifications |

---

## Success Metrics

- Clear ownership: 100% of active tasks have an assignee
- Response time: Blocked items addressed within 24h
- Daily engagement: Standup message read daily

---

## Timeline

TBD — awaiting approval to begin implementation.

---

*Last updated: 2026-01-27*
