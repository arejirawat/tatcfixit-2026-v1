'use client';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import autoTable from 'jspdf-autotable';


export default function ReportPanel() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterDate, setFilterDate] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [centerName, setCenterName] = useState('ศูนย์ Fix IT Center');

  // Popup state
  const [selectedJob, setSelectedJob] = useState<any>(null);

  
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success) {
        const center = data.settings.find((s: any) => s.key === 'CENTER_NAME');
        if (center) setCenterName(center.value);
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchSettings();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>;
  }

  // 1. Filter by Date First
  const filteredJobsByDate = jobs.filter(job => {
    if (filterDate === 'ALL') return true;
    const jobDate = new Date(job.createdAt).toLocaleDateString('en-CA');
    return jobDate === filterDate;
  });

  // Calculate statistics based on Date Filter
  const totalJobs = filteredJobsByDate.length;
  const statusCount = filteredJobsByDate.reduce((acc, job) => {
      if (job.status === 'CANCELLED') return acc;
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 2. Filter by Status (for the table and category breakdown)
  const displayedJobs = filteredJobsByDate.filter(job => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PENDING_REPAIRING') return job.status === 'PENDING' || job.status === 'REPAIRING';
    if (filterStatus === 'WAITING_RETURN') return job.status === 'WAITING_RETURN' || job.status === 'FIXED' || job.status === 'UNREPAIRABLE';
    if (filterStatus === 'RETURNED') return job.status.startsWith('RETURNED');
    return job.status === filterStatus;
  });

  const categoryCount = displayedJobs.reduce((acc, job) => {
      if (job.status === 'CANCELLED') return acc;
    const cat = job.category?.name || 'ไม่ระบุ';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = (Object.entries(categoryCount) as [string, number][]).sort((a, b) => b[1] - a[1]);

  const customerCount = displayedJobs.reduce((acc, job) => {
    if (job.customer) {
      // Use name and last 4 digits of citizen ID for privacy/display
      const citId = job.customer.citizenId || '0000000000000';
      const maskedId = citId.length === 13 ? `...${citId.substring(9)}` : citId;
      const key = `${job.customer.name} (${maskedId})`;
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const sortedCustomers = (Object.entries(customerCount) as [string, number][]).sort((a, b) => b[1] - a[1]);
  const totalUniqueCustomers = Object.keys(customerCount).length;

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'รอซ่อม';
      case 'REPAIRING': return 'กำลังซ่อม';
      case 'WAITING_RETURN': return 'รอส่งคืน';
      case 'FIXED': return 'ซ่อมได้ (รอส่งคืน)';
      case 'UNREPAIRABLE': return 'ซ่อมไม่ได้ (รอส่งคืน)';
      case 'RETURNED': return 'ส่งคืนแล้ว';
      case 'RETURNED_FIXED': return 'ส่งคืนแล้ว (ซ่อมได้)';
      case 'RETURNED_UNREPAIRABLE': return 'ส่งคืนแล้ว (ซ่อมไม่ได้)';
      case 'CANCELLED': return 'ยกเลิก';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REPAIRING': return 'bg-yellow-100 text-yellow-800';
      case 'WAITING_RETURN': return 'bg-orange-100 text-orange-800';
      case 'FIXED': return 'bg-blue-100 text-blue-800';
      case 'UNREPAIRABLE': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-200 text-gray-700';
      case 'RETURNED': return 'bg-green-100 text-green-800';
      case 'RETURNED_FIXED': return 'bg-green-100 text-green-800';
      case 'RETURNED_UNREPAIRABLE': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePrintJob = () => {
    window.print();
  };

  
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

  const getVcareServiceType = (catName: string, itemDetail: string): string => {
    const text = `${catName} ${itemDetail}`.toLowerCase();
    if (/จักรยานยนต์|มอเตอร์ไซ|มอไซ|wave|scoopy|fino|click|pcx|aerox|spark|msx|เวฟ|ฟีโน่|คลิก/i.test(text)) {
      return '4. ตรวจเช็กและซ่อมรถจักรยานยนต์';
    }
    if (/รถยนต์|กระบะ|เก๋ง|d-max|hilux|vigo|revo|yaris|vios|city|civic/i.test(text)) {
      return '5. ตรวจเช็กรถยนต์';
    }
    if (/เครื่องมือ|ตัดหญ้า|เลื่อย|ปั๊ม|สว่าน|กบไส|เครื่องเชื่อม|พ่นยา|หินเจียร|ตู้เชื่อม|robin|makita|bosch/i.test(text)) {
      return '6. ตรวจเช็กและซ่อมเครื่องมือประกอบอาชีพ';
    }
    if (/ระบบไฟฟ้า|สายไฟ|ตู้ไฟ|เบรกเกอร์|ปลั๊กไฟ|หลอดไฟ|สวิตช์/i.test(text)) {
      return '7. ตรวจเช็กระบบไฟฟ้าเบื้องต้น';
    }
    if (/ครัว|อาหาร|ข้าวกล่อง/i.test(text)) {
      return '1. โรงครัวอาชีวะ';
    }
    if (/พักพิง|ที่พัก/i.test(text)) {
      return '2. ศูนย์พักพิง';
    }
    if (/แนะนำ|ปรึกษา|สอบถาม/i.test(text)) {
      return '9. ให้คำแนะนำประชาชน (ให้คำปรึกษาและข้อมูลข่าวสาร)';
    }
    return '3. ตรวจเช็กและซ่อมเครื่องใช้ไฟฟ้า';
  };

  const getVcareStatus = (status: string): string => {
    if (status === 'FIXED' || status === 'RETURNED_FIXED' || status === 'RETURNED') {
      return 'เสร็จสิ้น (Completed)';
    }
    if (status === 'UNREPAIRABLE' || status === 'RETURNED_UNREPAIRABLE') {
      return 'ส่งต่อ (Referred)';
    }
    return 'กำลังดำเนินการ (In Progress)';
  };

  const exportVcareExcel = async () => {
    try {
      const exportJobs = filteredJobsByDate.filter(j => j.status !== 'CANCELLED');
      if (exportJobs.length === 0) {
        alert('ไม่พบข้อมูลงานสำหรับ Export (หรือข้อมูลถูกยกเลิกทั้งหมด)');
        return;
      }

      const dataRows = exportJobs.map((job, idx) => {
        const catName = job.category?.name || 'เครื่องใช้ไฟฟ้า';
        const serviceType = getVcareServiceType(catName, job.itemDetail || '');
        const vcareStatus = getVcareStatus(job.status);
        
        let notes = `รหัสงาน: ${job.jobId}`;
        if (job.repairerName) {
          notes += ` | ช่าง: ${job.repairerName.trim()}`;
        }
        if (job.status === 'UNREPAIRABLE' || job.status === 'RETURNED_UNREPAIRABLE') {
          notes += ` (ซ่อมไม่ได้)`;
        }

        return [
          idx + 1,
          centerName || 'ศูนย์บริการทั่วไป',
          serviceType,
          job.customer?.name || 'ประชาชนทั่วไป',
          job.customer?.phone || '',
          job.customer?.address || '',
          catName,
          job.itemDetail || '-',
          job.symptoms || '-',
          job.repairNotes || '',
          0,
          vcareStatus,
          notes
        ];
      });

      let wb: XLSX.WorkBook;
      try {
        const res = await fetch('/VCARE_Import_Template.xlsx');
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          wb = XLSX.read(arrayBuf, { type: 'array' });
          const sheetName = wb.SheetNames.includes('ข้อมูลบันทึกบริการ V-Care') 
            ? 'ข้อมูลบันทึกบริการ V-Care' 
            : wb.SheetNames[0];
          const ws = wb.Sheets[sheetName];
          
          Object.keys(ws).forEach(key => {
            if (key.startsWith('!')) return;
            const r = parseInt(key.replace(/^[A-Z]+/, ''), 10);
            if (r >= 2) delete ws[key];
          });

          XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: 'A2' });
          ws['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 12, r: dataRows.length } });
        } else {
          throw new Error('Template fetch failed');
        }
      } catch (err) {
        wb = XLSX.utils.book_new();
        const headers = [
          'ลำดับ', 'จุดบริการ / ศูนย์อาชีวะอาสา', 'เลือกประเภทบริการ *',
          'ชื่อ-นามสกุล ผู้รับบริการ *', 'เบอร์โทรศัพท์ติดต่อ', 'ที่อยู่ / พื้นที่ประสบภัย',
          'ชนิดเครื่องใช้ไฟฟ้า / สิ่งของ *', 'ยี่ห้อ / รุ่น', 'อาการเสีย / สาเหตุ *',
          'อะไหล่ที่เปลี่ยน', 'ค่าใช้จ่าย (บาท)', 'สถานะงาน *', 'หมายเหตุเพิ่มเติม'
        ];
        const wsMain = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
        wsMain['!cols'] = [
          { wch: 8 }, { wch: 25 }, { wch: 35 }, { wch: 25 }, { wch: 15 },
          { wch: 35 }, { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 20 },
          { wch: 15 }, { wch: 25 }, { wch: 30 }
        ];

        const lookupData = [
          ['ประเภทบริการ', 'สถานะงาน'],
          ['1. โรงครัวอาชีวะ', 'เสร็จสิ้น (Completed)'],
          ['2. ศูนย์พักพิง', 'กำลังดำเนินการ (In Progress)'],
          ['3. ตรวจเช็กและซ่อมเครื่องใช้ไฟฟ้า', 'รออะไหล่ (Pending Spare Parts)'],
          ['4. ตรวจเช็กและซ่อมรถจักรยานยนต์', 'ส่งต่อ (Referred)'],
          ['5. ตรวจเช็กรถยนต์', null],
          ['6. ตรวจเช็กและซ่อมเครื่องมือประกอบอาชีพ', null],
          ['7. ตรวจเช็กระบบไฟฟ้าเบื้องต้น', null],
          ['8. อื่น ๆ (ช่วยเหลือผู้ประสบภัยอื่น ๆ)', null],
          ['9. ให้คำแนะนำประชาชน (ให้คำปรึกษาและข้อมูลข่าวสาร)', null]
        ];
        const wsLookup = XLSX.utils.aoa_to_sheet(lookupData);

        XLSX.utils.book_append_sheet(wb, wsMain, 'ข้อมูลบันทึกบริการ V-Care');
        XLSX.utils.book_append_sheet(wb, wsLookup, 'Lookup_Data');
      }

      const fileName = `VCARE_Import_${filterDate === 'ALL' ? 'ALL' : filterDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (e: any) {
      console.error('Error exporting VCARE Excel:', e);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ V-Care: ' + (e.message || e));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-7xl mx-auto mt-4 text-black relative">
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
              <button onClick={exportVcareExcel} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 shadow-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Excel V-Care (สำหรับ Import)
              </button>
            </div>
          </div>
        
        {/* Date Filter */}
        <div className="flex items-center space-x-2 mt-4 md:mt-0 bg-gray-100 p-2 rounded-lg">
          <label className="font-bold text-sm text-gray-700">ดูข้อมูลวันที่:</label>
          <input 
            type="date" 
            value={filterDate === 'ALL' ? '' : filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value || 'ALL');
              setFilterStatus('ALL');
            }}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <button 
            onClick={() => { setFilterDate('ALL'); setFilterStatus('ALL'); }}
            className={`px-3 py-1 text-sm rounded ${filterDate === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-300 hover:bg-gray-400'}`}
          >
            ทั้งหมด
          </button>
        </div>
      </div>
      
      {/* Cards - Clickable for filtering */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 print:hidden">
        <div 
          onClick={() => setFilterStatus('ALL')}
          className={`p-4 rounded shadow-sm cursor-pointer transition-all duration-200 ${filterStatus === 'ALL' ? 'bg-blue-100 border-l-4 border-blue-600 ring-2 ring-blue-300' : 'bg-blue-50 border-l-4 border-blue-400 hover:bg-blue-100 opacity-80'}`}
        >
          <div className="text-sm text-blue-800 font-bold">จำนวนงานทั้งหมด</div>
          <div className="text-3xl font-black text-blue-700">{totalJobs}</div>
          <div className="text-xs text-blue-600 mt-1">จากลูกค้าทั้งหมด {totalUniqueCustomers} คน</div>
        </div>
        
        <div 
          onClick={() => setFilterStatus('PENDING_REPAIRING')}
          className={`p-4 rounded shadow-sm cursor-pointer transition-all duration-200 ${filterStatus === 'PENDING_REPAIRING' ? 'bg-yellow-100 border-l-4 border-yellow-600 ring-2 ring-yellow-300' : 'bg-yellow-50 border-l-4 border-yellow-400 hover:bg-yellow-100 opacity-80'}`}
        >
          <div className="text-sm text-yellow-800 font-bold">รอซ่อม / กำลังซ่อม</div>
          <div className="text-3xl font-black text-yellow-700">{(statusCount['PENDING'] || 0) + (statusCount['REPAIRING'] || 0)}</div>
        </div>
        
        <div 
          onClick={() => setFilterStatus('WAITING_RETURN')}
          className={`p-4 rounded shadow-sm cursor-pointer transition-all duration-200 ${filterStatus === 'WAITING_RETURN' ? 'bg-orange-100 border-l-4 border-orange-600 ring-2 ring-orange-300' : 'bg-orange-50 border-l-4 border-orange-400 hover:bg-orange-100 opacity-80'}`}
        >
          <div className="text-sm text-orange-800 font-bold">ซ่อมเสร็จ / รอส่งคืน</div>
          <div className="text-3xl font-black text-orange-700">{(statusCount['WAITING_RETURN'] || 0) + (statusCount['FIXED'] || 0) + (statusCount['UNREPAIRABLE'] || 0)}</div>
        </div>
        
        <div 
          onClick={() => setFilterStatus('RETURNED')}
          className={`p-4 rounded shadow-sm cursor-pointer transition-all duration-200 ${filterStatus === 'RETURNED' ? 'bg-green-100 border-l-4 border-green-600 ring-2 ring-green-300' : 'bg-green-50 border-l-4 border-green-400 hover:bg-green-100 opacity-80'}`}
        >
          <div className="text-sm text-green-800 font-bold">ส่งคืนเรียบร้อย</div>
          <div className="text-3xl font-black text-green-700">{(statusCount['RETURNED'] || 0) + (statusCount['RETURNED_FIXED'] || 0) + (statusCount['RETURNED_UNREPAIRABLE'] || 0)}</div>
          <div className="text-xs text-green-700 mt-1">
            ซ่อมได้ {(statusCount['RETURNED'] || 0) + (statusCount['RETURNED_FIXED'] || 0)} | ซ่อมไม่ได้ {statusCount['RETURNED_UNREPAIRABLE'] || 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 print:hidden">
        {/* Category Breakdown */}
        <div className="md:col-span-1 bg-gray-50 p-4 rounded border">
          <h3 className="font-bold text-sm mb-4 border-b pb-2 flex justify-between items-center text-gray-700">
            แยกตามชนิดสิ่งของ 
          </h3>
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {sortedCategories.map(([cat, count]) => (
              <li key={cat} className="flex justify-between items-center bg-white p-2 border rounded shadow-sm text-sm">
                <span className="truncate mr-2">{cat}</span>
                <span className="font-bold bg-gray-200 text-gray-800 px-2 py-1 rounded-full text-xs">{count}</span>
              </li>
            ))}
            {sortedCategories.length === 0 && <li className="text-gray-500 text-center py-4 text-sm">ไม่มีข้อมูล</li>}
          </ul>
        </div>

        {/* Customer Breakdown */}
        <div className="md:col-span-1 bg-gray-50 p-4 rounded border">
          <h3 className="font-bold text-sm mb-4 border-b pb-2 flex justify-between items-center text-gray-700">
            ผู้ใช้บริการ (คน)
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{totalUniqueCustomers}</span>
          </h3>
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {sortedCustomers.map(([customerKey, count]) => (
              <li key={customerKey} className="flex justify-between items-center bg-white p-2 border rounded shadow-sm text-xs">
                <span className="truncate mr-2" title={customerKey}>{customerKey}</span>
                <span className="font-bold bg-blue-50 text-blue-800 px-2 py-1 rounded-full">{count}</span>
              </li>
            ))}
            {sortedCustomers.length === 0 && <li className="text-gray-500 text-center py-4 text-sm">ไม่มีข้อมูล</li>}
          </ul>
        </div>

        {/* Recent Jobs Table */}
        <div className="md:col-span-2 bg-gray-50 p-4 rounded border">
          <h3 className="font-bold text-sm mb-4 border-b pb-2 flex justify-between items-center text-gray-700">
            รายการงานซ่อม 
            <span className="text-xs font-normal text-gray-500">
              พบ {displayedJobs.length} รายการ (คลิกเพื่อดูใบงาน)
            </span>
          </h3>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-200 sticky top-0 shadow-sm">
                <tr>
                  <th className="p-2 border">รหัสงาน</th>
                  <th className="p-2 border">ลูกค้า</th>
                  <th className="p-2 border">สิ่งของ</th>
                  <th className="p-2 border">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {displayedJobs.map(job => (
                  <tr 
                    key={job.id} 
                    onClick={() => setSelectedJob(job)}
                    className="border-b bg-white hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <td className="p-2 border font-mono text-blue-700">{job.jobId}</td>
                    <td className="p-2 border truncate max-w-[100px]">{job.customer?.name}</td>
                    <td className="p-2 border truncate max-w-[100px]">{job.category?.name}</td>
                    <td className="p-2 border">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap ${getStatusColor(job.status)}`}>
                        {getStatusText(job.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {displayedJobs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500 bg-white">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Modal / Popup for Job Details */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:static print:inset-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col print:shadow-none print:max-h-none print:w-full">
            <div className="p-4 border-b flex justify-between items-center print:hidden bg-gray-100 rounded-t-lg">
              <h3 className="font-bold text-lg text-gray-800">รายละเอียดใบรับงาน: {selectedJob.jobId}</h3>
              <div className="space-x-2">
                <button onClick={handlePrintJob} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm shadow">
                  พิมพ์หน้านี้
                </button>
                <button onClick={() => setSelectedJob(null)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded text-sm shadow">
                  ปิด
                </button>
              </div>
            </div>
            
            <div className="p-8 overflow-y-auto print:p-0 text-black">
              {/* Receipt Layout inside Modal */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">ใบรับงานซ่อม (Repair Form)</h1>
                <p className="mt-1 text-gray-600">รหัสงาน: {selectedJob.jobId} | วันที่รับงาน: {new Date(selectedJob.createdAt).toLocaleDateString('th-TH')}</p>
                <p className="text-gray-600 text-sm mt-1">สถานะปัจจุบัน: <span className={`font-bold px-2 py-1 rounded ${getStatusColor(selectedJob.status)}`}>{getStatusText(selectedJob.status)}</span></p>
              </div>
              
              <div className="border border-gray-400 rounded p-6 mb-6">
                <h2 className="font-bold border-b pb-2 mb-4 text-lg">ข้อมูลผู้ใช้บริการ</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="font-semibold">ชื่อ-สกุล:</span> {selectedJob.customer?.name}</div>
                  <div><span className="font-semibold">บัตรประชาชน:</span> {selectedJob.customer?.citizenId}</div>
                  <div className="col-span-2"><span className="font-semibold">ที่อยู่:</span> {selectedJob.customer?.address || '-'}</div>
                  <div><span className="font-semibold">เบอร์โทรศัพท์:</span> {selectedJob.customer?.phone || '-'}</div>
                </div>
              </div>

              <div className="border border-gray-400 rounded p-6 mb-6">
                <h2 className="font-bold border-b pb-2 mb-4 text-lg">ข้อมูลการซ่อม</h2>
                <div className="grid grid-cols-1 gap-4">
                  <div><span className="font-semibold">ชนิดสิ่งของ:</span> {selectedJob.category?.name}</div>
                  <div><span className="font-semibold">รายละเอียดสิ่งของ:</span> {selectedJob.itemDetail || '-'}</div>
                  <div><span className="font-semibold">อาการเสีย:</span> <span className="text-red-600 font-medium">{selectedJob.symptoms}</span></div>
                  {selectedJob.repairNotes && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <span className="font-semibold">ผลการตรวจสอบ/ซ่อมแซม:</span> <span className="text-blue-700">{selectedJob.repairNotes}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-between items-end px-10">
                <div className="text-center">
                  <div className="w-48 border-b border-black mb-2"></div>
                  <p>( {selectedJob.customer?.name} )</p>
                  <p className="text-sm mt-1">ผู้ใช้บริการ / ผู้ส่งซ่อม</p>
                </div>
                <div className="text-center">
                  <div className="w-48 border-b border-black mb-2 text-center pb-1">{selectedJob.repairerName || ''}</div>
                  <p>( {selectedJob.repairerName ? selectedJob.repairerName : '.....................................................'} )</p>
                  <p className="text-sm mt-1">ผู้รับเรื่อง / ช่างซ่อม</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden container just for full page printing logic */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          ${selectedJob ? `
          body * {
            visibility: hidden;
          }
          .fixed, .fixed * {
            visibility: visible;
          }
          .fixed {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            box-shadow: none;
          }
          ` : `
          .print\\:hidden {
            display: none !important;
          }
          `}
        }
      `}} />

      {/* Hidden PDF Report Template */}
      <div className="absolute left-[-9999px] top-[0] -z-50">
        <div id="pdf-report-template" className="bg-white text-black w-[800px] p-8 font-sans">
          {/* Header */}
          <div className="bg-blue-800 text-white p-6 text-center rounded-t-xl mb-6 shadow-sm">
            <h1 className="text-3xl font-bold mb-2">รายงานสรุปผลการปฏิบัติงาน</h1>
            <h2 className="text-xl font-semibold opacity-90">{centerName}</h2>
          </div>
          
          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex justify-between items-center mb-6 text-sm">
            <div><span className="font-bold text-blue-900">ประจำวันที่:</span> {filterDate === 'ALL' ? 'ทั้งหมด' : new Date(filterDate).toLocaleDateString('th-TH')}</div>
            <div><span className="font-bold text-blue-900">พิมพ์เมื่อ:</span> {new Date().toLocaleString('th-TH')}</div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-100 border border-blue-200 p-4 rounded-xl text-center shadow-sm">
              <div className="text-blue-800 font-bold mb-1">งานทั้งหมด</div>
              <div className="text-4xl font-black text-blue-900">{totalJobs}</div>
            </div>
            <div className="bg-green-100 border border-green-200 p-4 rounded-xl text-center shadow-sm">
              <div className="text-green-800 font-bold mb-1">ซ่อมสำเร็จ</div>
              <div className="text-4xl font-black text-green-900">{(statusCount['FIXED'] || 0) + (statusCount['RETURNED_FIXED'] || 0)}</div>
            </div>
            <div className="bg-red-100 border border-red-200 p-4 rounded-xl text-center shadow-sm">
              <div className="text-red-800 font-bold mb-1">ซ่อมไม่ได้</div>
              <div className="text-4xl font-black text-red-900">{(statusCount['UNREPAIRABLE'] || 0) + (statusCount['RETURNED_UNREPAIRABLE'] || 0)}</div>
            </div>
            <div className="bg-yellow-100 border border-yellow-200 p-4 rounded-xl text-center shadow-sm">
              <div className="text-yellow-800 font-bold mb-1">กำลังดำเนินการ</div>
              <div className="text-4xl font-black text-yellow-900">{(statusCount['PENDING'] || 0) + (statusCount['REPAIRING'] || 0) + (statusCount['WAITING_RETURN'] || 0)}</div>
            </div>
          </div>

          {/* Categories Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <h3 className="bg-gray-800 text-white p-3 px-4 font-bold text-lg">สรุปแยกตามชนิดงาน</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                  <th className="p-3 px-4 font-bold w-16 text-center">ลำดับ</th>
                  <th className="p-3 px-4 font-bold">ชนิดงาน (หมวดหมู่)</th>
                  <th className="p-3 px-4 font-bold text-center w-32">จำนวน (งาน)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedCategories.map(([cat, count], idx) => (
                  <tr key={cat} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 px-4 text-center text-gray-500">{idx + 1}</td>
                    <td className="p-3 px-4 font-medium">{cat}</td>
                    <td className="p-3 px-4 text-center font-bold text-blue-600">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-gray-400 text-sm border-t border-gray-100 pt-4">
            เอกสารฉบับนี้สร้างโดยระบบ FixIT Center 2026 (ระบบจัดการศูนย์ซ่อมสร้างเพื่อชุมชน)
          </div>
        </div>
      </div>

    </div>
  );
}
