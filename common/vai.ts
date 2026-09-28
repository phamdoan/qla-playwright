import { Browser, BrowserContext, Page, TestInfo } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { VAI, Vai, authFileVai, credentialsVai } from '../account';
import { ghiNhanToast } from './antd';
import { loginSSO } from './login';

/**
 * Mở một "tab trình duyệt" riêng cho từng vai (context riêng, session riêng), giống kịch bản demo
 * mở sẵn nhiều tab cho các tài khoản. Session lấy từ tests/auth.setup.ts; hết hạn thì tự đăng nhập lại.
 */
/**
 * Vào /dashboard và chờ menu (lấy từ API) tải xong. Route được dựng từ menu nên nếu vào khi menu
 * chưa tải có thể gặp trang 404 "Không tìm thấy trang" → tải lại.
 */
export async function veTrangChu(page: Page) {
  for (let lan = 0; lan < 3; lan++) {
    await page.goto('dashboard');
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    if (/sso/.test(page.url())) return; // hết phiên → nơi gọi đăng nhập lại
    if (!(await page.getByText('Không tìm thấy trang').isVisible().catch(() => false))) return;
    await page.waitForTimeout(2_000);
  }
}

export async function moTrangVai(browser: Browser, testInfo: TestInfo, vai: Vai): Promise<{ page: Page; context: BrowserContext }> {
  const cred = credentialsVai(vai);
  if (!cred) throw new Error(`Thiếu QLA_${vai}_USER (${VAI[vai]}) trong e2e/.env`);
  const use = testInfo.project.use;
  const file = authFileVai(vai);
  const context = await browser.newContext({
    baseURL: use.baseURL,
    viewport: use.viewport ?? { width: 1600, height: 900 },
    locale: use.locale,
    timezoneId: use.timezoneId,
    ignoreHTTPSErrors: true,
    storageState: fs.existsSync(file) ? file : undefined,
  });
  context.setDefaultTimeout(use.actionTimeout || 30_000);
  const page = await context.newPage();
  await ghiNhanToast(page);
  await veTrangChu(page);
  if (/\/sso\//.test(page.url()) || /sso\.toaan\.gov\.vn/.test(page.url())) {
    await loginSSO(page, cred.user, { pass: cred.pass });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await context.storageState({ path: file });
  }
  return { page, context };
}

/**
 * Trạng thái dùng chung giữa các bước của luồng xuyên suốt (id đơn, mã đơn, vụ án...).
 * Lưu ra file để chạy lại từ bước bị lỗi mà không phải làm lại từ đầu.
 */
const FILE_TRANG_THAI = path.resolve(__dirname, '../.run-state.json');

export interface TrangThaiLuong {
  idDon?: string;
  maDon?: string;
  nguoiDungDon?: string;
  soBanAn?: string;
  ngayBanAn?: string;
  tenToa?: string;
  [k: string]: string | undefined;
}

export const docTrangThai = (): TrangThaiLuong =>
  fs.existsSync(FILE_TRANG_THAI) ? JSON.parse(fs.readFileSync(FILE_TRANG_THAI, 'utf8')) : {};

export function ghiTrangThai(them: TrangThaiLuong) {
  const moi = { ...docTrangThai(), ...them };
  fs.writeFileSync(FILE_TRANG_THAI, JSON.stringify(moi, null, 2));
  return moi;
}

export const xoaTrangThai = () => fs.existsSync(FILE_TRANG_THAI) && fs.unlinkSync(FILE_TRANG_THAI);
