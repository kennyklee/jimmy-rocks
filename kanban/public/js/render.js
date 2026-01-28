// render.js - Board and item rendering functions

import { boardData, showArchivedDone, setShowArchivedDone, getUserName } from './state.js';
import { escapeHtml, formatMentions } from './utils.js';

// Will be set by main.js
let setupDragAndDropFn = null;

export function setRenderDependencies(deps) {
  setupDragAndDropFn = deps.setupDragAndDrop;
}

export function renderBoard() {
  const board = document.getElementById('board');
  const ARCHIVE_DAYS = 1;
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
          <button class="archive-toggle" onclick="window.toggleArchived()">
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
  
  if (setupDragAndDropFn) setupDragAndDropFn();
}

export function toggleArchived() {
  setShowArchivedDone(!showArchivedDone);
  renderBoard();
}

// Make toggleArchived globally accessible
window.toggleArchived = toggleArchived;

export function renderItem(item) {
  const priorityClass = `priority-${item.priority}`;
  const commentCount = item.comments?.length || 0;
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
    <div class="item ${blockedClass}" data-item-id="${item.id}">
      <div class="item-header">
        <span class="item-title">${escapeHtml(item.title)}</span>
        ${blockedBadge}
        <span class="ticket-number">${ticketNum}</span>
      </div>
      ${tagsHtml}
      ${item.description ? `<div class="item-description">${escapeHtml(item.description)}</div>` : ''}
      <div class="item-footer">
        <span class="priority-badge ${priorityClass}">${item.priority}</span>
        ${subtaskHtml}
        <span class="item-footer-right">
          ${commentCount > 0 ? `<span class="item-comments">💬 ${commentCount}</span>` : ''}
          <span class="assignee-badge ${assigneeClass}" title="${item.assignee || 'Unassigned'}">${assigneeInitial}</span>
        </span>
      </div>
    </div>
  `;
}

export function renderComments(comments) {
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

export function renderSubtasks(subtasks) {
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
             onchange="window.toggleSubtask('${subtask.id}', this.checked)">
      <span class="subtask-text">${escapeHtml(subtask.text)}</span>
      <button class="subtask-delete" onclick="window.deleteSubtask('${subtask.id}')">&times;</button>
    </div>
  `).join('');
}

export function renderDetailTags(tags) {
  const detailTags = document.getElementById('detail-tags');
  detailTags.innerHTML = tags.map(t => `
    <span class="tag tag-${t.split('/')[0]}" data-tag="${t}">
      ${t}
      <button class="tag-remove" onclick="window.removeTag('${t}')">&times;</button>
    </span>
  `).join('');
}
