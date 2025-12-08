// ===== ERROR RECOVERY SYSTEM =====

class ErrorRecovery {
  constructor(extraction) {
    this.extraction = extraction;
  }

  /**
   * Error categorization levels
   */
  static ERROR_LEVELS = {
    CRITICAL: 'critical',     // System cannot continue, data integrity compromised
    RECOVERABLE: 'recoverable', // Can attempt recovery, partial data possible
    INFO: 'info'             // Informational, no impact on processing
  };

  /**
   * Categorize an error based on type and context
   * @param {Error} error - The error that occurred
   * @param {string} context - Context where error occurred (e.g., 'pdf-parsing', 'field-extraction')
   * @returns {Object} Categorized error with level, message, and recovery info
   */
  categorizeError(error, context) {
    const errorMessage = error.message.toLowerCase();

    // Critical errors - cannot recover
    if (errorMessage.includes('file not found') ||
        errorMessage.includes('permission denied') ||
        errorMessage.includes('invalid file type')) {
      return {
        level: ErrorRecovery.ERROR_LEVELS.CRITICAL,
        type: 'file_access_error',
        message: error.message,
        context: context,
        recoverable: false,
        suggestion: 'Check file path and permissions'
      };
    }

    // PDF parsing failures
    if (errorMessage.includes('pdf parsing failed') ||
        errorMessage.includes('invalid pdf') ||
        context === 'pdf-parsing') {
      return {
        level: ErrorRecovery.ERROR_LEVELS.RECOVERABLE,
        type: 'pdf_parsing_error',
        message: error.message,
        context: context,
        recoverable: true,
        suggestion: 'Try re-saving PDF or check file corruption'
      };
    }

    // Field extraction failures - recoverable
    if (context.includes('field-extraction') ||
        errorMessage.includes('extraction failed')) {
      return {
        level: ErrorRecovery.ERROR_LEVELS.RECOVERABLE,
        type: 'field_extraction_error',
        message: error.message,
        context: context,
        recoverable: true,
        suggestion: 'Partial data extraction attempted - check results'
      };
    }

    // Validation errors
    if (errorMessage.includes('validation') ||
        context.includes('validation')) {
      return {
        level: ErrorRecovery.ERROR_LEVELS.INFO,
        type: 'validation_warning',
        message: error.message,
        context: context,
        recoverable: true,
        suggestion: 'Data validated with warnings - review validation results'
      };
    }

    // Default recoverable error
    return {
      level: ErrorRecovery.ERROR_LEVELS.RECOVERABLE,
      type: 'unknown_error',
      message: error.message,
      context: context,
      recoverable: true,
      suggestion: 'Unexpected error occurred - partial recovery attempted'
    };
  }

