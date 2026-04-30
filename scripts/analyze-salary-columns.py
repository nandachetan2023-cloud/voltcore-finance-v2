#!/usr/bin/env python3
import openpyxl
import string

def get_excel_column(n):
    """Convert 1-based index to Excel column letter"""
    result = ""
    while n > 0:
        n -= 1
        result = chr(65 + (n % 26)) + result
        n //= 26
    return result

# Read non-compliance salary sheet
print("=" * 80)
print("NON-COMPLIANCE SALARY SHEET COLUMNS")
print("=" * 80)
wb1 = openpyxl.load_workbook('excels/non_compliance_Salary_sheet_marked.xlsx')
ws1 = wb1.active
salary_headers = [(i, cell.value) for i, cell in enumerate(ws1[1], 1) if cell.value]

for idx, header in salary_headers:
    col_letter = get_excel_column(idx)
    print(f"{col_letter:4} (Col {idx:2}) | {header}")

# Read employee template
print("\n" + "=" * 80)
print("EMPLOYEE IMPORT TEMPLATE COLUMNS")
print("=" * 80)
wb2 = openpyxl.load_workbook('excels/employees.xlsx')
ws2 = wb2.active
emp_headers = [(i, cell.value) for i, cell in enumerate(ws2[1], 1) if cell.value]

for idx, header in emp_headers:
    col_letter = get_excel_column(idx)
    print(f"{col_letter:4} (Col {idx:2}) | {header}")

# Compare
print("\n" + "=" * 80)
print("COMPARISON ANALYSIS")
print("=" * 80)

# Personal detail columns in salary sheet
personal_cols_salary = [
    ('A', 'SL NO.'),
    ('B', 'WORKMEN SL. NO.'),
    ('C', 'TOKEN NO.'),
    ('D', 'NAME OF EMPLOYEE'),
    ('E', "FATHER'S NAME"),
    ('F', 'DOJ'),
    ('G', 'DOB'),
    ('H', 'BANK NAME'),
    ('I', 'ACCOUNT NO.'),
    ('J', 'IFSC CODE NO.'),
    ('L', 'UAN NO.'),
    ('M', 'ESIC IP NO'),
    ('N', 'DESIGNATION'),
    ('O', 'DEPARTMENT'),
    ('P', 'NATURE OF DESIGNATION'),
]

# Personal detail columns in employee template
personal_cols_emp = {
    'Sl.No.': 1,
    'Employee ID': 2,
    'Name of Employee': 3,
    "Father's Name": 5,
    'Date of Birth': 10,
    'Date of Joining': 24,
    'Bank Name': 27,
    'Bank A/C No.': 29,
    'IFSC Code': 30,
    'ESIC': 31,
    'UAN': 32,
    'Department': 18,
    'Designation': 19,
}

print("\n📋 PERSONAL DETAIL COLUMNS COMPARISON:\n")
print("Column | Salary Sheet Name          | In Employee Template? | Employee Template Column")
print("-" * 100)

for col, name in personal_cols_salary:
    # Try to find matching column in employee template
    found = False
    emp_col = ""
    for emp_name, emp_idx in personal_cols_emp.items():
        if name.upper().replace("'", "") in emp_name.upper().replace("'", "") or \
           emp_name.upper().replace("'", "") in name.upper().replace("'", ""):
            found = True
            emp_col = f"{get_excel_column(emp_idx)} ({emp_name})"
            break
    
    status = "✅ YES" if found else "❌ MISSING"
    print(f"{col:6} | {name:26} | {status:21} | {emp_col}")

print("\n" + "=" * 80)
print("MISSING COLUMNS IN EMPLOYEE TEMPLATE")
print("=" * 80)
missing = []
for col, name in personal_cols_salary:
    found = False
    for emp_name in personal_cols_emp.keys():
        if name.upper().replace("'", "") in emp_name.upper().replace("'", "") or \
           emp_name.upper().replace("'", "") in name.upper().replace("'", ""):
            found = True
            break
    if not found:
        missing.append((col, name))

if missing:
    for col, name in missing:
        print(f"❌ Column {col}: {name}")
