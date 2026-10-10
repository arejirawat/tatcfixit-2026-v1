import sys

content = open('src/components/ReportPanel.tsx', 'r', encoding='utf-8').read()

start_pdf = content.find('const exportPDFSummary = async () => {')
end_excel = content.find('const exportExcelSummary = () => {')

new_funcs = """
  const exportPDFSummary = async () => {
    try {
      const element = document.getElementById('pdf-report-template');
      if (!element) return;
      
      const imgData = await toPng(element, { 
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const rect = element.getBoundingClientRect();
      const pdfHeight = (rect.height * pdfWidth) / rect.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Summary_Report_${filterDate}.pdf`);
    } catch (e: any) {
      console.error('Error generating PDF:', e);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF: ' + (e.message || e));
    }
  };

  """

content = content[:start_pdf] + new_funcs.strip() + '\n\n  ' + content[end_excel:]
open('src/components/ReportPanel.tsx', 'w', encoding='utf-8').write(content)
