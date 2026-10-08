import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany();
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get('id');
    if (!idStr) return NextResponse.json({ success: false, message: 'Missing ID' }, { status: 400 });
    const id = parseInt(idStr);

    const targetCategory = await prisma.category.findUnique({ where: { id } });
    if (!targetCategory) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });

    if (targetCategory.name === 'อื่นๆ') {
      return NextResponse.json({ success: false, message: 'ไม่สามารถลบชนิดสิ่งของพื้นฐาน (อื่นๆ) ได้' }, { status: 400 });
    }

    const jobsCount = await prisma.job.count({ where: { categoryId: id } });
    
    if (jobsCount > 0) {
      let othersCategory = await prisma.category.findUnique({ where: { name: 'อื่นๆ' } });
      if (!othersCategory) {
        othersCategory = await prisma.category.create({ data: { name: 'อื่นๆ' } });
      }
      
      await prisma.job.updateMany({
        where: { categoryId: id },
        data: { categoryId: othersCategory.id }
      });
    }

    await prisma.category.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
