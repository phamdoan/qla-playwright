import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

/**
 * Hồ sơ môi trường → file .env.<hồ sơ> (vd. .env.staging chứa URL trang đăng nhập).
 * Chọn theo: BCTK_HO_SO → tên npm script (`npm run staging`, `npm run dev:ui`…) → mặc định staging.
 * Sau đó nạp .env (tài khoản BCTK_USER/BCTK_PASS) nhưng không ghi đè giá trị của file hồ sơ.
 */
const HO_SO =
  process.env.BCTK_HO_SO || /^(dev|staging|uat|preprod)(:|$)/.exec(process.env.npm_lifecycle_event || '')?.[1] || 'staging';
const FILE_HO_SO = path.resolve(__dirname, `.env.${HO_SO}`);
if (!fs.existsSync(FILE_HO_SO)) throw new Error(`Thiếu file ${FILE_HO_SO} cho hồ sơ môi trường "${HO_SO}"`);
dotenv.config({ path: FILE_HO_SO, override: true, quiet: true });
dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });

/**
 * Mốc thời gian của LẦN CHẠY này → tên file output (output/<lĩnh vực>/output-ma-vu-an-form-<mã>_<ngày>_<giờ>.xlsx).
 * Đặt ở tiến trình chính mỗi lần nạp config (trên UI: mỗi lần bấm chạy); worker (có TEST_WORKER_INDEX) giữ mốc kế thừa
 * từ tiến trình chính → mọi test của cùng một lần chạy ghi chung một file.
 */
if (!process.env.TEST_WORKER_INDEX) {
  process.env.BCTK_LAN_CHAY = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(' ', '_').replace(/:/g, '-');
  // Thư mục kết quả theo form đang chạy (vd. test-results/form-1A1): Playwright XÓA thư mục kết quả lúc bắt đầu chạy →
  // hai lệnh chạy song song chung một thư mục xóa trace, ảnh của nhau, lỗi lưu trace (ENOENT) làm phiên không đóng được,
  // phiên rò tích lại làm máy chậm hẳn (1A1 29/10: chạy cùng 5A, 6A). Không chỉ rõ form (UI, chạy cả bộ) → "chung".
  const cacForm = [...new Set(process.argv.join(' ').match(/form-[0-9A-Z]+/gi) ?? [])];
  process.env.BCTK_THU_MUC_KQ = cacForm.length ? cacForm.join('+') : 'chung';
}
const THU_MUC_KQ = process.env.BCTK_THU_MUC_KQ ?? 'chung';

if (!process.env.URL) throw new Error(`Thiếu biến URL (link trang đăng nhập) trong ${FILE_HO_SO}`);
/** Link trang đăng nhập của môi trường, vd. https://qla-stg.toaan.gov.vn/sso/login */
export const LOGIN_URL = process.env.URL.trim();
/** Gốc của môi trường suy từ LOGIN_URL, vd. https://qla-stg.toaan.gov.vn */
export const ORIGIN = new URL(LOGIN_URL).origin;
const env = HO_SO;

/**
 * Chặn cứng PRODUCTION: bộ kịch bản này tạo vụ án thật.
 * Pre-prod (e-qlta-uat) và production (e-qlta) chỉ lệch nhau 4 ký tự "-uat" nên khớp theo host.
 */
const HOST_PRODUCTION = ['e-qlta.toaan.gov.vn', 'qla.toaan.gov.vn'];
{
  let host = '';
  try {
    host = new URL(ORIGIN).host.toLowerCase();
  } catch {
    throw new Error(`URL trong .env.${env} không phải URL hợp lệ.`);
  }
  if (HOST_PRODUCTION.includes(host)) {
    throw new Error(`CHẶN: "${host}" là PRODUCTION, không được chạy bộ tạo dữ liệu vào đó.`);
  }
}

export const AUTH_FILE = path.resolve(__dirname, 'playwright/.auth/user.json');

/** Tùy chọn trình duyệt dùng chung — cả cho các phiên tự mở theo từng tài khoản trong luồng */
export const TUY_CHON_TRINH_DUYET = {
  baseURL: `${ORIGIN}/qla/`,
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
  viewport: { width: 1920, height: 1080 },
  ignoreHTTPSErrors: true,
};

/** Spec chạy luồng nhiều tài khoản: tự đăng nhập từng tài khoản, không dùng phiên của auth.setup */
const SPEC_LUONG = /[\\/]form-(1A|1A1|1B|1D1|2A|2C|2D|3A|5A|5B|5C|5D|6A|6B|6C|6D|10A|10B|10C|10E|10G|10H|10I|10K)[\\/].*\.spec\.ts$/;

export default defineConfig({
  testDir: './src/tests',
  // Mỗi vụ án tạo ra được ghi nối vào cùng một file output → chạy tuần tự cho an toàn
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // STG chậm: một bước có thể phải qua Dashboard vào lại link vài lần (mỗi lần ~30s) → 5 phút không đủ
  timeout: 600_000,
  expect: { timeout: 10_000 },
  outputDir: `test-results/${THU_MUC_KQ}`,
  reporter: [['html', { open: 'never', outputFolder: `playwright-report/${THU_MUC_KQ}` }], ['line']],
  use: {
    ...TUY_CHON_TRINH_DUYET,
    actionTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Đăng nhập một lần bằng BCTK_USER, lưu phiên vào AUTH_FILE cho các spec một tài khoản
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'luong',
      testMatch: SPEC_LUONG,
      // Không quay video: mỗi phiên tài khoản đều bị quay, đóng phiên phải chờ ghi xong video → máy bận (nhiều lượt song song)
      // thì đóng phiên treo tới hết giờ, test sau hỏng "Target … closed" (6C 30/10). Trace (có ảnh từng thao tác) đã đủ để dò lỗi.
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 }, video: 'off' },
    },
    {
      name: 'chromium',
      testMatch: /\.spec\.ts$/,
      testIgnore: SPEC_LUONG,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 }, storageState: AUTH_FILE },
      dependencies: ['setup'],
    },
  ],
});
