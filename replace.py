import re

content = open('src/components/AdminPanel.tsx', 'r', encoding='utf-8').read()

content = content.replace('if (s.key === \'CONTACT_PHONE\') setContactPhone(s.value);', 
  'if (s.key === \'CONTACT_PHONE\') setContactPhone(s.value);\n          if (s.key === \'OVERRIDE_DATE\') {\n            if (s.value) {\n              setOverrideDate(s.value);\n              setIsOverrideDate(true);\n            } else {\n              setIsOverrideDate(false);\n              setOverrideDate(\'\');\n            }\n          }')

overrideUI = """
          <h2 className="text-xl font-semibold mb-6 mt-10 border-b pb-2">ตั้งค่าวันที่บันทึกข้อมูล (กรณีกรอกย้อนหลัง)</h2>
          <div className="mb-4">
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="dateMode" checked={!isOverrideDate} onChange={() => {
                  setIsOverrideDate(false);
                  setOverrideDate('');
                  saveSetting('OVERRIDE_DATE', '');
                }} className="w-4 h-4 text-blue-600" />
                <span>ใช้วัน/เวลาปัจจุบันจากเครื่อง</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="dateMode" checked={isOverrideDate} onChange={() => {
                  setIsOverrideDate(true);
                  const today = new Date().toISOString().split('T')[0];
                  setOverrideDate(today);
                }} className="w-4 h-4 text-blue-600" />
                <span>ปรับวันที่เอง (ย้อนหลัง)</span>
              </label>
            </div>
            {isOverrideDate && (
              <div className="flex gap-2 mt-3 p-4 bg-gray-50 border rounded-md">
                <input type="date" value={overrideDate} onChange={e => setOverrideDate(e.target.value)} className="border p-2 rounded w-full" />
                <button onClick={() => saveSetting('OVERRIDE_DATE', overrideDate)} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 whitespace-nowrap font-medium">บันทึกวันที่</button>
              </div>
            )}
          </div>

          <h2 className="text-xl font-semibold mb-6 mt-10 border-b pb-2">ระบบสแกนสำหรับช่าง (QR Code)</h2>
"""

content = re.sub(r'<h2[^>]*>ระบบสแกนสำหรับช่าง \(QR Code\)</h2>', overrideUI, content)

open('src/components/AdminPanel.tsx', 'w', encoding='utf-8').write(content)
