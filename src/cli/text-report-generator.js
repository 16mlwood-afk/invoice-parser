function generateTextReport(report) {
  const lines = [];
  const currency = report.summary.displayCurrency || 'USD';

  lines.push('='.repeat(60));
  lines.push('AMAZON INVOICE SPENDING REPORT');
  lines.push('='.repeat(60));
  lines.push('');

  // Summary section
  lines.push('SUMMARY');
  lines.push('-'.repeat(20));
  lines.push(`Total Invoices: ${report.summary.totalInvoices}`);
  lines.push(`Total Spent: ${currency} ${report.summary.totalSpent.toFixed(2)}`);
  lines.push(`Average Order: ${currency} ${report.summary.averageOrderValue.toFixed(2)}`);

  if (report.summary.dateRange.start || report.summary.dateRange.end) {
    lines.push(`Date Range: ${report.summary.dateRange.start || 'N/A'} to ${report.summary.dateRange.end || 'N/A'}`);
  }

  if (report.summary.topVendors && report.summary.topVendors.length > 0) {
    lines.push(`Top Vendors: ${report.summary.topVendors.slice(0, 3).join(', ')}`);
  }
  lines.push('');

  // Monthly spending
  if (report.monthlySpending && report.monthlySpending.length > 0) {
    lines.push('MONTHLY SPENDING');
    lines.push('-'.repeat(20));
    report.monthlySpending.forEach(month => {
      lines.push(`${month.monthName} ${month.year}: ${currency} ${month.totalSpent.toFixed(2)} (${month.invoiceCount} invoices)`);
    });
    lines.push('');
  }

  // Category analysis
  if (report.categoryAnalysis && report.categoryAnalysis.length > 0) {
    lines.push('SPENDING BY CATEGORY');
    lines.push('-'.repeat(25));
    report.categoryAnalysis.slice(0, 10).forEach(cat => {
      lines.push(`${cat.category.padEnd(15)}: ${currency} ${cat.totalSpent.toFixed(2)} (${cat.percentage.toFixed(1)}%, ${cat.itemCount} items)`);
    });
    lines.push('');
  }

  // Currency breakdown
  if (report.currencyBreakdown && report.currencyBreakdown.length > 0) {
    lines.push('CURRENCY BREAKDOWN');
    lines.push('-'.repeat(20));
    report.currencyBreakdown.forEach(curr => {
      lines.push(`${curr.currency}: ${curr.currency} ${curr.totalSpent.toFixed(2)} (${curr.invoiceCount} invoices, avg: ${curr.currency} ${curr.averageOrder.toFixed(2)})`);
    });
    lines.push('');
  }

  // Trends
  if (report.trends && report.trends.trend !== 'insufficient_data') {
    lines.push('SPENDING TRENDS');
    lines.push('-'.repeat(15));
    lines.push(report.trends.description);
    lines.push(`Average Monthly Spend: ${currency} ${report.trends.averageMonthlySpend.toFixed(2)}`);
    lines.push(`Months Analyzed: ${report.trends.totalMonths}`);
    lines.push('');
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}

module.exports = generateTextReport;