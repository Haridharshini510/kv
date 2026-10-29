# KadaiVoice — Project Specification & Implementation Guide

**Project type:** Accessible, voice-first shop billing application  
**Status:** MVP planning  
**Frontend:** React  
**Backend:** Node.js + Express  
**Database:** PostgreSQL  
**Primary users:** Small shop owners and suppliers who need an accessible, efficient billing workflow

---

## 1. Project Overview

KadaiVoice is a voice-first billing application designed for a small shop that supplies products to other shops. It replaces handwritten daily transaction records with a simple digital workflow.

The shop owner should be able to record products supplied to different shops throughout the day, review the entries, correct mistakes, and generate one consolidated bill per shop at the end of the day.

The interface must accommodate a user with eyesight difficulties and limited ease of physical interaction. It should minimize typing, use large controls, provide clear feedback, and support speech-based interaction.

Speech recognition must be treated as an input mechanism, not as the authority for financial calculations. All quantities, prices, and totals must be verified before an entry or invoice is finalized.

## 2. Problem Statement

The current workflow depends on handwritten records. This makes daily transaction management more time-consuming and increases the risk of calculation errors, illegible entries, forgotten transactions, and mistakes when consolidating purchases for individual shops.

Product prices may differ between shops and may also change for individual transactions. Therefore, the application must preserve the actual price used for every recorded transaction rather than relying exclusively on a product's current price.

## 3. MVP Objectives

The first version must support:

1. Maintaining a list of customer shops.
2. Maintaining a list of products.
3. Supporting default prices, shop-specific prices, and transaction-specific price overrides.
4. Recording multiple product entries for a shop throughout a day.
5. Reviewing and correcting transaction details.
6. Calculating totals accurately on the server.
7. Generating one consolidated daily invoice per shop.
8. Displaying and printing invoices.
9. Providing an accessible interface with large controls and clear feedback.
10. Allowing voice input to be integrated through a separate, replaceable module.

### Out of scope for the first version

- GST and complex tax calculations.
- Inventory management and automatic stock deductions.
- Online payments and payment gateway integration.
- Multi-user roles and advanced authentication.
- AI-based autonomous billing.
- Cloud deployment and multi-branch synchronization.
- Full accounting and financial reporting.

These features can be considered after the core billing workflow is reliable.

## 4. Core User Workflow

### A. Initial setup

The user adds the shops they supply and the products they sell.

Each product may have a default price. If a shop regularly receives a different price, the application can store a shop-specific price.

### B. Record a transaction

1. Select or identify a customer shop.
2. Enter or recognize a product name.
3. Enter or recognize the quantity.
4. Determine the applicable unit price.
5. Calculate the line total.
6. Display the interpreted details for review.
7. Allow corrections before saving.
8. Save the confirmed entry.

Example:

- Shop: Kumar Stores
- Product: Rice bag
- Quantity: 3
- Unit price: ₹1,250
- Line total: ₹3,750

The values are illustrative. Actual product names and prices must come from the shop's records or be explicitly entered.

### C. Record additional items

The user can add further products to the same shop throughout the day. Each saved entry must preserve its own quantities, prices, timestamps, and associated shop.

### D. Review the day's activity

The user can view transactions grouped by shop and date. Each transaction must be editable while permitted by the application's invoice-finalization rules.

### E. Generate the daily bill

At the end of the day, the application consolidates all eligible entries for a particular shop into one invoice.

The invoice includes:

- Invoice number.
- Shop name.
- Invoice date.
- Product descriptions.
- Quantities.
- Actual unit prices.
- Line totals.
- Grand total.
- Invoice status.

Generating the invoice must not accidentally create duplicate invoices for the same shop and business date.

## 5. Pricing Rules

Pricing is an essential business requirement.

Use the following price-resolution order:

1. An explicitly confirmed transaction-specific price.
2. The configured price for the selected shop and product.
3. The product's default price, if applicable.

If no valid price is available, ask the user to enter or confirm one. Never silently substitute a price.

