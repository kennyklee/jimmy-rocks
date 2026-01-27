// State
let boardData = null;
let currentUser = 'kenny';
let selectedItem = null;

// DOM Elements
const board = document.getElementById('board');
const userSelect = document.getElementById('user-select');
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
  
  async moveItem(itemId, toColumnId, position) {
    const res = await fetch(`/api/items/${itemId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toColumnId, position })
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
  
  return `
    <div class="item" data-item-id="${item.id}" draggable="true">
      <div class="item-header">
        <span class="item-title">${escapeHtml(item.title)}</span>
        <span class="priority-badge ${priorityClass}">${item.priority}</span>
      </div>
      ${item.description ? `<div class="item-description">${escapeHtml(item.description)}</div>` : ''}
      <div class="item-footer">
        <span>${createdDate} · ${item.createdBy}</span>
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
    
    return `
      <div class="comment">
        <div class="comment-header">
          <span class="comment-author ${comment.author}">${comment.author === 'kenny' ? 'Kenny' : 'Jimmy'}</span>
          <span class="comment-time">${time}</span>
        </div>
        <div class="comment-text">${escapeHtml(comment.text)}</div>
      </div>
    `;
  }).join('');
  
  // Scroll to bottom
  list.scrollTop = list.scrollHeight;
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
  document.getElementById('detail-priority').textContent = item.priority;
  document.getElementById('detail-priority').className = `priority-badge priority-${item.priority}`;
  document.getElementById('detail-description').textContent = item.description || 'No description';
  document.getElementById('detail-created').textContent = new Date(item.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  document.getElementById('detail-author').textContent = `by ${item.createdBy}`;
  
  // Find current column
  for (const col of boardData.columns) {
    if (col.items.find(i => i.id === item.id)) {
      detailMoveColumn.value = col.id;
      break;
    }
  }
  
  renderComments(item.comments);
  itemDetailModal.classList.add('active');
}

function closeItemDetailModal() {
  itemDetailModal.classList.remove('active');
  selectedItem = null;
  document.getElementById('comment-text').value = '';
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
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  
  if (!draggedItem) return;
  
  const itemId = draggedItem.dataset.itemId;
  const toColumnId = e.currentTarget.dataset.columnId;
  
  await api.moveItem(itemId, toColumnId);
  await refreshBoard();
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
    columnId: document.getElementById('item-column').value,
    createdBy: currentUser
  };
  
  await api.createItem(data);
  closeNewItemModal();
  await refreshBoard();
}

async function handleDeleteItem() {
  if (!selectedItem) return;
  if (!confirm('Delete this item?')) return;
  
  await api.deleteItem(selectedItem.id);
  closeItemDetailModal();
  await refreshBoard();
}

async function handleMoveColumn(e) {
  if (!selectedItem) return;
  
  const toColumnId = e.target.value;
  await api.moveItem(selectedItem.id, toColumnId);
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

async function handleCommentSubmit(e) {
  e.preventDefault();
  if (!selectedItem) return;
  
  const text = document.getElementById('comment-text').value.trim();
  if (!text) return;
  
  await api.addComment(selectedItem.id, text, currentUser);
  document.getElementById('comment-text').value = '';
  
  await refreshBoard();
  
  // Update selected item and re-render comments
  for (const col of boardData.columns) {
    const item = col.items.find(i => i.id === selectedItem.id);
    if (item) {
      selectedItem = item;
      renderComments(item.comments);
      break;
    }
  }
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function refreshBoard() {
  boardData = await api.getBoard();
  renderBoard();
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
  commentForm.addEventListener('submit', handleCommentSubmit);
  
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
