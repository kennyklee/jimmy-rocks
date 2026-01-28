// main.js - Application entry point and event handling

import {
  boardData, currentUser, selectedItem,
  setCurrentUser, setSelectedItem,
  USERS, renderAssigneeOptions
} from './state.js';

import { initTheme } from './theme.js';
import { showToast, initConfirmModal, showConfirm } from './utils.js';
import { api, refreshBoard, apiCall, setRefreshDependencies } from './api.js';
import { pushUndo, performUndo } from './undo.js';
import { renderBoard, renderComments, renderSubtasks, renderDetailTags, setRenderDependencies } from './render.js';
import { setupDragAndDrop, setDndDependencies } from './dnd.js';
import { initFilters, filterCards, updateTagFilterOptions, getActiveTagFilter } from './filters.js';
import { initMentions } from './mentions.js';

// DOM Elements
const userSelect = document.getElementById('user-select');
const searchInput = document.getElementById('search-input');
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
const itemAssignee = document.getElementById('item-assignee');
const tagSelect = document.getElementById('tag-select');

// Wire up dependencies between modules
setRefreshDependencies({
  renderBoard,
  updateTagFilterOptions,
  filterCards,
  searchInput,
  getActiveTagFilter
});

setRenderDependencies({
  setupDragAndDrop
});

setDndDependencies({
  openItemDetail
});

// Modal Functions
function openNewItemModal() {
  renderAssigneeOptions(itemAssignee);
  if (currentUser) itemAssignee.value = currentUser;
  newItemModal.classList.add('active');
  document.getElementById('item-title').focus();
}

function closeNewItemModal() {
  newItemModal.classList.remove('active');
  newItemForm.reset();
}

function openItemDetail(item) {
  setSelectedItem(item);
  
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
  
  renderAssigneeOptions(detailAssignee);
  detailAssignee.value = item.assignee || '';
  
  renderDetailTags(item.tags || []);
  
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
  
  const commentsList = document.getElementById('comments-list');
  commentsList.scrollTop = commentsList.scrollHeight;
}

function closeItemDetailModal() {
  itemDetailModal.classList.remove('active');
  setSelectedItem(null);
  document.getElementById('comment-text').innerText = '';
  updateUrlForTask(null);
}

