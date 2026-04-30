# Salary Calculations from 5 Input Columns

## 📥 Input Columns (Provided by User)

| Column | Name | Example Value |
|--------|------|---------------|
| **Y** | BASIC WAGES/DAY | 612 |
| **Z** | MONTHLY WORKING DAYS | 24 |
| **AA** | OT. HRS | 17 |
| **AB** | ATTENDANCE | 20 |
| **AC** | PH (Public Holidays) | 1 |

---

## 🧮 Columns That Can Be CALCULATED

### Earnings Calculations

| Column | Name | Formula | Example |
|--------|------|---------|---------|
| **AD** | WAGES/MONTH | `Y × 26` | 612 × 26 = 15,912 |
| **AE** | EARN WAGES | `Y × AB` | 612 × 20 = 12,240 |
| **AF** | PH AMOUNT | `Y × AC` | 612 × 1 = 612 |
| **AG** | TOTAL EARN WAGES | `AE + AF` | 12,240 + 612 = 12,852 |
| **AH** | OT HRS PAYMENT | `ROUND((Y/8) × AA × 2, 0)` | ROUND((612/8) × 17 × 2, 0) = 2,601 |
| **AI** | TOTAL NETT PAYBLE | `AG + AH` | 12,852 + 2,601 = 15,453 |

### Deduction Calculations

| Column | Name | Formula | Example |
|--------|------|---------|---------|
| **AJ** | EPF | `ROUNDUP(AG × 0.12, 0)` | ROUNDUP(12,852 × 0.12, 0) = 1,543 |
| **AK** | ESIC | `ROUNDUP(AG × 0.0075, 0)` | ROUNDUP(12,852 × 0.0075, 0) = 97 |
| **AL** | PT (Professional Tax) | `IF(AI > 13,300, 125, 0)` | IF(15,453 > 13,300, 125, 0) = 125 |
| **AM** | TOTAL DEDUCTION | `AJ + AK + AL` | 1,543 + 97 + 125 = 1,765 |

### Final Net Payable

| Column | Name | Formula | Example |
|--------|------|---------|---------|
| **AN** | NETT PAYBLE | `AI - AM` | 15,453 - 1,765 = 13,688 |

---

## 📊 Complete Calculation Flow

```
INPUT:
  Y = 612 (Basic Wages/Day)
  Z = 24 (Monthly Working Days)
  AA = 17 (OT Hours)
  AB = 20 (Attendance)
  AC = 1 (PH Days)

STEP 1: Calculate Earnings
  ├─ AD (Wages/Month) = Y × 26 = 612 × 26 = 15,912
  ├─ AE (Earn Wages) = Y × AB = 612 × 20 = 12,240
  ├─ AF (PH Amount) = Y × AC = 612 × 1 = 612
  ├─ AG (Total Earn Wages) = AE + AF = 12,240 + 612 = 12,852
  ├─ AH (OT Payment) = ROUND((Y/8) × AA × 2, 0) = ROUND((612/8) × 17 × 2, 0) = 2,601
  └─ AI (Total Nett Payable) = AG + AH = 12,852 + 2,601 = 15,453

STEP 2: Calculate Deductions
  ├─ AJ (EPF) = ROUNDUP(AG × 0.12, 0) = ROUNDUP(12,852 × 0.12, 0) = 1,543
  ├─ AK (ESIC) = ROUNDUP(AG × 0.0075, 0) = ROUNDUP(12,852 × 0.0075, 0) = 97
  ├─ AL (PT) = IF(AI > 13,300, 125, 0) = 125
  └─ AM (Total Deduction) = AJ + AK + AL = 1,543 + 97 + 125 = 1,765

STEP 3: Calculate Final Net
  └─ AN (Nett Payable) = AI - AM = 15,453 - 1,765 = 13,688
```

---

## 🔍 Formula Details

### OT Hours Payment (AH)
```
Formula: ROUND((Y/8) × AA × 2, 0)

Logic:
- Y/8 = Hourly rate (daily wage ÷ 8 hours)
- × AA = Multiply by OT hours
- × 2 = OT rate is 2x the normal hourly rate
- ROUND(..., 0) = Round to nearest whole number

Example:
- Daily wage = 612
- Hourly rate = 612/8 = 76.5
- OT hours = 17
- OT payment = 76.5 × 17 × 2 = 2,601
```

