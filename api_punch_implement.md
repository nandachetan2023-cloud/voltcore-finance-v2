# 📄 implementation.md — eTimeOffice Biometric API → HRMS Integration

---

## 1. 🧠 Overview

This integration connects your HRMS with the eTimeOffice biometric system using REST APIs.

Base API:
https://api.etimeoffice.com/api/

### Supported Data Types:
- Raw punch logs
- Punch logs with machine ID
- IN/OUT processed attendance
- Incremental logs (recommended)

---

## 2. 🔐 Authentication

### Type: Basic Auth (Base64 encoded)

#### Format:
Authorization: base64(corporateid:username:password:true)

#### Example:
support:support:support@1:true  
→ base64 → c3VwcG9ydDpzdXBwb3J0OnN1cHBvcnQ6dHJ1ZTo=

#### Header:
Authorization: c3VwcG9ydDpzdXBwb3J0OnN1cHBvcnQ6dHJ1ZTo=

---

## 3. 📡 APIs Breakdown

---

### 🔹 3.1 Raw Punch Data API

#### Endpoint:
GET /api/DownloadPunchData

#### Example:
https://api.etimeoffice.com/api/DownloadPunchData?Empcode=ALL&FromDate=01/01/2024_00:00&ToDate=02/01/2024_00:00

#### Params:
| Param | Description |
|------|------------|
| Empcode | ALL or specific employee |
| FromDate | dd/MM/yyyy_HH:mm |
| ToDate | dd/MM/yyyy_HH:mm |

---

### 🔹 3.2 Raw Punch with Machine ID

GET /api/DownloadPunchDataMCID

#### Response:
```json
{
  "PunchData": [
    {
      "Name": "JIGNESH PADHIYAR",
      "Empcode": "0001",
      "PunchDate": "02/01/2020 15:58:00",
      "M_Flag": null,
      "mcid": "3"
    }
  ]
}
🔹 3.3 IN/OUT Processed Data (Recommended for HRMS)

GET /api/DownloadInOutPunchData

Example:

https://api.etimeoffice.com/api/DownloadInOutPunchData?Empcode=ALL&FromDate=10/01/2024&ToDate=10/01/2024

Response:
{
  "InOutPunchData": [
    {
      "Empcode": "0001",
      "INTime": "12:06",
      "OUTTime": "--:--",
      "WorkTime": "00:00",
      "OverTime": "00:00",
      "Status": "P/2",
      "DateString": "10/01/2019",
      "Late_In": "02:36",
      "Name": "JIGNESH PADHIAR"
    }
  ]
}
🔹 3.4 Incremental API (BEST PRACTICE)

GET /api/DownloadLastPunchData

Example:

https://api.etimeoffice.com/api/DownloadLastPunchData?Empcode=ALL&LastRecord=092020$454

Response:
{
  "PunchData": [...],
  "MaxRecord": "092020$456"
}
4. 🔄 Recommended Integration Strategy
✅ Use Incremental API (DownloadLastPunchData)
Flow:
First call:
LastRecord = ""
Store response MaxRecord
Next call:
LastRecord = stored MaxRecord
Repeat every 5 minutes
5. 🗄️ Database Design
employees
id
emp_code
name
biometric_logs
id
emp_code
punch_time
device_id (mcid)
raw_json
last_sync
id
last_record
6. ⚙️ Processing Logic
Python Example:
import requests
import base64

BASE_URL = "https://api.etimeoffice.com/api"
AUTH = "support:support:support@1:true"
TOKEN = base64.b64encode(AUTH.encode()).decode()

headers = {
    "Authorization": TOKEN
}

def fetch_logs(last_record):
    url = f"{BASE_URL}/DownloadLastPunchData?Empcode=ALL&LastRecord={last_record}"
    res = requests.get(url, headers=headers)
    return res.json()

def process():
    last_record = get_last_record_from_db()

    data = fetch_logs(last_record)

    for log in data["PunchData"]:
        save_log(log)

    update_last_record(data["MaxRecord"])
7. ⏱️ Scheduler

Use cron:

*/5 * * * *

Run every 5 minutes.

8. 🧩 Data Mapping
API Field	HRMS Field
Empcode	employee_id
PunchDate	timestamp
mcid	device_id
Name	employee_name
9. ⚠️ Edge Cases
Case	Handling
Duplicate logs	Avoid via LastRecord
Missing OUT	auto-calculate
Night shift	custom logic
Null M_Flag	ignore
10. 🛡️ Security
Store credentials securely
Use HTTPS only
Restrict API access via backend
11. 🚀 Deployment Checklist
 API credentials working
 LastRecord stored
 Logs saving correctly
 Cron job running
 Duplicate prevention tested
12. 🧪 Testing

Test with:

Single employee
Full data (Empcode=ALL)
Date range
Incremental sync
13. 🧱 Best Architecture (Recommended)
[ CRON JOB ]
     ↓
[ API FETCH SERVICE ]
     ↓
[ RAW LOG TABLE ]
     ↓
[ PROCESSOR ]
     ↓
[ ATTENDANCE TABLE ]
     ↓
[ PAYROLL ]
14. 💡 Key Decision
Use Case	API
Payroll	InOutPunchData
Analytics	Raw Punch
Production sync	LastPunchData ✅
15. 📌 Final Notes
Always use incremental sync in production
Store raw logs before processing
Build retry mechanism for failures
Maintain timezone consistency
✅ Conclusion

Core flow:
Capture → Fetch → Store → Process → Attendance → Payroll

This setup ensures:

Accurate attendance
Scalable architecture
Reliable payroll processing