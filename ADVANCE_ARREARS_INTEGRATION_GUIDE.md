# Advance & Arrears Integration Guide

## Overview

This guide explains how to integrate the **ADVANCE (AS)** and **ARREARS (AT)** columns in the non-compliance salary sheet with your existing systems.

---

## 🔗 Column AS: ADVANCE

### Data Source
**EmployeeRequest System** - Automatically fetch approved advance payment requests

### Database Model
```prisma
model EmployeeRequest {
  id            Int      @id @default(autoincrement())
  employeeId    Int
  requestType   String   // "general" | "advance_payment"
  subject       String
  description   String
  amount        Decimal? @db.Decimal(15, 2)
  status        String   @default("pending")  // pending | approved | rejected
  approvedDate  DateTime?
  isDeleted     Boolean  @default(false)
  // ... other fields
}
```

### Fetching Logic

#### Option 1: Automatic Fetch (Recommended)
```typescript
async function getApprovedAdvance(
  employeeId: number,
  month: number,
  year: number
): Promise<number> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  
  const result = await prisma.employeeRequest.aggregate({
    where: {
      employeeId: employeeId,
      requestType: 'advance_payment',
      status: 'approved',
      approvedDate: {
        gte: monthStart,
        lte: monthEnd
      },
      isDeleted: false
    },
    _sum: {
      amount: true
    }
  });
  
  return result._sum.amount 
    ? parseFloat(result._sum.amount.toString()) 
    : 0;
}
```

#### Option 2: With Manual Override
```typescript
async function getAdvanceWithOverride(
  employeeId: number,
  month: number,
  year: number,
  manualAmount?: number
): Promise<{
  amount: number;
  source: 'manual' | 'system';
  requests?: any[];
}> {
  // If manual override provided, use it
  if (manualAmount !== undefined && manualAmount !== null) {
    return {
      amount: manualAmount,
      source: 'manual'
    };
  }
  
  // Otherwise fetch from system
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  
  const requests = await prisma.employeeRequest.findMany({
    where: {
      employeeId: employeeId,
      requestType: 'advance_payment',
      status: 'approved',
      approvedDate: {
        gte: monthStart,
        lte: monthEnd
      },
      isDeleted: false
    },
    select: {
      id: true,
      subject: true,
      amount: true,
      approvedDate: true
    }
  });
  
  const total = requests.reduce(
    (sum, req) => sum + (req.amount ? parseFloat(req.amount.toString()) : 0),
    0
  );
  
  return {
    amount: total,
    source: 'system',
    requests: requests
  };
}
```

### API Integration

#### Get Approved Advances
```typescript
// GET /api/employee-requests?employeeId=123&requestType=advance_payment&status=approved

const response = await fetch(
  `/api/employee-requests?employeeId=${employeeId}&requestType=advance_payment&status=approved`
);
const { data } = await response.json();

// Filter by month and sum amounts
const monthAdvances = data.filter(req => {
  const approvedDate = new Date(req.approvedDate);
  return approvedDate.getMonth() === month - 1 && 
         approvedDate.getFullYear() === year;
});

const totalAdvance = monthAdvances.reduce(
  (sum, req) => sum + (req.amount || 0), 
  0
);
```

### UI Implementation

