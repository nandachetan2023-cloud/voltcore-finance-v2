import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('🔄 Seed API called - running prisma/seed.ts');
    const output = execSync('npx tsx prisma/seed.ts', {
      cwd: process.cwd(),
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(output.toString());
    return NextResponse.json({ success: true, message: 'Database seeded successfully' });
  } catch (error: any) {
    console.error('Seed failed:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Seed failed' },
      { status: 500 }
    );
  }
}
