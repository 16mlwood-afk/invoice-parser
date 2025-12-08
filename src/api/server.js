// API Server - Express.js application for web interface
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');

// Import API endpoints
const uploadAPI = require('./upload');
const processAPI = require('./process');
const statusAPI = require('./status');
const resultsAPI = require('./results');
const exportAPI = require('./export');
const cleanupAPI = require('./cleanup');
const settingsAPI = require('./settings');

class APIServer {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP for API responses
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration for frontend development
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL || false
        : ['http://localhost:3000', 'http://localhost:3001'], // Common Next.js ports
      credentials: true
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Health check endpoint
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Register API endpoints
    uploadAPI(this.app);
    processAPI(this.app);
    statusAPI(this.app);
    resultsAPI(this.app);
    exportAPI(this.app);
    cleanupAPI(this.app);
    settingsAPI(this.app);

    // 404 handler for API routes
    this.app.use('/api', (req, res) => {
      res.status(404).json({
        error: 'API endpoint not found',
        message: `The API endpoint ${req.path} does not exist`,
        availableEndpoints: [
          'GET /api/health',
          'POST /api/upload',
          'POST /api/process/:jobId',
          'GET /api/status/:jobId',
          'GET /api/status',
          'POST /api/status/:jobId/cancel',
          'GET /api/results',
          'GET /api/results/:jobId',
          'GET /api/export/:jobId?format=json|csv|pdf&template=summary|detailed|financial',
          'DELETE /api/cleanup/:jobId',
          'GET /api/settings',
          'PUT /api/settings',
          'POST /api/settings/reset'
        ]
      });
    });
  }

  /**
   * Setup error handling middleware
   */
  setupErrorHandling() {
    // Multer error handling
    this.app.use((error, req, res, next) => {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'File too large',
            message: 'File size exceeds the 50MB limit'
          });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            error: 'Too many files',
            message: 'Maximum 50 files allowed per upload'
          });
        }
        return res.status(400).json({
          error: 'Upload error',
          message: error.message
        });
      }

      // General error handling
      if (error.message && error.message.includes('Only PDF files are allowed')) {
        return res.status(400).json({
          error: 'Invalid file type',
          message: 'Only PDF files are allowed for upload'
        });
      }

      next(error);
    });

    // General error handler
    this.app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      });
    });
  }

  /**
   * Start the API server
   * @param {number} port - Port to listen on
   */
  start(port = 3001) {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          console.log(`🚀 API Server running on port ${port}`);
          console.log(`📚 Health check: http://localhost:${port}/api/health`);
          resolve(this.server);
        });

        this.server.on('error', (error) => {
          console.error('Failed to start API server:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the API server
   */
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 API Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the Express app instance
   */
  getApp() {
    return this.app;
  }
}

module.exports = APIServer;