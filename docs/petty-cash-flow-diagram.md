# Petty Cash Management — Flow Diagram

## 1. Process Flow

```mermaid
flowchart TD
    A[Cash Issued from Bank<br/>FinPettyCash: Credit Entry] --> B[Petty Cash Custodian<br/>Receives Cash]
    B --> C[Site Incharge / Store Incharge<br/>Makes Expenses]
    C --> D[Expense Voucher Created<br/>FinPettyCash: Debit Entry]
    D --> E[Bill Upload<br/>Bill Attachment]
    E --> F{Approval<br/>FinApprovalLog}
    F -->|Approved| G[Petty Cash Settlement<br/>Update balance]
    F -->|Rejected| H[Return to Custodian<br/>for correction]
    H --> D
    G --> I[Reconciliation<br/>FinExpenseClaim]
    I --> J[GL Posting<br/>FinJournalEntry + FinJournalLine]
    J --> K[Reports<br/>Daily / Summary / Employee Wise]
```

## 2. Detailed State Machine

```mermaid
stateDiagram-v2
    [*] --> CashIssued: Bank Transfer / Cheque / Cash
    CashIssued --> Open: Voucher Created
    Open --> PartiallySettled: Expense Added
    PartiallySettled --> PartiallySettled: More Expenses
    PartiallySettled --> Settled: All Expenses + Approval
    Settled --> Reconciled: GL Posted
    Reconciled --> [*]
    PartiallySettled --> Cancelled: Cancelled
    Settled --> Cancelled: Reversed
```

## 3. Data Flow (Entities)

```mermaid
erDiagram
    FinPettyCash ||--o| FinExpenseClaim : "linked via expenseClaimId"
    FinPettyCash ||--o| FinPurchaseOrder : "linked via poId"
    FinPettyCash }|--|| FinSite : "siteId"
    FinPettyCash }|--|| FinParty : "partyId (custodian)"
    FinExpenseClaim ||--|{ FinExpenseItem : "items"
    FinExpenseClaim ||--|{ FinApprovalLog : "approvals"
    FinPettyCash }|--|| BankAccount : "bankAccount (for replenishment)"
    FinPettyCash ||--o| FinJournalEntry : "generates GL entries"
```

## 4. Daily Cash Report Format

| Date | Opening Balance | Cash Issued | Expenses | Closing Balance |
|------|----------------|-------------|----------|-----------------|
| 2025-01-15 | 50,000 | 20,000 | 5,000 | 15,000 |
| 2025-01-16 | 15,000 | 10,000 | 3,500 | 11,500 |

## 5. Petty Cash Summary (Site Wise)

| Site Code | Site Name | Cash Given | Expenses | Balance |
|-----------|-----------|------------|----------|---------|
| SITE-001 | Kalisindh | 50,000 | 35,000 | 15,000 |
| SITE-002 | Mundra | 30,000 | 28,000 | 2,000 |

## 6. Employee Wise Settlement

| Employee | Advance | Expenses | Balance |
|----------|---------|----------|---------|
| Rajesh Kumar | 5,000 | 4,500 | 500 |
| Amit Patel | 3,000 | 3,000 | 0 |

## 7. Approval Workflow

```mermaid
flowchart LR
    A[Maker<br/>Site Incharge] -->|Submit| B[Checker<br/>Finance Head]
    B -->|Approve| C[Finance Executive<br/>Process Payment]
    B -->|Reject| A
    C --> D[Accountant<br/>GL Posting]
    D --> E[Completed]
```

## 8. Petty Cash Categories

```mermaid
mindmap
  root((Petty Cash))
    Site Expenses
      Tea & Snacks
      Local Conveyance
      Auto Fare
      Diesel
      Stationery
      Courier
      Labour Welfare
      Emergency Purchases
    Office Expenses
      Stationery
      Courier
      Tea & Snacks
    Vehicle Expenses
      Diesel
      Local Conveyance
```

## 9. Limits & Controls

| Role | Limit Authority |
|------|----------------|
| Site Incharge | Up to ₹5,000 |
| Store Incharge | Up to ₹10,000 |
| Admin Executive | Up to ₹25,000 |
| Finance Head | Above ₹25,000 |

## 10. Integration Points

| Module | Integration |
|--------|-------------|
| **Bank & Cash** | Cash Issued from Bank → Petty Cash |
| **Accounts Payable** | Payment to Vendor via Petty Cash |
| **Expense Claims** | Petty Cash linked to Expense Claims |
| **Purchase Orders** | Emergency Purchases linked to PO |
| **General Ledger** | Auto-posting to GL on settlement |
| **Taxation** | GST on petty cash purchases tracked via `FinTdsDeduction` |
