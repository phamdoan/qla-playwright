import { Browser, BrowserContext, Page } from '@playwright/test';
import { BasePage, dungChu } from '../base.page';
import { LOGIN_URL, TUY_CHON_TRINH_DUYET } from '../../../playwright.config';

/** Mật khẩu mặc định của các tài khoản test trên STG */
export const MAT_KHAU_MAC_DINH = '123456';

const LA_TRANG_LOGIN = /\/sso\/login/;

/**
 * Đăng nhập TRỰC TIẾP bằng tài khoản + mật khẩu ở trang đăng nhập của môi trường
 * (biến URL trong .env.<hồ sơ>, vd. .env.staging → https://qla-stg.toaan.gov.vn/sso/login).
 * Không đi qua SSO.
 */
export class LoginPage extends BasePage {
  static readonly LOGIN_URL = LOGIN_URL;

  constructor(page: Page) {
    super(page);
  }

  async dangNhap(taiKhoan: string, matKhau = MAT_KHAU_MAC_DINH) {
    // Phiên cũ còn thì trang đăng nhập tự chuyển đi → xóa để chắc chắn vào đúng tài khoản
    await this.page.context().clearCookies();
    await this.page.goto(LoginPage.LOGIN_URL);
    const oTaiKhoan = this.page.locator('#username');
    await oTaiKhoan.waitFor({ timeout: 60_000 });
    await oTaiKhoan.fill(taiKhoan);
    await this.page.locator('#password').fill(matKhau);
    await this.page.locator('button').filter({ hasText: dungChu('Đăng nhập') }).click();

    const vaoDuoc = await this.page
      .waitForURL(u => /\/qla\//.test(u.pathname), { timeout: 60_000 })
      .then(() => true)
      .catch(() => false);
    if (!vaoDuoc) {
      const loi = await this.page.locator('.ant-message-notice, .ant-form-item-explain-error, [class*=error]').allInnerTexts();
      throw new Error(`Đăng nhập thất bại với tài khoản ${taiKhoan}: ${loi.join(' | ') || 'vẫn ở trang đăng nhập'}`);
    }
    await this.choTaiXong(2000);
  }
}

/**
 * Một tài khoản đang làm việc trong luồng: browser context riêng (tương đương một profile trình duyệt),
 * tự đăng nhập lại khi phiên hết hạn (STG đá về /sso/login sau một lúc không thao tác).
 */
export class PhienDangNhap {
  private constructor(
    readonly context: BrowserContext,
    readonly page: Page,
    readonly taiKhoan: string,
    private readonly matKhau: string,
  ) {}

  static async mo(browser: Browser, taiKhoan: string, matKhau = MAT_KHAU_MAC_DINH): Promise<PhienDangNhap> {
    const context = await browser.newContext(TUY_CHON_TRINH_DUYET);
    context.setDefaultTimeout(30_000);
    const page = await context.newPage();
    await new LoginPage(page).dangNhap(taiKhoan, matKhau);
    return new PhienDangNhap(context, page, taiKhoan, matKhau);
  }

  /** Vào một URL (tương đối theo baseURL hoặc đầy đủ), phiên hết hạn thì đăng nhập lại rồi vào lại */
  async vao(url: string) {
    await this.page.goto(url);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1500);
    if (LA_TRANG_LOGIN.test(this.page.url())) {
      await new LoginPage(this.page).dangNhap(this.taiKhoan, this.matKhau);
      await this.page.goto(url);
    }
  }

  async dong() {
    await this.context.close().catch(() => undefined);
  }
}
