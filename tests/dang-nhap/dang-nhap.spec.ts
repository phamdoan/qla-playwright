import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { DASHBOARD_URL, loginSSO } from '../../common/login';
import { dsTaiKhoanDangNhap, fileAuthDangNhap, lyDoThieuTaiKhoanDangNhap } from '../../common/tai-khoan-dang-nhap';
import { ORIGIN } from '../../playwright.config';

/**
 * Test ĐĂNG NHẬP: mỗi tài khoản trong config/tai-khoan-dang-nhap.*.json đăng nhập SSO từ phiên
 * trắng và phải vào được /qla/dashboard. Không làm gì thêm sau dashboard.
 *
 * Môi trường chọn bằng hồ sơ env (playwright.config.ts): preprod = https://e-qlta-uat.toaan.gov.vn
 *   npm run preprod -- --project=dang-nhap
 *   npm run staging -- --project=dang-nhap        (STG)
 *   QLA_HO_SO_ENV=preprod npx playwright test --project=dang-nhap --workers=4
 * Một tài khoản: thêm `-g "cvpTuongLinh"`.
 *
 * Chạy ở bản sao toa-an-chay-rieng-a|b|c nếu đang có luồng seed chạy song song (CLAUDE.md R7).
 */
const ds = dsTaiKhoanDangNhap();

test.describe(`Đăng nhập SSO (${ORIGIN})`, () => {
  /**
   * Chưa khai tài khoản nào thì ĐỂ LẠI MỘT TEST BỊ BỎ QUA kèm lý do, KHÔNG ném ở tầng mô-đun:
   * ném ở đây là Playwright không nạp được tệp này và `--list` trả 0 test cho CẢ repo
   * (đo 04/10/2026 khi dựng thư mục pre-prod). Xem `common/tai-khoan-dang-nhap.ts`.
   */
  if (!ds.length) {
    test.skip(`(chưa khai tài khoản đăng nhập)`, () => {
      test.skip(true, lyDoThieuTaiKhoanDangNhap());
    });
  }
  for (const tk of ds) {
    test(`${tk.ma} · ${tk.ten}${tk.chucVu ? ` (${tk.chucVu})` : ''}`, async ({ page }, testInfo) => {
      testInfo.annotations.push({ type: 'tài khoản', description: `${tk.cccd} — ${tk.ten} — ${tk.chucVu}` });

      // Trang trắng → /sso/login → WSO2 → callback → /qla/dashboard (common/login.ts)
      await loginSSO(page, tk.cccd, { pass: tk.matKhau });

      // R5 — "xong" phải có bằng chứng: URL dashboard đúng môi trường + menu dựng từ API đã tải
      await expect(page, `Đăng nhập xong nhưng URL không phải dashboard: ${page.url()}`).toHaveURL(DASHBOARD_URL());
      const menuBen = page.locator('.ant-layout-sider, aside').first();
      await expect(menuBen, 'Vào dashboard nhưng không thấy menu bên trái').toBeVisible({ timeout: 60_000 });

      // Menu lấy từ API theo vai (common/menu.ts) → liệt kê làm bằng chứng quyền của tài khoản
      const mucMenu = (await menuBen.getByRole('menuitem').allTextContents())
        .map((t) => t.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      await testInfo.attach(`menu-${tk.ma}.txt`, {
        body: `${tk.ten} (${tk.chucVu}) — ${mucMenu.length} mục menu\n${mucMenu.join('\n')}`,
        contentType: 'text/plain; charset=utf-8',
      });
      // Vào được dashboard mà menu trống = tài khoản chưa được gán quyền chức năng ở QTUD
      // (nhóm "lỗi dữ liệu/hệ thống" theo R6) — soft để kết luận đăng nhập vẫn rõ ràng.
      expect
        .soft(mucMenu.length, `Đăng nhập được nhưng menu trống: tài khoản ${tk.cccd} chưa được gán vai ở QTUD`)
        .toBeGreaterThan(0);

      // Giữ session để các test khác dùng lại mà không phải đăng nhập lại
      const fileAuth = fileAuthDangNhap(tk.ma);
      fs.mkdirSync(path.dirname(fileAuth), { recursive: true });
      await page.context().storageState({ path: fileAuth });
    });
  }
});