### EPF (AJ)
```
Formula: ROUNDUP(AG × 0.12, 0)

Logic:
- 12% of Total Earn Wages
- ROUNDUP = Always round up to next whole number

Example:
- Total Earn Wages = 12,852
- EPF = 12,852 × 0.12 = 1,542.24 → ROUNDUP = 1,543
```

### ESIC (AK)
```
Formula: ROUNDUP(AG × 0.0075, 0)

Logic:
- 0.75% of Total Earn Wages
- ROUNDUP = Always round up to next whole number

Example:
- Total Earn Wages = 12,852
- ESIC = 12,852 × 0.0075 = 96.39 → ROUNDUP = 97
```

### Professional Tax (AL)
```
Formula: IF(AI > 13,300, 125, 0)

Logic:
- If Total Nett Payable > 13,300, then PT = 125
- Otherwise PT = 0

Example:
- Total Nett Payable = 15,453
- Since 15,453 > 13,300, PT = 125
```

---

## 📋 Summary

### Total Calculable Columns: **11 columns**

| Type | Columns | Count |
|------|---------|-------|
| **Earnings** | AD, AE, AF, AG, AH, AI | 6 |
| **Deductions** | AJ, AK, AL, AM | 4 |
| **Final Net** | AN | 1 |

### Key Constants Used:
- **26** = Standard monthly working days (used in AD formula)
- **8** = Hours per day (used in OT calculation)
- **2** = OT multiplier (2x normal rate)
- **0.12** = EPF rate (12%)
- **0.0075** = ESIC rate (0.75%)
- **13,300** = PT threshold
- **125** = PT amount

---

## ⚠️ Important Notes

1. **WAGES/MONTH (AD)** uses a fixed value of **26** days, not the input Z (Monthly Working Days)
   - Formula: `Y × 26` (not `Y × Z`)

2. **OT Rate** is calculated as **2x the hourly rate**
   - Hourly rate = Daily wage ÷ 8 hours
   - OT payment = Hourly rate × OT hours × 2

3. **PT (Professional Tax)** has a threshold of **₹13,300**
   - If Total Nett Payable > ₹13,300, PT = ₹125
   - Otherwise, PT = ₹0

4. **Rounding**:
   - EPF and ESIC use `ROUNDUP` (always round up)
   - OT payment uses `ROUND` (round to nearest)

---

## 💻 Implementation Code Example

```typescript
interface SalaryInputs {
  basicWagesPerDay: number;    // Y
  monthlyWorkingDays: number;  // Z (not used in current formulas)
  otHours: number;             // AA
  attendance: number;          // AB
  phDays: number;              // AC
}

interface SalaryCalculations {
  wagesPerMonth: number;       // AD
  earnWages: number;           // AE
  phAmount: number;            // AF
  totalEarnWages: number;      // AG
  otPayment: number;           // AH
  totalNettPayable: number;    // AI
  epf: number;                 // AJ
  esic: number;                // AK
  pt: number;                  // AL
  totalDeduction: number;      // AM
  nettPayable: number;         // AN
}

function calculateSalary(inputs: SalaryInputs): SalaryCalculations {
  const { basicWagesPerDay: Y, otHours: AA, attendance: AB, phDays: AC } = inputs;
  
  // Earnings
  const AD = Y * 26;  // Wages/Month (fixed 26 days)
  const AE = Y * AB;  // Earn Wages
  const AF = Y * AC;  // PH Amount
  const AG = AE + AF; // Total Earn Wages
  const AH = Math.round((Y / 8) * AA * 2); // OT Payment
  const AI = AG + AH; // Total Nett Payable
  
  // Deductions
  const AJ = Math.ceil(AG * 0.12);    // EPF (12%)
  const AK = Math.ceil(AG * 0.0075);  // ESIC (0.75%)
  const AL = AI > 13300 ? 125 : 0;    // PT
  const AM = AJ + AK + AL;            // Total Deduction
  
  // Final Net
  const AN = AI - AM; // Nett Payable
  
  return {
    wagesPerMonth: AD,
    earnWages: AE,
    phAmount: AF,
    totalEarnWages: AG,
    otPayment: AH,
    totalNettPayable: AI,
    epf: AJ,
    esic: AK,
    pt: AL,
    totalDeduction: AM,
    nettPayable: AN
  };
}
```