Store the actual unit price on each sale item. Historical transactions and invoices must remain unchanged if the default product price or shop-specific price changes later.

Use PostgreSQL `NUMERIC` columns for monetary values rather than floating-point types. Store prices in Indian rupees and round monetary calculations according to the application's documented currency rules.

## 6. Recommended Architecture

### Frontend — React

Responsible for:

- Accessible shop and product selection.
- Transaction entry and review.
- Displaying recognized speech for confirmation.
- Showing validation errors.
- Displaying daily transaction summaries.
- Invoice preview and print layout.
- Managing UI state and communicating with the backend.

### Backend — Node.js and Express

Responsible for:

- REST API endpoints.
- Input validation.
- Shop and product management.
- Price resolution.
- Transaction persistence.
- Authoritative monetary calculations.
- Invoice generation and finalization.
- Duplicate prevention and consistent database updates.

The frontend must never be the sole authority for prices, line totals, or invoice totals.

### Database — PostgreSQL

Responsible for persistent storage of shops, products, shop-specific pricing, transactions, sale items, and invoices.

### Voice module — implemented separately

The voice module should convert speech into a structured candidate transaction. It must not write directly to the database or finalize invoices.

The recognized candidate must pass through the same validation and confirmation process as manually entered data.

### Data flow

React interface → Express API → validation and billing logic → PostgreSQL

Voice recognition → candidate transaction → review and confirmation → Express API

Invoice request → server-side validation and aggregation → PostgreSQL transaction → invoice response

## 7. Database Design

The following is a proposed relational schema. Refine it during implementation while preserving the business rules.

### 7.1 `shops`

Stores customer shops.

Suggested columns:

- `id`: Primary key.
- `name`: Shop name.
- `phone`: Optional contact number.
- `address`: Optional address.
- `is_active`: Whether the shop is currently active.
- `created_at`: Creation timestamp.

### 7.2 `products`

Stores the product catalogue.

Suggested columns:

- `id`: Primary key.
- `name`: Canonical product name.
- `unit`: Unit of measurement, such as piece, kg, litre, or bag.
- `default_price`: Optional default unit price.
- `is_active`: Whether the product can be selected.
- `created_at`: Creation timestamp.

Product names should be canonicalized so that different speech variations can map to the same product record.

### 7.3 `shop_product_prices`

Stores prices configured for individual shop-product combinations.

Suggested columns:

- `id`: Primary key.
- `shop_id`: Foreign key referencing `shops`.
- `product_id`: Foreign key referencing `products`.
- `unit_price`: Configured price.
- `valid_from`: Date or timestamp when the price becomes applicable.
- `valid_until`: Optional end of validity.
- `created_at`: Creation timestamp.

Support a clear rule for selecting the applicable price when price history exists. Prevent conflicting active price records for the same shop-product combination.

### 7.4 `sales_entries`

Represents a confirmed transaction entry made during the day.

Suggested columns:

- `id`: Primary key.
- `shop_id`: Foreign key referencing `shops`.
- `business_date`: Shop-local business date.
- `status`: Draft, confirmed, invoiced, or cancelled.
- `input_method`: Manual or voice.
- `created_at`: Timestamp.
- `updated_at`: Timestamp.

Use the business date consistently when grouping daily transactions.

### 7.5 `sale_items`

Stores the products associated with each sales entry.

Suggested columns:

- `id`: Primary key.
- `sales_entry_id`: Foreign key referencing `sales_entries`.
- `product_id`: Foreign key referencing `products`.
- `product_name_snapshot`: Product name at the time of the transaction.
- `quantity`: Positive quantity using a suitable numeric type.
- `unit_price`: Actual confirmed unit price.
- `line_total`: Calculated line total.
- `created_at`: Timestamp.

The backend must calculate `line_total` from quantity and unit price. Validate quantity and price before accepting an entry.

Preserve the confirmed price and product description as historical snapshots.

### 7.6 `invoices`

Stores consolidated daily invoices.

