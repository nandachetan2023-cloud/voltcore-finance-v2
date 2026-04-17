# Payroll Unified View - Implementation Guide

## Overview

The payroll system now features a unified interface with three distinct views accessible via tabs:

1. **Non-Compliance Payroll** - Detailed internal payroll management (68-column format)
2. **Compliance Payroll** - Statutory compliance-focused view (32-column format)
3. **Generate Excel** - Flexible Excel generation with filters

## Architecture

### Main Component
**File:** `src/components/erp/payroll-unified.tsx`

This is the parent component that manages the tab navigation and renders the appropriate child component based on the selected view.

### Child Components

1. **Non-Compliance View**
   - **File:** `src/components/erp/payroll-non-compliance.tsx`
   - **Purpose:** Internal payroll processing
   - **Features:**
     - View all payroll runs
     - Download payslips (PDF)
     - Download non-compliance sheets (68 columns)
     - Bulk import salary data
     - Search and download payslips

2. **Compliance View**
   - **File:** `src/components/erp/payroll-compliance.tsx`
   - **Purpose:** Statutory compliance reporting
   - **Features:**
     - View all payroll runs
     - Download compliance sheets (32 columns)
     - Simplified view focused on statutory requirements
     - EPF/ESIC/PT reporting ready

3. **Generate Excel View**
   - **File:** `src/components/erp/payroll-generate.tsx`
   - **Purpose:** Flexible Excel generation
   - **Features:**
     - Choose format (Compliance/Non-Compliance)
     - Select period (Month/Year)
     - Apply filters (Department, Designation, Branch, Employee)
     - Include/exclude inactive employees

## User Interface

### Tab Navigation

The interface features a prominent tab bar with three options:

```
┌─────────────────────────────────────────────────────────────┐
│ [Non-Compliance Payroll] [Compliance Payroll] [Generate Excel] │
└─────────────────────────────────────────────────────────────┘
```