// Event Handlers
async function handleNewItemSubmit(e) {
  e.preventDefault();
  
  const tagsSelect = document.getElementById('item-tags');
  const tags = tagsSelect
    ? Array.from(tagsSelect.selectedOptions).map(o => o.value)
    : [];

  const data = {
    title: document.getElementById('item-title').value,
    description: document.getElementById('item-description').value,
    priority: document.getElementById('item-priority').value,
    assignee: document.getElementById('item-assignee').value,
    columnId: document.getElementById('item-column').value,
    tags,
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

async function handleDeleteItem() {
  if (!selectedItem) return;
  
  const itemToDelete = { ...selectedItem };
  
  let itemColumn = null;
  for (const col of boardData.columns) {
    if (col.items.find(i => i.id === selectedItem.id)) {
      itemColumn = col.id;
      break;
    }
  }
  
  showConfirm(`Delete "${selectedItem.title}"?`, async () => {
    try {
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
  
  for (const col of boardData.columns) {
    const item = col.items.find(i => i.id === selectedItem.id);
    if (item) {
      setSelectedItem(item);
      break;
    }
  }
}

async function handleAssigneeChange(e) {
  if (!selectedItem) return;
  
  const newAssignee = e.target.value || null;
  await api.updateItem(selectedItem.id, { assignee: newAssignee });
  await refreshBoard();
  
  for (const col of boardData.columns) {
    const item = col.items.find(i => i.id === selectedItem.id);
    if (item) {
      setSelectedItem(item);
      break;
    }
  }
}

async function addTag(tag) {
  if (!selectedItem || !tag) return;
  
  const currentTags = selectedItem.tags || [];
  if (currentTags.includes(tag)) return;
  
  const newTags = [...currentTags, tag];
  await api.updateItem(selectedItem.id, { tags: newTags });
  await refreshBoard();
  
  for (const col of boardData.columns) {
    const item = col.items.find(i => i.id === selectedItem.id);
    if (item) {
      setSelectedItem(item);
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
  
  for (const col of boardData.columns) {
    const item = col.items.find(i => i.id === selectedItem.id);
    if (item) {
      setSelectedItem(item);
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
  
  for (const col of boardData.columns) {
    const item = col.items.find(i => i.id === selectedItem.id);
    if (item) {
      setSelectedItem(item);
      renderComments(item.comments);
      const commentsList = document.getElementById('comments-list');
      commentsList.scrollTop = commentsList.scrollHeight;
      break;
    }
  }
}

// Subtask handlers
async function toggleSubtask(subtaskId, completed) {
  if (!selectedItem) return;
  
  try {
    await fetch(`/api/items/${selectedItem.id}/subtasks/${subtaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed })
    });
    
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
    
    selectedItem.subtasks = selectedItem.subtasks || [];
    selectedItem.subtasks.push(subtask);
    
    input.value = '';
    renderSubtasks(selectedItem.subtasks);
    await refreshBoard();
  } catch (err) {
    // Error shown via toast
  }
}

// Make functions globally accessible for onclick handlers
window.toggleSubtask = toggleSubtask;
window.deleteSubtask = deleteSubtask;

// Deep linking
function checkDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const taskId = params.get('task');
  
  if (taskId && boardData) {
    for (const col of boardData.columns) {
      const item = col.items.find(i => i.id === taskId);
      if (item) {
        openItemDetail(item);
        return;
      }
    }
    window.history.replaceState({}, '', window.location.pathname);
  }
}

function updateUrlForTask(taskId) {
  if (taskId) {
    const url = new URL(window.location);
    url.searchParams.set('task', taskId);
    window.history.pushState({}, '', url);
  } else {
    window.history.pushState({}, '', window.location.pathname);
  }
}

// Keyboard navigation
let keyboardSelectedIndex = -1;

function getAllVisibleCards() {
  return Array.from(document.querySelectorAll('.item:not(.search-hidden)'));
}

function updateKeyboardSelection(newIndex) {
  const cards = getAllVisibleCards();
  
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
        openItemDetail(item);
        break;
      }
    }
  }
}

// Initialize
async function init() {
  initTheme();
  initConfirmModal();
  initFilters();

  renderAssigneeOptions(userSelect, false);
  renderAssigneeOptions(itemAssignee);
  renderAssigneeOptions(detailAssignee);
  
  const savedUser = localStorage.getItem('kanban-user');
  if (savedUser && USERS[savedUser] && savedUser !== 'system') {
    setCurrentUser(savedUser);
  } else if (savedUser) {
    localStorage.removeItem('kanban-user');
  }
  userSelect.value = currentUser;

  // Event listeners
  userSelect.addEventListener('change', (e) => {
    const nextUser = e.target.value;
    if (!nextUser) {
      e.target.value = currentUser;
      return;
    }
    setCurrentUser(nextUser);
    localStorage.setItem('kanban-user', nextUser);
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
  
  const subtaskForm = document.getElementById('subtask-form');
  subtaskForm.addEventListener('submit', handleAddSubtask);
  
  // @mention autocomplete
  const commentInput = document.getElementById('comment-text');
  initMentions(commentInput, commentForm);
  
  // Close modals on overlay click
  newItemModal.addEventListener('click', (e) => {
    if (e.target === newItemModal) closeNewItemModal();
  });
  itemDetailModal.addEventListener('click', (e) => {
    if (e.target === itemDetailModal) closeItemDetailModal();
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const inInput = document.activeElement.tagName === 'INPUT' || 
                    document.activeElement.tagName === 'TEXTAREA' ||
                    document.activeElement.isContentEditable;
    
    const modalOpen = newItemModal.classList.contains('active') || 
                      itemDetailModal.classList.contains('active');
    
    if (e.key === 'Escape') {
      closeNewItemModal();
      closeItemDetailModal();
      updateKeyboardSelection(-1);
    }
    
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !inInput && !modalOpen) {
      openNewItemModal();
    }
    
    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey && !inInput) {
      e.preventDefault();
      performUndo();
    }
    
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
  
  checkDeepLink();
  
  // Default keyboard selection to first Todo card
  const todoColumn = document.querySelector('[data-column-id="todo"] .column-items');
  if (todoColumn) {
    const firstTodoCard = todoColumn.querySelector('.item:not(.search-hidden)');
    if (firstTodoCard) {
      const allCards = getAllVisibleCards();
      const idx = allCards.indexOf(firstTodoCard);
      if (idx >= 0) updateKeyboardSelection(idx);
    }
  }
  
  // Poll for updates every 10 seconds
  setInterval(async () => {
    // Skip refresh if recent drag-drop (prevents double flash)
    if (window.lastKanbanMove && Date.now() - window.lastKanbanMove < 3000) return;

    const wasSelected = selectedItem?.id;
    await refreshBoard();
    
    if (wasSelected && itemDetailModal.classList.contains('active')) {
      for (const col of boardData.columns) {
        const item = col.items.find(i => i.id === wasSelected);
        if (item) {
          setSelectedItem(item);
          renderComments(item.comments);
          renderSubtasks(item.subtasks);
          break;
        }
      }
    }
  }, 10000);
}

init();
