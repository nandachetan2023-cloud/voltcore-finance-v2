#!/usr/bin/env python3
"""VoltCore ERP - Project Documentation PDF Generator using ReportLab."""
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate, Frame
from reportlab.platypus import NextPageTemplate
from reportlab.lib.fonts import addMapping
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ─── Constants ───────────────────────────────────────────────────────────────
import os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "download", "voltcore_erp_documentation.pdf")
PAGE_W, PAGE_H = A4
MARGIN = 0.75 * inch

DARK_HEADER = HexColor("#1F4E79")
ACCENT_AMBER = HexColor("#f5a623")
ROW_EVEN = HexColor("#F2F7FB")
ROW_ODD = white
DARK_BG = HexColor("#0F172A")
DARK_BG2 = HexColor("#1E293B")

# ─── Styles ──────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

style_title = ParagraphStyle(
    'CoverTitle', parent=styles['Title'],
    fontName='Times-Bold', fontSize=32, leading=38,
    textColor=white, alignment=TA_CENTER, spaceAfter=12,
)
style_subtitle = ParagraphStyle(
    'CoverSubtitle', parent=styles['Normal'],
    fontName='Times-Roman', fontSize=16, leading=22,
    textColor=HexColor("#94A3B8"), alignment=TA_CENTER, spaceAfter=8,
)
style_company = ParagraphStyle(
    'CoverCompany', parent=styles['Normal'],
    fontName='Times-Bold', fontSize=14, leading=20,
    textColor=ACCENT_AMBER, alignment=TA_CENTER, spaceAfter=6,
)
style_cover_info = ParagraphStyle(
    'CoverInfo', parent=styles['Normal'],
    fontName='Times-Roman', fontSize=12, leading=16,
    textColor=HexColor("#CBD5E1"), alignment=TA_CENTER,
)

style_h1 = ParagraphStyle(
    'H1Custom', parent=styles['Heading1'],
    fontName='Times-Bold', fontSize=22, leading=28,
    textColor=DARK_HEADER, spaceBefore=20, spaceAfter=12,
    borderWidth=0, borderPadding=0,
)
style_h2 = ParagraphStyle(
    'H2Custom', parent=styles['Heading2'],
    fontName='Times-Bold', fontSize=16, leading=22,
    textColor=DARK_HEADER, spaceBefore=16, spaceAfter=8,
)
style_body = ParagraphStyle(
    'BodyCustom', parent=styles['Normal'],
    fontName='Times-Roman', fontSize=10.5, leading=15,
    textColor=black, alignment=TA_JUSTIFY, spaceAfter=6,
)
style_bullet = ParagraphStyle(
    'BulletCustom', parent=style_body,
    leftIndent=20, bulletIndent=8, spaceBefore=2, spaceAfter=2,
)
style_code = ParagraphStyle(
    'CodeCustom', parent=styles['Code'],
    fontName='Courier', fontSize=9, leading=12,
    textColor=HexColor("#334155"), backColor=HexColor("#F8FAFC"),
    borderWidth=0.5, borderColor=HexColor("#E2E8F0"),
    borderPadding=6, spaceAfter=6,
)
style_toc_h1 = ParagraphStyle(
    'TOCH1', parent=styles['Normal'],
    fontName='Times-Bold', fontSize=13, leading=20,
    leftIndent=20, textColor=DARK_HEADER,
)
style_toc_h2 = ParagraphStyle(
    'TOCH2', parent=styles['Normal'],
    fontName='Times-Roman', fontSize=11, leading=18,
    leftIndent=40, textColor=HexColor("#475569"),
)


# ─── Helpers ─────────────────────────────────────────────────────────────────
def section_heading(number, title):
    """Return an H1 paragraph for a major section."""
    return Paragraph(f"Section {number}: {title}", style_h1)

def sub_heading(title):
    return Paragraph(title, style_h2)

def body(text):
    return Paragraph(text, style_body)

def bullet(text):
    return Paragraph(f"\u2022  {text}", style_bullet)

def code_block(text):
    return Paragraph(text.replace("\n", "<br/>"), style_code)

def spacer(h=12):
    return Spacer(1, h)

def hr():
    return HRFlowable(width="100%", thickness=1, color=HexColor("#CBD5E1"), spaceAfter=8, spaceBefore=8)

