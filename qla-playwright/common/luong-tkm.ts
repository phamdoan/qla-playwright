/**
 * Hạ tầng cho luồng "Luồng nhập data.txt" Bước 3–9: mỗi vai một phiên riêng, trạng thái giữa các
 * bước lưu ra file riêng (không dùng chung .run-state.json của luồng xuyên suốt cũ).
 */
import { Browser, BrowserContext, Page, TestInfo } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { VAI_TKM, VaiTKM, authFileVaiTKM, credentialsVaiTKM } from '../account';
import { taiKhoan } from './cau-hinh-luong';
import { ghiNhanToast } from './antd';
import { loginSSO } from './login';
import { veTrangChu } from './vai';

/**
 * Trợ lý ảo nổi ở góc phải dưới che các nút ở cuối màn (vd. "Lưu mới" của đơn kháng cáo 24-HC):
 * lớp kéo-thả #qla-tro-ly-ao-lop-keo có z-index 10000 và pointer-events auto nên hứng hết click.
 * Ẩn đúng ba phần tử mà chính app đã ẩn khi in (styles/global.css, @media print).
 */
async function anTroLyAo(context: BrowserContext) {
  await context.addInitScript(() => {
    const CSS = '#botplatform_iframe,#chat-box-container,#qla-tro-ly-ao-lop-keo{display:none !important}';
    const dat = () => {
      if (!document.head || document.getElementById('pw-an-tro-ly-ao')) return;
      const the = document.createElement('style');
      the.id = 'pw-an-tro-ly-ao';
      the.textContent = CSS;
      document.head.appendChild(the);
    };
    dat();
    document.addEventListener('DOMContentLoaded', dat);
  });
}

/** Mở "tab trình duyệt" riêng cho một vai; phiên hết hạn thì tự đăng nhập lại và lưu lại */
export async function moTrangVaiTKM(browser: Browser, testInfo: TestInfo, vai: VaiTKM): Promise<{ page: Page; context: BrowserContext }> {
  const cred = credentialsVaiTKM(vai);
  if (!cred) throw new Error(`Thiếu tài khoản ${VAI_TKM[vai]} trong e2e/.env.${process.env.QLA_ENV || 'stg'}`);
  const use = testInfo.project.use;
  const file = authFileVaiTKM(vai);
  const context = await browser.newContext({
    baseURL: use.baseURL,
    viewport: use.viewport ?? { width: 1600, height: 900 },
    locale: use.locale,
    timezoneId: use.timezoneId,
    ignoreHTTPSErrors: true,
    storageState: fs.existsSync(file) ? file : undefined,
  });
  context.setDefaultTimeout(use.actionTimeout || 30_000);
  await anTroLyAo(context);
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

/** Trạng thái nối giữa các bước (mã đơn, số thụ lý, khoá phê duyệt…) theo từng môi trường */
const FILE = () => path.resolve(__dirname, `../.run-state-tkm.${process.env.QLA_ENV || 'stg'}.json`);

export interface TrangThaiTKM {
  maDon?: string;
  soThuLy?: string;
  nguoiDungDon?: string;
  thamPhan?: string;
  khoaToTrinh?: string;
  khoaThongBao?: string;
  [k: string]: string | undefined;
}

export const docTrangThaiTKM = (): TrangThaiTKM => (fs.existsSync(FILE()) ? JSON.parse(fs.readFileSync(FILE(), 'utf8')) : {});

export function ghiTrangThaiTKM(them: TrangThaiTKM) {
  const moi = { ...docTrangThaiTKM(), ...them };
  fs.writeFileSync(FILE(), JSON.stringify(moi, null, 2));
  return moi;
}

/**
 * Mở "tab trình duyệt" cho một vai khai trong config/luong-gdt.json (canBo, chanhVanPhong,
 * phoChanhAn, chanhAn, thuKyVu, vuTruong, thamTraVien). Session lưu riêng theo vai + môi trường.
 */
export async function moTrangVaiCauHinh(browser: Browser, testInfo: TestInfo, vai: string): Promise<{ page: Page; context: BrowserContext }> {
  const tk = taiKhoan(vai);
  const use = testInfo.project.use;
  const file = path.resolve(__dirname, `../playwright/.auth/ch-${vai}.${process.env.QLA_ENV || 'stg'}.json`);
  const context = await browser.newContext({
    baseURL: use.baseURL,
    viewport: use.viewport ?? { width: 1600, height: 900 },
    locale: use.locale,
    timezoneId: use.timezoneId,
    ignoreHTTPSErrors: true,
    storageState: fs.existsSync(file) ? file : undefined,
  });
  context.setDefaultTimeout(use.actionTimeout || 30_000);
  await anTroLyAo(context);
  const page = await context.newPage();
  await ghiNhanToast(page);
  await veTrangChu(page);
  if (page.url().includes('/sso/') || page.url().includes('sso.toaan.gov.vn')) {
    await loginSSO(page, tk.cccd, { pass: tk.matKhau });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await context.storageState({ path: file });
  }
  await chonNguCanhLamViec(page, vai);
  return { page, context };
}

/**
 * HỘP "Chọn đơn vị và vai trò làm việc" — phải trả lời thì phiên mới có ngữ cảnh làm việc.
 *
 * Tài khoản có NHIỀU đơn vị hoặc nhiều vai trò thì `app.tsx` bật `WorkContextSelector` ngay sau khi
 * vào app (tiêu đề "Chọn đơn vị và vai trò làm việc", hoặc "Chọn vai trò làm việc" khi chỉ một đơn
 * vị). Chưa chọn thì MỌI cú lưu bị máy chủ từ chối với đúng câu đó — kịch bản báo "Chờ 'Lưu văn bản
 * thành công' nhưng gặp lỗi: Vui lòng chọn đơn vị và vai trò làm việc" (đo 03/10/2026, KDTM bước 26).
 *
 * Chọn MỤC ĐẦU của từng ô rồi "Tiếp tục" — tất định, và ghi ra log để biết phiên đang ở ngữ cảnh nào.
 * (Vai trò quyết định quyền chức năng và phạm vi dữ liệu, nên dòng log này là dữ kiện cần khi một
 * bước báo thiếu quyền.)
 */
export async function chonNguCanhLamViec(page: Page, vai = ''): Promise<void> {
  const hop = page
    .locator('.ant-modal')
    .filter({ hasText: /Chọn (đơn vị và )?vai trò làm việc/ })
    .first();
  if (!(await hop.isVisible({ timeout: 5_000 }).catch(() => false))) return;

  const dsO = hop.locator('[role="combobox"]');
  const daChon: string[] = [];
  for (let i = 0; i < (await dsO.count()); i++) {
    const o = dsO.nth(i);
    await o.click().catch(() => undefined);
    const muc = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first();
    if (await muc.isVisible({ timeout: 5_000 }).catch(() => false)) {
      daChon.push((await muc.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 60));
      await muc.click().catch(() => undefined);
    }
    await page.waitForTimeout(400);
  }
  await hop.getByRole('button', { name: /Tiếp tục/ }).first().click().catch(() => undefined);
  await hop.waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => undefined);
  console.log(`    · ngữ cảnh làm việc${vai ? ` (${vai})` : ''}: ${daChon.join(' / ') || '(không đọc được)'}`);
}
