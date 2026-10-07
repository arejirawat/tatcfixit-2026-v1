import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      include: {
        customer: true,
        category: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
