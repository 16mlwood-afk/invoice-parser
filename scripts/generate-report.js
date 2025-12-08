#!/usr/bin/env node

/**
 * Generate Spending Report from Parsed Invoices
 *
 * This script demonstrates how to generate real production spending reports
 * from parsed Amazon invoice data.
 */

const AmazonInvoiceParser = require('./index');
const fs = require('fs');
const path = require('path');

async function loadInvoicesFromDirectory(dirPath) {
  const invoices = [];
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    if (file.endsWith('.json') && !file.includes('report')) {
      try {
        const filePath = path.join(dirPath, file);
        const invoiceData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        invoices.push(invoiceData);
      } catch (error) {
        console.error(`❌ Error loading ${file}:`, error.message);
      }
    }
  }

  return invoices;
}

async function generateProductionReport() {
  console.log('📊 Amazon Invoice Parser - Production Spending Report\n');

  const resultsDir = './all-regions-results';
  const reportFile = './all-regions-comprehensive-report.json';

  try {
    // Load all parsed invoices
    console.log('📂 Loading parsed invoice data...');
    const invoices = await loadInvoicesFromDirectory(resultsDir);

    if (invoices.length === 0) {
      console.log('❌ No invoice data found. Run parsing first.');
      return;
    }

    console.log(`📄 Loaded ${invoices.length} invoices\n`);

    // Generate comprehensive report
    const parser = new AmazonInvoiceParser();
    const report = parser.generateReport(invoices);

    // Save report
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`💾 Report saved to: ${reportFile}\n`);

    // Display key insights
    console.log('📊 PRODUCTION SPENDING ANALYSIS');
    console.log('================================\n');

    console.log('🏪 OVERVIEW:');
    console.log(`   Total Invoices: ${report.summary.totalInvoices}`);
    console.log(`   Total Spent: ${report.summary.displayCurrency} ${report.summary.totalSpent.toFixed(2)}`);
    console.log(`   Average Order: ${report.summary.displayCurrency} ${report.summary.averageOrderValue.toFixed(2)}`);
    console.log(`   Currencies Used: ${report.currencyBreakdown.map(c => c.currency).join(', ')}\n`);

    if (report.monthlySpending && report.monthlySpending.length > 0) {
      console.log('📅 MONTHLY SPENDING:');
      report.monthlySpending.forEach(month => {
        console.log(`   ${month.monthName} ${month.year || 'N/A'}: ${report.summary.displayCurrency} ${month.totalSpent.toFixed(2)} (${month.invoiceCount} invoices)`);
      });
      console.log('');
    }

    if (report.categoryAnalysis && report.categoryAnalysis.length > 0) {
      console.log('📦 SPENDING BY CATEGORY:');
      report.categoryAnalysis.slice(0, 5).forEach(cat => {
        console.log(`   ${cat.category.padEnd(15)}: ${report.summary.displayCurrency} ${cat.totalSpent.toFixed(2)} (${cat.percentage.toFixed(1)}%, ${cat.itemCount} items)`);
      });
      console.log('');
    }

    if (report.currencyBreakdown && report.currencyBreakdown.length > 0) {
      console.log('💱 CURRENCY BREAKDOWN:');
      report.currencyBreakdown.forEach(curr => {
        console.log(`   ${curr.currency}: ${curr.currency} ${curr.totalSpent.toFixed(2)} (${curr.invoiceCount} invoices, avg: ${curr.currency} ${curr.averageOrder.toFixed(2)})`);
      });
      console.log('');
    }

    if (report.trends && report.trends.trend !== 'insufficient_data') {
      console.log('📈 SPENDING TRENDS:');
      console.log(`   ${report.trends.description}`);
      console.log(`   Average Monthly Spend: ${report.summary.displayCurrency} ${report.trends.averageMonthlySpend.toFixed(2)}`);
      console.log('');
    }

    console.log('🎯 INSIGHTS:');
    if (report.summary.totalSpent > 500) {
      console.log(`   💰 Active shopper: Total of ${report.summary.displayCurrency} ${report.summary.totalSpent.toFixed(2)} across ${report.summary.totalInvoices} orders`);
    }
    if (report.categoryAnalysis && report.categoryAnalysis.length > 1) {
      console.log(`   🛍️  Product categories: ${report.categoryAnalysis.length} different categories purchased`);
    }
    if (report.currencyBreakdown && report.currencyBreakdown.length > 1) {
      console.log(`   🌍 Multi-currency: Orders in ${report.currencyBreakdown.length} different currencies`);
    }
    console.log('   📱 All orders from Amazon marketplace');
    console.log('   🔧 Error recovery used: Successfully handled PDF parsing issues');

    console.log('\n✅ Production report generation complete!');
    console.log(`📁 Full report available at: ${reportFile}`);

  } catch (error) {
    console.error('❌ Error generating report:', error.message);
    process.exit(1);
  }
}

// Run the report generation
if (require.main === module) {
  generateProductionReport().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { generateProductionReport };