'use client';

import { useState, useEffect } from 'react';

type TechnicianStat = {
  name: string;
  total: number;
  fixed: number;
  unrepairable: number;
  pending: number;
};

export default function StatsPanel() {
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [stats, setStats] = useState<TechnicianStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'today'>('all');

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    processStats(allJobs, filterMode);
  }, [filterMode, allJobs]);

  async function fetchStats() {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.success && data.jobs) {
        setAllJobs(data.jobs);
      }
    } catch (e) {
      console.error('Error fetching jobs for stats', e);
    } finally {
      setLoading(false);
    }
  }

  function processStats(jobs: any[], mode: 'all' | 'today') {
    const statMap: Record<string, TechnicianStat> = {};
    const todayStr = new Date().toDateString();

    jobs.forEach(job => {
      // นับเฉพาะงานที่ถูกตรวจสอบและมีการลงชื่อช่างซ่อมแล้ว
      if (job.status === 'CANCELLED') return;
      if (!job.repairerName && job.status === 'PENDING') return;

      // Filter by mode
      if (mode === 'today') {
        const jobDate = new Date(job.updatedAt || job.createdAt).toDateString();
        if (jobDate !== todayStr) return;
      }

      const name = job.repairerName ? job.repairerName.trim() : 'ช่างซ่อมทั่วไป (ไม่ระบุชื่อ)';
      
      if (!statMap[name]) {
        statMap[name] = { name, total: 0, fixed: 0, unrepairable: 0, pending: 0 };
      }

      statMap[name].total += 1;

      if (job.status === 'FIXED' || job.status === 'RETURNED_FIXED') {
        statMap[name].fixed += 1;
      } else if (job.status === 'UNREPAIRABLE' || job.status === 'RETURNED_UNREPAIRABLE') {
        statMap[name].unrepairable += 1;
      } else {
        statMap[name].pending += 1;
      }
    });

    const statList = Object.values(statMap);
    
    // เรียงลำดับตามคนที่ "ซ่อมสำเร็จ" เยอะที่สุดเป็นอันดับแรก
    statList.sort((a, b) => b.fixed - a.fixed || b.total - a.total);
    
    setStats(statList);
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูลสถิติ...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-5xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">🏆 ทำเนียบยอดฝีมือช่างซ่อม 🏆</h2>
        <p className="text-gray-500 mt-2">สถิติผลงานการซ่อมของช่างแต่ละท่าน (จัดอันดับตามจำนวนที่ซ่อมสำเร็จ)</p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setFilterMode('today')}
            className={`px-6 py-2 rounded-md font-semibold transition-all ${
              filterMode === 'today' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            รายวัน (วันนี้)
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-6 py-2 rounded-md font-semibold transition-all ${
              filterMode === 'all' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            ทั้งหมด (ตั้งแต่ต้น)
          </button>
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="text-center p-12 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
          ไม่มีข้อมูลการซ่อมตามเงื่อนไขที่เลือก
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="p-4 rounded-tl-lg font-semibold w-24 text-center">อันดับ</th>
                <th className="p-4 font-semibold text-lg">ชื่อช่างผู้ซ่อม</th>
                <th className="p-4 font-semibold text-center">รับงานทั้งหมด</th>
                <th className="p-4 font-semibold text-center text-green-300">ซ่อมสำเร็จ ✓</th>
                <th className="p-4 font-semibold text-center text-red-300">ซ่อมไม่ได้ ✕</th>
                <th className="p-4 font-semibold text-center text-yellow-300">กำลังซ่อม ⏳</th>
                <th className="p-4 rounded-tr-lg font-semibold text-center">อัตราสำเร็จ (%)</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, index) => {
                let rankBadge: any = <span className="text-gray-500 font-bold text-xl">{index + 1}</span>;
                if (index === 0) rankBadge = <span className="text-4xl" title="อันดับ 1">🥇</span>;
                else if (index === 1) rankBadge = <span className="text-4xl" title="อันดับ 2">🥈</span>;
                else if (index === 2) rankBadge = <span className="text-4xl" title="อันดับ 3">🥉</span>;

                const successRate = stat.total > 0 ? Math.round((stat.fixed / stat.total) * 100) : 0;

                return (
                  <tr key={stat.name} className="border-b hover:bg-blue-50 transition-colors">
                    <td className="p-4 text-center align-middle">{rankBadge}</td>
                    <td className="p-4 font-bold text-gray-800 text-lg">{stat.name}</td>
                    <td className="p-4 text-center text-xl font-mono bg-gray-50">{stat.total}</td>
                    <td className="p-4 text-center text-xl font-mono text-green-600 font-bold bg-green-50">{stat.fixed}</td>
                    <td className="p-4 text-center text-xl font-mono text-red-500 bg-red-50">{stat.unrepairable}</td>
                    <td className="p-4 text-center text-xl font-mono text-yellow-600 bg-yellow-50">{stat.pending}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2.5">
                          <div className={`h-2.5 rounded-full ${successRate >= 80 ? 'bg-green-500' : successRate >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`} style={{ width: `${successRate}%` }}></div>
                        </div>
                        <span className="font-bold text-gray-700 w-10">{successRate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
