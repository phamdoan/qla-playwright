import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Biến môi trường (không commit): QLA_ENV, QLA_LOGIN_USER, QLA_<VAI>_USER...
// Chọn file theo lệnh npm: `npm run dev[:ui]` → .env.dev, `npm run staging[:ui]` → .env.staging; `npx playwright test` → .env
// (npm_lifecycle_event = tên script, worker kế thừa nên nạp cùng file)
// QLA_HO_SO_ENV: dùng khi gọi thẳng qua npx (npx ghi đè npm_lifecycle_event nên không tin được)
const HO_SO_ENV =
  process.env.QLA_HO_SO_ENV || /^(dev|staging|uat|preprod)(:|$)/.exec(process.env.npm_lifecycle_event || '')?.[1];
const FILE_ENV = path.resolve(__dirname, HO_SO_ENV ? `.env.${HO_SO_ENV}` : '.env');
// Thiếu file hồ sơ thì dừng, tránh lặng lẽ rơi về QLA_ENV mặc định (stg)
if (HO_SO_ENV && !fs.existsSync(FILE_ENV)) throw new Error(`Thiếu ${FILE_ENV} cho "npm run ${process.env.npm_lifecycle_event}"`);
// override: UI mode giữ process.env của lần nạp trước, không override thì sửa file env không có tác dụng
dotenv.config({ path: FILE_ENV, override: true });

/**
 * Môi trường chạy test: stg (mặc định) | dev | uat | preprod | local.
 * local = FE đang chạy trên máy (vd. `npm start` ở qla-webapp, cổng 8000) để thử thay đổi FE
 * (thêm data-testid/class cho ô khó lấy) mà không phải chờ deploy: set QLA_ENV=local.
 * QLA_ENV cũng nhận thẳng một URL, vd. QLA_ENV=http://localhost:3000.
 */
const MOI_TRUONG: Record<string, string> = {
  stg: 'https://qla-stg.toaan.gov.vn',
  dev: 'https://qla-dev.toaan.gov.vn',
  uat: 'https://qla-uat.toaan.gov.vn',
  // PRE-PROD của Tối cao; cùng cách bố trí đường dẫn (/qla, /sso) như các môi trường khác —
  // xác minh: qla-webapp/.env.pre-prod:12-19, qla/k8s/pre-prod/ingress.yaml:20-23
  preprod: 'https://e-qlta-uat.toaan.gov.vn',
  // Môi trường ĐÀO TẠO của Tối cao (kịch bản HCTP). Bản build tắt OCR (VITE_OCR_UPLOAD_DISABLED) —
  // đo 14/10/2026: bấm "Tải lên" là vào thẳng form, không có popup "Xác nhận xử lý OCR".
  daotao: 'https://e-qlta-daotao.toaan.gov.vn',
  local: 'http://localhost:8000',
};
const env = process.env.QLA_ENV || 'stg';
export const ORIGIN = MOI_TRUONG[env] || env; // cho phép truyền thẳng URL

/**
 * CỔNG CHẶN PRODUCTION — chặn cứng, không có cờ nào mở được.
 *
 * Vì sao cần: `ORIGIN` nhận THẲNG một URL khi `QLA_ENV` không khớp tên nào ở trên. Mà pre-prod của
 * Tối cao là `e-qlta-uat.toaan.gov.vn`, còn PRODUCTION là `e-qlta.toaan.gov.vn` — lệch đúng 4 ký tự
 * `-uat`. Gõ thiếu bốn ký tự đó, cộng với `--ghi`, là bộ kịch bản đi tạo đơn thật trên hệ thống
 * đang phục vụ các tòa. Repo này trước 04/10/2026 KHÔNG có cổng nào chặn (cổng cũ nằm ở
 * `tools/di-chuyen-bieu-mau`, một công cụ khác hẳn).
 *
 * Danh sách chặn khớp theo HOST, không theo chuỗi con, để `e-qlta-uat...` không bị chặn oan.
 */
const HOST_PRODUCTION = ['e-qlta.toaan.gov.vn', 'qla.toaan.gov.vn'];
{
  let host = '';
  try {
    host = new URL(ORIGIN).host.toLowerCase();
  } catch {
    throw new Error(`QLA_ENV="${env}" không phải tên môi trường đã biết, cũng không phải URL hợp lệ.`);
  }
  if (HOST_PRODUCTION.includes(host)) {
    throw new Error(
      `CHẶN: "${host}" là PRODUCTION. Bộ kịch bản này tạo/sửa dữ liệu thật nên không được trỏ vào đó.\n` +
        `Pre-prod là https://e-qlta-uat.toaan.gov.vn (QLA_ENV=preprod) — khác production đúng bốn ký tự "-uat".`,
    );
  }
}
import { AUTH_FILE, AUTH_FILE_TKM } from './account';