def make_table(headers, rows, col_widths=None):
    """Create a styled table with header and alternating rows."""
    header_row = [Paragraph(h, ParagraphStyle(
        'TH', fontName='Times-Bold', fontSize=9.5, leading=12,
        textColor=white, alignment=TA_LEFT,
    )) for h in headers]

    cell_style = ParagraphStyle(
        'TD', fontName='Times-Roman', fontSize=9, leading=12,
        textColor=black, alignment=TA_LEFT,
    )
    data = [header_row]
    for row in rows:
        data.append([Paragraph(str(c), cell_style) for c in row])

    if col_widths is None:
        col_widths = [(PAGE_W - 2 * MARGIN) / len(headers)] * len(headers)

    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK_HEADER),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Times-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9.5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#CBD5E1")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        bg = ROW_EVEN if i % 2 == 0 else ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t


# ─── Cover Page ──────────────────────────────────────────────────────────────
def build_cover_page():
    """Build cover page elements."""
    elements = []

    # Background table simulating dark cover
    cover_bg_data = [['']]
    cover_bg = Table(cover_bg_data, colWidths=[PAGE_W - 2 * MARGIN], rowHeights=[PAGE_H - 2 * MARGIN])
    cover_bg.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), DARK_BG),
        ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
    ]))

    # We'll draw cover content directly
    elements.append(spacer(140))

    # Amber accent line
    elements.append(HRFlowable(width="40%", thickness=3, color=ACCENT_AMBER, spaceAfter=20, spaceBefore=0))

    elements.append(Paragraph("VoltCore ERP", ParagraphStyle(
        'BigTitle', fontName='Times-Bold', fontSize=38, leading=44,
        textColor=DARK_HEADER, alignment=TA_CENTER, spaceAfter=4,
    )))
    elements.append(Paragraph("Project Documentation", ParagraphStyle(
        'BigTitle2', fontName='Times-Bold', fontSize=28, leading=34,
        textColor=DARK_HEADER, alignment=TA_CENTER, spaceAfter=16,
    )))

    elements.append(HRFlowable(width="60%", thickness=2, color=ACCENT_AMBER, spaceAfter=20, spaceBefore=0))

    elements.append(Paragraph("Enterprise Resource Planning System for Power Plant Contractors", ParagraphStyle(
        'SubTitle2', fontName='Times-Italic', fontSize=14, leading=20,
        textColor=HexColor("#64748B"), alignment=TA_CENTER, spaceAfter=30,
    )))

    elements.append(spacer(30))

    # Info block in a table
    info_style = ParagraphStyle('InfoLabel', fontName='Times-Bold', fontSize=11, leading=15, textColor=DARK_HEADER, alignment=TA_LEFT)
    info_val_style = ParagraphStyle('InfoVal', fontName='Times-Roman', fontSize=11, leading=15, textColor=HexColor("#334155"), alignment=TA_LEFT)

    info_data = [
        [Paragraph("Company:", info_style), Paragraph("VoltCore Engineering Pvt Ltd", info_val_style)],
        [Paragraph("Version:", info_style), Paragraph("2.0", info_val_style)],
        [Paragraph("Date:", info_style), Paragraph("April 2026", info_val_style)],
        [Paragraph("Document Type:", info_style), Paragraph("Technical Documentation", info_val_style)],
    ]
    info_table = Table(info_data, colWidths=[1.8 * inch, 3.5 * inch])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 1, DARK_HEADER),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    # Center the info table
    wrapper = Table([[info_table]], colWidths=[PAGE_W - 2 * MARGIN])
    wrapper.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
    ]))
    elements.append(wrapper)

    elements.append(spacer(40))
    elements.append(HRFlowable(width="100%", thickness=1, color=HexColor("#94A3B8"), spaceAfter=8, spaceBefore=0))
    elements.append(Paragraph("Confidential  |  Internal Use Only", ParagraphStyle(
        'Footer', fontName='Times-Italic', fontSize=9, leading=12,
        textColor=HexColor("#94A3B8"), alignment=TA_CENTER,
    )))

    elements.append(PageBreak())
    return elements


