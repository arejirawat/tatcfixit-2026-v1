import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      where: {
        repairerName: { not: null }
      },
      select: { repairerName: true }
    });
    
    // Extract unique names
    const names = [...new Set(jobs.map(j => j.repairerName?.trim()).filter(Boolean))];
    
    return NextResponse.json({ success: true, technicians: names });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
