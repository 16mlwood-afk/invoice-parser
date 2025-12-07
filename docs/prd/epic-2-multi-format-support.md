# Epic 2: Multi-Format Support

Extend parsing to handle multiple Amazon marketplace formats and currencies.

## Story 2.1: German Invoice Support
As a user with German Amazon invoices,
I want the parser to handle German language and EUR currency,
so that I can process invoices from amazon.de.

**Acceptance Criteria:**
1. German text patterns recognized
2. EUR currency symbol (€) properly handled
3. German date formats parsed correctly
4. German item descriptions extracted accurately

## Story 2.2: French Invoice Support
As a user with French Amazon invoices,
I want the parser to handle French language and EUR currency,
so that I can process invoices from amazon.fr.

**Acceptance Criteria:**
1. French text patterns recognized
2. French date formats parsed correctly
3. French currency formatting handled
4. French item descriptions extracted accurately

## Story 2.3: Additional Currency Support
As a user with international Amazon purchases,
I want support for GBP and other common currencies,
so that I can process invoices from various Amazon marketplaces.

**Acceptance Criteria:**
1. GBP (£) currency symbol support
2. Additional currency formats handled
3. Currency-specific decimal formatting
4. Multi-currency invoice processing
