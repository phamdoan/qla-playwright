import fs from 'fs';
import path from 'path';
import type { LinhVuc } from './file-helper';

/**
 * Trạng thái của MỘT vụ án trong một luồng nhiều bước: state/<linhVuc>/form-<bieuMau>/<mã vụ án>.json
 *
 * Mỗi bước là một test riêng (chạy riêng được trên Playwright UI). Bước sau đọc dữ liệu bước trước để lại
 * từ file này (tên vụ án, URL vụ phúc thẩm, chủ tọa…), nên debug một bước không cần chạy lại các bước trước.
 */
const ROOT = path.resolve(__dirname, '../..');

export interface TrangThaiChung {
  /** Số thứ tự bước lớn nhất đã chạy xong */
  buocXong?: number;
  /** Bước lặp nhiều lượt: số lượt đã xong theo số bước, vd. { "3": 2 } */
  lanXong?: Record<number, number>;
  /** Thời điểm bắt đầu vụ này — cùng tên ô ("Đơn 01") để phân biệt các vụ nối tiếp nhau trong sheet "Tiến độ" */
  batDau?: string;
  /** Thời điểm ghi gần nhất */
  capNhat?: string;
}

const fileTrangThai = (linhVuc: LinhVuc, bieuMau: string, maVuAn: string) =>
  path.join(ROOT, 'state', linhVuc, `form-${bieuMau}`, `${maVuAn}.json`);

export function docTrangThai<T extends TrangThaiChung>(linhVuc: LinhVuc, bieuMau: string, maVuAn: string): T {
  const file = fileTrangThai(linhVuc, bieuMau, maVuAn);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf-8')) as T) : ({} as T);
}

/** Xóa trạng thái (bắt đầu lại từ đầu) */
export function xoaTrangThai(linhVuc: LinhVuc, bieuMau: string, maVuAn: string) {
  fs.rmSync(fileTrangThai(linhVuc, bieuMau, maVuAn), { force: true });
}

/**
 * Cất trạng thái sang state/_cu/<lĩnh vực>/form-<mã>/<mã vụ án> <lần chạy>.json (không xóa hẳn — cần thì chép về lại).
 * Trả về đường dẫn file đã cất, hoặc undefined nếu chưa có trạng thái.
 */
export function catTrangThai(linhVuc: LinhVuc, bieuMau: string, maVuAn: string) {
  const file = fileTrangThai(linhVuc, bieuMau, maVuAn);
  if (!fs.existsSync(file)) return;
  const lanChay = process.env.BCTK_LAN_CHAY || new Date().toISOString().replace(/[:.]/g, '-');
  const dich = path.join(ROOT, 'state', '_cu', linhVuc, `form-${bieuMau}`, `${maVuAn} ${lanChay}.json`);
  fs.mkdirSync(path.dirname(dich), { recursive: true });
  fs.renameSync(file, dich);
  return dich;
}

/** Gộp `thayDoi` vào trạng thái đang có rồi ghi lại */
export function ghiTrangThai<T extends TrangThaiChung>(linhVuc: LinhVuc, bieuMau: string, maVuAn: string, thayDoi: Partial<T>): T {
  const file = fileTrangThai(linhVuc, bieuMau, maVuAn);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const moi = {
    ...docTrangThai<T>(linhVuc, bieuMau, maVuAn),
    ...thayDoi,
    capNhat: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }),
  };
  fs.writeFileSync(file, JSON.stringify(moi, null, 2), 'utf-8');
  return moi;
}
