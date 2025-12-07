// Test script for processing real Amazon invoice PDFs
const AmazonInvoiceParser = require('./index');
const fs = require('fs');
const path = require('path');

async function testRealPDFs() {
  console.log('🧪 Testing Amazon Invoice Parser with Real PDFs\n');

  const parser = new AmazonInvoiceParser();
  const testDataDir = './all_regions_test_data';

  // Get all PDF files
  const pdfFiles = fs.readdirSync(testDataDir)
    .filter(file => file.endsWith('.pdf'))
    .map(file => path.join(testDataDir, file));

  console.log(`📁 Found ${pdfFiles.length} PDF files to process:\n`);

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < pdfFiles.length; i++) {
    const pdfPath = pdfFiles[i];
    const fileName = path.basename(pdfPath);

    console.log(`${i + 1}. Processing: ${fileName}`);

    try {
      const invoice = await parser.parseInvoice(pdfPath);

      if (invoice) {
        console.log('   ✅ Successfully parsed');
        console.log(`   📋 Order: ${invoice.orderNumber || 'Not found'}`);
        console.log(`   📅 Date: ${invoice.orderDate || 'Not found'}`);
        console.log(`   💰 Total: ${invoice.total || 'Not found'}`);
        console.log(`   🛒 Items: ${invoice.items ? invoice.items.length : 0}`);
        results.push(invoice);
        successCount++;
      } else {
        console.log('   ❌ Failed to parse invoice');
        errorCount++;
      }
    } catch (error) {
      console.log(`   ❌ Error processing ${fileName}:`, error.message);
      errorCount++;
    }

    console.log(''); // Empty line for readability
  }

  // Generate summary report
  console.log('📊 SUMMARY REPORT');
  console.log('================');
  console.log(`Total PDFs processed: ${pdfFiles.length}`);
  console.log(`Successfully parsed: ${successCount}`);
  console.log(`Failed to parse: ${errorCount}`);
  console.log(`Success rate: ${((successCount / pdfFiles.length) * 100).toFixed(1)}%`);

  if (results.length > 0) {
    console.log('\n💾 Generating consolidated report...');
    const report = parser.generateReport(results);

    // Save report to file
    const reportPath = './invoice-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}`);

    // Display summary
    console.log('\n📈 ANALYSIS:');
    console.log(`Total spending: ${report.summary.totalSpent || 'N/A'}`);
    console.log(`Invoices analyzed: ${report.summary.totalInvoices || 0}`);
    console.log(`Date range: ${report.summary.dateRange?.start || 'N/A'} to ${report.summary.dateRange?.end || 'N/A'}`);
  }

  console.log('\n✅ Real PDF testing complete!');
}

// Run the test
testRealPDFs().catch(console.error);
