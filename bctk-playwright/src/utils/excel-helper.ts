import ExcelJS from 'exceljs';
import fs from 'fs';
import zlib from 'zlib';

/**
 * Ghi nối các dòng vào sheet đầu của file .xlsx — LUÔN ghi vào chính file này, không tạo file khác.
 * File chưa có (hoặc sheet trống) thì tạo kèm dòng tiêu đề in đậm, cố định dòng tiêu đề và bật lọc.
 *
 * File đang mở trong Excel thì Windows khóa (EBUSY) → chờ, cứ 5s thử lại (tối đa ~2 phút), mỗi lần đọc lại
 * file để không đè phần người dùng vừa sửa; hết giờ vẫn khóa thì báo lỗi (kèm nội dung dòng chưa ghi).
 * @param cotKhoa tên cột khóa (vd. "Mã vụ án"): đã có dòng cùng giá trị thì ghi đè dòng đó thay vì thêm dòng mới
 */
export async function ghiDongExcel(
  file: string,
  tieuDe: string[],
  cacDong: (string | number)[][],
  cotKhoa?: string,
  khoaKhac: string[] = [],
  SO_LAN = 24,
): Promise<string> {
  for (let lan = 1; ; lan++) {
    try {
      await ghiDongExcelMotLan(file, tieuDe, cacDong, cotKhoa, khoaKhac);
      return file;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EBUSY') throw e;
      if (lan >= SO_LAN) {
        throw new Error(
          `${file} đang mở trong Excel nên không ghi được kết quả (đã chờ ~2 phút). Đóng file rồi chạy lại bước này.\n` +
            `Dòng chưa ghi: ${cacDong.map(d => d.join(' | ')).join(' || ')}`,
        );
      }
      if (lan === 1) console.warn(`⚠ ${file} đang mở trong Excel — đóng file để ghi kết quả (đang chờ…)`);
      await new Promise(r => setTimeout(r, 5_000));
    }
  }
}

async function ghiDongExcelMotLan(file: string, tieuDe: string[], cacDong: (string | number)[][], cotKhoa?: string, khoaKhac: string[] = []) {
  const wb = new ExcelJS.Workbook();
  if (fs.existsSync(file)) await wb.xlsx.readFile(file);
  const sheet = wb.worksheets[0] ?? wb.addWorksheet('Vụ án');

  if (sheet.actualRowCount === 0) {
    const dau = sheet.addRow(tieuDe);
    dau.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    dau.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B1A1A' } };
    dau.alignment = { vertical: 'middle' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: tieuDe.length } };
    for (const d of cacDong) sheet.addRow(d);
  } else {
    // File đã có: ghi THEO TÊN CỘT (file cũ có thể khác thứ tự/thừa cột); cột mới chưa có thì thêm vào cuối
    const dauFile: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: true }, (o, cot) => (dauFile[cot] = String(o.value ?? '').trim()));
    for (const ten of tieuDe) {
      if (!dauFile.includes(ten)) {
        const cot = dauFile.length || 1;
        dauFile[cot] = ten;
        const o = sheet.getRow(1).getCell(cot);
        o.value = ten;
        o.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        o.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B1A1A' } };
      }
    }
    for (const d of cacDong) {
      // Có cột khóa và đã có dòng cùng giá trị khóa (hoặc một giá trị trong `khoaKhac`) → ghi đè dòng đó (theo tên cột), không thêm dòng mới
      const iKhoa = cotKhoa ? tieuDe.indexOf(cotKhoa) : -1;
      if (iKhoa >= 0) {
        const cot = dauFile.indexOf(cotKhoa!);
        const cacKhoa = [d[iKhoa], ...khoaKhac].map(v => String(v ?? '').trim()).filter(Boolean);
        let r = 2;
        while (r <= sheet.rowCount && !cacKhoa.includes(String(sheet.getRow(r).getCell(cot).value ?? '').trim())) r++;
        if (r <= sheet.rowCount) {
          tieuDe.forEach((ten, i) => (sheet.getRow(r).getCell(dauFile.indexOf(ten)).value = d[i] ?? ''));
          continue;
        }
      }
      const dong: (string | number)[] = [];
      tieuDe.forEach((ten, i) => (dong[dauFile.indexOf(ten) - 1] = d[i]));
      sheet.addRow(Array.from(dong, v => v ?? ''));
    }
  }

  sheet.columns.forEach(cot => {
    let rong = 10;
    cot.eachCell?.({ includeEmpty: false }, o => (rong = Math.max(rong, String(o.value ?? '').length + 2)));
    cot.width = Math.min(rong, 60);
  });

  await wb.xlsx.writeFile(file);
}

