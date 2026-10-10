const fs = require('fs');

let content = fs.readFileSync('src/app/api/jobs/route.ts', 'utf8');

const oldCode = `    // 2. จัดการข้อมูลลูกค้า (สร้างใหม่ หรือ อัปเดตของเดิม)
    const customer = await prisma.customer.upsert({
      where: { citizenId: data.citizenId },
      update: {
        name: \`\${data.firstName} \${data.lastName}\`.trim(),
        address: data.address,
        phone: data.phone,
      },
      create: {
        citizenId: data.citizenId,
        name: \`\${data.title || ''}\${data.firstName} \${data.lastName}\`.trim(),
        address: data.address,
        phone: data.phone,
      }
    });`;

const newCode = `    // 2. จัดการข้อมูลลูกค้า (สร้างใหม่ หรือ อัปเดตของเดิม)
    let safeCitizenId = data.citizenId;
    if (!safeCitizenId || safeCitizenId === '-' || safeCitizenId.trim() === '') {
      safeCitizenId = 'manual-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    }

    const customer = await prisma.customer.upsert({
      where: { citizenId: safeCitizenId },
      update: {
        name: \`\${data.firstName || ''} \${data.lastName || ''}\`.trim(),
        address: data.address,
        phone: data.phone,
      },
      create: {
        citizenId: safeCitizenId,
        name: \`\${data.title || ''}\${data.firstName || ''} \${data.lastName || ''}\`.trim(),
        address: data.address,
        phone: data.phone,
      }
    });`;

if (content.includes('where: { citizenId: data.citizenId }')) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync('src/app/api/jobs/route.ts', content, 'utf8');
    console.log("Successfully replaced customer.upsert block");
} else {
    console.log("Could not find block");
}
