import { ComparisonReport, ComparisonResult, ComparisonValue, ComparisonIssue } from '@/stores/comparison-store';
import { InvoiceData } from '@/types';
import { apiClient } from '@/lib/api-client';

export interface ComparisonOptions {
  selectedFields: string[];
  confidenceThreshold: number;
  includeValidationIssues: boolean;
}

export interface ComparisonApiResponse {
  success: boolean;
  data?: ComparisonReport;
  error?: string;
}

/**
 * Perform comparison of multiple invoice processing jobs
 */
export async function performComparison(
  jobIds: string[],
  options: ComparisonOptions
): Promise<ComparisonApiResponse> {
  try {
    if (jobIds.length < 2) {
      return {
        success: false,
        error: 'At least 2 job IDs are required for comparison',
      };
    }

    // Fetch results for all job IDs
    const jobResults: Array<{ jobId: string; results: InvoiceData[] }> = [];

    for (const jobId of jobIds) {
      try {
        const response = await apiClient.get<InvoiceData[]>(`/api/results/${jobId}`);
        if (response.success && response.data) {
          jobResults.push({ jobId, results: response.data });
        } else {
          console.warn(`Failed to fetch results for job ${jobId}:`, response.error);
          // Continue with other jobs even if one fails
        }
      } catch (error) {
        console.warn(`Error fetching results for job ${jobId}:`, error);
        // Continue with other jobs even if one fails
      }
    }

    if (jobResults.length < 2) {
      return {
        success: false,
        error: 'Need results from at least 2 jobs to perform comparison',
      };
    }

    // Perform the comparison
    const comparisonResults = compareInvoiceJobs(jobResults, options);
    const summary = generateComparisonSummary(comparisonResults);

    const report: ComparisonReport = {
      jobIds,
      results: comparisonResults,
      summary,
      generatedAt: new Date(),
    };

    return {
      success: true,
      data: report,
    };
  } catch (error) {
    console.error('Comparison failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown comparison error',
    };
  }
}

/**
 * Compare invoice data from multiple jobs
 */
function compareInvoiceJobs(
  jobResults: Array<{ jobId: string; results: InvoiceData[] }>,
  options: ComparisonOptions
): ComparisonResult[] {
  const results: ComparisonResult[] = [];
  const fields = options.selectedFields.length > 0
    ? options.selectedFields
    : ['orderNumber', 'orderDate', 'customerInfo.name', 'customerInfo.address', 'totals.total'];

  for (const field of fields) {
    const fieldValues: ComparisonValue[] = [];
    const issues: ComparisonIssue[] = [];

    // Collect values for this field from all jobs
    for (const { jobId, results: invoiceResults } of jobResults) {
      // For simplicity, compare the first invoice from each job
      // In a real implementation, you might want to match invoices by order number or other criteria
      const invoice = invoiceResults[0];
      if (invoice) {
        const value = getFieldValue(invoice, field);
        const confidence = calculateConfidence(value, field);

        fieldValues.push({
          invoiceId: jobId,
          value,
          confidence,
          source: 'extracted',
        });
      }
    }

    // Check for differences
    const hasDifferences = checkForDifferences(fieldValues, options.confidenceThreshold);
    const averageConfidence = fieldValues.reduce((sum, v) => sum + v.confidence, 0) / fieldValues.length;

    // Generate issues
    if (hasDifferences) {
      issues.push({
        type: 'difference',
        severity: averageConfidence < 0.5 ? 'high' : 'medium',
        message: `Values differ across invoices for field: ${field}`,
        affectedInvoices: fieldValues.map(v => v.invoiceId),
      });
    }

    if (fieldValues.length !== jobResults.length) {
      issues.push({
        type: 'missing',
        severity: 'medium',
        message: `Missing data for field: ${field} in some invoices`,
        affectedInvoices: jobResults
          .filter(job => !fieldValues.some(v => v.invoiceId === job.jobId))
          .map(job => job.jobId),
      });
    }

    results.push({
      field,
      values: fieldValues,
      hasDifferences,
      confidence: averageConfidence,
      issues,
    });
  }

  return results;
}

/**
 * Get a field value from invoice data using dot notation
 */
function getFieldValue(invoice: InvoiceData, field: string): any {
  const parts = field.split('.');
  let value: any = invoice;

  for (const part of parts) {
    value = value?.[part];
  }

  return value;
}

/**
 * Calculate confidence score for a field value
 */
function calculateConfidence(value: any, field: string): number {
  // Simple confidence calculation - in a real implementation this would be more sophisticated
  if (value === null || value === undefined || value === '') {
    return 0.0;
  }

  // Some fields have higher confidence if they exist
  if (field.includes('total') || field.includes('orderNumber')) {
    return 0.9;
  }

  return 0.7; // Default confidence
}

/**
 * Check if values differ significantly
 */
function checkForDifferences(values: ComparisonValue[], threshold: number): boolean {
  const validValues = values.filter(v => v.confidence >= threshold);
  if (validValues.length < 2) return false;

  const firstValue = validValues[0].value;
  return validValues.some(v => !valuesEqual(v.value, firstValue));
}

/**
 * Check if two values are equal (with type coercion)
 */
function valuesEqual(a: any, b: any): boolean {
  if (a === b) return true;

  // Handle numeric comparison
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 0.01; // Small tolerance for floating point
  }

  // Handle string comparison (case insensitive)
  if (typeof a === 'string' && typeof b === 'string') {
    return a.toLowerCase() === b.toLowerCase();
  }

  return false;
}

/**
 * Generate summary statistics for the comparison
 */
function generateComparisonSummary(results: ComparisonResult[]) {
  const totalFields = results.length;
  const fieldsWithDifferences = results.filter(r => r.hasDifferences).length;
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / totalFields;

  return {
    totalFields,
    fieldsWithDifferences,
    totalIssues,
    averageConfidence,
  };
}