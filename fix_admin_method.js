const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

c = c.replace(/method: 'PUT'/g, "method: 'POST'");

fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