# ─── Section Builders ────────────────────────────────────────────────────────
def build_executive_summary():
    elements = []
    elements.append(section_heading(1, "Executive Summary"))
    elements.append(hr())
    elements.append(body(
        "VoltCore ERP is a comprehensive enterprise resource planning system designed specifically for "
        "Indian power plant EPC (Engineering, Procurement, and Construction) contractors. The system "
        "provides end-to-end management of operations including human resources, procurement, finance, "
        "project management, inventory, asset tracking, sales, CRM, and support operations."
    ))
    elements.append(spacer(6))
    elements.append(body("Key highlights of the VoltCore ERP system include:"))
    elements.append(bullet("<b>Modern Technology Stack:</b> Built with Next.js 16, TypeScript, TailwindCSS 4, Prisma ORM, and Zustand for state management."))
    elements.append(bullet("<b>Dark Industrial Theme:</b> Professional dark UI with amber accent (#F5A623) optimized for industrial environments and extended usage."))
    elements.append(bullet("<b>Comprehensive Modules:</b> 12 top-level modules covering all aspects of EPC contractor operations."))
    elements.append(bullet("<b>Extensive Sub-Modules:</b> 25+ sub-modules providing granular functionality across departments."))
    elements.append(bullet("<b>RESTful API:</b> 33 API routes built with Next.js App Router for seamless frontend-backend communication."))
    elements.append(bullet("<b>Database Support:</b> Dual database support with SQLite for development and MySQL for production deployment."))
    elements.append(bullet("<b>Responsive Design:</b> Fully responsive layout that works across desktops, tablets, and mobile devices."))
    elements.append(spacer(6))
    elements.append(body(
        "The system is designed to streamline operations for power plant contractors who need to manage "
        "multiple projects simultaneously, track workforce deployment across sites, handle complex procurement "
        "workflows, maintain financial records, and ensure compliance with safety and regulatory requirements."
    ))
    return elements


def build_technology_stack():
    elements = []
    elements.append(section_heading(2, "Technology Stack"))
    elements.append(hr())
    elements.append(body(
        "VoltCore ERP leverages a modern, production-ready technology stack optimized for developer "
        "productivity and application performance."
    ))
    elements.append(spacer(8))

    headers = ["Technology", "Version", "Purpose"]
    rows = [
        ["Next.js", "16.1.3", "Frontend framework with App Router"],
        ["TypeScript", "5.x", "Type safety across the application"],
        ["TailwindCSS", "4.x", "Styling with dark industrial theme"],
        ["Prisma ORM", "6.19.2", "Database ORM (SQLite / MySQL)"],
        ["Zustand", "5.x", "Client-side state management"],
        ["shadcn/ui", "Latest", "Accessible UI component library"],
        ["Recharts", "2.x", "Data visualization and charting"],
        ["Lucide React", "Latest", "Consistent icon library"],
        ["Sonner", "2.x", "Toast notification system"],
        ["React Hook Form", "7.x", "Performant form management"],
        ["TanStack Query", "5.x", "Server state management & caching"],
        ["SQLite", "3.x", "Local development database"],
        ["MySQL", "8.x", "Production database server"],
    ]
    w = PAGE_W - 2 * MARGIN
    t = make_table(headers, rows, col_widths=[w * 0.2, w * 0.15, w * 0.65])
    elements.append(t)
    return elements


def build_module_overview():
    elements = []
    elements.append(section_heading(3, "Module Overview"))
    elements.append(hr())
    elements.append(body(
        "The VoltCore ERP system is organized into 12 top-level modules, each addressing a core "
        "business function of power plant EPC contractors."
    ))
    elements.append(spacer(8))

    headers = ["#", "Module", "Sub-Modules", "Description"]
    rows = [
        ["1", "Organization", "Departments, Designations", "Organizational structure management"],
        ["2", "HRMS", "Employee Analytics, Employees, Attendance, Leave, Shift, Timesheet, Payroll, Training, Recruitment", "Full human resource management suite"],
        ["3", "Procurement", "Purchase Orders, Expense Claims", "Vendor procurement and expense tracking"],
        ["4", "Finance", "Dashboard, Ledger, AP, AR, Journal Entries, Bank & Cash, Taxation, Budget, Financial Reports", "Complete financial management"],
        ["5", "Projects", "All Projects, Site Map", "Project and site management"],
        ["6", "Inventory", "Items, Stock Movements", "Inventory and warehouse management"],
        ["7", "Assets", "Equipment, Work Permits, Safety & HSE, Subcontractors", "Asset tracking and safety compliance"],
        ["8", "Sales", "Customers, Sales Orders", "Customer and order management"],
        ["9", "CRM", "Contact Pipeline", "Customer relationship management"],
        ["10", "System", "Reports, Settings", "System administration"],
        ["11", "Support", "Tickets", "Help desk and ticket management"],
        ["12", "Knowledgebase", "Articles", "Document and knowledge management"],
    ]
    w = PAGE_W - 2 * MARGIN
    t = make_table(headers, rows, col_widths=[w * 0.05, w * 0.13, w * 0.42, w * 0.40])
    elements.append(t)
    return elements


