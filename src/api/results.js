// API endpoint for retrieving job results
const ProcessingAPI = require('./processing');

// Initialize processing API
const processingAPI = new ProcessingAPI();

module.exports = (app) => {
  // GET /api/results - Get list of recent jobs
  app.get('/api/results', async (req, res) => {
    try {
      // Get all jobs from the processing API
      const allJobs = processingAPI.getAllJobs();

      // Transform jobs to the required format
      const jobs = allJobs.map(job => {
        const successfulResults = job.results.filter(r => r.success);
        const totalFiles = job.files.length;
        const successCount = successfulResults.length;

        // Create a preview string from the first few successful results
        let preview = '';
        if (successfulResults.length > 0) {
          const firstResult = successfulResults[0];
          if (firstResult.data && firstResult.data.orderNumber) {
            preview = `Order ${firstResult.data.orderNumber}`;
          } else {
            preview = `${successfulResults.length} successful result${successfulResults.length !== 1 ? 's' : ''}`;
          }
        }

        return {
          jobId: job.id,
          status: job.status,
          createdAt: job.created.toISOString(),
          fileCount: totalFiles,
          successCount: successCount,
          preview: preview
        };
      });

      // Sort by creation date (newest first)
      jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.status(200).json({
        jobs: jobs
      });

    } catch (error) {
      console.error('Failed to fetch job list:', error);
      res.status(500).json({
        error: 'Failed to fetch jobs',
        message: error.message
      });
    }
  });

  // GET /api/results/:jobId - Get job processing results
  app.get('/api/results/:jobId', async (req, res) => {
    try {
      const { jobId } = req.params;

      // Validate jobId format
      if (!jobId || !jobId.startsWith('job_')) {
        return res.status(400).json({
          error: 'Invalid job ID',
          message: 'Job ID must be provided and start with "job_"'
        });
      }

      // Get job status and results
      const jobStatus = processingAPI.getJobStatus(jobId);

      // Build summary from job status
      const summary = {
        totalFiles: jobStatus.progress.total,
        processedFiles: jobStatus.progress.successful,
        failedFiles: jobStatus.progress.failed,
        successRate: jobStatus.progress.total > 0
          ? Math.round((jobStatus.progress.successful / jobStatus.progress.total) * 100)
          : 0
      };

      // Extract errors from job results
      const errors = jobStatus.results
        .filter(result => !result.success)
        .map(result => ({
          filename: result.filename,
          error: result.error || 'Processing failed',
          details: result.error ? { message: result.error } : undefined
        }));

      // Transform successful results to match frontend InvoiceData interface
      const transformedResults = jobStatus.results
        .filter(result => result.success)
        .map(result => {
          const data = result.data;
          if (!data) {
            return {
              filename: result.filename,
              orderNumber: null,
              orderDate: null,
              customerInfo: null,
              items: [],
              totals: {
                subtotal: null,
                shipping: null,
                tax: null,
                total: null
              },
              currency: null,
              validationStatus: 'warning',
              validationErrors: ['No data extracted from invoice']
            };
          }
          return {
            filename: result.filename,
            orderNumber: data.orderNumber,
            orderDate: data.orderDate,
            customerInfo: data.customerInfo,
            items: data.items || [],
            totals: {
              subtotal: data.subtotal,
              shipping: data.shipping,
              tax: data.tax,
              total: data.total
            },
            currency: data.currency,
            validationStatus: data.validation?.isValid ? 'valid' : 'warning',
            validationErrors: data.validation?.warnings?.map(w => w.message) || []
          };
        });

      res.status(200).json({
        success: true,
        jobId: jobId,
        status: jobStatus.status,
        summary: summary,
        results: transformedResults,
        errors: errors
      });

    } catch (error) {
      console.error('Results retrieval error:', error);

      if (error.message === 'Job not found') {
        return res.status(404).json({
          error: 'Job not found',
          message: 'The specified job ID does not exist'
        });
      }

      if (error.message === 'Job is not completed yet') {
        return res.status(409).json({
          error: 'Job not completed',
          message: 'The job is still processing. Use /api/status/:jobId to check progress.'
        });
      }

      res.status(500).json({
        error: 'Results retrieval failed',
        message: error.message
      });
    }
  });
};