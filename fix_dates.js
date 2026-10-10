const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

// 1. Update submitJob (the block after fetch('/api/jobs', method: 'POST'))
c = c.replace(
  "setCustomerData({ ...customerData, jobId: data.job.jobId });",
  "setCustomerData({ ...customerData, jobId: data.job.jobId, createdAt: data.job.createdAt });"
);

// 2. Update reprintJob
c = c.replace(
  "jobId: job.jobId,",
  "jobId: job.jobId,\n        createdAt: job.createdAt,"
);

// 3. Update Step 4 date usages
c = c.replace(
  "{new Date().toLocaleDateString('th-TH')}",
  "{(customerData?.createdAt ? new Date(customerData.createdAt) : new Date()).toLocaleDateString('th-TH')}"
);
c = c.replace(
  "{new Date().toLocaleDateString('th-TH')}",
  "{(customerData?.createdAt ? new Date(customerData.createdAt) : new Date()).toLocaleDateString('th-TH')}"
);

// For the time, we should also use createdAt
c = c.replace(
  "{new Date().toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}",
  "{(customerData?.createdAt ? new Date(customerData.createdAt) : new Date()).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}"
);


fs.writeFileSync('src/app/dashboard/page.tsx', c, 'utf8');
