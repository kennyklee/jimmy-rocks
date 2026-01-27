// State
let boardData = null;
let currentUser = 'kenny';
let selectedItem = null;
let showArchivedDone = false; // Show tasks in Done older than 7 days
let undoStack = []; // Stack of undoable actions

// Toast notifications
function showToast(type, title, message, duration = 5000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'error' ? '⚠️' : '✓';
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  container.appendChild(toast);
  
  // Auto-remove after duration
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

// Undo functionality
function pushUndo(action) {
  undoStack.push(action);
  // Keep only last 10 undoable actions
  if (undoStack.length > 10) undoStack.shift();
}

async function performUndo() {
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

// Central user reference
const USERS = {
  kenny: { id: 'kenny', name: 'Kenny' },
  jimmy: { id: 'jimmy', name: 'Jimmy' },
  system: { id: 'system', name: 'System' }
};

function getUserName(userId) {
  return USERS[userId]?.name || userId || 'Unknown';
}

// DOM Elements
const board = document.getElementById('board');
const userSelect = document.getElementById('user-select');
const searchInput = document.getElementById('search-input');
const tagFilterBtn = document.getElementById('tag-filter-btn');
const tagFilterDropdown = document.getElementById('tag-filter-dropdown');

// Search & filter functionality
let searchTimeout = null;
let activeTagFilter = '';

function filterCards() {
  const q = searchInput.value.toLowerCase().trim();
  const tag = activeTagFilter;
  const items = document.querySelectorAll('.item');
  
  items.forEach(item => {
    const itemId = item.dataset.itemId;
    const itemData = findItemById(itemId);
    
    if (!itemData) return;
    
    // Text search match
    let textMatch = true;
    if (q) {
      const titleMatch = itemData.title.toLowerCase().includes(q);
      const descMatch = (itemData.description || '').toLowerCase().includes(q);
      textMatch = titleMatch || descMatch;
    }
    
    // Tag filter match
    let tagMatch = true;
    if (tag) {
      tagMatch = itemData.tags && itemData.tags.includes(tag);
    }
    
    if (textMatch && tagMatch) {
      item.classList.remove('search-hidden');
    } else {
      item.classList.add('search-hidden');
    }
  });
}

function findItemById(id) {
  for (const col of boardData.columns) {
    const item = col.items.find(i => i.id === id);
    if (item) return item;
  }
  return null;
}

function updateTagFilterOptions() {
  // Collect all unique tags from the board
  const allTags = new Set();
  if (boardData) {
    for (const col of boardData.columns) {
      for (const item of col.items) {
        if (item.tags) {
          item.tags.forEach(t => allTags.add(t));
        }
      }
    }
  }
  
  // Sort and populate dropdown
  const sorted = Array.from(allTags).sort();
  
  tagFilterDropdown.innerHTML = 
    `<div class="tag-filter-option${!activeTagFilter ? ' selected' : ''}" data-value="">All tags</div>` +
    sorted.map(t => 
      `<div class="tag-filter-option${activeTagFilter === t ? ' selected' : ''}" data-value="${t}">${t}</div>`
    ).join('');
  
  // Add click handlers to options
  tagFilterDropdown.querySelectorAll('.tag-filter-option').forEach(opt => {
    opt.addEventListener('click', () => {
      activeTagFilter = opt.dataset.value;
      tagFilterBtn.textContent = opt.dataset.value || 'All tags';
      tagFilterDropdown.classList.remove('open');
      filterCards();
      updateTagFilterOptions(); // Update selected state
    });
  });
}

// Toggle dropdown on button click
tagFilterBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  tagFilterDropdown.classList.toggle('open');
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
  tagFilterDropdown.classList.remove('open');
});

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    filterCards();
  }, 100);
});

// Clear search on Escape
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    searchInput.value = '';
    filterCards();
    searchInput.blur();
  }
});
const newItemBtn = document.getElementById('new-item-btn');
const newItemModal = document.getElementById('new-item-modal');
const newItemForm = document.getElementById('new-item-form');
const closeNewModal = document.getElementById('close-new-modal');
const cancelNew = document.getElementById('cancel-new');
const itemDetailModal = document.getElementById('item-detail-modal');
const closeDetailModal = document.getElementById('close-detail-modal');
const commentForm = document.getElementById('comment-form');
const deleteItemBtn = document.getElementById('delete-item-btn');
const detailMoveColumn = document.getElementById('detail-move-column');
const detailAssignee = document.getElementById('detail-assignee');
const tagSelect = document.getElementById('tag-select');
const detailTags = document.getElementById('detail-tags');