/**
 * Ghi một dòng vào sheet `tenSheet`: dòng có `soCotKhoa` cột đầu trùng với `dong` thì ghi đè, chưa có thì thêm.
 * Sheet đầu của file (sheet kết quả mà `ghiDongExcel` ghi nối) giữ nguyên vị trí — file mới thì tạo sẵn nó trống.
 * Không làm hỏng lượt chạy: file đang mở trong Excel thì thử lại ~30s rồi bỏ qua, chỉ cảnh báo → trả về false.
 */
export async function ghiDongTheoKhoa(
  file: string,
  tenSheet: string,
  tieuDe: string[],
  dong: (string | number)[],
  soCotKhoa = 1,
): Promise<boolean> {
  for (let lan = 1; ; lan++) {
    try {
      await ghiDongTheoKhoaMotLan(file, tenSheet, tieuDe, dong, soCotKhoa);
      return true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EBUSY') throw e;
      if (lan >= 6) {
        console.warn(`⚠ ${file} đang mở trong Excel — chưa ghi được sheet "${tenSheet}": ${dong.join(' | ')}`);
        return false;
      }
      await new Promise(r => setTimeout(r, 5_000));
    }
  }
}

async function ghiDongTheoKhoaMotLan(file: string, tenSheet: string, tieuDe: string[], dong: (string | number)[], soCotKhoa: number) {
  const wb = new ExcelJS.Workbook();
  if (fs.existsSync(file)) await wb.xlsx.readFile(file);
  if (!wb.worksheets.length) wb.addWorksheet('Vụ án');
  let sheet = wb.getWorksheet(tenSheet);
  if (!sheet) {
    sheet = wb.addWorksheet(tenSheet);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: tieuDe.length } };
  }
  const dau = sheet.getRow(1);
  dau.values = tieuDe;
  dau.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  dau.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B1A1A' } };

  const khoa = (vals: unknown[]) => vals.slice(0, soCotKhoa).map(v => String(v ?? '').trim()).join('\u0000');
  const can = khoa(dong);
  let r = 2;
  while (r <= sheet.rowCount && khoa(Array.from({ length: soCotKhoa }, (_, i) => sheet!.getRow(r).getCell(i + 1).value)) !== can) r++;
  sheet.getRow(r).values = dong;

  sheet.columns.forEach(cot => {
    let rong = 10;
    cot.eachCell?.({ includeEmpty: false }, o => (rong = Math.max(rong, String(o.value ?? '').length + 2)));
    cot.width = Math.min(rong, 60);
  });
  await wb.xlsx.writeFile(file);
}

/**
 * Xóa khỏi sheet đầu các dòng có cột `tenCot` bằng một trong `giaTri` (giữ dòng tiêu đề).
 * File đang mở trong Excel thì không xóa được → trả về false (không ném lỗi).
 */
