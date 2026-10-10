const fs = require('fs');
let c = fs.readFileSync('src/components/ReportPanel.tsx', 'utf8');

if (!c.includes("import html2canvas from 'html2canvas';")) {
  c = c.replace("import jsPDF from 'jspdf';", "import jsPDF from 'jspdf';\nimport html2canvas from 'html2canvas';");
  c = c.replace("const html2canvas = (await import('html2canvas')).default;", "");
}

fs.writeFileSync('src/components/ReportPanel.tsx', c, 'utf8');
