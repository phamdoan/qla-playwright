import { Page, expect, test } from '@playwright/test';
import { DASHBOARD_URL, loginSSO } from '../../common/login';
import { khungMenu } from '../../common/menu';
import { dsTaiKhoanDangNhap, lyDoThieuTaiKhoanDangNhap } from '../../common/tai-khoan-dang-nhap';
import { ORIGIN } from '../../playwright.config';

/**
 * ĐĂNG NHẬP — MỘT CLASS CHO MỖI TÀI KHOẢN.
 *
 * Khác `dang-nhap.spec.ts` (một describe chung, mỗi tài khoản một test): ở đây MỖI TÀI KHOẢN LÀ MỘT
 * `describe.serial` riêng, nên trong Playwright UI nó hiện thành một nhánh gập riêng — bấm chạy một
 * tài khoản mà không kéo theo 7 tài khoản còn lại, và ba phép kiểm của nó nằm gọn trong nhánh đó.
 *
 * Mỗi class ĐĂNG NHẬP MỘT LẦN (`beforeAll`) rồi ba test dùng chung phiên đó:
 *   1. vào đúng dashboard của môi trường đang chạy
 *   2. menu bên trái dựng xong  (bằng chứng API quyền đã trả về, không chỉ là trang trắng)
 *   3. liệt kê nhánh menu cấp 1 — DẤU VẾT QUYỀN của tài khoản, ghi vào annotation để đối chiếu
 *
 * Vì sao `serial` + phiên dùng chung: đăng nhập SSO qua WSO2 mất ~20–30 s. Ba test mỗi test đăng
 * nhập lại là ba lần chờ cho cùng một thứ. `serial` cũng đúng nghiệp vụ: không vào được dashboard
 * thì hai phép kiểm sau vô nghĩa, Playwright tự bỏ qua chúng thay vì báo ba lỗi cho một nguyên nhân.
 *
 * Tài khoản lấy từ `config/tai-khoan-dang-nhap.<env>.{example,local}.json` — CCCD chỉ nằm ở tệp
 * `.local.json` (gitignore). Pre-prod: 8 tài khoản TAND tỉnh Bắc Ninh.
 *
 *   npm run preprod -- --project=dang-nhap tung-tai-khoan
 *   QLA_HO_SO_ENV=preprod npx playwright test --project=dang-nhap tung-tai-khoan --workers=4
 *   … thêm `-g "Chu Lệ Hường"` để chạy một tài khoản.
 */
const ds = dsTaiKhoanDangNhap();

/**
 * Chưa khai tài khoản nào thì để lại MỘT test bị bỏ qua kèm lý do, KHÔNG ném ở tầng mô-đun: ném ở
 * đây thì Playwright không nạp được tệp và `--list` trả 0 test cho CẢ repo (đã đo 04/10/2026).
 */
if (!ds.length) {
  test.describe('(chưa khai tài khoản đăng nhập)', () => {
    test.skip('bỏ qua', () => {
      test.skip(true, lyDoThieuTaiKhoanDangNhap());
    });
  });
}

for (const tk of ds) {
  test.describe.serial(`${tk.ma} · ${tk.ten}${tk.chucVu ? ` — ${tk.chucVu}` : ''}`, () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      /**
       * Phiên TRẮNG, không `storageState`: test này phải chứng minh CHÍNH tài khoản đó đăng nhập
       * được. Dùng lại session của project setup thì nó chỉ chứng minh session cũ còn hạn.
       *
       * Khai `viewport` tại đây vì `browser.newContext()` KHÔNG kế thừa `use` của project.
       */
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      page = await ctx.newPage();
      await loginSSO(page, tk.cccd, { pass: tk.matKhau });
    });

    test.afterAll(async () => {
      await page?.context().close().catch(() => {});
    });

    test('vào đúng dashboard', async ({}, testInfo) => {
      testInfo.annotations.push({ type: 'tài khoản', description: `${tk.ten} — ${tk.chucVu}` });
      testInfo.annotations.push({ type: 'môi trường', description: ORIGIN });
      await expect(page, `Đăng nhập xong nhưng URL không phải dashboard: ${page.url()}`).toHaveURL(
        DASHBOARD_URL(),
      );
    });

    test('menu bên trái dựng xong', async () => {
      /**
       * Dùng CHUNG `khungMenu()`, không tự viết bộ chọn: MenuV3 có HAI thẻ `<aside>` và thẻ ĐỨNG
       * TRƯỚC là thẻ ẩn, nên `aside` + `.first()` luôn bắt được cái ẩn rồi chờ hết giờ dù menu vẫn
       * hiện — đo trên pre-prod 04/10/2026, tài khoản đăng nhập THÀNH CÔNG mà test vẫn đỏ.
       */
      await expect(khungMenu(page), 'Vào dashboard nhưng không thấy menu bên trái').toBeVisible({
        timeout: 60_000,
      });
    });

    test('liệt kê nhánh menu cấp 1 (dấu vết quyền)', async ({}, testInfo) => {
      /**
       * ĐẾM CẢ `<a href>`, KHÔNG CHỈ `role=menuitem`: MenuV3 dựng mục menu bằng thẻ `<a>` thường,
       * không gắn `role="menuitem"`. Đếm theo role từng báo "menu trống" cho tài khoản có 172 link,
       * và tôi đã KẾT LUẬN SAI từ đó rằng cả bộ tài khoản pre-prod chưa được gán vai.
       */
      const menu = khungMenu(page);
      const link = menu.locator('a[href]');
      const soLink = await link.count();
      const nhanh = [
        ...new Set(
          (await link.allInnerTexts().catch(() => [] as string[]))
            .map(s => s.replace(/\s+/g, ' ').trim())
            .filter(Boolean),
        ),
      ];
      testInfo.annotations.push({ type: 'số mục menu', description: String(soLink) });
      testInfo.annotations.push({ type: 'nhánh menu', description: nhanh.join(' | ') || '(không có)' });
      expect(
        soLink,
        `Tài khoản ${tk.ten} vào được dashboard nhưng menu KHÔNG có mục nào — ` +
          'quyền chức năng (schema QTUD) chưa gán, hoặc API quyền trả rỗng.',
      ).toBeGreaterThan(0);
    });
  });
}
