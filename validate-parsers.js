#!/usr/bin/env node

const { ParserFactory } = require('./index');

async function testAllParsers() {
  console.log('🧪 Testing all parsers...');

  const parsers = ParserFactory.getAvailableParsers();
  console.log('📋 Available parsers:', Object.keys(parsers));

  // Test each parser with sample data
  const testTexts = {
    'EN': `Amazon.com Order Confirmation
Order #123-4567890-1234567
Order Placed: December 15, 2023
Items Ordered:
1 x Kindle Paperwhite $129.99
Subtotal: $129.99
Tax: $10.40
Total: $140.39`,

    'DE': `Amazon.de Bestellung
Bestellnr. 304-1234567-8901234
Bestelldatum: 15. Dezember 2023
Artikel:
1 x Kindle Paperwhite €129,99
Zwischensumme: €129,99
MwSt: €20,80
Gesamtbetrag: €150,79`,

    'FR': `Amazon.fr Commande
Numéro de commande: 405-6789012-3456789
Date de commande: 15 décembre 2023
Articles:
1 x Kindle Paperwhite 129,99 €
Sous-total: 129,99 €
TVA: 20,80 €
Total TTC: 150,79 €`,

    'IT': `Amazon.it Ordine
Numero d'ordine: 506-7890123-4567890
Data dell'ordine: 15 dicembre 2023
Articoli:
1 x Kindle Paperwhite 129,99 €
Subtotale: 129,99 €
IVA: 20,80 €
Totale: 150,79 €`,

    'JP': `Amazon.co.jp 注文確認
注文番号: 607-8901234-5678901
注文日: 2023年12月15日
商品:
1 x Kindle Paperwhite ¥15,980
小計: ¥15,980
消費税: ¥1,278
合計: ¥17,258`,

    'CA': `Amazon.ca Commande
Numéro de commande: 708-9012345-6789012
Commande passée le: 15 décembre 2023
Articles:
1 x Kindle Paperwhite 129,99 $
Sous-total: 129,99 $
TPS: 8,00 $
Total: 137,99 $`
  };

  const results = {
    total: Object.keys(testTexts).length,
    successful: 0,
    failed: 0,
    details: []
  };

  for (const [expectedLang, text] of Object.entries(testTexts)) {
    try {
      console.log(`\n🌍 Testing ${expectedLang} parser...`);
      const result = await ParserFactory.parseInvoice(text);

      if (result) {
        const detectedLang = result.languageDetection.language;
        const confidence = result.languageDetection.confidence;
        const processingTime = result.performanceMetrics.totalProcessingTime;
        const extractionSuccess = result.performanceMetrics.extractionSuccess.overall;

        console.log(`  ✅ Parser: ${result.processingMetadata.parser}`);
        console.log(`  🎯 Language detected: ${detectedLang} (${(confidence * 100).toFixed(1)}% confidence)`);
        console.log(`  ⚡ Processing time: ${processingTime}ms`);
        console.log(`  📊 Extraction success: ${(extractionSuccess * 100).toFixed(1)}%`);

        const success = detectedLang === expectedLang && confidence > 0.5 && extractionSuccess > 0.7;
        results.details.push({
          language: expectedLang,
          detected: detectedLang,
          confidence: confidence,
          extractionSuccess: extractionSuccess,
          processingTime: processingTime,
          success: success
        });

        if (success) {
          results.successful++;
          console.log(`  ✅ PASSED`);
        } else {
          results.failed++;
          console.log(`  ⚠️  PARTIAL - Expected ${expectedLang}, got ${detectedLang}`);
        }
      } else {
        console.log(`  ❌ Failed to parse ${expectedLang} text`);
        results.failed++;
        results.details.push({
          language: expectedLang,
          success: false,
          error: 'No result returned'
        });
      }
    } catch (error) {
      console.log(`  ❌ Error testing ${expectedLang}: ${error.message}`);
      results.failed++;
      results.details.push({
        language: expectedLang,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('═'.repeat(50));
  console.log(`Total parsers tested: ${results.total}`);
  console.log(`Successful: ${results.successful}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success rate: ${((results.successful / results.total) * 100).toFixed(1)}%`);

  if (results.successful === results.total) {
    console.log('\n🎉 ALL PARSERS VALIDATED SUCCESSFULLY!');
  } else {
    console.log('\n⚠️  Some parsers need attention.');
    console.log('Failed parsers:', results.details.filter(d => !d.success).map(d => d.language));
  }

  return results;
}

// Run the validation
testAllParsers()
  .then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });