import re
content = open('src/app/dashboard/page.tsx', 'r', encoding='utf-8').read()

pattern = re.compile(r'(<td className="px-6 py-4 whitespace-nowrap text-center space-x-2">.*?</>)(\s*)(</>)?(\s*)}\s*(</td>)', re.DOTALL)

def repl(m):
    return m.group(1) + m.group(2) + (m.group(3) or '') + m.group(4) + '} <button onClick={() => reprintJob(job)} className="text-white bg-gray-500 hover:bg-gray-600 px-2 py-1 rounded text-xs font-medium ml-2" title="พิมพ์เอกสารย้อนหลัง">พิมพ์</button> ' + m.group(5)

# wait actually there's a simpler way.
# find `)} </td> </tr>`
# and replace it.

pattern2 = re.compile(r'(<td className="px-6 py-4 whitespace-nowrap text-center space-x-2">.*?)}?(\s*</td>\s*</tr>)', re.DOTALL)
# wait, there's `)}` before `</td>`. Let's just find the `</td>` of that specific column.
