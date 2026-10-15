import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

/** Môi trường chạy: stg (mặc định) | dev | uat | preprod | local, hoặc truyền thẳng URL qua BCTK_ENV */
const MOI_TRUONG: Record<string, string> = {
  stg: 'https://qla-stg.toaan.gov.vn',
  dev: 'https://qla-dev.toaan.gov.vn',
  uat: 'https://qla-uat.toaan.gov.vn',
  preprod: 'https://e-qlta-uat.toaan.gov.vn',
  local: 'http://localhost:8000',
};
const env = process.env.BCTK_ENV || 'stg';
export const ORIGIN = MOI_TRUONG[env] || env;

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
    throw new Error(`BCTK_ENV="${env}" không phải tên môi trường đã biết, cũng không phải URL hợp lệ.`);
  }
  if (HOST_PRODUCTION.includes(host)) {
    throw new Error(`CHẶN: "${host}" là PRODUCTION, không được chạy bộ tạo dữ liệu vào đó.`);
  }
}

export const AUTH_FILE = path.resolve(__dirname, 'playwright/.auth/user.json');

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
    baseURL: `${ORIGIN}/qla/`,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    actionTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Đăng nhập SSO một lần, lưu phiên vào AUTH_FILE cho các spec dùng lại
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      testMatch: /\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 }, storageState: AUTH_FILE },
      dependencies: ['setup'],
    },
  ],
});
