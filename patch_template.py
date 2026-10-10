import sys

content = open('src/components/ReportPanel.tsx', 'r', encoding='utf-8').read()

template = """
      {/* Hidden PDF Report Template */}
      <div className="overflow-hidden h-0 w-0 absolute left-[-9999px] top-[-9999px]">
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
"""

content = content.replace("    </div>\n  );\n}", template + "\n    </div>\n  );\n}")
open('src/components/ReportPanel.tsx', 'w', encoding='utf-8').write(content)
