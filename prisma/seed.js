require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

// Prisma Client initialization
const prisma = new PrismaClient({});

async function main() {
  console.log('Seeding initial data...');

  try {
    // 1. Create a Branch
    const branch = await prisma.branch.upsert({
      where: { name: 'Main Office' },
      update: {},
      create: {
        name: 'Main Office',
        address: '123 Business Rd, City'
      }
    });

    // 2. Create a Department
    const dept = await prisma.department.upsert({
      where: { name: 'IT' },
      update: {},
      create: {
        name: 'IT',
        code: 'IT001'
      }
    });

    // 3. Create a Designation
    const designation = await prisma.designation.upsert({
      where: { name: 'Administrator' },
      update: {},
      create: {
        name: 'Administrator'
      }
    });

    // 4. Create an Admin User
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@voltcore.com' },
      update: {},
      create: {
        name: 'Admin User',
        email: 'admin@voltcore.com',
        password: hashedPassword,
        isActive: true,
      }
    });

    // 5. Link User to Employee
    await prisma.employee.upsert({
      where: { employeeCode: 'EMP001' },
      update: {},
      create: {
        employeeCode: 'EMP001',
        userId: admin.id,
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@voltcore.com',
        phone: '1234567890',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        currentAddress: '123 Admin St',
        currentCity: 'Tech City',
        currentState: 'Digital State',
        currentPincode: '123456',
        departmentId: dept.id,
        designationId: designation.id,
        branchId: branch.id,
        dateOfJoining: new Date(),
        employmentType: 'permanent',
        employmentStatus: 'active'
      }
    });

    console.log('Seed data created successfully!');
    console.log('Admin Email: admin@voltcore.com');
    console.log('Admin Password: admin123');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
