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
  return { page, context };
}