Suggested columns:

- `id`: Primary key.
- `invoice_number`: Unique invoice identifier.
- `shop_id`: Foreign key referencing `shops`.
- `business_date`: Date covered by the invoice.
- `status`: Draft, finalized, or cancelled.
- `subtotal`: Calculated invoice subtotal.
- `grand_total`: Final calculated total.
- `created_at`: Timestamp.
- `finalized_at`: Optional finalization timestamp.

Enforce the business rule that there can be at most one finalized consolidated invoice per shop per business date. Use a database constraint where appropriate.

For a more flexible design, introduce an `invoice_items` table to preserve the exact quantities, descriptions, prices, and totals included in the finalized invoice.

### Database integrity requirements

- Use primary keys and foreign keys.
- Add `NOT NULL` constraints to required fields.
- Add appropriate checks for positive quantities and non-negative prices.
- Use transactions when saving entries or finalizing invoices.
- Prevent duplicate finalization through database constraints and backend logic.
- Preserve historical prices and finalized invoice values.
- Avoid deleting records that are already part of a finalized invoice. Define a correction or cancellation process instead.

## 8. Proposed REST API

Use a versioned API prefix such as `/api/v1`.

### Shops

- `GET /api/v1/shops` — List active shops.
- `POST /api/v1/shops` — Create a shop.
- `GET /api/v1/shops/:id` — Retrieve shop details.
- `PATCH /api/v1/shops/:id` — Update shop details.

### Products

- `GET /api/v1/products` — List active products.
- `POST /api/v1/products` — Create a product.
- `PATCH /api/v1/products/:id` — Update product details.

### Shop-specific pricing

- `GET /api/v1/shops/:id/prices` — Retrieve configured shop prices.
- `PUT /api/v1/shops/:id/products/:productId/price` — Configure or update a shop-specific price.

### Sales entries

- `POST /api/v1/sales-entries` — Create a confirmed sales entry.
- `GET /api/v1/sales-entries?shopId=:id&date=YYYY-MM-DD` — Retrieve entries for a shop and date.
- `GET /api/v1/sales-entries/:id` — Retrieve one entry.
- `PATCH /api/v1/sales-entries/:id` — Correct an eligible entry.
- `POST /api/v1/sales-entries/:id/cancel` — Cancel an eligible entry.

### Daily invoices

- `GET /api/v1/invoices?date=YYYY-MM-DD` — List invoices for a date.
- `GET /api/v1/invoices/:id` — Retrieve invoice details.
- `POST /api/v1/invoices/daily` — Prepare or generate a daily invoice for a shop and date.
- `POST /api/v1/invoices/:id/finalize` — Finalize an invoice after review.
- `GET /api/v1/invoices/:id/print` — Return a printable invoice representation or appropriate print view.

Validate all request bodies, query parameters, and route parameters. Return consistent HTTP status codes and useful error messages.

The exact API contracts should be documented with sample request and response bodies before frontend integration.

## 9. Voice Recognition Requirements

Voice recognition will be integrated separately.

### Language

The expected speech is Tamil mixed with English product names. Shop names, product names, quantities, and price expressions may be spoken in either language or in a mixture.

Do not assume that a speech recognizer will reliably understand all Tamil-English code-switching.

### Voice-processing pipeline

1. Capture audio.
2. Transcribe the utterance.
3. Display the transcript.
4. Identify the intended shop, product, quantity, and any explicitly stated price.
5. Match the product against the canonical product catalogue.
6. Resolve ambiguities by asking the user.
7. Retrieve or request the applicable price.
8. Calculate the line total on the server.
9. Read back or display the complete transaction.
10. Save only after explicit confirmation.

Example utterance:

“Ramesh Stores-ku three rice bags, each twelve fifty.”

Illustrative candidate:

- Shop: Ramesh Stores.
- Product: Rice bag.
- Quantity: 3.
- Unit price: ₹1,250, subject to confirmation.
- Line total: ₹3,750.

