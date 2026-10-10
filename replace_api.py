import re

content = open('src/app/api/jobs/route.ts', 'r', encoding='utf-8').read()

override_code = """
    // 3.5 Check override date
    const overrideDateSetting = await prisma.setting.findUnique({ where: { key: 'OVERRIDE_DATE' } });
    let overrideDate = undefined;
    if (overrideDateSetting && overrideDateSetting.value) {
      overrideDate = new Date(overrideDateSetting.value);
    }

    // 4. สร้างใบรับงาน
    const job = await prisma.job.create({
      data: {
        jobId: jobId,
        customerId: customer.id,
        categoryId: category.id,
        itemDetail: data.productDetail,
        symptoms: data.symptoms,
        status: 'PENDING',
        ...(overrideDate && { createdAt: overrideDate })
      }
    });
"""

content = re.sub(r'// 4\. สร้างใบรับงาน\s+const job = await prisma\.job\.create\(\{\s+data: \{\s+jobId: jobId,\s+customerId: customer\.id,\s+categoryId: category\.id,\s+itemDetail: data\.productDetail,\s+symptoms: data\.symptoms,\s+status: \'PENDING\'\s+\}\s+\}\);', override_code, content)

open('src/app/api/jobs/route.ts', 'w', encoding='utf-8').write(content)
