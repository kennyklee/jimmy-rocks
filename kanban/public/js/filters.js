// filters.js - Search and tag filtering

import { boardData, findItemById } from './state.js';

// Filter state
let searchTimeout = null;
let activeTagFilter = '';

export function getActiveTagFilter() {
  return activeTagFilter;
}

export function setActiveTagFilter(value) {
  activeTagFilter = value;
}

export function filterCards() {
  const searchInput = document.getElementById('search-input');
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

export function updateTagFilterOptions() {
  const tagFilterBtn = document.getElementById('tag-filter-btn');
  const tagFilterDropdown = document.getElementById('tag-filter-dropdown');
  
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
      updateTagFilterOptions();
    });
  });
}

export function initFilters() {
  const searchInput = document.getElementById('search-input');
  const tagFilterBtn = document.getElementById('tag-filter-btn');
  const tagFilterDropdown = document.getElementById('tag-filter-dropdown');
  
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
}
