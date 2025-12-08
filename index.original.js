// Amazon Invoice Parser - Proof of Concept
const fs = require('fs');
// TODO: Implement PDF parsing - current libraries having compatibility issues
// const pdfParse = require('pdf-parse');

class AmazonInvoiceParser {
  constructor() {
    this.extractedData = [];
  }

  async parseInvoice(pdfPath) {
    return new Promise((resolve, reject) => {
      try {
        // TODO: Implement actual PDF text extraction
        // For now, return mock data to demonstrate parsing logic
        console.log(`📄 Processing: ${pdfPath}`);

        // Mock PDF text extraction - replace with actual PDF parsing
        const mockText = this.getMockInvoiceText(pdfPath);
        const invoice = this.extractInvoiceData(mockText);

        resolve(invoice);
      } catch (error) {
        console.error('Error processing invoice:', error);
        resolve(null);
      }
    });
  }

  getMockInvoiceText(pdfPath) {
    // Generate different mock data based on filename for testing
    const fileName = pdfPath.split('/').pop();

    if (fileName.includes('order-document')) {
      return `
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

Payment Method: Visa ****1234
      `.trim();
    }

    // Default mock data for other files
    return `
Amazon.de Bestellung
Bestellnr. 304-1234567-8901234
Bestelldatum: 15. Dezember 2023

Artikel:
1 x Kindle Paperwhite €129,99
1 x Kindle Cover €29,99

Zwischensumme: €159,98
Versand: €0,00
MwSt: €25,59
Gesamtbetrag: €185,57

Zahlungsmethode: Kreditkarte ****5678
    `.trim();
  }

  extractInvoiceData(text) {
    const invoice = {
      orderNumber: this.extractOrderNumber(text),
      orderDate: this.extractOrderDate(text),
      items: this.extractItems(text),
      subtotal: this.extractSubtotal(text),
      shipping: this.extractShipping(text),
      tax: this.extractTax(text),
      total: this.extractTotal(text),
      vendor: 'Amazon'
    };

    return invoice;
  }

  extractOrderNumber(text) {
    // Amazon order numbers are typically 19 digits: 123-1234567-1234567
    const orderMatch = text.match(/(\d{3}-\d{7}-\d{7})/);
    return orderMatch ? orderMatch[1] : null;
  }

  extractOrderDate(text) {
    // Look for date patterns like "Order Placed: December 15, 2023"
    const datePatterns = [
      /Order Placed:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/,
      /Bestelldatum:\s*(\d{1,2}\.\s*[A-Za-z]+\s+\d{4})/, // German
      /Date de commande:\s*(\d{1,2}\s+[a-z]+\s+\d{4})/i, // French
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  extractItems(text) {
    const items = [];
    // Look for item patterns in Amazon invoices
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip headers and empty lines
      if (!line || line.includes('Quantity') || line.includes('Item') || line.includes('Price')) {
        continue;
      }

      // Look for price patterns at end of line
      const priceMatch = line.match(/\$(\d+\.\d{2})$|€(\d+,\d{2})$|£(\d+\.\d{2})$/);
      if (priceMatch) {
        // Extract item description (everything before the price)
        const price = priceMatch[0];
        const description = line.replace(price, '').trim();

        if (description.length > 10) { // Avoid false positives
          items.push({
            description: description,
            price: price
          });
        }
      }
    }

    return items;
  }

  extractSubtotal(text) {
    const subtotalMatch = text.match(/Subtotal[:\s]*(\$[\d,]+\.\d{2}|€[\d,]+\,\d{2}|£[\d,]+\.\d{2})/i);
    return subtotalMatch ? subtotalMatch[1] : null;
  }

  extractShipping(text) {
    const shippingMatch = text.match(/Shipping[:\s]*(\$[\d,]+\.\d{2}|€[\d,]+\,\d{2}|£[\d,]+\.\d{2})/i);
    return shippingMatch ? shippingMatch[1] : null;
  }

  extractTax(text) {
    // Look for various tax patterns
    const taxPatterns = [
      /Tax[:\s]*(\$[\d,]+\.\d{2}|€[\d,]+\,\d{2}|£[\d,]+\.\d{2})/i,
      /VAT[:\s]*(\$[\d,]+\.\d{2}|€[\d,]+\,\d{2}|£[\d,]+\.\d{2})/i,
      /MwSt[:\s]*(\$[\d,]+\.\d{2}|€[\d,]+\,\d{2}|£[\d,]+\.\d{2})/i, // German
      /TVA[:\s]*(\$[\d,]+\.\d{2}|€[\d,]+\,\d{2}|£[\d,]+\.\d{2})/i, // French
    ];

    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  extractTotal(text) {
    // Look for grand total (usually the largest amount)
    const totalMatch = text.match(/Grand Total[:\s]*(\$[\d,]+\.\d{2}|€[\d,]+\,\d{2}|£[\d,]+\.\d{2})/i) ||
                      text.match(/Total[:\s]*(\$[\d,]+\.\d{2}|€[\d,]+\,\d{2}|£[\d,]+\.\d{2})/i);
    return totalMatch ? totalMatch[1] : null;
  }

  async parseMultipleInvoices(pdfPaths) {
    const results = [];

    for (const path of pdfPaths) {
      console.log(`Processing: ${path}`);
      const invoice = await this.parseInvoice(path);
      if (invoice) {
        results.push(invoice);
      }
    }

    return results;
  }

  generateReport(invoices) {
    const report = {
      summary: {
        totalInvoices: invoices.length,
        totalSpent: this.calculateTotalSpent(invoices),
        dateRange: this.getDateRange(invoices),
        topVendors: this.getTopVendors(invoices)
      },
      invoices: invoices
    };

    return report;
  }

  calculateTotalSpent(invoices) {
    return invoices.reduce((total, invoice) => {
      if (invoice.total) {
        const amount = parseFloat(invoice.total.replace(/[^\d.]/g, ''));
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
    return [];
  }
}

// Example usage
async function main() {
  const parser = new AmazonInvoiceParser();

  // Example: parse a single invoice
  // const invoice = await parser.parseInvoice('./invoices/amazon-invoice-001.pdf');

  // Example: parse multiple invoices
  // const invoices = await parser.parseMultipleInvoices([
  //   './invoices/invoice1.pdf',
  //   './invoices/invoice2.pdf',
  //   './invoices/invoice3.pdf'
  // ]);

  // const report = parser.generateReport(invoices);
  // console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = AmazonInvoiceParser;
