import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

// ทำเครื่องหมายว่างานถูกส่งออกไป V-Care แล้ว (exported: false = ยกเลิกเครื่องหมาย ให้ส่งออกใหม่ได้)
export async function POST(request: Request) {
  try {
    const { jobIds, exported = true } = await request.json();
    if (!Array.isArray(jobIds) || jobIds.length === 0 || !jobIds.every(id => typeof id === 'string')) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุรายการงาน' }, { status: 400 });
    }

    const result = await prisma.job.updateMany({
      where: { jobId: { in: jobIds } },
      data: { vcareExportedAt: exported ? new Date() : null }
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
