import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 1. ดึง Setting รหัสรันคิว (ถ้าไม่มีให้ใช้ค่าตั้งต้น)
    let prefixSetting = await prisma.setting.findUnique({ where: { key: 'QUEUE_PREFIX' } });
    let numberSetting = await prisma.setting.findUnique({ where: { key: 'QUEUE_NUMBER' } });
    
    if (!prefixSetting) {
      prefixSetting = await prisma.setting.create({ data: { key: 'QUEUE_PREFIX', value: 'FIX-' } });
    }
    if (!numberSetting) {
      numberSetting = await prisma.setting.create({ data: { key: 'QUEUE_NUMBER', value: '1' } });
    }

    const currentNumber = parseInt(numberSetting.value, 10);
    const newNumber = currentNumber + 1;
    
    // สร้างรหัสคิว เช่น FIX-0001
    const paddedNumber = currentNumber.toString().padStart(4, '0');
    const jobId = `${prefixSetting.value}${paddedNumber}`;

    // อัปเดตเลขรันคิวถัดไป
    await prisma.setting.update({
      where: { key: 'QUEUE_NUMBER' },
      data: { value: newNumber.toString() }
    });

    // 2. จัดการข้อมูลลูกค้า (สร้างใหม่ หรือ อัปเดตของเดิม)
    const customer = await prisma.customer.upsert({
      where: { citizenId: data.citizenId },
      update: {
        name: `${data.firstName} ${data.lastName}`.trim(),
        address: data.address,
        phone: data.phone,
      },
      create: {
        citizenId: data.citizenId,
        name: `${data.title || ''}${data.firstName} ${data.lastName}`.trim(),
        address: data.address,
        phone: data.phone,
      }
    });

    // 3. หมวดหมู่
    const categoryName = data.productType?.trim() || 'ทั่วไป';
    let category = await prisma.category.findUnique({ where: { name: categoryName } });
    if (!category) {
      category = await prisma.category.create({ data: { name: categoryName } });
    }

    // 4. สร้างใบรับงาน
    const job = await prisma.job.create({
      data: {
        jobId: jobId,
        customerId: customer.id,
        categoryId: category.id,
        itemDetail: data.productDetail,
        symptoms: data.symptoms,
        status: 'PENDING'
      }
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
          include: { category: true },
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
