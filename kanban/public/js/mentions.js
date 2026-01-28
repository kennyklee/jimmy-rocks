// mentions.js - @mention autocomplete in comment input

import { USERS } from './state.js';

let mentionDropdown = null;
let mentionStartPos = -1;

export function initMentions(commentInput, commentForm) {
  // Get plain text from contenteditable
  function getInputText() {
    return commentInput.innerText || '';
  }
  
  // Restore cursor position
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
      range.selectNodeContents(commentInput);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
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
    
    // Only update if content changed
    if (commentInput.innerHTML !== highlighted && highlighted !== text) {
      commentInput.innerHTML = highlighted;
      restoreCursor(cursorOffset);
    }
  }
  
  // Cmd+Enter / Ctrl+Enter to submit
  commentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commentForm.dispatchEvent(new Event('submit'));
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      commentForm.dispatchEvent(new Event('submit'));
    }
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
        updateHighlights();
      }
    } else {
      hideMentionDropdown();
      updateHighlights();
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
    
    updateHighlights();
    const newPos = mentionStartPos + name.length + 2;
    restoreCursor(newPos);
    
    commentInput.focus();
    hideMentionDropdown();
  }
}
