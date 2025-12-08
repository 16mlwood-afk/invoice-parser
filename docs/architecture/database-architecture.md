# Database Architecture

## Data Storage Strategy

**Primary:** File-based storage with JSON export for processed data
**Future Options:** SQLite for local data persistence, PostgreSQL for cloud deployment

## Data Models

**Core Entities:**
- Invoice: Complete parsed invoice data
- Item: Individual line items with descriptions and pricing
- ProcessingResult: Success/failure status and metadata
- Report: Generated analytics and summaries

**Schema Design:**
```javascript
// Invoice schema
{
  id: string,
  orderNumber: string,
  orderDate: Date,
  vendor: 'Amazon',
  currency: string,
  items: Item[],
  subtotal: number,
  shipping: number,
  tax: number,
  total: number,
  metadata: object
}
```

## Data Flow

**Processing Pipeline:**
1. PDF ingestion → Text extraction
2. Pattern matching → Structured data
3. Validation → Quality assurance
4. Formatting → Output generation