def build_database_schema():
    elements = []
    elements.append(section_heading(4, "Database Schema"))
    elements.append(hr())
    elements.append(body(
        "The VoltCore ERP database consists of 34 tables organized across modules. The schema is "
        "designed for relational integrity with foreign key constraints, indexes, and appropriate "
        "data types for each field."
    ))
    elements.append(spacer(8))

    headers = ["#", "Table Name", "Module", "Description", "Key Fields"]
    rows = [
        ["1", "CompanySettings", "System", "Company configuration", "key, value, label"],
        ["2", "Department", "Organization", "Departments", "name, head, location"],
        ["3", "Designation", "Organization", "Job roles / designations", "title, department, level"],
        ["4", "Site", "Projects", "Work locations", "name, state, manpower"],
        ["5", "Project", "Projects", "Projects", "code, client, type, progress"],
        ["6", "Employee", "HRMS", "Staff records", "empId, name, trade, role, site"],
        ["7", "Attendance", "HRMS", "Daily attendance", "date, timeIn, timeOut, shift"],
        ["8", "LeaveRequest", "HRMS", "Leave management", "type, fromDate, toDate, status"],
        ["9", "ShiftSchedule", "HRMS", "Shift planning", "shift, weekStart"],
        ["10", "Payroll", "HRMS", "Monthly payroll", "basic, hra, pf, netPay"],
        ["11", "Certification", "HRMS", "Employee certifications", "name, issuedBy, expiryDate"],
        ["12", "TrainingSession", "HRMS", "Training records", "title, trainer, duration"],
        ["13", "JobOpening", "HRMS", "Recruitment", "position, openings, priority"],
        ["14", "Expense", "Finance", "Expense claims", "claimNo, category, amount"],
        ["15", "PurchaseOrder", "Procurement", "Purchase orders", "poNo, vendor, item, amount"],
        ["16", "Invoice", "Finance", "Invoicing", "invNo, client, amount"],
        ["17", "WorkPermit", "Operations", "Permit to Work (PTW)", "permitNo, type, location"],
        ["18", "Incident", "Operations", "Safety incident records", "refNo, type, severity"],
        ["19", "Equipment", "Operations", "Asset / equipment tracking", "eqId, site, utilization"],
        ["20", "Subcontractor", "Operations", "Contractor management", "trade, workers, compliance"],
        ["21", "InventoryItem", "Inventory", "Stock items", "itemCode, currentStock, unitCost"],
        ["22", "StockMovement", "Inventory", "Stock audit trail", "type, quantity, warehouse"],
        ["23", "Customer", "Sales", "Client database", "code, contactPerson, gst"],
        ["24", "SalesOrder", "Sales", "Order management", "soNo, customer, amount"],
        ["25", "CrmContact", "CRM", "Contact pipeline", "stage, source, value"],
        ["26", "SupportTicket", "Support", "Help desk tickets", "ticketNo, priority, status"],
        ["27", "KBArticle", "Knowledgebase", "Knowledge articles", "category, author, tags"],
        ["28", "LedgerAccount", "Finance", "General ledger accounts", "accountCode, group, type"],
        ["29", "AccountsPayable", "Finance", "Accounts payable bills", "billNo, vendor, amount"],
        ["30", "AccountsReceivable", "Finance", "Accounts receivable invoices", "invoiceNo, client, amount"],
        ["31", "JournalEntry", "Finance", "Journal entries", "entryNo, debit, credit"],
        ["32", "BankAccount", "Finance", "Bank accounts", "accountName, bankName, balance"],
        ["33", "TaxRecord", "Finance", "Tax compliance records", "taxType, period, amount"],
        ["34", "BudgetItem", "Finance", "Budget planning", "category, planned, actual"],
    ]
    w = PAGE_W - 2 * MARGIN
    t = make_table(headers, rows, col_widths=[w * 0.05, w * 0.17, w * 0.13, w * 0.30, w * 0.35])
    elements.append(t)
    return elements


