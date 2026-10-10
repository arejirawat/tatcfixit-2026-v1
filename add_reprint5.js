const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
c = c.replace(/<\/button>\s*}\)\s*<\/>\s*}\)\s*(<\/td>)/, 
  `</button>
                                    )}
                                  </>
                                )}
                                <button onClick={() => reprintJob(job)} className="text-white bg-gray-500 hover:bg-gray-600 px-2 py-1 rounded text-xs font-medium ml-1 mt-1 sm:mt-0" title="พิมพ์เอกสารย้อนหลัง">พิมพ์</button>
                              $1`);
fs.writeFileSync('src/app/dashboard/page.tsx', c, 'utf8');
