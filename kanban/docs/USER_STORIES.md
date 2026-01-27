# Kanban v2 — User Stories & Acceptance Criteria

## Epic: Task Ownership

### US-1: Assign task to user

**As** Kenny or Jimmy  
**I want** to assign a task to myself or the other person  
**So that** there's clear ownership of who's responsible

**Acceptance Criteria:**
- [ ] Task detail modal has an "Assignee" dropdown
- [ ] Options: Unassigned, Kenny, Jimmy
- [ ] Selecting a new assignee saves immediately
- [ ] Task card shows assignee initial/avatar
- [ ] Unassigned tasks show no assignee indicator

---

### US-2: Track task creator

**As** a user  
**I want** to see who created each task  
**So that** I know who to ask for clarification

**Acceptance Criteria:**
- [ ] New tasks automatically set `createdBy` to current user
- [ ] Creator shown in task detail modal (read-only)
- [ ] Creator cannot be changed after creation
- [ ] Existing tasks without creator show "unknown"

---

## Epic: Blocked Status

### US-3: Mark task as blocked

**As** Kenny or Jimmy  
**I want** to mark a task as blocked by someone  
**So that** it's clear what's waiting on whom

**Acceptance Criteria:**
- [ ] Task detail modal has "Blocked by" dropdown
- [ ] Options: None, Kenny, Jimmy
- [ ] Blocked tasks show visual indicator on card
- [ ] Can be blocked AND assigned (independent fields)
- [ ] Clearing blocked status removes indicator

---

## Epic: Auto-Comments

### US-4: Log assignment changes

**As** a user  
**I want** assignment changes automatically logged  
**So that** there's a history of ownership

**Acceptance Criteria:**
- [ ] When assignee changes, system comment added
- [ ] Comment format: "Assigned to {name}" or "Unassigned"
- [ ] System comments show author as "system"
- [ ] System comments visually distinct (different color/style)

---

### US-5: Log blocked status changes

**As** a user  
**I want** blocked status changes automatically logged  
**So that** I can see when something was blocked/unblocked

**Acceptance Criteria:**
- [ ] When blocked status changes, system comment added
- [ ] Comment format: "Blocked by {name}" or "Unblocked"
- [ ] System comments styled consistently with US-4

---

### US-6: Log task completion

**As** a user  
**I want** task completion automatically logged  
**So that** there's a record of who finished it

**Acceptance Criteria:**
- [ ] When task moves to Done column, system comment added
- [ ] Comment format: "Completed by {name}"
- [ ] Only triggers when moving TO Done (not from Done)

---

## Epic: Telegram Notifications

### US-7: Notify on assignment to Kenny

**As** Kenny  
**I want** a Telegram message when tasks are assigned to me  
**So that** I know when I have new work

**Acceptance Criteria:**
- [ ] When task assigned to Kenny, Telegram message sent
- [ ] Message includes task title
- [ ] Message includes deep link to task
- [ ] No notification for self-assignment (Kenny assigns to Kenny)

---

### US-8: Notify on blocked by Kenny

**As** Kenny  
**I want** a Telegram message when tasks are blocked on me  
**So that** I know someone's waiting

**Acceptance Criteria:**
- [ ] When task marked blocked by Kenny, Telegram message sent
- [ ] Message includes task title and link
- [ ] Distinct from assignment notification

---

### US-9: Notify on task completion

**As** Kenny  
**I want** a Telegram message when Jimmy completes a task  
**So that** I know work is done

**Acceptance Criteria:**
- [ ] When Jimmy moves task to Done, Telegram message sent
- [ ] Message includes task title
- [ ] Only for tasks Jimmy completes (not Kenny)

---

## Epic: Daily Standup

### US-10: Daily standup message

**As** Kenny  
**I want** a daily summary on Telegram  
**So that** I start each day knowing my priorities

**Acceptance Criteria:**
- [ ] Message sent daily at configured time (default 8am PT)
- [ ] Lists tasks assigned to Kenny
- [ ] Lists tasks blocked by Kenny
- [ ] Lists tasks Jimmy completed yesterday
- [ ] Each task includes deep link
- [ ] Skips sections if empty
- [ ] No message if nothing to report

---

### US-11: Configure standup time

**As** Kenny  
**I want** to change the standup time  
**So that** it fits my schedule

**Acceptance Criteria:**
- [ ] Standup time configurable via environment variable or API
- [ ] Supports 24h format (HH:MM)
- [ ] Timezone configurable (default America/Los_Angeles)
- [ ] Changes take effect next day

---

## Epic: Jimmy Auto-Pickup

### US-12: Jimmy acknowledges assignment

**As** Kenny  
**I want** Jimmy to confirm when he picks up a task  
**So that** I know he's working on it

**Acceptance Criteria:**
- [ ] When task assigned to Jimmy, auto-comment added
- [ ] Comment: "On it" (from Jimmy, not system)
- [ ] Jimmy begins working on task (external behavior)

---

## Epic: Deep Linking

### US-13: Deep link to task

**As** a user  
**I want** to open a specific task via URL  
**So that** Telegram links take me directly there

**Acceptance Criteria:**
- [ ] URL format: `?task={id}`
- [ ] Page loads with task detail modal open
- [ ] Invalid task ID shows error or ignores parameter
- [ ] Works on mobile browsers

---

## Priority Order

1. US-1: Assign task (foundation)
2. US-2: Track creator (foundation)
3. US-3: Blocked status (foundation)
4. US-13: Deep linking (needed for notifications)
5. US-4, US-5, US-6: Auto-comments (can batch)
6. US-7, US-8, US-9: Telegram notifications (can batch)
7. US-12: Jimmy auto-pickup
8. US-10, US-11: Daily standup (separate cron job)

---

*Last updated: 2026-01-27*