export async function xoaDongExcel(file: string, tenCot: string, giaTri: string[]): Promise<boolean> {
  if (!fs.existsSync(file) || !giaTri.length) return true;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheet = wb.worksheets[0];
  if (!sheet) return true;
  let cot = 0;
  sheet.getRow(1).eachCell((o, i) => {
    if (String(o.value ?? '').replace(/\s+/g, ' ').trim() === tenCot) cot = i;
  });
  if (!cot) throw new Error(`${file}: không có cột "${tenCot}"`);
  const can = new Set(giaTri.map(g => g.trim()));
  for (let r = sheet.rowCount; r >= 2; r--) {
    if (can.has(String(sheet.getRow(r).getCell(cot).value ?? '').trim())) sheet.spliceRows(r, 1);
  }
  try {
    await wb.xlsx.writeFile(file);
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EBUSY') throw e;
    return false;
  }
}

export interface SheetMoi {
  ten: string;
  tieuDe: string[];
  dong: (string | number)[][];
  /** Độ rộng cột tối đa (mặc định 60) */
  rongToiDa?: number;
}

/** Tạo (ghi đè) file .xlsx nhiều sheet, mỗi sheet có dòng tiêu đề in đậm, ghim và bật lọc */
export async function taoFileExcel(file: string, cacSheet: SheetMoi[]) {
  const wb = new ExcelJS.Workbook();
  for (const s of cacSheet) {
    const sheet = wb.addWorksheet(s.ten);
    const dau = sheet.addRow(s.tieuDe);
    dau.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    dau.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B1A1A' } };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: s.tieuDe.length } };
    for (const d of s.dong) sheet.addRow(d);
    sheet.columns.forEach(cot => {
      let rong = 10;
      cot.eachCell?.({ includeEmpty: false }, o => (rong = Math.max(rong, String(o.value ?? '').length + 2)));
      cot.width = Math.min(rong, s.rongToiDa ?? 60);
      cot.alignment = { vertical: 'top', wrapText: true };
    });
  }
  await wb.xlsx.writeFile(file);
}

// ───────────── Đọc .xlsx ĐỒNG BỘ ─────────────
// Spec Playwright phải khai báo test đồng bộ lúc nạp file, mà exceljs chỉ đọc bất đồng bộ.
// File .xlsx là ZIP chứa XML → tự giải nén bằng zlib (có sẵn trong Node) rồi đọc ô.

function giaiNenZip(file: string): Map<string, Buffer> {
  const buf = fs.readFileSync(file);
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error(`${file} không phải file .xlsx hợp lệ`);
  const soMuc = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const ketQua = new Map<string, Buffer>();
  for (let i = 0; i < soMuc; i++) {
    const nen = buf.readUInt16LE(p + 10);
    const kichThuocNen = buf.readUInt32LE(p + 20);
    const doDaiTen = buf.readUInt16LE(p + 28);
    const doDaiPhu = buf.readUInt16LE(p + 30);
    const doDaiGhiChu = buf.readUInt16LE(p + 32);
    const viTriLocal = buf.readUInt32LE(p + 42);
    const ten = buf.toString('utf8', p + 46, p + 46 + doDaiTen);
    const batDau = viTriLocal + 30 + buf.readUInt16LE(viTriLocal + 26) + buf.readUInt16LE(viTriLocal + 28);
    const duLieu = buf.subarray(batDau, batDau + kichThuocNen);
    ketQua.set(ten, nen === 8 ? zlib.inflateRawSync(duLieu) : Buffer.from(duLieu));
    p += 46 + doDaiTen + doDaiPhu + doDaiGhiChu;
  }
  return ketQua;
}

const giaiMaXml = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
const chuTrongThe = (xml: string) => giaiMaXml([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m => m[1]).join(''));
const soCot = (ref: string) => [...ref.replace(/\d+/g, '')].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);