// API Functions
// API helper with error handling
async function apiCall(url, options = {}, actionName = 'Request') {
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    
    if (!res.ok || data.error) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    
    return data;
  } catch (err) {
    showToast('error', `${actionName} failed`, err.message);
    throw err;
  }
}

const api = {
  async getBoard() {
    return apiCall('/api/board', {}, 'Load board');
  },
  
  async createItem(data) {
    return apiCall('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 'Create task');
  },
  
  async updateItem(itemId, data) {
    return apiCall(`/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 'Update task');
  },
  
  async moveItem(itemId, toColumnId, position, movedBy) {
    return apiCall(`/api/items/${itemId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toColumnId, position, movedBy })
    }, 'Move task');
  },
  
  async deleteItem(itemId) {
    return apiCall(`/api/items/${itemId}`, {
      method: 'DELETE'
    }, 'Delete task');
  },
  
  async addComment(itemId, text, author) {
    return apiCall(`/api/items/${itemId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, author })
    }, 'Add comment');
  }
};

// Render Functions
function renderBoard() {
  const ARCHIVE_DAYS = 7;
  const archiveCutoff = Date.now() - (ARCHIVE_DAYS * 24 * 60 * 60 * 1000);
  
  board.innerHTML = boardData.columns.map(column => {
    let items = column.items;
    let archivedCount = 0;
    let archiveToggle = '';
    
    // For Done column, filter old items unless showArchivedDone is true
    if (column.id === 'done') {
      const recent = [];
      const archived = [];
      
      for (const item of items) {
        // Check when it entered Done column
        const doneEntry = item.stageHistory?.find(s => s.column === 'done');
        const doneTime = doneEntry ? new Date(doneEntry.enteredAt).getTime() : Date.now();
        
        if (doneTime < archiveCutoff) {
          archived.push(item);
        } else {
          recent.push(item);
        }
      }
      
      archivedCount = archived.length;
      items = showArchivedDone ? items : recent;
      
      if (archivedCount > 0) {
        archiveToggle = `
          <button class="archive-toggle" onclick="toggleArchived()">
            ${showArchivedDone ? 'Hide' : 'Show'} ${archivedCount} archived
          </button>`;
      }
    }
    
    return `
    <div class="column" data-column-id="${column.id}">
      <div class="column-header">
        <span class="column-title">${column.title}</span>
        <span class="column-count">${items.length}${archivedCount && !showArchivedDone ? ` (+${archivedCount})` : ''}</span>
        ${archiveToggle}
      </div>
      <div class="column-items" data-column-id="${column.id}">
        ${items.length === 0 
          ? '<div class="column-empty">No items</div>'
          : items.map(item => renderItem(item)).join('')
        }
      </div>
    </div>
  `}).join('');
  
  setupDragAndDrop();
}

function toggleArchived() {
  showArchivedDone = !showArchivedDone;
  renderBoard();
}

function renderItem(item) {
  const priorityClass = `priority-${item.priority}`;
  const commentCount = item.comments?.length || 0;
  const createdDate = new Date(item.createdAt).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  const assigneeInitial = item.assignee ? item.assignee[0].toUpperCase() : '?';
  const assigneeClass = item.assignee || 'unassigned';
  const isBlocked = item.tags && item.tags.includes('blocked');
  const blockedClass = isBlocked ? 'blocked' : '';
  const blockedBadge = isBlocked ? `<span class="blocked-badge" title="Blocked">🚧</span>` : '';
  const tagsHtml = (item.tags && item.tags.length > 0) 
    ? `<div class="item-tags">${item.tags.map(t => `<span class="tag tag-${t.split('/')[0]}">${t}</span>`).join('')}</div>` 
    : '';
  
  const ticketNum = item.number ? `#${item.number}` : '';
  
  // Subtask progress
  const subtasks = item.subtasks || [];
  const subtaskCompleted = subtasks.filter(s => s.completed).length;
  const subtaskTotal = subtasks.length;
  const subtaskPct = subtaskTotal > 0 ? Math.round((subtaskCompleted / subtaskTotal) * 100) : 0;
  const subtaskHtml = subtaskTotal > 0 
    ? `<span class="item-subtasks">
         <span class="progress-bar"><span class="progress-fill" style="width: ${subtaskPct}%"></span></span>
         ${subtaskCompleted}/${subtaskTotal}
       </span>` 
    : '';
  
  return `
    <div class="item ${blockedClass}" data-item-id="${item.id}" draggable="true">
      <div class="item-header">
        <span class="item-title">${escapeHtml(item.title)}</span>
        ${blockedBadge}
        <span class="ticket-number">${ticketNum}</span>
      </div>
      ${tagsHtml}
      ${item.description ? `<div class="item-description">${escapeHtml(item.description)}</div>` : ''}
      <div class="item-footer">
        <span class="priority-badge ${priorityClass}">${item.priority}</span>
        <span class="assignee-badge ${assigneeClass}" title="${item.assignee || 'Unassigned'}">${assigneeInitial}</span>
        ${subtaskHtml}
        ${commentCount > 0 ? `<span class="item-comments">💬 ${commentCount}</span>` : ''}
      </div>
    </div>
  `;
}

function renderComments(comments) {
  const list = document.getElementById('comments-list');
  
  if (!comments || comments.length === 0) {
    list.innerHTML = '<div class="no-comments">No updates yet</div>';
    return;
  }
  
  list.innerHTML = comments.map(comment => {
    const time = new Date(comment.createdAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    
    const authorName = getUserName(comment.author);
    
    return `
      <div class="comment ${comment.author === 'system' ? 'system-comment' : ''}">
        <div class="comment-header">
          <span class="comment-author ${comment.author}">${authorName}</span>
          <span class="comment-time">${time}</span>
        </div>
        <div class="comment-text">${formatMentions(comment.text)}</div>
      </div>
    `;
  }).join('');
}

function renderSubtasks(subtasks) {
  const list = document.getElementById('subtasks-list');
  const countEl = document.getElementById('subtask-count');
  
  subtasks = subtasks || [];
  const completed = subtasks.filter(s => s.completed).length;
  const total = subtasks.length;
  
  countEl.textContent = total > 0 ? `(${completed}/${total})` : '';
  
  if (total === 0) {
    list.innerHTML = '<div class="no-subtasks" style="color: var(--text-muted); font-size: 13px;">No checklist items</div>';
    return;
  }
  
  list.innerHTML = subtasks.map(subtask => `
    <div class="subtask-item ${subtask.completed ? 'completed' : ''}" data-subtask-id="${subtask.id}">
      <input type="checkbox" class="subtask-checkbox" ${subtask.completed ? 'checked' : ''} 
             onchange="toggleSubtask('${subtask.id}', this.checked)">
      <span class="subtask-text">${escapeHtml(subtask.text)}</span>
      <button class="subtask-delete" onclick="deleteSubtask('${subtask.id}')">&times;</button>
    </div>
  `).join('');
}

async function toggleSubtask(subtaskId, completed) {
  if (!selectedItem) return;
  
  try {
    await fetch(`/api/items/${selectedItem.id}/subtasks/${subtaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed })
    });
    
    // Update local state
    const subtask = selectedItem.subtasks?.find(s => s.id === subtaskId);
    if (subtask) subtask.completed = completed;
    
    renderSubtasks(selectedItem.subtasks);
    await refreshBoard();
  } catch (err) {
    showToast('error', 'Failed to update subtask', err.message);
  }
}

async function deleteSubtask(subtaskId) {
  if (!selectedItem) return;
  
  try {
    await fetch(`/api/items/${selectedItem.id}/subtasks/${subtaskId}`, {
      method: 'DELETE'
    });
    
    // Update local state
    selectedItem.subtasks = selectedItem.subtasks?.filter(s => s.id !== subtaskId);
    
    renderSubtasks(selectedItem.subtasks);
    await refreshBoard();
  } catch (err) {
    showToast('error', 'Failed to delete subtask', err.message);
  }
}

async function handleAddSubtask(e) {
  e.preventDefault();
  if (!selectedItem) return;
  
  const input = document.getElementById('subtask-text');
  const text = input.value.trim();
  if (!text) return;
  
  try {
    const subtask = await apiCall(`/api/items/${selectedItem.id}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    }, 'Add subtask');
    
    // Update local state
    selectedItem.subtasks = selectedItem.subtasks || [];
    selectedItem.subtasks.push(subtask);
    
    input.value = '';
    renderSubtasks(selectedItem.subtasks);
    await refreshBoard();
  } catch (err) {
    // Error shown via toast
  }
}

// Modal Functions
function openNewItemModal() {
  newItemModal.classList.add('active');
  document.getElementById('item-title').focus();
}

function closeNewItemModal() {
  newItemModal.classList.remove('active');
  newItemForm.reset();
}

function openItemDetail(item) {
  selectedItem = item;
  
  document.getElementById('detail-title').textContent = item.title;
  document.getElementById('detail-ticket-number').textContent = item.number ? `#${item.number}` : '';
  document.getElementById('detail-priority').textContent = item.priority;
  document.getElementById('detail-priority').className = `priority-badge priority-${item.priority}`;
  document.getElementById('detail-description').textContent = item.description || 'No description';
  document.getElementById('detail-created').textContent = new Date(item.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  document.getElementById('detail-author').textContent = `by ${item.createdBy}`;
  
  // Set assignee
  detailAssignee.value = item.assignee || '';
  
  // Render tags
  renderDetailTags(item.tags || []);
  
  // Find current column
  for (const col of boardData.columns) {
    if (col.items.find(i => i.id === item.id)) {
      detailMoveColumn.value = col.id;
      break;
    }
  }
  
  renderComments(item.comments);
  renderSubtasks(item.subtasks);
  itemDetailModal.classList.add('active');
  updateUrlForTask(item.id);
  
  // Scroll comments to bottom when opening
  const commentsList = document.getElementById('comments-list');
  commentsList.scrollTop = commentsList.scrollHeight;
}

function closeItemDetailModal() {
  itemDetailModal.classList.remove('active');
  selectedItem = null;
  document.getElementById('comment-text').innerText = '';
  updateUrlForTask(null);
}

// Drag and Drop
function setupDragAndDrop() {
  const items = document.querySelectorAll('.item');
  const columns = document.querySelectorAll('.column-items');
  
  items.forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
    item.addEventListener('click', handleItemClick);
  });
  
  columns.forEach(column => {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('dragleave', handleDragLeave);
    column.addEventListener('drop', handleDrop);
  });
}

