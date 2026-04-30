#!/usr/bin/env bun
/**
 * Migration Script: Remove CRM Module Tables
 * 
 * This script drops Lead and LeadActivity tables from both tenant databases:
 * - Main tenant (erp)
 * - Demo tenant (erp_demo)
 * 
 * Usage: bun run scripts/migrate-remove-modules.ts
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
  path.join(process.cwd(), 'database/migrations/drop_crm_tables.sql'),
  'utf-8'
);

async function runMigration(dbConfig: { name: string; connectionString: string }) {
  const client = new Client({ connectionString: dbConfig.connectionString });
  
  try {
    console.log(`\n🔄 Connecting to ${dbConfig.name}...`);
    await client.connect();
    console.log(`✅ Connected to ${dbConfig.name}`);

    // Check if tables exist before dropping
    console.log(`\n📊 Checking existing tables...`);
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('Lead', 'LeadActivity')
      ORDER BY table_name;
    `);
    
    if (checkResult.rows.length === 0) {
      console.log(`⚠️  No CRM tables found in ${dbConfig.name} - already removed or never existed`);
      return;
    }

    console.log(`📋 Found tables to drop: ${checkResult.rows.map(r => r.table_name).join(', ')}`);

    // Execute the migration
    console.log(`\n🗑️  Dropping CRM tables...`);
    await client.query(migrationSQL);
    console.log(`✅ Successfully dropped CRM tables from ${dbConfig.name}`);

    // Verify tables are dropped
    const verifyResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('Lead', 'LeadActivity');
    `);

    if (verifyResult.rows.length === 0) {
      console.log(`✅ Verification passed - tables successfully removed`);
    } else {
      console.log(`⚠️  Warning: Some tables still exist: ${verifyResult.rows.map(r => r.table_name).join(', ')}`);
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
  console.log('║  VoltCore ERP - Remove CRM Module Tables Migration        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n📝 This will drop the following tables:');
  console.log('   - LeadActivity');
  console.log('   - Lead');
  console.log('\n⚠️  Note: Customer, Item, SalesOrder tables are KEPT');
  console.log('   because Invoice module depends on them.\n');

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
  console.log('   2. Restart your application');
  console.log('   3. Test that Invoice module still works');
  console.log('   4. Verify CRM module is no longer accessible\n');
}

main().catch((error) => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
