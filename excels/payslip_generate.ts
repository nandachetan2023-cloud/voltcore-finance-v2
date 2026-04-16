import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';
import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import { fromPath } from 'pdf2pic';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import * as numToWords from 'number-to-words';

// ──────────────────────────────────────────────────────────────────
//  Colour palette
// ──────────────────────────────────────────────────────────────────
const BLUE = '#1A56C4';
const BLACK = '#000000';
const ORANGE = '#E86500';

export class UpasanaPayslipGenerator {
    private excelFile: string;
    private monthYear: string;
    private dateOfPayment: string;
    private ptAmount: number;
    private outputFolder: string = "SalarySlips";
    private imagesFolder: string = "SalarySlips_Images";
    private df: any[][];

    // ── column indices in the Excel sheet ─────────────────────────
    private COL = {
        sl_no: 0, name: 1, doj: 2, emp_code: 3, esic_no: 4, uan: 5,
        mobile: 6, bank_ac: 7, bank_name: 8, ifsc: 9, pan: 10,
        designation: 11, monthly_days: 13, days_worked: 14, basic: 18,
        hra: 22, site_allow: 19, travel_allow: 20, special_allow: 21,
        attend_allow: 24, ot: 23, ph_amount: 25, gross: 25, epf_ded: 26,
        esic_ded: 27, advance: 28, total_ded: 31, net_pay: 32
    };

    private COMPANY_ROW = 2; private COMPANY_COL = 3;
    private ADDRESS_ROW = 2; private ADDRESS_COL = 24;
    private PRINCIPAL_ROW = 4; private PRINCIPAL_COL = 24;
    private DATA_START_ROW = 6;

    constructor(excelFile: string, monthYear: string = "DEC-25", dateOfPayment: string = "", ptAmount: number = 125.0) {
        this.excelFile = excelFile;
        this.monthYear = monthYear;
        this.dateOfPayment = dateOfPayment;
        this.ptAmount = ptAmount;

        if (!fs.existsSync(this.outputFolder)) fs.mkdirSync(this.outputFolder, { recursive: true });
        if (!fs.existsSync(this.imagesFolder)) fs.mkdirSync(this.imagesFolder, { recursive: true });

        // Load Excel File
        const workbook = xlsx.readFile(excelFile);
        const sheetName = workbook.SheetNames[0];
        // Convert sheet to a 2D array (similar to pandas iloc)
        this.df = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    }

    // ── helpers ────────────────────────────────────────────────────
    private _safeFloat(value: any): number {
        if (value !== undefined && value !== null) {
            let s = String(value).trim().replace(/^n/i, '').replace(/,/g, '').replace(/[₹$]/g, '').trim();
            let parsed = parseFloat(s);
            return isNaN(parsed) ? 0.0 : parsed;
        }
        return 0.0;
    }

    private _safeInt(value: any, defaultValue: number = 0): number {
        if (value !== undefined && value !== null) {
            let parsed = parseInt(String(value).trim(), 10);
            return isNaN(parsed) ? defaultValue : parsed;
        }
        return defaultValue;
    }

    private _cell(row: number, col: number): string {
        if (this.df[row] && this.df[row][col] !== undefined && this.df[row][col] !== null) {
            return String(this.df[row][col]).trim();
        }
        return '';
    }