let draggedItem = null;

function handleDragStart(e) {
  draggedItem = e.target;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.column-items').forEach(col => {
    col.classList.remove('drag-over');
  });
  if (dropIndicator) dropIndicator.style.display = 'none';
}

// Drop indicator element
let dropIndicator = null;

function ensureDropIndicator() {
  if (!dropIndicator) {
    dropIndicator = document.createElement('div');
    dropIndicator.className = 'drop-indicator';
    document.body.appendChild(dropIndicator);
  }
  return dropIndicator;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
  
  const column = e.currentTarget;
  const afterElement = getDragAfterElement(column, e.clientY);
  const indicator = ensureDropIndicator();
  
  // Position the indicator absolutely
  const columnRect = column.getBoundingClientRect();
  let indicatorY;
  
  if (afterElement) {
    const rect = afterElement.getBoundingClientRect();
    indicatorY = rect.top - 4;
  } else {
    // End of column
    const items = column.querySelectorAll('.item:not(.dragging)');
    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      const rect = lastItem.getBoundingClientRect();
      indicatorY = rect.bottom + 4;
    } else {
      indicatorY = columnRect.top + 8;
    }
  }
  
  indicator.style.display = 'block';
  indicator.style.top = indicatorY + 'px';
  indicator.style.left = (columnRect.left + 8) + 'px';
  indicator.style.width = (columnRect.width - 16) + 'px';
}

