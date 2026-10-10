import sys
import re

content = open('src/components/ReportPanel.tsx', 'r', encoding='utf-8').read()

start_pdf = content.find('const exportPDFSummary = async () => {')
end_excel = content.find('};', content.find('const exportExcelSummary = () => {')) + 2

new_funcs = """
  const exportPDFSummary = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const element = document.getElementById('pdf-report-template');
      if (!element) return;
      
      element.style.display = 'block';
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      element.style.display = 'none';
      
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Summary_Report_${filterDate}.pdf`);
    } catch (e) {
      console.error('Error generating PDF:', e);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF');
    }
  };

  const exportExcelSummary = () => {
    const dateStr = filterDate === 'ALL' ? 'ทั้งหมด' : new Date(filterDate).toLocaleDateString('th-TH');
    
    const fixedCount = (statusCount['FIXED'] || 0) + (statusCount['RETURNED_FIXED'] || 0);
    const unrepairableCount = (statusCount['UNREPAIRABLE'] || 0) + (statusCount['RETURNED_UNREPAIRABLE'] || 0);
    const pendingCount = (statusCount['PENDING'] || 0) + (statusCount['REPAIRING'] || 0) + (statusCount['WAITING_RETURN'] || 0);
    const returnedCount = (statusCount['RETURNED'] || 0);
    
    // Header info rows
    const wsData = [
      ["รายงานสรุปผลการปฏิบัติงาน - FixIT Center"],
      ["ชื่อศูนย์:", centerName],
      ["วันที่:", dateStr],
      [],
      ["สรุปภาพรวม (งาน)"],
      ["งานทั้งหมด", totalJobs],
      ["ซ่อมสำเร็จ", fixedCount],
      ["ซ่อมไม่ได้", unrepairableCount],
      ["กำลังดำเนินการ", pendingCount],
      ["คืนเครื่อง (อื่นๆ)", returnedCount],
      [],
      ["ลำดับ", "ชนิดงาน (หมวดหมู่)", "จำนวน (งาน)"]
    ];
    
    let i = 1;
    sortedCategories.forEach(([cat, count]) => {
      wsData.push([i++, cat, count]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 10 }, { wch: 40 }, { wch: 15 }];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
    XLSX.writeFile(wb, `Summary_Report_${filterDate}.xlsx`);
  };
"""

content = content[:start_pdf] + new_funcs.strip() + content[end_excel:]
open('src/components/ReportPanel.tsx', 'w', encoding='utf-8').write(content)