export default defineConfig({
  testDir: './tests',
  // Các spec GĐTTT có chuỗi dữ liệu (003 tạo đơn → 004 thụ lý → ...) nên chạy tuần tự theo thứ tự file
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['line']],
  // Chạy xong tự cập nhật báo cáo của đợt GĐT/TT (chỉ khi sổ cái của đợt vừa được ghi)
  globalTeardown: require.resolve('./common/bao-cao-sau-chay'),
  timeout: 300_000, // UAT chậm: mỗi màn tải 20–60s
  expect: { timeout: 10_000 },
  use: {
    baseURL: `${ORIGIN}/qla/`,
    trace: 'on-first-retry',
    /**
     * ẢNH CỠ THẬT (1920×1080) — bật bằng cờ `--anh` (QLA_ANH=1), không bật mặc định vì tốn đĩa.
     *
     * Hai thứ cùng bật theo cờ này:
     *   · `screenshot: 'on'` — ảnh cuối mỗi test do Playwright tự chụp;
     *   · ảnh RIÊNG TỪNG BƯỚC do khung chụp ngay sau khi bước xong, đặt tên theo MÃ BƯỚC
     *     (`khung/luong.ts` → `anh-buoc/<case>/<mã bước>.png`) — cái này mới dùng được để làm tư liệu.
     *
     * KHÔNG quay video: mỗi bước một .webm tốc độ thật nên 45 bước thành hàng GB và chậm hẳn; làm
     * video thì dựng từ ảnh (người dùng chốt 03/10/2026).
     *
     * Cũng KHÔNG rút khung hình từ trace: khung screencast trong trace bị thu nhỏ sẵn (~800px),
     * phóng to là vỡ.
     */
    screenshot: process.env.QLA_ANH === '1' ? 'on' : 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    // Click/gõ bị chặn thì báo lỗi sau 30s thay vì treo tới hết timeout test
    actionTimeout: 30_000,
  },
  // chromium đứng đầu: UI mode (--ui) mặc định chỉ bật project đầu tiên
  projects: [
    {
      name: 'chromium',
      // Mọi spec cũ đã chuyển ra backup 30/09/2026 (backup-e2e-20260930/cu-20260930/tests) nên
      // project này hiện KHÔNG còn spec nào — giữ lại làm chỗ cho spec dùng AUTH_FILE mặc định.
      // Khung FLOW/CASE/STEP chạy ở project 'tai-khoan-moi' (session riêng theo vai).
      testIgnore: [
        /kinh-doanh-thuong-mai.*\.spec\.ts$/,
        /[\\/]flows[\\/].*\.spec\.ts$/,
        // Spec đăng nhập tự mở phiên trắng, không dùng AUTH_FILE → chạy ở project 'dang-nhap'
        /[\\/]dang-nhap[\\/].*\.spec\.ts$/,
        // Spec "mở tay" (mở sẵn màn rồi page.pause) chạy ở project 'tai-khoan-moi' như các flow
        /mo-tay\.spec\.ts$/,
        // UT đối soát cũng tự mở phiên theo vai → chạy ở 'tai-khoan-moi'. Không loại ở đây thì
        // mỗi UT chạy HAI lần (chromium + tai-khoan-moi) và kéo theo cả lượt đăng nhập của 'setup'.
        /[\\/]ut-.*\.spec\.ts$/,
      ],
      // viewport sau devices[...] để không bị ghi đè về 1280x720 (màn OCR có panel PDF bên phải, form rất hẹp)
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 }, storageState: AUTH_FILE },
      dependencies: ['setup'],
    },
    // Đăng nhập SSO một lần (QLA_LOGIN_USER), lưu cookie/localStorage vào AUTH_FILE
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    // Khung FLOW/CASE/STEP: mọi bước của flow chạy ở đây. Mỗi bước tự mở phiên đúng vai
    // (khung/buoc.ts → moTrangVaiCauHinh), storageState dưới đây chỉ là session mặc định.
    {
      name: 'tai-khoan-moi',
      /**
       * Quy ước: mọi spec của khung FLOW/CASE/STEP nằm ở `tests/<phân hệ>/flows/*.spec.ts`.
       * Liệt kê từng phân hệ thì thêm luồng mới là quên sửa config rồi "No tests found"
       * (đo 01/10/2026 khi thêm luồng hình sự).
       */
      testMatch: [
        /kinh-doanh-thuong-mai.*\.spec\.ts$/,
        /[\\/]flows[\\/].*\.spec\.ts$/,
        // Spec "mở tay" của mọi phân hệ — dùng chung phiên theo vai như các flow
        /mo-tay\.spec\.ts$/,
        // UT đối soát (vd. tests/bao-cao-thong-ke/ut-mapping-man-hinh.spec.ts): KHÔNG nằm trong
        // `flows/` vì không gieo dữ liệu, chỉ mở màn và kiểm — nhưng cũng tự mở phiên theo vai.
        /[\\/]ut-.*\.spec\.ts$/,
      ],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 }, storageState: AUTH_FILE_TKM },
      // KHÔNG phụ thuộc 'setup-tai-khoan-moi': khung FLOW tự mở phiên theo vai
      // (khung/luong.ts → moTrangVaiCauHinh, mỗi vai một file auth riêng) nên 4 lần đăng nhập SSO
      // của project setup là thừa — đo 30/09/2026: 53s mỗi lượt chạy.
    },
    { name: 'setup-tai-khoan-moi', testMatch: /tai-khoan-moi\.setup\.ts/ },
    /**
     * Test đăng nhập từng tài khoản (`tests/dang-nhap/*.spec.ts`).
     * KHÔNG `storageState`, KHÔNG `dependencies`: mỗi test đăng nhập SSO từ phiên trắng — dùng lại
     * session của project setup thì test không còn chứng minh được tài khoản đó đăng nhập được.
     * Mỗi tài khoản một phiên riêng nên chạy song song được: thêm `--workers=4` để rút thời gian.
     */
    {
      name: 'dang-nhap',
      testMatch: [/[\\/]dang-nhap[\\/].*\.spec\.ts$/],
      fullyParallel: true,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
});
