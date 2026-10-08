'use client';
import { useState, useEffect } from 'react';

export default function ReportPanel() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterDate, setFilterDate] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

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

  // 1. Filter by Date First
  const filteredJobsByDate = jobs.filter(job => {
    if (filterDate === 'ALL') return true;
    // job.createdAt is an ISO string, extract YYYY-MM-DD
    const jobDate = new Date(job.createdAt).toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD in local timezone
    return jobDate === filterDate;
  });

  // Calculate statistics based on Date Filter
  const totalJobs = filteredJobsByDate.length;
  const statusCount = filteredJobsByDate.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 2. Filter by Status (for the table and category breakdown)
  const displayedJobs = filteredJobsByDate.filter(job => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PENDING_REPAIRING') return job.status === 'PENDING' || job.status === 'REPAIRING';
    return job.status === filterStatus;
  });

  const categoryCount = displayedJobs.reduce((acc, job) => {
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">สรุปข้อมูลการซ่อม (Dashboard)</h2>
        
        {/* Date Filter */}
        <div className="flex items-center space-x-2 mt-4 md:mt-0 bg-gray-100 p-2 rounded-lg print:hidden">
          <label className="font-bold text-sm text-gray-700">ดูข้อมูลวันที่:</label>
          <input 
            type="date" 
            value={filterDate === 'ALL' ? '' : filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value || 'ALL');
              setFilterStatus('ALL'); // Reset status filter when date changes
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
          <div className="text-sm text-orange-800 font-bold">ซ่อมเสร็จ (รอส่งคืน)</div>
          <div className="text-3xl font-black text-orange-700">{statusCount['WAITING_RETURN'] || 0}</div>
        </div>
        
        <div 
          onClick={() => setFilterStatus('RETURNED')}
          className={`p-4 rounded shadow-sm cursor-pointer transition-all duration-200 ${filterStatus === 'RETURNED' ? 'bg-green-100 border-l-4 border-green-600 ring-2 ring-green-300' : 'bg-green-50 border-l-4 border-green-400 hover:bg-green-100 opacity-80'}`}
        >
          <div className="text-sm text-green-800 font-bold">ส่งคืนเรียบร้อย</div>
          <div className="text-3xl font-black text-green-700">{statusCount['RETURNED'] || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Category Breakdown */}
        <div className="md:col-span-1 bg-gray-50 p-4 rounded border">
          <h3 className="font-bold text-lg mb-4 border-b pb-2 flex justify-between items-center">
            แยกตามชนิดสิ่งของ 
            {filterStatus !== 'ALL' && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">ตัวกรองทำงาน</span>}
          </h3>
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {sortedCategories.map(([cat, count]) => (
              <li key={cat} className="flex justify-between items-center bg-white p-2 border rounded shadow-sm">
                <span>{cat}</span>
                <span className="font-bold bg-gray-200 text-gray-800 px-2 py-1 rounded-full text-xs">{count}</span>
              </li>
            ))}
            {sortedCategories.length === 0 && <li className="text-gray-500 text-center py-4">ไม่มีข้อมูล</li>}
          </ul>
        </div>

        {/* Recent Jobs Table */}
        <div className="md:col-span-2 bg-gray-50 p-4 rounded border">
          <h3 className="font-bold text-lg mb-4 border-b pb-2 flex justify-between items-center">
            รายการงานซ่อม 
            <span className="text-sm font-normal text-gray-500">
              พบ {displayedJobs.length} รายการ
            </span>
          </h3>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
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
                {displayedJobs.map(job => (
                  <tr key={job.id} className="border-b bg-white hover:bg-gray-50 transition-colors">
                    <td className="p-2 border font-mono text-blue-700">{job.jobId}</td>
                    <td className="p-2 border">{job.customer?.name}</td>
                    <td className="p-2 border">{job.category?.name}</td>
                    <td className="p-2 border text-xs">{new Date(job.createdAt).toLocaleString('th-TH')}</td>
                    <td className="p-2 border">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap ${getStatusColor(job.status)}`}>
                        {getStatusText(job.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {displayedJobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500 bg-white">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <button onClick={() => window.print()} className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded print:hidden flex items-center justify-center ml-auto gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          พิมพ์รายงานนี้
        </button>
      </div>
    </div>
  );
}