def build_api_endpoints():
    elements = []
    elements.append(section_heading(5, "API Endpoints"))
    elements.append(hr())
    elements.append(body(
        "VoltCore ERP exposes 33 RESTful API endpoints built using the Next.js App Router. "
        "All endpoints support standard CRUD operations with appropriate HTTP methods."
    ))
    elements.append(spacer(8))

    headers = ["Method", "Endpoint", "Description"]
    rows = [
        ["GET/POST", "/api/attendance", "Employee attendance records"],
        ["GET/POST", "/api/accounts-payable", "Accounts payable management"],
        ["GET/POST", "/api/accounts-receivable", "Accounts receivable management"],
        ["GET/POST", "/api/bank-cash", "Bank and cash accounts"],
        ["GET/POST", "/api/budget", "Budget planning and tracking"],
        ["GET/POST", "/api/crm", "CRM contact pipeline"],
        ["GET/POST", "/api/dashboard", "Main dashboard data"],
        ["GET/POST", "/api/employees", "Employee management"],
        ["GET/POST", "/api/equipment", "Equipment and asset tracking"],
        ["GET/POST", "/api/expenses", "Expense claim management"],
        ["GET/POST", "/api/finance-dashboard", "Finance dashboard analytics"],
        ["GET/POST", "/api/financial-reports", "Financial report generation"],
        ["GET/POST", "/api/incidents", "Safety incident records"],
        ["GET/POST", "/api/inventory", "Inventory item management"],
        ["GET/POST", "/api/invoices", "Invoice management"],
        ["GET/POST", "/api/journal-entries", "Journal entry management"],
        ["GET/POST", "/api/knowledgebase", "Knowledge base articles"],
        ["GET/POST", "/api/leave", "Leave request management"],
        ["GET/POST", "/api/ledger", "General ledger accounts"],
        ["GET/POST", "/api/organization", "Department & designation setup"],
        ["GET/POST", "/api/permits", "Work permit management"],
        ["GET/POST", "/api/projects", "Project management"],
        ["GET/POST", "/api/purchases", "Purchase order management"],
        ["GET/POST", "/api/recruitment", "Job openings and hiring"],
        ["GET/POST", "/api/sales", "Sales order management"],
        ["GET/POST", "/api/settings", "System settings"],
        ["GET/POST", "/api/shifts", "Shift schedule management"],
        ["GET/POST", "/api/sites", "Site / work location management"],
        ["GET/POST", "/api/subcontractors", "Subcontractor management"],
        ["GET/POST", "/api/support", "Support ticket management"],
        ["GET/POST", "/api/sync", "Data synchronization"],
        ["POST", "/api/sync/seed", "Database seeding"],
        ["GET/POST", "/api/taxation", "Tax record management"],
    ]
    w = PAGE_W - 2 * MARGIN
    t = make_table(headers, rows, col_widths=[w * 0.15, w * 0.30, w * 0.55])
    elements.append(t)
    return elements


def build_project_structure():
    elements = []
    elements.append(section_heading(6, "Project Structure"))
    elements.append(hr())
    elements.append(body(
        "The VoltCore ERP project follows the standard Next.js App Router convention with a clean "
        "separation of concerns between pages, API routes, components, and data layer."
    ))
    elements.append(spacer(8))

    tree = (
        "voltcore-erp/<br/>"
        "\u251c\u2500\u2500 src/<br/>"
        "\u2502   \u251c\u2500\u2500 app/<br/>"
        "\u2502   \u2502   \u251c\u2500\u2500 page.tsx                  # Main application page<br/>"
        "\u2502   \u2502   \u251c\u2500\u2500 layout.tsx                # Root layout with sidebar<br/>"
        "\u2502   \u2502   \u251c\u2500\u2500 globals.css               # Global styles (dark theme)<br/>"
        "\u2502   \u2502   \u2514\u2500\u2500 api/<br/>"
        "\u2502   \u2502       \u251c\u2500\u2500 route.ts                 # Root API health check<br/>"
        "\u2502   \u2502       \u2514\u2500\u2500 [module]/route.ts        # 32 module API routes<br/>"
        "\u2502   \u251c\u2500\u2500 components/<br/>"
        "\u2502   \u2502   \u251c\u2500\u2500 erp/*.tsx                  # 30+ module components<br/>"
        "\u2502   \u2502   \u2514\u2500\u2500 ui/*.tsx                   # 40+ shadcn/ui components<br/>"
        "\u2502   \u251c\u2500\u2500 store/<br/>"
        "\u2502   \u2502   \u2514\u2500\u2500 erp-store.ts              # Zustand global state<br/>"
        "\u2502   \u251c\u2500\u2500 hooks/<br/>"
        "\u2502   \u2502   \u251c\u2500\u2500 use-toast.ts              # Toast notification hook<br/>"
        "\u2502   \u2502   \u2514\u2500\u2500 use-mobile.ts             # Mobile detection hook<br/>"
        "\u2502   \u2514\u2500\u2500 lib/<br/>"
        "\u2502       \u2514\u2500\u2500 db.ts                     # Prisma client singleton<br/>"
        "\u251c\u2500\u2500 prisma/<br/>"
        "\u2502   \u251c\u2500\u2500 schema.prisma               # Database schema (34 models)<br/>"
        "\u2502   \u2514\u2500\u2500 seed.ts                    # Database seed script<br/>"
        "\u251c\u2500\u2500 database/<br/>"
        "\u2502   \u2514\u2500\u2500 voltcore_erp_mysql.sql      # Full MySQL DDL export<br/>"
        "\u251c\u2500\u2500 public/<br/>"
        "\u2502   \u2514\u2500\u2500 logo.svg                   # VoltCore logo<br/>"
        "\u251c\u2500\u2500 package.json                         # Dependencies &amp; scripts<br/>"
        "\u251c\u2500\u2500 next.config.ts                      # Next.js configuration<br/>"
        "\u251c\u2500\u2500 tailwind.config.ts                  # TailwindCSS configuration<br/>"
        "\u251c\u2500\u2500 tsconfig.json                       # TypeScript configuration<br/>"
        "\u2514\u2500\u2500 components.json                     # shadcn/ui configuration"
    )
    elements.append(code_block(tree))
    return elements


