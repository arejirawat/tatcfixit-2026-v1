const fs = require('fs');
let c = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

c = c.replace(
    /const cancelJob = async \([\s\S]*?body: JSON.stringify\(\{ jobId, status: 'CANCELLED' \}\)\n\s*\}\);/,
    match => match.replace("method: 'POST'", "method: 'PUT'")
);

fs.writeFileSync('src/components/AdminPanel.tsx', c, 'utf8');