#### Salary Sheet Generation Form
```tsx
interface SalarySheetInput {
  employeeId: number;
  // ... other inputs (Y, Z, AA, AB, AC, T, V)
  advanceOverride?: number;  // Optional manual override
  arrears?: number;          // User input
}

function SalarySheetForm() {
  const [inputs, setInputs] = useState<SalarySheetInput[]>([]);
  const [advanceData, setAdvanceData] = useState<Map<number, {
    systemAmount: number;
    requests: any[];
  }>>(new Map());
  
  // Fetch approved advances for all employees
  useEffect(() => {
    async function fetchAdvances() {
      const data = new Map();
      for (const input of inputs) {
        const advance = await getApprovedAdvance(
          input.employeeId, 
          selectedMonth, 
          selectedYear
        );
        data.set(input.employeeId, advance);
      }
      setAdvanceData(data);
    }
    fetchAdvances();
  }, [inputs, selectedMonth, selectedYear]);
  
  return (
    <div>
      {inputs.map((input, idx) => (
        <div key={input.employeeId}>
          {/* ... other input fields */}
          
          {/* Advance - Show system amount with override option */}
          <div>
            <label>Advance</label>
            <div>
              <span>System: ₹{advanceData.get(input.employeeId)?.systemAmount || 0}</span>
              <input
                type="number"
                placeholder="Override amount"
                value={input.advanceOverride || ''}
                onChange={(e) => {
                  const newInputs = [...inputs];
                  newInputs[idx].advanceOverride = parseFloat(e.target.value) || undefined;
                  setInputs(newInputs);
                }}
              />
            </div>
            {/* Show advance request details */}
            {advanceData.get(input.employeeId)?.requests.map(req => (
              <div key={req.id}>
                {req.subject}: ₹{req.amount}
              </div>
            ))}
          </div>
          
          {/* Arrears - User input only */}
          <div>
            <label>Arrears</label>
            <input
              type="number"
              placeholder="Enter arrears amount"
              value={input.arrears || ''}
              onChange={(e) => {
                const newInputs = [...inputs];
                newInputs[idx].arrears = parseFloat(e.target.value) || 0;
                setInputs(newInputs);
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 📝 Column AT: ARREARS

### Data Source
**User Input** - Manual entry by HR/Admin

### Purpose
Arrears represent amounts owed to employees from previous months:
- Salary corrections
- Pending bonuses
- Overtime payments from previous months
- Other adjustments

### Input Structure
```typescript
interface ArrearsInput {
  employeeId: number;
  amount: number;
  note?: string;  // Optional description
  month?: number;  // Which month the arrears are from
  year?: number;
}
```

### UI Implementation

#### Simple Input
```tsx
<div>
  <label>Arrears (Previous Month Dues)</label>
  <input
    type="number"
    min="0"
    step="0.01"
    placeholder="0.00"
    value={arrears}
    onChange={(e) => setArrears(parseFloat(e.target.value) || 0)}
  />
  <textarea
    placeholder="Note (optional): e.g., Bonus from last month"
    value={arrearsNote}
    onChange={(e) => setArrearsNote(e.target.value)}
  />
