// แสดงเลขเวอร์ชันของโปรแกรม (ค่าถูกฝังตอนเปิด server จาก next.config.ts)
// ตัวอย่าง: v1.1.0 · a1b2c3d · 06/11/2026   (มี * ต่อท้ายรหัส = มีการแก้ไขในเครื่องที่ยังไม่ commit)
export default function AppVersion({ className = '' }: { className?: string }) {
  const version = process.env.APP_VERSION;
  const commit = process.env.APP_COMMIT;
  const date = process.env.APP_COMMIT_DATE;

  const parts = [`v${version}`];
  if (commit) parts.push(commit);
  if (date) parts.push(date);

  return (
    <span
      className={`font-mono ${className}`}
      title="เลขเวอร์ชัน · รหัส commit · วันที่ของโค้ด (มี * = มีการแก้ไขที่ยังไม่ commit)"
    >
      {parts.join(' · ')}
    </span>
  );
}
