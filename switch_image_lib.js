const fs = require('fs');
let c = fs.readFileSync('src/components/ReportPanel.tsx', 'utf8');

c = c.replace("import html2canvas from 'html2canvas';", "import { toPng } from 'html-to-image';");

const oldCode = `const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      
      
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;`;

const newCode = `const imgData = await toPng(element, { 
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // Calculate height based on standard element proportions
      const rect = element.getBoundingClientRect();
      const pdfHeight = (rect.height * pdfWidth) / rect.width;`;

c = c.replace(oldCode, newCode);

fs.writeFileSync('src/components/ReportPanel.tsx', c, 'utf8');
