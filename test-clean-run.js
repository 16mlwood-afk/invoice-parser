#!/usr/bin/env node

/**
 * Clean Test Run - Verify parser works after cleanup
 */

const AmazonInvoiceParser = require('./index');
const path = require('path');

async function testCleanRun() {
  console.log('🧪 Testing Amazon Invoice Parser - Clean Run\n');

  const parser = new AmazonInvoiceParser();
  const testFile = path.join(__dirname, 'all_regions_test_data', 'amazon-invoice-english.pdf');

  console.log(`📄 Testing with: ${testFile}`);

  try {
    const invoice = await parser.parseInvoice(testFile);

    if (invoice) {
      console.log('✅ Parser working correctly!');
      console.log(`📋 Order: ${invoice.orderNumber}`);
      console.log(`📅 Date: ${invoice.orderDate}`);
      console.log(`💰 Total: ${invoice.total}`);
      console.log(`🌍 Items: ${invoice.items?.length || 0}`);
    } else {
      console.log('❌ Parser failed');
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testCleanRun().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { testCleanRun };