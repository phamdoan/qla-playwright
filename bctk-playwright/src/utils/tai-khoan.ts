import path from 'path';
import { DATA_DIR } from './file-helper';
import { docBangExcel, docBangExcelSync } from './excel-helper';

export interface TaiKhoan {
  toaAn: string;
  taiKhoan: string;
  /** Họ tên người dùng — cần cho tài khoản được chọn làm người ký */
  ten?: string;
}

export const FILE_TAI_KHOAN = path.join(DATA_DIR, 'Tai-khoan', 'Taikhoan.xlsx');

/** So khớp tên tòa / tên người không phân biệt hoa thường và khoảng trắng */
export const chuanHoa = (s = '') => s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

/** Viện kiểm sát cùng địa bàn với tòa: "Tòa án nhân dân khu vực 9 - Hà Nội" → "Viện kiểm sát nhân dân khu vực 9 - Hà Nội" */
export const vksCuaToa = (toaAn: string) => toaAn.trim().replace(/^Tòa án nhân dân/i, 'Viện kiểm sát nhân dân');

/** Địa bàn (tỉnh/thành) của tòa: "Tòa án nhân dân khu vực 9 - Hà Nội" → "Hà Nội"; "Tòa án nhân dân thành phố Hà Nội" → "thành phố Hà Nội" */
export const diaBanCuaToa = (toaAn: string) =>
  toaAn.includes(' - ') ? toaAn.split(' - ').pop()!.trim() : toaAn.trim().replace(/^Tòa án nhân dân\s*/i, '');

/** Như `docTaiKhoan` nhưng đồng bộ (dùng khi khai báo test lúc nạp file spec) */
export function docTaiKhoanSync(file = FILE_TAI_KHOAN): TaiKhoan[] {
  return docBangExcelSync(file)
    .map(d => ({ toaAn: d['Tòa án'] ?? '', taiKhoan: d['Tài khoản'] ?? '', ten: d['Tên'] || undefined }))
    .filter(t => t.taiKhoan);
}

/** Đọc src/data/Tai-khoan/Taikhoan.xlsx (cột: Tòa án | Tài khoản | Tên) */
export async function docTaiKhoan(file = FILE_TAI_KHOAN): Promise<TaiKhoan[]> {
  return (await docBangExcel(file))
    .map(d => ({ toaAn: d['Tòa án'] ?? '', taiKhoan: d['Tài khoản'] ?? '', ten: d['Tên'] || undefined }))
    .filter(t => t.taiKhoan);
}

/**
 * Tài khoản thao tác của một tòa = dòng ĐẦU TIÊN của tòa đó trong Taikhoan.xlsx
 * (các dòng sau của cùng tòa dùng khi cần đúng người ký theo cột Tên).
 */
export function taiKhoanCuaToa(ds: TaiKhoan[], toaAn: string): TaiKhoan {
  const tk = ds.find(t => chuanHoa(t.toaAn) === chuanHoa(toaAn));
  if (!tk) throw new Error(`Taikhoan.xlsx chưa có tài khoản của "${toaAn}"`);
  return tk;
}

/** Tài khoản theo họ tên người dùng (cột "Tên") */
export function taiKhoanTheoTen(ds: TaiKhoan[], ten: string): TaiKhoan {
  const tk = ds.find(t => t.ten && chuanHoa(t.ten) === chuanHoa(ten));
  if (!tk) throw new Error(`Taikhoan.xlsx chưa có tài khoản của "${ten}" — thêm một dòng có cột Tên = "${ten}"`);
  return tk;
}
