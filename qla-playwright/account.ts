import path from 'path';

/** Mật khẩu mặc định của hệ thống: Ta@<user_login> */
export const matKhauMacDinh = (user: string) => `Ta@${user}`;

/** Session đã đăng nhập, dùng lại cho các test (tạo bởi tests/auth.setup.ts) */
export const AUTH_FILE = path.resolve(__dirname, 'playwright/.auth/user.json');

/** Tài khoản mặc định khai trong e2e/.env: QLA_LOGIN_USER, QLA_LOGIN_PASS (bỏ trống → Ta@<user>) */
export const credentials = () => {
  const user = process.env.QLA_LOGIN_USER;
  if (!user) return undefined;
  return { user, pass: process.env.QLA_LOGIN_PASS || matKhauMacDinh(user) };
};

/**
 * Các vai trong luồng xuyên suốt GĐT/TT (KỊCH BẢN DEMO CHI TIẾT GĐTTT).
 * Tài khoản khai trong e2e/.env: QLA_<VAI>_USER (số CCCD), QLA_<VAI>_PASS (bỏ trống → Ta@<CCCD>).
 */
export const VAI = {
  CANBO: 'Cán bộ HCTP',
  TRUONGPHONG: 'Trưởng phòng HCTP',
  CHANHVP: 'Chánh/Phó Văn phòng',
  CHANHAN: 'Chánh/Phó Chánh án',
  TTV: 'Thẩm tra viên',
  LANHDAOVU: 'Lãnh đạo Vụ GĐ, KT',
} as const;
export type Vai = keyof typeof VAI;
export const DS_VAI = Object.keys(VAI) as Vai[];

/** Session đã đăng nhập của từng vai */
export const authFileVai = (vai: Vai) => path.resolve(__dirname, `playwright/.auth/${vai.toLowerCase()}.json`);

export const credentialsVai = (vai: Vai) => {
  const user = process.env[`QLA_${vai}_USER`];
  if (!user) return undefined;
  return { user, pass: process.env[`QLA_${vai}_PASS`] || matKhauMacDinh(user) };
};

// ── Luồng "Thêm mới đơn theo bản án sơ thẩm" (Luông nhập data.txt) – tài khoản & cấu hình RIÊNG ──
// Biến môi trường mới, không dùng chung với QLA_LOGIN_* / QLA_<VAI>_* của các test cũ:
//   QLA_TKM_USER          số CCCD đăng nhập (dev và stg khai riêng trong .env.dev / .env.staging)
//   QLA_TKM_PASS          mật khẩu; bỏ trống → Ta@<CCCD>
//   QLA_TKM_CHO_PHEP_GHI  '1' → được phép bấm Lưu (tạo đơn thật). STG để trống ⇒ chỉ đọc.

/** Session riêng của tài khoản luồng này (không đụng AUTH_FILE của các test cũ) */
export const AUTH_FILE_TKM = path.resolve(__dirname, `playwright/.auth/tai-khoan-moi.${process.env.QLA_ENV || 'stg'}.json`);

export const credentialsTKM = () => {
  const user = process.env.QLA_TKM_USER;
  if (!user) return undefined;
  return { user, pass: process.env.QLA_TKM_PASS || matKhauMacDinh(user) };
};

/**
 * Môi trường hiện tại có cho phép test ghi dữ liệu nghiệp vụ không (mặc định: không).
 *
 * HAI NGUỒN, và `QLA_GHI_CLI` phải thắng:
 *   · `QLA_TKM_CHO_PHEP_GHI` — khai trong tệp `.env.<hồ sơ>`, tức mặc định của MÔI TRƯỜNG;
 *   · `QLA_GHI_CLI`          — do `tools/chay-ui.js --ghi` đặt, tức Ý ĐỊNH CỦA LƯỢT CHẠY.
 *
 * Vì sao cần biến thứ hai: `playwright.config.ts` nạp tệp env bằng `dotenv.config({ override: true })`,
 * nên giá trị trong tệp GHI ĐÈ biến mà `chay-ui.js` vừa đặt. `.env.preprod` có dòng
 * `QLA_TKM_CHO_PHEP_GHI=` (trống, để pre-prod mặc định chỉ đọc) → `--ghi` bị xoá sạch.
 *
 * Hậu quả đã xảy ra (đo 04/10/2026): `npm run don:preprod` in "ghi dữ liệu: CÓ (tạo đơn thật)" —
 * vì chay-ui.js in TRƯỚC khi dotenv ghi đè — rồi cả 6 test **bị bỏ qua** với lý do "Môi trường
 * không cho ghi dữ liệu". Log nói một đằng, hành vi một nẻo; đọc log thì tưởng đã chạy.
 *
 * `QLA_GHI_CLI` không có trong tệp env nào nên dotenv không chạm tới được.
 */
export const choPhepGhiTKM = () =>
  process.env.QLA_GHI_CLI === '1' || process.env.QLA_TKM_CHO_PHEP_GHI === '1';

/**
 * Các vai của luồng "Luồng nhập data.txt" (Bước 3–9). Tài khoản khai riêng, không dùng chung
 * với QLA_<VAI>_USER của luồng xuyên suốt cũ:
 *   QLA_TKM_USER      – cán bộ nhập đơn, lập tờ trình/thông báo (Nguyễn Thị Thu Hường)
 *   QLA_TKM_CVP_USER  – Chánh văn phòng, ký logic (Nguyễn Tường Linh)
 *   QLA_TKM_PCA_USER  – Phó Chánh án, phê duyệt (Nguyễn Hải Trâm)
 */
export const VAI_TKM = {
  CANBO: 'Cán bộ nhập đơn',
  CVP: 'Chánh văn phòng',
  PCA: 'Phó Chánh án',
  /** Chỉ dùng để XEM màn Quản lý vụ án GĐT (menu này HCTP/Văn phòng không có) */
  VU: 'Lãnh đạo Vụ GĐKT',
} as const;
export type VaiTKM = keyof typeof VAI_TKM;
/** Các vai cần đăng nhập sẵn cho Bước 6–9 (CANBO đã có AUTH_FILE_TKM riêng) */
export const DS_VAI_TKM: VaiTKM[] = ['CVP', 'PCA', 'VU'];

const bienVaiTKM = (vai: VaiTKM) => (vai === 'CANBO' ? 'QLA_TKM_USER' : `QLA_TKM_${vai}_USER`);

export const authFileVaiTKM = (vai: VaiTKM) =>
  path.resolve(__dirname, `playwright/.auth/tai-khoan-moi-${vai.toLowerCase()}.${process.env.QLA_ENV || 'stg'}.json`);

export const credentialsVaiTKM = (vai: VaiTKM) => {
  const user = process.env[bienVaiTKM(vai)];
  if (!user) return undefined;
  const pass = process.env[vai === 'CANBO' ? 'QLA_TKM_PASS' : `QLA_TKM_${vai}_PASS`];
  return { user, pass: pass || matKhauMacDinh(user) };
};