    private _fmt(amount: number): string {
        if (isNaN(amount)) return "₹ 0.00";
        return `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    private _words(amount: number): string {
        try {
            if (amount === 0) return "Zero Rupees Only";
            // Note: npm number-to-words uses International system. For exact Indian lakhs/crores, a custom function is usually needed.
            let words = numToWords.toWords(amount).replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
            return `${words} Rupees Only`;
        } catch {
            return "Zero Rupees Only";
        }
    }

    // ── data extraction ────────────────────────────────────────────
    public extractEmployeeData(): any[] {
        const empList: any[] = [];
        
        let companyName = this._cell(this.COMPANY_ROW, this.COMPANY_COL) || "Upasana Associate";
        let address = this._cell(this.ADDRESS_ROW, this.ADDRESS_COL) || "Flat No. G+1/3, Vinayakpuram, In front of MME Ground, Jharsuguda, Odisha-768201";
        let principalEmployer = this._cell(this.PRINCIPAL_ROW, this.PRINCIPAL_COL) || "Hindalco Industries Ltd., Lapanga, Sambalpur-768212";

        const skipNames = new Set(['NAME', 'EMPLOYEE NAME', 'SL', 'SR', 'NO', 'S.NO', 'DESIGNATION']);

        for (let i = this.DATA_START_ROW; i < this.df.length; i++) {
            let rawName = this._cell(i, this.COL.name);
            if (!rawName || rawName === '') continue;
            
            let name = rawName.toUpperCase();
            if (skipNames.has(name)) continue;

            let mobile = this._cell(i, this.COL.mobile);
            if (mobile && !isNaN(parseFloat(mobile))) mobile = String(Math.floor(parseFloat(mobile)));

            let gross = this._safeFloat(this._cell(i, this.COL.gross));
            let epfDed = this._safeFloat(this._cell(i, this.COL.epf_ded));
            let esicDed = this._safeFloat(this._cell(i, this.COL.esic_ded));
            let advance = this._safeFloat(this._cell(i, this.COL.advance));
            let totalDed = this._safeFloat(this._cell(i, this.COL.total_ded));
            let netPay = this._safeFloat(this._cell(i, this.COL.net_pay));

            let emp = {
                sl_no: this._safeInt(this._cell(i, this.COL.sl_no), empList.length + 1),
                name: rawName,
                emp_code: this._cell(i, this.COL.emp_code),
                designation: this._cell(i, this.COL.designation),
                epf_number: this._cell(i, this.COL.emp_code) || '0',
                uan: this._cell(i, this.COL.uan),
                esic_no: this._cell(i, this.COL.esic_no),
                mobile: mobile,
                bank_name: this._cell(i, this.COL.bank_name),
                bank_ac: this._cell(i, this.COL.bank_ac),
                ifsc: this._cell(i, this.COL.ifsc),
                monthly_days: this._safeInt(this._cell(i, this.COL.monthly_days), 26),
                days_worked: this._safeInt(this._cell(i, this.COL.days_worked), 26),
                
                // Earnings
                basic: this._safeFloat(this._cell(i, this.COL.basic)),
                hra: this._safeFloat(this._cell(i, this.COL.hra)),
                site_allow: this._safeFloat(this._cell(i, this.COL.site_allow)),
                travel_allow: this._safeFloat(this._cell(i, this.COL.travel_allow)),
                special_allow: this._safeFloat(this._cell(i, this.COL.special_allow)),
                attend_allow: this._safeFloat(this._cell(i, this.COL.attend_allow)),
                ot: this._safeFloat(this._cell(i, this.COL.ot)),
                ph_amount: this._safeFloat(this._cell(i, this.COL.ph_amount)),
                gross: gross,
                
                // Deductions
                epf_ded: epfDed,
                esic_ded: esicDed,
                pt: this.ptAmount,
                advance: advance,
                other_ded: 0.0,
                total_ded: totalDed,
                net_pay: netPay,
                
                company_name: companyName,
                address: address,
                principal_employer: principalEmployer,
                month_year: this.monthYear,
                date_of_payment: this.dateOfPayment
            };
            empList.push(emp);
            console.log(`  ✓  ${rawName}`);
        }
        return empList;
    }

    // ── PDF builder ────────────────────────────────────────────────
    public async generatePdf(e: any): Promise<string | null> {
        return new Promise((resolve) => {
            try {
                const safeName = e.name.replace(/[^\w]/g, '_');
                const filename = path.join(this.outputFolder, `Payslip_${safeName}_${e.month_year}.pdf`);

                // Configure fonts for pdfmake
                const fonts = {
                    Helvetica: {
                        normal: 'Helvetica',
                        bold: 'Helvetica-Bold',
                        italics: 'Helvetica-Oblique',
                        bolditalics: 'Helvetica-BoldOblique'
                    }
                };

                const printer = new PdfPrinter(fonts);

                const defaultStyle = { font: 'Helvetica', fontSize: 8.5, color: BLACK, margin: [5, 3, 5, 3] as [number, number, number, number] };
                const lblBlue = { color: BLUE };
                const bold = { bold: true };
                const right = { alignment: 'right' as const };
                const center = { alignment: 'center' as const };

                const docDefinition: TDocumentDefinitions = {
                    pageSize: 'A4',
                    pageMargins: [32, 28, 32, 28], // ~0.45 inches left/right, 0.40 top/bottom
                    defaultStyle: defaultStyle,
                    content: [
                        { text: e.company_name, fontSize: 17, bold: true, alignment: 'center', margin: [0, 0, 0, 2] },
                        { text: e.address, fontSize: 8, alignment: 'center', margin: [0, 0, 0, 2] },
                        { text: `Name & Address of the Principal Employer : ${e.principal_employer}`, fontSize: 8, bold: true, margin: [0, 0, 0, 3] },
                        
                        // 2. Month / Date-of-Payment Row
                        {
                            table: {
                                widths: ['52%', '28%', '20%'],
                                body: [
                                    [
                                        { text: `Employee pay summery for the month of ${e.month_year}`, bold: true },
                                        { text: 'Date of Payment', bold: true },
                                        { text: e.date_of_payment }
                                    ]
                                ]
                            },
                            layout: 'lightHorizontalLines' // Simplified borders to emulate ReportLab Grid
                        },
                        
                        // 3. Employee Info + Bank Details
                        {
                            table: {
                                widths: ['21%', '24%', '31%', '24%'],
                                body: [
                                    [{ text: 'Employee Name', ...lblBlue }, e.name, { text: 'Monthly Working Day', ...lblBlue }, { text: String(e.monthly_days), ...right }],
                                    [{ text: 'Employee Code', ...lblBlue }, e.emp_code, { text: 'No. of Working Day Attended', ...lblBlue }, { text: String(e.days_worked), ...right }],
                                    [{ text: 'Designation', ...lblBlue }, e.designation, { text: 'Bank Details', colSpan: 2, bold: true, ...center }, {}],
                                    [{ text: 'EPF Number', ...lblBlue }, e.epf_number, { text: 'Bank Name', ...lblBlue }, e.bank_name],
                                    [{ text: 'UAN Number', ...lblBlue }, e.uan, { text: 'Bank Account No.', ...lblBlue }, e.bank_ac],
                                    [{ text: 'ESIC Number', ...lblBlue }, e.esic_no, { text: 'Bank IFSC Code', ...lblBlue }, e.ifsc]
                                ]
                            }
                        },

                        // 4 & 5. Earnings / Deductions Header & Body
                        {
                            table: {
                                widths: ['31%', '19%', '31%', '19%'],
                                body: [
                                    [
                                        { text: 'EARNING SALARY', bold: true }, { text: 'AMOUNT', bold: true, ...right },
                                        { text: 'DEDUCTIONS', bold: true }, { text: 'AMOUNT', bold: true, ...right }
                                    ],
                                    [{ text: 'Basic Salary', ...lblBlue }, { text: this._fmt(e.basic), ...right }, { text: 'EPF', ...lblBlue }, { text: this._fmt(e.epf_ded), ...right }],
                                    [{ text: 'House Rent Allowances', ...lblBlue }, { text: this._fmt(e.hra), ...right }, { text: 'ESIC', ...lblBlue }, { text: this._fmt(e.esic_ded), ...right }],
                                    [{ text: 'Site Allowances', ...lblBlue }, { text: this._fmt(e.site_allow), ...right }, { text: 'PT', ...lblBlue }, { text: this._fmt(e.pt), ...right }],
                                    [{ text: 'Travel Allowances', ...lblBlue }, { text: this._fmt(e.travel_allow), ...right }, { text: 'Advance', ...lblBlue }, { text: this._fmt(e.advance), ...right }],
                                    [{ text: 'Special Allowances', ...lblBlue }, { text: this._fmt(e.special_allow), ...right }, { text: 'Other Deduction', ...lblBlue }, { text: this._fmt(e.other_ded), ...right }],
                                    [{ text: 'Attendance Allowances', ...lblBlue }, { text: this._fmt(e.attend_allow), ...right }, '', ''],
                                    [{ text: 'OT Amount', ...lblBlue }, { text: this._fmt(e.ot), ...right }, '', ''],
                                    [{ text: 'PH Amount', ...lblBlue }, { text: this._fmt(e.ph_amount), ...right }, '', ''],
                                    // 6. Gross Row
                                    [{ text: 'Gross Earnings', bold: true }, { text: this._fmt(e.gross), bold: true, ...right }, { text: 'Total Deductions', bold: true }, { text: this._fmt(e.total_ded), bold: true, ...right }],
                                    // 7. Net Payable Row
                                    [{ text: 'Net Payable===>', bold: true, colSpan: 3 }, {}, {}, { text: this._fmt(e.net_pay), bold: true, ...right }]
                                ]
                            }
                        },

                        // 8. Computer Generated Notice
                        {
                            table: {
                                widths: ['35%', '65%'],
                                body: [[ '', { text: 'This is a computer generated slip, hence Sign.not required', color: ORANGE, fontSize: 8, ...center }]]
                            }
                        },

                        // 9. Signatures
                        {
                            table: {
                                widths: ['50%', '50%'],
                                body: [[ 
                                    { text: 'Employee Signature', bold: true, ...center, margin: [0, 18, 0, 18] }, 
                                    { text: 'Employer Signature', bold: true, ...center, margin: [0, 18, 0, 18] } 
                                ]]
                            }
                        }
                    ]
                };

                const pdfDoc = printer.createPdfKitDocument(docDefinition);
                const writeStream = fs.createWriteStream(filename);
                
                pdfDoc.pipe(writeStream);
                pdfDoc.end();

                writeStream.on('finish', () => {
                    console.log(`  ✓  PDF → ${filename}`);
                    resolve(filename);
                });
                
                writeStream.on('error', (err) => {
                    console.error(`  ✗  PDF error:`, err);
                    resolve(null);
                });

            } catch (err) {
                console.error(`  ✗  PDF Exception:`, err);
                resolve(null);
            }
        });
    }

    // ── PDF → image ────────────────────────────────────────────────
    public async convertPdfToImage(pdfPath: string, employee: any): Promise<string | null> {
        try {
            const safeName = employee.name.replace(/[^\w]/g, '_');
            const imgPath = path.join(this.imagesFolder, `Payslip_${safeName}_${employee.month_year}`); // pdf2pic adds .1.jpg
            
            const options = {
                density: 300,
                saveFilename: path.basename(imgPath),
                savePath: this.imagesFolder,
                format: "jpg",
                width: 2480,
                height: 3508
            };
            
            const convert = fromPath(pdfPath, options);
            const result = await convert(1, { responseType: "image" });
            
            if (result && result.path) {
                console.log(`  ✓  Image → ${result.path}`);
                return result.path;
            }
            return null;
        } catch (err) {
            console.error(`  ✗  Image error:`, err);
            console.log("     (Make sure Ghostscript/GraphicsMagick is installed on your OS)");
            return null;
        }
    }

    // ── orchestrator ───────────────────────────────────────────────
    public async processAll(sendWhatsapp: boolean = false) {
        console.log("=".repeat(60));
        console.log("  UPASANA ASSOCIATE — PAYSLIP GENERATION SYSTEM");
        console.log("=".repeat(60));

        const employees = this.extractEmployeeData();
        if (employees.length === 0) {
            console.log("✗  No employees found.");
            return;
        }

        console.log(`\n✓  ${employees.length} employee(s) found\n`);
        for (const emp of employees) {
            console.log(`   ${String(emp.sl_no).padStart(3, ' ')}. ${emp.name}`);
        }

        console.log("\n📄  Generating PDFs …");
        for (let idx = 0; idx < employees.length; idx++) {
            const emp = employees[idx];
            console.log(`\n[${idx + 1}/${employees.length}]  ${emp.name}`);
            
            const pdf = await this.generatePdf(emp);
            emp.pdf_path = pdf;
            
            if (pdf && fs.existsSync(pdf)) {
                emp.image_path = await this.convertPdfToImage(pdf, emp);
            } else {
                emp.image_path = null;
            }
        }

        console.log(`\n✓  Finished!`);
        console.log(`   PDFs   → ${path.resolve(this.outputFolder)}`);
        console.log(`   Images → ${path.resolve(this.imagesFolder)}`);

        if (sendWhatsapp) {
            console.log("\n" + "=".repeat(60));
            console.log("  📱  WHATSAPP AUTOMATION STARTED");
            console.log("  ⚠   Please scan the QR code that appears below.");
            console.log("=".repeat(60));

            const client = new Client({
                authStrategy: new LocalAuth() // Saves session so you don't scan every time
            });

            client.on('qr', (qr) => {
                qrcode.generate(qr, { small: true });
            });

            client.on('ready', async () => {
                console.log('✓  WhatsApp Web Client is ready!');
                let ok = 0, fail = 0;

                for (let idx = 0; idx < employees.length; idx++) {
                    const emp = employees[idx];
                    const img = emp.image_path;

                    if (img && fs.existsSync(img)) {
                        console.log(`\n[${idx + 1}/${employees.length}]  Sending to ${emp.name}...`);
                        
                        let mobile = emp.mobile;
                        if (!mobile) {
                            console.log("  ⚠  No mobile number");
                            fail++;
                            continue;
                        }
                        // Format for whatsapp-web.js: '91XXXXXXXXXX@c.us'
                        let formattedMobile = mobile.startsWith('+') ? mobile.slice(1) : `91${mobile}`;
                        let chatId = `${formattedMobile}@c.us`;

                        try {
                            const media = MessageMedia.fromFilePath(img);
                            const caption = `Dear ${emp.name},\nYour salary slip for ${emp.month_year}.\nNet Pay: ${this._fmt(emp.net_pay)}`;
                            
                            await client.sendMessage(chatId, media, { caption: caption });
                            console.log(`  ✓  Sent to ${emp.name} (${mobile})`);
                            ok++;
                            
                            // 5s wait buffer
                            if (idx < employees.length - 1) {
                                await new Promise(resolve => setTimeout(resolve, 5000));
                            }
                        } catch (err) {
                            console.error(`  ✗  WhatsApp send error:`, err);
                            fail++;
                        }
                    } else {
                        console.log(`  ⚠  Skipping ${emp.name} — no image`);
                        fail++;
                    }
                }
                console.log(`\n✓  WhatsApp done (success=${ok}, fail=${fail})`);
                process.exit(0);
            });

            client.initialize();
        }
    }
}

// ──────────────────────────────────────────────────────────────────
//  Entry point
// ──────────────────────────────────────────────────────────────────
async function main() {
    const EXCEL_FILE = "final/sampleformat.xlsx";
    const MONTH_YEAR = "DEC-25";
    const DATE_OF_PAYMENT = "";
    const PT_AMOUNT = 125.0;
    const SEND_WHATSAPP = true;

    if (!fs.existsSync(EXCEL_FILE)) {
        console.error(`✗  Excel file not found: ${EXCEL_FILE}`);
        process.exit(1);
    }

    const generator = new UpasanaPayslipGenerator(
        EXCEL_FILE,
        MONTH_YEAR,
        DATE_OF_PAYMENT,
        PT_AMOUNT
    );

    await generator.processAll(SEND_WHATSAPP);
}

main();