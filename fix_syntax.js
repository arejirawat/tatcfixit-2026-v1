const fs = require('fs');
let c = fs.readFileSync('src/components/StatsPanel.tsx', 'utf8');
c = c.replace(/\\`/g, '`');
c = c.replace(/\\\$/g, '$');
fs.writeFileSync('src/components/StatsPanel.tsx', c, 'utf8');
