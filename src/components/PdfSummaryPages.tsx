// หน้ารายงานสรุป (PDF สำหรับนำเสนอ) — แต่ละหน้าขนาด A4 พอดี (794 x 1123 px ที่ 96 dpi)
// ถูกแปลงเป็นรูป JPEG ทีละหน้าแล้วรวมเป็น PDF (ใช้การวาดของเบราว์เซอร์ ภาษาไทย/วรรณยุกต์จึงแสดงถูกต้อง)
// ตารางชนิดงานแบ่ง 2 คอลัมน์ ถ้ามีมากเกินหน้าแรกจะต่อหน้าถัดไปอัตโนมัติ

import type { CSSProperties } from 'react';

export type PdfSummaryData = {
  centerName: string;
  periodLabel: string;
  printedAt: string;
  version: string;
  total: number;
  fixed: number;
  unrepairable: number;
  inProgress: number;
  returned: number;
  customers: number;
  categories: [string, number][];
};

export const PDF_PAGE_W = 794;
export const PDF_PAGE_H = 1123;
const ROW_H = 22;
const FIRST_PAGE_ROWS_PER_COL = 26; // หน้าแรกมีส่วนหัว + ตัวเลขสรุป
const NEXT_PAGE_ROWS_PER_COL = 40;

const C = {
  ink: '#0f172a',
  sub: '#64748b',
  line: '#e2e8f0',
  soft: '#f8fafc',
  accent: '#4f46e5',
  green: '#16a34a',
  red: '#dc2626',
  amber: '#d97706',
};
const FONT = "'Leelawadee UI', 'Segoe UI', Tahoma, sans-serif";

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
// ข้อความเปอร์เซ็นต์ในตาราง: ค่าน้อยกว่า 1% แสดงเป็น "<1%" แทน "0%"
const pctText = (n: number, total: number) => (n > 0 && total > 0 && (n / total) * 100 < 1 ? '<1%' : `${pct(n, total)}%`);

// แบ่งรายการชนิดงานเป็นหน้า ๆ
export function paginateCategories(categories: [string, number][]) {
  const pages: [string, number][][] = [];
  let i = 0;
  let cap = FIRST_PAGE_ROWS_PER_COL * 2;
  do {
    pages.push(categories.slice(i, i + cap));
    i += cap;
    cap = NEXT_PAGE_ROWS_PER_COL * 2;
  } while (i < categories.length);
  return pages;
}

function Kpi({ label, value, color, note }: { label: string; value: number; color: string; note?: string }) {
  return (
    <div style={{ flex: 1, background: C.soft, borderRadius: 12, padding: '14px 16px', borderTop: `4px solid ${color}` }}>
      <div style={{ fontSize: 13, color: C.sub }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 700, color: C.ink, lineHeight: 1.15 }}>{value.toLocaleString('th-TH')}</div>
      <div style={{ fontSize: 12, color, fontWeight: 600, minHeight: 16 }}>{note || ''}</div>
    </div>
  );
}

function CategoryColumn({ rows, startRank, max, total }: { rows: [string, number][]; startRank: number; max: number; total: number }) {
  const cell: CSSProperties = { height: ROW_H, display: 'flex', alignItems: 'center', fontSize: 12.5, borderBottom: `1px solid ${C.line}` };
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ ...cell, height: 24, fontSize: 11, color: C.sub, fontWeight: 600, borderBottom: `1.5px solid ${C.ink}` }}>
        <span style={{ width: 26 }}>#</span>
        <span style={{ flex: 1 }}>ชนิดงาน</span>
        <span style={{ width: 70 }} />
        <span style={{ width: 36, textAlign: 'right' }}>งาน</span>
        <span style={{ width: 38, textAlign: 'right' }}>%</span>
      </div>
      {rows.map(([name, count], i) => (
        <div key={name} style={cell}>
          <span style={{ width: 26, color: C.sub, fontSize: 11 }}>{startRank + i}</span>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: C.ink, paddingRight: 6 }}>{name}</span>
          <span style={{ width: 70, paddingRight: 8 }}>
            <span style={{ display: 'block', height: 6, borderRadius: 3, background: C.line }}>
              <span style={{ display: 'block', height: 6, borderRadius: 3, background: C.accent, width: `${Math.max(4, (count / max) * 100)}%` }} />
            </span>
          </span>
          <span style={{ width: 36, textAlign: 'right', fontWeight: 700, color: C.ink }}>{count}</span>
          <span style={{ width: 38, textAlign: 'right', color: C.sub, fontSize: 11 }}>{pctText(count, total)}</span>
        </div>
      ))}
    </div>
  );
}

