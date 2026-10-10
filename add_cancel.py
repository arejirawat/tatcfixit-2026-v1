import re
content = open('src/components/AdminPanel.tsx', 'r', encoding='utf-8').read()

content = content.replace('case \'RETURNED_UNREPAIRABLE\': return \'ส่งคืนแล้ว (ซ่อมไม่ได้)\';', 'case \'RETURNED_UNREPAIRABLE\': return \'ส่งคืนแล้ว (ซ่อมไม่ได้)\';\n      case \'CANCELLED\': return \'ยกเลิก\';')

content = content.replace(
  'job.status === \'UNREPAIRABLE\' ? \'bg-red-100 text-red-800\' : \'bg-yellow-100 text-yellow-800\'}',
  'job.status === \'UNREPAIRABLE\' ? \'bg-red-100 text-red-800\' : job.status === \'CANCELLED\' ? \'bg-gray-200 text-gray-700\' : \'bg-yellow-100 text-yellow-800\'}'
)

cancel_func = """
  const cancelJob = async (jobId: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกการซ่อมนี้? (ข้อมูลจะยังอยู่แต่สถานะเป็นยกเลิก)')) {
      try {
        const res = await fetch('/api/jobs/update-repair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, status: 'CANCELLED' })
        });
        const data = await res.json();
        if (data.success) {
          fetchJobs();
          alert('อัปเดตสถานะเป็นยกเลิกเรียบร้อย');
        } else {
          alert('Error: ' + data.message);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };
"""
content = content.replace('const clearDatabase = async () => {', cancel_func + '\n  const clearDatabase = async () => {')

# Find the exact table row structure
pattern = re.compile(r'<td className="px-4 py-3 text-sm">\s*<span className=\{`px-2 inline-flex[^>]+>\s*\{getStatusText\(job\.status\)\}\s*</span>\s*</td>\s*</tr>')

replacement = """<td className="px-4 py-3 text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${job.status.startsWith('RETURNED') ? 'bg-green-100 text-green-800' : job.status === 'FIXED' ? 'bg-blue-100 text-blue-800' : job.status === 'UNREPAIRABLE' ? 'bg-red-100 text-red-800' : job.status === 'CANCELLED' ? 'bg-gray-200 text-gray-700' : 'bg-yellow-100 text-yellow-800'}`}>
                          {getStatusText(job.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {job.status !== 'CANCELLED' && (
                          <button onClick={() => cancelJob(job.jobId)} className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 px-2 py-1 rounded">ยกเลิกการซ่อม</button>
                        )}
                      </td>
                    </tr>"""

content = pattern.sub(replacement, content)

open('src/components/AdminPanel.tsx', 'w', encoding='utf-8').write(content)
