import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { DASHBOARD_URL, loginSSO } from '../../common/login';
import { khungMenu } from '../../common/menu';
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
      /**
       * Dùng CHUNG `khungMenu()` của common/menu.ts, không tự viết bộ chọn.
       *
       * Bộ chọn cũ ở đây là `page.locator('.ant-layout-sider, aside').first()` — đúng cái bẫy mà
       * chú thích trong common/menu.ts đã cảnh báo: MenuV3 có HAI thẻ `<aside>` và thẻ ĐỨNG TRƯỚC
       * là thẻ ẩn, nên `.first()` luôn trả về cái ẩn rồi chờ hết 60 s dù menu vẫn hiện.
       * Đo trên pre-prod 04/10/2026: tài khoản đăng nhập THÀNH CÔNG, vào đúng dashboard, mà test vẫn
       * đỏ với "không thấy menu bên trái" — lỗi của test, không phải của môi trường hay tài khoản.
       */
      const menuBen = khungMenu(page);
      await expect(menuBen, 'Vào dashboard nhưng không thấy menu bên trái').toBeVisible({ timeout: 60_000 });

      // Menu lấy từ API theo vai (common/menu.ts) → liệt kê làm bằng chứng quyền của tài khoản
      /**
       * ĐẾM CẢ `<a href>`, KHÔNG CHỈ `role=menuitem`.
       *
       * MenuV3 dựng mục menu bằng thẻ `<a>` thường, KHÔNG gắn `role="menuitem"` — `common/menu.ts`
       * đã biết điều đó từ 02/10/2026 (`.filter({ has: locator('a, [role="menuitem"]') })`) nhưng
       * spec này thì chưa.
       *
       * Hậu quả đã xảy ra, không phải giả thiết: đo pre-prod 04/10/2026, tài khoản có menu **172
       * liên kết** (Quản lý đơn, Danh sách đơn, Đơn khởi kiện/yêu cầu…) mà `getByRole('menuitem')`
       * trả về **0**, nên test kết luận "chưa được gán vai ở QTUD". Tôi đã báo cáo sai rằng cả 30
       * tài khoản pre-prod đều không có quyền — thực ra chúng có đủ quyền, chỉ là test đếm sai.
       * Câu kết luận càng dứt khoát thì đếm sai càng tai hại.
       */
      const mucMenu = (await menuBen.locator('a[href], [role="menuitem"]').allTextContents())
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
