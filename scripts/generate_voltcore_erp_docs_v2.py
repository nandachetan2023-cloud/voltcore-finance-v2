#!/usr/bin/env python3
"""Generate VoltCore ERP comprehensive project documentation PDF."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ---- Font Registration ----
FONT_PATH = "/usr/share/fonts/truetype/english/Times-New-Roman.ttf"

pdfmetrics.registerFont(TTFont("TimesNewRoman", FONT_PATH))
pdfmetrics.registerFont(TTFont("TimesNewRoman-Bold", FONT_PATH))
pdfmetrics.registerFont(TTFont("TimesNewRoman-Italic", FONT_PATH))
pdfmetrics.registerFont(TTFont("TimesNewRoman-BoldItalic", FONT_PATH))

registerFontFamily(
    "TimesNewRoman",
    normal="TimesNewRoman",
    bold="TimesNewRoman-Bold",
    italic="TimesNewRoman-Italic",
    boldItalic="TimesNewRoman-BoldItalic",
)

# ---- Color Constants ----
DARK_BLUE = HexColor("#1F4E79")
HEADER_TEXT = white
ROW_WHITE = white
ROW_ALT = HexColor("#F5F5F5")
AMBER_ACCENT = HexColor("#f5a623")
BODY_TEXT = HexColor("#1a1a1a")

# ---- Style Definitions ----
cover_title_style = ParagraphStyle(
    "CoverTitle", fontName="TimesNewRoman-Bold", fontSize=42,
    textColor=DARK_BLUE, alignment=TA_CENTER, spaceAfter=6,
)
cover_subtitle_style = ParagraphStyle(
    "CoverSubtitle", fontName="TimesNewRoman", fontSize=20,
    textColor=BODY_TEXT, alignment=TA_CENTER, spaceAfter=4,
)
cover_sub2_style = ParagraphStyle(
    "CoverSub2", fontName="TimesNewRoman", fontSize=16,
    textColor=HexColor("#555555"), alignment=TA_CENTER, spaceAfter=4,
)
cover_info_style = ParagraphStyle(
    "CoverInfo", fontName="TimesNewRoman", fontSize=14,
    textColor=BODY_TEXT, alignment=TA_CENTER, spaceAfter=4,
)
cover_small_style = ParagraphStyle(
    "CoverSmall", fontName="TimesNewRoman", fontSize=12,
    textColor=HexColor("#666666"), alignment=TA_CENTER, spaceAfter=4,
)

section_heading_style = ParagraphStyle(
    "SectionHeading", fontName="TimesNewRoman-Bold", fontSize=18,
    textColor=DARK_BLUE, spaceBefore=18, spaceAfter=10, leading=22,
)
subsection_heading_style = ParagraphStyle(
    "SubsectionHeading", fontName="TimesNewRoman-Bold", fontSize=14,
    textColor=DARK_BLUE, spaceBefore=14, spaceAfter=8, leading=18,
)
body_style = ParagraphStyle(
    "BodyText", fontName="TimesNewRoman", fontSize=11,
    textColor=BODY_TEXT, alignment=TA_JUSTIFY, spaceAfter=8,
    leading=15, firstLineIndent=0,
)
bullet_style = ParagraphStyle(
    "BulletText", fontName="TimesNewRoman", fontSize=11,
    textColor=BODY_TEXT, alignment=TA_LEFT, spaceAfter=4,
    leading=15, leftIndent=20, bulletIndent=8,
)
code_style = ParagraphStyle(
    "CodeText", fontName="TimesNewRoman", fontSize=9.5,
    textColor=HexColor("#333333"), alignment=TA_LEFT, spaceAfter=2,
    leading=13, leftIndent=16, backColor=HexColor("#F8F8F8"),
    borderPadding=4,
)

table_header_style = ParagraphStyle(
    "TableHeader", fontName="TimesNewRoman-Bold", fontSize=10,
    textColor=HEADER_TEXT, alignment=TA_CENTER, leading=13,
)
table_cell_style = ParagraphStyle(
    "TableCell", fontName="TimesNewRoman", fontSize=9.5,
    textColor=BODY_TEXT, alignment=TA_LEFT, leading=13,
)
table_cell_center = ParagraphStyle(
    "TableCellCenter", fontName="TimesNewRoman", fontSize=9.5,
    textColor=BODY_TEXT, alignment=TA_CENTER, leading=13,
)

# ---- Helper Functions ----
def heading(text, level=1):
    """Return a section or subsection heading Paragraph."""
    if level == 1:
        return Paragraph(text, section_heading_style)
    return Paragraph(text, subsection_heading_style)

def body(text):
    """Return a body text Paragraph."""
    return Paragraph(text, body_style)

def bullet(text):
    """Return a bullet-point Paragraph."""
    return Paragraph("\u2022  " + text, bullet_style)

def code_line(text):
    """Return a code-style Paragraph."""
    return Paragraph(text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), code_style)

def ph(text):
    """Return a Paragraph-wrapped cell for tables."""
    return Paragraph(str(text), table_cell_style)

def phc(text):
    """Return a Paragraph-wrapped centered cell for tables."""
    return Paragraph(str(text), table_cell_center)

def phh(text):
    """Return a Paragraph-wrapped header cell for tables."""
    return Paragraph(str(text), table_header_style)


def make_table(headers, rows, col_widths=None):
    """Build a styled table with all cells wrapped in Paragraphs."""
    header_row = [phh(h) for h in headers]
    data = [header_row]
    for row in rows:
        data.append([ph(c) for c in row])

    available_width = letter[0] - 2 * inch
    if col_widths is None:
        n = len(headers)
        col_widths = [available_width / n] * n

    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), DARK_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), HEADER_TEXT),
        ("FONTNAME", (0, 0), (-1, 0), "TimesNewRoman-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#CCCCCC")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 1), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = ROW_ALT if i % 2 == 0 else ROW_WHITE
        style_cmds.append(("BACKGROUND", (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t


# ---- Build the Document ----
import os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "download", "voltcore_erp_documentation.pdf")

doc = SimpleDocTemplate(
    OUTPUT_PATH,
    pagesize=letter,
    topMargin=0.75 * inch,
    bottomMargin=0.75 * inch,
    leftMargin=1 * inch,
    rightMargin=1 * inch,
    title="VoltCore ERP Documentation",
    author="Z.ai",
    creator="Z.ai",
    subject="VoltCore ERP system documentation for power plant EPC contractors",
)

story = []

# ===================== COVER PAGE =====================
story.append(Spacer(1, 140))
story.append(Paragraph("VoltCore ERP", cover_title_style))
story.append(Spacer(1, 24))
story.append(Paragraph("Enterprise Resource Planning System", cover_subtitle_style))
story.append(Paragraph("for Power Plant EPC Contractors", cover_sub2_style))
story.append(Spacer(1, 60))
story.append(Paragraph("VoltCore Engineering Pvt. Ltd.", cover_info_style))
story.append(Paragraph("Version 1.0.0", cover_small_style))
story.append(Spacer(1, 48))
story.append(Paragraph("April 2025", cover_small_style))
story.append(PageBreak())

# ===================== SECTION 1: EXECUTIVE SUMMARY =====================
story.append(heading("1. Executive Summary"))
story.append(Spacer(1, 6))

story.append(body(
    "VoltCore ERP is a comprehensive, full-featured Enterprise Resource Planning system purpose-built "
    "for Indian power plant EPC (Engineering, Procurement, and Construction) contractors. Developed "
    "with a modern technology stack comprising Next.js 16, TypeScript, TailwindCSS 4, and Prisma ORM, "
    "the system delivers a unified platform for managing every aspect of construction-project operations "
    "from human resources and finance to inventory control and site safety compliance."
))

story.append(body(
    "The application encompasses 12 functional modules covering HRMS, Finance, Projects, Inventory, "
    "Operations, Sales, CRM, Support, Knowledgebase, and more. At the data layer, VoltCore ERP "
    "leverages 34 database tables across SQLite (development) and 63 MySQL tables (production), "
    "populated with over 1,300 seed data records for immediate demonstration and testing. The backend "
    "exposes 33 RESTful API endpoints with full CRUD operations (GET, POST, PUT, DELETE, PATCH), "
    "while the frontend comprises 25+ dynamically-loaded module components."
))

story.append(body(
    "The user interface features a dark industrial theme with an amber (#f5a623) accent color, "
    "carefully designed for readability during extended use in field and office environments. Built on "
    "the shadcn/ui component library, the interface is fully mobile-responsive with adaptive layouts "
    "for desktop, tablet, and mobile viewports. Zustand manages client-side navigation state, enabling "
    "seamless single-page routing across all modules without full-page reloads."
))

story.append(body(
    "VoltCore ERP maintains a zero-lint codebase with comprehensive error handling, input validation, "
    "and auto-generated unique identifiers for all entity types (PRJ-XXX, EMP-XXX, PO-XXXX, "
    "INV-XXXX). The system includes auto-computed statutory deductions (PF, ESI, TDS), double-entry "
    "bookkeeping, budget variance tracking, shift roster management, and permit-to-work workflows, "
    "making it a production-ready solution for the demanding requirements of Indian EPC contracting."
))

# ===================== SECTION 2: SYSTEM ARCHITECTURE =====================
story.append(Spacer(1, 12))
story.append(heading("2. System Architecture"))
story.append(Spacer(1, 6))

story.append(heading("2.1 Frontend Architecture", level=2))
story.append(bullet("Next.js 16 App Router with a single-page ERP layout hosting all 12 functional modules."))
story.append(bullet("Zustand store for global navigation state including active module routing and sidebar collapsed/expanded mode."))
story.append(bullet("Dynamic imports for code splitting across 25+ module components, reducing initial bundle size."))
story.append(bullet("Dark industrial theme with custom CSS utility classes and amber (#f5a623) accent throughout."))
story.append(bullet("Recharts library for interactive data visualization dashboards across finance, HRMS, and project modules."))

story.append(heading("2.2 Backend Architecture", level=2))
story.append(bullet("33 RESTful API routes organized under /api/*, each handling GET, POST, PUT, DELETE, and PATCH methods."))
story.append(bullet("Prisma ORM with SQLite for rapid development and MySQL 8.0+ for production deployments."))
story.append(bullet("Full CRUD operations on all entities with auto-generated unique IDs (PRJ-XXX, EMP-XXX, PO-XXXX, INV-XXXX)."))
story.append(bullet("Comprehensive input validation and try/catch error handling returning structured JSON responses."))
story.append(bullet("Structured seed data (1,300+ records) enabling immediate demonstration upon deployment."))

story.append(heading("2.3 Database Design", level=2))
story.append(Spacer(1, 4))

avail = letter[0] - 2 * inch
db_table = make_table(
    ["Metric", "Count"],
    [
        ["Total Tables (SQLite/Prisma)", "34"],
        ["API Routes", "33"],
        ["Frontend Modules", "25+"],
        ["Seed Data Records", "1,300+"],
        ["MySQL Tables (Production v2)", "63"],
    ],
    col_widths=[avail * 0.6, avail * 0.4],
)
story.append(db_table)

# ===================== SECTION 3: MODULE REFERENCE =====================
story.append(Spacer(1, 12))
story.append(heading("3. Module Reference"))
story.append(Spacer(1, 6))

# --- 3.1 Organization ---
story.append(heading("3.1 Organization", level=2))
story.append(body(
    "The Organization module establishes the foundational corporate hierarchy, defining departments, "
    "designations, role structures, and associated salary bands that cascade through all other modules."
))
story.append(make_table(
    ["Sub-Module", "Features", "Database Tables"],
    [
        ["Departments & Roles",
         "Department hierarchy, role definitions, salary bands, organizational chart",
         "Department, Designation"],
    ],
    col_widths=[avail * 0.25, avail * 0.45, avail * 0.30],
))

# --- 3.2 HRMS ---
story.append(Spacer(1, 8))
story.append(heading("3.2 HRMS (Human Resources)", level=2))
story.append(body(
    "The HRMS module provides end-to-end workforce management from onboarding through payroll "
    "processing. It tracks 30 employees with 957 attendance records, auto-computes statutory "
    "deductions including PF, ESI, and TDS, and manages shift planning, leave approval workflows, "
    "training certifications, and recruitment pipelines."
))
story.append(make_table(
    ["Sub-Module", "Features"],
    [
        ["Employee Analytics", "Headcount trends, department distribution, demographic charts"],
        ["Employees", "Full employee profiles, designation, department, salary, contact info"],
        ["Attendance", "957 attendance records, daily clock-in/out, late tracking"],
        ["Leave Management", "Leave types, balance tracking, approval workflow"],
        ["Shift Roster", "Shift planning, rotation schedules, crew assignments"],
        ["Timesheet", "Weekly/biweekly timesheets, overtime calculation, project allocation"],
        ["Payroll", "Auto-computed PF, ESI, TDS; salary slips, payslip generation"],
        ["Training & Certifications", "Certification tracking, expiry alerts, training schedules"],
        ["Recruitment", "Job postings, applicant tracking, interview stages"],
    ],
    col_widths=[avail * 0.30, avail * 0.70],
))

# --- 3.3 Procurement ---
story.append(Spacer(1, 8))
story.append(heading("3.3 Procurement", level=2))
story.append(body(
    "The Procurement module manages the complete purchase lifecycle from requisition through Goods "
    "Received Note (GRN) tracking, along with expense claim approval workflows and vendor management."
))
story.append(make_table(
    ["Sub-Module", "Features"],
    [
        ["Purchase Orders", "PO lifecycle (created/approved/ordered/received), GRN tracking, vendor management"],
        ["Expenses", "Expense claim submission, approval workflows, category tracking"],
    ],
    col_widths=[avail * 0.30, avail * 0.70],
))

# --- 3.4 Finance ---
story.append(Spacer(1, 8))
story.append(heading("3.4 Finance", level=2))
story.append(body(
    "The Finance module implements double-entry bookkeeping with 22 ledger accounts, accounts payable "
    "and receivable, journal entries, bank and cash management, tax compliance, budget planning with "
    "variance tracking, and comprehensive financial reporting."
))
story.append(make_table(
    ["Sub-Module", "Features"],
    [
        ["Dashboard", "Financial KPIs, cash flow summary, key metrics at a glance"],
        ["Ledger", "22 ledger accounts, chart of accounts, double-entry posting"],
        ["Accounts Payable", "Vendor bills, payment scheduling, aging reports"],
        ["Accounts Receivable", "Customer invoices, payment tracking, follow-up alerts"],
        ["Journal Entries", "Manual journal entries, debit/credit posting, batch entries"],
        ["Bank & Cash", "Bank reconciliation, cash flow tracking, multiple accounts"],
        ["Taxation", "GST computation, tax filing support, compliance tracking"],
        ["Budget", "Budget allocation, variance analysis, period-over-period comparison"],
        ["Financial Reports", "P&L, balance sheet, cash flow statement, trial balance"],
    ],
    col_widths=[avail * 0.30, avail * 0.70],
))

# --- 3.5 Projects ---
story.append(Spacer(1, 8))
story.append(heading("3.5 Projects", level=2))
story.append(body(
    "The Projects module tracks 8 active projects across India with progress monitoring, multi-site "
    "management, and site mapping capabilities for power plant construction oversight."
))
story.append(make_table(
    ["Sub-Module", "Features"],
    [
        ["All Projects", "8 projects across India, progress tracking, status monitoring, timelines"],
        ["Site Map", "Multi-site management, geographic project locations, site details"],
    ],
    col_widths=[avail * 0.30, avail * 0.70],
))

# --- 3.6 Inventory ---
story.append(Spacer(1, 8))
story.append(heading("3.6 Inventory", level=2))
story.append(body(
    "The Inventory module manages 20 stocked items with 35 recorded movements, low stock alerts, and "
    "warehouse-level tracking for materials and equipment used in construction activities."
))
story.append(make_table(
    ["Sub-Module", "Features"],
    [
        ["Items", "20 inventory items, categories, unit pricing, stock levels"],
        ["Stock Movements", "35 movement records, inbound/outbound tracking, transaction history"],
    ],
    col_widths=[avail * 0.30, avail * 0.70],
))

# --- 3.7 Assets & Operations ---
story.append(Spacer(1, 8))
story.append(heading("3.7 Assets & Operations", level=2))
story.append(body(
    "The Assets & Operations module handles equipment lifecycle management, Permit-to-Work (PTW) "
    "workflows, safety and HSE incident tracking, and subcontractor compliance documentation."
))
story.append(make_table(
    ["Sub-Module", "Features"],
    [
        ["Equipment", "Equipment registry, lifecycle tracking, maintenance schedules"],
        ["Work Permits", "Permit-to-Work (PTW) management, approval workflow, type classification"],
        ["Safety & HSE", "Safety incident tracking, near-miss reporting, HSE compliance metrics"],
        ["Subcontractors", "Subcontractor registration, compliance documents, performance tracking"],
    ],
    col_widths=[avail * 0.30, avail * 0.70],
))

# --- 3.8 Sales ---
story.append(Spacer(1, 8))
story.append(heading("3.8 Sales", level=2))
story.append(body(
    "The Sales module provides customer relationship management with order pipeline tracking and "
    "GST computation for invoicing and revenue management."
))
story.append(make_table(
    ["Sub-Module", "Features"],
    [
        ["Customers", "Customer profiles, contact details, GST identification"],
        ["Sales Orders", "Order pipeline, status tracking, GST computation, order history"],
    ],
    col_widths=[avail * 0.30, avail * 0.70],
))

# --- 3.9 CRM ---
story.append(Spacer(1, 8))
story.append(heading("3.9 CRM", level=2))
story.append(body(
    "The CRM module manages the sales pipeline with lead tracking through deal stages, source "
    "attribution, and contact management for business development activities."
))
story.append(make_table(
    ["Sub-Module", "Features"],
    [
        ["Contacts", "Lead pipeline, deal stages, source tracking, contact management"],
    ],
    col_widths=[avail * 0.30, avail * 0.70],
))

# --- 3.10 System ---
story.append(Spacer(1, 8))
story.append(heading("3.10 System", level=2))
story.append(body(
    "The System module provides centralized report generation and application-wide configuration "
    "including company settings, user preferences, and multi-format report exports."
))
story.append(make_table(
    ["Sub-Module", "Features"],
    [
        ["Reports", "Multi-report generation across modules, export capabilities"],
        ["Settings", "Company configuration, user preferences, system parameters"],
    ],
    col_widths=[avail * 0.30, avail * 0.70],
))

# --- 3.11 Support ---
story.append(Spacer(1, 8))
story.append(heading("3.11 Support", level=2))
story.append(body(
    "The Support module delivers priority-based ticket management with resolution tracking, "
    "ensuring timely handling of internal and external support requests."
))
story.append(make_table(
    ["Sub-Module", "Features"],
    [
        ["Tickets", "Priority-based ticket management, status tracking, resolution workflow"],
    ],
    col_widths=[avail * 0.30, avail * 0.70],
))

# --- 3.12 Knowledgebase ---
story.append(Spacer(1, 8))
story.append(heading("3.12 Knowledgebase", level=2))
story.append(body(
    "The Knowledgebase module provides a centralized repository of categorized articles with tags, "
    "helpful ratings, and view counts for organizational knowledge sharing."
))
story.append(make_table(
    ["Sub-Module", "Features"],
    [
        ["Articles", "Categorized articles, tagging, helpful ratings, view counts"],
    ],
    col_widths=[avail * 0.30, avail * 0.70],
))

# ===================== SECTION 4: TECHNOLOGY STACK =====================
story.append(Spacer(1, 12))
story.append(heading("4. Technology Stack"))
story.append(Spacer(1, 6))

story.append(body(
    "VoltCore ERP is built on a modern, high-performance technology stack chosen for developer "
    "productivity, type safety, and production reliability."
))
story.append(Spacer(1, 4))
story.append(make_table(
    ["Layer", "Technology", "Version"],
    [
        ["Frontend Framework", "Next.js", "16.1.3"],
        ["Language", "TypeScript", "5.x"],
        ["Styling", "Tailwind CSS", "4.x"],
        ["UI Components", "shadcn/ui", "Latest"],
        ["State Management", "Zustand", "5.x"],
        ["ORM", "Prisma", "6.x"],
        ["Charts", "Recharts", "2.x"],
        ["Icons", "Lucide React", "Latest"],
        ["Animations", "Framer Motion", "12.x"],
    ],
    col_widths=[avail * 0.35, avail * 0.35, avail * 0.30],
))

# ===================== SECTION 5: SETUP & DEPLOYMENT =====================
story.append(Spacer(1, 12))
story.append(heading("5. Setup & Deployment"))
story.append(Spacer(1, 6))

story.append(heading("5.1 Prerequisites", level=2))
story.append(bullet("Node.js 18+ or Bun runtime installed on the development machine."))
story.append(bullet("MySQL 8.0+ for production database (SQLite 3 used for development)."))
story.append(bullet("Git for version control and repository management."))

story.append(heading("5.2 Development Setup", level=2))
story.append(body("Follow these steps to set up the VoltCore ERP development environment:"))

setup_steps = [
    "1. Clone the repository: git clone &lt;repository-url&gt;",
    "2. Copy environment configuration: cp .env.example .env",
    "3. Configure DATABASE_URL in the .env file",
    "4. Install dependencies: bun install",
    "5. Push database schema: bun run db:push",
    "6. Seed the database: bun run db:seed",
    "7. Start the development server: bun run dev",
    "8. Access the application: http://localhost:3000",
]
for step in setup_steps:
    story.append(code_line(step))

story.append(heading("5.3 Database Migration to MySQL", level=2))
story.append(body(
    "For production deployment, VoltCore ERP supports migration from SQLite to MySQL 8.0+ with "
    "63 tables including enhanced indexing and constraints."
))

migration_steps = [
    "1. Import MySQL schema: mysql -u root -p voltcore_erp &lt; database/voltcore_erp_mysql.sql",
    "2. Update .env: DATABASE_URL=mysql://user:pass@host:3306/voltcore_erp",
    "3. Generate Prisma client: bun run db:generate",
    "4. Push schema changes: bun run db:push",
]
for step in migration_steps:
    story.append(code_line(step))

# ===================== SECTION 6: FILE STRUCTURE =====================
story.append(Spacer(1, 12))
story.append(heading("6. File Structure"))
story.append(Spacer(1, 6))

story.append(body(
    "The following table maps the key directories and files in the VoltCore ERP project repository."
))
story.append(Spacer(1, 4))
story.append(make_table(
    ["Path", "Description"],
    [
        ["src/app/page.tsx", "Main ERP page with module routing and layout"],
        ["src/app/api/*/route.ts", "API route handlers (33 endpoints)"],
        ["src/components/erp/*.tsx", "Module UI components (25+ components)"],
        ["src/store/erp-store.ts", "Zustand navigation store for sidebar and module state"],
        ["prisma/schema.prisma", "Database schema definition with 34 models"],
        ["prisma/seed.ts", "Database seeder script (1,300+ records)"],
        ["database/voltcore_erp_mysql.sql", "MySQL DDL + seed data (63 tables)"],
        ["download/", "Exportable project files and documentation"],
    ],
    col_widths=[avail * 0.40, avail * 0.60],
))

# ---- Final spacer ----
story.append(Spacer(1, 24))

# ---- Build PDF ----
doc.build(story)