def build_installation_setup():
    elements = []
    elements.append(section_heading(7, "Installation & Setup"))
    elements.append(hr())

    elements.append(sub_heading("Prerequisites"))
    elements.append(bullet("<b>Node.js</b> 18+ or later"))
    elements.append(bullet("<b>Bun</b> (latest) - recommended package manager"))
    elements.append(bullet("<b>MySQL 8+</b> for production deployment"))
    elements.append(bullet("<b>SQLite 3</b> for local development (auto-managed by Prisma)"))
    elements.append(spacer(8))

    elements.append(sub_heading("Installation Steps"))
    steps = [
        ("Clone the repository", "git clone &lt;repository-url&gt; &amp;&amp; cd voltcore-erp"),
        ("Install dependencies", "bun install"),
        ("Configure environment", "# Create .env file with:\nDATABASE_URL=\"file:./dev.db\"\n# For MySQL:\n# DATABASE_URL=\"mysql://user:password@localhost:3306/voltcore_erp\""),
        ("Generate Prisma client", "bun run db:generate"),
        ("Push schema to database", "bun run db:push"),
        ("Seed database with sample data", "bun run db:seed"),
        ("Start development server", "bun run dev"),
        ("Access the application", "Open http://localhost:3000 in your browser"),
    ]
    for i, (title, cmd) in enumerate(steps, 1):
        step_data = [[
            Paragraph(f"<b>Step {i}:</b> {title}", ParagraphStyle(
                'StepTitle', fontName='Times-Bold', fontSize=10, leading=14, textColor=DARK_HEADER,
            )),
        ], [
            Paragraph(cmd, ParagraphStyle(
                'StepCmd', fontName='Courier', fontSize=9, leading=13,
                textColor=HexColor("#334155"), backColor=HexColor("#F1F5F9"),
                borderWidth=0.5, borderColor=HexColor("#E2E8F0"), borderPadding=6,
            )),
        ]]
        step_table = Table(step_data, colWidths=[PAGE_W - 2 * MARGIN - 16])
        step_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor("#F8FAFC")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('BOX', (0, 0), (-1, -1), 0.5, HexColor("#E2E8F0")),
        ]))
        elements.append(step_table)
        elements.append(spacer(4))

    elements.append(spacer(8))
    elements.append(sub_heading("Available Scripts"))
    scripts = [
        ["bun run dev", "Start development server with hot reload"],
        ["bun run build", "Build production-optimized bundle"],
        ["bun run start", "Start production server"],
        ["bun run db:generate", "Generate Prisma client from schema"],
        ["bun run db:push", "Push schema changes to database"],
        ["bun run db:seed", "Seed database with initial data"],
    ]
    headers = ["Script", "Description"]
    w = PAGE_W - 2 * MARGIN
    elements.append(make_table(headers, scripts, col_widths=[w * 0.35, w * 0.65]))
    return elements


