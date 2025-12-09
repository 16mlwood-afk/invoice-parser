const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// Import the required modules
const LightPreprocessor = require('../src/preprocessors/light-preprocessor');
const FormatSpecific = require('../src/preprocessors/format-specific-preprocessor');
const FormatClassifier = require('../src/format-classifier');
const ParserFactory = require('../src/parser-factory');

async function debugItemExtraction(pdfFile) {
  console.log('=== ITEM EXTRACTION DEBUG ===\n');

  try {
    // Load and parse PDF - use provided file or default
    const pdfPath = pdfFile ?
      path.join(__dirname, '../', pdfFile) :
      path.join(__dirname, '../tests/fixtures/pdfs/order-document-sample.pdf');
    console.log(`Loading PDF: ${pdfPath}`);

    const data = await pdf(fs.readFileSync(pdfPath));
    console.log(`Raw PDF text length: ${data.text.length} characters\n`);

    // Show first 500 chars of raw text
    console.log('=== RAW PDF TEXT (first 500 chars) ===');
    console.log(data.text.substring(0, 500));
    console.log('=======================================\n');

    // Classify format and preprocess the text
    console.log('Classifying format...');
    const formatClassification = FormatClassifier.classify(data.text);
    console.log(`Format: ${formatClassification.format} ` +
      `(${formatClassification.confidence}% confidence)`);

    console.log('Preprocessing text...');
    const lightProcessed = LightPreprocessor.preprocess(data.text);
    const finalProcessed = FormatSpecific.preprocess(lightProcessed, formatClassification.format);

    console.log(`Preprocessed text length: ${finalProcessed.length} characters\n`);

    // Show first 500 chars of preprocessed text
    console.log('=== PREPROCESSED TEXT (first 500 chars) ===');
    console.log(finalProcessed.substring(0, 500));
    console.log('============================================\n');

    // Debug: Check for ASIN patterns in preprocessed text
    console.log('\n🔍 Checking for ASIN patterns in preprocessed text...');
    const asinMatches = finalProcessed.match(/ASIN:\s*[A-Z0-9]{10}/g);
    console.log(`Found ${asinMatches ? asinMatches.length : 0} ASIN patterns:`, asinMatches);

    // Show some text around ASIN patterns
    if (asinMatches) {
      console.log('\n=== TEXT AROUND ASIN PATTERNS ===');
      asinMatches.forEach((match, index) => {
        const indexInText = finalProcessed.indexOf(match);
        const start = Math.max(0, indexInText - 100);
        const end = Math.min(finalProcessed.length, indexInText + 200);
        const context = finalProcessed.substring(start, end);
        console.log(`ASIN ${index + 1} context:`, context);
      });
    }

    // Extract items using full parser
    console.log('\nExtracting items using full parser...');
    const result = await ParserFactory.parseInvoice(data.text, { debug: true });
    const items = result.items;

    console.log(`Found ${items.length} items:\n`);

    if (items.length === 0) {
      console.log('❌ NO ITEMS FOUND!');
      console.log('\nAnalyzing text for item patterns...');

      // Let's analyze the text to see what patterns exist
      const lines = finalProcessed.split('\n');
      console.log('Looking for item-related lines:');

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.includes('Prismacolor') ||
            trimmed.includes('Colored Pencils') ||
            trimmed.includes('$32.69') ||
            trimmed.includes('33 of:') ||
            trimmed.includes('25 of:') ||
            trimmed.includes('10 of:') ||
            trimmed.includes('2 of:') ||
            trimmed.match(/\d+\s*of:/) ||
            trimmed.match(/Items Ordered/)) {
          console.log(`Line ${index}: '${trimmed}'`);
        }
      });

    } else {
      console.log('✅ ITEMS FOUND:');
      items.forEach((item, index) => {
        console.log(`${index + 1}. Description: "${item.description}"`);

        // Show EU format fields if present
        if (item.asin) {
          console.log(`   ASIN: ${item.asin}`);
        }
        if (item.quantity) {
          console.log(`   Quantity: ${item.quantity}`);
        }
        if (item.unitPrice) {
          console.log(`   Unit Price: €${item.unitPrice}`);
        }
        if (item.totalPrice) {
          console.log(`   Total Price: €${item.totalPrice}`);
        }
        if (item.currency) {
          console.log(`   Currency: ${item.currency}`);
        }
        if (item.price) {
          console.log(`   Price (legacy): "${item.price}"`);
        }
        console.log('');
      });
    }

    // Let's also check what the text looks like around where items should be
    console.log('\n=== TEXT AROUND ITEM SECTIONS ===');
    const lines = finalProcessed.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.includes('Items Ordered')) {
        console.log(`\n[${i}] FOUND ITEMS SECTION START: "${line}"`);
        // Show next 10 lines
        for (let j = 1; j <= 10 && i + j < lines.length; j++) {
          console.log(`[${i+j}] "${lines[i+j].trim()}"`);
        }
        break;
      }
    }

  } catch (error) {
    console.error('Error during item extraction debug:', error);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let file = null;

  console.log('Command line args:', args);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--file=')) {
      file = arg.substring(7); // Remove '--file=' prefix
      console.log('Found file argument:', file);
      break;
    } else if (arg === '--file' && i + 1 < args.length) {
      file = args[i + 1];
      console.log('Found file argument:', file);
      break;
    }
  }

  return { file };
}

// Run the debug function
const args = parseArgs();
debugItemExtraction(args.file);
