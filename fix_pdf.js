const fs = require('fs');
let c = fs.readFileSync('src/components/ReportPanel.tsx', 'utf8');

c = c.replace('<div className="overflow-hidden h-0 w-0 absolute left-[-9999px] top-[-9999px]">', '<div className="absolute left-[-9999px] top-[0] -z-50">');
c = c.replace("element.style.display = 'block';", "");
c = c.replace("element.style.display = 'none';", "");
c = c.replace("alert('เกิดข้อผิดพลาดในการสร้าง PDF');", "alert('เกิดข้อผิดพลาดในการสร้าง PDF: ' + (e.message || e));");

fs.writeFileSync('src/components/ReportPanel.tsx', c, 'utf8');