**Visual Indicators:**
- **Non-Compliance Tab:** Orange highlight (#f5a623) when active
- **Compliance Tab:** Green highlight (#00e676) when active
- **Generate Excel Tab:** Cyan highlight (#00d4ff) when active

### View 1: Non-Compliance Payroll

**Color Theme:** Orange (#f5a623)

**Layout:**
- Stats cards showing total runs, employees, gross, and net amounts
- Payroll runs table with columns:
  - Run Name
  - Month/Year
  - Employees
  - Total Gross
  - Total Net
  - Status
  - Actions (View, Payslips, Sheet)

**Actions:**
- **View:** Opens detailed modal with employee-wise breakdown
- **Payslips:** Downloads all payslips as ZIP (PDF format)
- **Sheet:** Downloads non-compliance Excel (68 columns)
- **Search & Download Payslips:** Search by month/year and download specific payslips

**Use Cases:**
- Daily payroll operations
- Internal salary processing
- Detailed employee compensation analysis
- Payslip distribution

### View 2: Compliance Payroll

**Color Theme:** Green (#00e676)

**Layout:**
- Info banner explaining compliance focus
- Stats cards (same as non-compliance)
- Payroll runs table with columns:
  - Run Name
  - Month/Year
  - Employees
  - Total Gross
  - Total Net
  - Status
  - Actions (View, Compliance Sheet)

**Actions:**
- **View:** Opens detailed modal with simplified employee view
- **Compliance Sheet:** Downloads compliance Excel (32 columns)

**Use Cases:**
- Government submissions
- EPF/ESIC returns
- Labor compliance audits
- Statutory reporting
- External audits

### View 3: Generate Excel

**Color Theme:** Cyan (#00d4ff)

**Layout:**
- Info banner explaining Excel generation
- Format selection cards (Compliance/Non-Compliance)
- Period selection (Month/Year dropdowns)
- Filter section:
  - Department dropdown
  - Designation dropdown
  - Branch dropdown
  - Employee dropdown
  - Include inactive checkbox
- Action buttons (Generate Excel, Reset)
- Format information cards

**Actions:**
- **Generate Excel:** Creates and downloads filtered Excel file
- **Reset:** Clears all filters and resets to defaults

**Use Cases:**
- Custom payroll reports
- Department-wise analysis
- Branch-specific reports
- Individual employee records
- Historical data extraction

## Key Differences Between Views

| Feature | Non-Compliance | Compliance | Generate Excel |
|---------|---------------|------------|----------------|
| **Primary Use** | Internal operations | Statutory reporting | Custom reports |
| **Excel Format** | 68 columns | 32 columns | User choice |
| **Payslip Download** | ✅ Yes | ❌ No | ❌ No |
| **Bulk Import** | ✅ Yes | ✅ Yes | ❌ No |
| **Filters** | ❌ No | ❌ No | ✅ Yes |
| **Color Theme** | Orange | Green | Cyan |
| **Focus** | Detailed | Simplified | Flexible |

## Workflow Examples

### Workflow 1: Monthly Payroll Processing

1. Navigate to **Non-Compliance Payroll** tab
2. View the latest payroll run
3. Click "View" to review employee details
4. Click "Payslips" to download all payslips
5. Click "Sheet" to download detailed Excel for records

### Workflow 2: Government Submission

1. Navigate to **Compliance Payroll** tab
2. Locate the payroll run for the submission period
3. Click "Compliance Sheet" to download 32-column Excel
4. Submit the downloaded file to government portal

### Workflow 3: Department Analysis

1. Navigate to **Generate Excel** tab
2. Select format: Non-Compliance (for detailed data)
3. Select period: April 2026
4. Select filter: IT Department
5. Click "Generate Excel"
6. Analyze the downloaded department-specific report

### Workflow 4: Branch Comparison

1. Navigate to **Generate Excel** tab
2. Select format: Compliance (for simplified comparison)
3. Select period: March 2026
4. Generate Excel for Branch A
5. Generate Excel for Branch B
6. Compare the two reports

### Workflow 5: Individual Employee Record

1. Navigate to **Generate Excel** tab
2. Select format: Compliance
3. Select period: Any month
4. Select employee: Specific employee
5. Click "Generate Excel"
6. Get single-employee payroll record

## Technical Implementation

### State Management

Each view maintains its own state independently:

```typescript
// payroll-unified.tsx
const [activeView, setActiveView] = useState<ViewMode>('non-compliance');

// Each child component has its own state
// No shared state between views
```

### Data Fetching

Each view fetches its own data:
- **Non-Compliance & Compliance:** Fetch from `/api/payroll`
- **Generate Excel:** Fetches dropdown data from various APIs

### API Endpoints Used

**Non-Compliance View:**
- `GET /api/payroll` - Fetch payroll runs
- `POST /api/payroll/generate-payslips` - Single payslip
- `POST /api/payroll/generate-payslips-bulk` - Bulk payslips
- `POST /api/payroll/salary-sheet` - Non-compliance Excel

**Compliance View:**
- `GET /api/payroll` - Fetch payroll runs
- `GET /api/payroll/generate-excel?format=compliance` - Compliance Excel

**Generate Excel View:**
- `GET /api/departments` - Department list
- `GET /api/designations` - Designation list
- `GET /api/branches` - Branch list
- `GET /api/employees` - Employee list
- `GET /api/payroll/generate-excel` - Generate filtered Excel

## Benefits

### For HR Team
- **Single Interface:** All payroll functions in one place
- **Clear Separation:** Different views for different purposes
- **Quick Switching:** Easy tab navigation
- **Reduced Confusion:** Each view shows only relevant actions

### For Finance Team
- **Flexible Reporting:** Generate custom reports easily
- **Format Choice:** Pick the right format for the task
- **Filter Options:** Analyze specific segments
- **Quick Downloads:** One-click Excel generation

### For Compliance Team
- **Dedicated View:** Compliance-focused interface
- **Simplified Actions:** Only compliance-relevant buttons
- **Clear Purpose:** No confusion with internal operations
- **Audit Ready:** Compliance sheets always available

### For Management
- **Overview:** See all payroll data in one place
- **Flexibility:** Switch between views as needed
- **Efficiency:** No need to navigate multiple pages
- **Consistency:** Unified design across all views

## Customization

### Adding a New View

To add a fourth view (e.g., "Analytics"):

1. Create component: `src/components/erp/payroll-analytics.tsx`
2. Update type in `payroll-unified.tsx`:
   ```typescript
   type ViewMode = 'non-compliance' | 'compliance' | 'generator' | 'analytics';
   ```
3. Add tab button:
   ```typescript
   <button onClick={() => setActiveView('analytics')}>
     Analytics
   </button>
   ```
4. Add conditional render:
   ```typescript
   {activeView === 'analytics' && <PayrollAnalytics />}
   ```

### Changing Tab Colors

Edit the tab button classes in `payroll-unified.tsx`:

```typescript
// Non-Compliance: bg-[#f5a623] (orange)
// Compliance: bg-[#00e676] (green)
// Generator: bg-[#00d4ff] (cyan)
```

### Modifying View Content

Each view is independent. Edit the respective component file:
- Non-Compliance: `payroll-non-compliance.tsx`
- Compliance: `payroll-compliance.tsx`
- Generator: `payroll-generate.tsx`

## Migration Notes

### From Old System

The old `payroll-new.tsx` has been:
1. Copied to `payroll-non-compliance.tsx`
2. Wrapped in `payroll-unified.tsx`
3. Module registry updated to use `payroll-unified`

### Backward Compatibility

- All existing functionality preserved
- Same API endpoints used
- No database changes required
- Existing payroll data works as-is

## Testing Checklist

- [ ] Tab navigation works smoothly
- [ ] Non-Compliance view loads correctly
- [ ] Compliance view loads correctly
- [ ] Generate Excel view loads correctly
- [ ] Active tab is visually highlighted
- [ ] Each view maintains its own state
- [ ] Switching tabs doesn't lose data
- [ ] All buttons in Non-Compliance work
- [ ] All buttons in Compliance work
- [ ] All filters in Generate Excel work
- [ ] Excel downloads work from all views
- [ ] Payslip downloads work
- [ ] Bulk import works
- [ ] View modals open correctly
- [ ] Responsive design works on mobile

## Troubleshooting

### Issue: Tabs not switching
**Solution:** Check browser console for errors, verify component imports

### Issue: View shows old data
**Solution:** Each view fetches independently, check API responses

### Issue: Excel download fails
**Solution:** Verify API endpoint is correct for the selected view

### Issue: Styling looks wrong
**Solution:** Check Tailwind classes, verify color codes

---

**Status:** Fully Implemented ✅

**Files Created:**
- `src/components/erp/payroll-unified.tsx` - Main unified component
- `src/components/erp/payroll-compliance.tsx` - Compliance view
- `src/components/erp/payroll-non-compliance.tsx` - Non-compliance view (copy of payroll-new)

**Files Modified:**
- `src/components/erp/module-registry.tsx` - Updated to use unified component

**Files Preserved:**
- `src/components/erp/payroll-new.tsx` - Original file kept for reference
- `src/components/erp/payroll-generate.tsx` - Standalone generator component