def build_deployment_notes():
    elements = []
    elements.append(section_heading(8, "Deployment Notes"))
    elements.append(hr())

    elements.append(sub_heading("Switching to MySQL for Production"))
    elements.append(body(
        "VoltCore ERP defaults to SQLite for development. For production deployments, "
        "switch to MySQL by following these steps:"
    ))
    elements.append(spacer(4))

    dep_steps = [
        "<b>1. Update the Prisma provider:</b> In <font face='Courier'>prisma/schema.prisma</font>, change the datasource provider from <font face='Courier'>sqlite</font> to <font face='Courier'>mysql</font>.",
        "<b>2. Update DATABASE_URL:</b> Set the environment variable to your MySQL connection string:<br/><font face='Courier'>DATABASE_URL=\"mysql://user:password@host:3306/voltcore_erp\"</font>",
        "<b>3. Import the MySQL schema:</b><br/><font face='Courier'>mysql -u root -p voltcore_erp &lt; database/voltcore_erp_mysql.sql</font>",
        "<b>4. Regenerate Prisma client:</b><br/><font face='Courier'>bun run db:generate</font>",
        "<b>5. Build the application:</b><br/><font face='Courier'>bun run build</font>",
        "<b>6. Start the production server:</b><br/><font face='Courier'>bun run start</font>",
    ]
    for step in dep_steps:
        elements.append(bullet(step))

    elements.append(spacer(12))
    elements.append(sub_heading("Environment Variables"))
    env_headers = ["Variable", "Description", "Example"]
    env_rows = [
        ["DATABASE_URL", "Database connection string", "mysql://user:pass@host:3306/dbname"],
        ["NEXT_PUBLIC_APP_URL", "Application base URL", "https://erp.voltcore.in"],
        ["NEXT_PUBLIC_APP_NAME", "Application display name", "VoltCore ERP"],
    ]
    w = PAGE_W - 2 * MARGIN
    elements.append(make_table(env_headers, env_rows, col_widths=[w * 0.25, w * 0.40, w * 0.35]))

    elements.append(spacer(12))
    elements.append(sub_heading("Production Recommendations"))
    elements.append(bullet("Use a process manager like <b>PM2</b> for process management and auto-restart."))
    elements.append(bullet("Configure a reverse proxy (Nginx/Caddy) for SSL termination and static file serving."))
    elements.append(bullet("Set up regular MySQL backups with automated rotation."))
    elements.append(bullet("Enable application-level logging and monitoring."))
    elements.append(bullet("Configure firewall rules to restrict database access."))
    elements.append(bullet("Use environment-specific .env files for staging vs. production."))

    elements.append(spacer(12))
    elements.append(sub_heading("Architecture Diagram (Textual)"))
    arch = (
        "[Client Browser] &rarr; [Nginx / Caddy (Reverse Proxy)] &rarr; [Next.js App Server]<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&rarr; [Prisma ORM] &rarr; [MySQL / SQLite Database]"
    )
    elements.append(code_block(arch))

    return elements


