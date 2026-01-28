const morgan = require('morgan');
const app = require('./app');

const PORT = process.env.PORT || 3333;

// Add morgan logging only in server mode (not tests)
app.use(morgan('combined'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Kanban server running on http://0.0.0.0:${PORT}`);
});
