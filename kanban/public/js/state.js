// state.js - Application state and user management

// State
export let boardData = null;
export let currentUser = 'kenny';
export let selectedItem = null;
export let showArchivedDone = false;
export let undoStack = [];

// State setters (for use by other modules)
export function setBoardData(data) {
  boardData = data;
}

export function setCurrentUser(user) {
  currentUser = user;
}

export function setSelectedItem(item) {
  selectedItem = item;
}

export function setShowArchivedDone(value) {
  showArchivedDone = value;
}

// Central user reference
export const USERS = {
  dev: { id: 'dev', name: 'Dev' },
  qa: { id: 'qa', name: 'QA' },
  kenny: { id: 'kenny', name: 'Kenny' },
  jimmy: { id: 'jimmy', name: 'Jimmy' },
  system: { id: 'system', name: 'System' }
};

export function getUserName(userId) {
  return USERS[userId]?.name || userId || 'Unknown';
}

export function renderAssigneeOptions(selectEl, includeUnassigned = true) {
  if (!selectEl) return;

  const currentValue = selectEl.value;
  const users = Object.values(USERS).filter(u => u.id !== 'system');

  selectEl.innerHTML = '';

  if (includeUnassigned) {
    const unassigned = document.createElement('option');
    unassigned.value = '';
    unassigned.textContent = 'Unassigned';
    selectEl.appendChild(unassigned);
  }

  users.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.name;
    selectEl.appendChild(opt);
  });

  selectEl.value = currentValue;
}

// Find item by ID across all columns
export function findItemById(id) {
  if (!boardData) return null;
  for (const col of boardData.columns) {
    const item = col.items.find(i => i.id === id);
    if (item) return item;
  }
  return null;
}
