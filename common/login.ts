import { Page, expect } from '@playwright/test';
import { ORIGIN } from '../playwright.config';
import { matKhauMacDinh } from '../account';

export { matKhauMacDinh };

export const DASHBOARD_URL = () => `${ORIGIN}/qla/dashboard`;

/** Chỉ tính dashboard đúng môi trường (QLA_ENV), không nhận nhầm qla-stg khi đang chạy dev */
const LA_DASHBOARD = { test: (u: string) => u.startsWith(`${ORIGIN}/qla/dashboard`) };
const LA_SSO_LOCAL = /\/sso\/login/;
const LA_SSO_WSO2 = /sso\.toaan\.gov\.vn/;
/** Lỗi 3.1: callback trả JSON {"error":"invalid_request",...} */
const LA_CALLBACK_LOI = /\/qla\/api\/v1\/session\/oauth2\/callback/;

export interface LoginOptions {
  /** Bỏ trống → Ta@<user> */
  pass?: string;
  /** Số lần thử lại khi callback lỗi / bị đá về /sso/login (mặc định 3) */
  soLanThu?: number;
}

/**
 * Đăng nhập SSO cho một tài khoản bất kỳ, kết thúc ở /qla/dashboard.
 * 1. Vào /qla/dashboard → hệ thống chuyển về /sso/login
 * 2. Bấm "Đăng nhập với Tòa án tối cao SSO" → sso.toaan.gov.vn (WSO2), nhập usernameUserInput/password
 * 3. Callback về /qla/dashboard; nếu rơi vào lỗi callback OAuth2 (invalid_request) thì tự chuyển về dashboard
 */
export async function loginSSO(page: Page, user: string, opts: LoginOptions = {}) {
  const pass = opts.pass || matKhauMacDinh(user);
  const soLanThu = opts.soLanThu ?? 3;

  await page.goto(DASHBOARD_URL());

  for (let lan = 1; lan <= soLanThu; lan++) {
    await page.waitForURL(u => [LA_DASHBOARD, LA_SSO_LOCAL, LA_SSO_WSO2, LA_CALLBACK_LOI].some(r => r.test(u.href)), {
      timeout: 60_000,
    });
    const url = page.url();

    if (LA_SSO_LOCAL.test(url)) {
      await page.getByRole('button', { name: /Đăng nhập với Tòa án tối cao SSO/ }).click();
      // Phiên WSO2 còn hiệu lực thì WSO2 trả thẳng về callback, không hiện form
      await page.waitForURL(u => !LA_SSO_LOCAL.test(u.href), { timeout: 30_000 });
    }

    if (LA_SSO_WSO2.test(page.url())) {
      await page.locator('#usernameUserInput').fill(user);
      await page.locator('#password').fill(pass);
      await page.locator('#password').press('Enter');
      await page.waitForURL(u => !LA_SSO_WSO2.test(u.href) || /authFailure=true/.test(u.href), { timeout: 60_000 });
      if (/authFailure=true/.test(page.url())) {
        throw new Error(`Đăng nhập SSO thất bại cho tài khoản ${user} (sai tài khoản/mật khẩu?)`);
      }
    }

    // Lỗi 3.1: callback OAuth2 trả JSON lỗi → tự chuyển về dashboard
    if (LA_CALLBACK_LOI.test(page.url())) {
      await page.goto(DASHBOARD_URL());
    }

    // Chờ ổn định: nếu phiên chưa có, app sẽ đá về /sso/login → thử lại vòng sau
    await page.waitForURL(u => LA_DASHBOARD.test(u.href) || LA_SSO_LOCAL.test(u.href) || LA_SSO_WSO2.test(u.href), {
      timeout: 60_000,
    });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    if (LA_DASHBOARD.test(page.url())) {
      await expect(page).toHaveURL(DASHBOARD_URL());
      return;
    }
  }
  throw new Error(`Không vào được ${DASHBOARD_URL()} sau ${soLanThu} lần thử (tài khoản ${user}), URL cuối: ${page.url()}`);
}
