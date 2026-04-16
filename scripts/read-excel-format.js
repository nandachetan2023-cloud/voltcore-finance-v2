const XLSX = require('xlsx');
const fs = require('fs');

try {
  const workbook = XLSX.readFile('excels/jan_non_compliance_salary_sheet.xlsx');
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Get the range
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  
  console.log('Sheet Name:', firstSheetName);
  console.log('Range:', worksheet['!ref']);
  console.log('\nFirst 5 rows:');
  
  // Read first 5 rows
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  for (let i = 0; i < Math.min(5, data.length); i++) {
    console.log(`\nRow ${i + 1}:`);
    console.log(JSON.stringify(data[i], null, 2));
  }
  
  // Get headers
  if (data.length > 0) {
    console.log('\n\nHeaders (Row 1):');
    console.log(data[0]);
    console.log('\n\nTotal columns:', data[0].length);
  }
  
} catch (error) {
  console.error('Error reading file:', error.message);
}
