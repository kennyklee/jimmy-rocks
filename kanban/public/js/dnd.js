// dnd.js - Drag and drop handlers using SortableJS

import { currentUser, boardData } from "./state.js";
import { api, refreshBoard } from "./api.js";
import { pushUndo } from "./undo.js";

// SortableJS instances
let sortableInstances = [];

// Debounced move handling to prevent rapid save spam
let moveItemDebounceTimer = null;
let pendingMoveArgs = null;

function scheduleMoveItem(itemId, toColumnId, newIndex, user) {
  pendingMoveArgs = { itemId, toColumnId, newIndex, user };

  if (moveItemDebounceTimer) clearTimeout(moveItemDebounceTimer);

  moveItemDebounceTimer = setTimeout(() => {
    if (!pendingMoveArgs) return;

    const { itemId, toColumnId, newIndex, user } = pendingMoveArgs;
    pendingMoveArgs = null;
    moveItemDebounceTimer = null;

    // API call in background - only refresh on error (rollback)
    api.moveItem(itemId, toColumnId, newIndex, user).catch(() => {
      refreshBoard();
    });
  }, 400);
}

// Will be set by main.js
let openItemDetailFn = null;

export function setDndDependencies(deps) {
  openItemDetailFn = deps.openItemDetail;
}

export function setupDragAndDrop() {
  // Clean up previous instances
  sortableInstances.forEach((s) => s.destroy());
  sortableInstances = [];

  // Add click handlers to items
  document.querySelectorAll(".item").forEach((item) => {
    item.addEventListener("click", handleItemClick);
  });

  // Initialize SortableJS on each column
  document.querySelectorAll(".column-items").forEach((column) => {
    const sortable = new Sortable(column, {
      group: "kanban",
      scroll: true,
      scrollSensitivity: 150,
      scrollSpeed: 15,
      bubbleScroll: true,
      forceAutoScrollFallback: true,
      animation: 150,
      ghostClass: "dragging",
      delay: 150,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,

      onStart: function (evt) {
        evt.item.classList.add("dragging");
      },

      onEnd: function (evt) {
        evt.item.classList.remove("dragging");

        // Add drop animation
        evt.item.classList.add("just-dropped");
        evt.item.addEventListener(
          "animationend",
          () => {
            evt.item.classList.remove("just-dropped");
          },
          { once: true }
        );

        const itemId = evt.item.dataset.itemId;
        const fromColumnId = evt.from.dataset.columnId;
        const toColumnId = evt.to.dataset.columnId;
        const newIndex = evt.newIndex;
        const oldIndex = evt.oldIndex;

        // Store undo data
        if (fromColumnId !== toColumnId || oldIndex !== newIndex) {
          pushUndo({
            type: "move",
            itemId,
            fromColumn: fromColumnId,
            fromPosition: oldIndex,
          });
        }

        // Update local state immediately (optimistic update)
        const fromColumn = boardData.columns.find((c) => c.id === fromColumnId);
        const toColumn = boardData.columns.find((c) => c.id === toColumnId);

        if (fromColumn && toColumn) {
          // Find and remove item from source column
          const itemIndex = fromColumn.items.findIndex((i) => i.id === itemId);
          if (itemIndex !== -1) {
            const [item] = fromColumn.items.splice(itemIndex, 1);
            // Insert into target column at new position
            toColumn.items.splice(newIndex, 0, item);
          }
        }

        // Signal recent move to prevent auto-refresh flash
        window.lastKanbanMove = Date.now();

        scheduleMoveItem(itemId, toColumnId, newIndex, currentUser);
      },
    });

    sortableInstances.push(sortable);
  });
}

function handleItemClick(e) {
  const itemId = e.currentTarget.dataset.itemId;
  // Update selection state
  document.querySelectorAll(".item.keyboard-selected").forEach(el => el.classList.remove("keyboard-selected"));
  e.currentTarget.classList.add("keyboard-selected");

  for (const col of boardData.columns) {
    const item = col.items.find((i) => i.id === itemId);
    if (item) {
      if (openItemDetailFn) openItemDetailFn(item);
      break;
    }
  }
}
