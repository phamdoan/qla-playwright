import { Page, expect } from '@playwright/test';
import { ORIGIN } from '../playwright.config';
import { matKhauMacDinh } from '../account';

export { matKhauMacDinh };

export const DASHBOARD_URL = () => `${ORIGIN}/qla/dashboard`;

/** Chỉ tính dashboard đúng môi trường (QLA_ENV), không nhận nhầm qla-stg khi đang chạy dev */
const LA_DASHBOARD = { test: (u: string) => u.startsWith(`${ORIGIN}/qla/dashboard`) };
/**
 * Đã vào app nhưng KHÔNG ở dashboard — vẫn là đăng nhập thành công.
 *
 * Đo STG 11/10/2026: tài khoản không có quyền màn Tổng quan bị đá `/qla/dashboard` → `/qla/exception/404`
 * ngay sau callback SSO (phiên đã có, `session/current_user` 200). Trước đây chỉ chờ URL dashboard nên
 * treo 60 s × 5 vòng rồi báo "không đăng nhập được" — sai chỗ: lỗi là quyền, không phải đăng nhập.
 */
const LA_DA_VAO_APP = {
  test: (u: string) => u.startsWith(`${ORIGIN}/qla/`) && !/\/qla\/login\b/.test(u) && !LA_CALLBACK_LOI.test(u),
};
const LA_SSO_LOCAL = /\/sso\/login/;
/**
 * Trang đăng nhập WSO2. Ngoài host SSO của STG/DEV/UAT còn nhận theo ĐƯỜNG DẪN của WSO2
 * (/authenticationendpoint/, /oauth2/authorize) vì pre-prod (e-qlta-uat) có thể dùng host SSO khác:
 * qla/k8s/pre-prod/application-pre-prod.yml:51-60 lấy client-id/redirect-uri từ biến môi trường,
 * không hardcode sso.toaan.gov.vn như các môi trường còn lại.
 */
const LA_SSO_WSO2 = /sso\.toaan\.gov\.vn|\/authenticationendpoint\/|\/oauth2\/authorize/;
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
  const soLanThu = opts.soLanThu ?? 5;

  await page.goto(DASHBOARD_URL());

  for (let lan = 1; lan <= soLanThu; lan++) {
    await page.waitForURL(u => [LA_DA_VAO_APP, LA_SSO_LOCAL, LA_SSO_WSO2, LA_CALLBACK_LOI].some(r => r.test(u.href)), {
      timeout: 60_000,
    });
    const url = page.url();

    if (LA_SSO_LOCAL.test(url)) {
      /**
       * CÚ BẤM NÀY HAY TREO — và trước đây nó giết cả lượt chạy.
       *
       * `click()` tự chờ "scheduled navigations to finish"; SSO chập thì nó đứng tới hết giờ rồi NÉM
       * RA NGOÀI vòng `for`, nên `soLanThu` không có tác dụng: lượt chạy rụng ở một bước giữa chừng
       * chỉ vì mở phiên cho vai mới (đo 03/10/2026: hỏng ở bước 27 rồi bước 31, cùng một chỗ).
       * Giờ: hạn giờ ngắn, NUỐT lỗi, rồi tự chờ URL rời trang SSO; không rời được thì quay lại
       * dashboard để vòng sau thử lại từ đầu.
       */
      await page
        .getByRole('button', { name: /Đăng nhập với Tòa án tối cao SSO/ })
        .click({ timeout: 20_000 })
        .catch(() => undefined);
      // Phiên WSO2 còn hiệu lực thì WSO2 trả thẳng về callback, không hiện form
      const daRoiSso = await page
        .waitForURL(u => !LA_SSO_LOCAL.test(u.href), { timeout: 30_000 })
        .then(() => true)
        .catch(() => false);
      if (!daRoiSso) {
        /**
         * Bấm mà không rời được /sso/login: thường do phiên WSO2 cũ còn trong cookie và trang SSO cục
         * bộ quay vòng. Dọn cookie rồi vào lại từ đầu — không dọn thì thử bao nhiêu vòng cũng y hệt
         * (đo 03/10/2026: tài khoản 034179003391 hỏng cả 3 vòng, URL cuối vẫn /sso/login).
         */
        await page.context().clearCookies().catch(() => undefined);
        await page.goto(DASHBOARD_URL()).catch(() => undefined);
        continue;
      }
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
    await page.waitForURL(u => LA_DA_VAO_APP.test(u.href) || LA_SSO_LOCAL.test(u.href) || LA_SSO_WSO2.test(u.href), {
      timeout: 60_000,
    });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    if (LA_DASHBOARD.test(page.url())) {
      await expect(page).toHaveURL(DASHBOARD_URL());
      return;
    }
    // Vào app nhưng bị đá khỏi dashboard (vd. /qla/exception/404): người gọi tự kiểm quyền
    if (LA_DA_VAO_APP.test(page.url())) return;
  }
  throw new Error(`Không vào được ${DASHBOARD_URL()} sau ${soLanThu} lần thử (tài khoản ${user}), URL cuối: ${page.url()}`);
}
