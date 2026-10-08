import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { jobId, status, repairNotes, repairerName } = await request.json();

    if (!jobId || !status || !repairerName) {
      return NextResponse.json({ success: false, message: 'กรุณาส่งข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    if (status !== 'FIXED' && status !== 'UNREPAIRABLE') {
      return NextResponse.json({ success: false, message: 'สถานะไม่ถูกต้อง' }, { status: 400 });
    }

    const job = await prisma.job.findUnique({ where: { jobId } });
    if (!job) {
      return NextResponse.json({ success: false, message: 'ไม่พบรหัสคิวงานนี้ในระบบ' }, { status: 404 });
    }

    if (job.status.startsWith('RETURNED')) {
      return NextResponse.json({ success: false, message: 'งานนี้ถูกส่งคืนลูกค้าไปแล้ว ไม่สามารถแก้ไขได้' }, { status: 400 });
    }

    await prisma.job.update({
      where: { jobId },
      data: {
        status,
        repairNotes,
        repairerName
      }
    });

    return NextResponse.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ' });
  } catch (error) {
    console.error('Error updating repair:', error);
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 });
  }
}
