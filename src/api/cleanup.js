// API endpoint for job cleanup
const ProcessingAPI = require('./processing');

// Initialize processing API
const processingAPI = new ProcessingAPI();

module.exports = (app) => {
  // DELETE /api/cleanup/:jobId - Clean up job resources
  app.delete('/api/cleanup/:jobId', async (req, res) => {
    try {
      const { jobId } = req.params;

      // Validate jobId format
      if (!jobId || !jobId.startsWith('job_')) {
        return res.status(400).json({
          error: 'Invalid job ID',
          message: 'Job ID must be provided and start with "job_"'
        });
      }

      // Clean up job
      const result = await processingAPI.cleanupJob(jobId);

      res.status(200).json({
        success: true,
        jobId: jobId,
        ...result
      });

    } catch (error) {
      console.error('Cleanup error:', error);

      if (error.message === 'Job not found') {
        return res.status(404).json({
          error: 'Job not found',
          message: 'The specified job ID does not exist or was already cleaned up'
        });
      }

      res.status(500).json({
        error: 'Cleanup failed',
        message: error.message
      });
    }
  });
};