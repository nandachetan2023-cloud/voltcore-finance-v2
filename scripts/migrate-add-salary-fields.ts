#!/usr/bin/env bun
/**
 * Migration Script: Add Employee Salary Fields
 * 
 * Adds the following fields to Employee table:
 * - tokenNumber (unique)
 * - workmenSlNo
 * - monthlyGrossSalary
 * - natureOfDesignation
 * 
 * Usage: bun run scripts/migrate-add-salary-fields.ts
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Database configurations
const databases = [
  {
    name: 'Main Tenant (erp)',
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:chinmay12d@localhost:5432/erp?schema=public'
  },
  {
    name: 'Demo Tenant (erp_demo)',
    connectionString: process.env.DEMO_DATABASE_URL || 'postgresql://postgres:chinmay12d@localhost:5432/erp_demo?schema=public'
  }
];

// Read the migration SQL file
const migrationSQL = fs.readFileSync(
  path.join(process.cwd(), 'prisma/migrations/add_employee_salary_fields/migration.sql'),
  'utf-8'
);

async function runMigration(dbConfig: { name: string; connectionString: string }) {
  const client = new Client({ connectionString: dbConfig.connectionString });
  
  try {
    console.log(`\n🔄 Connecting to ${dbConfig.name}...`);
    await client.connect();
    console.log(`✅ Connected to ${dbConfig.name}`);

    // Check if columns already exist
    console.log(`\n📊 Checking existing columns...`);
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'Employee'
      AND column_name IN ('tokenNumber', 'workmenSlNo', 'monthlyGrossSalary', 'natureOfDesignation')
      ORDER BY column_name;
    `);
    
    if (checkResult.rows.length > 0) {
      console.log(`⚠️  Some columns already exist in ${dbConfig.name}:`);
      checkResult.rows.forEach(row => console.log(`   - ${row.column_name}`));
      console.log(`   Skipping migration for this database.`);
      return;
    }

    console.log(`📋 No new columns found - proceeding with migration`);

    // Execute the migration
    console.log(`\n🔧 Adding new columns to Employee table...`);
    await client.query(migrationSQL);
    console.log(`✅ Successfully added columns to ${dbConfig.name}`);

    // Verify columns are added
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'Employee'
      AND column_name IN ('tokenNumber', 'workmenSlNo', 'monthlyGrossSalary', 'natureOfDesignation')
      ORDER BY column_name;
    `);

    if (verifyResult.rows.length === 4) {
      console.log(`✅ Verification passed - all columns added successfully:`);
      verifyResult.rows.forEach(row => {
        console.log(`   ✓ ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
    } else {
      console.log(`⚠️  Warning: Expected 4 columns, found ${verifyResult.rows.length}`);
    }

  } catch (error) {
    console.error(`❌ Error migrating ${dbConfig.name}:`, error);
    throw error;
  } finally {
    await client.end();
    console.log(`🔌 Disconnected from ${dbConfig.name}`);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  VoltCore ERP - Add Employee Salary Fields Migration      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n📝 This will add the following columns to Employee table:');
  console.log('   1. tokenNumber (TEXT, UNIQUE)');
  console.log('   2. workmenSlNo (TEXT)');
  console.log('   3. monthlyGrossSalary (DECIMAL(15,2))');
  console.log('   4. natureOfDesignation (TEXT)');
  console.log('');

  // Run migration for each database
  for (const db of databases) {
    try {
      await runMigration(db);
    } catch (error) {
      console.error(`\n❌ Failed to migrate ${db.name}`);
      console.error('Stopping migration process.');
      process.exit(1);
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ Migration completed successfully for all databases     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n📋 Next steps:');
  console.log('   1. Run: bun prisma generate');
  console.log('   2. Update employee import form to include new fields');
  console.log('   3. Use the new template: excels/employees_updated.xlsx');
  console.log('   4. Test employee import with new fields\n');
}

main().catch((error) => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
