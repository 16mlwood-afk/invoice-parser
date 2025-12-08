// API endpoint for file uploads
const multer = require('multer');
const path = require('path');
const { ensureDirectoryExists } = require('../utils/file-operations');
const ProcessingAPI = require('./processing');

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
ensureDirectoryExists(uploadDir);

// File filter for PDF validation
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 50 // Maximum 50 files per request
  }
});

// Initialize processing API
const processingAPI = new ProcessingAPI();

module.exports = (app) => {
  // POST /api/upload - Handle single or batch file uploads
  app.post('/api/upload', upload.array('files', 50), async (req, res) => {
    try {
      // Validate request
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'No files uploaded',
          message: 'At least one PDF file must be provided'
        });
      }

      // Create processing job
      const jobId = await processingAPI.createJob(req.files);

      // Return job information
      res.status(201).json({
        success: true,
        jobId: jobId,
        message: `${req.files.length} file(s) uploaded successfully`,
        files: req.files.map(file => ({
          filename: file.originalname,
          size: file.size,
          mimeType: file.mimetype
        }))
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        error: 'Upload failed',
        message: error.message
      });
    }
  });
};