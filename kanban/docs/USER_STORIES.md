# Kanban v2 — User Stories & Acceptance Criteria

## Epic: Task Ownership

### US-1: Assign task to user

**As** Kenny or Jimmy  
**I want** to assign a task to myself or the other person  
**So that** there's clear ownership of who's responsible

**Acceptance Criteria:**
- [x] Task detail modal has an "Assignee" dropdown
- [x] Options: Unassigned, Kenny, Jimmy
- [x] Selecting a new assignee saves immediately
- [x] Task card shows assignee initial/avatar
- [x] Unassigned tasks show no assignee indicator

---

### US-2: Track task creator

**As** a user  
**I want** to see who created each task  
**So that** I know who to ask for clarification

**Acceptance Criteria:**
- [x] New tasks automatically set `createdBy` to current user
- [x] Creator shown in task detail modal (read-only)
- [x] Creator cannot be changed after creation
- [x] Existing tasks without creator show "unknown"

---

## Epic: Blocked Status

### US-3: Mark task as blocked

**As** Kenny or Jimmy  
**I want** to mark a task as blocked by someone  
**So that** it's clear what's waiting on whom

**Acceptance Criteria:**
- [x] Task detail modal has "Blocked by" dropdown
- [x] Options: None, Kenny, Jimmy
- [x] Blocked tasks show visual indicator on card
- [x] Can be blocked AND assigned (independent fields)
- [x] Clearing blocked status removes indicator

---

## Epic: Auto-Comments

### US-4: Log assignment changes

**As** a user  
**I want** assignment changes automatically logged  
**So that** there's a history of ownership

**Acceptance Criteria:**
- [x] When assignee changes, system comment added
- [x] Comment format: "Assigned to {name}" or "Unassigned"
- [x] System comments show author as "system"
- [x] System comments visually distinct (different color/style)

---

### US-5: Log blocked status changes

**As** a user  
**I want** blocked status changes automatically logged  
**So that** I can see when something was blocked/unblocked

**Acceptance Criteria:**
- [x] When blocked status changes, system comment added
- [x] Comment format: "Blocked by {name}" or "Unblocked"
- [x] System comments styled consistently with US-4

---

### US-6: Log task completion

**As** a user  
**I want** task completion automatically logged  
**So that** there's a record of who finished it

**Acceptance Criteria:**
- [x] When task moves to Done column, system comment added
- [x] Comment format: "Completed by {name}"
- [x] Only triggers when moving TO Done (not from Done)

---

## Epic: Telegram Notifications

### US-7: Notify on assignment to Kenny

**As** Kenny  
**I want** a Telegram message when tasks are assigned to me  
**So that** I know when I have new work

**Acceptance Criteria:**
- [x] When task assigned to Kenny, Telegram message sent
- [x] Message includes task title
- [x] Message includes deep link to task
- [x] No notification for self-assignment (Kenny assigns to Kenny)

---

### US-8: Notify on blocked by Kenny

**As** Kenny  
**I want** a Telegram message when tasks are blocked on me  
**So that** I know someone's waiting

**Acceptance Criteria:**
- [x] When task marked blocked by Kenny, Telegram message sent
- [x] Message includes task title and link
- [x] Distinct from assignment notification

---

### US-9: Notify on task completion

**As** Kenny  
**I want** a Telegram message when Jimmy completes a task  
**So that** I know work is done

**Acceptance Criteria:**
- [x] When Jimmy moves task to Done, Telegram message sent
- [x] Message includes task title
- [x] Only for tasks Jimmy completes (not Kenny)

---

## Epic: Daily Standup

### US-10: Daily standup message

**As** Kenny  
**I want** a daily summary on Telegram  
**So that** I start each day knowing my priorities

**Acceptance Criteria:**
- [x] Message sent daily at configured time (default 8am PT)
- [x] Lists tasks assigned to Kenny
- [x] Lists tasks blocked by Kenny
- [x] Lists tasks Jimmy completed yesterday
- [x] Each task includes deep link
- [x] Skips sections if empty
- [x] No message if nothing to report

---

### US-11: Configure standup time

**As** Kenny  
**I want** to change the standup time  
**So that** it fits my schedule

**Acceptance Criteria:**
- [x] Standup time configurable via environment variable or API
- [x] Supports 24h format (HH:MM)
- [x] Timezone configurable (default America/Los_Angeles)
- [x] Changes take effect next day

---

## Epic: Jimmy Auto-Pickup

### US-12: Jimmy acknowledges assignment

**As** Kenny  
**I want** Jimmy to confirm when he picks up a task  
**So that** I know he's working on it

**Acceptance Criteria:**
- [x] When task assigned to Jimmy, auto-comment added
- [x] Comment: "On it" (from Jimmy, not system)
- [x] Jimmy begins working on task (external behavior)

---

## Epic: Deep Linking

### US-13: Deep link to task

**As** a user  
**I want** to open a specific task via URL  
**So that** Telegram links take me directly there

**Acceptance Criteria:**
- [x] URL format: `?task={id}`
- [x] Page loads with task detail modal open
- [x] Invalid task ID shows error or ignores parameter
- [x] Works on mobile browsers

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



---

## Epic: Drag and Drop UX

### US-14: Visual drop placeholder

**As** a user  
**I want** to see exactly where a card will land when dragging  
**So that** I can precisely position tasks

**Acceptance Criteria:**
- [x] Purple box placeholder appears at drop position
- [x] Placeholder is same size as dragged card
- [x] Cards above/below reflow around placeholder
- [x] No janky line indicators

---

### US-15: Auto-scroll while dragging

**As** a user  
**I want** the column to scroll when I drag near the edge  
**So that** I can move cards to positions not currently visible

