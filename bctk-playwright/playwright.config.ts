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
const SPEC_LUONG = /[\\/]form-1B[\\/].*\.spec\.ts$/;

export default defineConfig({
  testDir: './src/tests',
  // Mỗi vụ án tạo ra được ghi nối vào cùng một file output → chạy tuần tự cho an toàn
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 300_000,
  expect: { timeout: 10_000 },
  reporter: [['html', { open: 'never' }], ['line']],
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
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
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
