'use client';
import { useState, useEffect } from 'react';

export default function ReportPanel() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>;
  }

  // Calculate statistics
  const totalJobs = jobs.length;
  const statusCount = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryCount = jobs.reduce((acc, job) => {
    const cat = job.category?.name || 'ไม่ระบุ';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort categories by count
  const sortedCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'รอซ่อม';
      case 'REPAIRING': return 'กำลังซ่อม';
      case 'WAITING_RETURN': return 'รอส่งคืน';
      case 'RETURNED': return 'ส่งคืนแล้ว';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REPAIRING': return 'bg-blue-100 text-blue-800';
      case 'WAITING_RETURN': return 'bg-orange-100 text-orange-800';
      case 'RETURNED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-7xl mx-auto mt-4 text-black">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">สรุปข้อมูลการซ่อม (Dashboard)</h2>
      
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded shadow-sm">
          <div className="text-sm text-gray-500 font-bold">จำนวนงานทั้งหมด</div>
          <div className="text-3xl font-black text-blue-700">{totalJobs}</div>
        </div>
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded shadow-sm">
          <div className="text-sm text-gray-500 font-bold">รอซ่อม / กำลังซ่อม</div>
          <div className="text-3xl font-black text-yellow-700">{(statusCount['PENDING'] || 0) + (statusCount['REPAIRING'] || 0)}</div>
        </div>
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded shadow-sm">
          <div className="text-sm text-gray-500 font-bold">ซ่อมเสร็จ (รอส่งคืน)</div>
          <div className="text-3xl font-black text-orange-700">{statusCount['WAITING_RETURN'] || 0}</div>
        </div>
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-sm">
          <div className="text-sm text-gray-500 font-bold">ส่งคืนเรียบร้อย</div>
          <div className="text-3xl font-black text-green-700">{statusCount['RETURNED'] || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Category Breakdown */}
        <div className="md:col-span-1 bg-gray-50 p-4 rounded border">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">แยกตามชนิดสิ่งของ</h3>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {sortedCategories.map(([cat, count]) => (
              <li key={cat} className="flex justify-between items-center bg-white p-2 border rounded shadow-sm">
                <span>{cat}</span>
                <span className="font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">{count}</span>
              </li>
            ))}
            {sortedCategories.length === 0 && <li className="text-gray-500 text-center py-4">ไม่มีข้อมูล</li>}
          </ul>
        </div>

        {/* Recent Jobs Table */}
        <div className="md:col-span-2 bg-gray-50 p-4 rounded border">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">รายการล่าสุด</h3>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-200 sticky top-0">
                <tr>
                  <th className="p-2 border">รหัสงาน</th>
                  <th className="p-2 border">ลูกค้า</th>
                  <th className="p-2 border">สิ่งของ</th>
                  <th className="p-2 border">วันที่</th>
                  <th className="p-2 border">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 50).map(job => (
                  <tr key={job.id} className="border-b bg-white hover:bg-gray-50">
                    <td className="p-2 border font-mono">{job.jobId}</td>
                    <td className="p-2 border">{job.customer?.name}</td>
                    <td className="p-2 border">{job.category?.name}</td>
                    <td className="p-2 border">{new Date(job.createdAt).toLocaleDateString('th-TH')}</td>
                    <td className="p-2 border">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(job.status)}`}>
                        {getStatusText(job.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500">ไม่มีข้อมูลงานซ่อม</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {jobs.length > 50 && <div className="text-xs text-gray-500 mt-2 text-right">แสดงข้อมูล 50 รายการล่าสุด</div>}
        </div>
      </div>
      
      <div className="text-right">
        <button onClick={() => window.print()} className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded print:hidden">
          พิมพ์รายงานนี้
        </button>
      </div>
    </div>
  );
}
