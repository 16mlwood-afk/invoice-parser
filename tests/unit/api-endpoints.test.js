const request = require('supertest');
const APIServer = require('../../src/api/server');
const fs = require('fs');
const path = require('path');

// Mock PDF file for testing
const mockPdfPath = path.join(__dirname, '../fixtures/mock-invoice.pdf');

// Create mock PDF if it doesn't exist
if (!fs.existsSync(path.dirname(mockPdfPath))) {
  fs.mkdirSync(path.dirname(mockPdfPath), { recursive: true });
}

// Create a minimal mock PDF buffer for testing
const createMockPdfBuffer = () => {
  // This is a minimal PDF header for testing purposes
  return Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Mock Invoice) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000200 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n284\n%%EOF');
};

describe('API Endpoints', () => {
  let server;
  let app;

  beforeAll(async () => {
    // Create mock PDF file
    fs.writeFileSync(mockPdfPath, createMockPdfBuffer());

    // Start API server
    server = new APIServer();
    app = server.getApp();
    // Don't start the server, just use the app directly for testing
  });

  afterAll(async () => {
    // Clean up
    if (fs.existsSync(mockPdfPath)) {
      fs.unlinkSync(mockPdfPath);
    }
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('POST /api/upload', () => {
    it('should reject requests without files', async () => {
      const response = await request(app)
        .post('/api/upload')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'No files uploaded');
    });

    it('should accept PDF file uploads', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('files', mockPdfPath)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('files');
      expect(response.body.jobId).toMatch(/^job_/);
    });

    it('should reject non-PDF files', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('files', Buffer.from('not a pdf'), 'test.txt')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/process/:jobId', () => {
    let jobId;

    beforeAll(async () => {
      // Create a job first
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('files', mockPdfPath);

      jobId = uploadResponse.body.jobId;
    });

    it('should start processing for valid job ID', async () => {
      const response = await request(app)
        .post(`/api/process/${jobId}`)
        .expect(202);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('jobId', jobId);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject invalid job IDs', async () => {
      const response = await request(app)
        .post('/api/process/invalid-job-id')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid job ID');
    });
  });

  describe('GET /api/status/:jobId', () => {
    let jobId;

    beforeAll(async () => {
      // Create and start processing a job
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('files', mockPdfPath);

      jobId = uploadResponse.body.jobId;

      await request(app)
        .post(`/api/process/${jobId}`);
    });

    it('should return job status', async () => {
      const response = await request(app)
        .get(`/api/status/${jobId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('job');
      expect(response.body.job).toHaveProperty('id', jobId);
      expect(response.body.job).toHaveProperty('status');
      expect(response.body.job).toHaveProperty('progress');
    });

    it('should reject invalid job IDs', async () => {
      const response = await request(app)
        .get('/api/status/invalid-job-id')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid job ID');
    });
  });

  describe('GET /api/results/:jobId', () => {
    it('should reject requests for incomplete jobs', async () => {
      const response = await request(app)
        .get('/api/results/job_test_123')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Job not found');
    });
  });

  describe('DELETE /api/cleanup/:jobId', () => {
    it('should reject invalid job IDs', async () => {
      const response = await request(app)
        .delete('/api/cleanup/invalid-job-id')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid job ID');
    });
  });
});