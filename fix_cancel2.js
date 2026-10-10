const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

c = c.replace(
    /const cancelJob = async \([\s\S]*?body: JSON.stringify\(\{ jobId, status: 'CANCELLED' \}\)\n\s*\}\);/,
    `const cancelJob = async (jobId: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกการซ่อมนี้? (ข้อมูลจะยังอยู่แต่สถานะเป็นยกเลิก)')) {
      try {
        const res = await fetch('/api/jobs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, status: 'CANCELLED' })
        });`
);

fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
