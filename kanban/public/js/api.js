// api.js - API calls and board refresh

import { currentUser, setBoardData, boardData } from './state.js';
import { showToast } from './utils.js';

// API helper with error handling
export async function apiCall(url, options = {}, actionName = 'Request') {
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

export const api = {
  async getBoard() {
    return apiCall('/api/board', {}, 'Load board');
  },
  
  async createItem(data) {
    return apiCall('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, createdBy: data?.createdBy || currentUser })
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

// Refresh board - will be set by main.js after render module is loaded
let renderBoardFn = null;
let updateTagFilterOptionsFn = null;
let filterCardsFn = null;
let searchInputEl = null;
let activeTagFilterRef = null;

export function setRefreshDependencies(deps) {
  renderBoardFn = deps.renderBoard;
  updateTagFilterOptionsFn = deps.updateTagFilterOptions;
  filterCardsFn = deps.filterCards;
  searchInputEl = deps.searchInput;
  activeTagFilterRef = deps.getActiveTagFilter;
}

export async function refreshBoard() {
  // Save scroll positions before refresh
  const scrollPositions = {};
  document.querySelectorAll('.column-items').forEach(col => {
    const colId = col.dataset.columnId;
    if (colId) scrollPositions[colId] = col.scrollTop;
  });
  
  const data = await api.getBoard();
  setBoardData(data);
  
  if (renderBoardFn) renderBoardFn();
  if (updateTagFilterOptionsFn) updateTagFilterOptionsFn();
  
  // Restore scroll positions after render
  document.querySelectorAll('.column-items').forEach(col => {
    const colId = col.dataset.columnId;
    if (colId && scrollPositions[colId]) {
      col.scrollTop = scrollPositions[colId];
    }
  });
  
  // Re-apply active filters
  if (searchInputEl && filterCardsFn) {
    const activeFilter = activeTagFilterRef ? activeTagFilterRef() : '';
    if (searchInputEl.value || activeFilter) {
      filterCardsFn();
    }
  }
}
