// API endpoint for starting job processing
const ProcessingAPI = require('./processing');

// Initialize processing API
const processingAPI = new ProcessingAPI();

module.exports = (app) => {
  // POST /api/process/:jobId - Start processing a job
  app.post('/api/process/:jobId', async (req, res) => {
    try {
      const { jobId } = req.params;

      // Validate jobId format
      if (!jobId || !jobId.startsWith('job_')) {
        return res.status(400).json({
          error: 'Invalid job ID',
          message: 'Job ID must be provided and start with "job_"'
        });
      }

      // Start processing (async - don't wait for completion)
      processingAPI.processJob(jobId)
        .then((result) => {
          console.log(`Job ${jobId} completed successfully`);
        })
        .catch((error) => {
          console.error(`Job ${jobId} failed:`, error);
        });

      // Return immediate response
      res.status(202).json({
        success: true,
        jobId: jobId,
        message: 'Processing started',
        status: 'processing',
        note: 'Use /api/status/:jobId to check progress'
      });

    } catch (error) {
      console.error('Process error:', error);
      res.status(500).json({
        error: 'Processing failed to start',
        message: error.message
      });
    }
  });
};