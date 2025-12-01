const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

const app = express();

// Log startup information
console.log('🚀 Starting TES Dashboard Frontend Server');
console.log('Working directory:', process.cwd());
console.log('Build directory:', path.join(process.cwd(), 'build'));

// Check if build directory exists
const buildDir = path.join(process.cwd(), 'build');
if (fs.existsSync(buildDir)) {
  console.log('✅ Build directory found');
  const files = fs.readdirSync(buildDir);
  console.log('Build directory contents:', files);
} else {
  console.log('❌ Build directory not found');
}

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Health check endpoint (before proxy)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    backend: 'http://tes-dashboard-backend-service.federated-analytics-showcase.svc.cluster.local:8000',
    buildDir: buildDir,
    buildExists: fs.existsSync(buildDir)
  });
});

// Debug endpoint (before proxy)
app.get('/debug', (req, res) => {
  const buildExists = fs.existsSync(buildDir);
  const indexExists = fs.existsSync(path.join(buildDir, 'index.html'));
  let files = [];
  if (buildExists) {
    try {
      files = fs.readdirSync(buildDir);
    } catch (e) {
      files = ['Error reading directory: ' + e.message];
    }
  }
  res.json({
    buildDir,
    buildExists,
    indexExists,
    files,
    cwd: process.cwd()
  });
});

// API proxy to backend service - MUST be before static file serving
const proxyOptions = {
  target: 'http://tes-dashboard-backend-service.federated-analytics-showcase.svc.cluster.local:8000',
  changeOrigin: true,
  logLevel: 'debug',
  pathRewrite: {
    '^/api': '/api' // Keep /api prefix
  },
  onError: (err, req, res) => {
    console.error('❌ Proxy error:', err.message);
    console.error('Request URL:', req.url);
    res.status(500).json({ 
      error: 'Backend service unavailable',
      details: err.message,
      target: 'http://tes-dashboard-backend-service.federated-analytics-showcase.svc.cluster.local:8000'
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`📡 Proxying ${req.method} ${req.url} to backend`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`📥 Backend responded ${proxyRes.statusCode} for ${req.method} ${req.url}`);
  }
};

app.use('/api', createProxyMiddleware(proxyOptions));

// Serve static files from build directory
app.use(express.static(buildDir, {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Serve React app for all other routes (SPA fallback)
app.get('*', (req, res) => {
  const indexPath = path.join(buildDir, 'index.html');
  console.log('🏠 Serving index.html for:', req.url);
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.log('❌ Index.html not found at:', indexPath);
    res.status(404).send('Application not available');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 TES Dashboard Frontend running on port ${port}`);
  console.log(`🔗 Backend API proxied to: http://tes-dashboard-backend-service.federated-analytics-showcase.svc.cluster.local:8000`);
  console.log(`🌐 Access the dashboard at: http://localhost:${port}`);
});
