import sys
content = open('src/app/dashboard/page.tsx', 'r', encoding='utf-8').read()

# Instead of multiline replacement which keeps failing due to line endings, let's use regex
import re
content = re.sub(r'(</button>\s*)}\s*</>\s*)}\s*)(</td>)', r'\1<button onClick={() => reprintJob(job)} className="text-white bg-gray-500 hover:bg-gray-600 px-2 py-1 rounded text-xs font-medium ml-1 mt-1 sm:mt-0" title="พิมพ์เอกสารย้อนหลัง">พิมพ์</button>\2', content)

open('src/app/dashboard/page.tsx', 'w', encoding='utf-8').write(content)
