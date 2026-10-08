'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminPanel() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [prefix, setPrefix] = useState('FIX-');
  const [queueNumber, setQueueNumber] = useState('1');
  const [centerName, setCenterName] = useState('วิทยาลัยเทคนิคสัตหีบ');
  const [contactPhone, setContactPhone] = useState('');
  const [activeMenu, setActiveMenu] = useState('overview');

  const [unsyncedCounts, setUnsyncedCounts] = useState({ total: 0, customers: 0, jobs: 0, categories: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lanIp, setLanIp] = useState('');

  useEffect(() => {
    fetchJobs();
    fetchSettings();
    fetchSyncStats();
    fetch('/api/admin/ip').then(res => res.json()).then(data => setLanIp(data.ip)).catch(() => setLanIp('localhost'));
  }, []);

  const fetchSyncStats = async () => {
    try {
      const res = await fetch('/api/admin/sync');
      const data = await res.json();
      if (data.success) {
        setUnsyncedCounts(data.counts);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchSyncStats(); // รีเฟรชตัวเลข
      } else {
        alert('เกิดข้อผิดพลาด: ' + data.message);
      }
    } catch (e) {
      alert('ไม่สามารถเชื่อมต่อ Cloud Server ได้ โปรดเช็คอินเทอร์เน็ต');
    }
    setIsSyncing(false);
  };

  const fetchJobs = async () => {
    const res = await fetch('/api/admin/jobs');
    const data = await res.json();
    if (data.success) setJobs(data.jobs);
  };

  const fetchSettings = async () => {
    const res = await fetch('/api/admin/settings');
    const data = await res.json();
    if (data.success) {
      data.settings.forEach((s: any) => {
        if (s.key === 'QUEUE_PREFIX') setPrefix(s.value);
        if (s.key === 'QUEUE_NUMBER') setQueueNumber(s.value);
        if (s.key === 'CENTER_NAME') setCenterName(s.value);
        if (s.key === 'CONTACT_PHONE') setContactPhone(s.value);
      });
    }
  };

  const saveSetting = async (key: string, value: string) => {
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    alert('บันทึกการตั้งค่าแล้ว');
  };

  const clearDatabase = async () => {
    if (confirm('คำเตือน: คุณแน่ใจหรือไม่ว่าจะล้างข้อมูลทั้งหมด? (ข้อมูลลูกค้าและประวัติการซ่อมจะหายไปทั้งหมด)')) {
      if (confirm('ยืนยันอีกครั้ง: หากกดตกลง ข้อมูลจะถูกลบทิ้งอย่างถาวรและไม่สามารถกู้คืนได้')) {
        const res = await fetch('/api/admin/backup', { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          alert('ล้างข้อมูลฐานข้อมูลเรียบร้อยแล้ว');
          setJobs([]);
          fetchSettings(); // Refresh settings to show reset queue number
        } else {
          alert('เกิดข้อผิดพลาด: ' + data.message);
        }
      }
    }
  };

  const handleImportDB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('คำเตือน: การ Import จะเขียนทับข้อมูลที่มีอยู่ทั้งหมดในระบบปัจจุบัน ยืนยันหรือไม่?')) {
      e.target.value = ''; // Reset file input
      return;
    }

    const formData = new FormData();
    formData.append('dbFile', file);

    try {
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        alert('นำเข้าฐานข้อมูลสำเร็จ กรุณารีเฟรชหน้าเว็บ');
        window.location.reload();
      } else {
        alert('เกิดข้อผิดพลาด: ' + data.message);
      }
    } catch (error) {
      alert('ไม่สามารถอัปโหลดไฟล์ฐานข้อมูลได้');
    }
  };

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
      default: return status;
    }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(jobs.map(j => ({
      'รหัสคิวงาน': j.jobId,
      'ชื่อลูกค้า': j.customer?.name,
      'เบอร์โทร': j.customer?.phone || '-',
      'สิ่งของที่ซ่อม': `${j.category?.name || ''} ${j.itemDetail}`.trim(),
      'อาการเสีย': j.symptoms,
      'สถานะ': getStatusText(j.status),
      'วันที่แจ้งซ่อม': new Date(j.createdAt).toLocaleDateString('th-TH')
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jobs");
    XLSX.writeFile(wb, "FixIT_Jobs.xlsx");
  };

  const exportPDF = async () => {
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
    
    doc.text("รายงานการซ่อม - Fix IT Center", 14, 15);
    
    const tableColumn = ["รหัสคิว", "ลูกค้า", "สิ่งของที่ซ่อม", "สถานะ", "วันที่"];
    const tableRows = jobs.map(j => [
      j.jobId,
      j.customer?.name,
      `${j.category?.name || ''} ${j.itemDetail}`.trim(),
      getStatusText(j.status),
      new Date(j.createdAt).toLocaleDateString('th-TH')
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { font: 'Sarabun' },
      headStyles: { fontStyle: 'normal' }
    });
    
    doc.save("FixIT_Jobs_Report.pdf");
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 text-black">
      <div className="flex gap-4 mb-6 border-b pb-2">
        <button onClick={() => setActiveMenu('overview')} className={`font-bold pb-2 ${activeMenu === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>ดูรายการทั้งหมด / ส่งออกข้อมูล</button>
        <button onClick={() => setActiveMenu('queue')} className={`font-bold pb-2 ${activeMenu === 'queue' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>จัดการรหัสรันคิว</button>
        <button onClick={() => setActiveMenu('sync')} className={`font-bold pb-2 ${activeMenu === 'sync' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            ซิงค์ขึ้น Cloud
          </span>
        </button>
      </div>

      {activeMenu === 'overview' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">รายการแจ้งซ่อมทั้งหมด ({jobs.length} รายการ)</h2>
            <div className="flex gap-2">
              <button onClick={clearDatabase} className="bg-gray-200 hover:bg-gray-300 text-red-600 font-bold px-4 py-2 rounded text-sm flex items-center gap-2 mr-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                Clear DB
              </button>
              
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2 cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                Import DB
                <input type="file" accept=".db" className="hidden" onChange={handleImportDB} />
              </label>

              <a href="/api/admin/backup" className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                Backup Database (.db)
              </a>
              <button onClick={exportExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
                Export Excel
              </button>
              <button onClick={exportPDF} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Export PDF
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">รหัสคิว</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ลูกค้า</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เบอร์โทร</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สิ่งของที่ซ่อม</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map(job => (
                  <tr key={job.id}>
                    <td className="px-4 py-3 text-sm font-medium">{job.jobId}</td>
                    <td className="px-4 py-3 text-sm">{job.customer?.name}</td>
                    <td className="px-4 py-3 text-sm">{job.customer?.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm">{job.category?.name} {job.itemDetail}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${job.status.startsWith('RETURNED') ? 'bg-green-100 text-green-800' : job.status === 'FIXED' ? 'bg-blue-100 text-blue-800' : job.status === 'UNREPAIRABLE' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {getStatusText(job.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">ไม่มีข้อมูล</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeMenu === 'queue' && (
        <div className="max-w-md">
          <h2 className="text-xl font-semibold mb-6 border-b pb-2">ข้อมูลศูนย์ซ่อม</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อศูนย์ซ่อม (แสดงบนใบรับงาน / คูปอง)</label>
            <div className="flex gap-2">
              <input type="text" value={centerName} onChange={e => setCenterName(e.target.value)} className="border p-2 rounded w-full" placeholder="วิทยาลัยเทคนิคสัตหีบ" />
              <button onClick={() => saveSetting('CENTER_NAME', centerName)} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700">บันทึก</button>
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์ติดต่อ (แสดงบนคูปองลูกค้า)</label>
            <div className="flex gap-2">
              <input type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="border p-2 rounded w-full" placeholder="038-xxx-xxx" />
              <button onClick={() => saveSetting('CONTACT_PHONE', contactPhone)} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700">บันทึก</button>
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-6 mt-10 border-b pb-2">ตั้งค่ารหัสคิวงาน (Job ID)</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">ตัวอักษรนำหน้า (Prefix)</label>
            <div className="flex gap-2">
              <input type="text" value={prefix} onChange={e => setPrefix(e.target.value)} className="border p-2 rounded w-full" />
              <button onClick={() => saveSetting('QUEUE_PREFIX', prefix)} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700">บันทึก</button>
            </div>
            <p className="text-xs text-gray-500 mt-1">เช่น FIX-, REP-, หรือ 2026-</p>
          </div>
          
          <div className="mb-4 mt-8">
            <label className="block text-sm font-medium text-gray-700 mb-1">เลขรันคิวปัจจุบัน (ถัดไปจะเป็นเลขนี้)</label>
            <div className="flex gap-2">
              <input type="number" value={queueNumber} onChange={e => setQueueNumber(e.target.value)} className="border p-2 rounded w-full" />
              <button onClick={() => saveSetting('QUEUE_NUMBER', queueNumber)} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700">บันทึก</button>
            </div>
            <p className="text-xs text-gray-500 mt-1">หากต้องการรีเซ็ตคิวเป็น 1 ให้ใส่เลข 1</p>
          </div>
          
          <div className="mt-8 p-4 bg-gray-50 rounded border">
            <p className="text-sm font-bold text-gray-700">ตัวอย่างรหัสคิวใบงานถัดไป:</p>
            <p className="text-2xl text-blue-600 font-mono mt-2">{prefix}{queueNumber.padStart(4, '0')}</p>
          </div>

          <h2 className="text-xl font-semibold mb-6 mt-10 border-b pb-2">ระบบสแกนสำหรับช่าง (QR Code)</h2>
          <div className="p-6 bg-white border rounded-lg flex flex-col items-center">
            <p className="text-sm text-gray-600 mb-4 text-center">
              ให้ช่างซ่อมใช้โทรศัพท์มือถือสแกน QR Code นี้ (ต้องต่อ WiFi เดียวกัน)<br/>
              เพื่อบันทึกผลการซ่อม (ซ่อมได้ / ซ่อมไม่ได้)
            </p>
            {lanIp && <QRCodeSVG value={`http://${lanIp}:3000/technician`} size={200} />}
            <p className="mt-2 text-xs text-gray-500 font-mono">http://{lanIp}:3000/technician</p>
            <a href="/technician" target="_blank" className="mt-4 text-blue-600 underline text-sm">
              เปิดหน้าต่างสำหรับช่าง
            </a>
          </div>
        </div>
      )}

      {activeMenu === 'sync' && (
        <div className="max-w-xl">
          <h2 className="text-xl font-semibold mb-6">ระบบส่งข้อมูลขึ้น Cloud (Offline-First Sync)</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-6 mb-6">
            <p className="text-blue-800 mb-4">ระบบนี้ถูกออกแบบมาเพื่อรองรับการทำงานในพื้นที่ที่ไม่มีอินเทอร์เน็ต เมื่อคุณเชื่อมต่ออินเทอร์เน็ตได้แล้ว สามารถกดปุ่มด้านล่างเพื่ออัปเดตข้อมูลทั้งหมดไปยัง Server ส่วนกลาง</p>
            
            <div className="grid grid-cols-2 gap-4 text-center mt-6">
              <div className="bg-white p-4 rounded shadow-sm">
                <p className="text-gray-500 text-sm">ข้อมูลลูกค้าใหม่/อัปเดต</p>
                <p className="text-2xl font-bold text-gray-800">{unsyncedCounts.customers} <span className="text-sm font-normal">รายการ</span></p>
              </div>
              <div className="bg-white p-4 rounded shadow-sm">
                <p className="text-gray-500 text-sm">คิวงานใหม่/อัปเดตสถานะ</p>
                <p className="text-2xl font-bold text-gray-800">{unsyncedCounts.jobs} <span className="text-sm font-normal">รายการ</span></p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
            {unsyncedCounts.total > 0 ? (
              <>
                <p className="text-gray-600 mb-4 text-center">มีข้อมูลจำนวน <span className="font-bold text-red-500">{unsyncedCounts.total}</span> รายการที่ยังไม่ได้ส่งขึ้นระบบกลาง</p>
                <button 
                  onClick={handleSyncToCloud}
                  disabled={isSyncing}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 disabled:bg-gray-400"
                >
                  <svg className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  {isSyncing ? 'กำลังซิงค์ข้อมูล...' : 'เริ่ม Sync ข้อมูลขึ้น Cloud'}
                </button>
              </>
            ) : (
              <div className="text-center">
                <div className="text-green-500 mb-2 flex justify-center">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <p className="text-gray-800 font-bold text-lg">ข้อมูลเป็นปัจจุบันแล้ว</p>
                <p className="text-gray-500 text-sm mt-1">ไม่มีข้อมูลค้างส่งในขณะนี้</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
