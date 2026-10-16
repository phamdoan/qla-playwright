import fs from 'fs';
import path from 'path';
import type { TruongForm } from '../pages/base.page';
import { docBangExcel, docBangExcelSync, docKhoaGiaTriSync, ghiDongExcel } from './excel-helper';

const ROOT = path.resolve(__dirname, '../..');
export const OUTPUT_DIR = path.join(ROOT, 'output');
export const DATA_DIR = path.join(ROOT, 'src/data');

/** Lĩnh vực = tên thư mục cấp 1, dùng chung cho pages / tests / data / output */
export type LinhVuc = '1-hinh-su' | '2-dan-su';

export interface CaseData {
  id: string;
  moTa: string;
  /** Số vụ án tạo cho case này (BCTK_SO_LUONG trong .env ghi đè) */
  soLuong?: number;
  truong: TruongForm[];
}

export interface FormData {
  linhVuc: LinhVuc;
  bieuMau: string;
  tenBieuMau: string;
  cases: CaseData[];
}

/**
 * Đọc data của biểu mẫu: ưu tiên src/data/<linhVuc>/form-<bieuMau>.xlsx, không có thì .json.
 *
 * File Excel gồm:
 *   · sheet "Thông tin": Khóa | Giá trị — "Lĩnh vực", "Biểu mẫu", "Tên biểu mẫu"
 *   · sheet "Cases": Case | Mô tả | Số lượng | Nhãn trường | Loại | Giá trị — mỗi dòng một trường;
 *     các dòng tiếp theo của cùng case để trống Case/Mô tả/Số lượng
 */
export function docData(linhVuc: LinhVuc, bieuMau: string): FormData {
  const xlsx = path.join(DATA_DIR, linhVuc, `form-${bieuMau}.xlsx`);
  if (fs.existsSync(xlsx)) {
    const tt = docKhoaGiaTriSync(xlsx, 'Thông tin');
    const cases: CaseData[] = [];
    for (const d of docBangExcelSync(xlsx, 'Cases')) {
      if (d['Case']) cases.push({ id: d['Case'], moTa: d['Mô tả'], soLuong: Number(d['Số lượng']) || 1, truong: [] });
      const c = cases[cases.length - 1];
      if (!c) throw new Error(`${xlsx}: dòng đầu sheet "Cases" phải có cột Case`);
      if (d['Nhãn trường']) {
        c.truong.push({ nhan: d['Nhãn trường'], loai: (d['Loại'] || undefined) as TruongForm['loai'], giaTri: d['Giá trị'] });
      }
    }
    return { linhVuc: (tt['Lĩnh vực'] || linhVuc) as LinhVuc, bieuMau: tt['Biểu mẫu'] || bieuMau, tenBieuMau: tt['Tên biểu mẫu'], cases };
  }
  const file = path.join(DATA_DIR, linhVuc, `form-${bieuMau}.json`);
  if (!fs.existsSync(file)) throw new Error(`Không tìm thấy file data: ${xlsx} (hoặc .json)`);
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as FormData;
}

/** output/<linhVuc>/ma-vu-an-form-<bieuMau>.xlsx — tạo thư mục nếu chưa có */
export function fileOutput(linhVuc: LinhVuc, bieuMau: string): string {
  const dir = path.join(OUTPUT_DIR, linhVuc);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `ma-vu-an-form-${bieuMau}.xlsx`);
}

const thoiDiemHienTai = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

/** Ghi nối một mã vụ án vào file output của biểu mẫu (cột: Thời điểm | Case | Mã vụ án) */
export async function luuMaVuAn(linhVuc: LinhVuc, bieuMau: string, caseId: string, maVuAn: string) {
  await ghiDongExcel(fileOutput(linhVuc, bieuMau), ['Thời điểm', 'Case', 'Mã vụ án'], [[thoiDiemHienTai(), caseId, maVuAn]]);
}

/** Đọc file JSON trong src/data, vd. docJson('1-hinh-su/form-1B.json') */
export function docJson<T>(duongDan: string): T {
  const file = path.join(DATA_DIR, duongDan);
  if (!fs.existsSync(file)) throw new Error(`Không tìm thấy file: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
}

/**
 * Ghi nối một dòng nhiều cột vào output/<linhVuc>/ma-vu-an-form-<bieuMau>.xlsx.
 * File mới thì tạo kèm dòng tiêu đề ("Thời điểm" + `tieuDe`).
 */
export async function luuDongKetQua(linhVuc: LinhVuc, bieuMau: string, tieuDe: string[], giaTri: string[]) {
  await ghiDongExcel(fileOutput(linhVuc, bieuMau), ['Thời điểm', ...tieuDe], [[thoiDiemHienTai(), ...giaTri]]);
}

/** Đọc lại các mã vụ án đã lưu (cột "Mã vụ án", hoặc cột cuối nếu không có) */
export async function docMaVuAn(linhVuc: LinhVuc, bieuMau: string): Promise<string[]> {
  const file = fileOutput(linhVuc, bieuMau);
  if (!fs.existsSync(file)) return [];
  return (await docBangExcel(file)).map(d => d['Mã vụ án'] ?? Object.values(d).pop() ?? '').filter(Boolean);
}