// Get the element after which we should insert the dragged item
function getDragAfterElement(column, y) {
  const items = [...column.querySelectorAll('.item:not(.dragging)')];
  
  return items.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function handleDragLeave(e) {
  // Only remove if actually leaving the column (not entering a child)
  if (!e.currentTarget.contains(e.relatedTarget)) {
    e.currentTarget.classList.remove('drag-over');
    if (dropIndicator) dropIndicator.style.display = 'none';
  }
}

async function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (dropIndicator) dropIndicator.style.display = 'none';
  
  if (!draggedItem) return;
  
  const itemId = draggedItem.dataset.itemId;
  
  // Find original column and position for undo
  let fromColumn = null;
  let fromPosition = null;
  for (const col of boardData.columns) {
    const idx = col.items.findIndex(i => i.id === itemId);
    if (idx !== -1) {
      fromColumn = col.id;
      fromPosition = idx;
      break;
    }
  }
  const toColumnId = e.currentTarget.dataset.columnId;
  
  // Calculate position based on where item was dropped
  const afterElement = getDragAfterElement(e.currentTarget, e.clientY);
  let position = null;
  
  if (afterElement) {
    // Find the index of the element we're dropping before
    const column = boardData.columns.find(c => c.id === toColumnId);
    if (column) {
      const afterItemId = afterElement.dataset.itemId;
      position = column.items.findIndex(i => i.id === afterItemId);
      
      // Adjust for same-column reorder: if dragged item is above target, 
      // the index will shift down by 1 after removal
      const draggedIndex = column.items.findIndex(i => i.id === itemId);
      if (draggedIndex !== -1 && draggedIndex < position) {
        position--;
      }
    }
  }
  
  // Animate cards parting before the drop
  const targetColumn = document.querySelector(`[data-column-id="${toColumnId}"]`);
  
  if (targetColumn) {
    // Add gap where card will be inserted
    if (afterElement) {
      afterElement.style.transition = 'margin-top 0.15s ease-out';
      afterElement.style.marginTop = '60px';
    } else {
      // Dropping at end - add padding to column
      targetColumn.style.transition = 'padding-bottom 0.15s ease-out';
      targetColumn.style.paddingBottom = '60px';
    }
  }
  
  // Brief wait for gap animation
  await new Promise(r => setTimeout(r, 10));
  
  // Store undo data before move
  if (fromColumn !== toColumnId || fromPosition !== position) {
    pushUndo({ type: 'move', itemId, fromColumn, fromPosition });
  }
  
  await api.moveItem(itemId, toColumnId, position, currentUser);
  await refreshBoard();
  
  // Animate the dropped card
  const droppedCard = document.querySelector(`[data-item-id="${itemId}"]`);
  if (droppedCard) {
    droppedCard.classList.add('just-dropped');
    droppedCard.addEventListener('animationend', () => {
      droppedCard.classList.remove('just-dropped');
    }, { once: true });
  }
}

