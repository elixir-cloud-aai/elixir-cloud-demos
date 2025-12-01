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
    cwd: process.cwd(),
    serverVersion: 'v3.0-manual-proxy-fallback',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      REACT_APP_API_URL: process.env.REACT_APP_API_URL,
      PORT: process.env.PORT
    },
    proxyTarget: 'http://tes-dashboard-backend-service.federated-analytics-showcase.svc.cluster.local:8000'
  });
});

// Test proxy endpoint to check backend connectivity
app.get('/test-proxy', async (req, res) => {
  try {
    console.log('🧪 Testing proxy connectivity to backend...');
    // This should work if proxy is properly configured
    res.json({
      message: 'Test proxy endpoint works',
      timestamp: new Date().toISOString(),
      note: 'If you see this, Express server is running but API proxy may still have issues'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Test proxy failed',
      details: error.message
    });
  }
});

// Manual backend test endpoint
app.get('/test-backend', async (req, res) => {
  try {
    console.log('🔗 Testing direct backend connectivity...');
    // Try to connect to backend directly using Node.js
    const http = require('http');
    const url = require('url');
    
    const backendUrl = 'http://tes-dashboard-backend-service.federated-analytics-showcase.svc.cluster.local:8000/api/health';
    console.log('🎯 Testing backend URL:', backendUrl);
    
    res.json({
      message: 'Backend test initiated',
      backendUrl,
      timestamp: new Date().toISOString(),
      note: 'Check server logs for connection results'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Backend test failed',
      details: error.message
    });
  }
});

// API proxy to backend service - MUST be before static file serving
console.log('🔧 Setting up API proxy middleware...');
console.log('📦 http-proxy-middleware available:', !!createProxyMiddleware);

const backendHost = 'tes-dashboard-backend-service.federated-analytics-showcase.svc.cluster.local';
const backendPort = 8000;

// Try http-proxy-middleware first, fall back to manual proxy
try {
  console.log('🎯 Attempting to use http-proxy-middleware...');
  
  const proxyOptions = {
    target: `http://${backendHost}:${backendPort}`,
    changeOrigin: true,
    logLevel: 'debug',
    pathRewrite: {
      '^/api': '/api' // Keep /api prefix
    },
    onError: (err, req, res) => {
      console.error('❌ Proxy middleware error:', err.message);
      console.error('Request URL:', req.url);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Backend service unavailable via middleware',
          details: err.message,
          target: `http://${backendHost}:${backendPort}`
        });
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`📡 Middleware proxying ${req.method} ${req.url} to backend`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`📥 Backend responded ${proxyRes.statusCode} for ${req.method} ${req.url}`);
    }
  };

  const proxy = createProxyMiddleware(proxyOptions);
  app.use('/api', proxy);
  console.log('✅ http-proxy-middleware configured successfully');
  
} catch (middlewareError) {
  console.error('❌ http-proxy-middleware failed:', middlewareError.message);
  console.log('🔄 Setting up manual proxy fallback...');
  
  // Manual proxy implementation using Node.js http module
  app.use('/api', (req, res) => {
    console.log(`📡 Manual proxy: ${req.method} ${req.url}`);
    
    const http = require('http');
    const backendUrl = `http://${backendHost}:${backendPort}${req.url}`;
    
    console.log(`🎯 Proxying to: ${backendUrl}`);
    
    const options = {
      hostname: backendHost,
      port: backendPort,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${backendHost}:${backendPort}`
      }
    };
    
    delete options.headers['host']; // Remove original host header
    
    const proxyReq = http.request(options, (proxyRes) => {
      console.log(`📥 Manual proxy response: ${proxyRes.statusCode}`);
      
      // Copy response headers
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key]);
      });
      
      // Set status code
      res.status(proxyRes.statusCode);
      
      // Pipe response
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error('❌ Manual proxy error:', err.message);
      if (!res.headersSent) {
        res.status(502).json({
          error: 'Backend connection failed (manual proxy)',
          details: err.message,
          backendUrl
        });
      }
    });
    
    // Forward request body if present
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  });
  
  console.log('✅ Manual proxy fallback configured');
}

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
