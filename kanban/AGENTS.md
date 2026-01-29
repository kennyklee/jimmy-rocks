# AGENTS.md - Kanban App Development Guidelines

## Roles

- **@Jimmy (PM)**: Coordinates, creates tickets, monitors progress. Does NOT write code.
- **@Dev**: Implements features and fixes. Commits and pushes to main. Does NOT deploy.
- **@QA**: Tests, deploys, and verifies. Owns the release process. Only @QA moves tickets to Done.

## Workflow

1. PM creates ticket with clear acceptance criteria
2. @Dev implements and commits to main
3. @QA pulls, deploys, tests in browser, moves to Done

## QA Requirements (Critical)

Before moving ANY ticket to Done, @QA MUST:

1. **Rebuild container** (if code changed):
   ```bash
   /opt/apps/kanban/deploy.sh
   ```

2. **Hard refresh the app** in a real browser (or agent-browser)

3. **Verify basic functionality**:
   - Cards render correctly
   - Modals open on click
   - No visual glitches

4. **Check browser console** for JavaScript errors:
   ```bash
   sudo agent-browser console
   ```

5. **Test the specific fix** described in the ticket

## Why This Matters

Ticket #71 was marked Done but had a JavaScript syntax error that broke the entire app. 
The error was only visible in the browser console. Code review alone is not sufficient.

## File Locations

- **Source code**: `/opt/apps/kanban/`
- **Docker compose**: `/opt/docker/kanban/`
- **Deploy script**: `/opt/apps/kanban/deploy.sh`
