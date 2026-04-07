-- ============================================================================
-- MODULE 15: CRM Module
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- ============================================================================
-- Tracks sales leads, enquiries, customer interactions, and follow-ups
-- for industrial plant maintenance services across steel, cement, power,
-- oil & gas, and metals sectors in India.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: Lead
-- ----------------------------------------------------------------------------
-- Central CRM table capturing potential business opportunities from various
-- industrial clients. Leads move through stages from initial contact to
-- Won/Lost. Sources include exhibitions, referrals, website, and direct
-- outreach via cold calls and LinkedIn.
-- ----------------------------------------------------------------------------
CREATE TABLE Lead (
    id                VARCHAR(25)     NOT NULL,
    name              VARCHAR(255)    NOT NULL,
    company           VARCHAR(255)    NOT NULL,
    email             VARCHAR(255)    DEFAULT NULL,
    phone             VARCHAR(50)     DEFAULT NULL,
    designation       VARCHAR(255)    DEFAULT NULL,
    source            VARCHAR(50)     DEFAULT NULL,
    stage             VARCHAR(50)     DEFAULT 'Lead',
    value             DOUBLE          DEFAULT 0,
    probability       INT             DEFAULT 0,
    assignedTo        VARCHAR(255)    DEFAULT NULL,
    industry          VARCHAR(100)    DEFAULT NULL,
    notes             TEXT            DEFAULT NULL,
    status            VARCHAR(50)     DEFAULT 'Active',
    expectedCloseDate DATE            DEFAULT NULL,
    createdAt         DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt         DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_lead_stage (stage),
    INDEX idx_lead_assignedTo (assignedTo),
    INDEX idx_lead_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: Enquiry
-- ----------------------------------------------------------------------------
-- Specific enquiries raised by or on behalf of leads. Each enquiry is
-- tied to a lead and tracks a particular service request such as AMC,
-- shutdown services, emergency repairs, or turnkey projects.
-- ----------------------------------------------------------------------------
CREATE TABLE Enquiry (
    id          VARCHAR(25)     NOT NULL,
    leadId      VARCHAR(25)     NOT NULL,
    subject     VARCHAR(255)    NOT NULL,
    description TEXT            DEFAULT NULL,
    priority    VARCHAR(50)     DEFAULT 'Medium',
    status      VARCHAR(50)     DEFAULT 'Open',
    assignedTo  VARCHAR(255)    DEFAULT NULL,
    dueDate     DATE            DEFAULT NULL,
    createdAt   DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt   DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT fk_enquiry_lead FOREIGN KEY (leadId) REFERENCES Lead(id) ON DELETE CASCADE,
    INDEX idx_enquiry_leadId (leadId),
    INDEX idx_enquiry_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: CustomerInteraction
-- ----------------------------------------------------------------------------
-- Records all touchpoints with leads and existing customers including calls,
-- emails, meetings, site visits, and video conferences. Tracks outcomes
-- and next actions for continuous relationship management.
-- ----------------------------------------------------------------------------
CREATE TABLE CustomerInteraction (
    id              VARCHAR(25)     NOT NULL,
    leadId          VARCHAR(25)     DEFAULT NULL,
    customerId      VARCHAR(25)     DEFAULT NULL,
    type            VARCHAR(50)     NOT NULL,
    subject         VARCHAR(255)    NOT NULL,
    notes           TEXT            DEFAULT NULL,
    outcome         VARCHAR(255)    DEFAULT NULL,
    nextAction      VARCHAR(255)    DEFAULT NULL,
    nextActionDate  DATE            DEFAULT NULL,
    createdBy       VARCHAR(255)    DEFAULT NULL,
    createdAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT fk_ci_lead FOREIGN KEY (leadId) REFERENCES Lead(id) ON DELETE SET NULL,
    CONSTRAINT fk_ci_customer FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE SET NULL,
    INDEX idx_ci_leadId (leadId),
    INDEX idx_ci_customerId (customerId),
    INDEX idx_ci_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: FollowUp
-- ----------------------------------------------------------------------------
-- Tracks scheduled follow-up activities linked to leads, enquiries, or
-- existing customers. Ensures no business opportunity falls through the
-- cracks. Statuses include Scheduled, Completed, Cancelled, and Overdue.
-- ----------------------------------------------------------------------------
CREATE TABLE FollowUp (
    id              VARCHAR(25)     NOT NULL,
    leadId          VARCHAR(25)     DEFAULT NULL,
    enquiryId       VARCHAR(25)     DEFAULT NULL,
    customerId      VARCHAR(25)     DEFAULT NULL,
    scheduledDate   DATE            NOT NULL,
    subject         VARCHAR(255)    NOT NULL,
    notes           TEXT            DEFAULT NULL,
    status          VARCHAR(50)     DEFAULT 'Scheduled',
    assignedTo      VARCHAR(255)    DEFAULT NULL,
    completedDate   DATE            DEFAULT NULL,
    outcome         TEXT            DEFAULT NULL,
    createdAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt       DATETIME(3)     DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT fk_fu_lead FOREIGN KEY (leadId) REFERENCES Lead(id) ON DELETE SET NULL,
    CONSTRAINT fk_fu_enquiry FOREIGN KEY (enquiryId) REFERENCES Enquiry(id) ON DELETE SET NULL,
    CONSTRAINT fk_fu_customer FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE SET NULL,
    INDEX idx_fu_leadId (leadId),
    INDEX idx_fu_scheduledDate (scheduledDate),
    INDEX idx_fu_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- INSERT DATA: Leads (10 records)
-- ============================================================================
-- Mix of major Indian industrial companies across power, metals, cement,
-- and oil & gas sectors, representing realistic VoltCore business pipeline.
-- ============================================================================

INSERT INTO Lead (id, name, company, email, phone, designation, source, stage, value, probability, assignedTo, industry, notes, status, expectedCloseDate, createdAt, updatedAt) VALUES
('lead_0001', 'R.K. Sharma', 'Adani Power Ltd', 'rk.sharma@adani.com', '9876543210', 'Senior Manager - Maintenance', 'Exhibition', 'Qualified', 8500000, 40, 'Rajesh Mehta', 'Power', 'Met at PowerGen India 2024 exhibition. Interested in annual maintenance contract for Mundra plant. Requires mechanical and electrical maintenance crew of 25 personnel.', 'Active', '2025-06-30', '2025-01-10 09:30:00.000', '2025-01-25 14:20:00.000'),

('lead_0002', 'Alok Verma', 'Hindalco Industries', 'alok.verma@hindalco.com', '9876543211', 'Head - Plant Engineering', 'Referral', 'Proposal', 12000000, 65, 'Vikram Pandey', 'Metals & Mining', 'Referred by Reliance Industries site team. Hindalco Hirakud smelter needs comprehensive maintenance services for potline and cast house. Proposal submitted for ₹1.2 Cr.', 'Active', '2025-05-15', '2024-11-20 11:00:00.000', '2025-02-10 16:45:00.000'),

('lead_0003', 'Sunil Khanna', 'JSPL (Jindal Steel & Power)', 'sunil.khanna@jspl.com', '9876543212', 'DGM - Maintenance', 'Cold Call', 'Contacted', 5500000, 20, 'Nagarjuna Reddy', 'Steel', 'Cold call outreach. JSPL Raigarh plant has upcoming blast furnace reline scheduled Q3 2025. Need specialized refractory and mechanical crew. Initial meeting scheduled.', 'Active', '2025-09-30', '2025-02-01 10:15:00.000', '2025-02-15 09:00:00.000'),

('lead_0004', 'Meera Krishnan', 'Grasim Industries', 'meera.k@grasim.com', '9876543213', 'VP - Operations', 'Website', 'Negotiation', 18000000, 80, 'Rajesh Mehta', 'Cement', 'Inquiry received through website for Vikram Cement works. Negotiation in progress for a 3-year comprehensive O&M contract covering kiln, raw mill, and cement mill. High-value opportunity.', 'Active', '2025-04-30', '2024-10-05 08:45:00.000', '2025-02-20 11:30:00.000'),

('lead_0005', 'Dinesh Gupta', 'Dalmia Cement (Bharat) Ltd', 'dinesh.gupta@dalmiacement.com', '9876543214', 'Plant Manager', 'LinkedIn', 'Lead', 3500000, 10, 'Arun Sharma', 'Cement', 'Connected via LinkedIn. Dalmia Cuttack plant exploring third-party maintenance options. Sent introductory email with company profile. Awaiting response.', 'Active', '2025-12-31', '2025-02-10 15:30:00.000', '2025-02-10 15:30:00.000'),

('lead_0006', 'Prakash Iyer', 'HPCL (Hindustan Petroleum)', 'prakash.iyer@hpcl.in', '9876543215', 'Senior Engineer - Mechanical', 'Existing Customer', 'Won', 6200000, 100, 'Suresh Patel', 'Oil & Gas', 'Converted from lead to customer. HPCL Visakhapatnam refinery awarded AMC contract for rotating equipment maintenance. Contract signed for ₹62 Lakhs.', 'Won', '2025-01-31', '2024-09-15 10:00:00.000', '2025-01-15 17:00:00.000'),

('lead_0007', 'Vijay Menon', 'BPCL (Bharat Petroleum)', 'vijay.menon@bharatpetroleum.in', '9876543216', 'Manager - Maintenance Services', 'Exhibition', 'Qualified', 9500000, 45, 'Vikram Pandey', 'Oil & Gas', 'Met at India Refining Expo 2024. BPCL Mumbai refinery requires shutdown management services for CDU and VDU units in Q4 2025. Technical discussion in progress.', 'Active', '2025-10-31', '2024-12-10 14:00:00.000', '2025-02-05 10:20:00.000'),

('lead_0008', 'Harpreet Singh', 'SAIL (Steel Authority of India)', 'harpreet.singh@sail.co.in', '9876543217', 'CGM - Maintenance', 'Referral', 'Proposal', 15000000, 55, 'Rajesh Mehta', 'Steel', 'Referred by L&T Valves team. SAIL Bokaro steel plant requires complete blast furnace maintenance package including cooling system, tuyere replacement, and cast house upkeep. Proposal sent.', 'Active', '2025-08-31', '2024-11-01 09:30:00.000', '2025-02-18 15:00:00.000'),

('lead_0009', 'Tapan Sahoo', 'NALCO (National Aluminium Company)', 'tapan.sahoo@nalco.co.in', '9876543218', 'DGM - Smelter Maintenance', 'Cold Call', 'Lost', 4000000, 0, 'Nagarjuna Reddy', 'Metals & Mining', 'NALCO Angul smelter maintenance inquiry. Lost to competitor (SIMCO) who offered lower pricing. Will revisit during next contract renewal cycle in 2026.', 'Lost', '2025-03-31', '2024-08-20 11:30:00.000', '2025-01-20 12:00:00.000'),

('lead_0010', 'Anand Rao', 'Vedanta Ltd', 'anand.rao@vedanta.com', '9876543219', 'Head - Asset Management', 'Website', 'Contacted', 7500000, 25, 'Arun Sharma', 'Metals & Mining', 'Website inquiry from Vedanta Aluminium Lanjigarh. Request for quotation for preventive maintenance of alumina refinery equipment. Site visit conducted on Feb 10.', 'Active', '2025-11-30', '2025-01-28 13:45:00.000', '2025-02-12 09:15:00.000');


-- ============================================================================
-- INSERT DATA: Enquiries (12 records)
-- ============================================================================
-- Specific service enquiries raised by leads covering AMC, shutdowns,
-- emergency repairs, site surveys, and turnkey maintenance projects.
-- ============================================================================

INSERT INTO Enquiry (id, leadId, subject, description, priority, status, assignedTo, dueDate, createdAt, updatedAt) VALUES
('enq_0001', 'lead_0001', 'AMC Inquiry - Mundra Power Plant Mechanical Maintenance', 'Adani Power Mundra requires annual maintenance contract for mechanical systems including boiler auxiliaries, turbine auxiliaries, and coal handling plant. Crew strength needed: 15 mechanical fitters and welders.', 'High', 'In Progress', 'Rajesh Mehta', '2025-03-15', '2025-01-12 10:00:00.000', '2025-02-08 14:30:00.000'),

('enq_0002', 'lead_0001', 'Electrical Maintenance Services - Generator and Transformer', 'Quotation needed for electrical maintenance of 660MW generator and associated transformers at Mundra. Includes PD testing, insulation resistance measurement, and protection relay calibration.', 'High', 'Open', 'Amit Joshi', '2025-03-30', '2025-01-15 11:30:00.000', '2025-01-15 11:30:00.000'),

('enq_0003', 'lead_0002', 'Comprehensive O&M Proposal - Hirakud Smelter', 'Hindalco Hirakud smelter requires full O&M for potline (340 pots), cast house (2 casting lines), and carbon plant. Proposal submitted covering manpower, tools, and supervision.', 'High', 'In Progress', 'Vikram Pandey', '2025-02-28', '2024-11-25 09:00:00.000', '2025-02-10 16:00:00.000'),

('enq_0004', 'lead_0003', 'Blast Furnace Relining Support - Raigarh', 'JSPL Raigarh requires specialized crew for blast furnace #2 reline in Q3 2025. Need refractory specialists, riggers, and mechanical fitters for 45-day campaign.', 'Medium', 'Open', 'Nagarjuna Reddy', '2025-04-30', '2025-02-05 14:00:00.000', '2025-02-05 14:00:00.000'),

('enq_0005', 'lead_0004', '3-Year O&M Contract - Vikram Cement Works', 'Grasim Vikram Cement requires comprehensive 3-year O&M covering kiln (6000 TPD), raw mill (VRM), coal mill, and cement mill. Includes predictive maintenance using vibration analysis.', 'High', 'In Progress', 'Rajesh Mehta', '2025-03-31', '2024-10-10 10:30:00.000', '2025-02-20 11:00:00.000'),

('enq_0006', 'lead_0005', 'Preventive Maintenance Consultation - Cuttack Plant', 'Dalmia Cement Cuttack seeking consultation and possible engagement for preventive maintenance program development. Includes checklist preparation, condition monitoring, and training.', 'Low', 'Open', 'Arun Sharma', '2025-05-31', '2025-02-12 09:00:00.000', '2025-02-12 09:00:00.000'),

('enq_0007', 'lead_0007', 'Shutdown Management - CDU/VDU Turnaround Mumbai Refinery', 'BPCL Mumbai refinery shutdown planned for Oct-Nov 2025. Scope includes CDU and VDU turnaround management, manpower deployment (200+), and complete shutdown planning services.', 'High', 'In Progress', 'Vikram Pandey', '2025-03-15', '2024-12-15 13:00:00.000', '2025-02-05 10:00:00.000'),

('enq_0008', 'lead_0008', 'Blast Furnace Maintenance Package - Bokaro Steel Plant', 'SAIL Bokaro requires comprehensive BF maintenance for #3 and #4 blast furnaces. Scope includes cooling system overhaul, tuyere replacement, tap hole drill maintenance, and cast house refractory repair.', 'High', 'In Progress', 'Rajesh Mehta', '2025-04-15', '2024-11-05 15:00:00.000', '2025-02-18 14:30:00.000'),

('enq_0009', 'lead_0009', 'Smelter Maintenance Quotation - Angul', 'NALCO Angul smelter pot maintenance and anode handling services. Lost to competitor - SIMCO offered ₹3.5 Cr vs our ₹4.0 Cr. Need to revisit pricing strategy.', 'Medium', 'Lost', 'Nagarjuna Reddy', '2025-01-31', '2024-08-25 10:00:00.000', '2025-01-20 11:00:00.000'),

('enq_0010', 'lead_0009', 'Emergency Repair Services - Pot Room Roof Leakage', 'Emergency request for pot room roof leakage repair at NALCO Angul. Could not mobilize in required 48-hour window due to resource constraints. Opportunity lost.', 'High', 'Lost', 'Vikram Pandey', '2024-11-15', '2024-10-30 08:00:00.000', '2024-11-10 16:00:00.000'),

('enq_0011', 'lead_0010', 'Alumina Refinery PM Program - Lanjigarh', 'Vedanta Lanjigarh alumina refinery requires preventive maintenance for digestion, precipitation, and calcination sections. Includes monthly schedule, spare parts management, and performance reporting.', 'Medium', 'Open', 'Arun Sharma', '2025-04-30', '2025-01-30 11:00:00.000', '2025-02-12 09:00:00.000'),

('enq_0012', 'lead_0010', 'Site Survey and Feasibility Report - Vedanta Lanjigarh', 'Request for detailed site survey and feasibility report covering current maintenance practices, manpower assessment, and gap analysis at Lanjigarh refinery.', 'Medium', 'In Progress', 'Venkat Rao', '2025-03-15', '2025-02-01 14:00:00.000', '2025-02-12 10:00:00.000');


-- ============================================================================
-- INSERT DATA: Customer Interactions (20 records)
-- ============================================================================
-- Records of calls, emails, meetings, site visits, and video conferences
-- with both leads and existing customers, tracking outcomes and next actions.
-- ============================================================================

INSERT INTO CustomerInteraction (id, leadId, customerId, type, subject, notes, outcome, nextAction, nextActionDate, createdBy, createdAt, updatedAt) VALUES
-- Lead-based interactions
('ci_0001', 'lead_0001', NULL, 'Meeting', 'Initial Meeting - Adani Power AMC Discussion', 'Met R.K. Sharma at VoltCore Mumbai office. Discussed AMC scope for Mundra plant covering mechanical maintenance of boiler auxiliaries and turbine support systems. Presented company credentials and past AMC references.', 'Client interested, requested detailed scope and pricing', 'Submit detailed proposal with manpower plan', '2025-02-15', 'Rajesh Mehta', '2025-01-12 14:00:00.000', '2025-01-12 14:00:00.000'),

('ci_0002', 'lead_0001', NULL, 'Call', 'Follow-up Call - Adani Power Proposal Status', 'Called R.K. Sharma to discuss submitted proposal. Client has shared the proposal with their internal finance team. Budget approval expected by March first week. No changes required in scope.', 'Proposal under internal review, positive feedback on technical approach', 'Follow up on Feb 28 for budget approval update', '2025-02-28', 'Rajesh Mehta', '2025-02-10 11:00:00.000', '2025-02-10 11:00:00.000'),

('ci_0003', 'lead_0002', NULL, 'Email', 'Hindalco Proposal Submission - Hirakud O&M', 'Sent comprehensive O&M proposal for Hindalco Hirakud smelter covering potline, cast house, and carbon plant maintenance. Proposal value ₹1.2 Cr annually. Included manpower chart, shift plan, and KPI framework.', 'Proposal delivered via email, acknowledgment received', 'Schedule video conference for proposal walkthrough', '2025-02-08', 'Vikram Pandey', '2025-01-30 09:00:00.000', '2025-01-30 09:00:00.000'),

('ci_0004', 'lead_0002', NULL, 'Video Conference', 'Proposal Walkthrough - Hindalco Hirakud O&M', '2-hour video conference with Alok Verma and his team of 5 engineers. Walked through each section of the proposal. Client raised queries about safety compliance, tool management, and emergency response protocols. Clarified all points.', 'Client satisfied with proposal, requested minor modifications in shift roster', 'Send revised proposal with updated shift plan', '2025-02-20', 'Vikram Pandey', '2025-02-08 14:00:00.000', '2025-02-08 14:00:00.000'),

('ci_0005', 'lead_0003', NULL, 'Call', 'Cold Call Outreach - JSPL Raigarh Maintenance', 'Initial cold call to Sunil Khanna at JSPL Raigarh. Introduced VoltCore services for blast furnace maintenance. Client mentioned upcoming BF reline in Q3 2025. Expressed interest in exploring third-party execution.', 'Warm reception, client agreed to initial meeting', 'Send company profile and schedule site visit', '2025-02-20', 'Nagarjuna Reddy', '2025-02-03 10:30:00.000', '2025-02-03 10:30:00.000'),

('ci_0006', 'lead_0004', NULL, 'Meeting', 'Contract Negotiation - Grasim Vikram Cement O&M', 'Day-long meeting at Grasim corporate office Mumbai with Meera Krishnan and VP-Finance. Negotiated on contract duration, rate escalation clause, and performance guarantees. Discussed penalty/bonus framework based on plant availability targets.', 'Core terms agreed, pending legal review', 'Share draft contract for legal vetting', '2025-03-05', 'Rajesh Mehta', '2025-02-15 10:00:00.000', '2025-02-15 10:00:00.000'),

('ci_0007', 'lead_0005', NULL, 'Email', 'Introduction and Capabilities - Dalmia Cement', 'Sent introductory email to Dinesh Gupta at Dalmia Cement with VoltCore company profile, client testimonials, and service brochures. Highlighted experience in cement plant maintenance with UltraTech and Grasim references.', 'Email sent, awaiting response', 'Follow up with phone call after 3 days', '2025-02-14', 'Arun Sharma', '2025-02-11 09:00:00.000', '2025-02-11 09:00:00.000'),

('ci_0008', 'lead_0007', NULL, 'Site Visit', 'Pre-bid Site Visit - BPCL Mumbai Refinery', 'Visited BPCL Mumbai refinery with team of 3 engineers. Conducted walk-through of CDU and VDU units planned for turnaround. Documented access constraints, existing conditions, and safety requirements. Met shutdown planning team.', 'Site assessment complete, gathered all technical inputs for proposal', 'Prepare and submit shutdown management proposal', '2025-03-01', 'Vikram Pandey', '2025-01-20 09:00:00.000', '2025-01-20 09:00:00.000'),

('ci_0009', 'lead_0008', NULL, 'Meeting', 'Technical Discussion - SAIL Bokaro BF Maintenance', 'Meeting at SAIL Bokaro with Harpreet Singh and maintenance team. Discussed BF #3 and #4 maintenance scope in detail. Client shared previous vendor performance data and areas of concern. Agreed on our approach for cooling system and tuyere management.', 'Technical alignment achieved, commercial terms to be discussed', 'Submit revised commercial proposal', '2025-03-10', 'Rajesh Mehta', '2025-02-12 10:00:00.000', '2025-02-12 10:00:00.000'),

('ci_0010', 'lead_0010', NULL, 'Site Visit', 'Site Survey - Vedanta Lanjigarh Refinery', 'Visited Vedanta Lanjigarh alumina refinery with Venkat Rao. Conducted detailed condition assessment of digestion area, precipitation tanks, and calcination kiln. Identified maintenance gaps and improvement opportunities. Took measurements and photographs.', 'Comprehensive survey completed, report preparation in progress', 'Submit feasibility report with recommendations', '2025-03-01', 'Arun Sharma', '2025-02-10 08:00:00.000', '2025-02-10 08:00:00.000'),

('ci_0011', 'lead_0010', NULL, 'Call', 'Post-Site Visit Discussion - Vedanta Lanjigarh', 'Called Anand Rao to discuss site visit findings. Shared preliminary observations about equipment condition and maintenance gaps. Client appreciated the thoroughness of assessment and is keen to receive the detailed report.', 'Client impressed with survey quality, awaiting formal report', 'Email draft feasibility report for review', '2025-02-25', 'Arun Sharma', '2025-02-14 11:00:00.000', '2025-02-14 11:00:00.000'),

-- Customer-based interactions (existing customers)
('ci_0012', NULL, 'cust_001', 'Meeting', 'Quarterly Review Meeting - Reliance Jamnagar AMC', 'Quarterly business review meeting at Reliance Jamnagar refinery with maintenance head. Reviewed AMC performance for Q4 2024. Plant availability achieved 97.2% against target of 96%. Discussed Q1 2025 maintenance calendar and shutdown requirements.', 'Performance review positive, client renewed AMC for another year', 'Update AMC schedule and deploy additional 5 fitters', '2025-03-01', 'Rajesh Mehta', '2025-01-15 10:00:00.000', '2025-01-15 10:00:00.000'),

('ci_0013', NULL, 'cust_002', 'Call', 'Shutdown Planning Update - Tata Steel BF-3', 'Call with Tata Steel maintenance planning team regarding upcoming BF-3 shutdown. Discussed mobilization plan, critical path activities, and resource requirements. Confirmed crew of 80 personnel deployment starting March 15.', 'Shutdown plan finalized, mobilization dates confirmed', 'Complete workforce allocation and tool dispatch', '2025-03-10', 'Sanjay Kumar Singh', '2025-02-05 09:30:00.000', '2025-02-05 09:30:00.000'),

('ci_0014', NULL, 'cust_003', 'Email', 'Monthly Performance Report - NTPC Singrauli O&M', 'Sent monthly performance report for January 2025 to NTPC Singrauli plant management. Reported 99.1% boiler availability, 3 planned outages completed on schedule, and zero safety incidents. Shared February maintenance plan.', 'Monthly report submitted, client acknowledged with appreciation', 'Continue regular reporting schedule', '2025-03-05', 'Vikram Pandey', '2025-02-03 08:00:00.000', '2025-02-03 08:00:00.000'),

('ci_0015', NULL, 'cust_004', 'Visit', 'Site Inspection - UltraTech Tadipatri Kiln PM', 'Visited UltraTech Cement Tadipatri plant for periodic kiln inspection along with QA/QC team. Inspected kiln shell, refractory condition, roller stations, and drive system. Identified minor roller alignment issue requiring correction.', 'Inspection complete, maintenance recommendation submitted', 'Schedule roller alignment correction during next window', '2025-03-15', 'Nagarjuna Reddy', '2025-02-08 09:00:00.000', '2025-02-08 09:00:00.000'),

('ci_0016', NULL, 'cust_005', 'Video Conference', 'Pre-Shutdown Planning - IOCL Panipat Turnaround', 'Video conference with IOCL Panipat refinery shutdown team. Reviewed turnaround scope for CDU unit, identified 42 critical activities, and agreed on joint planning approach. VoltCore to provide shutdown manager and 150 craft personnel.', 'Planning approach agreed, detailed schedule to be prepared jointly', 'Prepare and share draft shutdown schedule', '2025-03-20', 'Arun Sharma', '2025-02-12 14:00:00.000', '2025-02-12 14:00:00.000'),

('ci_0017', NULL, 'cust_006', 'Call', 'Routine Check-in - JSW Vijayanagar AMC', 'Monthly check-in call with JSW Steel Vijayanagar maintenance coordinator. Discussed ongoing AMC performance for hot strip mill. No major issues reported. One minor motor replacement pending due to spare availability.', 'Routine call, all operations normal', 'Follow up on motor spare delivery status', '2025-02-28', 'Pradeep Rao', '2025-02-07 10:00:00.000', '2025-02-07 10:00:00.000'),

('ci_0018', NULL, 'cust_007', 'Meeting', 'Post-Award Kickoff Meeting - HPCL Visakhapatnam AMC', 'Kickoff meeting at HPCL Visakhapatnam refinery after AMC contract award. Met with plant maintenance head, safety team, and operations manager. Aligned on scope boundaries, access protocols, safety permits, and reporting requirements.', 'Successful kickoff, site access and permits aligned', 'Deploy initial team of 12 personnel by Feb 20', '2025-02-20', 'Suresh Patel', '2025-01-20 10:00:00.000', '2025-01-20 10:00:00.000'),

('ci_0019', NULL, 'cust_008', 'Email', 'New Business Opportunity Discussion - Hindalco', 'Email to Hindalco procurement team exploring additional maintenance opportunities beyond current engagement. Suggested expanded scope including electrical maintenance and instrumentation services for Renukoot smelter.', 'Client showed interest, requested separate proposal', 'Prepare supplementary proposal for electrical and instrumentation', '2025-03-10', 'Amit Joshi', '2025-02-10 09:30:00.000', '2025-02-10 09:30:00.000'),

('ci_0020', 'lead_0004', NULL, 'Call', 'Legal Review Status - Grasim O&M Contract', 'Called Meera Krishnan to check on legal review status of draft O&M contract for Vikram Cement. Legal team has raised 3 clauses for modification - indemnity cap, liability limitation, and force majeure provisions.', 'Legal review in progress, 3 clauses flagged for negotiation', 'Coordinate with legal team and prepare counter-proposal', '2025-03-01', 'Rajesh Mehta', '2025-02-22 11:00:00.000', '2025-02-22 11:00:00.000');


-- ============================================================================
-- INSERT DATA: Follow-Ups (15 records)
-- ============================================================================
-- Scheduled follow-up actions ensuring continuous engagement with leads,
-- enquiries, and customers throughout the sales and service lifecycle.
-- ============================================================================

INSERT INTO FollowUp (id, leadId, enquiryId, customerId, scheduledDate, subject, notes, status, assignedTo, completedDate, outcome, createdAt, updatedAt) VALUES
('fu_0001', 'lead_0001', 'enq_0001', NULL, '2025-02-15', 'Submit Detailed AMC Proposal - Adani Mundra', 'Prepare and submit comprehensive AMC proposal for Adani Power Mundra covering mechanical maintenance scope, manpower plan, shift schedule, and commercial terms.', 'Completed', 'Rajesh Mehta', '2025-02-14', 'Proposal submitted covering 15-person crew for boiler aux and turbine support. Value ₹85 Lakhs. Client acknowledged receipt.', '2025-01-12 14:30:00.000', '2025-02-14 17:00:00.000'),

('fu_0002', 'lead_0001', 'enq_0001', NULL, '2025-02-28', 'Follow up on Budget Approval - Adani Power', 'Check with R.K. Sharma on internal budget approval status for AMC proposal. Finance team was reviewing as of last call.', 'Scheduled', 'Rajesh Mehta', NULL, NULL, '2025-02-10 11:30:00.000', '2025-02-10 11:30:00.000'),

('fu_0003', 'lead_0002', 'enq_0003', NULL, '2025-02-20', 'Submit Revised Proposal - Hindalco Hirakud O&M', 'Send revised O&M proposal incorporating modified shift roster as requested by Alok Verma during video conference walkthrough.', 'Completed', 'Vikram Pandey', '2025-02-19', 'Revised proposal sent with updated 3-shift roster replacing 2-shift plan. Also added additional safety compliance section per client request.', '2025-02-08 15:00:00.000', '2025-02-19 10:00:00.000'),

('fu_0004', 'lead_0002', 'enq_0003', NULL, '2025-03-10', 'Contract Negotiation Meeting - Hindalco', 'Schedule in-person meeting at Hindalco Hirakud office for contract finalization. Expected participants: Alok Verma, Finance head, and Legal advisor.', 'Scheduled', 'Vikram Pandey', NULL, NULL, '2025-02-19 10:30:00.000', '2025-02-19 10:30:00.000'),

('fu_0005', 'lead_0003', 'enq_0004', NULL, '2025-02-25', 'Site Visit and Meeting - JSPL Raigarh', 'Visit JSPL Raigarh plant to understand blast furnace reline requirements. Meet Sunil Khanna and conduct plant walk-through. Assess mobilization logistics.', 'Completed', 'Nagarjuna Reddy', '2025-02-24', 'Site visit completed. Inspected BF#2 and reviewed reline scope. Client shared tentative schedule - Aug-Sep 2025, 45-day campaign. Need 60 specialized personnel.', '2025-02-05 15:00:00.000', '2025-02-24 16:00:00.000'),

('fu_0006', 'lead_0004', 'enq_0005', NULL, '2025-03-05', 'Share Draft Contract - Grasim Vikram Cement', 'Share draft 3-year O&M contract with Grasim legal team based on agreed terms from Feb 15 negotiation meeting.', 'Scheduled', 'Rajesh Mehta', NULL, NULL, '2025-02-15 17:00:00.000', '2025-02-15 17:00:00.000'),

('fu_0007', 'lead_0005', NULL, NULL, '2025-02-14', 'Follow-up Call - Dalmia Cement Introduction', 'Call Dinesh Gupta to follow up on introductory email sent on Feb 11. Gauge interest in VoltCore services and schedule an exploratory meeting if receptive.', 'Completed', 'Arun Sharma', '2025-02-14', 'Spoke with Dinesh Gupta for 15 minutes. He is interested but currently tied up with annual maintenance budget planning. Requested callback in April 2025.', '2025-02-11 10:00:00.000', '2025-02-14 11:30:00.000'),

('fu_0008', 'lead_0007', 'enq_0007', NULL, '2025-03-01', 'Submit Shutdown Proposal - BPCL Mumbai Refinery', 'Prepare and submit comprehensive shutdown management proposal for BPCL Mumbai CDU/VDU turnaround. Include resource plan, schedule, and safety management system.', 'Completed', 'Vikram Pandey', '2025-02-28', 'Submitted detailed shutdown proposal covering 200+ manpower, 60-day schedule, and safety management framework. Value ₹95 Lakhs for shutdown management services.', '2025-01-20 10:30:00.000', '2025-02-28 14:00:00.000'),

('fu_0009', 'lead_0008', 'enq_0008', NULL, '2025-03-10', 'Submit Revised Commercial Proposal - SAIL Bokaro', 'Submit revised commercial proposal for SAIL Bokaro BF maintenance incorporating feedback from Feb 12 technical meeting. Adjust pricing and include additional scope items.', 'Scheduled', 'Rajesh Mehta', NULL, NULL, '2025-02-12 11:30:00.000', '2025-02-12 11:30:00.000'),

('fu_0010', 'lead_0010', 'enq_0011', NULL, '2025-02-25', 'Submit Feasibility Report - Vedanta Lanjigarh', 'Email draft feasibility report to Anand Rao covering site survey findings, current maintenance gaps, improvement recommendations, and proposed PM program structure.', 'Scheduled', 'Arun Sharma', NULL, NULL, '2025-02-10 09:30:00.000', '2025-02-10 09:30:00.000'),

('fu_0011', 'lead_0010', 'enq_0012', NULL, '2025-03-15', 'Present Findings at Vedanta Lanjigarh', 'Travel to Vedanta Lanjigarh refinery to present feasibility report findings to plant management team. Include recommendations for PM program implementation.', 'Scheduled', 'Arun Sharma', NULL, NULL, '2025-02-12 10:30:00.000', '2025-02-12 10:30:00.000'),

('fu_0012', NULL, NULL, 'cust_001', '2025-03-01', 'Deploy Additional Fitters - Reliance Jamnagar', 'Deploy 5 additional mechanical fitters to Reliance Jamnagar site per QBR agreement. Coordinate with HR for mobilization and site admin for access cards and accommodation.', 'Completed', 'Rajesh Mehta', '2025-02-28', '5 fitters mobilized - VC-015 Mohan Lal, and 4 additional contract fitters. All access cards and accommodation arranged. Deployed on March 1 as scheduled.', '2025-01-16 09:00:00.000', '2025-02-28 15:00:00.000'),

('fu_0013', NULL, NULL, 'cust_005', '2025-03-20', 'Submit Draft Shutdown Schedule - IOCL Panipat', 'Prepare and share draft CDU turnaround shutdown schedule with IOCL Panipat refinery team. Include critical path, resource loading, and milestone dates.', 'Scheduled', 'Arun Sharma', NULL, NULL, '2025-02-12 15:00:00.000', '2025-02-12 15:00:00.000'),

('fu_0014', NULL, NULL, 'cust_008', '2025-03-10', 'Submit Supplementary Proposal - Hindalco Electrical', 'Prepare supplementary proposal for Hindalco Renukoot covering electrical maintenance and instrumentation calibration services as discussed via email.', 'Scheduled', 'Amit Joshi', NULL, NULL, '2025-02-10 10:00:00.000', '2025-02-10 10:00:00.000'),

('fu_0015', 'lead_0004', NULL, NULL, '2025-03-15', 'Legal Clause Negotiation - Grasim O&M Contract', 'Coordinate with VoltCore legal team and prepare counter-proposal for 3 flagged clauses in Grasim O&M contract: indemnity cap, liability limitation, and force majeure provisions.', 'Scheduled', 'Rajesh Mehta', NULL, NULL, '2025-02-22 11:30:00.000', '2025-02-22 11:30:00.000')
