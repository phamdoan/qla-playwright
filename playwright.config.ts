import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Biến môi trường (không commit): QLA_ENV, QLA_LOGIN_USER, QLA_<VAI>_USER...
// Chọn file theo lệnh npm: `npm run dev[:ui]` → .env.dev, `npm run staging[:ui]` → .env.staging; `npx playwright test` → .env
// (npm_lifecycle_event = tên script, worker kế thừa nên nạp cùng file)
// QLA_HO_SO_ENV: dùng khi gọi thẳng qua npx (npx ghi đè npm_lifecycle_event nên không tin được)
const HO_SO_ENV = process.env.QLA_HO_SO_ENV || /^(dev|staging|uat)(:|$)/.exec(process.env.npm_lifecycle_event || '')?.[1];
const FILE_ENV = path.resolve(__dirname, HO_SO_ENV ? `.env.${HO_SO_ENV}` : '.env');
// Thiếu file hồ sơ thì dừng, tránh lặng lẽ rơi về QLA_ENV mặc định (stg)
if (HO_SO_ENV && !fs.existsSync(FILE_ENV)) throw new Error(`Thiếu ${FILE_ENV} cho "npm run ${process.env.npm_lifecycle_event}"`);
// override: UI mode giữ process.env của lần nạp trước, không override thì sửa file env không có tác dụng
dotenv.config({ path: FILE_ENV, override: true });

/**
 * Môi trường chạy test: stg (mặc định) | dev | uat | local.
 * local = FE đang chạy trên máy (vd. `npm start` ở qla-webapp, cổng 8000) để thử thay đổi FE
 * (thêm data-testid/class cho ô khó lấy) mà không phải chờ deploy: set QLA_ENV=local.
 * QLA_ENV cũng nhận thẳng một URL, vd. QLA_ENV=http://localhost:3000.
 */
const MOI_TRUONG: Record<string, string> = {
  stg: 'https://qla-stg.toaan.gov.vn',
  dev: 'https://qla-dev.toaan.gov.vn',
  uat: 'https://qla-uat.toaan.gov.vn',
  local: 'http://localhost:8000',
};
const env = process.env.QLA_ENV || 'stg';
export const ORIGIN = MOI_TRUONG[env] || env; // cho phép truyền thẳng URL
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
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    // Click/gõ bị chặn thì báo lỗi sau 30s thay vì treo tới hết timeout test
    actionTimeout: 30_000,
  },
  // chromium đứng đầu: UI mode (--ui) mặc định chỉ bật project đầu tiên
  projects: [
    {
      name: 'chromium',
      // Luồng "tài khoản mới" dùng session + tài khoản riêng → chạy ở project 'tai-khoan-moi', không chạy ở đây
      testIgnore: [/-tai-khoan-moi\.spec\.ts$/, /luong-gdt-tt-\d{2}-\d{2}-\d{4}(-[\w-]+)?\.spec\.ts$/, /mau-.*\.spec\.ts$/, /tao-don-khong-ocr-ban-an-excel\.spec\.ts$/, /don-khoi-kien-dan-su(-\d{2}-\d{2}-\d{4})?\.spec\.ts$/, /vu-an-hinh-su-so-tham\.spec\.ts$/, /don-hanh-chinh-so-tham\.spec\.ts$/, /kinh-doanh-thuong-mai.*\.spec\.ts$/],
      // viewport sau devices[...] để không bị ghi đè về 1280x720 (màn OCR có panel PDF bên phải, form rất hẹp)
      use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 900 }, storageState: AUTH_FILE },
      dependencies: ['setup'],
    },
    // Đăng nhập SSO một lần (QLA_LOGIN_USER), lưu cookie/localStorage vào AUTH_FILE
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    // Luồng "Thêm mới đơn theo bản án sơ thẩm" (Luông nhập data.txt): tài khoản QLA_TKM_USER,
    // session riêng để không ảnh hưởng các test cũ
    {
      name: 'tai-khoan-moi',
      testMatch: [/-tai-khoan-moi\.spec\.ts$/, /luong-gdt-tt-\d{2}-\d{2}-\d{4}(-[\w-]+)?\.spec\.ts$/, /mau-.*\.spec\.ts$/, /tao-don-khong-ocr-ban-an-excel\.spec\.ts$/, /don-khoi-kien-dan-su(-\d{2}-\d{2}-\d{4})?\.spec\.ts$/, /vu-an-hinh-su-so-tham\.spec\.ts$/, /don-hanh-chinh-so-tham\.spec\.ts$/, /kinh-doanh-thuong-mai.*\.spec\.ts$/],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 900 }, storageState: AUTH_FILE_TKM },
      dependencies: ['setup-tai-khoan-moi'],
    },
    { name: 'setup-tai-khoan-moi', testMatch: /tai-khoan-moi\.setup\.ts/ },
  ],
});
