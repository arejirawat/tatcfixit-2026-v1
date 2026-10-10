import sys
content = open('src/app/dashboard/page.tsx', 'r', encoding='utf-8').read()

content = content.replace('  const [initialJobCount, setInitialJobCount] = useState<number | null>(null);\n  const [hasNewJobs, setHasNewJobs] = useState(false);\n', '')

polling_code = """  useEffect(() => {
    fetch('/api/jobs/count').then(r => r.json()).then(d => {
      if (d.success) setInitialJobCount(d.count);
    }).catch(() => {});

    const interval = setInterval(() => {
      fetch('/api/jobs/count').then(r => r.json()).then(d => {
        if (d.success) {
          setInitialJobCount(prev => {
            if (prev !== null && d.count > prev) {
              setHasNewJobs(true);
            }
            return prev;
          });
        }
      }).catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, []);

"""
content = content.replace(polling_code, '')

toast_code = """      {hasNewJobs && (
        <div className="bg-green-500 text-white p-3 text-center cursor-pointer shadow-md flex justify-center items-center gap-4 animate-pulse" onClick={() => window.location.reload()}>
          <span>🔔 มีรายการแจ้งซ่อมใหม่เข้ามา! กรุณารีเฟรชหน้าเว็บเพื่อดูข้อมูลล่าสุด</span>
          <button className="bg-white text-green-700 px-3 py-1 rounded font-bold text-sm">รีเฟรช (F5)</button>
        </div>
      )}
"""
content = content.replace(toast_code, '')

open('src/app/dashboard/page.tsx', 'w', encoding='utf-8').write(content)