The recognizer must not silently assume that “twelve fifty” means ₹1,250 if the phrase or context is ambiguous.

### Voice safety rules

- Never save an uncertain interpretation as a confirmed transaction.
- Never invent a product, quantity, or price.
- Ask follow-up questions for ambiguous shop names or product matches.
- Provide a way to repeat, edit, or cancel the candidate.
- Support manual entry if voice recognition fails.
- Do not rely on speech recognition confidence alone to decide whether a financial transaction is correct.
- Avoid retaining raw audio or transcripts longer than necessary; document any storage and consent requirements.

The speech provider should be replaceable without rewriting the billing logic.

## 10. Accessibility Requirements

Accessibility is a core requirement, not a visual enhancement.

### Visual accessibility

- Use large, readable text.
- Use high contrast between text and background.
- Provide large buttons with generous spacing.
- Avoid crowded screens and unnecessary navigation.
- Do not communicate important status using colour alone.
- Show currency symbols, quantities, and totals clearly.
- Support browser zoom and responsive layouts.

### Interaction accessibility

- Minimize typing.
- Keep common actions available on the primary screen.
- Provide clear Save, Edit, Repeat, and Cancel actions.
- Allow keyboard navigation.
- Avoid short timeouts that could cause a user to lose work.
- Confirm destructive or irreversible actions.
- Preserve form data when validation fails.

### Auditory accessibility

- Provide optional spoken confirmations.
- Read back the shop, product, quantity, price, and total.
- Give clear feedback when the microphone is unavailable or speech could not be understood.
- Provide visual alternatives to every spoken message.
- Allow speech output to be repeated.

The application must remain usable when speech recognition is unavailable.

## 11. Billing Accuracy and Data Safety

Financial correctness takes priority over convenience.

- Perform all authoritative calculations on the server.
- Recalculate totals from persisted sale items during invoice preparation.
- Use PostgreSQL transactions for operations that update related records.
- Validate that the selected shop and product exist and are active.
- Prevent negative or invalid quantities.
- Never change historical prices when catalogue prices are updated.
- Make invoice finalization atomic and resistant to duplicate requests.
- Prevent edits to finalized invoice contents unless a deliberate correction or cancellation workflow is implemented.
- Record timestamps consistently and use the shop's configured business timezone.
- Clearly distinguish draft, confirmed, and finalized records.
- Display a final invoice preview and require explicit confirmation before finalization.

## 12. Recommended React Screens

### Screen 1 — Home / Quick Entry

- Large “New Entry” action.
- Large shop selection control.
- Prominent voice input control.
- Manual-entry fallback.
- Today's transaction summary.
- Quick access to daily bills.

### Screen 2 — Transaction Review

- Shop name.
- Product name.
- Quantity.
- Unit price.
- Line total.
- Edit, repeat, and cancel controls.
- Explicit confirmation action.

### Screen 3 — Shops

- Search and select shops.
- Add or edit shop details.
- View shop-specific prices.

### Screen 4 — Products

- Search products.
- Add or edit products.
- Configure default prices and units.

### Screen 5 — Daily Transactions

- Filter by date and shop.
- Display saved entries.
- Show subtotals and transaction statuses.
- Allow permitted corrections.

### Screen 6 — Daily Bills

- List shops with transactions for the selected date.
- Display invoice status and total.
- Preview a consolidated bill.
- Finalize and print the invoice.

## 13. Suggested Project Structure

```text
kadai-voice/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── styles/
│   │   └── App.jsx
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── validators/
│   │   ├── db/
│   │   └── app.js
│   ├── schema.sql
│   ├── .env
│   └── package.json
│
├── docs/
│   ├── project-specification.md
│   ├── database-design.md
│   ├── api-contracts.md
│   └── testing-plan.md
│
├── .gitignore
└── README.md
```

This is a suggested structure, not a requirement to create every file immediately.

## 14. Testing Plan

### Database tests

