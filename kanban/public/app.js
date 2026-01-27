// State
let boardData = null;
let currentUser = 'kenny';
let selectedItem = null;

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

// Search functionality
let searchTimeout = null;

function filterCards(query) {
  const q = query.toLowerCase().trim();
  const items = document.querySelectorAll('.item');
  
  items.forEach(item => {
    if (!q) {
      item.classList.remove('search-hidden');
      return;
    }
    
    const itemId = item.dataset.itemId;
    const itemData = findItemById(itemId);
    
    if (itemData) {
      const titleMatch = itemData.title.toLowerCase().includes(q);
      const descMatch = (itemData.description || '').toLowerCase().includes(q);
      
      if (titleMatch || descMatch) {
        item.classList.remove('search-hidden');
      } else {
        item.classList.add('search-hidden');
      }
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

searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    filterCards(e.target.value);
  }, 100);
});

// Clear search on Escape
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    searchInput.value = '';
    filterCards('');
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
const api = {
  async getBoard() {
    const res = await fetch('/api/board');
    return res.json();
  },
  
  async createItem(data) {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  
  async updateItem(itemId, data) {
    const res = await fetch(`/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  
  async moveItem(itemId, toColumnId, position, movedBy) {
    const res = await fetch(`/api/items/${itemId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toColumnId, position, movedBy })
    });
    return res.json();
  },
  
  async deleteItem(itemId) {
    const res = await fetch(`/api/items/${itemId}`, {
      method: 'DELETE'
    });
    return res.json();
  },
  
  async addComment(itemId, text, author) {
    const res = await fetch(`/api/items/${itemId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, author })
    });
    return res.json();
  }
};

// Render Functions
function renderBoard() {
  board.innerHTML = boardData.columns.map(column => `
    <div class="column" data-column-id="${column.id}">
      <div class="column-header">
        <span class="column-title">${column.title}</span>
        <span class="column-count">${column.items.length}</span>
      </div>
      <div class="column-items" data-column-id="${column.id}">
        ${column.items.length === 0 
          ? '<div class="column-empty">No items</div>'
          : column.items.map(item => renderItem(item)).join('')
        }
      </div>
    </div>
  `).join('');
  
  setupDragAndDrop();
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
  itemDetailModal.classList.add('active');
  updateUrlForTask(item.id);
  
  // Scroll comments to bottom when opening
  const commentsList = document.getElementById('comments-list');
  commentsList.scrollTop = commentsList.scrollHeight;
}

function closeItemDetailModal() {
  itemDetailModal.classList.remove('active');
  selectedItem = null;
  document.getElementById('comment-text').value = '';
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
  
  await api.createItem(data);
  closeNewItemModal();
  await refreshBoard();
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
  
  showConfirm(`Delete "${selectedItem.title}"?`, async () => {
    await api.deleteItem(selectedItem.id);
    closeItemDetailModal();
    await refreshBoard();
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
  const text = commentEl.value.trim();
  if (!text) return;
  
  await api.addComment(selectedItem.id, text, currentUser);
  commentEl.value = '';
  
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
  
  // Restore scroll positions after render
  document.querySelectorAll('.column-items').forEach(col => {
    const colId = col.dataset.columnId;
    if (colId && scrollPositions[colId]) {
      col.scrollTop = scrollPositions[colId];
    }
  });
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
  
  // Cmd+Enter (Mac) or Ctrl+Enter (Win/Linux) to submit comment
  const commentTextarea = document.getElementById('comment-text');
  const postBtn = commentForm.querySelector('button[type="submit"]');
  
  commentTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      postBtn.classList.add('pressed');
    }
  });
  
  commentTextarea.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' || e.key === 'Meta' || e.key === 'Control') {
      if (postBtn.classList.contains('pressed')) {
        postBtn.classList.remove('pressed');
        commentForm.dispatchEvent(new Event('submit'));
      }
    }
  });
  
  // @mention autocomplete for textarea
  let mentionDropdown = null;
  let mentionStartPos = -1;
  
  commentTextarea.addEventListener('input', (e) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // Find @ before cursor
    const beforeCursor = text.slice(0, cursorPos);
    const atMatch = beforeCursor.match(/@(\w*)$/);
    
    if (atMatch) {
      mentionStartPos = cursorPos - atMatch[0].length;
      const query = atMatch[1].toLowerCase();
      const matches = Object.values(USERS)
        .filter(u => u.id !== 'system' && u.name.toLowerCase().startsWith(query));
      
      if (matches.length > 0) {
        showMentionDropdown(e.target, matches);
      } else {
        hideMentionDropdown();
      }
    } else {
      hideMentionDropdown();
    }
  });
  
  commentTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && mentionDropdown && mentionDropdown.style.display !== 'none') {
      e.preventDefault();
      const firstOption = mentionDropdown.querySelector('.mention-option');
      if (firstOption) {
        completeMention(commentTextarea, firstOption.dataset.name);
      }
    }
    if (e.key === 'Escape') {
      hideMentionDropdown();
    }
  });
  
  function showMentionDropdown(textarea, matches) {
    if (!mentionDropdown) {
      mentionDropdown = document.createElement('div');
      mentionDropdown.className = 'mention-dropdown';
      textarea.parentNode.appendChild(mentionDropdown);
    }
    
    mentionDropdown.innerHTML = matches.map(u => 
      `<div class="mention-option" data-name="${u.name}">@${u.name}</div>`
    ).join('');
    
    mentionDropdown.style.display = 'block';
    
    // Click to select
    mentionDropdown.querySelectorAll('.mention-option').forEach(opt => {
      opt.addEventListener('click', () => {
        completeMention(textarea, opt.dataset.name);
      });
    });
  }
  
  function hideMentionDropdown() {
    if (mentionDropdown) {
      mentionDropdown.style.display = 'none';
    }
  }
  
  function completeMention(textarea, name) {
    const text = textarea.value;
    const before = text.slice(0, mentionStartPos);
    const after = text.slice(textarea.selectionStart);
    
    textarea.value = before + '@' + name + ' ' + after;
    textarea.focus();
    
    // Position cursor after the mention and space
    const newPos = mentionStartPos + name.length + 2;
    textarea.setSelectionRange(newPos, newPos);
    
    hideMentionDropdown();
  }
  
  // Close modals on overlay click
  newItemModal.addEventListener('click', (e) => {
    if (e.target === newItemModal) closeNewItemModal();
  });
  itemDetailModal.addEventListener('click', (e) => {
    if (e.target === itemDetailModal) closeItemDetailModal();
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNewItemModal();
      closeItemDetailModal();
    }
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && 
        document.activeElement.tagName !== 'INPUT' && 
        document.activeElement.tagName !== 'TEXTAREA') {
      openNewItemModal();
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
          break;
        }
      }
    }
  }, 10000);
}

init();
