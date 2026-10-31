import { Browser, BrowserContext, Locator, Page } from '@playwright/test';
import { BasePage, dungChu } from '../base.page';
import { LOGIN_URL, TUY_CHON_TRINH_DUYET } from '../../../playwright.config';

/** Mật khẩu mặc định của các tài khoản test trên STG */
export const MAT_KHAU_MAC_DINH = '123456';

const LA_TRANG_LOGIN = /\/sso\/login/;
const LA_TRANG_404 = /exception\/404/;

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
    const oTaiKhoan = this.page.locator('#username');
    // Trang đăng nhập đôi khi hiện mà ô nhập treo (trang còn đang chuyển/nạp lại, fill chờ mãi) → tải lại trang, gõ lại (tối đa 3 lần)
    for (let lan = 1; ; lan++) {
      try {
        await this.page.goto(LoginPage.LOGIN_URL);
        await oTaiKhoan.waitFor({ timeout: 60_000 });
        await oTaiKhoan.fill(taiKhoan, { timeout: 10_000 });
        await this.page.locator('#password').fill(matKhau, { timeout: 10_000 });
        break;
      } catch (e) {
        if (lan >= 3) throw e;
        await this.page.waitForTimeout(2000);
      }
    }

    // Một tài khoản đăng nhập ở nhiều nơi cùng lúc → lần bấm đầu đôi khi báo lỗi → bấm "Đăng nhập" lại (tối đa 3 lần)
    let vaoDuoc = false;
    for (let lan = 1; lan <= 3 && !vaoDuoc; lan++) {
      if (lan > 1) {
        if (!(await oTaiKhoan.isVisible().catch(() => false))) break;
        if (!(await oTaiKhoan.inputValue())) await oTaiKhoan.fill(taiKhoan);
        if (!(await this.page.locator('#password').inputValue())) await this.page.locator('#password').fill(matKhau);
      }
      // Cú bấm có khi treo chờ trang chuyển ("performing click action") → không chờ, việc vào được hay không do waitForURL quyết định
      await this.page.locator('button').filter({ hasText: dungChu('Đăng nhập') }).click({ noWaitAfter: true, timeout: 15_000 }).catch(() => undefined);
      // Chỉ chờ URL đổi (commit), không chờ "load": STG tải chậm, file JS của trang /qla/ có khi treo mãi → "load" không đến,
      // đăng nhập đã thành công mà vẫn bị báo thất bại (6C BA 12363, 30/10). Trang treo thì vao() sau đó tự tải lại.
      vaoDuoc = await this.page
        .waitForURL(u => /\/qla\//.test(u.pathname), { timeout: lan < 3 ? 20_000 : 60_000, waitUntil: 'commit' })
        .then(() => true)
        .catch(() => false);
    }
    // Trang vào chậm hơn thời gian chờ (lần thử sau không còn ô tài khoản → thoát vòng) → chờ thêm cú chuyển trang rồi xét lại
    if (!vaoDuoc) {
      vaoDuoc = await this.page
        .waitForURL(u => /\/qla\//.test(u.pathname), { timeout: 30_000, waitUntil: 'commit' })
        .then(() => true)
        .catch(() => false);
    }
    if (!vaoDuoc) {
      const loi = await this.page.locator('.ant-message-notice, .ant-form-item-explain-error, [class*=error]').allInnerTexts();
      throw new Error(`Đăng nhập thất bại với tài khoản ${taiKhoan}: ${loi.join(' | ') || 'vẫn ở trang đăng nhập'}`);
    }
    // File JS của trang treo → DOMContentLoaded không đến → F5 một lần (đã đăng nhập, cookie còn)
    if (!(await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).then(() => true).catch(() => false))) {
      await this.page.reload({ waitUntil: 'commit' }).catch(() => undefined);
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
    // Bong bóng "trợ lý ảo" (kéo thả được) nằm đè góc dưới phải, che nút "Lưu" của popup → cho cú bấm xuyên qua
    await context.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const s = document.createElement('style');
        s.textContent = '[data-qla-keo-tha], .qla-tro-ly-ao-keo-tha { pointer-events: none !important; }';
        document.head.appendChild(s);
      });
    });
    const page = await context.newPage();
    // Hộp "Hệ thống vừa gặp lỗi" (một API phụ của trang báo 500/502, vd. cong-dvc-quoc-gia) che cả trang, chặn mọi cú bấm
    // → trước mỗi thao tác bị che thì tự bấm "Bỏ qua". Trang thiếu dữ liệu thật thì bước sau tự báo lỗi.
    // Phải lọc :visible — hộp lỗi cũ đã đóng vẫn nằm ẩn trong DOM, .first() trúng hộp ẩn thì không bao giờ bấm được hộp đang hiện
    await page.addLocatorHandler(
      page.locator('.ant-modal-confirm:visible').filter({ hasText: /Hệ thống vừa gặp lỗi|Máy chủ báo lỗi/ }).first(),
      // Bấm bằng DOM: cú bấm Playwright ở đây lại bị chính handler chặn (lặp, hết giờ — Đơn 04 bước 9)
      async hop => {
        await hop.locator('button').filter({ hasText: 'Bỏ qua' }).first().evaluate(b => (b as HTMLElement).click(), undefined, { timeout: 5_000 }).catch(() => undefined);
        await page.waitForTimeout(800);
      },
      { noWaitAfter: true },
    );
    // Đăng nhập lỗi thì đóng context luôn — không thì trang đăng nhập nằm lại cả lượt chạy (rò phiên, máy chậm dần)
    await new LoginPage(page).dangNhap(taiKhoan, matKhau).catch(async e => {
      await new PhienDangNhap(context, page, taiKhoan, matKhau).dong();
      throw e;
    });
    return new PhienDangNhap(context, page, taiKhoan, matKhau);
  }

  /** page.goto, bị app tự chuyển trang chen ngang ("interrupted by another navigation") thì đi lại, tối đa 3 lần */
  private async di(url: string) {
    for (let lan = 1; ; lan++) {
      try {
        await this.page.goto(url);
        return;
      } catch (e) {
        if (lan >= 3 || !/interrupted by another navigation|ERR_ABORTED/.test(String(e))) throw e;
        await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
        await this.page.waitForTimeout(1500);
      }
    }
  }

  /**
   * Vào một URL (tương đối theo baseURL hoặc đầy đủ), phiên hết hạn thì đăng nhập lại rồi vào lại.
   * Sau đó chờ giao diện hiện (choGiaoDien): trang 404 → vào lại link; trang trống → F5.
   */
  async vao(url: string) {
    await this.di(url);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1500);
    if (LA_TRANG_LOGIN.test(this.page.url())) {
      await new LoginPage(this.page).dangNhap(this.taiKhoan, this.matKhau);
      await this.di(url);
    }
    await this.choGiaoDien(url);
  }

  /**
   * Trang trắng / 404: mở trang Dashboard (qla/dashboard) cho giao diện nạp đủ menu, chức năng → rồi mới vào lại `url`.
   * (Vào thẳng link chi tiết lúc phiên chưa nạp xong quyền/menu hay ra trang trắng hoặc 404.)
   */
  private async quaDashboard(url: string) {
    await this.di('dashboard');
    await this.page.waitForLoadState('domcontentloaded');
    if (LA_TRANG_LOGIN.test(this.page.url())) await new LoginPage(this.page).dangNhap(this.taiKhoan, this.matKhau);
    // Dashboard hiện đủ = vùng main có chữ (menu, thẻ thống kê) — chờ tối đa 30s, không được cũng cứ vào lại link
    await this.page
      .waitForFunction(() => (document.querySelector('main')?.textContent?.trim().length ?? 0) > 0, undefined, { timeout: 30_000 })
      .catch(() => undefined);
    await this.page.waitForTimeout(1500);
    await this.di(url);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1500);
  }

  /**
   * Hệ thống đôi khi nhảy sang trang 404 hoặc hiện trang trống (vd. Trang chủ trắng, vùng nội dung `main` không có chữ)
   * → mở Dashboard rồi vào lại link (quaDashboard). Tối đa `soLan` lần rồi báo lỗi.
   */
  private async choGiaoDien(url: string, soLan = 5) {
    for (let lan = 1; ; lan++) {
      const la404 = LA_TRANG_404.test(this.page.url());
      const coNoiDung = !la404 && (await this.page
        // Trang không có <main> (vd. trang lỗi riêng) → coi như đã hiện, để bước tự kiểm tra;
        // trừ màn chờ khởi động "Đang tải dữ liệu, vui lòng chờ…" (có lúc treo mãi — Đơn 01 bước 9 hết 5 phút)
        .waitForFunction(() => {
          const main = document.querySelector('main');
          if (main) return (main.textContent?.trim().length ?? 0) > 0;
          return !/Đang tải dữ liệu, vui lòng chờ/.test(document.body?.innerText ?? '');
        }, undefined, { timeout: 15_000 })
        .then(() => true)
        .catch(() => false));
      if (coNoiDung) return;
      if (lan >= soLan) throw new Error(`Trang ${la404 ? '404' : 'trống'} sau ${soLan} lần tải lại (đang ở ${this.page.url()}): ${url}`);
      await this.quaDashboard(url);
    }
  }

  /**
   * Vào `url` rồi chờ `dau` (dấu hiệu giao diện đã hiện, vd. tab của trang chi tiết).
   * Chưa hiện: còn đúng link (trang trống, vd. Trang chủ trắng) → F5; bị đẩy sang trang khác (Trang chủ, 404) → vào lại link.
   * Hiện rồi nhưng có hộp "Hệ thống vừa gặp lỗi" (máy chủ báo 502/500 khi tải dữ liệu, trang thiếu dữ liệu) → "Bỏ qua" rồi F5.
   * Lặp đến khi hiện, tối đa `soLan` lần rồi báo lỗi.
   */
  async vaoCho(url: string, dau: Locator, soLan = 6) {
    const dich = new URL(url, TUY_CHON_TRINH_DUYET.baseURL);
    const hopLoi = this.page.locator('.ant-modal-confirm:visible').filter({ hasText: /Hệ thống vừa gặp lỗi|Máy chủ báo lỗi/ }).first();
    await this.vao(url);
    for (let lan = 1; ; lan++) {
      const daHien = await dau.waitFor({ timeout: 20_000 }).then(() => true).catch(() => false);
      // Hộp lỗi bật ra ngay sau khi các API của trang trả về → chờ thêm chút cho chắc
      const coLoi = daHien && (await hopLoi.waitFor({ timeout: 3_000 }).then(() => true).catch(() => false));
      if (daHien && !coLoi) return;
      if (lan >= soLan) {
        throw new Error(`${coLoi ? `Máy chủ vẫn báo lỗi (${(await hopLoi.innerText()).replace(/\s+/g, ' ')})` : 'Giao diện không hiện'} sau ${soLan} lần (đang ở ${this.page.url()}): ${url}`);
      }
      if (coLoi) await hopLoi.locator('button').filter({ hasText: 'Bỏ qua' }).first().evaluate(b => (b as HTMLElement).click()).catch(() => undefined);
      const hienTai = new URL(this.page.url());
      if (coLoi && hienTai.pathname === dich.pathname && hienTai.search === dich.search) {
        // Máy chủ báo lỗi khi tải dữ liệu → F5 là đủ
        await this.page.reload();
        await this.page.waitForLoadState('domcontentloaded');
      } else {
        // Trang trắng / 404 / bị đẩy sang trang khác → qua Dashboard rồi vào lại link
        await this.quaDashboard(url);
        await this.choGiaoDien(url);
      }
    }
  }

  /**
   * Đóng trang trước rồi mới đóng context: context.close() phải lưu trace, thư mục kết quả bị xóa giữa chừng thì báo ENOENT
   * và context nằm lại (các trang vụ án cũ còn chạy ngầm). Đóng trang trước thì ít nhất trang không còn chạy.
   */
  async dong() {
    // Máy bận (nhiều lượt chạy song song, đĩa chậm) thì đóng context — lưu trace — có lúc treo mãi: bước đã xong, đã ghi state
    // mà test vẫn đứng tới hết 10 phút, trace hỏng "End of central directory" (6C BA 12362, 12368 — 30/10)
    // → cả việc đóng chờ tối đa 3 phút (tính chung, không phải từng trang — BA 12362 bước 02 cộng dồn quá 10 phút)
    // rồi bỏ đi, để nó tự xong ở nền. (Bỏ đi sớm quá thì test SAU hỏng ngay lúc chuẩn bị:
    // "apiRequestContext… Target page, context or browser has been closed" — context cũ đang đóng dở.)
    const dong = async () => {
      for (const p of this.context.pages()) await p.close({ runBeforeUnload: false }).catch(() => undefined);
      await this.context.close().catch(() => undefined);
    };
    await Promise.race([dong(), new Promise(r => setTimeout(r, 180_000).unref())]);
  }
}