**Acceptance Criteria:**
- [x] Dragging near top edge scrolls column up
- [x] Dragging near bottom edge scrolls column down
- [x] Scroll sensitivity: 150px from edge
- [x] Works on both desktop and mobile

---

*Last updated: 2026-01-28*

---

## Epic: Undo & Recovery

### US-16: Undo last action

**As** a user  
**I want** to undo my last move or delete  
**So that** I can recover from mistakes

**Acceptance Criteria:**
- [x] Ctrl+Z / Cmd+Z triggers undo
- [x] Undo moves: returns card to previous column/position
- [x] Undo deletes: recreates the deleted card
- [x] Undo stack holds last 10 actions
- [x] Toast confirms "Undone" with description

---

## Epic: Subtasks

### US-17: Subtasks / checklist

**As** a user  
**I want** to add subtasks to a card  
**So that** I can break down work into smaller steps

**Acceptance Criteria:**
- [x] Task detail modal has "Checklist" section
- [x] Can add subtask with text input
- [x] Can check/uncheck subtasks
- [x] Can delete subtasks
- [x] Card shows progress (e.g., 2/5) with mini progress bar
- [x] Subtasks persisted to server

---

## Epic: Archive

### US-18: Archive old done tasks

**As** a user  
**I want** old completed tasks to be hidden  
**So that** the Done column stays manageable

**Acceptance Criteria:**
- [x] Tasks in Done older than N days are hidden by default
- [x] "Show X archived" toggle appears when archived exist
- [x] Clicking toggle reveals/hides archived tasks
- [x] Archived tasks still accessible, just hidden

---

## Epic: UI Polish

### US-19: Preserve scroll position on refresh

**As** a user  
**I want** column scroll positions preserved after refresh  
**So that** I dont lose my place

---

## Epic: Undo & Recovery

### US-16: Undo last action

**As** a user  
**I want** to undo my last move or delete  
**So that** I can recover from mistakes

**Acceptance Criteria:**
- [x] Ctrl+Z / Cmd+Z triggers undo
- [x] Undo moves: returns card to previous column/position
- [x] Undo deletes: recreates the deleted card
- [x] Undo stack holds last 10 actions
- [x] Toast confirms undo with description

---

## Epic: Subtasks

### US-17: Subtasks / checklist

**As** a user  
**I want** to add subtasks to a card  
**So that** I can break down work into smaller steps

**Acceptance Criteria:**
- [x] Task detail modal has Checklist section
- [x] Can add subtask with text input
- [x] Can check/uncheck subtasks
- [x] Can delete subtasks
- [x] Card shows progress with mini progress bar
- [x] Subtasks persisted to server

---

## Epic: Archive

### US-18: Archive old done tasks

**As** a user  
**I want** old completed tasks to be hidden  
**So that** the Done column stays manageable

**Acceptance Criteria:**
- [x] Tasks in Done older than N days hidden by default
- [x] Show X archived toggle appears when archived exist
- [x] Clicking toggle reveals/hides archived tasks
- [x] Archived tasks still accessible, just hidden

---

## Epic: UI Polish

### US-19: Preserve scroll position on refresh

**As** a user  
**I want** column scroll positions preserved after refresh  
**So that** I do not lose my place

**Acceptance Criteria:**
- [x] Before refresh, save scroll position of each column
- [x] After render, restore scroll positions
- [x] Works with auto-refresh 10 second poll

---

### US-20: Tag filter dropdown

**As** a user  
**I want** to filter cards by tag using a dropdown  
**So that** I can focus on specific categories

**Acceptance Criteria:**
- [x] Dropdown in header shows all tags in use
- [x] Selecting a tag filters cards to only show that tag
- [x] All tags option clears filter
- [x] Works in combination with text search

---

### US-21: Swap assignee and comment icons on card

**As** a user  
**I want** consistent icon placement on cards  
**So that** the UI feels polished

**Acceptance Criteria:**
- [x] Assignee badge on right side of card footer
- [x] Comment count next to assignee
- [x] Priority badge on left side

---

### US-22: Error toasts

**As** a user  
**I want** to see error messages when API calls fail  
**So that** I know something went wrong

**Acceptance Criteria:**
- [x] Toast notification appears on API error
- [x] Toast shows error title and message
- [x] Toast auto-dismisses after 5 seconds
- [x] Can manually dismiss toast

---

### US-23: Keyboard navigation

**As** a user  
**I want** to navigate cards with keyboard  
**So that** I can work without a mouse

**Acceptance Criteria:**
- [x] j/k or arrow keys move selection between cards
- [x] Enter opens selected card detail
- [x] Escape closes modal and clears selection
- [x] n opens new task modal
- [x] Default selection: first Todo card on page load

---

## Epic: Mobile Support

### US-24: Touch drag support iOS Safari

**As** a mobile user  
**I want** to drag cards on touch devices  
**So that** I can use the board on my phone

**Acceptance Criteria:**
- [x] Long-press initiates drag on touch devices
- [x] Drag works in iOS Safari
- [x] Drop placeholder visible during drag
- [x] Auto-scroll when dragging near edges

---

## Epic: Automation

### US-25: Jimmy auto-responds to mentions

**As** Kenny  
**I want** Jimmy to automatically respond to mentions  
**So that** I know he saw my message

**Acceptance Criteria:**
- [x] Heartbeat checks for jimmy mentions
- [x] Jimmy posts response in task comments
- [x] Notification cleared after response
- [x] Response acknowledges the mention contextually

---

### US-26: Fix cron job author

**As** a user  
**I want** cron job comments to show correct author  
**So that** audit trail is accurate

**Acceptance Criteria:**
- [x] Cron-triggered comments show jimmy not unknown
- [x] System comments still show system

---

*Last updated: 2026-01-28*
