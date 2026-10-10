const fs = require('fs');
let c = fs.readFileSync('Start_FixIT.bat', 'utf8');

c = c.replace(/IF NOT EXIST "node_modules\\"\s*\([\s\S]*?\)/, "echo INFO: Checking and updating system dependencies... (This may take a minute on first run)\ncall npm install\ncall npx prisma generate");

fs.writeFileSync('Start_FixIT.bat', c, 'utf8');
