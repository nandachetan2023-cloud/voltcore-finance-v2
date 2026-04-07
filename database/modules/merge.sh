#!/bin/bash
OUTFILE="/home/z/my-project/database/voltcore_erp_mysql.sql"

# File merge order (respecting FK dependencies)
FILES=(
  module_01_settings.sql     # CompanySettings (no FK)
  module_03_dept_desig.sql   # Department, Designation (root tables)
  module_02_users.sql         # Role, Permission, User
  module_04_employees.sql     # Employee (FK→Department)
  module_16_projects.sql      # Project, Task, Milestone, ProjectResource
  module_10_inventory.sql     # Warehouse, InventoryItem, StockMovement
  module_12_purchases.sql     # Vendor, PurchaseOrder, POItem, GoodsReceipt
  module_13_sales.sql         # Customer, Quotation, SalesOrder
  module_05_attendance.sql    # Attendance, PunchLog (FK→Employee)
  module_06_leave.sql         # LeaveRequest, LeaveBalance (FK→Employee)
  module_07_payroll.sql       # Payroll (FK→Employee)
  module_08_timesheet.sql     # Timesheet, TimesheetEntry (FK→Employee)
  module_09_performance.sql   # PerformanceReview, JobOpening, Candidate
  module_11_procurement.sql   # PurchaseRequisition, RequisitionItem, VendorQuotation
  module_14_invoicing.sql     # Invoice, InvoiceItem, Payment
  module_15_crm.sql           # Lead, Enquiry, CustomerInteraction, FollowUp
  module_17_manufacturing.sql # BillOfMaterials, BOMItem, WorkOrder, ProductionOrder
  module_18_assets.sql        # Asset, AssetMaintenance, AssetAllocation, AssetDisposal
  module_19_workflow.sql      # Workflow, WorkflowStep, ReportTemplate, DashboardConfig
  module_20_finance.sql       # LedgerAccount, JournalEntry, AP, AR, Bank, Tax, Budget
)

# Count tables and inserts
TABLE_COUNT=$(rg -c "^CREATE TABLE" /home/z/my-project/database/modules/*.sql | awk -F: '{s+=$NF} END {print s}')
INSERT_COUNT=$(rg -c "^INSERT INTO" /home/z/my-project/database/modules/*.sql | awk -F: '{s+=$NF} END {print s}')

# Write header
cat > "$OUTFILE" << HEADER
-- ============================================================================
-- VoltCore ERP - Complete MySQL Database Script
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- Version : 2.0.0
-- Charset : utf8mb4 / utf8mb4_unicode_ci
-- Engine  : InnoDB
-- ============================================================================
-- Summary:
--   - ${TABLE_COUNT} tables covering: HRMS, Procurement, Inventory, Purchase
--     Management, Sales, CRM, Project Management, Manufacturing (Basic),
--     Asset Management, Reporting & Dashboards, Core System Setup,
--     Finance & Accounting
--   - Realistic Indian plant maintenance contractor mock data
--   - Foreign key constraints with ON DELETE CASCADE
--   - Proper indexing on foreign keys and unique columns
-- ============================================================================

DROP DATABASE IF EXISTS voltcore_erp;

CREATE DATABASE voltcore_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE voltcore_erp;

HEADER

# Append each module file
for f in "${FILES[@]}"; do
  echo "" >> "$OUTFILE"
  echo "-- ############################################################################" >> "$OUTFILE"
  echo "-- # MODULE: ${f}" >> "$OUTFILE"
  echo "-- ############################################################################" >> "$OUTFILE"
  echo "" >> "$OUTFILE"
  # Append file content and ensure it ends with semicolon
  cat "/home/z/my-project/database/modules/${f}" >> "$OUTFILE"
  # Ensure file ends with semicolon and newline
  if [ "$(tail -c 1 "/home/z/my-project/database/modules/${f}" | tr -d '\n')" != ";" ]; then
    echo ";" >> "$OUTFILE"
  fi
  echo "" >> "$OUTFILE"
done

# Write footer
cat >> "$OUTFILE" << FOOTER

-- ============================================================================
-- END OF DATABASE SCRIPT
-- ============================================================================
-- Tables    : ${TABLE_COUNT}
-- INSERTs   : ${INSERT_COUNT}
-- Generated : $(date '+%Y-%m-%d %H:%M:%S')
-- ============================================================================
FOOTER

echo "Merged $(echo ${FILES[@]} | wc -w) modules into $OUTFILE"
echo "File size: $(ls -lh "$OUTFILE" | awk '{print $5}')"
echo "Total lines: $(wc -l < "$OUTFILE")"
