const joi = require('joi');

// Define JSON schema for invoice validation
const invoiceSchema = joi.object({
  orderNumber: joi.string().pattern(/^\d{3}-\d{7}-\d{7}$|^[A-Z0-9]{3}-\d{7}-\d{7}$/).allow(null),
  orderDate: joi.string().allow(null),
  items: joi.array().items(joi.object({
    description: joi.string().required(),
    quantity: joi.number().integer().min(1).optional(),
    unitPrice: joi.number().min(0).optional(),
    totalPrice: joi.number().min(0).optional(),
    currency: joi.string().optional(),
    asin: joi.string().optional()
  })).default([]),
  subtotal: joi.string().allow(null),
  shipping: joi.string().allow(null),
  tax: joi.string().allow(null),
  total: joi.string().allow(null),
  vendor: joi.string().default('Amazon'),
  pdfMetadata: joi.object({
    fileSize: joi.number().integer().min(0),
    extractedAt: joi.string().isoDate(),
    extractionMethod: joi.string(),
    pages: joi.number().integer().min(1),
    textLength: joi.number().integer().min(0)
  }).optional(),
  validation: joi.object({
    score: joi.number().min(0).max(100),
    isValid: joi.boolean(),
    warnings: joi.array().items(joi.object({
      type: joi.string().required(),
      severity: joi.string().valid('low', 'medium', 'high').required(),
      message: joi.string().required(),
      fields: joi.array().items(joi.string())
    })),
    errors: joi.array().items(joi.object({
      type: joi.string().required(),
      severity: joi.string().valid('low', 'medium', 'high').required(),
      message: joi.string().required(),
      fields: joi.array().items(joi.string())
    })),
    summary: joi.string()
  }).optional(),
  errorRecovery: joi.object({
    originalError: joi.object({
      level: joi.string().valid('critical', 'recoverable', 'info').required(),
      type: joi.string().required(),
      message: joi.string().required(),
      context: joi.string().required(),
      recoverable: joi.boolean().required(),
      suggestion: joi.string().required()
    }).required(),
    recoverySuggestions: joi.array().items(joi.object({
      action: joi.string().required(),
      description: joi.string().required(),
      priority: joi.string().valid('low', 'medium', 'high').required()
    })).required(),
    recoveryTimestamp: joi.string().isoDate().required()
  }).optional(),
  extractionMetadata: joi.object({
    mode: joi.string().valid('full', 'partial_recovery').required(),
    originalError: joi.string().optional(),
    confidence: joi.object().pattern(joi.string(), joi.number().min(0).max(1)).required(),
    errors: joi.array().items(joi.object({
      field: joi.string().required(),
      type: joi.string().required(),
      message: joi.string().required()
    })).required(),
    recoveryAttempted: joi.string().isoDate().required(),
    usable: joi.boolean().required()
  }).optional(),
  languageDetection: joi.object({
    language: joi.string().required(),
    confidence: joi.number().min(0).max(1).required(),
    evidence: joi.string().required(),
    supported: joi.boolean().required()
  }).optional(),
  processingMetadata: joi.object({
    pipeline: joi.string().required(),
    preprocessing: joi.string().required(),
    languageDetection: joi.string().required(),
    parser: joi.string().required(),
    timestamp: joi.string().isoDate().required()
  }).optional()
});

// Define JSON schema for report validation
const reportSchema = joi.object({
  summary: joi.object({
    totalInvoices: joi.number().integer().min(0),
    totalSpent: joi.number().min(0),
    dateRange: joi.object({
      start: joi.string().isoDate().allow(null),
      end: joi.string().isoDate().allow(null)
    }),
    topVendors: joi.array().items(joi.string())
  }),
  invoices: joi.array().items(invoiceSchema)
});

module.exports = {
  invoiceSchema,
  reportSchema
};