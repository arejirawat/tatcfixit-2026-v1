const fs = require('fs');
let c = fs.readFileSync('src/app/technician/page.tsx', 'utf8');

c = c.replace('const [isOffline, setIsOffline] = useState(false);', 'const [isOffline, setIsOffline] = useState(false);\n  const [techList, setTechList] = useState<string[]>([]);');

c = c.replace('// Setup connection status listener', `// Load technicians list
    fetch('/api/technicians').then(res => res.json()).then(data => {
      if (data.success) {
        setTechList(data.technicians);
      }
    }).catch(console.error);

    // Setup connection status listener`);

c = c.replace(
`<input 
              type="text" 
              className="w-full px-3 py-2 border rounded-md text-black bg-gray-50 focus:bg-white"
              value={repairerName}
              onChange={(e) => setRepairerName(e.target.value)}
              placeholder="เช่น นายสมชาย สุขใจ"
              required
            />`,
`<input 
              type="text" 
              list="tech-list"
              className="w-full px-3 py-2 border rounded-md text-black bg-gray-50 focus:bg-white"
              value={repairerName}
              onChange={(e) => setRepairerName(e.target.value)}
              placeholder="เช่น นายสมชาย สุขใจ"
              required
            />
            <datalist id="tech-list">
              {techList.map((name, i) => (
                <option key={i} value={name} />
              ))}
            </datalist>`
);

fs.writeFileSync('src/app/technician/page.tsx', c, 'utf8');
