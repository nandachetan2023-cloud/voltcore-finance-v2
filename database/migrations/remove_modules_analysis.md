# Database Migration Analysis - Module Removal

## Current Situation

### Modules Removed from UI/API:
1. Inventory
2. Sales  
3. CRM
4. Support
5. Knowledgebase
6. Downloads

### Database Tables Analysis:

#### Tables with NO dependencies (safe to drop):
- **Lead** - CRM module only
- **LeadActivity** - CRM module only

#### Tables with dependencies on Invoice module (CANNOT drop without breaking Invoice):
- **Customer** - Used by Invoice, Quotation, SalesOrder
- **Item** - Used by Invoice, Quotation, SalesOrder, PurchaseOrder, StockEntry
- **ItemCategory** - Used by Item
- **SalesOrder** - Used by Invoice
- **SalesOrderItem** - Used by SalesOrder
- **Quotation** - Used by SalesOrder
- **QuotationItem** - Used by Quotation
- **StockLedger** - Inventory tracking
- **StockEntry** - Inventory tracking
- **StockEntryLine** - Inventory tracking
- **Warehouse** - Used by StockEntry, StockLedger

#### Tables that don't exist (stub modules):
- Support/Ticket tables - Not in schema
- Knowledgebase tables - Not in schema
- Downloads tables - Not in schema

## Options:

### Option 1: Conservative Approach (RECOMMENDED)
**Drop only CRM tables that have no dependencies:**
- Drop `LeadActivity` table
- Drop `Lead` table

**Keep all other tables** because:
- Invoice module depends on Customer, Item, SalesOrder
- Purchase Orders depend on Item
- Future modules may need these tables

### Option 2: Aggressive Approach (BREAKS INVOICE MODULE)
**Drop all tables related to removed modules:**
- Drop all Inventory tables (Item, ItemCategory, StockLedger, StockEntry, etc.)
- Drop all Sales tables (Customer, SalesOrder, Quotation, etc.)
- Drop all CRM tables (Lead, LeadActivity)

**Consequences:**
- Invoice module will break completely
- Purchase Orders will break
- Need to refactor Invoice to work without these dependencies
- Requires additional code changes

## Recommendation

**Use Option 1** - Only drop Lead and LeadActivity tables since:
1. They have no dependencies
2. Won't break any existing functionality
3. Other tables serve multiple modules
4. You can always drop more tables later after refactoring Invoice

Would you like me to proceed with Option 1 or Option 2?
