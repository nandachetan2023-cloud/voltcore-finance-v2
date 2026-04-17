# Compliance vs Non-Compliance Payroll Separation

## Summary of Changes

I've updated your payroll system to properly separate compliance and non-compliance formats:

### Compliance Format (FORM XVII/XIII)
- **24 columns** - Statutory compliance format
- **Template updated** to match `excels/compliance_example.xlsx`
- **Key identifier**: "Name of the workman" (column 2)
- **Sheet name**: "Compliance Salary Sheet"
- **Use case**: Government submissions, EPF/ESIC returns, statutory reporting

### Non-Compliance Format  
- **68 columns** - Detailed internal format
- **Key identifier**: "TOKEN NO." (column 3)
- **Sheet name**: "COMBINED SALARY SHEET"
- **Use case**: Internal payroll processing, detailed salary breakdowns

## Files Modified

### 1. Compliance Template API
- **File**: `src/app/api/payroll/salary-compliance-template/route.ts`
- **Changes**: Updated to generate 24-column FORM XVII/XIII format
- **Headers**: Matches compliance_example.xlsx exactly

### Next Steps Required

1. **Create Non-Compliance Template API**
   - Path: `src/app/api/payroll/salary-non-compliance-template/route.ts`
   - Format: 68-column detailed format

2. **Create Non-Compliance Bulk Import Component**
   - Path: `src/components/erp/salary-non-compliance-bulk-import.tsx`
   - Uses 68-column format and TOKEN NO. as identifier

3. **Update Compliance Import API**
   - Path: `src/app/api/payroll/salary-compliance-import/route.ts`
   - Parse 24-column format instead of 68-column

4. **Create Non-Compliance Import API**
   - Path: `src/app/api/payroll/salary-non-compliance-import/route.ts`
   - Parse 68-column format

5. **Update Payroll Pages**
   - `src/components/erp/payroll-compliance.tsx` - Use compliance bulk import
   - `src/components/erp/payroll-non-compliance.tsx` - Use non-compliance bulk import

6. **Add Search & Download for Compliance**
   - Compliance page needs search/download functionality for compliance sheets only
   - Non-compliance page already has search/download for non-compliance sheets

## Column Mapping

### Compliance (24 columns)
1. Sl. No.
2. Name of the workman ← **KEY FIELD**
3. Site
4. UAN
5. IP NO.
6. Designation
7. TOTAL NO OF DAYS WORKED
8. O.Thours
9. no.of work done
10. daily rate of wages/piece rate/monthly
11. Basic wages in Rs
12. Dearness allowances in Rs
13. Overtime in Rs
14. Othercash payment in Rs
15. TOTAL WAGES FOR ESI DEDUCTION(TNP)
16. E.P.F in Rs
17. E.S.I in Rs
18. House rent in Rs
19. Other deduction in Rs(PT)
20. Total deduction in Rs
21. Net amount paid in Rs
22. Time&date of payment
23. Place of payment
24. Signature or thumb Impression of workmen

### Non-Compliance (68 columns)
- Columns 1-2: Serial numbers
- Column 3: TOKEN NO. ← **KEY FIELD**
- Columns 4-68: Detailed salary breakdown (as per current implementation)

## Implementation Status

✅ Compliance template API updated (24-column format)
⏳ Need to create non-compliance template API (68-column format)
⏳ Need to create separate bulk import components
⏳ Need to update import APIs to handle correct formats
⏳ Need to update payroll pages to use correct components
