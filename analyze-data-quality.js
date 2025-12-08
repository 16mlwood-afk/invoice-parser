const fs = require('fs');
const path = require('path');

// Data Quality Analysis Tool
class DataQualityAnalyzer {
  constructor(resultsFile) {
    this.results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    this.analysis = {
      overall: {},
      fieldCompleteness: {},
      dataQuality: {},
      financialAccuracy: {},
      recommendations: []
    };
  }

  analyze() {
    console.log('🔍 ANALYZING DATA CAPTURE QUALITY...\n');

    this.analyzeOverallMetrics();
    this.analyzeFieldCompleteness();
    this.analyzeDataQuality();
    this.analyzeFinancialAccuracy();
    this.generateRecommendations();

    this.printReport();
    return this.analysis;
  }

  analyzeOverallMetrics() {
    const { summary, invoices } = this.results;
    const totalInvoices = invoices.length;

    this.analysis.overall = {
      totalInvoices,
      totalSpent: summary.totalSpent,
      averageOrderValue: summary.totalSpent / totalInvoices,
      validationScores: invoices.map(inv => inv.validation.score),
      averageValidationScore: invoices.reduce((sum, inv) => sum + inv.validation.score, 0) / totalInvoices
    };
  }

  analyzeFieldCompleteness() {
    const invoices = this.results.invoices;
    const fields = ['orderNumber', 'orderDate', 'items', 'subtotal', 'shipping', 'tax', 'total'];

    this.analysis.fieldCompleteness = {};

    fields.forEach(field => {
      let populated = 0;
      let total = invoices.length;

      invoices.forEach(invoice => {
        const value = invoice[field];
        if (value !== null && value !== undefined &&
            (Array.isArray(value) ? value.length > 0 : String(value).trim() !== '')) {
          populated++;
        }
      });

      this.analysis.fieldCompleteness[field] = {
        populated,
        total,
        completenessRate: (populated / total) * 100,
        missing: total - populated
      };
    });

    // Calculate overall completeness
    const totalFields = fields.length * invoices.length;
    const populatedFields = Object.values(this.analysis.fieldCompleteness)
      .reduce((sum, field) => sum + field.populated, 0);

    this.analysis.fieldCompleteness.overall = {
      populatedFields,
      totalFields,
      completenessRate: (populatedFields / totalFields) * 100
    };
  }

  analyzeDataQuality() {
    const invoices = this.results.invoices;

    this.analysis.dataQuality = {
      validOrderNumbers: 0,
      validDates: 0,
      validTotals: 0,
      reasonableAmounts: 0,
      properCurrencyFormats: 0,
      totalInvoices: invoices.length
    };

    invoices.forEach(invoice => {
      // Order number validation (should match Amazon format)
      if (invoice.orderNumber && /^\d{3}-\d{7}-\d{7}$/.test(invoice.orderNumber)) {
        this.analysis.dataQuality.validOrderNumbers++;
      }

      // Date validation (should be parseable)
      if (invoice.orderDate) {
        const date = new Date(invoice.orderDate);
        if (!isNaN(date.getTime())) {
          this.analysis.dataQuality.validDates++;
        }
      }

      // Total validation (should be numeric and reasonable)
      if (invoice.total) {
        const numericTotal = this.extractNumericValue(invoice.total);
        if (numericTotal > 0 && numericTotal < 100000) { // Reasonable range
          this.analysis.dataQuality.validTotals++;
          this.analysis.dataQuality.reasonableAmounts++;
        }
      }

      // Currency format validation
      if (this.isValidCurrencyFormat(invoice.total)) {
        this.analysis.dataQuality.properCurrencyFormats++;
      }
    });

    // Calculate quality rates
    Object.keys(this.analysis.dataQuality).forEach(key => {
      if (key !== 'totalInvoices') {
        this.analysis.dataQuality[key + 'Rate'] = (this.analysis.dataQuality[key] / this.analysis.dataQuality.totalInvoices) * 100;
      }
    });
  }

