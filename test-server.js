const express = require('express');
const app = express();
const port = 3001;

console.log('Creating minimal test server...');

app.get('/test', (req, res) => {
  res.json({ message: 'Test server is working!' });
});

const server = app.listen(port, () => {
  console.log(`✅ Test server running on http://localhost:${port}`);
  console.log('Test endpoint: http://localhost:3001/test');
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down test server...');
  server.close(() => {
    console.log('Test server closed.');
    process.exit(0);
  });
});