function handleItemClick(e) {
  const itemId = e.currentTarget.dataset.itemId;
  
  for (const col of boardData.columns) {
    const item = col.items.find(i => i.id === itemId);
    if (item) {
      openItemDetail(item);
      break;
    }
  }
}

// Event Handlers
async function handleNewItemSubmit(e) {
  e.preventDefault();
  
  const data = {
    title: document.getElementById('item-title').value,
    description: document.getElementById('item-description').value,
    priority: document.getElementById('item-priority').value,
    assignee: document.getElementById('item-assignee').value,
    columnId: document.getElementById('item-column').value,
    createdBy: currentUser
  };
  
  try {
    await api.createItem(data);
    closeNewItemModal();
    await refreshBoard();
  } catch (err) {
    // Error already shown via toast
  }
}

// Custom confirm modal
const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmOk = document.getElementById('confirm-ok');
let confirmCallback = null;

function showConfirm(message, onConfirm) {
  confirmMessage.textContent = message;
  confirmCallback = onConfirm;
  confirmModal.classList.add('active');
}

function hideConfirm() {
  confirmModal.classList.remove('active');
  confirmCallback = null;
}

confirmCancel.addEventListener('click', hideConfirm);
confirmOk.addEventListener('click', () => {
  if (confirmCallback) confirmCallback();
  hideConfirm();
});

// Close on overlay click
confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) hideConfirm();
});

async function handleDeleteItem() {
  if (!selectedItem) return;
  
  // Store item data for undo
  const itemToDelete = { ...selectedItem };
  
  // Find which column it's in
  let itemColumn = null;
  for (const col of boardData.columns) {
    if (col.items.find(i => i.id === selectedItem.id)) {
      itemColumn = col.id;
      break;
    }
  }
  
  showConfirm(`Delete "${selectedItem.title}"?`, async () => {
    try {
      // Push undo data
      pushUndo({ 
        type: 'delete', 
        itemData: {
          title: itemToDelete.title,
          description: itemToDelete.description,
          priority: itemToDelete.priority,
          assignee: itemToDelete.assignee,
          tags: itemToDelete.tags,
          columnId: itemColumn,
          createdBy: itemToDelete.createdBy
        }
      });
      
      await api.deleteItem(selectedItem.id);
      closeItemDetailModal();
      await refreshBoard();
      
      showToast('success', 'Deleted', 'Press Ctrl+Z to undo');
    } catch (err) {
      // Error already shown via toast
    }
  });
}

async function handleMoveColumn(e) {
  if (!selectedItem) return;
  
  const toColumnId = e.target.value;
  await api.moveItem(selectedItem.id, toColumnId, null, currentUser);
  await refreshBoard();
  
  // Update selected item reference
  for (const col of boardData.columns) {
    const item = col.items.find(i => i.id === selectedItem.id);
    if (item) {
      selectedItem = item;
      break;
    }
  }
}

async function handleAssigneeChange(e) {
  if (!selectedItem) return;
  
  const newAssignee = e.target.value || null;
  await api.updateItem(selectedItem.id, { assignee: newAssignee });
  await refreshBoard();
  
  // Update selected item reference
  for (const col of boardData.columns) {
    const item = col.items.find(i => i.id === selectedItem.id);
    if (item) {
      selectedItem = item;
      break;
    }
  }
}