- Create and retrieve shops and products.
- Configure different prices for two shops buying the same product.
- Change a default price and verify old transactions retain their original prices.
- Reject invalid quantities and prices.
- Prevent duplicate finalized daily invoices.

### Backend tests

- Calculate line totals correctly.
- Aggregate all eligible entries for a shop and date.
- Exclude cancelled entries from the invoice total.
- Reject invalid shop and product IDs.
- Handle duplicate requests safely.
- Prevent unauthorized or invalid edits to finalized invoices.

### Voice tests

Prepare a test set of real shop terminology, Tamil-English mixed utterances, alternate pronunciations, number expressions, background noise, and similar-sounding product names.

Measure product-matching accuracy, quantity accuracy, price interpretation accuracy, and the rate of transactions requiring correction. Test with the actual intended speaker and environment.

### Accessibility tests

- Complete a transaction using large controls.
- Complete a transaction without voice recognition.
- Correct a wrong product and quantity.
- Use the interface with browser zoom.
- Verify that totals and errors are easy to read.
- Verify that spoken feedback can be repeated.

### End-to-end acceptance scenario

Record multiple products for the same shop throughout one day, record products for a second shop, change a product's configured price, and generate each shop's daily invoice. Verify that each invoice includes only the correct transactions and retains the actual confirmed prices.

## 15. Implementation Sequence

1. Initialize the React and Express projects.
2. Build the initial accessible interface using sample data.
3. Define the database schema and review its constraints.
4. Implement PostgreSQL connectivity and migrations.
5. Implement shops and products APIs.
6. Implement price resolution and sales-entry APIs.
7. Implement server-side calculations and validation.
8. Implement daily invoice preparation and finalization.
9. Connect the React interface to the backend.
10. Integrate voice recognition through a separate adapter.
11. Add spoken feedback and robust correction flows.
12. Test accuracy, accessibility, and billing edge cases.
13. Add printable invoices and finalize the MVP.

## 16. Definition of Done

The MVP is ready for a supervised real-world trial when:

- Shops and products can be maintained.
- Different shops can have different prices.
- Transaction-specific price changes are supported.
- Daily entries persist in PostgreSQL.
- Entries can be reviewed and corrected safely.
- One consolidated invoice can be finalized per shop per business date.
- Invoice totals match the confirmed transaction records.
- Duplicate finalization is prevented.
- The interface is usable without voice recognition.
- Voice-derived values are reviewed before saving.
- The user can understand and correct errors without needing technical assistance.

## 17. Implementation Ownership and Instructions for Claude

Claude should assist with the React interface, Express application structure, API scaffolding, input validation, sample data, invoice preview, accessibility improvements, and automated tests.

The project owner will personally implement and understand:

1. PostgreSQL connection configuration and database integration.
2. The final database schema and constraints.
3. The voice recognition pipeline.
4. Tamil-English speech interpretation and product matching.
5. The connection between voice-derived candidate transactions and the billing API.

Claude must not silently replace these learning tasks with opaque implementations.

### Instructions for Claude

- Read this specification before making changes.
- Work incrementally and explain the purpose of each module.
- Do not generate the entire application in one large code dump.
- Start with project setup and the accessible React interface using clearly marked mock data.
- Keep database access in a dedicated backend module.
- Keep speech recognition behind a separate adapter interface.
- Do not hardcode sample prices into production billing logic.
- Do not fabricate successful database or voice integration while those modules remain unimplemented.
- Do not put database credentials in frontend code or commit `.env`.
- Provide exact commands to run and test each milestone.
- Identify files created or changed in each step.
- Preserve the stated pricing, historical-record, invoice-finalization, and accessibility requirements.
- Ask before introducing new dependencies or changing the architecture.
- Include test cases for every financial calculation and invoice workflow.
- Stop at clear integration boundaries when the project owner needs to implement PostgreSQL or voice functionality manually.

**Guiding principle:** KadaiVoice must be simple for its user, transparent when something goes wrong, and reliable with money. A transaction is not complete just because the application heard something; it is complete only after the details have been verified and safely recorded.
