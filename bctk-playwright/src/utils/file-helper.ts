import fs from 'fs';
import path from 'path';
import type { TruongForm } from '../pages/base.page';

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

/** Đọc src/data/<linhVuc>/form-<bieuMau>.json */
export function docData(linhVuc: LinhVuc, bieuMau: string): FormData {
  const file = path.join(DATA_DIR, linhVuc, `form-${bieuMau}.json`);
  if (!fs.existsSync(file)) throw new Error(`Không tìm thấy file data: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as FormData;
}

/** output/<linhVuc>/ma-vu-an-form-<bieuMau>.txt — tạo thư mục nếu chưa có */
export function fileOutput(linhVuc: LinhVuc, bieuMau: string): string {
  const dir = path.join(OUTPUT_DIR, linhVuc);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `ma-vu-an-form-${bieuMau}.txt`);
}

/**
 * Ghi nối một mã vụ án vào file output của biểu mẫu.
 * Mỗi dòng: <thời điểm>\t<case id>\t<mã vụ án>
 */
export function luuMaVuAn(linhVuc: LinhVuc, bieuMau: string, caseId: string, maVuAn: string) {
  const thoiDiem = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  fs.appendFileSync(fileOutput(linhVuc, bieuMau), `${thoiDiem}\t${caseId}\t${maVuAn}\n`, 'utf-8');
}

/** Đọc lại các mã vụ án đã lưu (bỏ dòng trống) */
export function docMaVuAn(linhVuc: LinhVuc, bieuMau: string): string[] {
  const file = fileOutput(linhVuc, bieuMau);
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf-8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(dong => dong.split('\t').pop()!);
}
