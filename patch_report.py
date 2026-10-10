import sys
import re

content = open('src/components/ReportPanel.tsx', 'r', encoding='utf-8').read()

# 1. Add imports
imports = """import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
"""
content = content.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';\n" + imports)

# 2. Add centerName state
content = content.replace("const [filterStatus, setFilterStatus] = useState<string>('ALL');", "const [filterStatus, setFilterStatus] = useState<string>('ALL');\n  const [centerName, setCenterName] = useState('ศูนย์ Fix IT Center');")

# 3. Add fetchSettings in fetchJobs
fetch_jobs = """
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success) {
        const center = data.settings.find((s: any) => s.key === 'CENTER_NAME');
        if (center) setCenterName(center.value);
      }
    } catch (e) {
      console.error(e);
    }
  };
"""

content = content.replace("const fetchJobs = async () => {", fetch_jobs + "\n  const fetchJobs = async () => {")

# Add fetchSettings to useEffect
content = content.replace("fetchJobs();\n  }, []);", "fetchJobs();\n    fetchSettings();\n  }, []);")


export_funcs = """
  const exportPDFSummary = async () => {
    const doc = new jsPDF();
    try {
      const response = await fetch('/fonts/Sarabun-Regular.ttf');
      const fontBuffer = await response.arrayBuffer();
      const fontUint8Array = new Uint8Array(fontBuffer);
      let binaryString = '';
      for (let i = 0; i < fontUint8Array.length; i++) {
        binaryString += String.fromCharCode(fontUint8Array[i]);
      }
      const fontBase64 = btoa(binaryString);
      doc.addFileToVFS('Sarabun-Regular.ttf', fontBase64);
      doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
      doc.setFont('Sarabun');
    } catch (e) {
      console.error('Error loading Thai font', e);
    }

    const dateStr = filterDate === 'ALL' ? 'ทั้งหมด' : new Date(filterDate).toLocaleDateString('th-TH');
    
    doc.setFontSize(16);
    doc.text(`สรุปข้อมูลการซ่อม - ${centerName}`, 14, 15);
    
    doc.setFontSize(12);
    doc.text(`วันที่: ${dateStr}`, 14, 23);
    doc.text(`จำนวนงานทั้งหมด: ${totalJobs} งาน`, 14, 30);
    
    doc.text(`สรุปแยกตามชนิดงาน:`, 14, 40);

    const tableColumn = ["ชนิดงาน", "จำนวน (งาน)"];
    const tableRows = sortedCategories.map(([cat, count]) => [cat, count.toString()]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      styles: { font: 'Sarabun', fontSize: 12 },
      headStyles: { fontStyle: 'bold' }
    });
    
    doc.save(`Summary_Report_${filterDate}.pdf`);
  };

  const exportExcelSummary = () => {
    const dateStr = filterDate === 'ALL' ? 'ทั้งหมด' : new Date(filterDate).toLocaleDateString('th-TH');
    
    // Header info rows
    const wsData = [
      ["สรุปข้อมูลการซ่อม", centerName],
      ["วันที่", dateStr],
      ["จำนวนงานทั้งหมด", totalJobs],
      [],
      ["ชนิดงาน", "จำนวน (งาน)"]
    ];
    
    sortedCategories.forEach(([cat, count]) => {
      wsData.push([cat, count]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
    XLSX.writeFile(wb, `Summary_Report_${filterDate}.xlsx`);
  };
"""

content = content.replace("return (", export_funcs + "\n  return (")

buttons = """
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4 print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">สรุปข้อมูลการซ่อม (Dashboard)</h2>
            <div className="flex gap-2 mt-2">
              <button onClick={exportPDFSummary} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
                PDF สำหรับนำเสนอ
              </button>
              <button onClick={exportExcelSummary} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Excel สำหรับแก้ไข
              </button>
            </div>
          </div>
"""

old_header = """        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4 print:hidden">
          <h2 className="text-2xl font-bold text-gray-800">สรุปข้อมูลการซ่อม (Dashboard)</h2>"""

# For safety, I'll use regex if exact replace fails
content = re.sub(r'<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4 \n?print:hidden">\s*<h2 className="text-2xl font-bold text-gray-800">สรุปข้อมูลการซ่อม \n?\(Dashboard\)</h2>', buttons.strip(), content, flags=re.MULTILINE)

open('src/components/ReportPanel.tsx', 'w', encoding='utf-8').write(content)
