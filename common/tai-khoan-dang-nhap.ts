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

/**
 * MỖI MÔI TRƯỜNG MỘT BỘ TÀI KHOẢN RIÊNG, không gộp.
 *
 * Có `tai-khoan-dang-nhap.<env>.example.json` thì cặp tệp của môi trường đó THAY THẾ cặp tệp gốc,
 * chứ không chồng lên. Vì sao không gộp: bộ gốc là 23 tài khoản TANDTC, còn pre-prod là tài khoản
 * TAND tỉnh Bắc Ninh — người khác, đơn vị khác, vai khác. Gộp lại thì mỗi lượt chạy đều cố đăng
 * nhập 23 tài khoản không tồn tại ở môi trường đang chạy, và danh sách test đầy kết quả đỏ vô nghĩa.
 *
 * Tệp `.example.json` (COMMIT) vẫn là bộ khoá hợp lệ — gõ sai khoá ở tệp `.local.json` là báo lỗi
 * ngay, để tài khoản đó không lặng lẽ bị bỏ qua.
 */
const envHienTai = process.env.QLA_ENV || 'stg';
/** Cặp tệp (mẫu, local) của một bộ tài khoản; `goc` là tên tệp không đuôi, vd. 'tai-khoan-dang-nhap' */
const tepCua = (goc: string) => {
  const coHoSoRieng = fs.existsSync(path.join(THU_MUC, `${goc}.${envHienTai}.example.json`));
  const hauTo = coHoSoRieng ? `.${envHienTai}` : '';
  return { mau: `${goc}${hauTo}.example.json`, local: `${goc}${hauTo}.local.json` };
};

const docJson = (ten: string): HoSo => {
  const f = path.join(THU_MUC, ten);
  if (!fs.existsSync(f)) return {};
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    throw new Error(`Cấu hình ${f} không phải JSON hợp lệ: ${e}`);
  }
};

const boNho: Record<string, TaiKhoanDangNhap[]> = {};

/**
 * Các tài khoản đã khai đủ CCCD. Khoá nào còn trống cccd thì bỏ qua (chưa có tài khoản ở môi
 * trường này) — không throw, để test vẫn chạy được với phần đã khai.
 *
 * `goc` chọn bộ tài khoản: mặc định bộ đăng nhập; 'tai-khoan-quyen-gdt-tt' là bộ kiểm quyền GĐT/TT.
 */
export function dsTaiKhoanDangNhap(goc = 'tai-khoan-dang-nhap'): TaiKhoanDangNhap[] {
  if (boNho[goc]) return boNho[goc];
  const tep = tepCua(goc);
  const mau = docJson(tep.mau).taiKhoan || {};
  const local = docJson(tep.local).taiKhoan || {};

  // Khoá lạ ở file local = gõ sai tên khoá → báo ngay, nếu không tài khoản đó lặng lẽ không được chạy
  const laKhoa = Object.keys(local).filter((k) => !(k in mau));
  if (laKhoa.length) {
    throw new Error(`config/${tep.local} có khoá không khai trong ${tep.mau}: ${laKhoa.join(', ')}`);
  }

  return (boNho[goc] = Object.entries(mau)
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
    .filter((tk) => !!tk.cccd));
}

/**
 * Vì sao KHÔNG ném lỗi khi chưa khai tài khoản nào: hàm này gọi ở TẦNG MÔ-ĐUN của
 * `tests/dang-nhap/dang-nhap.spec.ts` (vòng `for` sinh test), nên ném ở đây là Playwright **không
 * nạp được spec đó** và `--list` trả về **0 test trong 0 tệp** — chết cả 255 test của mọi luồng
 * khác, chỉ vì thiếu một tệp cấu hình của riêng test đăng nhập.
 *
 * Đo 04/10/2026 khi dựng thư mục chạy pre-prod: thư mục mới chưa có
 * `config/tai-khoan-dang-nhap.local.json` thì toàn bộ danh sách test rỗng, mà thông báo lại nói về
 * test đăng nhập — sai hẳn chỗ cần sửa. Cùng một loại lỗi với `locCase` và `caseVuAnThuc`: cấu hình
 * thiếu của MỘT phần không được giết cả lượt chạy.
 *
 * Giờ `dsTaiKhoanDangNhap()` trả mảng rỗng, spec tự `test.skip` kèm lý do rõ ràng.
 */
export function lyDoThieuTaiKhoanDangNhap(goc = 'tai-khoan-dang-nhap'): string {
  const tep = tepCua(goc);
  return (
    `Chưa khai CCCD cho tài khoản nào: chép config/${tep.mau} thành config/${tep.local} rồi điền "cccd" ` +
    `(môi trường hiện tại: ${process.env.QLA_ENV || 'stg'}).`
  );
}

/** Session của từng tài khoản, tách theo môi trường (stg/dev/uat/preprod) để không dùng lẫn */
export const fileAuthDangNhap = (ma: string) =>
  path.resolve(__dirname, `../playwright/.auth/dang-nhap/${ma}.${process.env.QLA_ENV || 'stg'}.json`);
