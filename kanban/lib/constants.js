/**
 * Shared constants
 */

// Central user reference
const USERS = {
  kenny: { id: 'kenny', name: 'Kenny' },
  jimmy: { id: 'jimmy', name: 'Jimmy' }
};

function getUserName(userId) {
  return USERS[userId]?.name || userId || 'Unknown';
}

// Column definitions
const COLUMNS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'Todo' },
  { id: 'doing', title: 'Doing' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' }
];

module.exports = {
  USERS,
  getUserName,
  COLUMNS
};
