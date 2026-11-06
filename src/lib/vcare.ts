// ข้อมูลและการแปลงสำหรับส่งข้อมูลเข้า OVEC V-Care
// โครงสร้างคอลัมน์ต้องตรงกับ vcare_fields.py (สคริปต์กรอกอัตโนมัติ) — หากหน้าเว็บ V-Care เปลี่ยน ให้แก้ทั้งสองที่

export type VcareServiceCode = 'APPLIANCE' | 'MOTORCYCLE' | 'CAR' | 'TOOL' | 'HOME_ELEC';

export type VcareJob = {
  jobId: string;
  status: string;
  createdAt: string | Date;
  itemDetail?: string | null;
  symptoms?: string | null;
  repairNotes?: string | null;
  repairerName?: string | null;
  serviceType?: string | null;
  brandModel?: string | null;
  licensePlate?: string | null;
  partsUsed?: string | null;
  partsCost?: number | null;
  vcareExportedAt?: string | Date | null;
  category?: { name: string } | null;
  customer?: { name: string; phone?: string | null; address?: string | null } | null;
};

type Column = { header: string; width: number; value: (j: VcareJob, ctx: ExportContext) => string | number };
type ExportContext = { centerName: string };

export type VcareServiceType = {
  code: VcareServiceCode;
  label: string;   // ข้อความตัวเลือกบนเว็บ V-Care
  short: string;   // ชื่อสั้นสำหรับแสดงในหน้า FixIT
  sheet: string;   // ชื่อชีตใน Excel (ตรงกับ vcare_fields.py)
  fields: Column[];
};

const detail = (j: VcareJob) => (j.brandModel || j.itemDetail || '').trim();
const workDone = (j: VcareJob) => (j.repairNotes || j.symptoms || '').trim();

export const VCARE_SERVICE_TYPES: VcareServiceType[] = [
  {
    code: 'APPLIANCE', label: '3. ตรวจเช็กและซ่อมเครื่องใช้ไฟฟ้า', short: 'เครื่องใช้ไฟฟ้า', sheet: '3.เครื่องใช้ไฟฟ้า',
    fields: [
      { header: 'ชนิดเครื่องใช้ไฟฟ้า', width: 24, value: j => j.category?.name || 'เครื่องใช้ไฟฟ้า' },
      { header: 'ยี่ห้อ / รุ่น', width: 24, value: detail },
      { header: 'อาการเสีย / สาเหตุ', width: 30, value: j => j.symptoms || '' },
      { header: 'อะไหล่ที่เปลี่ยน', width: 24, value: j => j.partsUsed || '' },
      { header: 'ค่าใช้จ่าย (บาท)', width: 14, value: j => j.partsCost ?? 0 },
    ],
  },
  {
    code: 'MOTORCYCLE', label: '4. ตรวจเช็กและซ่อมรถจักรยานยนต์', short: 'รถจักรยานยนต์', sheet: '4.รถจักรยานยนต์',
    fields: [
      { header: 'ทะเบียนรถ / จังหวัด', width: 24, value: j => j.licensePlate || '' },
      { header: 'ยี่ห้อ / รุ่น', width: 24, value: detail },
      { header: 'รายการบริการซ่อม', width: 36, value: workDone },
    ],
  },
  {
    code: 'CAR', label: '5. ตรวจเช็กรถยนต์', short: 'รถยนต์', sheet: '5.รถยนต์',
    fields: [
      { header: 'ทะเบียนรถ / จังหวัด', width: 24, value: j => j.licensePlate || '' },
      { header: 'ระดับน้ำท่วม', width: 22, value: () => '' },
      { header: 'การแก้ไขเบื้องต้น / ข้อแนะนำ', width: 36, value: j => [workDone(j), detail(j) && `รถ: ${detail(j)}`].filter(Boolean).join(' / ') },
    ],
  },
  {
    code: 'TOOL', label: '6. ตรวจเช็กและซ่อมเครื่องมือประกอบอาชีพ', short: 'เครื่องมือประกอบอาชีพ', sheet: '6.เครื่องมือประกอบอาชีพ',
    fields: [
      { header: 'ชนิดเครื่องมือประกอบอาชีพ', width: 26, value: j => [j.category?.name, detail(j)].filter(Boolean).join(' ') },
      { header: 'อาการเสีย', width: 30, value: j => j.symptoms || '' },
    ],
  },
  {
    code: 'HOME_ELEC', label: '7. ตรวจเช็กระบบไฟฟ้าเบื้องต้น', short: 'ระบบไฟฟ้าเบื้องต้น', sheet: '7.ระบบไฟฟ้าเบื้องต้น',
    fields: [
      { header: 'รหัสหม้อไฟ / PEA Meter', width: 22, value: () => '' },
      { header: 'สถานะความปลอดภัย', width: 24, value: () => '' },
    ],
  },
];

