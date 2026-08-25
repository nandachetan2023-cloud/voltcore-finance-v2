# Financial Module Architecture

## Overview
The Financial module provides comprehensive accounting, invoicing, payment processing, and reporting capabilities for the ERP system. Built with a modern Next.js/React stack using Prisma ORM and PostgreSQL, it handles financial transactions from invoice creation to payment reconciliation.

## System Architecture

```
┌─────────────┐    HTTP/REST    ┌─────────────────┐   Prisma Client   ┌──────────────┐
│  User UI    │ ──────────────▶ │   API Routes    │ ───────────────▶ │ PostgreSQL   │
│ (React/TSX) │  (Next.js API)  │ (Next.js Handlers)│   (ORM)        │ (Database)   │
└─────────────┘                 └─────────────────┘                   └──────────────┘
                                                                          ▲
                                                                          │
                                                                    ┌─────┴──────┐
                                                                    │ Prisma     │
                                                                    │ Schema     │
                                                                    │ (models)   │
                                                                    └────────────┘
```

## Key Components

### 1. API Layer (`src/app/api/`)
- **RESTful Endpoints**: Each financial entity has dedicated CRUD endpoints
- **Middleware**: Cookie-based tenant routing, dynamic DB connection
- **Response Format**: Consistent JSON structure with `{success, data, error}` fields
- **Import Endpoints**: Specialized bulk upload handlers (`/finance/import/*`)

### 2. Frontend Layer (`src/components/erp/`)
- **TypeScript React Components**: UI components for each financial entity
- **State Management**: Local state with fetch-based data loading
- **Form Validation**: Client-side validation before API calls
- **Export/Import**: CSV/Excel export and bulk import capabilities
- **Printing**: Custom HTML print templates for financial documents

### 3. Data Layer (`prisma/schema.prisma`)
- **Comprehensive Schema**: 76 Fin-prefixed finance models + extended tagging/approval fields
- **Relationships**: Well-defined foreign keys and cascading rules
- **Indexes**: Optimized query performance on common lookup fields
- **Custom Types**: Specialized types for financial calculations
- **Latest Enhancements**:
  - `FinJournalLine`: Added `jobCode`, `projectManager`; changed `costCenter` to `String` for flexible tagging
  - `FinPettyCash`: Added `billAttachmentPath` for direct bill upload
  - `FinApprovalLog`: Added `finJournalEntryId` to support JV approval workflows
  - `FinPurchaseOrder`: Added reverse relation `expenseClaims`

## Data Flow Patterns

### Standard CRUD Flow
1. User interacts with React component
2. Component makes fetch() request to `/api/fin/[entity]`
3. Next.js API route handler resolves DB via `getDbForRequest()` cookie router
4. Prisma executes database operation with transaction safety
5. Result serialized to JSON and returned to client
6. Component updates UI state and shows feedback

### Import Flow
1. User uploads Excel file via ImportWizard component
2. File sent to `/api/fin/*/import` or `/api/finance/import/*` endpoint
3. System matches file to `FinExcelTemplate` config
4. Each row validated against `FinExcelColumnMap` rules
5. Valid rows transformed and created via Prisma in transaction
6. Errors collected in `FinImportRowError` for reporting
7. Summary returned showing success/failure counts

### Reporting Flow
1. Scheduled jobs or manual triggers generate `FinReportSnapshot`
2. Data aggregated from finance models into JSON snapshots
3. Frontend retrieves and visualizes via charts/report components
4. Audit trail maintained in `FinAuditLog`

## Security & Tenancy
- **Multi-tenant**: Each request scoped to tenant via cookie-based routing (`erp_tenant_db`)
- **Authentication**: Cookie-based session validation
- **Authorization**: Role-based checks (`erp_user_role` cookie: `admin` / `demo`)
- **Data Isolation**: Tenant DB URL or role applied to all Prisma queries
- **Audit Trail**: All mutations logged in `FinAuditLog`

## Performance Characteristics
- **Indexing**: Strategic indexes on foreign keys and query filters
- **Pagination**: Server-side pagination on list endpoints
- **Caching**: Client-side caching via React state/SWR patterns
- **Bulk Operations**: Import/export optimized for large datasets
- **Connection Pooling**: Prisma client manages DB connections efficiently

## Extensibility Points
1. **Custom Fields**: Extend models via Prisma schema migrations
2. **New Reports**: Add `FinReportSnapshot` types and API endpoints
3. **Integration**: Webhook endpoints or additional API routes
4. **UI Enhancements**: New React components following established patterns
5. **Workflow Rules**: Extend `FinApprovalLog` for custom approval chains

## Technology Stack
- **Framework**: Next.js 13+ (App Router)
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **UI**: React + TailwindCSS + shadcn/ui
- **Charts**: Echarts/Recharts (via finance-charts component)
- **File Handling**: Excel parsing (likely SheetJS or similar)
- **State**: React hooks + SWR/fetch patterns