  /**
   * Attempt partial data extraction when full extraction fails
   * @param {string} text - PDF text content
   * @param {Error} originalError - The error that caused full extraction to fail
   * @returns {Object} Partial invoice data with confidence scores and error info
   */
  extractPartialInvoiceData(text, originalError) {
    const partialData = {
      vendor: 'Amazon',
      extractionMetadata: {
        mode: 'partial_recovery',
        originalError: originalError.message,
        confidence: {},
        errors: [],
        recoveryAttempted: new Date().toISOString()
      }
    };

    const fields = [
      { name: 'orderNumber', extractor: 'extractOrderNumber', critical: true },
      { name: 'orderDate', extractor: 'extractOrderDate', critical: true },
      { name: 'items', extractor: 'extractItems', critical: false },
      { name: 'subtotal', extractor: 'extractSubtotal', critical: false },
      { name: 'shipping', extractor: 'extractShipping', critical: false },
      { name: 'tax', extractor: 'extractTax', critical: false },
      { name: 'total', extractor: 'extractTotal', critical: false }
    ];

    let successfulExtractions = 0;
    let totalFields = fields.length;

    // Extract each field individually, tracking success/failure
    for (const field of fields) {
      try {
        const value = this.extraction[field.extractor](text);

        if (value !== null && value !== undefined &&
            (Array.isArray(value) ? value.length > 0 : true)) {
          partialData[field.name] = value;
          partialData.extractionMetadata.confidence[field.name] = 1.0; // High confidence
          successfulExtractions++;
        } else {
          // Field not found - mark as low confidence, but still include empty value
          partialData[field.name] = Array.isArray(value) ? [] : null;
          partialData.extractionMetadata.confidence[field.name] = 0.0;
          if (field.critical) {
            partialData.extractionMetadata.errors.push({
              field: field.name,
              type: 'field_not_found',
              message: `${field.name} could not be extracted`
            });
          }
        }
      } catch (fieldError) {
        partialData[field.name] = field.name === 'items' ? [] : null;
        partialData.extractionMetadata.confidence[field.name] = 0.0;
        partialData.extractionMetadata.errors.push({
          field: field.name,
          type: 'extraction_error',
          message: fieldError.message
        });

        if (field.critical) {
          partialData.extractionMetadata.errors.push({
            field: field.name,
            type: 'critical_field_error',
            message: `Critical field ${field.name} failed: ${fieldError.message}`
          });
        }
      }
    }

    // Calculate overall confidence score
    const overallConfidence = successfulExtractions / totalFields;
    partialData.extractionMetadata.confidence.overall = overallConfidence;

    // Determine if partial data is worth returning
    const criticalFieldsFound = ['orderNumber', 'orderDate'].every(field =>
      partialData.extractionMetadata.confidence[field] > 0
    );

    partialData.extractionMetadata.usable = criticalFieldsFound && overallConfidence > 0.3;

    return partialData;
  }

  /**
   * Generate recovery suggestions based on error type and partial data
   * @param {Object} categorizedError - Error categorization result
   * @param {Object} partialData - Partial extraction results
   * @returns {Array} Array of actionable recovery suggestions
   */
  generateRecoverySuggestions(categorizedError, partialData) {
    const suggestions = [];

    switch (categorizedError.type) {
      case 'pdf_parsing_error':
        suggestions.push({
          action: 'resave_pdf',
          description: 'Re-save the PDF using "Save As" in your PDF viewer',
          priority: 'high'
        });
        suggestions.push({
          action: 'check_corruption',
          description: 'Verify PDF is not corrupted by opening in a PDF viewer',
          priority: 'high'
        });
        if (partialData.extractionMetadata.usable) {
          suggestions.push({
            action: 'use_partial_data',
            description: 'Partial data extracted successfully - review and supplement manually',
            priority: 'medium'
          });
        }
        break;

      case 'field_extraction_error':
        if (partialData.extractionMetadata.usable) {
          suggestions.push({
            action: 'manual_review',
            description: 'Review partial data and manually add missing fields',
            priority: 'medium'
          });
        }
        suggestions.push({
          action: 'check_format',
          description: 'Verify invoice format matches supported Amazon templates',
          priority: 'low'
        });
        break;

      case 'file_access_error':
        suggestions.push({
          action: 'check_permissions',
          description: 'Ensure read permissions on file and directory',
          priority: 'high'
        });
        suggestions.push({
          action: 'verify_path',
          description: 'Double-check file path and filename',
          priority: 'high'
        });
        break;

      default:
        if (partialData.extractionMetadata.usable) {
          suggestions.push({
            action: 'use_extracted_data',
            description: 'Partial data available for use',
            priority: 'medium'
          });
        }
        suggestions.push({
          action: 'contact_support',
          description: 'Report issue for investigation',
          priority: 'low'
        });
    }

    // Add confidence-based suggestions
    const confidence = partialData.extractionMetadata.confidence.overall;
    if (confidence > 0.7) {
      suggestions.unshift({
        action: 'high_confidence_data',
        description: 'High confidence data extracted - safe to use',
        priority: 'high'
      });
    } else if (confidence > 0.3) {
      suggestions.unshift({
        action: 'medium_confidence_data',
        description: 'Medium confidence data - manual verification recommended',
        priority: 'medium'
      });
    }

    return suggestions;
  }
}

module.exports = ErrorRecovery;