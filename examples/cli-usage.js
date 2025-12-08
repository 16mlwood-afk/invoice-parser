#!/usr/bin/env node

/**
 * CLI Usage Example
 *
 * This example demonstrates how to use the Amazon Invoice Parser
 * from the command line programmatically, showing different options
 * and output formats.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function cliUsageExample() {
  console.log('💻 Amazon Invoice Parser - CLI Usage Examples\n');

  const examples = [
    {
      title: 'Basic CLI Usage',
      description: 'Parse a single invoice file',
      command: ['node', 'index.js', '--help'],
      showOutput: true
    },
    {
      title: 'JSON Output Example',
      description: 'Parse invoice and save as JSON',
      command: ['node', 'index.js', './test_data/sample.pdf', '--output', './output/cli-example.json', '--format', 'json'],
      createSampleFile: true
    },
    {
      title: 'Batch Processing Example',
      description: 'Process multiple files from directory',
      command: ['node', 'index.js', './test_data/', '--output-dir', './output/batch/', '--silent'],
      createSampleFiles: true
    },
    {
      title: 'CSV Export Example',
      description: 'Generate CSV report from processed invoices',
      command: ['node', 'index.js', './test_data/', '--format', 'csv', '--output', './output/report.csv'],
      dependsOn: 'batch'
    }
  ];

  for (const example of examples) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📝 ${example.title}`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`${example.description}\n`);

    try {
      if (example.createSampleFile) {
        await createSampleInvoiceFile();
      }

      if (example.createSampleFiles) {
        await createSampleInvoiceFiles();
      }

      if (example.dependsOn) {
        // Wait for dependent example to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const output = await runCommand(example.command);

      if (example.showOutput && output) {
        console.log('📄 Output:');
        console.log(output);
      } else {
        console.log('✅ Command executed successfully');
      }

      // Show created files
      if (example.command.includes('--output') || example.command.includes('--output-dir')) {
        showCreatedFiles(example);
      }

    } catch (error) {
      console.log(`⚠️  Example failed: ${error.message}`);
      console.log('This might be expected if sample files don\'t exist');
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('🎉 CLI Examples Completed!');
  console.log('Check the ./output/ directory for generated files');
}

async function runCommand(command) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command;
    const child = spawn(cmd, args, {
      cwd: path.join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout || 'Command completed successfully');
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function createSampleInvoiceFile() {
  const outputDir = path.join(__dirname, '../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create a sample PDF-like file for testing
  const sampleContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
72 720 Td
(Amazon.com Order Confirmation) Tj
0 -20 Td
(Order #123-4567890-1234567) Tj
0 -20 Td
(Order Placed: December 15, 2023) Tj
0 -40 Td
(Items Ordered:) Tj
0 -20 Td
(1 x Kindle Paperwhite $129.99) Tj
0 -20 Td
(1 x Kindle Cover $29.99) Tj
0 -40 Td
(Subtotal: $159.98) Tj
0 -20 Td
(Shipping: $0.00) Tj
0 -20 Td
(Tax: $12.80) Tj
0 -20 Td
(Grand Total: $172.78) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
0000000475 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
530
%%EOF`;

  const samplePath = path.join(__dirname, '../test_data/sample.pdf');
  const testDataDir = path.dirname(samplePath);

  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  fs.writeFileSync(samplePath, sampleContent);
  console.log(`📄 Created sample invoice: ${samplePath}`);
}

async function createSampleInvoiceFiles() {
  const testDataDir = path.join(__dirname, '../test_data');

  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  const sampleInvoices = [
    {
      filename: 'invoice1.pdf',
      orderNumber: '111-2223334-5556667',
      total: '$49.99'
    },
    {
      filename: 'invoice2.pdf',
      orderNumber: '222-3334445-6667778',
      total: '$79.99'
    },
    {
      filename: 'german-invoice.pdf',
      orderNumber: '304-1234567-8901234',
      total: '€29.99'
    }
  ];

  for (const invoice of sampleInvoices) {
    const content = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 150
>>
stream
BT
/F1 12 Tf
72 720 Td
(Amazon Order) Tj
0 -30 Td
(Order ${invoice.orderNumber}) Tj
0 -30 Td
(Total: ${invoice.total}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
0000000424 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
479
%%EOF`;

    const filePath = path.join(testDataDir, invoice.filename);
    fs.writeFileSync(filePath, content);
  }

  console.log(`📄 Created ${sampleInvoices.length} sample invoices in ${testDataDir}`);
}

function showCreatedFiles(example) {
  const outputDir = path.join(__dirname, '../output');

  if (!fs.existsSync(outputDir)) {
    return;
  }

  const files = fs.readdirSync(outputDir);
  if (files.length > 0) {
    console.log('📁 Generated files:');
    files.forEach(file => {
      const filePath = path.join(outputDir, file);
      const stats = fs.statSync(filePath);
      console.log(`  - ${file} (${stats.size} bytes)`);
    });
  }
}

// Run the example
if (require.main === module) {
  cliUsageExample().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = cliUsageExample;