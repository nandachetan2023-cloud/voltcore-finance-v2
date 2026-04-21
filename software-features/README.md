# VoltCore ERP — Software Features Documentation

This folder documents all implemented modules and sub-modules of the VoltCore ERP system.

## Modules Covered

| File | Module |
|---|---|
| [01-organization.md](./01-organization.md) | Organization |
| [02-hrms.md](./02-hrms.md) | HRMS (Human Resource Management) |
| [03-procurement.md](./03-procurement.md) | Procurement |
| [04-my-portal.md](./04-my-portal.md) | My Portal (Employee Self-Service) |

## Architecture Notes

- **Multi-tenant**: Each company has its own PostgreSQL database. The superadmin DB manages tenants, users, roles, and approval chains.
- **Role-based access**: Module visibility is controlled by OrgRole assignments defined in the superadmin portal.
- **Approval chains**: All requests (leave, general, advance payment) follow configurable multi-step approval chains defined per role.
- **Shift-gated**: Employees without an active shift assignment are automatically marked inactive and excluded from attendance, timesheet, and payroll.