</div>
```

#### Advanced Input with History
```tsx
function ArrearsInput({ employeeId, value, onChange }) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  
  // Load arrears history (if you maintain a separate table)
  useEffect(() => {
    // Fetch from your arrears tracking system
    fetchArrearsHistory(employeeId).then(setHistory);
  }, [employeeId]);
  
  return (
    <div>
      <label>Arrears</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
      <button onClick={() => setShowHistory(!showHistory)}>
        View History
      </button>
      
      {showHistory && (
        <div>
          <h4>Previous Arrears</h4>
          {history.map(item => (
            <div key={item.id}>
              {item.month}/{item.year}: ₹{item.amount} - {item.note}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 Complete Integration Flow

### Step 1: Prepare Salary Sheet Data
```typescript
async function prepareSalarySheetData(
  employeeIds: number[],
  month: number,
  year: number,
  userInputs: {
    [employeeId: number]: {
      Y: number;   // Basic wages/day
      Z: number;   // Monthly working days
      AA: number;  // OT hours
      AB: number;  // Attendance
      AC: number;  // PH
      T: number;   // PH days
      V: number;   // Actual OT hours
      advanceOverride?: number;  // Optional
      arrears?: number;          // Required
    }
  }
) {
  const salaryData = [];
  
  for (const employeeId of employeeIds) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { Department: true, Designation: true }
    });
    
    if (!employee) continue;
    
    const inputs = userInputs[employeeId];
    
    // ... Calculate columns A-AN (personal details, earnings, deductions)
    
    // Fetch advance (with override option)
    const advanceData = await getAdvanceWithOverride(
      employeeId,
      month,
      year,
      inputs.advanceOverride
    );
    
    const AS = advanceData.amount;  // ADVANCE
    const AT = inputs.arrears || 0;  // ARREARS
    
    // Calculate non-compliance
    const AR = X - AM - AN;  // Total non-compliance amount
    const AU = AR - AS + AT;  // Net payable non-compliance
    const AV = AN + AU;       // Grand total
    
    salaryData.push({
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      // ... all columns A-BP
      AS: AS,
      AT: AT,
      AR: AR,
      AU: AU,
      AV: AV,
      // Metadata for audit
      advanceSource: advanceData.source,
      advanceRequests: advanceData.requests,
      arrearsNote: inputs.arrearsNote
    });
  }
  
  return salaryData;
}
```

### Step 2: Generate Excel with Advance/Arrears
```typescript
import ExcelJS from 'exceljs';

async function generateSalaryExcel(salaryData: any[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Salary Sheet');
  
  // Add headers
  worksheet.columns = [
    // ... columns A-AR
    { header: 'ADVANCE', key: 'AS', width: 12 },
    { header: 'ARREARS', key: 'AT', width: 12 },
    { header: 'NETT PAYBLE NON COMPLIANCE', key: 'AU', width: 20 },
    { header: 'GRAND TOTAL NETT PAYBLE SALARY', key: 'AV', width: 25 },
    // ... columns AW-BP
  ];
  
  // Add data rows
  salaryData.forEach(data => {
    worksheet.addRow({
      // ... all columns
      AS: data.AS,
      AT: data.AT,
      AU: data.AU,
      AV: data.AV
    });
  });
  
  // Add comments/notes for advance source
  salaryData.forEach((data, idx) => {
    const rowNum = idx + 2; // +2 for header and 0-index
    if (data.advanceSource === 'manual') {
      worksheet.getCell(`AS${rowNum}`).note = 'Manual override';
    } else if (data.advanceRequests?.length > 0) {
      const note = data.advanceRequests
        .map(req => `${req.subject}: ₹${req.amount}`)
        .join('\n');
      worksheet.getCell(`AS${rowNum}`).note = note;
    }
  });
  
  return workbook;
}
```

---

## 📊 Validation Rules

### Advance (AS)
```typescript
function validateAdvance(advance: number, netPayable: number): {
  valid: boolean;
  error?: string;
} {
  if (advance < 0) {
    return { valid: false, error: 'Advance cannot be negative' };
  }
  
  if (advance > netPayable) {
    return { 
      valid: false, 
      error: `Advance (₹${advance}) exceeds net payable (₹${netPayable})` 
    };
  }
  
  return { valid: true };
}
```

### Arrears (AT)
```typescript
function validateArrears(arrears: number): {
  valid: boolean;
  error?: string;
} {
  // Arrears can be negative (if employee owes company)
  // but typically should be positive
  
  if (Math.abs(arrears) > 100000) {
    return { 
      valid: false, 
      error: 'Arrears amount seems unusually high. Please verify.' 
    };
  }
  
  return { valid: true };
}
```

---

## 🎯 Best Practices

### 1. Advance Management
- ✅ **Auto-fetch by default**: Reduce manual errors
- ✅ **Allow manual override**: For corrections or special cases
- ✅ **Show request details**: Transparency for HR/Admin
- ✅ **Audit trail**: Log whether amount was auto-fetched or manual
- ✅ **Validation**: Ensure advance doesn't exceed net payable

### 2. Arrears Management
- ✅ **Require note/description**: Document why arrears are being paid
- ✅ **Track history**: Maintain a log of arrears payments
- ✅ **Validation**: Flag unusually high amounts
- ✅ **Approval workflow**: Consider requiring approval for large arrears
- ✅ **Reconciliation**: Match arrears with previous month's records

### 3. Reporting
- ✅ **Advance report**: Show all advance payments by month
- ✅ **Arrears report**: Track pending and paid arrears
- ✅ **Reconciliation report**: Match advances with salary deductions
- ✅ **Audit log**: Track all manual overrides and changes

---

## 📋 Implementation Checklist

### Backend
- [ ] Create function to fetch approved advances from EmployeeRequest
- [ ] Add manual override parameter for advance
- [ ] Add arrears input parameter
- [ ] Implement validation for advance and arrears
- [ ] Add audit logging for manual overrides
- [ ] Create API endpoint for advance history
- [ ] Create API endpoint for arrears history

### Frontend
- [ ] Add advance display with system amount
- [ ] Add manual override input for advance
- [ ] Show advance request details (subject, amount, date)
- [ ] Add arrears input field
- [ ] Add arrears note/description field
- [ ] Implement validation UI
- [ ] Add advance/arrears history view
- [ ] Add confirmation dialog for large amounts

### Database
- [ ] Ensure EmployeeRequest table has proper indexes
- [ ] Consider creating ArrearsLog table for tracking
- [ ] Add audit table for manual overrides

### Testing
- [ ] Test auto-fetch of approved advances
- [ ] Test manual override functionality
- [ ] Test arrears input and calculation
- [ ] Test validation rules
- [ ] Test edge cases (no advances, multiple advances, etc.)
- [ ] Test audit trail logging

---

## 🔍 Example Scenarios

### Scenario 1: Single Approved Advance
```
Employee: John Doe (ID: 123)
Month: January 2024

Approved Advances:
- Request #456: Medical Emergency - ₹5,000 (Approved: Jan 15, 2024)

Result:
AS (ADVANCE) = ₹5,000 (auto-fetched)
AT (ARREARS) = ₹0 (no arrears)
```

### Scenario 2: Multiple Advances
```
Employee: Jane Smith (ID: 456)
Month: February 2024

Approved Advances:
- Request #789: Personal Emergency - ₹3,000 (Approved: Feb 5, 2024)
- Request #790: Home Repair - ₹2,000 (Approved: Feb 20, 2024)

Result:
AS (ADVANCE) = ₹5,000 (auto-fetched, sum of both)
AT (ARREARS) = ₹0
```

### Scenario 3: Manual Override with Arrears
```
Employee: Bob Johnson (ID: 789)
Month: March 2024

Approved Advances:
- Request #801: Education - ₹4,000 (Approved: Mar 10, 2024)

Manual Override: ₹3,500 (HR adjusted due to partial repayment)
Arrears: ₹1,500 (Bonus from February)

Result:
AS (ADVANCE) = ₹3,500 (manual override)
AT (ARREARS) = ₹1,500 (user input)
```

### Scenario 4: No Advance, Only Arrears
```
Employee: Alice Williams (ID: 101)
Month: April 2024

Approved Advances: None
Arrears: ₹2,000 (Overtime payment from March)

Result:
AS (ADVANCE) = ₹0 (no approved advances)
AT (ARREARS) = ₹2,000 (user input)
```

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue 1: Advance not showing up**
- Check if request status is "approved"
- Verify approvedDate is within the salary month
- Ensure isDeleted is false
- Check if requestType is "advance_payment"

**Issue 2: Wrong advance amount**
- Verify month/year parameters
- Check for multiple approved requests
- Ensure amount field is not null

**Issue 3: Manual override not working**
- Check if override value is being passed correctly
- Verify override takes precedence over system fetch
- Check audit log for override records

---

## ✅ Summary

| Column | Source | Automatic | Manual Override | Notes |
|--------|--------|-----------|-----------------|-------|
| **AS (ADVANCE)** | EmployeeRequest table | ✅ Yes | ✅ Yes | Fetch approved advance_payment requests |
| **AT (ARREARS)** | User Input | ❌ No | ✅ Yes | Always manual entry |

**Key Points:**
1. ADVANCE is automatically fetched from approved requests
2. Manual override available for corrections
3. ARREARS is always user input
4. Both affect final net payable (AV)
5. Audit trail recommended for all manual entries

