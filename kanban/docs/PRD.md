# Kanban v2 — Product Requirements Document

## Status: ✅ Mostly Complete

Most v2 features have been implemented. See checklist below.

## Overview

Enhance the kanban board with assignment, ownership, and notification features to enable seamless collaboration between Kenny and Jimmy.

## Goals

1. ✅ Clear ownership of tasks at all times
2. ✅ Automatic notifications when action is needed
3. ✅ Visibility into what's blocked and why
4. ✅ Daily summary to start the day focused

## Non-Goals

- Multi-user beyond Kenny & Jimmy
- Complex workflow automation
- Time tracking (beyond cycle time)
- Integrations with external tools

---

## Features

### 1. Assignee ✅
- [x] Values: kenny | jimmy | unassigned
- [x] Default: jimmy
- [x] UI: Dropdown in task detail modal
- [x] Avatar/initial on task card

### 2. Creator ✅
- [x] Tracked automatically based on current user
- [x] Shown in task detail view
- [x] Immutable after creation

### 3. Blocked Status ✅ (via tags)
- [x] Implemented as `blocked` tag (simpler than blockedBy field)
- [x] Visual indicator on task card
- [x] Auto-comment when tagged

### 4. Auto-Comments ✅
- [x] "Created by {name}"
- [x] "Moved to {column} by {name}"
- [x] "Assigned to {name}"
- [x] "Blocked by {name}" / "Unblocked"
- [x] System comments visually distinct (smaller, muted)

### 5. Telegram Notifications ✅
- [x] Task assigned to Kenny
- [x] Task blocked by Kenny
- [x] Jimmy completes task (moves to Done)
- [x] @jimmy mentions in comments
- [x] Kenny comments on tasks

### 6. Daily Standup ✅
- [x] Cron job at 8am PT
- [x] Lists Kenny's tasks
- [x] Lists blocked items
- [x] Lists Jimmy's completed work

### 7. Jimmy Auto-Pickup ⏳
- [ ] Auto-comment "On it" when assigned — *not implemented*
- [x] Cron job polls for @jimmy mentions and responds

---

## Additional Features (Added During Build)

### Tagging System ✅
- [x] Flexible tags: code/feature, code/bugfix, code/polish, blocked, self-improvement, etc.
- [x] Tag filter dropdown in header
- [x] Tags shown on cards and in detail view

### Search ✅
- [x] Real-time text search
- [x] Filters by title and description

### @Mentions ✅
- [x] Autocomplete dropdown when typing @
- [x] Tab to complete
- [x] Purple highlighting in rendered comments
- [x] Notifications API for @jimmy mentions

### Ticket Numbers ✅
- [x] Auto-incrementing #1, #2, etc.
- [x] Shown on cards and in modal

### Metrics Dashboard ✅
- [x] Total/completed/in-progress counts
- [x] Tasks by column chart
- [x] Tasks by assignee chart
- [x] Average time per stage
- [x] Throughput over time
- [x] Cycle time table

### UX Polish ✅
- [x] Cmd+Enter to submit comments
- [x] Escape to close modals/clear search
- [x] Deep linking (?task=item-123)
- [x] Scroll preservation on refresh
- [x] Custom confirm modal for deletes
- [x] Drop animation when moving cards
- [x] Purple box placeholder (same size as card) during drag
- [x] Auto-scroll when dragging near column edges

---

## Remaining Work

| Item | Priority | Notes |
|------|----------|-------|
| Jimmy "On it" auto-comment | Low | Nice-to-have |
| Mobile UX testing | Medium | Basic support exists |
| Error handling | Medium | API errors not shown to user |
| Offline support | Low | Nice-to-have |

---

*Last updated: 2026-01-28*
