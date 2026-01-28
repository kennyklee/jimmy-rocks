const { body, param, validationResult } = require('express-validator');

const VALID_COLUMNS = ['backlog', 'todo', 'doing', 'review', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_USERS = ['kenny', 'jimmy'];

function validate(validations) {
  return async (req, res, next) => {
    await Promise.all(validations.map(v => v.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) return next();

    const details = errors.array({ onlyFirstError: true }).map(e => ({
      field: e.path,
      message: e.msg
    }));

    return res.status(400).json({
      error: 'Validation failed',
      details
    });
  };
}

// Common validators
const idParam = [
  param('id')
    .isString().withMessage('id must be a string')
    .trim()
    .notEmpty().withMessage('id is required')
    .escape()
];

const titleField = body('title')
  .isString().withMessage('title must be a string')
  .trim()
  .notEmpty().withMessage('title is required')
  .isLength({ max: 120 }).withMessage('title must be at most 120 characters')
  .escape();

const descriptionField = body('description')
  .optional({ nullable: true })
  .isString().withMessage('description must be a string')
  .trim()
  .isLength({ max: 2000 }).withMessage('description must be at most 2000 characters')
  .escape();

const priorityField = body('priority')
  .optional({ nullable: true })
  .isIn(VALID_PRIORITIES).withMessage(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`);

const assigneeField = body('assignee')
  .optional({ nullable: true })
  .customSanitizer(v => (v == null ? v : String(v).trim().toLowerCase()))
  .custom(v => v === '' || VALID_USERS.includes(v)).withMessage(`assignee must be one of: ${VALID_USERS.join(', ')} (or empty)`)
  .escape();

const createdByField = body('createdBy')
  .optional({ nullable: true })
  .isString().withMessage('createdBy must be a string')
  .trim()
  .isLength({ max: 40 }).withMessage('createdBy must be at most 40 characters')
  .escape();

const blockedByField = body('blockedBy')
  .optional({ nullable: true })
  .customSanitizer(v => (v == null ? v : String(v).trim().toLowerCase()))
  .custom(v => v === '' || VALID_USERS.includes(v)).withMessage(`blockedBy must be one of: ${VALID_USERS.join(', ')} (or empty)`)
  .escape();

const tagsField = body('tags')
  .optional({ nullable: true })
  .custom(tags => {
    if (!Array.isArray(tags)) throw new Error('tags must be an array');
    if (tags.length > 20) throw new Error('tags must have at most 20 entries');
    for (const t of tags) {
      if (typeof t !== 'string') throw new Error('each tag must be a string');
      if (t.trim().length === 0) continue;
      if (t.trim().length > 30) throw new Error('each tag must be at most 30 characters');
    }
    return true;
  })
  .customSanitizer(tags => {
    if (!Array.isArray(tags)) return tags;
    return tags.map(t => String(t).trim()).filter(Boolean);
  })
  // Simple HTML-escape for tags (defense in depth if rendered with innerHTML)
  .customSanitizer(tags => tags.map(t => t.replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))));

const columnIdField = body('columnId')
  .optional({ nullable: true })
  .isIn(VALID_COLUMNS).withMessage(`columnId must be one of: ${VALID_COLUMNS.join(', ')}`);

const toColumnIdField = body('toColumnId')
  .isString().withMessage('toColumnId must be a string')
  .trim()
  .isIn(VALID_COLUMNS).withMessage(`toColumnId must be one of: ${VALID_COLUMNS.join(', ')}`)
  .escape();

const positionField = body('position')
  .optional({ nullable: true })
  .isInt({ min: 0 }).withMessage('position must be an integer >= 0')
  .toInt();

const movedByField = body('movedBy')
  .optional({ nullable: true })
  .isString().withMessage('movedBy must be a string')
  .trim()
  .isLength({ max: 40 }).withMessage('movedBy must be at most 40 characters')
  .escape();

const authorField = body('author')
  .optional({ nullable: true })
  .isString().withMessage('author must be a string')
  .trim()
  .isLength({ max: 40 }).withMessage('author must be at most 40 characters')
  .escape();

const commentTextField = body('text')
  .isString().withMessage('text must be a string')
  .trim()
  .notEmpty().withMessage('text is required')
  .isLength({ max: 2000 }).withMessage('text must be at most 2000 characters')
  .escape();

// Route validators
const createItemValidation = [
  titleField,
  descriptionField,
  priorityField,
  assigneeField,
  createdByField,
  columnIdField,
  tagsField
];

const updateItemValidation = [
  ...idParam,
  body('title')
    .optional({ nullable: true })
    .isString().withMessage('title must be a string')
    .trim()
    .isLength({ min: 1, max: 120 }).withMessage('title must be 1-120 characters')
    .escape(),
  descriptionField,
  priorityField,
  assigneeField,
  blockedByField,
  createdByField,
  columnIdField,
  tagsField
];

const addCommentValidation = [
  ...idParam,
  commentTextField,
  authorField
];

const moveItemValidation = [
  ...idParam,
  toColumnIdField,
  positionField,
  movedByField
];

module.exports = {
  validate,
  createItemValidation,
  updateItemValidation,
  addCommentValidation,
  moveItemValidation
};
