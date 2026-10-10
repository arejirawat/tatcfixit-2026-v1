import sys
content = open('src/components/AdminPanel.tsx', 'r', encoding='utf-8').read()
content = content.replace(
    "method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ jobId, status: 'CANCELLED' })",
    "method: 'PUT',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ jobId, status: 'CANCELLED' })"
)
content = content.replace(
    "method: 'POST',\r\n          headers: { 'Content-Type': 'application/json' },\r\n          body: JSON.stringify({ jobId, status: 'CANCELLED' })",
    "method: 'PUT',\r\n          headers: { 'Content-Type': 'application/json' },\r\n          body: JSON.stringify({ jobId, status: 'CANCELLED' })"
)
open('src/components/AdminPanel.tsx', 'w', encoding='utf-8').write(content)
