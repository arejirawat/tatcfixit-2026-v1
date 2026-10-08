'use client';

import { useState, useEffect } from 'react';

export default function TechnicianPage() {
  const [jobId, setJobId] = useState('');
  const [repairNotes, setRepairNotes] = useState('');
  const [status, setStatus] = useState<'FIXED' | 'UNREPAIRABLE' | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId || !status) {
      setMessage('กรุณากรอกรหัสคิวงาน และเลือกสถานะการซ่อม');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`/api/jobs/update-repair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, status, repairNotes })
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`อัปเดตงาน ${jobId} สำเร็จเป็นสถานะ: ${status === 'FIXED' ? 'ซ่อมได้' : 'ซ่อมไม่ได้'}`);
        setJobId('');
        setRepairNotes('');
        setStatus(null);
      } else {
        setMessage(`เกิดข้อผิดพลาด: ${data.message}`);
      }
    } catch (error) {
      setMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex justify-center items-start">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md mt-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">อัปเดตผลการซ่อม</h1>
          <h2 className="text-sm text-gray-600 mt-1">สำหรับช่างผู้ปฏิบัติงาน</h2>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded text-sm ${message.includes('สำเร็จ') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสคิวงาน (Job ID) *</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border rounded-md uppercase"
              value={jobId}
              onChange={(e) => setJobId(e.target.value.toUpperCase())}
              placeholder="เช่น 2026-0001"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด / ผลการซ่อม</label>
            <textarea 
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              value={repairNotes}
              onChange={(e) => setRepairNotes(e.target.value)}
              placeholder="เช่น เปลี่ยนอะไหล่ C ช็อต, หรือ บอร์ดพังไม่มีอะไหล่"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">สรุปผลการซ่อม *</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => setStatus('FIXED')}
                className={`py-3 px-4 rounded-md font-bold text-sm border-2 ${status === 'FIXED' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'}`}
              >
                ✓ ซ่อมได้
              </button>
              <button 
                type="button"
                onClick={() => setStatus('UNREPAIRABLE')}
                className={`py-3 px-4 rounded-md font-bold text-sm border-2 ${status === 'UNREPAIRABLE' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-600 hover:bg-red-50'}`}
              >
                ✕ ซ่อมไม่ได้
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !status}
            className="w-full py-3 px-4 mt-4 rounded-md font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </form>
      </div>
    </div>
  );
}
