/**
 * Export configuration constants and settings
 */

module.exports = {
  // Valid export formats and templates
  VALID_FORMATS: ['json', 'csv', 'pdf'],
  VALID_TEMPLATES: ['summary', 'detailed', 'financial'],
  VALID_BATCH_FORMATS: ['json', 'csv'], // Formats supported for batch totals

  // Export limits
  LIMITS: {
    MAX_RECORDS: 5000,      // Maximum total records for any export
    PDF_MAX_INVOICES: 500,  // Maximum invoices for PDF export
    CSV_MAX_RECORDS: 5000,  // Maximum records for CSV export
    WARNING_THRESHOLD: 4000, // Show warning when approaching limits
    MAX_JOBS_BATCH: 100,     // Maximum jobs to aggregate for batch totals
    MAX_INVOICES_BATCH: 10000 // Maximum total invoices across all jobs for batch totals
  },

  // PDF Layout Constants
  PDF: {
    PAGE_SIZE: [595, 842], // A4 dimensions in points
    MARGINS: {
      TOP: 50,
      BOTTOM: 50,
      LEFT: 50,
      RIGHT: 50
    },
    CONTENT_WIDTH: 495, // PAGE_SIZE[0] - 2 * MARGINS.LEFT
    PAGE_HEIGHT: 842,

    // Color scheme
    COLORS: {
      PRIMARY: [0.2, 0.4, 0.8],      // Blue
      SECONDARY: [0.8, 0.4, 0.2],    // Orange
      SUCCESS: [0.2, 0.8, 0.4],      // Green
      WARNING: [0.8, 0.8, 0.2],      // Yellow
      DANGER: [0.8, 0.2, 0.2],       // Red
      TEXT: [0.2, 0.2, 0.2],         // Dark gray
      TEXT_LIGHT: [0.6, 0.6, 0.6],    // Light gray
      BACKGROUND: [0.95, 0.95, 0.95] // Light gray background
    },

    // Spacing and sizing
    SPACING: {
      HEADER_HEIGHT: 60,
      FOOTER_HEIGHT: 50,
      ROW_HEIGHT: 20,
      SECTION_SPACING: 30,
      METRIC_BOX_HEIGHT: 30,
      METRIC_BOX_WIDTH: 242.5, // (CONTENT_WIDTH - 10) / 2
      BAR_CHART_HEIGHT: 120,
      BAR_CHART_WIDTH: 495, // CONTENT_WIDTH
      TABLE_ROW_SPACING: 20
    },

    // Font sizes
    FONT_SIZES: {
      HEADER: 16,
      SECTION_TITLE: 14,
      METRIC_LABEL: 9,
      METRIC_VALUE: 12,
      TABLE_HEADER: 9,
      TABLE_CELL: 8,
      FOOTER: 7,
      TIMESTAMP: 8,
      PAGE_NUMBER: 8
    },

    // Table column widths for different views
    TABLE_COLUMN_WIDTHS: {
      INVOICE_DETAILS: [80, 70, 120, 50, 70, 60], // Order #, Date, Customer, Items, Total, Status
      ERRORS: [200, 295] // File, Error (CONTENT_WIDTH - 200)
    }
  },

  // CSV Configuration
  CSV: {
    HEADERS: [
      'Filename',
      'Order Number',
      'Order Date',
      'Customer Name',
      'Customer Email',
      'Item Description',
      'Item Quantity',
      'Item Unit Price',
      'Item Total',
      'Subtotal',
      'Shipping',
      'Tax',
      'Total',
      'Currency',
      'Validation Status',
      'Validation Errors',
      'Processed At'
    ],

    // CSV generation settings
    DELIMITER: ',',
    QUOTE: '"',
    ESCAPE: '"',
    NEWLINE: '\n'
  },

  // Batch Totals Configuration
  BATCH_TOTALS: {
    // CSV headers for batch totals export
    CSV_HEADERS: [
      'Job ID',
      'Job Created Date',
      'Job Completed Date',
      'Total Invoices',
      'Successful Invoices',
      'Failed Invoices',
      'Total Amount',
      'Total Subtotal',
      'Total Shipping',
      'Total Tax',
      'Total Discount',
      'Currency',
      'Success Rate (%)'
    ],

    // Summary calculation settings
    CURRENCY_PRECISION: 2, // Decimal places for currency calculations
    PERCENTAGE_PRECISION: 1, // Decimal places for percentage calculations

    // Aggregation settings
    AGGREGATE_BY_CURRENCY: true, // Whether to aggregate by currency
    INCLUDE_JOB_METADATA: true, // Whether to include job creation/completion dates
    INCLUDE_INVOICE_BREAKDOWN: true // Whether to include per-invoice breakdown in JSON
  },

  // Filename generation
  FILENAME: {
    PREFIX: 'invoice-results',
    TIMESTAMP_FORMAT: 'yyyy-MM-dd-HH-mm-ss',
    SANITIZE_PATTERN: /[^a-zA-Z0-9_-]/g,
    SANITIZE_REPLACEMENT: ''
  },

  // Error handling
  ERRORS: {
    CODES: {
      EXPORT_ERROR: 'EXPORT_ERROR',
      INVALID_FORMAT: 'INVALID_FORMAT',
      INVALID_TEMPLATE: 'INVALID_TEMPLATE',
      JOB_NOT_FOUND: 'JOB_NOT_FOUND',
      JOB_NOT_COMPLETED: 'JOB_NOT_COMPLETED',
      LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
      VALIDATION_ERROR: 'VALIDATION_ERROR'
    },

    MESSAGES: {
      EXPORT_FAILED: 'An error occurred while generating the export. Please try again or contact support.',
      INVALID_JOB_ID: 'Job ID must be provided and start with "job_"',
      INVALID_FORMAT: 'Format must be one of: json, csv, pdf',
      INVALID_TEMPLATE: 'PDF template must be one of: summary, detailed, financial',
      JOB_NOT_FOUND: 'The specified job ID does not exist',
      JOB_NOT_COMPLETED: 'The job is still processing. Export is only available for completed jobs.',
      LIMIT_EXCEEDED: 'Export limit exceeded. Reduce the number of records or use pagination.',
      NO_RESULTS: 'No processing results available for this job'
    }
  },

  // Performance settings
  PERFORMANCE: {
    STREAMING_THRESHOLD: 1000, // Use streaming for datasets larger than this
    MEMORY_WARNING_MB: 500,    // Warn if memory usage exceeds this
    TIMEOUT_MS: {
      CSV: 30000,  // 30 seconds for CSV generation
      PDF: 60000,  // 60 seconds for PDF generation
      JSON: 5000   // 5 seconds for JSON export
    }
  }
};