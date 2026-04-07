-- ============================================================================
-- MODULE 09: Performance & Recruitment
-- ============================================================================
-- Company : VoltCore Engineering Pvt Ltd
-- Domain  : Industrial Plant Maintenance Contractor
-- ============================================================================
-- Tables  : PerformanceReview, JobOpening, Candidate
-- FK Refs : PerformanceReview.empId -> Employee(id)
--           JobOpening.department -> Department(id)
--           Candidate.jobOpeningId -> JobOpening(id)
-- Context : Quarterly performance appraisals for plant maintenance staff;
--           recruitment tracking for site-based technical and safety roles
-- ============================================================================

-- ============================================================================
-- TABLE: PerformanceReview
-- Stores quarterly and annual performance appraisal records for all employees.
-- Reviews are initiated by HR, filled by supervisors, and approved by HODs.
-- Ratings follow a 1.0-5.0 scale aligned with Indian engineering industry norms.
-- ============================================================================
CREATE TABLE PerformanceReview (
  id                  VARCHAR(25)   NOT NULL PRIMARY KEY,
  empId               VARCHAR(25)   NOT NULL,
  period              VARCHAR(50)   NOT NULL,
  reviewer            VARCHAR(255)  DEFAULT NULL,
  rating              DECIMAL(3,1)  DEFAULT NULL,
  goals               TEXT          DEFAULT NULL,
  achievements        TEXT          DEFAULT NULL,
  areasForImprovement TEXT          DEFAULT NULL,
  remarks             TEXT          DEFAULT NULL,
  status              VARCHAR(50)   NOT NULL DEFAULT 'Draft',
  reviewDate          DATE          DEFAULT NULL,
  createdAt           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_performanceReview_empId (empId),
  INDEX idx_performanceReview_status (status),
  CONSTRAINT fk_performanceReview_employee FOREIGN KEY (empId) REFERENCES Employee (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: JobOpening
-- Tracks open positions across sites and departments. Positions are raised by
-- site incharges based on project manpower requirements and approved by HR.
-- Priority levels help HR allocate recruitment bandwidth effectively.
-- ============================================================================
CREATE TABLE JobOpening (
  id            VARCHAR(25)   NOT NULL PRIMARY KEY,
  position      VARCHAR(255)  NOT NULL,
  department    VARCHAR(25)   NOT NULL,
  site          VARCHAR(255)  DEFAULT NULL,
  openings      INT           NOT NULL,
  applications  INT           NOT NULL DEFAULT 0,
  experienceMin VARCHAR(50)   DEFAULT NULL,
  experienceMax VARCHAR(50)   DEFAULT NULL,
  salaryRange   VARCHAR(100)  DEFAULT NULL,
  priority      VARCHAR(50)   DEFAULT NULL,
  status        VARCHAR(50)   NOT NULL DEFAULT 'Open',
  postedDate    DATE          DEFAULT NULL,
  closingDate   DATE          DEFAULT NULL,
  createdAt     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_jobOpening_department (department),
  INDEX idx_jobOpening_status (status),
  CONSTRAINT fk_jobOpening_department FOREIGN KEY (department) REFERENCES Department (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: Candidate
-- Manages the complete recruitment pipeline from application to onboarding.
-- Each candidate is linked to a specific job opening. Interview rounds and
-- ratings help the panel make data-driven hiring decisions for site roles.
-- ============================================================================
CREATE TABLE Candidate (
  id               VARCHAR(25)   NOT NULL PRIMARY KEY,
  jobOpeningId     VARCHAR(25)   NOT NULL,
  name             VARCHAR(255)  NOT NULL,
  email            VARCHAR(255)  DEFAULT NULL,
  phone            VARCHAR(50)   DEFAULT NULL,
  experience       VARCHAR(100)  DEFAULT NULL,
  qualification    VARCHAR(255)  DEFAULT NULL,
  currentCompany   VARCHAR(255)  DEFAULT NULL,
  skills           TEXT          DEFAULT NULL,
  status           VARCHAR(50)   NOT NULL DEFAULT 'Applied',
  interviewDate    DATE          DEFAULT NULL,
  interviewRound   VARCHAR(50)   DEFAULT NULL,
  rating           DECIMAL(3,1)  DEFAULT NULL,
  remarks          TEXT          DEFAULT NULL,
  createdAt        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX idx_candidate_jobOpeningId (jobOpeningId),
  INDEX idx_candidate_status (status),
  CONSTRAINT fk_candidate_jobOpening FOREIGN KEY (jobOpeningId) REFERENCES JobOpening (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DATA INSERTS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- PerformanceReview (10 records)
-- Q4 2024 reviews for employees emp_0001 through emp_0010.
-- Reviewers are department heads and senior managers from VoltCore management.
-- Ratings range from 3.0 to 4.8 reflecting diverse performance levels.
-- -----------------------------------------------------------------------------
INSERT INTO PerformanceReview (id, empId, period, reviewer, rating, goals, achievements, areasForImprovement, remarks, status, reviewDate, createdAt, updatedAt) VALUES
('perf_0001', 'emp_0001', 'Q4 2024', 'Anil Kulkarni - VP Engineering', 4.5,
 'Complete Reliance Jamnagar CDU overhaul; mentor junior engineers; reduce equipment downtime by 10%',
 'Successfully led 45-day CDU overhaul with zero LTIs; trained 3 junior engineers on vibration analysis; downtime reduced by 14%',
 'Needs to improve documentation habits and timely submission of monthly progress reports',
 'Consistent top performer; recommended for promotion to Lead Engineer', 'Approved', '2025-01-15', NOW(), NOW()),

('perf_0002', 'emp_0002', 'Q4 2024', 'Vikram Pandey - Site Incharge', 4.0,
 'Supervise Tata Steel BF-3 shutdown mechanical crew; ensure quality of alignment jobs',
 'Delivered all critical path jobs on schedule; zero rework on coupling alignments; managed 18 technicians effectively',
 'Should take more initiative in safety toolbox talks and hazard reporting',
 'Reliable supervisor with good technical skills; potential for growth', 'Approved', '2025-01-12', NOW(), NOW()),

('perf_0003', 'emp_0003', 'Q4 2024', 'Rahul Deshmukh - Operations Manager', 4.8,
 'Manage NTPC Singrauli site operations; handle client coordination; ensure zero safety incidents',
 'Zero LTI for the entire quarter; client satisfaction score of 4.7/5; successfully handled emergency generator breakdown in 4 hours',
 'Delegate more tasks to subordinates; focus on strategic planning rather than hands-on work',
 'Outstanding performance; strong leadership qualities; recommended for higher responsibility', 'Approved', '2025-01-14', NOW(), NOW()),

('perf_0004', 'emp_0004', 'Q4 2024', 'Anil Gupta - Planning Manager', 3.8,
 'Complete shutdown planning for Tata Steel BF-3; optimize resource allocation across sites',
 'Shutdown plan completed 2 weeks ahead of schedule; resource optimization saved 8% on estimated costs',
 'Needs to improve MS Project scheduling skills and critical path analysis accuracy',
 'Solid planner with room for growth in advanced scheduling tools', 'Approved', '2025-01-10', NOW(), NOW()),

('perf_0005', 'emp_0005', 'Q4 2024', 'Anil Kulkarni - VP Engineering', 3.5,
 'Commission DCS upgrade at IOCL Panipat; support field instrumentation during turnaround',
 'DCS commissioning completed with all loop checks passing; supported 3 field teams during turnaround',
 'Should improve communication with client and respond faster to technical queries',
 'Technically competent but needs improvement in client-facing skills', 'Submitted', '2025-01-18', NOW(), NOW()),

('perf_0006', 'emp_0006', 'Q4 2024', 'Rahul Deshmukh - Operations Manager', 3.2,
 'Supervise electrical maintenance at JSW Vijayanagar; coordinate with client electrical team',
 'Completed scheduled PM of 12 HT motors; no unplanned outages attributed to electrical faults',
 'Needs to upskill on VFD troubleshooting and PLC-based systems; attendance needs improvement',
 'Average performer; put on performance improvement plan for Q1 2025', 'Submitted', '2025-01-16', NOW(), NOW()),

('perf_0007', 'emp_0007', 'Q4 2024', 'Rajesh Mehta - Senior Engineer', 4.2,
 'Handle electrical maintenance at Jamnagar site; support shutdown activities; manage vendor coordination',
 'Zero electrical downtime during Q4; completed switchgear overhaul ahead of schedule; coordinated with Siemens for drive replacement',
 'Should take lead on proposal preparation and estimation for electrical jobs',
 'Strong technical performer with good potential for project management roles', 'Approved', '2025-01-13', NOW(), NOW()),

('perf_0008', 'emp_0008', 'Q4 2024', 'Rajesh Mehta - Senior Engineer', 3.0,
 'Assist in mechanical maintenance tasks; learn hydraulic systems and pump overhaul procedures',
 'Completed pump overhaul training at Kirloskar facility; assisted in 8 pump overhauls on site',
 'Needs to be more proactive in identifying issues and suggesting solutions; improve report writing',
 'Improving steadily; needs more hands-on exposure to complex overhauls', 'Draft', '2025-01-20', NOW(), NOW()),

('perf_0009', 'emp_0009', 'Q4 2024', 'Ashok Pandit - HSE Manager', 4.3,
 'Conduct safety audits at NTPC Singrauli; deliver HSE training; manage work permit compliance',
 'Conducted 12 safety audits with 95% compliance score; trained 85 workers on confined space entry; zero incidents during quarter',
 'Should develop expertise in environmental compliance and waste management regulations',
 'Excellent safety professional; key asset for the HSE department', 'Approved', '2025-01-11', NOW(), NOW()),

('perf_0010', 'emp_0010', 'Q4 2024', 'Vikram Pandey - Site Incharge', 3.6,
 'Supervise welding crew at Tata Steel site; ensure weld quality as per AWS D1.1 standards',
 'All welds passed NDT with zero rejection rate; managed crew of 12 welders and 6 fitters during BF-3 shutdown',
 'Needs to obtain AWS CWI certification; should mentor junior welders more actively',
 'Dependable supervisor with strong welding domain knowledge', 'Submitted', '2025-01-17', NOW(), NOW());

-- -----------------------------------------------------------------------------
-- JobOpening (5 records)
-- Positions raised across VoltCore sites based on upcoming project requirements.
-- Departments: Engineering (dept_001), Safety & HSE (dept_003), QA/QC (dept_007),
-- Operations (dept_008). Sites mapped as per active project locations.
-- -----------------------------------------------------------------------------
INSERT INTO JobOpening (id, position, department, site, openings, applications, experienceMin, experienceMax, salaryRange, priority, status, postedDate, closingDate, createdAt, updatedAt) VALUES
('job_0001', 'Senior Mechanical Engineer',  'dept_001', 'Reliance Jamnagar Refinery',        2, 4, '5 Years',  '10 Years', '₹8,00,000 - ₹12,00,000 PA', 'High',   'Open',     '2024-12-01', '2025-01-31', NOW(), NOW()),
('job_0002', 'Safety Officer',              'dept_003', 'NTPC Singrauli Super Thermal',      1, 3, '3 Years',  '7 Years',  '₹5,00,000 - ₹7,00,000 PA',  'Medium', 'Open',     '2024-12-10', '2025-02-15', NOW(), NOW()),
('job_0003', 'QC Inspector',                'dept_007', 'Tata Steel Plant, Jamshedpur',      2, 3, '4 Years',  '8 Years',  '₹5,50,000 - ₹8,00,000 PA',  'High',   'Open',     '2024-12-15', '2025-02-28', NOW(), NOW()),
('job_0004', 'Electrician',                 'dept_008', 'IOCL Panipat Refinery',             3, 3, '2 Years',  '6 Years',  '₹3,50,000 - ₹5,00,000 PA',  'High',   'On Hold',  '2024-12-20', '2025-03-15', NOW(), NOW()),
('job_0005', 'Welding Supervisor',          'dept_008', 'JSW Steel Plant, Vijayanagar',      1, 2, '6 Years',  '12 Years', '₹7,00,000 - ₹10,00,000 PA', 'Medium', 'Open',     '2024-12-05', '2025-02-10', NOW(), NOW());

-- -----------------------------------------------------------------------------
-- Candidate (15 records)
-- 3 candidates per job opening covering various stages of the recruitment
-- pipeline: Applied, Screened, Interview, Scheduled, Selected, Rejected, Offered.
-- Candidates have realistic Indian industrial backgrounds and skillsets.
-- -----------------------------------------------------------------------------

-- Candidates for Senior Mechanical Engineer (job_0001)
INSERT INTO Candidate (id, jobOpeningId, name, email, phone, experience, qualification, currentCompany, skills, status, interviewDate, interviewRound, rating, remarks, createdAt, updatedAt) VALUES
('cand_0001', 'job_0001', 'Suresh Bhosale',    'suresh.bhosale@gmail.com',    '9876543210', '8 Years',  'BE Mechanical - Pune University',   'L&T Hydrocarbon',       'Rotary equipment, vibration analysis, predictive maintenance, MS Project', 'Selected',   '2025-01-05', 'Technical Round 2', 4.5, 'Excellent technical knowledge; strong hands-on experience with refinery rotating equipment. Recommended for immediate offer.', NOW(), NOW()),
('cand_0002', 'job_0001', 'Amit Rana',         'amit.rana@yahoo.com',         '9876543211', '6 Years',  'BE Mechanical - NIT Trichy',        'Thyssenkrupp Industries','Pump overhaul, alignment, CMMS, Six Sigma Green Belt',                          'Interview',  '2025-01-18', 'Technical Round 1', 4.0, 'Good fundamentals; needs assessment on refinery-specific experience. Shortlisted for second round.', NOW(), NOW()),
('cand_0003', 'job_0001', 'Ravi Shankar Mishra','ravi.mishra@outlook.com',     '9876543212', '3 Years',  'Diploma in Mechanical - Kanpur',     'Shalimar Paints Ltd',   'Preventive maintenance, basic machining, AutoCAD',                                 'Applied',    NULL,              NULL,                 NULL, 'Profile received via Naukri.com; initial screening pending.', NOW(), NOW()),

-- Candidates for Safety Officer (job_0002)
INSERT INTO Candidate (id, jobOpeningId, name, email, phone, experience, qualification, currentCompany, skills, status, interviewDate, interviewRound, rating, remarks, createdAt, updatedAt) VALUES
('cand_0004', 'job_0002', 'Manoj Tiwari',      'manoj.tiwari@gmail.com',      '9876543213', '7 Years',  'BSc Industrial Safety - Nagpur Univ','Adani Power - Mundra',  'Fire safety, confined space, work permit systems, NEBOSH IGC, ISO 45001 LA',       'Offered',    '2025-01-08', 'HR Round',           4.6, 'Outstanding safety professional; NEBOSH certified. Offer letter issued for ₹6.5 LPA. Awaiting acceptance.', NOW(), NOW()),
('cand_0005', 'job_0002', 'Prakash Jadhav',     'prakash.jadhav@gmail.com',    '9876543214', '4 Years',  'BSc Chemistry + Diploma in Safety',  'Mahindra & Mahindra',   'Hazard identification, safety audits, first aid training, OSHA 30-Hour',           'Scheduled',  '2025-01-25', 'Technical Round 1', NULL, 'Shortlisted from campus drive at Pune; interview scheduled with HSE Manager.', NOW(), NOW()),
('cand_0006', 'job_0002', 'Sandeep Kulkarni',   'sandeep.kulkarni@gmail.com',  '9876543215', '2 Years',  'BSc Industrial Safety',              'Kitex Garments',         'Safety documentation, PPE management, emergency drills',                             'Screened',   NULL,              NULL,                 3.0, 'Telephonic screening done; lacks power plant experience. Profile on hold.', NOW(), NOW()),

-- Candidates for QC Inspector (job_0003)
INSERT INTO Candidate (id, jobOpeningId, name, email, phone, experience, qualification, currentCompany, skills, status, interviewDate, interviewRound, rating, remarks, createdAt, updatedAt) VALUES
('cand_0007', 'job_0003', 'Dinesh Karthik',     'dinesh.karthik@gmail.com',    '9876543216', '10 Years', 'BE Metallurgy - Anna University',  'BHEL - Bhopal',          'NDT (RT, UT, MT, PT) ASNT Level II, welding inspection, AWS D1.1, API 510/570',    'Selected',   '2025-01-10', 'Final Discussion',    4.7, 'Highly experienced NDT professional; ASNT Level II in all four methods. Perfect fit for Tata Steel project.', NOW(), NOW()),
('cand_0008', 'job_0003', 'Ganesh Iyer',        'ganesh.iyer@gmail.com',       '9876543217', '5 Years',  'BE Mechanical - VTU Belgaum',       'Larsen & Toubro',        'UT, MT, thickness gauging, weld joint inspection, report preparation',              'Interview',  '2025-01-20', 'Technical Round 1', 4.1, 'Good NDT skills; limited experience with RT. Recommended for UT/MT focused role.', NOW(), NOW()),
('cand_0009', 'job_0003', 'Arun Nambiar',       'arun.nambiar@gmail.com',      '9876543218', '3 Years',  'Diploma in Mechanical - Kochi',     'Kitex Garments Ltd',     'Basic MT/PT, visual inspection, fit-up inspection',                                 'Rejected',   '2025-01-06', 'Screening',           2.5, 'Insufficient NDT certifications; lacks industrial plant experience. Not suitable for current requirement.', NOW(), NOW()),

-- Candidates for Electrician (job_0004)
INSERT INTO Candidate (id, jobOpeningId, name, email, phone, experience, qualification, currentCompany, skills, status, interviewDate, interviewRound, rating, remarks, createdAt, updatedAt) VALUES
('cand_0010', 'job_0004', 'Ramesh Yadav',       'ramesh.yadav@gmail.com',      '9876543219', '5 Years',  'ITI Electrician - NCVT',             'Havells India Ltd',      'HT/LT cable termination, panel wiring, VFD commissioning, PLC basics, earthing',    'Interview',  '2025-01-22', 'Trade Test',         4.0, 'Strong practical skills; cleared trade test with good score. Shortlisted for final round.', NOW(), NOW()),
('cand_0011', 'job_0004', 'Sunil Gaikwad',      'sunil.gaikwad@gmail.com',     '9876543220', '3 Years',  'ITI Electrician - NCVT',             'Crompton Greaves',       'LT panel wiring, motor connection, multimeter troubleshooting, conduit bending',     'Screened',   NULL,              NULL,                 3.5, 'Telephonic screening done; basic skills adequate. Experience limited to LT side.', NOW(), NOW()),
('cand_0012', 'job_0004', 'Vijay Patil',        'vijay.patil@gmail.com',       '9876543221', '2 Years',  'ITI Electrician - NCVT',             'Local Contractor',       'Domestic wiring, basic motor repair, simple fault finding',                           'Applied',    NULL,              NULL,                 NULL, 'Walk-in candidate from Panipat industrial area; awaiting screening.', NOW(), NOW()),

-- Candidates for Welding Supervisor (job_0005)
INSERT INTO Candidate (id, jobOpeningId, name, email, phone, experience, qualification, currentCompany, skills, status, interviewDate, interviewRound, rating, remarks, createdAt, updatedAt) VALUES
('cand_0013', 'job_0005', 'Kiran Salvi',        'kiran.salvi@gmail.com',       '9876543222', '9 Years',  'ITI Welder + AWS CWI',               'Reliance Industries',    'SMAW, GTAW, GMAW, welding supervision, WPS/PQR preparation, AWS D1.1, API 1104',     'Offered',    '2025-01-12', 'HR Round',           4.8, 'Exceptional candidate; AWS CWI certified with extensive refinery welding experience. Offer of ₹9.5 LPA issued.', NOW(), NOW()),
('cand_0014', 'job_0005', 'Mohan Das',          'mohan.das@gmail.com',         '9876543223', '7 Years',  'ITI Welder',                         'Essar Steel',            'SMAW, FCAW, structural welding, fit-up supervision, quality awareness',              'Rejected',   '2025-01-09', 'Technical Round 1', 3.0, 'Good welding skills but lacks certification for supervisory role. Recommended for welder position instead.', NOW(), NOW()),
('cand_0015', 'job_0005', 'Gurpreet Singh',     'gurpreet.singh@gmail.com',    '9876543224', '4 Years',  'Diploma in Mechanical + IIW Welder', 'Jindal Steel & Power',   'GTAW, GMAW, pipe welding (6G), welder qualification testing, basic NDT awareness',  'Interview',  '2025-01-23', 'Technical Round 1', 4.2, 'Strong pipe welding skills; needs supervisory exposure. Good potential for future growth.', NOW(), NOW())
