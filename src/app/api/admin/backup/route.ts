import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '../../../../../lib/prisma';

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ success: false, message: 'Database file not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(dbPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="backup_fixit_${new Date().toISOString().split('T')[0]}.db"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // Delete in order to respect foreign keys (if any)
    await prisma.job.deleteMany();
    await prisma.customer.deleteMany();
    
    // Optionally we can reset settings, but usually we just want to reset the QUEUE_NUMBER to 1
    await prisma.setting.upsert({
      where: { key: 'QUEUE_NUMBER' },
      update: { value: '1' },
      create: { key: 'QUEUE_NUMBER', value: '1' }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
