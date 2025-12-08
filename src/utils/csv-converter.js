function invoiceToCSV(invoice) {
  const rows = [];

  // CSV headers
  const headers = [
    'Order Number',
    'Order Date',
    'Item Description',
    'Item Price',
    'Subtotal',
    'Shipping',
    'Tax',
    'Total',
    'Vendor',
    'File Size',
    'Pages',
    'Extraction Date'
  ];
  rows.push(headers);

  // Process invoice data
  const orderNumber = invoice.orderNumber || '';
  const orderDate = invoice.orderDate || '';
  const subtotal = invoice.subtotal || '';
  const shipping = invoice.shipping || '';
  const tax = invoice.tax || '';
  const total = invoice.total || '';
  const vendor = invoice.vendor || 'Amazon';
  const fileSize = invoice.pdfMetadata?.fileSize || '';
  const pages = invoice.pdfMetadata?.pages || '';
  const extractionDate = invoice.pdfMetadata?.extractedAt || '';

  // If no items, create single row
  if (!invoice.items || invoice.items.length === 0) {
    rows.push([
      escapeCSV(orderNumber),
      escapeCSV(orderDate),
      '', // Item Description
      '', // Item Price
      escapeCSV(subtotal),
      escapeCSV(shipping),
      escapeCSV(tax),
      escapeCSV(total),
      escapeCSV(vendor),
      escapeCSV(fileSize),
      escapeCSV(pages),
      escapeCSV(extractionDate)
    ]);
  } else {
    // Create row for each item
    invoice.items.forEach((item, index) => {
      const isFirstItem = index === 0;
      rows.push([
        isFirstItem ? escapeCSV(orderNumber) : '',
        isFirstItem ? escapeCSV(orderDate) : '',
        escapeCSV(item.description || ''),
        escapeCSV(item.price || ''),
        isFirstItem ? escapeCSV(subtotal) : '',
        isFirstItem ? escapeCSV(shipping) : '',
        isFirstItem ? escapeCSV(tax) : '',
        isFirstItem ? escapeCSV(total) : '',
        isFirstItem ? escapeCSV(vendor) : '',
        isFirstItem ? escapeCSV(fileSize) : '',
        isFirstItem ? escapeCSV(pages) : '',
        isFirstItem ? escapeCSV(extractionDate) : ''
      ]);
    });
  }

  return rows.map(row => row.join(',')).join('\n');
}

function reportToCSV(report) {
  const rows = [];
  const currency = report.summary?.displayCurrency || 'USD';

  // Enhanced CSV headers for comprehensive report
  const headers = [
    'Report Type',
    'Total Invoices',
    'Total Spent',
    'Currency',
    'Average Order Value',
    'Date Range Start',
    'Date Range End',
    'Top Vendors'
  ];
  rows.push(headers);

  // Summary row
  const summary = report.summary || {};
  rows.push([
    'SUMMARY',
    escapeCSV(summary.totalInvoices || 0),
    escapeCSV(summary.totalSpent || 0),
    escapeCSV(currency),
    escapeCSV(summary.averageOrderValue || 0),
    escapeCSV(summary.dateRange?.start || ''),
    escapeCSV(summary.dateRange?.end || ''),
    escapeCSV((summary.topVendors || []).join('; ') || '')
  ]);

  // Monthly spending data
  if (report.monthlySpending && report.monthlySpending.length > 0) {
    rows.push(['']);
    rows.push(['MONTHLY_SPENDING', 'Year', 'Month', 'Month Name', 'Total Spent', 'Invoice Count']);

    report.monthlySpending.forEach(month => {
      rows.push([
        'MONTHLY_SPENDING',
        escapeCSV(month.year),
        escapeCSV(month.month),
        escapeCSV(month.monthName),
        escapeCSV(month.totalSpent),
        escapeCSV(month.invoiceCount)
      ]);
    });
  }

  // Category analysis
  if (report.categoryAnalysis && report.categoryAnalysis.length > 0) {
    rows.push(['']);
    rows.push(['CATEGORY_ANALYSIS', 'Category', 'Total Spent', 'Item Count', 'Average Price', 'Percentage']);

    report.categoryAnalysis.forEach(cat => {
      rows.push([
        'CATEGORY_ANALYSIS',
        escapeCSV(cat.category),
        escapeCSV(cat.totalSpent),
        escapeCSV(cat.itemCount),
        escapeCSV(cat.averagePrice),
        escapeCSV(cat.percentage)
      ]);
    });
  }

  // Currency breakdown
  if (report.currencyBreakdown && report.currencyBreakdown.length > 0) {
    rows.push(['']);
    rows.push(['CURRENCY_BREAKDOWN', 'Currency', 'Total Spent', 'Invoice Count', 'Average Order']);

    report.currencyBreakdown.forEach(curr => {
      rows.push([
        'CURRENCY_BREAKDOWN',
        escapeCSV(curr.currency),
        escapeCSV(curr.totalSpent),
        escapeCSV(curr.invoiceCount),
        escapeCSV(curr.averageOrder)
      ]);
    });
  }

  // Invoice details
  if (report.invoices && report.invoices.length > 0) {
    rows.push(['']);
    rows.push(['INVOICE_DETAILS', 'Order Number', 'Order Date', 'Item Description', 'Item Price', 'Subtotal', 'Shipping', 'Tax', 'Total', 'Vendor', 'Validation Score']);

    report.invoices.forEach(invoice => {
      const orderNumber = invoice.orderNumber || '';
      const orderDate = invoice.orderDate || '';
      const subtotal = invoice.subtotal || '';
      const shipping = invoice.shipping || '';
      const tax = invoice.tax || '';
      const total = invoice.total || '';
      const vendor = invoice.vendor || 'Amazon';
      const validationScore = invoice.validation?.score || 0;

      if (!invoice.items || invoice.items.length === 0) {
        rows.push([
          'INVOICE_DETAILS',
          escapeCSV(orderNumber),
          escapeCSV(orderDate),
          '',
          '',
          escapeCSV(subtotal),
          escapeCSV(shipping),
          escapeCSV(tax),
          escapeCSV(total),
          escapeCSV(vendor),
          escapeCSV(validationScore)
        ]);
      } else {
        invoice.items.forEach((item, index) => {
          const isFirstItem = index === 0;
          rows.push([
            'INVOICE_DETAILS',
            isFirstItem ? escapeCSV(orderNumber) : '',
            isFirstItem ? escapeCSV(orderDate) : '',
            escapeCSV(item.description || ''),
            escapeCSV(item.price || ''),
            isFirstItem ? escapeCSV(subtotal) : '',
            isFirstItem ? escapeCSV(shipping) : '',
            isFirstItem ? escapeCSV(tax) : '',
            isFirstItem ? escapeCSV(total) : '',
            isFirstItem ? escapeCSV(vendor) : '',
            isFirstItem ? escapeCSV(validationScore) : ''
          ]);
        });
      }
    });
  }

  return rows.map(row => row.join(',')).join('\n');
}

function escapeCSV(str) {
  if (str == null) return '';
  const string = String(str);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (string.includes(',') || string.includes('"') || string.includes('\n')) {
    return '"' + string.replace(/"/g, '""') + '"';
  }
  return string;
}

module.exports = {
  invoiceToCSV,
  reportToCSV,
  escapeCSV
};