/** Các dòng của một sheet dạng mảng ô (chuỗi), theo tên sheet hoặc sheet đầu */
function docDongSync(file: string, tenSheet?: string): string[][] {
  if (!fs.existsSync(file)) throw new Error(`Không tìm thấy file Excel: ${file}`);
  const zip = giaiNenZip(file);
  const doc = (ten: string) => zip.get(ten)?.toString('utf8') ?? '';

  const chuoiChung = [...doc('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => chuTrongThe(m[1]));
  const sheets = [...doc('xl/workbook.xml').matchAll(/<sheet\b[^>]*?name="([^"]*)"[^>]*?r:id="([^"]*)"/g)].map(m => ({
    ten: giaiMaXml(m[1]),
    rId: m[2],
  }));
  const sheet = tenSheet ? sheets.find(s => s.ten === tenSheet) : sheets[0];
  if (!sheet) throw new Error(`${file} không có sheet "${tenSheet}" (đang có: ${sheets.map(s => s.ten).join(', ')})`);
  const dich = doc('xl/_rels/workbook.xml.rels').match(new RegExp(`Id="${sheet.rId}"[^>]*Target="([^"]*)"|Target="([^"]*)"[^>]*Id="${sheet.rId}"`));
  const duongDan = (dich?.[1] ?? dich?.[2] ?? '').replace(/^\/?(xl\/)?/, 'xl/');

  const dong: string[][] = [];
  for (const d of doc(duongDan).matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const o: string[] = [];
    for (const c of (d[1] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = c[1].match(/r="([A-Z]+\d+)"/)?.[1];
      if (!ref) continue;
      const kieu = c[1].match(/t="([^"]*)"/)?.[1];
      const v = c[2]?.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      o[soCot(ref) - 1] = (
        kieu === 's' ? chuoiChung[Number(v)] : kieu === 'inlineStr' ? chuTrongThe(c[2] ?? '') : giaiMaXml(v ?? '')
      ).trim();
    }
    dong.push(Array.from(o, x => x ?? ''));
  }
  return dong;
}

/** Như `docBangExcel` nhưng đồng bộ, chọn được sheet theo tên */
export function docBangExcelSync(file: string, tenSheet?: string): Record<string, string>[] {
  const [tieuDe = [], ...cacDong] = docDongSync(file, tenSheet);
  const khoa = tieuDe.map(t => t.replace(/\s+/g, ' ').trim());
  return cacDong
    .map(d => Object.fromEntries(khoa.map((k, i) => [k, d[i] ?? ''] as const).filter(([k]) => k)))
    .filter(b => Object.values(b).some(Boolean));
}

/** Sheet dạng hai cột "Khóa | Giá trị" → đối tượng { khóa: giá trị } */
export function docKhoaGiaTriSync(file: string, tenSheet: string): Record<string, string> {
  return Object.fromEntries(docBangExcelSync(file, tenSheet).map(d => [d['Khóa'], d['Giá trị'] ?? '']));
}

/**
 * Đọc sheet đầu của file .xlsx thành mảng bản ghi, khóa = tiêu đề cột ở dòng 1 (đã bỏ khoảng trắng thừa,
 * vd. "Tòa án " → "Tòa án"). Bỏ qua dòng trống.
 */
export async function docBangExcel(file: string): Promise<Record<string, string>[]> {
  if (!fs.existsSync(file)) throw new Error(`Không tìm thấy file Excel: ${file}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheet = wb.worksheets[0];
  if (!sheet) return [];

  const chuO = (v: ExcelJS.CellValue): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object' && 'richText' in v) return v.richText.map(r => r.text).join('').trim();
    if (typeof v === 'object' && 'text' in v) return String(v.text).trim();
    if (typeof v === 'object' && 'result' in v) return String(v.result ?? '').trim();
    if (v instanceof Date) return v.toLocaleDateString('vi-VN');
    return String(v).trim();
  };

  const tieuDe: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (o, cot) => (tieuDe[cot] = chuO(o.value).replace(/\s+/g, ' ').trim()));

  const ketQua: Record<string, string>[] = [];
  sheet.eachRow((dong, so) => {
    if (so === 1) return;
    const banGhi: Record<string, string> = {};
    dong.eachCell({ includeEmpty: true }, (o, cot) => {
      if (tieuDe[cot]) banGhi[tieuDe[cot]] = chuO(o.value);
    });
    if (Object.values(banGhi).some(Boolean)) ketQua.push(banGhi);
  });
  return ketQua;
}