# ─── Main Build ──────────────────────────────────────────────────────────────
class TocDocTemplate(BaseDocTemplate):
    """Custom document template with TOC support."""

    def __init__(self, filename, **kwargs):
        BaseDocTemplate.__init__(self, filename, **kwargs)
        page_frame = Frame(
            MARGIN, MARGIN,
            PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN,
            id='normal',
        )
        self.addPageTemplates([
            PageTemplate(id='cover', frames=[page_frame], onPage=self._cover_page),
            PageTemplate(id='toc', frames=[page_frame], onPage=self._toc_page),
            PageTemplate(id='content', frames=[page_frame], onPage=self._content_page),
        ])

    def _cover_page(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(DARK_BG)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        # Amber accent line at top
        canvas.setStrokeColor(ACCENT_AMBER)
        canvas.setLineWidth(4)
        canvas.line(MARGIN, PAGE_H - MARGIN + 10, PAGE_W - MARGIN, PAGE_H - MARGIN + 10)
        # Bottom line
        canvas.setStrokeColor(HexColor("#334155"))
        canvas.setLineWidth(1)
        canvas.line(MARGIN, MARGIN - 10, PAGE_W - MARGIN, MARGIN - 10)
        canvas.restoreState()

    def _toc_page(self, canvas, doc):
        canvas.saveState()
        # Header
        canvas.setFillColor(DARK_HEADER)
        canvas.rect(0, PAGE_H - 40, PAGE_W, 40, fill=1, stroke=0)
        canvas.setFont('Times-Bold', 10)
        canvas.setFillColor(white)
        canvas.drawString(MARGIN, PAGE_H - 28, "VoltCore ERP - Project Documentation")
        canvas.setFont('Times-Roman', 8)
        canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 28, "Version 2.0")
        # Footer
        canvas.setFillColor(HexColor("#94A3B8"))
        canvas.setFont('Times-Roman', 8)
        canvas.drawCentredString(PAGE_W / 2, 20, f"Page {doc.page}")
        canvas.restoreState()

    def _content_page(self, canvas, doc):
        canvas.saveState()
        # Header
        canvas.setFillColor(DARK_HEADER)
        canvas.rect(0, PAGE_H - 40, PAGE_W, 40, fill=1, stroke=0)
        canvas.setFont('Times-Bold', 10)
        canvas.setFillColor(white)
        canvas.drawString(MARGIN, PAGE_H - 28, "VoltCore ERP - Project Documentation")
        canvas.setFont('Times-Roman', 8)
        canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 28, "Version 2.0")
        # Amber accent under header
        canvas.setStrokeColor(ACCENT_AMBER)
        canvas.setLineWidth(2)
        canvas.line(0, PAGE_H - 40, PAGE_W, PAGE_H - 40)
        # Footer
        canvas.setStrokeColor(HexColor("#CBD5E1"))
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN, MARGIN - 10, PAGE_W - MARGIN, MARGIN - 10)
        canvas.setFillColor(HexColor("#94A3B8"))
        canvas.setFont('Times-Roman', 8)
        canvas.drawCentredString(PAGE_W / 2, 20, f"Page {doc.page}")
        canvas.setFont('Times-Italic', 7)
        canvas.drawString(MARGIN, 20, "Confidential")
        canvas.drawRightString(PAGE_W - MARGIN, 20, "VoltCore Engineering Pvt Ltd")
        canvas.restoreState()


def build_pdf():
    """Main function to build the complete PDF document."""
    doc = TocDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN + 10, bottomMargin=MARGIN + 10,
        title="voltcore_erp_documentation",
        author="Z.ai",
        creator="Z.ai",
        subject="VoltCore ERP Project Documentation",
    )

    toc = TableOfContents()
    toc.levelStyles = [style_toc_h1, style_toc_h2]

    # Build all story elements
    story = []

    # ── Cover Page ──
    story.append(NextPageTemplate('cover'))
    story.extend(build_cover_page())

    # ── Table of Contents ──
    story.append(NextPageTemplate('toc'))
    story.append(Paragraph("Table of Contents", ParagraphStyle(
        'TOCTitle', fontName='Times-Bold', fontSize=24, leading=30,
        textColor=DARK_HEADER, alignment=TA_LEFT, spaceAfter=20,
    )))
    story.append(hr())
    story.append(toc)
    story.append(PageBreak())

    # ── Content Sections ──
    story.append(NextPageTemplate('content'))

    # Section 1: Executive Summary
    story.extend(build_executive_summary())
    story.append(PageBreak())

    # Section 2: Technology Stack
    story.extend(build_technology_stack())
    story.append(PageBreak())

    # Section 3: Module Overview
    story.extend(build_module_overview())
    story.append(PageBreak())

    # Section 4: Database Schema
    story.extend(build_database_schema())
    story.append(PageBreak())

    # Section 5: API Endpoints
    story.extend(build_api_endpoints())
    story.append(PageBreak())

    # Section 6: Project Structure
    story.extend(build_project_structure())
    story.append(PageBreak())

    # Section 7: Installation & Setup
    story.extend(build_installation_setup())
    story.append(PageBreak())

    # Section 8: Deployment Notes
    story.extend(build_deployment_notes())

    # Build with multiBuild for TOC support
    doc.multiBuild(story)
    return doc


if __name__ == '__main__':
    print("Generating VoltCore ERP Documentation PDF...")
    doc = build_pdf()

    # Read the generated file to get page count
    from pypdf import PdfReader
    reader = PdfReader(OUTPUT_PATH)
    page_count = len(reader.pages)
    file_size = os.path.getsize(OUTPUT_PATH)

    print(f"PDF generated successfully!")
    print(f"  Path: {OUTPUT_PATH}")
    print(f"  Pages: {page_count}")
    print(f"  File size: {file_size / 1024:.1f} KB")
