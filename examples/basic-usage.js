#!/usr/bin/env node

/**
 * Basic Usage Example
 *
 * This example demonstrates the basic usage of the Amazon Invoice Parser
 * to parse a single invoice PDF file.
 */

const AmazonInvoiceParser = require('../index');
const path = require('path');

async function basicExample() {
  console.log('🧾 Amazon Invoice Parser - Basic Usage Example\n');

  // Initialize the parser
  const parser = new AmazonInvoiceParser();

  // Example invoice file (you would replace this with your actual file)
  const invoicePath = path.join(__dirname, '../test_data/sample-invoice.pdf');

  try {
    console.log(`📄 Processing invoice: ${invoicePath}`);

    // Parse the invoice
    const invoice = await parser.parseInvoice(invoicePath);

    if (invoice) {
      console.log('✅ Invoice parsed successfully!\n');

      // Display extracted information
      console.log('📋 Extracted Data:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Order Number: ${invoice.orderNumber || 'Not found'}`);
      console.log(`Order Date: ${invoice.orderDate || 'Not found'}`);
      console.log(`Vendor: ${invoice.vendor || 'Not found'}`);
      console.log(`Subtotal: ${invoice.subtotal || 'Not found'}`);
      console.log(`Shipping: ${invoice.shipping || 'Not found'}`);
      console.log(`Tax: ${invoice.tax || 'Not found'}`);
      console.log(`Total: ${invoice.total || 'Not found'}`);

      if (invoice.items && invoice.items.length > 0) {
        console.log('\n🛒 Items:');
        invoice.items.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.description || 'No description'} - ${item.price || 'No price'}`);
        });
      }

      // Display validation results
      if (invoice.validation) {
        console.log('\n🔍 Validation Results:');
        console.log(`Score: ${invoice.validation.score}/100`);
        console.log(`Status: ${invoice.validation.isValid ? '✅ Valid' : '❌ Invalid'}`);

        if (invoice.validation.warnings && invoice.validation.warnings.length > 0) {
          console.log('Warnings:');
          invoice.validation.warnings.forEach(warning => {
            console.log(`  - ${warning.message}`);
          });
        }

        if (invoice.validation.errors && invoice.validation.errors.length > 0) {
          console.log('Errors:');
          invoice.validation.errors.forEach(error => {
            console.log(`  - ${error.message}`);
          });
        }
      }

      // Display PDF metadata
      if (invoice.pdfMetadata) {
        console.log('\n📊 PDF Metadata:');
        console.log(`File Size: ${invoice.pdfMetadata.fileSize} bytes`);
        console.log(`Pages: ${invoice.pdfMetadata.pages}`);
        console.log(`Text Length: ${invoice.pdfMetadata.textLength} characters`);
        console.log(`Extracted At: ${invoice.pdfMetadata.extractedAt}`);
      }

    } else {
      console.log('❌ Failed to parse invoice');
    }

  } catch (error) {
    console.error('💥 Error processing invoice:', error.message);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  basicExample().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = basicExample;