function renderDetailTags(tags) {
  detailTags.innerHTML = tags.map(t => `
    <span class="tag tag-${t.split('/')[0]}" data-tag="${t}">
      ${t}
      <button class="tag-remove" onclick="removeTag('${t}')">&times;</button>
    </span>
  `).join('');
}

async function addTag(tag) {
  if (!selectedItem || !tag) return;
  
  const currentTags = selectedItem.tags || [];
  if (currentTags.includes(tag)) return;
  
  const newTags = [...currentTags, tag];
  await api.updateItem(selectedItem.id, { tags: newTags });
  await refreshBoard();
  
  // Update selected item reference
  for (const col of boardData.columns) {
    const item = col.items.find(i => i.id === selectedItem.id);
    if (item) {
      selectedItem = item;
      renderDetailTags(item.tags || []);
      break;
    }
  }
}

async function removeTag(tag) {
  if (!selectedItem) return;
  
  const currentTags = selectedItem.tags || [];
  const newTags = currentTags.filter(t => t !== tag);
  await api.updateItem(selectedItem.id, { tags: newTags });
  await refreshBoard();
  
  // Update selected item reference
  for (const col of boardData.columns) {
    const item = col.items.find(i => i.id === selectedItem.id);
    if (item) {
      selectedItem = item;
      renderDetailTags(item.tags || []);
      break;
    }
  }
}

// Make removeTag available globally for onclick
window.removeTag = removeTag;

async function handleCommentSubmit(e) {
  e.preventDefault();
  if (!selectedItem) return;
  
  const commentEl = document.getElementById('comment-text');
  const text = (commentEl.innerText || '').trim();
  if (!text) return;
  
  await api.addComment(selectedItem.id, text, currentUser);
  commentEl.innerText = '';
  
  await refreshBoard();
  
  // Update selected item and re-render comments
  for (const col of boardData.columns) {
    const item = col.items.find(i => i.id === selectedItem.id);
    if (item) {
      selectedItem = item;
      renderComments(item.comments);
      // Scroll to bottom to show new comment
      const commentsList = document.getElementById('comments-list');
      commentsList.scrollTop = commentsList.scrollHeight;
      break;
    }
  }
}

// Utility Functions
// Format text with @mentions highlighted
function formatMentions(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(/@(jimmy|kenny)/gi, '<span class="mention">@$1</span>');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function refreshBoard() {
  // Save scroll positions before refresh
  const scrollPositions = {};
  document.querySelectorAll('.column-items').forEach(col => {
    const colId = col.dataset.columnId;
    if (colId) scrollPositions[colId] = col.scrollTop;
  });
  
  boardData = await api.getBoard();
  renderBoard();
  updateTagFilterOptions();
  
  // Restore scroll positions after render
  document.querySelectorAll('.column-items').forEach(col => {
    const colId = col.dataset.columnId;
    if (colId && scrollPositions[colId]) {
      col.scrollTop = scrollPositions[colId];
    }
  });
  
  // Re-apply active filters
  if (searchInput.value || activeTagFilter) {
    filterCards();
  }
}

// Check for deep link on page load
function checkDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const taskId = params.get('task');
  
  if (taskId) {
    // Find the task and open it
    for (const col of boardData.columns) {
      const item = col.items.find(i => i.id === taskId);
      if (item) {
        openItemDetail(item);
        return;
      }
    }
    // Task not found - clear the parameter
    window.history.replaceState({}, '', window.location.pathname);
  }
}

// Update URL when opening/closing task detail
function updateUrlForTask(taskId) {
  if (taskId) {
    const url = new URL(window.location);
    url.searchParams.set('task', taskId);
    window.history.pushState({}, '', url);
  } else {
    window.history.pushState({}, '', window.location.pathname);
  }
}

