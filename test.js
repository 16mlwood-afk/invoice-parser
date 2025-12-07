// Test script for Amazon Invoice Parser
const AmazonInvoiceParser = require('./index');
const fs = require('fs');

// Create sample invoice text (simulating what pdf-parse would extract)
const sampleAmazonInvoice = `
Amazon.com Order Confirmation
Order #123-4567890-1234567
Order Placed: December 15, 2023

Items Ordered:
1 x Echo Dot (5th Gen) $49.99
1 x Fire TV Stick Lite $39.99

Subtotal: $89.98
Shipping: $0.00
Tax: $7.19
Grand Total: $97.17

Shipping Address:
John Doe
123 Main St
Anytown, USA 12345

Payment Method: Visa ****1234
`;

// Test the parser with sample data
async function testParser() {
  console.log('🧪 Testing Amazon Invoice Parser\n');

  const parser = new AmazonInvoiceParser();

  // Test individual extraction methods
  console.log('📋 Testing Order Number Extraction:');
  const orderNumber = parser.extractOrderNumber(sampleAmazonInvoice);
  console.log('Order Number:', orderNumber || 'Not found');

  console.log('\n📅 Testing Date Extraction:');
  const orderDate = parser.extractOrderDate(sampleAmazonInvoice);
  console.log('Order Date:', orderDate || 'Not found');

  console.log('\n💰 Testing Amount Extraction:');
  const subtotal = parser.extractSubtotal(sampleAmazonInvoice);
  const tax = parser.extractTax(sampleAmazonInvoice);
  const total = parser.extractTotal(sampleAmazonInvoice);
  console.log('Subtotal:', subtotal || 'Not found');
  console.log('Tax:', tax || 'Not found');
  console.log('Total:', total || 'Not found');

  console.log('\n🛒 Testing Item Extraction:');
  const items = parser.extractItems(sampleAmazonInvoice);
  console.log('Items found:', items.length);
  items.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.description} - ${item.price}`);
  });

  // Test full extraction
  console.log('\n📄 Testing Full Invoice Extraction:');
  const invoice = parser.extractInvoiceData(sampleAmazonInvoice);
  console.log(JSON.stringify(invoice, null, 2));

  console.log('\n✅ Parser test complete!');
}

// Run the test
testParser().catch(console.error);
