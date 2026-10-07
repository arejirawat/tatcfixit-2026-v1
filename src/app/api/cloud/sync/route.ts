import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

// API นี้จะถูกรันเฉพาะเมื่อระบบอยู่บน Cloud (Vercel + Neon)
// หน้าที่ของมันคือ รับข้อมูลก้อนใหญ่ (Payload) จากเครื่อง Local (ออฟไลน์) แล้วบันทึกลง Database ของ Cloud

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { customers, categories, jobs } = data;

    // TODO: ควรมี Authentication หรือ API Key ตรงนี้ เพื่อป้องกันคนนอกยิงข้อมูลเข้า

    // ทำการ Upsert (ถ้ามีอัปเดต ถ้าไม่มีสร้างใหม่) ข้อมูลลง Neon DB
    
    // 1. หมวดหมู่ (Categories)
    if (categories && categories.length > 0) {
      for (const cat of categories) {
        await prisma.category.upsert({
          where: { name: cat.name },
          update: { name: cat.name, isSynced: true },
          create: { name: cat.name, isSynced: true },
        });
      }
    }

    // 2. ลูกค้า (Customers)
    if (customers && customers.length > 0) {
      for (const cus of customers) {
        await prisma.customer.upsert({
          where: { citizenId: cus.citizenId },
          update: {
            name: cus.name,
            address: cus.address,
            phone: cus.phone,
            isSynced: true
          },
          create: {
            citizenId: cus.citizenId,
            name: cus.name,
            address: cus.address,
            phone: cus.phone,
            isSynced: true
          }
        });
      }
    }

    // 3. คิวงาน (Jobs)
    if (jobs && jobs.length > 0) {
      for (const job of jobs) {
        // ต้องหา ID ของ Customer และ Category บนระบบ Cloud ก่อน เพราะ ID บน Local อาจไม่ตรงกัน
        const cloudCus = await prisma.customer.findUnique({ where: { citizenId: job.customerCitizenId } });
        const cloudCat = await prisma.category.findUnique({ where: { name: job.categoryName } });

        if (cloudCus && cloudCat) {
          await prisma.job.upsert({
            where: { jobId: job.jobId },
            update: {
              status: job.status,
              itemDetail: job.itemDetail,
              symptoms: job.symptoms,
              isSynced: true
            },
            create: {
              jobId: job.jobId,
              customerId: cloudCus.id,
              categoryId: cloudCat.id,
              itemDetail: job.itemDetail,
              symptoms: job.symptoms,
              status: job.status,
              isSynced: true
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Cloud: Data synced successfully' });
  } catch (error: any) {
    console.error('Cloud Sync Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