function Footer({ page, pages, version }: { page: number; pages: number; version: string }) {
  return (
    <div style={{ position: 'absolute', left: 40, right: 40, bottom: 26, display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: C.sub, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
      <span>FixIT Center · ระบบจัดการศูนย์ซ่อมสร้างเพื่อชุมชน · {version}</span>
      <span>หน้า {page} / {pages}</span>
    </div>
  );
}

export default function PdfSummaryPages({ data }: { data: PdfSummaryData }) {
  const pages = paginateCategories(data.categories);
  const max = data.categories[0]?.[1] || 1;
  const { total } = data;
  const page: CSSProperties = {
    width: PDF_PAGE_W, height: PDF_PAGE_H, background: '#ffffff', color: C.ink, fontFamily: FONT,
    position: 'relative', padding: '36px 40px', boxSizing: 'border-box', overflow: 'hidden',
  };

  // ลำดับแรกของแต่ละหน้า
  const pageStart = pages.map((_, p) => 1 + pages.slice(0, p).reduce((n, c) => n + c.length, 0));
  return (
    <>
      {pages.map((cats, p) => {
        const half = Math.ceil(cats.length / 2);
        const left = cats.slice(0, half);
        const right = cats.slice(half);
        const startLeft = pageStart[p];
        const startRight = pageStart[p] + left.length;
        return (
          <div key={p} data-pdf-page={p} style={page}>
            {p === 0 ? (
              <>
                {/* ส่วนหัว */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 16, borderBottom: `1px solid ${C.line}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/fixit_logo.jpg" alt="" style={{ height: 48, width: 48, objectFit: 'contain', borderRadius: 8 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.25 }}>รายงานสรุปผลการปฏิบัติงาน</div>
                    <div style={{ fontSize: 13.5, color: C.sub }}>{data.centerName} · ศูนย์ซ่อมสร้างเพื่อชุมชน (Fix IT Center)</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: C.sub, lineHeight: 1.6 }}>
                    <div style={{ color: C.ink, fontWeight: 600, fontSize: 13 }}>{data.periodLabel}</div>
                    <div>พิมพ์เมื่อ {data.printedAt}</div>
                  </div>
                </div>

                {/* ตัวเลขสรุป */}
                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <Kpi label="งานทั้งหมด" value={total} color={C.accent} note={`ผู้ใช้บริการ ${data.customers.toLocaleString('th-TH')} คน`} />
                  <Kpi label="ซ่อมสำเร็จ" value={data.fixed} color={C.green} note={`${pct(data.fixed, total)}% ของงานทั้งหมด`} />
                  <Kpi label="ซ่อมไม่ได้" value={data.unrepairable} color={C.red} note={`${pct(data.unrepairable, total)}%`} />
                  <Kpi label="กำลังดำเนินการ" value={data.inProgress} color={C.amber} note={`${pct(data.inProgress, total)}%`} />
                </div>

                {/* แถบสัดส่วนผลการซ่อม */}
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: C.line }}>
                    <div style={{ width: `${pct(data.fixed, total)}%`, background: C.green }} />
                    <div style={{ width: `${pct(data.unrepairable, total)}%`, background: C.red }} />
                    <div style={{ width: `${pct(data.inProgress, total)}%`, background: C.amber }} />
                  </div>
                  <div style={{ display: 'flex', gap: 18, marginTop: 8, fontSize: 11.5, color: C.sub }}>
                    <span><b style={{ color: C.green }}>●</b> ซ่อมสำเร็จ</span>
                    <span><b style={{ color: C.red }}>●</b> ซ่อมไม่ได้</span>
                    <span><b style={{ color: C.amber }}>●</b> กำลังดำเนินการ</span>
                    <span style={{ marginLeft: 'auto' }}>ส่งคืนลูกค้าแล้ว {data.returned.toLocaleString('th-TH')} งาน · {data.categories.length} ชนิดงาน</span>
                  </div>
                </div>

                <div style={{ marginTop: 22, marginBottom: 6, fontSize: 15, fontWeight: 700 }}>สรุปแยกตามชนิดงาน</div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 10, marginBottom: 6, borderBottom: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>สรุปแยกตามชนิดงาน (ต่อ)</div>
                <div style={{ fontSize: 12, color: C.sub }}>{data.centerName} · {data.periodLabel}</div>
              </div>
            )}

            {cats.length > 0 ? (
              <div style={{ display: 'flex', gap: 28 }}>
                <CategoryColumn rows={left} startRank={startLeft} max={max} total={total} />
                {right.length > 0 ? <CategoryColumn rows={right} startRank={startRight} max={max} total={total} /> : <div style={{ flex: 1 }} />}
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: C.sub, fontSize: 13 }}>ไม่มีข้อมูลในช่วงเวลาที่เลือก</div>
            )}

            <Footer page={p + 1} pages={pages.length} version={data.version} />
          </div>
        );
      })}
    </>
  );
}
