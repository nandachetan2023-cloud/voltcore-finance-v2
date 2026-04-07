import { NextResponse } from 'next/server';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { readFile } from 'fs/promises';

export const dynamic = 'force-dynamic';

interface FileInfo {
  name: string;
  filename: string;
  size: string;
  lastModified: string;
  type: string;
  description: string;
}

const FILE_META: Record<string, { description: string; type: string }> = {
  'voltcore_erp_mysql.sql': {
    description: 'Complete MySQL database schema with 34 tables and realistic seed data for Indian power plant EPC contractors',
    type: 'SQL Script',
  },
  'voltcore_erp_prisma_schema.prisma': {
    description: 'Prisma ORM schema definition with all 34 models, relations, and constraints for SQLite development',
    type: 'Prisma Schema',
  },
  'voltcore_erp_module_summary.xlsx': {
    description: 'Excel workbook with 4 sheets: Module Overview, Database Schema, API Endpoints, and Technology Stack',
    type: 'Excel Spreadsheet',
  },
  'voltcore_erp_documentation.pdf': {
    description: '8-page project documentation covering architecture, module reference, setup instructions, and file structure',
    type: 'PDF Document',
  },
  'README.md': {
    description: 'Project README with quick start guide, module summary, technology stack, and setup instructions',
    type: 'Markdown',
  },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function GET() {
  try {
    const downloadDir = join(process.cwd(), 'download');
    const entries = readdirSync(downloadDir);
    const files: FileInfo[] = [];

    for (const entry of entries) {
      const filePath = join(downloadDir, entry);
      try {
        const stat = statSync(filePath);
        if (stat.isFile()) {
          const meta = FILE_META[entry] || { description: 'Project file', type: 'File' };
          files.push({
            name: entry.replace(/voltcore_erp_/, '').replace(/_/g, ' ').replace(/\.\w+$/, ''),
            filename: entry,
            size: formatSize(stat.size),
            lastModified: stat.mtime.toISOString().split('T')[0],
            type: meta.type,
            description: meta.description,
          });
        }
      } catch {
        // Skip inaccessible files
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        projectName: 'VoltCore ERP',
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        files,
      },
    });
  } catch (error) {
    console.error('[Downloads API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list downloads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename } = body;

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }

    // Only allow known files
    const allowed = Object.keys(FILE_META);
    if (!allowed.includes(filename)) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    const filePath = join(process.cwd(), 'download', filename);
    const fileBuffer = await readFile(filePath);

    const contentTypes: Record<string, string> = {
      '.sql': 'application/sql',
      '.prisma': 'text/plain',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.pdf': 'application/pdf',
      '.md': 'text/markdown',
    };

    const ext = filename.substring(filename.lastIndexOf('.'));
    const contentType = contentTypes[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(fileBuffer.length),
      },
    });
  } catch (error) {
    console.error('[Downloads API] Download error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
