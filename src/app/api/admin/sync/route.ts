import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

export async function GET() {
  try {
    const unsyncedCustomers = await prisma.customer.count({ where: { isSynced: false } });
    const unsyncedJobs = await prisma.job.count({ where: { isSynced: false } });
    const unsyncedCategories = await prisma.category.count({ where: { isSynced: false } });

    return NextResponse.json({ 
      success: true, 
      counts: {
        customers: unsyncedCustomers,
        jobs: unsyncedJobs,
        categories: unsyncedCategories,
        total: unsyncedCustomers + unsyncedJobs + unsyncedCategories
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    // 1. ดึงข้อมูลที่ยังไม่ได้ Sync
    const customers = await prisma.customer.findMany({ where: { isSynced: false } });
    const jobs = await prisma.job.findMany({ 
      where: { isSynced: false },
      include: { customer: true, category: true } 
    });
    const categories = await prisma.category.findMany({ where: { isSynced: false } });

    if (customers.length === 0 && jobs.length === 0 && categories.length === 0) {
      return NextResponse.json({ success: true, message: 'ทุกอย่างซิงค์เรียบร้อยแล้ว ไม่มีข้อมูลใหม่' });
    }

    // แปลงข้อมูล jobs เพื่อให้มี citizenId และ categoryName ส่งไป Cloud
    const payloadJobs = jobs.map(j => ({
      jobId: j.jobId,
      customerCitizenId: j.customer?.citizenId,
      categoryName: j.category?.name,
      itemDetail: j.itemDetail,
      symptoms: j.symptoms,
      status: j.status
    }));

    const payload = { customers, categories, jobs: payloadJobs };

    // 2. ส่งข้อมูลไป Cloud API
    const CLOUD_API_URL = process.env.CLOUD_SYNC_URL || 'https://fixit-2026.vercel.app/api/cloud/sync';
    
    // ถ้ามีการตั้งค่า URL จริงๆ ก็ยิง fetch ได้เลย
    if (process.env.CLOUD_SYNC_URL) {
      try {
        const cloudRes = await fetch(CLOUD_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!cloudRes.ok) throw new Error('Cloud API rejected the sync request');
      } catch (err) {
        throw new Error('ไม่สามารถเชื่อมต่อ Cloud API ได้');
      }
    } else {
      // จำลองเวลาหน่วง
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // 3. หลังจากจำลองส่งสำเร็จ ให้อัปเดตสถานะ isSynced เป็น true ทั้งหมด
    await prisma.customer.updateMany({ where: { isSynced: false }, data: { isSynced: true } });
    await prisma.job.updateMany({ where: { isSynced: false }, data: { isSynced: true } });
    await prisma.category.updateMany({ where: { isSynced: false }, data: { isSynced: true } });

    return NextResponse.json({ success: true, message: 'ส่งข้อมูลขึ้น Cloud สำเร็จแล้ว' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
