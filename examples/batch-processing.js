#!/usr/bin/env node

/**
 * Batch Processing Example
 *
 * This example demonstrates how to process multiple invoice PDF files
 * and generate comprehensive reports.
 */

const AmazonInvoiceParser = require('../index');
const fs = require('fs');
const path = require('path');

async function batchProcessingExample() {
  console.log('📊 Amazon Invoice Parser - Batch Processing Example\n');

  const parser = new AmazonInvoiceParser();

  // Directory containing invoice PDFs (you would replace this with your actual directory)
  const invoicesDir = path.join(__dirname, '../test_data');

  try {
    // Check if directory exists
    if (!fs.existsSync(invoicesDir)) {
      console.log(`⚠️  Test data directory not found: ${invoicesDir}`);
      console.log('Using mock data for demonstration...\n');

      // Create mock invoice data for demonstration
      const mockInvoices = [
        {
          orderNumber: '123-4567890-1234567',
          orderDate: 'December 15, 2023',
          items: [
            { description: 'Kindle Paperwhite', price: '$129.99' },
            { description: 'Kindle Cover', price: '$29.99' }
          ],
          subtotal: '$159.98',
          shipping: '$0.00',
          tax: '$12.80',
          total: '$172.78',
          vendor: 'Amazon'
        },
        {
          orderNumber: '304-1234567-8901234',
          orderDate: '15 Dezember 2023',
          items: [
            { description: 'Test Item 1', price: '€49.99' },
            { description: 'Test Item 2', price: '€29.99' }
          ],
          subtotal: '€79.98',
          shipping: '€5.00',
          tax: '€12.80',
          total: '€97.78',
          vendor: 'Amazon'
        }
      ];

      console.log(`📁 Processing ${mockInvoices.length} mock invoices...`);

      // Process mock invoices (simulate parsing)
      const processedInvoices = mockInvoices.map(invoice => ({
        ...invoice,
        validation: parser.validateInvoiceData(invoice)
      }));

      await generateReports(processedInvoices);

    } else {
      // Get all PDF files from directory
      const files = fs.readdirSync(invoicesDir)
        .filter(file => file.endsWith('.pdf'))
        .map(file => path.join(invoicesDir, file));

      if (files.length === 0) {
        console.log(`📁 No PDF files found in ${invoicesDir}`);
        console.log('Using mock data for demonstration...\n');

        // Fallback to mock data
        const mockInvoices = [createMockInvoice()];
        await generateReports(mockInvoices);

      } else {
        console.log(`📁 Found ${files.length} PDF files in ${invoicesDir}`);
        console.log('Processing invoices...\n');

        // Process all PDF files
        const invoices = await parser.parseMultipleInvoices(files);

        // Filter out null results (failed parsing)
        const validInvoices = invoices.filter(invoice => invoice !== null);

        console.log(`✅ Successfully processed ${validInvoices.length} out of ${files.length} files\n`);

        if (validInvoices.length > 0) {
          await generateReports(validInvoices);
        } else {
          console.log('❌ No invoices could be processed successfully');
        }
      }
    }

  } catch (error) {
    console.error('💥 Error in batch processing:', error.message);
    process.exit(1);
  }
}

async function generateReports(invoices) {
  const parser = new AmazonInvoiceParser();

  console.log('📊 Generating Reports...\n');

  // Generate comprehensive report
  const report = parser.generateReport(invoices, {
    includeMonthly: true,
    includeCategories: true,
    includeTrends: true,
    currency: 'USD'
  });

  // Display summary
  console.log('📈 Summary Report:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total Invoices: ${report.summary.totalInvoices}`);
  console.log(`Total Spent: ${report.summary.totalSpent}`);
  console.log(`Date Range: ${report.summary.dateRange.start || 'N/A'} to ${report.summary.dateRange.end || 'N/A'}`);
  console.log(`Top Vendors: ${(report.summary.topVendors || []).join(', ') || 'N/A'}`);
  console.log();

  // Display monthly spending if available
  if (report.monthlySpending && report.monthlySpending.length > 0) {
    console.log('📅 Monthly Spending:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    report.monthlySpending.forEach(month => {
      console.log(`${month.month}: ${month.amount} (${month.invoiceCount} invoices)`);
    });
    console.log();
  }

  // Display category analysis if available
  if (report.categoryAnalysis && report.categoryAnalysis.length > 0) {
    console.log('📂 Category Analysis:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    report.categoryAnalysis.slice(0, 5).forEach(category => {
      console.log(`${category.category}: ${category.amount} (${category.percentage}%)`);
    });
    console.log();
  }

  // Display currency breakdown if available
  if (report.currencyBreakdown) {
    console.log('💰 Currency Breakdown:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Object.entries(report.currencyBreakdown).forEach(([currency, data]) => {
      console.log(`${currency}: ${data.total} (${data.percentage}%, ${data.count} invoices)`);
    });
    console.log();
  }

  // Save reports to files
  const outputDir = path.join(__dirname, '../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save JSON report
  const jsonPath = path.join(outputDir, 'batch-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`💾 JSON report saved to: ${jsonPath}`);

  // Save CSV report
  const csvPath = path.join(outputDir, 'batch-report.csv');
  const csvData = parser.reportToCSV(report);
  fs.writeFileSync(csvPath, csvData);
  console.log(`💾 CSV report saved to: ${csvPath}`);

  console.log('\n✅ Batch processing completed successfully!');
}

function createMockInvoice() {
  return {
    orderNumber: '123-4567890-1234567',
    orderDate: 'December 15, 2023',
    items: [
      { description: 'Sample Item 1', price: '$49.99' },
      { description: 'Sample Item 2', price: '$29.99' }
    ],
    subtotal: '$79.98',
    shipping: '$0.00',
    tax: '$6.40',
    total: '$86.38',
    vendor: 'Amazon'
  };
}

// Run the example
if (require.main === module) {
  batchProcessingExample().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = batchProcessingExample;