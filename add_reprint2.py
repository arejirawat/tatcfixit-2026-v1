import sys
content = open('src/app/dashboard/page.tsx', 'r', encoding='utf-8').read()

target = """                                  </>
                                )}
                              </td>"""

btn_code = """                                  </>
                                )}
                                <button onClick={() => reprintJob(job)} className="text-white bg-gray-500 hover:bg-gray-600 px-2 py-1 rounded text-xs font-medium ml-2" title="พิมพ์เอกสารย้อนหลัง">พิมพ์</button>
                              </td>"""

content = content.replace(target, btn_code)

open('src/app/dashboard/page.tsx', 'w', encoding='utf-8').write(content)
