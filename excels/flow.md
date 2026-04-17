1. The Daily Attendance & Holiday Cascade

Flow: Holiday Calendar + Biometric Sync + Shift Roster + Late Mark Rules ➔ Attendance

This pipeline determines if an employee actually did what they were supposed to do on any given day.

    The Trigger: Midnight cron job runs to evaluate the previous day, OR an employee scans their biometric device.

    The Cascade:

        Holiday Check (The Blocker): The system first checks the Holiday Calendar. If today is "Diwali" or "Christmas," the system halts negative actions. Employees without a Biometric Sync log are marked as "Holiday - Paid," not "Absent."

        Shift Roster Sync: If it's a standard workday, the system looks at the Shift Roster to see when the employee was supposed to arrive (e.g., 09:00 AM).

        Biometric Evaluation: It reads the Biometric Sync log (e.g., clocked in at 09:20 AM).

        Rule Application: It applies the Late Mark Rules. Since the employee is 20 minutes late, the system updates the Attendance module: Status: Present, isLate: true.

2. The Time-Off & Accrual Cascade

Flow: Leave Policies ➔ Leave Management ➔ Attendance

This manages the "bank account" of time off.

    The Trigger: Start of the financial year OR an employee requesting time off.

    The Cascade:

        Policy Allocation: Based on the Admin's Leave Policies, the system deposits a set number of days (e.g., 12 Sick, 15 Casual) into the employee's balance.

        Leave Management (Request): An employee requests 3 days off. The system verifies they have enough balance.

        Holiday Overlap: The system checks the Holiday Calendar. If a public holiday falls in the middle of those 3 days, it only deducts 2 days from their balance.

        Attendance Override: Once approved, the Leave Management system pushes an override to the Attendance module, marking those future dates as "On Leave" so the system doesn't flag them as "Absent" when the Biometric Sync comes up empty.

3. The Master Compensation Cascade

Flow: Designations & Grades + Attendance + Timesheet + Fine Rules ➔ Payroll

This is where all operational data converts into financial disbursement.

    The Trigger: End of the month "Generate Payroll" action.

    The Cascade:

        Base Calculation: The engine looks at Designations & Grades to pull the employee's fixed base salary, allowances, and tax bracket.

        Attendance & Fines: It scans the Attendance record for the month. It counts "Absent" days for pro-rata deductions. It then applies the Fine Rules (e.g., "3 isLate flags = 1 day salary deduction") and generates negative line items.

        Timesheet Addition: For hourly staff or overtime, it reads the Timesheet module to add positive line items (e.g., "10 hours Overtime @ 1.5x rate").

        Payroll Generation: It merges the Base, the Deductions (Fines/Absences), and Additions (Timesheets) into the final Payroll slip.

4. The Talent Lifecycle Cascade

Flow: Recruitment ➔ Designations & Grades ➔ Employees ➔ Training & Certs

    The Trigger: A candidate signs their offer letter.

    The Cascade:

        Employee Creation: Recruitment pushes the candidate into the Employees module.

        Grade Assignment: They are linked to their specific tier in Designations & Grades (which automatically sets their leave policies and payroll structure).

        Training Trigger: Training & Certs automatically assigns mandatory onboarding materials based on their specific Designation.

5. The Executive Intelligence Cascade

Flow: (All Modules) ➔ Employee Analytics

    The Trigger: Loading the dashboard.

    The Cascade: The analytics engine queries Attendance for absenteeism trends, Payroll for labor costs, Training & Certs for compliance gaps, and cross-references them against Designations & Grades to see which departments are over- or under-performing.