else:
    print("✅ All personal detail columns are present!")

print("\n" + "=" * 80)
print("COLUMNS THAT CAN BE CALCULATED OR FETCHED")
print("=" * 80)
print("\nNote: You mentioned columns Y, Z, AA, AB, AC will be provided.")
print("Let me identify which columns can be calculated from those:\n")

# Identify calculation columns
calc_columns = [
    ('Q', 'MONTHLY GROSS SALARY', 'Can be fetched from Employee.salaryStructure'),
    ('R', 'ACTUAL ATTENDANCE', 'Can be calculated from AttendanceLog'),
    ('S', 'EXTRA DAYS', 'Can be calculated from AttendanceLog'),
    ('T', 'PH DAYS', 'Can be calculated from Holiday table'),
    ('U', 'ACTUAL EARN WAGES', 'CALCULATED: (ACTUAL ATTENDANCE × BASIC WAGES/DAY)'),
    ('V', 'ACTUAL OT HRS', 'Can be calculated from AttendanceLog OT hours'),
    ('W', 'ACTUAL OT AMOUNT', 'CALCULATED: (ACTUAL OT HRS × OT rate)'),
    ('X', 'GROSS EARN WAGES', 'CALCULATED: ACTUAL EARN WAGES + ACTUAL OT AMOUNT'),
    ('Y', 'BASIC WAGES/DAY', '✅ PROVIDED (input)'),
    ('Z', 'MONTHLY WORKING DAYS', '✅ PROVIDED (input)'),
    ('AA', 'OT. HRS', '✅ PROVIDED (input)'),
    ('AB', 'ATTENDANCE', '✅ PROVIDED (input)'),
    ('AC', 'PH', '✅ PROVIDED (input)'),
    ('AD', 'WAGES/MONTH', 'CALCULATED: BASIC WAGES/DAY × MONTHLY WORKING DAYS'),
    ('AE', 'EARN WAGES', 'CALCULATED: BASIC WAGES/DAY × ATTENDANCE'),
    ('AF', 'PH AMOUNT', 'CALCULATED: BASIC WAGES/DAY × PH'),
    ('AG', 'TOTAL EARN WAGES', 'CALCULATED: EARN WAGES + PH AMOUNT'),
    ('AH', 'OT HRS PAYMENT', 'CALCULATED: OT HRS × OT rate'),
    ('AI', 'TOTAL NETT PAYBLE', 'CALCULATED: TOTAL EARN WAGES + OT HRS PAYMENT'),
    ('AJ', 'EPF', 'CALCULATED: 12% of Basic (if applicable)'),
    ('AK', 'ESIC', 'CALCULATED: 0.75% of Gross (if applicable)'),
    ('AL', 'PT', 'CALCULATED: Based on state PT slab'),
    ('AM', 'TOTAL DEDUCTION', 'CALCULATED: EPF + ESIC + PT'),
    ('AN', 'NETT PAYBLE', 'CALCULATED: TOTAL NETT PAYBLE - TOTAL DEDUCTION'),
]

for col, name, source in calc_columns:
    print(f"{col:4} | {name:25} | {source}")

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print(f"\n✅ Personal details that can be FETCHED from Employee table:")
print("   - Name, Father's Name, DOJ, DOB")
print("   - Bank Name, Account No, IFSC Code")
print("   - UAN, ESIC, Department, Designation")
print(f"\n❌ Personal details MISSING from Employee template:")
print("   - WORKMEN SL. NO.")
print("   - TOKEN NO.")
print("   - NATURE OF DESIGNATION")
print(f"\n🧮 Salary columns that can be CALCULATED:")
print("   - All wage calculations (columns U, W, X, AD-AN)")
print("   - Deductions (EPF, ESIC, PT)")
print("   - Net payable amounts")
print(f"\n📥 Salary columns that need to be PROVIDED (Y, Z, AA, AB, AC):")
print("   - BASIC WAGES/DAY")
print("   - MONTHLY WORKING DAYS")
print("   - OT. HRS")
print("   - ATTENDANCE")
print("   - PH")
