import { Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ORIGIN } from '../../../playwright.config';

const LA_DASHBOARD = { test: (u: string) => u.startsWith(`${ORIGIN}/qla/dashboard`) };
const LA_SSO_LOCAL = /\/sso\/login/;
/** Trang WSO2: nhận theo host và đường dẫn vì pre-prod có thể dùng host SSO khác */
const LA_SSO_WSO2 = /sso\.toaan\.gov\.vn|\/authenticationendpoint\/|\/oauth2\/authorize/;
/** Callback OAuth2 đôi khi trả JSON lỗi invalid_request */
const LA_CALLBACK_LOI = /\/qla\/api\/v1\/session\/oauth2\/callback/;

/** Mật khẩu mặc định của tài khoản test: Ta@<CCCD> */
export const matKhauMacDinh = (user: string) => `Ta@${user}`;

export class LoginPage extends BasePage {
  static readonly DASHBOARD_URL = () => `${ORIGIN}/qla/dashboard`;

  constructor(page: Page) {
    super(page);
  }

  /**
   * Đăng nhập SSO, kết thúc ở /qla/dashboard.
   * /qla/dashboard → /sso/login → bấm "Đăng nhập với Tòa án tối cao SSO" → WSO2 → callback → dashboard
   */
  async dangNhap(user: string, pass = matKhauMacDinh(user), soLanThu = 5) {
    await this.page.goto(LoginPage.DASHBOARD_URL());

    for (let lan = 1; lan <= soLanThu; lan++) {
      await this.page.waitForURL(u => [LA_DASHBOARD, LA_SSO_LOCAL, LA_SSO_WSO2, LA_CALLBACK_LOI].some(r => r.test(u.href)), {
        timeout: 60_000,
      });

      if (LA_SSO_LOCAL.test(this.page.url())) {
        // Cú bấm này hay treo khi SSO chập: nuốt lỗi rồi tự kiểm tra đã rời trang chưa
        await this.page
          .getByRole('button', { name: /Đăng nhập với Tòa án tối cao SSO/ })
          .click({ timeout: 20_000 })
          .catch(() => undefined);
        const daRoiSso = await this.page
          .waitForURL(u => !LA_SSO_LOCAL.test(u.href), { timeout: 30_000 })
          .then(() => true)
          .catch(() => false);
        if (!daRoiSso) {
          // Phiên WSO2 cũ còn trong cookie làm trang SSO quay vòng → dọn rồi thử lại
          await this.page.context().clearCookies().catch(() => undefined);
          await this.page.goto(LoginPage.DASHBOARD_URL()).catch(() => undefined);
          continue;
        }
      }

      if (LA_SSO_WSO2.test(this.page.url())) {
        await this.page.locator('#usernameUserInput').fill(user);
        await this.page.locator('#password').fill(pass);
        await this.page.locator('#password').press('Enter');
        await this.page.waitForURL(u => !LA_SSO_WSO2.test(u.href) || /authFailure=true/.test(u.href), { timeout: 60_000 });
        if (/authFailure=true/.test(this.page.url())) {
          throw new Error(`Đăng nhập SSO thất bại cho tài khoản ${user} (sai tài khoản/mật khẩu?)`);
        }
      }

      if (LA_CALLBACK_LOI.test(this.page.url())) {
        await this.page.goto(LoginPage.DASHBOARD_URL());
      }

      await this.page.waitForURL(u => LA_DASHBOARD.test(u.href) || LA_SSO_LOCAL.test(u.href) || LA_SSO_WSO2.test(u.href), {
        timeout: 60_000,
      });
      await this.choTaiXong();
      if (LA_DASHBOARD.test(this.page.url())) {
        await expect(this.page).toHaveURL(LoginPage.DASHBOARD_URL());
        return;
      }
    }
    throw new Error(`Không vào được dashboard sau ${soLanThu} lần thử (tài khoản ${user}), URL cuối: ${this.page.url()}`);
  }
}
