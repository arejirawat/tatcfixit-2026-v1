import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ success: false, message: 'Missing jobId' }, { status: 400 });
  }

  try {
    const job = await prisma.job.findUnique({
      where: { jobId },
      include: {
        customer: true,
        category: true,
      }
    });

    if (!job) {
      return NextResponse.json({ success: false, message: 'ไม่พบรหัสคิวงานนี้' }, { status: 404 });
    }

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