  analyzeFinancialAccuracy() {
    const invoices = this.results.invoices;

    this.analysis.financialAccuracy = {
      mathematicallyConsistent: 0,
      subtotalTotalRatio: [],
      shippingReasonable: 0,
      taxReasonable: 0,
      totalInvoices: invoices.length
    };

    invoices.forEach(invoice => {
      const subtotal = this.extractNumericValue(invoice.subtotal);
      const shipping = this.extractNumericValue(invoice.shipping);
      const tax = this.extractNumericValue(invoice.tax);
      const total = this.extractNumericValue(invoice.total);

      // Mathematical consistency (subtotal + shipping + tax ≈ total, within 10% tolerance)
      if (total > 0) {
        const calculated = (subtotal || 0) + (shipping || 0) + (tax || 0);
        const ratio = Math.abs(calculated - total) / total;

        if (ratio <= 0.10) { // Within 10%
          this.analysis.financialAccuracy.mathematicallyConsistent++;
        }

        // Track subtotal/total ratios for analysis
        if (subtotal > 0) {
          this.analysis.financialAccuracy.subtotalTotalRatio.push(subtotal / total);
        }
      }

      // Reasonable shipping (should be < 10% of total or < $50)
      if (shipping > 0 && shipping < Math.min(total * 0.1, 50)) {
        this.analysis.financialAccuracy.shippingReasonable++;
      }

      // Reasonable tax (should be < 20% of subtotal)
      if (tax > 0 && subtotal > 0 && tax / subtotal <= 0.20) {
        this.analysis.financialAccuracy.taxReasonable++;
      }
    });

    // Calculate accuracy rates
    Object.keys(this.analysis.financialAccuracy).forEach(key => {
      if (key !== 'totalInvoices' && key !== 'subtotalTotalRatio') {
        this.analysis.financialAccuracy[key + 'Rate'] = (this.analysis.financialAccuracy[key] / this.analysis.financialAccuracy.totalInvoices) * 100;
      }
    });

    // Analyze subtotal/total ratios
    if (this.analysis.financialAccuracy.subtotalTotalRatio.length > 0) {
      const ratios = this.analysis.financialAccuracy.subtotalTotalRatio;
      this.analysis.financialAccuracy.subtotalTotalStats = {
        average: ratios.reduce((a, b) => a + b, 0) / ratios.length,
        min: Math.min(...ratios),
        max: Math.max(...ratios),
        median: this.median(ratios)
      };
    }
  }

  generateRecommendations() {
    const { fieldCompleteness, dataQuality, financialAccuracy } = this.analysis;

    this.analysis.recommendations = [];

    // Field completeness issues
    Object.entries(fieldCompleteness).forEach(([field, stats]) => {
      if (stats.completenessRate < 80 && field !== 'overall') {
        this.analysis.recommendations.push({
          priority: 'high',
          category: 'field_completeness',
          field,
          message: `${field} completeness: ${stats.completenessRate.toFixed(1)}% - ${stats.missing} missing values`
        });
      }
    });

    // Data quality issues
    if (dataQuality.validOrderNumbersRate < 100) {
      this.analysis.recommendations.push({
        priority: 'high',
        category: 'data_quality',
        message: `Order number validation: ${dataQuality.validOrderNumbersRate.toFixed(1)}% valid - improve regex patterns`
      });
    }

    if (dataQuality.validDatesRate < 80) {
      this.analysis.recommendations.push({
        priority: 'medium',
        category: 'data_quality',
        message: `Date extraction: ${dataQuality.validDatesRate.toFixed(1)}% valid - enhance date parsing`
      });
    }

    // Financial accuracy issues
    if (financialAccuracy.mathematicallyConsistentRate < 50) {
      this.analysis.recommendations.push({
        priority: 'high',
        category: 'financial_accuracy',
        message: `Mathematical consistency: ${financialAccuracy.mathematicallyConsistentRate.toFixed(1)}% - improve field extraction logic`
      });
    }

    // Overall assessment
    const overallCompleteness = fieldCompleteness.overall.completenessRate;
    if (overallCompleteness < 70) {
      this.analysis.recommendations.unshift({
        priority: 'critical',
        category: 'overall',
        message: `CRITICAL: Overall data completeness: ${overallCompleteness.toFixed(1)}% - major improvements needed`
      });
    } else if (overallCompleteness < 85) {
      this.analysis.recommendations.unshift({
        priority: 'high',
        category: 'overall',
        message: `Overall data completeness: ${overallCompleteness.toFixed(1)}% - significant improvements needed`
      });
    }
  }

