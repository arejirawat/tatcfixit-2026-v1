'use client';

import { useState, useEffect } from 'react';
import AppVersion from '@/components/AppVersion';

export default function TechnicianPage() {
  const [jobIdPart, setJobIdPart] = useState('');
  const [prefix, setPrefix] = useState('FIX-');
  const [repairerName, setRepairerName] = useState('');
  const [repairNotes, setRepairNotes] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [status, setStatus] = useState<'FIXED' | 'UNREPAIRABLE' | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [techList, setTechList] = useState<string[]>([]);

  useEffect(() => {
    // Load saved settings
    const savedName = localStorage.getItem('techName');
    if (savedName) setRepairerName(savedName);
    
    const savedPrefix = localStorage.getItem('techPrefix');
    if (savedPrefix) setPrefix(savedPrefix);

    // Load technicians list
    fetch('/api/technicians').then(res => res.json()).then(data => {
      if (data.success) {
        setTechList(data.technicians);
      }
    }).catch(console.error);

    // Setup connection status listener
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  const getFullJobId = () => {
    return `${prefix}${jobIdPart}`.trim();
  };

  const checkJob = async () => {
    if (!jobIdPart) return;
    const cleanId = getFullJobId();
    setChecking(true);
    setMessage('');
    try {
      const res = await fetch(`/api/jobs/search?jobId=${encodeURIComponent(cleanId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.job) {
          setJobDetails(data.job);
          setMessage('');
        } else {
          setJobDetails(null);
          setMessage('ไม่พบหมายเลขคิวงานนี้ในระบบ');
        }
      } else {
        setJobDetails(null);
        setMessage('ไม่พบหมายเลขคิวงานนี้ในระบบ');
      }
    } catch (e) {
      setMessage('เกิดข้อผิดพลาดในการตรวจสอบระบบ หรือขาดการเชื่อมต่อ');
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobIdPart || !status || !repairerName) {
      setMessage('กรุณากรอกรหัสคิวงาน, ชื่อช่าง และเลือกสถานะการซ่อม');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Save settings to local storage for next time
      localStorage.setItem('techName', repairerName);
      localStorage.setItem('techPrefix', prefix);

      const response = await fetch(`/api/jobs/update-repair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: getFullJobId(), status, repairNotes, repairerName, partsUsed, partsCost })
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`อัปเดตงาน ${getFullJobId()} สำเร็จเป็นสถานะ: ${status === 'FIXED' ? 'ซ่อมได้' : 'ซ่อมไม่ได้'}`);
        setJobIdPart('');
        setRepairNotes('');
        setPartsUsed('');
        setPartsCost('');
        setStatus(null);
        setJobDetails(null);
      } else {
        setMessage(`เกิดข้อผิดพลาด: ${data.message}`);
      }
    } catch (error) {
      setMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ หรือเครือข่ายมีปัญหา');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex justify-center items-start relative">
      {/* Offline Indicator */}
      {isOffline && (
        <div className="absolute top-0 left-0 w-full bg-red-500 text-white text-xs font-bold py-1 text-center shadow-md z-50">
          ⚠️ ขาดการเชื่อมต่อเครือข่าย (Offline)
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md mt-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">อัปเดตผลการซ่อม</h1>
          <h2 className="text-sm text-gray-600 mt-1">สำหรับช่างผู้ปฏิบัติงาน</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อช่างผู้ซ่อม *</label>
            <input 
              type="text" 
              list="tech-list"
              className="w-full px-3 py-2 border rounded-md text-black bg-gray-50 focus:bg-white"
              value={repairerName}
              onChange={(e) => setRepairerName(e.target.value)}
              placeholder="เช่น นายสมชาย สุขใจ"
              required
            />
            <datalist id="tech-list">
              {techList.map((name, i) => (
                <option key={i} value={name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสคิวงาน (Job ID) *</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="w-1/3 px-3 py-2 border rounded-md uppercase text-center text-black bg-gray-100"
                value={prefix}
                onChange={(e) => {
                  setPrefix(e.target.value.toUpperCase());
                  setJobDetails(null);
                  setMessage('');
                }}
                placeholder="FIX-"
              />
              <input 
                type="text" 
                className="w-2/3 px-3 py-2 border rounded-md text-black bg-white font-bold"
                value={jobIdPart}
                onChange={(e) => {
                  setJobIdPart(e.target.value);
                  setJobDetails(null);
                  setMessage('');
                }}
                placeholder="เช่น 0001"
                required
              />
            </div>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  if (!jobIdPart) {
                    setMessage('กรุณากรอกรหัสคิวงานก่อนกดตรวจสอบ');
                    return;
                  }
                  checkJob();
                }}
                disabled={checking}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all disabled:bg-gray-400 disabled:active:scale-100 touch-manipulation"
              >
                {checking ? 'รอสักครู่...' : 'ตรวจสอบข้อมูล'}
              </button>
            </div>
            
            {message && (
              <div className={`mt-3 p-3 rounded-md text-sm font-medium text-center ${message.includes('สำเร็จ') ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                {message}
              </div>
            )}
          </div>

          {jobDetails && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-sm text-black">
              <p><strong>ผู้แจ้งซ่อม:</strong> {jobDetails.customer?.name}</p>
              <p><strong>เบอร์โทร:</strong> {jobDetails.customer?.phone || '-'}</p>
              <p><strong>สิ่งของ:</strong> {jobDetails.category?.name} {jobDetails.itemDetail}</p>
              <p><strong>อาการเสีย:</strong> {jobDetails.symptoms}</p>
              <p className="mt-2">
                <strong>สถานะปัจจุบัน:</strong> <span className="font-bold text-blue-700">{getStatusText(jobDetails.status)}</span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด / ผลการซ่อม</label>
            <textarea 
              className="w-full px-3 py-2 border rounded-md text-black bg-white"
              rows={3}
              value={repairNotes}
              onChange={(e) => setRepairNotes(e.target.value)}
              placeholder="เช่น เปลี่ยนอะไหล่ C ช็อต, หรือ บอร์ดพังไม่มีอะไหล่"
            ></textarea>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">อะไหล่ที่เปลี่ยน</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md text-black bg-white"
                value={partsUsed}
                onChange={(e) => setPartsUsed(e.target.value)}
                placeholder="เช่น คาปาซิเตอร์ 1.5uF"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ค่าใช้จ่าย (บาท)</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                className="w-full px-3 py-2 border rounded-md text-black bg-white"
                value={partsCost}
                onChange={(e) => setPartsCost(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">สรุปผลการซ่อม *</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => setStatus('FIXED')}
                className={`py-3 px-4 rounded-md font-bold text-sm border-2 active:scale-95 transition-all touch-manipulation ${status === 'FIXED' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'}`}
              >
                ✓ ซ่อมได้
              </button>
              <button 
                type="button"
                onClick={() => setStatus('UNREPAIRABLE')}
                className={`py-3 px-4 rounded-md font-bold text-sm border-2 active:scale-95 transition-all touch-manipulation ${status === 'UNREPAIRABLE' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-600 hover:bg-red-50'}`}
              >
                ✕ ซ่อมไม่ได้
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !status}
            className="w-full py-3 px-4 mt-4 rounded-md font-bold text-white bg-green-600 hover:bg-green-700 active:bg-green-800 active:scale-95 transition-all disabled:bg-gray-400 disabled:active:scale-100 touch-manipulation"
          >
            {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          เวอร์ชัน <AppVersion />
        </div>
      </div>
    </div>
  );
}
