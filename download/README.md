# VoltCore ERP - Downloadable Project Files

## Overview

VoltCore ERP is a comprehensive Enterprise Resource Planning system designed for **Indian power plant EPC (Engineering, Procurement, Construction) contractors**. Built with modern web technologies, it provides end-to-end management across 12 functional modules.

---

## Files Included

### 1. Database Schema (MySQL)
**File:** `voltcore_erp_mysql.sql`
- Complete MySQL DDL with 34 tables
- Foreign key constraints with ON DELETE CASCADE
- Realistic Indian power plant contractor seed data
- utf8mb4 character set, InnoDB engine
- Ready to import into MySQL 8.0+

### 2. Prisma Schema
**File:** `voltcore_erp_prisma_schema.prisma`
- Prisma ORM schema matching all 34 tables
- SQLite provider (development)
- Relations, unique constraints, and default values
- Compatible with Prisma Client v6.x

### 3. Module Summary (Excel)
**File:** `voltcore_erp_module_summary.xlsx`
- **Sheet 1:** Module Overview — 12 modules with sub-modules, tables, and features
- **Sheet 2:** Database Schema — All 34 tables with field counts, key columns, and relationships
- **Sheet 3:** API Endpoints — All 33 RESTful endpoints with methods and descriptions
- **Sheet 4:** Technology Stack — Complete technology inventory

### 4. Project Documentation (PDF)
**File:** `voltcore_erp_documentation.pdf`
- Executive summary and system architecture
- Complete module reference with feature tables
- Technology stack and version details
- Setup and deployment instructions
- File structure mapping

---

## Quick Start

### Development (SQLite)
```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env
# Set: DATABASE_URL=file:./db/custom.db

# 3. Setup database
bun run db:push
bun run db:seed

# 4. Start development server
bun run dev
# Access at http://localhost:3000
```

### Production (MySQL)
```bash
# 1. Import database schema
mysql -u root -p < voltcore_erp_mysql.sql

# 2. Update environment
DATABASE_URL=mysql://user:password@host:3306/voltcore_erp

# 3. Generate Prisma client
bun run db:generate
bun run db:push

# 4. Start the application
bun run build
bun run start
```

---

## System Modules

| # | Module | Sub-Modules | Description |
|---|--------|-------------|-------------|
| 1 | **Organization** | Departments & Roles | Organizational structure and role hierarchy |
| 2 | **HRMS** | Employee Analytics, Employees, Attendance, Leave, Shift Roster, Timesheet, Payroll, Training, Recruitment | Complete HR lifecycle management |
| 3 | **Procurement** | Purchase Orders, Expenses | Procurement and expense tracking |
| 4 | **Finance** | Dashboard, Ledger, AP, AR, Journal Entries, Bank & Cash, Taxation, Budget, Financial Reports | Full financial management |
| 5 | **Projects** | All Projects, Site Map | Project and site management |
| 6 | **Inventory** | Items, Stock Movements | Warehouse and inventory control |
| 7 | **Assets** | Equipment, Work Permits, Safety & HSE, Subcontractors | Asset and safety management |
| 8 | **Sales** | Customers, Sales Orders | Sales pipeline management |
| 9 | **CRM** | Contacts | Customer relationship management |
| 10 | **System** | Reports, Settings | System administration |
| 11 | **Support** | Tickets | IT support ticket management |
| 12 | **Knowledgebase** | Articles | Documentation and knowledge management |

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 16.1.3 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| UI Library | shadcn/ui (New York) | Latest |
| State | Zustand | 5.x |
| ORM | Prisma | 6.x |
| Charts | Recharts | 2.x |
| Icons | Lucide React | Latest |
| Animations | Framer Motion | 12.x |
| Forms | React Hook Form | 7.x |
| Validation | Zod | 4.x |

---

## Database Summary

| Metric | Count |
|--------|-------|
| Database Tables | 34 |
| API Routes | 33 |
| Frontend Modules | 25+ |
| Seed Records | 1,300+ |
| Prisma Models | 34 |
| Foreign Key Relations | 12 |

---

## Key Features

- **Full CRUD** on all entities (Create, Read, Update, Delete)
- **Auto-generated IDs** for invoices, purchase orders, projects, employees
- **Approval workflows** for leave requests and expense claims
- **Real-time KPI dashboards** with charts (Employee Analytics, Finance Dashboard)
- **Dark industrial theme** optimized for field use
- **Mobile-responsive** design with collapsible sidebar
- **Toast notifications** for all operations
- **Loading skeletons** and error states
- **Data export** capabilities via Reports module

---

## Company Context

**Company:** VoltCore Engineering Pvt. Ltd.
**Domain:** Power Plant EPC Contractor (India)
**Sites:** Thermal power plants across Rajasthan, Gujarat, Maharashtra, Tamil Nadu, Madhya Pradesh, Karnataka
**Clients:** NTPC, Adani Power, Tata Power, NLC India, RVUNL

---

*Generated on April 2025 | Version 1.0.0*
