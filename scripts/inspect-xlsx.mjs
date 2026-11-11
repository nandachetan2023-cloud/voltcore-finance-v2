import ExcelJS from 'exceljs';
import path from 'path';

const files = process.argv.slice(2);

for (const file of files) {
  console.log('='.repeat(100));
  console.log('FILE:', file);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  console.log('SHEETS:', wb.worksheets.map(w => w.name + ' (' + w.rowCount + ' rows x ' + w.columnCount + ' cols)').join(' | '));
  for (const ws of wb.worksheets) {
    console.log('\n--- SHEET:', ws.name, 'dims:', ws.dimensions, 'rows:', ws.rowCount, 'cols:', ws.columnCount);
    const maxR = Math.min(ws.rowCount, 20);
    for (let r = 1; r <= maxR; r++) {
      const row = ws.getRow(r);
      const vals = [];
      for (let c = 1; c <= Math.min(ws.columnCount, 25); c++) {
        let v = row.getCell(c).value;
        if (v === null || v === undefined) { vals.push(''); continue; }
        if (typeof v === 'object') {
          if (v.richText) v = v.richText.map(t => t.text).join('');
          else if (v.text) v = v.text;
          else if (v.result !== undefined) v = v.result;
          else if (v.formula !== undefined) v = '=' + v.formula + (v.result !== undefined ? ' => ' + v.result : '');
          else v = JSON.stringify(v).slice(0, 40);
        }
        vals.push(String(v).replace(/\s+/g, ' ').trim().slice(0, 40));
      }
      // collapse trailing empties
      while (vals.length && vals[vals.length - 1] === '') vals.pop();
      console.log('R' + r + ': ' + vals.join(' | '));
    }
  }
  console.log();
}