export const VCARE_DEFAULT_TYPE: VcareServiceCode = 'APPLIANCE';

export const getServiceType = (code?: string | null) =>
  VCARE_SERVICE_TYPES.find(t => t.code === code);

// เดาประเภทบริการจากชนิดสิ่งของ/รายละเอียด (ผู้ใช้แก้ได้ที่หน้ารับงาน)
export function guessServiceType(catName: string, itemDetail = ''): VcareServiceCode {
  const text = `${catName} ${itemDetail}`.toLowerCase();
  if (/จักรยานยนต์|มอเตอร์ไซ|มอไซ|wave|scoopy|fino|click|pcx|aerox|spark|msx|เวฟ|ฟีโน่|คลิก/i.test(text)) return 'MOTORCYCLE';
  if (/รถยนต์|กระบะ|เก๋ง|d-max|hilux|vigo|revo|yaris|vios|city|civic/i.test(text)) return 'CAR';
  if (/เครื่องมือ|ตัดหญ้า|เลื่อย|ปั๊ม|สว่าน|กบไส|เครื่องเชื่อม|พ่นยา|หินเจียร|ตู้เชื่อม|robin|makita|bosch/i.test(text)) return 'TOOL';
  if (/ระบบไฟฟ้า|ตู้ไฟ|เบรกเกอร์|มิเตอร์|หม้อไฟ/i.test(text)) return 'HOME_ELEC';
  return 'APPLIANCE';
}

export const isVehicle = (code?: string | null) => code === 'MOTORCYCLE' || code === 'CAR';

// งานที่ "ปิดแล้ว" (ช่างสรุปผลแล้ว) เท่านั้นที่ส่งเข้า V-Care เพื่อไม่ต้องตามไปแก้สถานะในเว็บภายหลัง
const CLOSED = ['FIXED', 'UNREPAIRABLE', 'RETURNED', 'RETURNED_FIXED', 'RETURNED_UNREPAIRABLE'];
export const isClosedJob = (status: string) => CLOSED.includes(status);
export const isPendingVcare = (j: VcareJob) => isClosedJob(j.status) && !j.vcareExportedAt;

const VCARE_STATUS_DONE = 'เสร็จสิ้น (Completed)';

// วันที่ปฏิบัติงาน = วันที่รับงาน (รูปแบบ วัน/เดือน/ปี พ.ศ. ตามเวลาประเทศไทย)
export function workDateThai(d: string | Date): string {
  const date = new Date(d);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric' })
    .formatToParts(date);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return `${get('day')}/${get('month')}/${Number(get('year')) + 543}`;
}

export type VcareSheet = { name: string; headers: string[]; widths: number[]; rows: (string | number)[][] };

// สร้างข้อมูลแต่ละชีต (1 ชีตต่อ 1 ประเภทบริการ) ตามคอลัมน์ของ vcare_fields.py:
// ลำดับ | วันที่ปฏิบัติงาน | ชื่อ | เบอร์โทร | ที่อยู่ | จุดบริการ | <ช่องเฉพาะประเภท> | สถานะงาน
export function buildVcareSheets(jobs: VcareJob[], ctx: ExportContext): VcareSheet[] {
  const sheets: VcareSheet[] = [];
  for (const st of VCARE_SERVICE_TYPES) {
    const list = jobs.filter(j => (getServiceType(j.serviceType)?.code
      || guessServiceType(j.category?.name || '', j.itemDetail || '')) === st.code);
    if (list.length === 0) continue;
    const headers = ['ลำดับ', 'วันที่ปฏิบัติงาน', 'ชื่อ-นามสกุล ผู้รับบริการ', 'เบอร์โทรศัพท์ติดต่อ',
      'ที่อยู่ / พื้นที่ประสบภัย', 'จุดบริการ / ศูนย์อาชีวะอาสา', ...st.fields.map(f => f.header), 'สถานะงาน'];
    const widths = [8, 16, 26, 16, 32, 28, ...st.fields.map(f => f.width), 24];
    const rows = list.map((j, i) => [
      i + 1,
      workDateThai(j.createdAt),
      j.customer?.name || '',
      j.customer?.phone || '',
      j.customer?.address || '',
      ctx.centerName,
      ...st.fields.map(f => f.value(j, ctx)),
      VCARE_STATUS_DONE,
    ]);
    sheets.push({ name: st.sheet, headers, widths, rows });
  }
  return sheets;
}