// Initialize
async function init() {
  // Load user preference
  const savedUser = localStorage.getItem('kanban-user');
  if (savedUser) {
    currentUser = savedUser;
    userSelect.value = savedUser;
  }
  
  // Event listeners
  userSelect.addEventListener('change', (e) => {
    currentUser = e.target.value;
    localStorage.setItem('kanban-user', currentUser);
  });
  
  newItemBtn.addEventListener('click', openNewItemModal);
  closeNewModal.addEventListener('click', closeNewItemModal);
  cancelNew.addEventListener('click', closeNewItemModal);
  newItemForm.addEventListener('submit', handleNewItemSubmit);
  
  closeDetailModal.addEventListener('click', closeItemDetailModal);
  deleteItemBtn.addEventListener('click', handleDeleteItem);
  detailMoveColumn.addEventListener('change', handleMoveColumn);
  detailAssignee.addEventListener('change', handleAssigneeChange);
  tagSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      addTag(e.target.value);
      e.target.value = '';
    }
  });
  commentForm.addEventListener('submit', handleCommentSubmit);
  
  // Subtask form
  const subtaskForm = document.getElementById('subtask-form');
  subtaskForm.addEventListener('submit', handleAddSubtask);
  
  // Contenteditable comment input with live @mention highlighting
  const commentInput = document.getElementById('comment-text');
  const postBtn = commentForm.querySelector('button[type="submit"]');
  
  // Get plain text from contenteditable
  function getInputText() {
    return commentInput.innerText || '';
  }
  
  // Set text with highlighted mentions, preserving cursor
  function updateHighlights() {
    const sel = window.getSelection();
    const text = getInputText();
    
    // Save cursor position as text offset
    let cursorOffset = 0;
    if (sel.rangeCount > 0 && commentInput.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      const preRange = range.cloneRange();
      preRange.selectNodeContents(commentInput);
      preRange.setEnd(range.startContainer, range.startOffset);
      cursorOffset = preRange.toString().length;
    }
    
    // Highlight @mentions
    const highlighted = text.replace(/@(jimmy|kenny)\b/gi, '<span class="mention-highlight">@$1</span>');
    
    // Only update if content changed (prevents cursor jump on every keystroke)
    if (commentInput.innerHTML !== highlighted && highlighted !== text) {
      commentInput.innerHTML = highlighted;
      
      // Restore cursor position
      restoreCursor(cursorOffset);
    }
  }
  
  function restoreCursor(offset) {
    const sel = window.getSelection();
    const range = document.createRange();
    
    let charCount = 0;
    let found = false;
    
    function walkNodes(node) {
      if (found) return;
      if (node.nodeType === Node.TEXT_NODE) {
        const nextCount = charCount + node.length;
        if (offset <= nextCount) {
          range.setStart(node, offset - charCount);
          range.collapse(true);
          found = true;
        }
        charCount = nextCount;
      } else {
        for (const child of node.childNodes) {
          walkNodes(child);
          if (found) break;
        }
      }
    }
    
    walkNodes(commentInput);
    
    if (found) {
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      // Put cursor at end if offset not found
      range.selectNodeContents(commentInput);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
  
  // Cmd+Enter / Ctrl+Enter to submit
  commentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commentForm.dispatchEvent(new Event('submit'));
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      // Plain Enter submits (Shift+Enter for newline)
      e.preventDefault();
      commentForm.dispatchEvent(new Event('submit'));
    }
  });
  
  // @mention autocomplete
  let mentionDropdown = null;
  let mentionStartPos = -1;
  
  commentInput.addEventListener('input', () => {
    const text = getInputText();
    
    // Get cursor position
    const sel = window.getSelection();
    let cursorPos = 0;
    if (sel.rangeCount > 0 && commentInput.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      const preRange = range.cloneRange();
      preRange.selectNodeContents(commentInput);
      preRange.setEnd(range.startContainer, range.startOffset);
      cursorPos = preRange.toString().length;
    }
    
    // Find @ before cursor
    const beforeCursor = text.slice(0, cursorPos);
    const atMatch = beforeCursor.match(/@(\w*)$/);
    
    if (atMatch) {
      mentionStartPos = cursorPos - atMatch[0].length;
      const query = atMatch[1].toLowerCase();
      const matches = Object.values(USERS)
        .filter(u => u.id !== 'system' && u.name.toLowerCase().startsWith(query));
      
      if (matches.length > 0) {
        showMentionDropdown(matches);
      } else {
        hideMentionDropdown();
        // Update highlights after dropdown hidden
        updateHighlights();
      }
    } else {
      hideMentionDropdown();
      // Update highlights 
      updateHighlights();
    }
  });
  
  commentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && mentionDropdown && mentionDropdown.style.display !== 'none') {
      e.preventDefault();
      const firstOption = mentionDropdown.querySelector('.mention-option');
      if (firstOption) {
        completeMention(firstOption.dataset.name);
      }
    }
    if (e.key === 'Escape') {
      hideMentionDropdown();
    }
  });
  
  function showMentionDropdown(matches) {
    if (!mentionDropdown) {
      mentionDropdown = document.createElement('div');
      mentionDropdown.className = 'mention-dropdown';
      commentInput.parentNode.appendChild(mentionDropdown);
    }
    
    mentionDropdown.innerHTML = matches.map(u => 
      `<div class="mention-option" data-name="${u.name}">@${u.name}</div>`
    ).join('');
    
    mentionDropdown.style.display = 'block';
    
    // Click to select
    mentionDropdown.querySelectorAll('.mention-option').forEach(opt => {
      opt.addEventListener('click', () => {
        completeMention(opt.dataset.name);
      });
    });
  }
  
  function hideMentionDropdown() {
    if (mentionDropdown) {
      mentionDropdown.style.display = 'none';
    }
  }
  
  function completeMention(name) {
    const text = getInputText();
    const before = text.slice(0, mentionStartPos);
    const after = text.slice(mentionStartPos).replace(/^@\w*/, '');
    
    const newText = before + '@' + name + ' ' + after;
    commentInput.innerText = newText;
    
    // Update highlights and position cursor after mention
    updateHighlights();
    const newPos = mentionStartPos + name.length + 2;
    restoreCursor(newPos);
    
    commentInput.focus();
    hideMentionDropdown();
  }
  
  // Close modals on overlay click
  newItemModal.addEventListener('click', (e) => {
    if (e.target === newItemModal) closeNewItemModal();
  });
  itemDetailModal.addEventListener('click', (e) => {
    if (e.target === itemDetailModal) closeItemDetailModal();
  });
  
  // Keyboard navigation state
  let keyboardSelectedIndex = -1;
  
  function getAllVisibleCards() {
    return Array.from(document.querySelectorAll('.item:not(.search-hidden)'));
  }
  
  function updateKeyboardSelection(newIndex) {
    const cards = getAllVisibleCards();
    
    // Clear previous selection
    document.querySelectorAll('.item.keyboard-selected').forEach(el => {
      el.classList.remove('keyboard-selected');
    });
    
    if (newIndex < 0 || newIndex >= cards.length) {
      keyboardSelectedIndex = -1;
      return;
    }
    
    keyboardSelectedIndex = newIndex;
    const card = cards[newIndex];
    card.classList.add('keyboard-selected');
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  
  function openKeyboardSelectedCard() {
    const cards = getAllVisibleCards();
    if (keyboardSelectedIndex >= 0 && keyboardSelectedIndex < cards.length) {
      const card = cards[keyboardSelectedIndex];
      const itemId = card.dataset.itemId;
      for (const col of boardData.columns) {
        const item = col.items.find(i => i.id === itemId);
        if (item) {
          openItemDetailModal(item);
          break;
        }
      }
    }
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Skip if in input/textarea/contenteditable
    const inInput = document.activeElement.tagName === 'INPUT' || 
                    document.activeElement.tagName === 'TEXTAREA' ||
                    document.activeElement.isContentEditable;
    
    // Skip if modal is open
    const modalOpen = newItemModal.classList.contains('active') || 
                      itemDetailModal.classList.contains('active');
    
    if (e.key === 'Escape') {
      closeNewItemModal();
      closeItemDetailModal();
      updateKeyboardSelection(-1); // Clear selection on Escape
    }
    
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !inInput && !modalOpen) {
      openNewItemModal();
    }
    
    // Ctrl+Z / Cmd+Z for undo
    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey && !inInput) {
      e.preventDefault();
      performUndo();
    }
    
    // Arrow key navigation (only when not in input and no modal open)
    if (!inInput && !modalOpen) {
      const cards = getAllVisibleCards();
      
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const newIndex = keyboardSelectedIndex < 0 ? 0 : Math.min(keyboardSelectedIndex + 1, cards.length - 1);
        updateKeyboardSelection(newIndex);
      }
      
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const newIndex = keyboardSelectedIndex < 0 ? cards.length - 1 : Math.max(keyboardSelectedIndex - 1, 0);
        updateKeyboardSelection(newIndex);
      }
      
      if (e.key === 'Enter' && keyboardSelectedIndex >= 0) {
        e.preventDefault();
        openKeyboardSelectedCard();
      }
    }
  });
  
  // Load board
  await refreshBoard();
  
  // Check for deep link (open task from URL)
  checkDeepLink();
  
  // Poll for updates every 10 seconds
  setInterval(async () => {
    const wasSelected = selectedItem?.id;
    await refreshBoard();
    
    // Restore selection if modal was open
    if (wasSelected && itemDetailModal.classList.contains('active')) {
      for (const col of boardData.columns) {
        const item = col.items.find(i => i.id === wasSelected);
        if (item) {
          selectedItem = item;
          renderComments(item.comments);
          renderSubtasks(item.subtasks);
          break;
        }
      }
    }
  }, 10000);
}

init();
