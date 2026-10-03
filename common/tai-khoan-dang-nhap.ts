/**
 * Danh sách tài khoản dùng cho test ĐĂNG NHẬP (tests/dang-nhap/dang-nhap.spec.ts).
 *
 * Hai tầng, gộp theo cùng khoá (giống common/cau-hinh-luong.ts):
 *   1. config/tai-khoan-dang-nhap.example.json  – commit được: tên + chức vụ, cccd để trống
 *   2. config/tai-khoan-dang-nhap.local.json    – KHÔNG commit: số CCCD thật (+ matKhau nếu khác mặc định)
 * Repo này public nên CCCD chỉ nằm ở tầng 2 (.gitignore: config/*.local.json).
 *
 * Mật khẩu mặc định Ta@<CCCD> (account.ts → matKhauMacDinh).
 */
import fs from 'fs';
import path from 'path';
import { matKhauMacDinh } from '../account';

export interface TaiKhoanDangNhap {
  /** Khoá trong JSON, dùng để đặt tên file session */
  ma: string;
  ten: string;
  chucVu: string;
  cccd: string;
  matKhau: string;
}

interface HoSo {
  taiKhoan?: Record<string, { ten?: string; chucVu?: string; cccd?: string; matKhau?: string }>;
}

const THU_MUC = path.resolve(__dirname, '../config');
const FILE_MAU = 'tai-khoan-dang-nhap.example.json';
const FILE_LOCAL = 'tai-khoan-dang-nhap.local.json';

const docJson = (ten: string): HoSo => {
  const f = path.join(THU_MUC, ten);
  if (!fs.existsSync(f)) return {};
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    throw new Error(`Cấu hình ${f} không phải JSON hợp lệ: ${e}`);
  }
};

let boNho: TaiKhoanDangNhap[] | undefined;

/**
 * Các tài khoản đã khai đủ CCCD. Khoá nào còn trống cccd thì bỏ qua (chưa có tài khoản ở môi
 * trường này) — không throw, để test vẫn chạy được với phần đã khai.
 */
export function dsTaiKhoanDangNhap(): TaiKhoanDangNhap[] {
  if (boNho) return boNho;
  const mau = docJson(FILE_MAU).taiKhoan || {};
  const local = docJson(FILE_LOCAL).taiKhoan || {};

  // Khoá lạ ở file local = gõ sai tên khoá → báo ngay, nếu không tài khoản đó lặng lẽ không được chạy
  const laKhoa = Object.keys(local).filter((k) => !(k in mau));
  if (laKhoa.length) {
    throw new Error(`config/${FILE_LOCAL} có khoá không khai trong ${FILE_MAU}: ${laKhoa.join(', ')}`);
  }

  boNho = Object.entries(mau)
    .map(([ma, m]) => {
      const l = local[ma] || {};
      const cccd = l.cccd || m.cccd || '';
      return {
        ma,
        ten: l.ten || m.ten || ma,
        chucVu: l.chucVu || m.chucVu || '',
        cccd,
        matKhau: l.matKhau || m.matKhau || (cccd ? matKhauMacDinh(cccd) : ''),
      };
    })
    .filter((tk) => !!tk.cccd);

  if (!boNho.length) {
    throw new Error(
      `Chưa khai CCCD cho tài khoản nào: chép config/${FILE_MAU} thành config/${FILE_LOCAL} rồi điền "cccd".`,
    );
  }
  return boNho;
}

/** Session của từng tài khoản, tách theo môi trường (stg/dev/uat/preprod) để không dùng lẫn */
export const fileAuthDangNhap = (ma: string) =>
  path.resolve(__dirname, `../playwright/.auth/dang-nhap/${ma}.${process.env.QLA_ENV || 'stg'}.json`);
