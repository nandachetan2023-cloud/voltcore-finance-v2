import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Employee data from emp_record.md
const employeeRecords = [
  { code: '0002', name: 'Dipak kumar roul' },
  { code: '0004', name: 'Tushar ranjan behera' },
  { code: '0005', name: 'Pujhari munda' },
  { code: '0006', name: 'om prakash bhue' },
  { code: '0007', name: 'biswajit rana' },
  { code: '0008', name: 'Brajamohan bhoi' },
  { code: '0009', name: 'Nirnajan kumar' },
  { code: '0010', name: 'Deepak hasanda' },
  { code: '0011', name: 'Rahul lenka' },
  { code: '0012', name: 'Pratash surin' },
  { code: '0013', name: 'UTTAM BOURI' },
  { code: '0014', name: 'Joganand set' },
  { code: '0015', name: 'Jadumani patel' },
  { code: '0016', name: 'Preeti bhoi' },
  { code: '0017', name: 'Manoj kumar hembram' },
  { code: '0018', name: 'Saroja kumar swain' },
  { code: '0019', name: 'Satya sai majhi' },
  { code: '0020', name: 'Devendra bhoi' },
  { code: '0021', name: 'jayanta bag' },
  { code: '0022', name: 'Asish kumar garnaik' },
  { code: '0023', name: 'Bhimasan sahu' },
  { code: '0024', name: 'Tapas kumar nayak' },
  { code: '0025', name: 'Biswajit seth' },
  { code: '0026', name: 'Bhimsan hasanda' },
  { code: '0027', name: 'praful kumar Behera' },
  { code: '0028', name: 'kumar kisan' },
  { code: '0029', name: 'Gopal mukherjee' },
  { code: '0030', name: 'Pavitra kumar das' },
  { code: '0031', name: 'susant kumar swain' },
  { code: '0032', name: 'Malay kumar seth' },
  { code: '0033', name: 'Surendra rana' },
  { code: '0034', name: 'Damodar kumura' },
  { code: '0035', name: 'amlesh kumar' },
  { code: '0036', name: 'Manoranjan kahala' },
  { code: '0037', name: 'sunil sahu' },
  { code: '0038', name: 'surya kanta' },
  { code: '0039', name: 'Mahesh majee' },
  { code: '0040', name: 'Jyotirmoy banerjee' },
  { code: '0041', name: 'Bijay kumar Behera' },
  { code: '0042', name: 'Ranjan Mohanty' },
  { code: '0043', name: 'Hiteswar seth' },
  { code: '0044', name: 'MAHENDRA YADAV' },
  { code: '0045', name: 'SUBHAM MOHANTA' },
  { code: '0046', name: 'UPENDRA RANA' },
  { code: '0047', name: 'SHYAMAL MAJEE' },
  { code: '0048', name: 'ANJEY ORAM' },
  { code: '0049', name: 'NARENDRA BARIK' },
  { code: '0050', name: 'BHABANI BHUE' },
  { code: '0051', name: 'HEMANANDA SAHU' },
  { code: '0052', name: 'Rajesh behera' },
  { code: '0053', name: 'Jyotish Kumar Viswakarma' },
  { code: '0054', name: 'Minaketan Parida' },
  { code: '0055', name: 'Santosh Bhue' },
  { code: '0056', name: 'SATYABRATA MOHANTY' },
  { code: '0057', name: 'DILESWAR BAG' },
  { code: '0058', name: 'Dinabandhu Pradhan' },
];

function parseName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: null, lastName: '' };
  } else if (parts.length === 2) {
    return { firstName: parts[0], middleName: null, lastName: parts[1] };
  } else {
    return {
      firstName: parts[0],
      middleName: parts.slice(1, -1).join(' '),
      lastName: parts[parts.length - 1],
    };
  }
}

function generateEmail(name: string, code: string): string {
  const cleanName = name.toLowerCase().replace(/\s+/g, '.');
  return `${cleanName}.${code}@company.com`;
}

function generatePhone(code: string): string {
  return `91${code.padStart(8, '9')}`;
}

async function main() {
  console.log('🚀 Starting employee import...\n');

  // Get or create default department, designation, and branch
  let department = await prisma.department.findFirst();
  if (!department) {
    console.log('📁 Creating default department...');
    department = await prisma.department.create({
      data: {
        name: 'General',
        code: 'GEN',
      },
    });
  }

  let designation = await prisma.designation.findFirst();
  if (!designation) {
    console.log('🏷️  Creating default designation...');
    designation = await prisma.designation.create({
      data: {
        name: 'Staff',
      },
    });
  }

  let branch = await prisma.branch.findFirst();
  if (!branch) {
    console.log('🏢 Creating default branch...');
    branch = await prisma.branch.create({
      data: {
        name: 'Head Office',
        address: 'Main Branch',
      },
    });
  }

  console.log(`\n✅ Using Department: ${department.name}`);
  console.log(`✅ Using Designation: ${designation.name}`);
  console.log(`✅ Using Branch: ${branch.name}\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const record of employeeRecords) {
    const employeeCode = `EMP${record.code}`;
    const { firstName, middleName, lastName } = parseName(record.name);

    try {
      // Check if employee already exists
      const existing = await prisma.employee.findUnique({
        where: { employeeCode },
      });

      if (existing) {
        console.log(`⏭️  Skipped: ${employeeCode} - ${record.name} (already exists)`);
        skipped++;
        continue;
      }

      // Create employee
      await prisma.employee.create({
        data: {
          employeeCode,
          firstName,
          middleName,
          lastName,
          email: generateEmail(record.name, record.code),
          phone: generatePhone(record.code),
          dateOfBirth: new Date('1990-01-01'), // Default DOB
          gender: 'male', // Default gender
          currentAddress: 'To be updated',
          currentCity: 'To be updated',
          currentState: 'To be updated',
          currentPincode: '000000',
          departmentId: department.id,
          designationId: designation.id,
          branchId: branch.id,
          dateOfJoining: new Date('2024-01-01'), // Default joining date
          employmentType: 'PERMANENT',
          employmentStatus: 'active',
          isActive: true,
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Imported: ${employeeCode} - ${record.name}`);
      imported++;
    } catch (error) {
      console.error(`❌ Error importing ${employeeCode}:`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Successfully imported: ${imported}`);
  console.log(`⏭️  Skipped (already exist): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📝 Total records: ${employeeRecords.length}`);
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
