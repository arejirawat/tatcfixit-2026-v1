import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getServiceType, guessServiceType } from '@/lib/vcare';

// ลูกค้าที่ไม่มีเลขบัตร (กรอกเอง) จะได้รหัสเฉพาะตัวที่ขึ้นต้นด้วยค่านี้ เพื่อไม่ให้ถูกรวมเป็นคนเดียวกัน
const NO_ID_PREFIX = 'NOID-';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const firstName = (data.firstName || '').trim();
    const lastName = (data.lastName || '').trim();
    const symptoms = (data.symptoms || '').trim();
    if (!firstName) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุชื่อผู้ใช้บริการ' }, { status: 400 });
    }
    if (!symptoms) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุอาการเสีย' }, { status: 400 });
    }

    const rawCitizenId = (data.citizenId || '').trim();
    const hasCitizenId = rawCitizenId !== '' && rawCitizenId !== '-';
    const citizenId = hasCitizenId
      ? rawCitizenId
      : `${NO_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fullName = `${data.title || ''}${firstName} ${lastName}`.trim();
    const categoryName = data.productType?.trim() || 'ทั่วไป';

    // 3.5 Check override date
    const overrideDateSetting = await prisma.setting.findUnique({ where: { key: 'OVERRIDE_DATE' } });
    let overrideDate: Date | undefined = undefined;
    if (overrideDateSetting && overrideDateSetting.value) {
      overrideDate = new Date(overrideDateSetting.value);
    }

    // ทำทั้งหมดใน transaction เดียว: ถ้าบันทึกไม่สำเร็จ เลขคิวจะไม่ถูกข้าม
    // และการบันทึกพร้อมกันหลายเครื่องจะไม่ได้เลขคิวซ้ำกัน
    const job = await prisma.$transaction(async (tx) => {
      // 1. ดึง Setting รหัสรันคิว (ถ้าไม่มีให้ใช้ค่าตั้งต้น)
      let prefixSetting = await tx.setting.findUnique({ where: { key: 'QUEUE_PREFIX' } });
      let numberSetting = await tx.setting.findUnique({ where: { key: 'QUEUE_NUMBER' } });
      if (!prefixSetting) {
        prefixSetting = await tx.setting.create({ data: { key: 'QUEUE_PREFIX', value: 'FIX-' } });
      }
      if (!numberSetting) {
        numberSetting = await tx.setting.create({ data: { key: 'QUEUE_NUMBER', value: '1' } });
      }

      let currentNumber = parseInt(numberSetting.value, 10);
      if (!Number.isFinite(currentNumber) || currentNumber < 1) currentNumber = 1;

      // สร้างรหัสคิว เช่น FIX-0001 (ข้ามเลขที่มีอยู่แล้ว เช่น กรณีรีเซ็ตเลขคิวโดยยังไม่ล้างข้อมูล)
      let jobId = `${prefixSetting.value}${currentNumber.toString().padStart(4, '0')}`;
      while (await tx.job.findUnique({ where: { jobId }, select: { id: true } })) {
        currentNumber += 1;
        jobId = `${prefixSetting.value}${currentNumber.toString().padStart(4, '0')}`;
      }

      // อัปเดตเลขรันคิวถัดไป
      await tx.setting.update({
        where: { key: 'QUEUE_NUMBER' },
        data: { value: (currentNumber + 1).toString() }
      });

      // 2. จัดการข้อมูลลูกค้า (สร้างใหม่ หรือ อัปเดตของเดิม)
      const customer = hasCitizenId
        ? await tx.customer.upsert({
            where: { citizenId },
            update: {
              name: fullName,
              address: data.address,
              phone: data.phone,
              isSynced: false,
            },
            create: {
              citizenId,
              name: fullName,
              address: data.address,
              phone: data.phone,
            }
          })
        : await tx.customer.create({
            data: {
              citizenId,
              name: fullName,
              address: data.address,
              phone: data.phone,
            }
          });

      // 3. หมวดหมู่
      let category = await tx.category.findUnique({ where: { name: categoryName } });
      if (!category) {
        category = await tx.category.create({ data: { name: categoryName } });
      }

      // 4. สร้างใบรับงาน
      return tx.job.create({
        data: {
          jobId,
          customerId: customer.id,
          categoryId: category.id,
          itemDetail: data.productDetail || '',
          symptoms,
          serviceType: getServiceType(data.serviceType)?.code
            ?? guessServiceType(categoryName, data.productDetail || ''),
          brandModel: (data.brandModel || '').trim() || null,
          licensePlate: (data.licensePlate || '').trim() || null,
          status: 'PENDING',
          ...(overrideDate && { createdAt: overrideDate })
        }
      });
    });

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error('Error saving job:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const citizenId = searchParams.get('citizenId');

  try {
    if (!citizenId) {
      const allJobs = await prisma.job.findMany({
        include: {
          category: true,
          customer: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json({ success: true, jobs: allJobs });
    }

    const customer = await prisma.customer.findUnique({
      where: { citizenId },
      include: {
        jobs: {
          include: { category: true, customer: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer) {
      return NextResponse.json({ success: true, jobs: [], customer: null });
    }

    return NextResponse.json({ success: true, jobs: customer.jobs, customer: { name: customer.name, phone: customer.phone, address: customer.address } });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { jobId, status } = data;

    if (!jobId || !status) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    const job = await prisma.job.update({
      where: { jobId },
      data: { status, isSynced: false }
    });

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