  printReport() {
    console.log('📊 DATA QUALITY ANALYSIS REPORT');
    console.log('================================\n');

    // Overall metrics
    console.log('🎯 OVERALL METRICS:');
    console.log(`   • Total Invoices: ${this.analysis.overall.totalInvoices}`);
    console.log(`   • Total Spent: $${this.analysis.overall.totalSpent.toFixed(2)}`);
    console.log(`   • Average Order: $${this.analysis.overall.averageOrderValue.toFixed(2)}`);
    console.log(`   • Average Validation Score: ${this.analysis.overall.averageValidationScore.toFixed(1)}/100\n`);

    // Field completeness
    console.log('📋 FIELD COMPLETENESS:');
    Object.entries(this.analysis.fieldCompleteness).forEach(([field, stats]) => {
      if (field !== 'overall') {
        const rate = stats.completenessRate.toFixed(1);
        const status = stats.completenessRate >= 90 ? '✅' :
                      stats.completenessRate >= 70 ? '⚠️' : '❌';
        console.log(`   ${status} ${field}: ${rate}% (${stats.populated}/${stats.total})`);
      }
    });
    console.log(`   📊 Overall Completeness: ${this.analysis.fieldCompleteness.overall.completenessRate.toFixed(1)}%\n`);

    // Data quality
    console.log('🔍 DATA QUALITY:');
    const dq = this.analysis.dataQuality;
    console.log(`   • Valid Order Numbers: ${dq.validOrderNumbersRate.toFixed(1)}%`);
    console.log(`   • Valid Dates: ${dq.validDatesRate.toFixed(1)}%`);
    console.log(`   • Valid Totals: ${dq.validTotalsRate.toFixed(1)}%`);
    console.log(`   • Reasonable Amounts: ${dq.reasonableAmountsRate.toFixed(1)}%`);
    console.log(`   • Proper Currency Formats: ${dq.properCurrencyFormatsRate.toFixed(1)}%\n`);

    // Financial accuracy
    console.log('💰 FINANCIAL ACCURACY:');
    const fa = this.analysis.financialAccuracy;
    console.log(`   • Mathematically Consistent: ${fa.mathematicallyConsistentRate.toFixed(1)}%`);
    console.log(`   • Reasonable Shipping: ${fa.shippingReasonableRate.toFixed(1)}%`);
    console.log(`   • Reasonable Tax: ${fa.taxReasonableRate.toFixed(1)}%`);

    if (fa.subtotalTotalStats) {
      console.log(`   • Subtotal/Total Ratio: ${fa.subtotalTotalStats.average.toFixed(2)} (avg)`);
    }
    console.log('');

    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    if (this.analysis.recommendations.length === 0) {
      console.log('   ✅ All data quality metrics are excellent!');
    } else {
      this.analysis.recommendations.forEach((rec, index) => {
        const priority = rec.priority === 'critical' ? '🚨' :
                        rec.priority === 'high' ? '🔴' :
                        rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`   ${priority} ${rec.message}`);
      });
    }
    console.log('');

    // Final assessment
    const overallScore = this.calculateOverallScore();
    console.log('🏆 FINAL ASSESSMENT:');
    console.log(`   Data Capture Success Rate: ${overallScore.toFixed(1)}%`);

    if (overallScore >= 90) {
      console.log('   ✅ EXCELLENT: Production-ready data quality');
    } else if (overallScore >= 80) {
      console.log('   ⚠️ GOOD: Acceptable for most use cases');
    } else if (overallScore >= 70) {
      console.log('   🟡 FAIR: Needs improvement for production');
    } else {
      console.log('   ❌ POOR: Major quality issues require attention');
    }
  }

  calculateOverallScore() {
    const weights = {
      completeness: 0.4,
      dataQuality: 0.3,
      financialAccuracy: 0.3
    };

    const completenessScore = this.analysis.fieldCompleteness.overall.completenessRate;

    const dq = this.analysis.dataQuality;
    const dataQualityScore = (dq.validOrderNumbersRate + dq.validDatesRate +
                             dq.validTotalsRate + dq.properCurrencyFormatsRate) / 4;

    const fa = this.analysis.financialAccuracy;
    const financialScore = (fa.mathematicallyConsistentRate + fa.shippingReasonableRate +
                           fa.taxReasonableRate) / 3;

    return (completenessScore * weights.completeness +
            dataQualityScore * weights.dataQuality +
            financialScore * weights.financialAccuracy);
  }

  // Helper methods
  extractNumericValue(amount) {
    if (!amount || typeof amount !== 'string') return 0;
    const cleaned = amount.replace(/[^\d.,\-]/g, '');
    const match = cleaned.match(/[\d.,]+/);
    return match ? parseFloat(match[0].replace(',', '.')) : 0;
  }

  isValidCurrencyFormat(amount) {
    if (!amount || typeof amount !== 'string') return false;
    const currencyPatterns = [
      /^\$[\d,]*\d+\.\d{2}$/,
      /^[\d,]*\d+\.\d{2}\s*€$/,
      /^[\d.,]*\d+,\d{2}\s*€$/,
      /^€\s*[\d.,]*\d+[,.]\d{2}$/
    ];
    return currencyPatterns.some(pattern => pattern.test(amount.trim()));
  }

  median(arr) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
}

// CLI usage
if (require.main === module) {
  const resultsFile = process.argv[2] || './results/final-batch-results.json';

  if (!fs.existsSync(resultsFile)) {
    console.error(`❌ Results file not found: ${resultsFile}`);
    process.exit(1);
  }

  const analyzer = new DataQualityAnalyzer(resultsFile);
  analyzer.analyze();
}

module.exports = DataQualityAnalyzer;