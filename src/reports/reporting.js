class Reporting {
  constructor() {
    this.defaultExchangeRates = {
      'USD': 1.0,
      'EUR': 0.85,
      'GBP': 0.73,
      'CAD': 1.25,
      'AUD': 1.35,
      'JPY': 110.0,
      'CHF': 0.92
    };
  }

  generateReport(invoices, options = {}) {
    if (!invoices) {
      invoices = [];
    }

    if (!Array.isArray(invoices)) {
      throw new Error('Invoices must be an array');
    }

    const {
      includeMonthly = true,
      includeCategories = true,
      includeTrends = true,
      currency = 'USD',
      exchangeRates = this.defaultExchangeRates
    } = options;

    // Basic summary
    const totalSpent = this.calculateTotalSpent(invoices);
    const normalizedTotal = this.convertCurrency(totalSpent, 'USD', currency, exchangeRates);

    const report = {
      summary: {
        totalInvoices: invoices.length,
        totalSpent: normalizedTotal,
        originalCurrency: 'USD',
        displayCurrency: currency,
        dateRange: this.getDateRange(invoices),
        topVendors: this.getTopVendors(invoices),
        averageOrderValue: normalizedTotal / Math.max(invoices.length, 1)
      },
      invoices: invoices
    };

    // Monthly spending summaries
    if (includeMonthly) {
      report.monthlySpending = this.generateMonthlySpending(invoices, currency, exchangeRates);
    }

    // Category-based analysis
    if (includeCategories) {
      report.categoryAnalysis = this.generateCategoryAnalysis(invoices, currency, exchangeRates);
    }

    // Spending trends
    if (includeTrends) {
      report.trends = this.generateSpendingTrends(invoices, currency, exchangeRates);
    }

    // Currency breakdown
    report.currencyBreakdown = this.generateCurrencyBreakdown(invoices);

    return report;
  }

  calculateTotalSpent(invoices) {
    if (!invoices || !Array.isArray(invoices)) {
      return 0;
    }

    return invoices.reduce((total, invoice) => {
      if (invoice && invoice.total) {
        const amount = this.extractNumericValue(invoice.total);
        return total + amount;
      }
      return total;
    }, 0);
  }

  getDateRange(invoices) {
    // Implementation for date range calculation
    return { start: null, end: null };
  }

  getTopVendors(invoices) {
    // Implementation for vendor analysis
    const vendorCount = {};
    invoices.forEach(invoice => {
      const vendor = invoice.vendor || 'Amazon';
      vendorCount[vendor] = (vendorCount[vendor] || 0) + 1;
    });

    return Object.entries(vendorCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([vendor, count]) => `${vendor} (${count})`);
  }

  convertCurrency(amount, fromCurrency, toCurrency, exchangeRates) {
    if (fromCurrency === toCurrency) return amount;
    const rate = exchangeRates[toCurrency] / exchangeRates[fromCurrency];
    return amount * rate;
  }

  generateMonthlySpending(invoices, displayCurrency, exchangeRates) {
    const monthlyData = {};

    invoices.forEach(invoice => {
      try {
        const date = this.parseInvoiceDate(invoice.orderDate);
        if (!date) return;

        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const amount = this.extractNumericValue(invoice.total) || 0;
        const convertedAmount = this.convertCurrency(amount, 'USD', displayCurrency, exchangeRates);

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            monthName: date.toLocaleString('default', { month: 'long' }),
            totalSpent: 0,
            invoiceCount: 0
          };
        }

        monthlyData[monthKey].totalSpent += convertedAmount;
        monthlyData[monthKey].invoiceCount += 1;
      } catch (error) {
        // Skip invoices with invalid dates
      }
    });

    // Convert to array and sort by date
    return Object.values(monthlyData)
      .sort((a, b) => `${a.year}-${a.month}`.localeCompare(`${b.year}-${b.month}`));
  }

  generateCategoryAnalysis(invoices, displayCurrency, exchangeRates) {
    const categories = {};

    invoices.forEach(invoice => {
      if (!invoice.items || invoice.items.length === 0) return;

      invoice.items.forEach(item => {
        const category = this.categorizeItem(item.description);
        const amount = this.extractNumericValue(item.price) || 0;
        const convertedAmount = this.convertCurrency(amount, 'USD', displayCurrency, exchangeRates);

        if (!categories[category]) {
          categories[category] = {
            category: category,
            totalSpent: 0,
            itemCount: 0,
            averagePrice: 0
          };
        }

        categories[category].totalSpent += convertedAmount;
        categories[category].itemCount += 1;
      });
    });

    // Calculate averages and percentages
    const categoryArray = Object.values(categories);
    const totalSpent = categoryArray.reduce((sum, cat) => sum + cat.totalSpent, 0);

    categoryArray.forEach(cat => {
      cat.averagePrice = cat.totalSpent / cat.itemCount;
      cat.percentage = totalSpent > 0 ? (cat.totalSpent / totalSpent) * 100 : 0;
    });

    // Sort by total spent
    return categoryArray.sort((a, b) => b.totalSpent - a.totalSpent);
  }

  generateSpendingTrends(invoices, displayCurrency, exchangeRates) {
    const monthlyData = this.generateMonthlySpending(invoices, displayCurrency, exchangeRates);

    if (monthlyData.length < 2) {
      return {
        trend: 'insufficient_data',
        description: 'Need at least 2 months of data for trend analysis',
        monthlyGrowth: [],
        averageMonthlySpend: 0
      };
    }

    // Calculate month-over-month growth
    const monthlyGrowth = [];
    for (let i = 1; i < monthlyData.length; i++) {
      const current = monthlyData[i].totalSpent;
      const previous = monthlyData[i - 1].totalSpent;
      const growth = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      monthlyGrowth.push({
        month: `${monthlyData[i].year}-${monthlyData[i].month}`,
        growth: growth,
        current: current,
        previous: previous
      });
    }

    const averageGrowth = monthlyGrowth.reduce((sum, g) => sum + g.growth, 0) / monthlyGrowth.length;
    const averageMonthlySpend = monthlyData.reduce((sum, m) => sum + m.totalSpent, 0) / monthlyData.length;

    let trend;
    if (averageGrowth > 5) trend = 'increasing';
    else if (averageGrowth < -5) trend = 'decreasing';
    else trend = 'stable';

    return {
      trend: trend,
      description: `Spending is ${trend} with ${averageGrowth.toFixed(1)}% average monthly growth`,
      monthlyGrowth: monthlyGrowth,
      averageMonthlySpend: averageMonthlySpend,
      totalMonths: monthlyData.length
    };
  }

  generateCurrencyBreakdown(invoices) {
    const currencyStats = {};

    invoices.forEach(invoice => {
      const currency = this.extractCurrencySymbol(invoice.total) || 'USD';
      const amount = this.extractNumericValue(invoice.total) || 0;

      if (!currencyStats[currency]) {
        currencyStats[currency] = {
          currency: currency,
          totalSpent: 0,
          invoiceCount: 0,
          averageOrder: 0
        };
      }

      currencyStats[currency].totalSpent += amount;
      currencyStats[currency].invoiceCount += 1;
    });

    // Calculate averages
    Object.values(currencyStats).forEach(stats => {
      stats.averageOrder = stats.totalSpent / stats.invoiceCount;
    });

    return Object.values(currencyStats).sort((a, b) => b.totalSpent - a.totalSpent);
  }

  // Helper functions
  parseInvoiceDate(dateStr) {
    if (!dateStr) return null;

    try {
      // Try various date formats
      const formats = [
        // DD Month YYYY
        /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/,
        // Month DD, YYYY
        /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/,
        // DD.MM.YYYY or DD/MM/YYYY
        /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          if (format === formats[0]) { // DD Month YYYY
            return new Date(`${match[2]} ${match[1]}, ${match[3]}`);
          } else if (format === formats[1]) { // Month DD, YYYY
            return new Date(`${match[1]} ${match[2]}, ${match[3]}`);
          } else { // DD.MM.YYYY or DD/MM/YYYY
            return new Date(match[3], match[2] - 1, match[1]);
          }
        }
      }

      // Fallback: try to parse as-is
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch (error) {
      return null;
    }
  }

  categorizeItem(description) {
    if (!description) return 'Other';

    const desc = description.toLowerCase();

    // Category mapping based on keywords
    const categories = {
      'Electronics': ['echo', 'fire tv', 'kindle', 'tablet', 'phone', 'charger', 'headphone', 'speaker', 'smart home'],
      'Books': ['book', 'novel', 'textbook', 'magazine', 'journal', 'comic'],
      'Clothing': ['shirt', 'pants', 'dress', 'shoe', 'jacket', 'hat', 'accessory'],
      'Home & Garden': ['garden', 'plant', 'furniture', 'decor', 'kitchen', 'bathroom', 'tool'],
      'Sports & Outdoors': ['bike', 'tent', 'camping', 'fishing', 'hiking', 'sport', 'exercise'],
      'Health & Beauty': ['shampoo', 'lotion', 'vitamin', 'supplement', 'cosmetic', 'perfume'],
      'Food & Grocery': ['food', 'grocery', 'snack', 'beverage', 'coffee', 'tea'],
      'Toys & Games': ['toy', 'game', 'puzzle', 'board game', 'video game'],
      'Office Supplies': ['pen', 'paper', 'notebook', 'printer', 'office', 'stationery'],
      'Automotive': ['car', 'auto', 'tire', 'oil', 'part', 'accessory']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => desc.includes(keyword))) {
        return category;
      }
    }

    return 'Other';
  }

  // Helper: Extract numeric value from currency string
  extractNumericValue(amount) {
    if (!amount || typeof amount !== 'string') return 0;

    // Handle European number format (1.234,56) vs US format (1,234.56)
    let cleaned = amount.replace(/[^\d.,\-]/g, ''); // Remove currency symbols and other non-numeric chars

    // Determine format based on currency context and number pattern
    // European format: 1.234,56 (period = thousands, comma = decimal)
    // US/UK format: 1,234.56 (comma = thousands, period = decimal)

    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Both separators present - need to determine which is which
      // Check if the comma comes after a period (European: 1.234,56)
      const lastPeriodIndex = cleaned.lastIndexOf('.');
      const lastCommaIndex = cleaned.lastIndexOf(',');

      if (lastCommaIndex > lastPeriodIndex) {
        // European format: remove periods, replace comma with dot
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // US/UK format: remove commas
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      // Only commas - could be decimal or thousands separators
      // If the comma is followed by 1-2 digits at the end, treat as decimal (European)
      // Otherwise, treat as thousands separator (US/UK)
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length <= 2 && /^\d+$/.test(parts[1])) {
        // European format: 1,23 -> 1.23
        cleaned = cleaned.replace(',', '.');
      } else {
        // US/UK format: remove commas as thousands separators
        cleaned = cleaned.replace(/,/g, '');
      }
    }
    // If only periods, assume US format and keep as is

    const match = cleaned.match(/[\d.]+\.?\d*/);
    return match ? parseFloat(match[0]) : 0;
  }

  // Helper: Extract currency symbol from amount string
  extractCurrencySymbol(amount) {
    if (!amount || typeof amount !== 'string') return null;

    // Look for common currency symbols
    const currencyMatch = amount.match(/([$€£¥]|CHF|Fr)/);
    return currencyMatch ? currencyMatch[0] : null;
  }
}

module.exports = Reporting;