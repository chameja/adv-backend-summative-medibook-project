// Express application: middleware + route mounting. No app.listen() here so the
// app can be imported by tests without opening a port.
const express = require('express');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routers from src/routes/ are mounted here (Part C).

module.exports = app;
