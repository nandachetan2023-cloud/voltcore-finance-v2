import ExcelJS from 'exceljs';

const file = process.argv[2];
const maxRows = Number(process.argv[3] || 12);
const maxSheets = Number(process.argv[4] || 6);
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
console.log('SHEETS (' + wb.worksheets.length + '):', wb.worksheets.map(w => w.name + ' (' + w.rowCount + 'x' + w.columnCount + ')').join(' | '));
let shown = 0;
for (const ws of wb.worksheets) {
  if (shown >= maxSheets) break;
  shown++;
  console.log('\n=== SHEET:', ws.name, 'dims:', ws.dimensions, 'rows:', ws.rowCount, 'cols:', ws.columnCount);
  const maxR = Math.min(ws.rowCount, maxRows);
  for (let r = 1; r <= maxR; r++) {
    const row = ws.getRow(r);
    const vals = [];
    for (let c = 1; c <= Math.min(ws.columnCount, 20); c++) {
      let v = row.getCell(c).value;
      if (v === null || v === undefined) { vals.push(''); continue; }
      if (typeof v === 'object') {
        if (v.richText) v = v.richText.map(t => t.text).join('');
        else if (v.text) v = v.text;
        else if (v.result !== undefined) v = v.result;
        else if (v.formula !== undefined) v = '=' + v.formula;
        else v = JSON.stringify(v).slice(0, 40);
      }
      vals.push(String(v).replace(/\s+/g, ' ').trim().slice(0, 38));
    }
    while (vals.length && vals[vals.length - 1] === '') vals.pop();
    console.log('R' + r + ': ' + vals.join(' | '));
  }
}
