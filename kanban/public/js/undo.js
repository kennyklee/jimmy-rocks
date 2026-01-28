// undo.js - Undo functionality

import { undoStack, currentUser } from './state.js';
import { showToast } from './utils.js';
import { refreshBoard } from './api.js';

export function pushUndo(action) {
  undoStack.push(action);
  // Keep only last 10 undoable actions
  if (undoStack.length > 10) undoStack.shift();
}

export async function performUndo() {
  if (undoStack.length === 0) {
    showToast('error', 'Nothing to undo', '');
    return;
  }
  
  const action = undoStack.pop();
  
  try {
    if (action.type === 'move') {
      // Move back to original column
      await fetch(`/api/items/${action.itemId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          toColumnId: action.fromColumn, 
          position: action.fromPosition,
          movedBy: currentUser 
        })
      });
      showToast('success', 'Undone', `Moved back to ${action.fromColumn}`);
    } else if (action.type === 'delete') {
      // Recreate deleted item
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.itemData)
      });
      if (res.ok) {
        showToast('success', 'Undone', `Restored "${action.itemData.title}"`);
      }
    }
    
    await refreshBoard();
  } catch (err) {
    showToast('error', 'Undo failed', err.message);
  }
}
