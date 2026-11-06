import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const { jobId, status, repairNotes, repairerName, partsUsed, partsCost } = await request.json();
    const cost = partsCost === '' || partsCost === null || partsCost === undefined ? null : Number(partsCost);
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      return NextResponse.json({ success: false, message: 'ค่าใช้จ่ายต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป' }, { status: 400 });
    }

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

    if (job.status === 'CANCELLED') {
      return NextResponse.json({ success: false, message: 'งานนี้ถูกยกเลิกไปแล้ว ไม่สามารถแก้ไขได้' }, { status: 400 });
    }

    await prisma.job.update({
      where: { jobId },
      data: {
        status,
        repairNotes,
        repairerName,
        partsUsed: (partsUsed || '').trim() || null,
        partsCost: cost,
        isSynced: false
      }
    });

    return NextResponse.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ' });
  } catch (error) {
    console.error('Error updating repair:', error);
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 });
  }
}
