const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const port = 3000;

// Serve static files from build directory
app.use(express.static(path.join(__dirname, 'build')));

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
  target: 'http://tesdashboardanalytics-backend-service:8000',
  changeOrigin: true,
  timeout: 10000,
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Backend service unavailable' });
  }
}));

// Handle React Router - send all non-API requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🌐 Frontend server running on http://0.0.0.0:${port}`);
  console.log(`🔗 API requests will be proxied to backend service`);
});
