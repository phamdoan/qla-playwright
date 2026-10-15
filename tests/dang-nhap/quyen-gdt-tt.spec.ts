import { Page, Response, expect, test } from '@playwright/test';
import { loginSSO } from '../../common/login';
import { khungMenu } from '../../common/menu';
import { dsTaiKhoanDangNhap, lyDoThieuTaiKhoanDangNhap } from '../../common/tai-khoan-dang-nhap';
import { ORIGIN } from '../../playwright.config';

/**
 * QUYỀN GĐT/TT — mỗi tài khoản vào được các màn Giám đốc thẩm, tái thẩm mà KHÔNG bị 403.
 *
 * Chỉ đọc, không tạo/sửa gì. Với từng tài khoản (một `describe.serial`, đăng nhập SSO một lần):
 *   1. menu có nhánh GĐT/TT — lấy mọi link menu trỏ vào `/vu-an/gdt-tt/…` (menu lấy từ DB nên không
 *      đoán URL; `href` của link chính là route FE, xem qla-webapp/src/router/routes.ts:498+)
 *   2. lần lượt mở từng màn danh sách đó, rồi mở dòng đầu tiên bằng nút "Xem" (icon eye) hoặc link
 *      trên dòng. Mỗi màn kiểm:
 *        · không có response HTTP 403 (hoặc 401) nào từ máy chủ
 *        · không rơi vào trang lỗi 403 của FE (qla-webapp/src/pages/exception/403/index.tsx — `<svg><title>403`)
 *
 * Màn danh sách không có dòng nào thì ghi "không có dữ liệu để mở", KHÔNG tính là lỗi.
 * Kết quả từng màn ghi vào annotation + tệp đính kèm `ket-qua.json` trong báo cáo HTML.
 *
 * Tài khoản: config/tai-khoan-quyen-gdt-tt.example.json (+ .local.json chứa CCCD, không commit).
 *
 *   QLA_HO_SO_ENV=staging npx playwright test --project=dang-nhap quyen-gdt-tt --workers=4
 *   … thêm `-g vanThuHongAnh` để chạy một tài khoản.
 */
const BO = 'tai-khoan-quyen-gdt-tt';
const ds = dsTaiKhoanDangNhap(BO);

/** Link menu thuộc phân hệ GĐT/TT */
const LA_GDT_TT = /\/vu-an\/gdt-tt\//;

interface KetQuaMan {
  nhan: string;
  url: string;
  soDong: number | null;
  moChiTiet: string;
  loi: string[];
}

if (!ds.length) {
  test.describe('(chưa khai tài khoản kiểm quyền GĐT/TT)', () => {
    test.skip('bỏ qua', () => {
      test.skip(true, lyDoThieuTaiKhoanDangNhap(BO));
    });
  });
}

/** Chờ màn tải xong: mạng lặng + hết spinner antd. Không throw — màn treo sẽ bị bắt ở phép kiểm sau. */
async function choTai(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page
    .locator('.ant-spin-spinning')
    .first()
    .waitFor({ state: 'hidden', timeout: 30_000 })
    .catch(() => {});
}

/** Trang lỗi 403 của FE (pages/exception/403) */
async function laTrang403(page: Page): Promise<boolean> {
  if (/\/(exception\/)?403(\b|$)/.test(new URL(page.url()).pathname)) return true;
  return (await page.locator('svg title').filter({ hasText: /^403$/ }).count()) > 0;
}

for (const tk of ds) {
  test.describe.serial(`${tk.ma} · ${tk.ten}${tk.chucVu ? ` — ${tk.chucVu}` : ''}`, () => {
    let page: Page;
    /** Response 401/403 gom từ MỌI tab của phiên (nút Xem có thể mở tab mới) */
    let bi403: string[] = [];
    let dsMan: { nhan: string; href: string }[] = [];
    /** Đăng nhập xong mà bị đá sang trang lỗi (vd. /qla/exception/404) thì ghi lại để báo cáo */
    let trangSauDangNhap = '';

    test.beforeAll(async ({ browser }) => {
      // Phiên trắng: phải chứng minh CHÍNH tài khoản này có quyền, không mượn session khác
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, ignoreHTTPSErrors: true });
      ctx.on('response', (r: Response) => {
        const s = r.status();
        if ((s === 403 || s === 401) && r.url().startsWith(ORIGIN)) {
          // Kèm thân lỗi (mã/thông điệp) để biết chặn ở cổng nào: quyền chức năng hay quyền dữ liệu
          const dong = `${s} ${r.request().method()} ${r.url().replace(ORIGIN, '')}`;
          r.text()
            .then((t) => bi403.push(`${dong} → ${t.replace(/\s+/g, ' ').slice(0, 200)}`))
            .catch(() => bi403.push(dong));
        }
      });
      page = await ctx.newPage();
      await loginSSO(page, tk.cccd, { pass: tk.matKhau });
      /**
       * Không có quyền màn Tổng quan thì `/qla/dashboard` bị đá sang `/qla/exception/404` (đo STG
       * 11/10/2026) — trang lỗi không có menu. `/home` mở cho mọi tài khoản
       * (qla-webapp/src/router/routes.ts:24-30, `ignoreAccess`) nên đứng ở đó để đọc menu.
       */
      if (/\/qla\/exception\//.test(page.url())) {
        trangSauDangNhap = new URL(page.url()).pathname;
        await page.goto(`${ORIGIN}/qla/home`, { waitUntil: 'domcontentloaded' });
        await choTai(page);
      }
    });

    test.afterAll(async () => {
      await page?.context().close().catch(() => {});
    });

    test('menu có nhánh Giám đốc thẩm, tái thẩm', async ({}, testInfo) => {
      testInfo.annotations.push({ type: 'môi trường', description: ORIGIN });
      if (trangSauDangNhap) {
        testInfo.annotations.push({ type: '⚠ sau đăng nhập', description: `bị chuyển sang ${trangSauDangNhap}` });
      }
      const menu = khungMenu(page);
      await expect(menu, 'Vào dashboard nhưng không thấy menu bên trái').toBeVisible({ timeout: 60_000 });

      const link = menu.locator('a[href]');
      const thay = new Set<string>();
      for (let i = 0, n = await link.count(); i < n; i++) {
        const href = (await link.nth(i).getAttribute('href')) || '';
        if (!LA_GDT_TT.test(href)) continue;
        const duong = new URL(href, page.url()).href;
        if (thay.has(duong)) continue;
        thay.add(duong);
        const nhan = ((await link.nth(i).textContent()) || '').replace(/\s+/g, ' ').trim() || href;
        dsMan.push({ nhan, href: duong });
      }
      testInfo.annotations.push({
        type: 'màn GĐT/TT trên menu',
        description: `${dsMan.length}: ${dsMan.map((m) => m.nhan).join(' | ')}`,
      });
      const tatCaMenu = (await menu.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      expect(
        dsMan.length,
        `Tài khoản ${tk.ten} không có mục menu nào trỏ vào /vu-an/gdt-tt/ — chưa được gán chức năng GĐT/TT (QTUD).` +
          `${trangSauDangNhap ? ` Sau đăng nhập bị chuyển sang ${trangSauDangNhap}.` : ''} Menu đang có: "${tatCaMenu.slice(0, 300)}"`,
      ).toBeGreaterThan(0);
    });

    test('mở danh sách + xem chi tiết không bị 403', async ({}, testInfo) => {
      test.setTimeout(Math.max(300_000, dsMan.length * 120_000));
      const ketQua: KetQuaMan[] = [];

      for (const man of dsMan) {
        await test.step(`${man.nhan}`, async () => {
          const kq: KetQuaMan = { nhan: man.nhan, url: man.href.replace(ORIGIN, ''), soDong: null, moChiTiet: '', loi: [] };
          ketQua.push(kq);

          // ── Danh sách ──
          bi403 = [];
          await page.goto(man.href, { waitUntil: 'domcontentloaded' }).catch((e) => kq.loi.push(`Mở trang lỗi: ${e}`));
          await choTai(page);
          if (await laTrang403(page)) kq.loi.push('Danh sách: hiện trang 403');
          if (bi403.length) kq.loi.push(...bi403.map((x) => `Danh sách: ${x}`));

          // ── Xem dòng đầu tiên (chỉ nút Xem / link, không bấm nút sửa/xoá) ──
          const dong = page.locator('.ant-table-tbody tr.ant-table-row');
          kq.soDong = await dong.count();
          if (!kq.soDong) {
            kq.moChiTiet = 'không có dữ liệu để mở';
            return;
          }
          const dau = dong.first();
          const nutXem = dau
            .locator('button, a')
            .filter({ has: page.locator('[aria-label="eye"]') })
            .first()
            .or(dau.locator('a[href]').first())
            .first();
          if (!(await nutXem.count())) {
            // vd. Hồ sơ kháng nghị, Cấu hình TTV: dòng chỉ có Sửa/Xoá/Nhận/Trả — không bấm thao tác ghi
            kq.moChiTiet = 'màn không có nút Xem, chỉ kiểm danh sách';
            return;
          }

          bi403 = [];
          const urlTruoc = page.url();
          const tabMoi = page.context().waitForEvent('page', { timeout: 5_000 }).catch(() => null);
          await nutXem.click({ timeout: 15_000 }).catch((e) => kq.loi.push(`Bấm Xem lỗi: ${String(e).split('\n')[0]}`));
          const popup = await tabMoi;
          const trangXem = popup || page;
          await choTai(trangXem);
          if (popup) kq.moChiTiet = `tab mới ${popup.url().replace(ORIGIN, '')}`;
          else if (page.url() !== urlTruoc) kq.moChiTiet = page.url().replace(ORIGIN, '');
          else if (await page.locator('.ant-modal:visible, .ant-drawer-open').count()) kq.moChiTiet = 'mở hộp thoại';
          else kq.moChiTiet = 'bấm Xem nhưng không thấy điều hướng';

          if (await laTrang403(trangXem)) kq.loi.push('Chi tiết: hiện trang 403');
          if (bi403.length) kq.loi.push(...bi403.map((x) => `Chi tiết: ${x}`));
          if (popup) await popup.close().catch(() => {});
        });
      }

      // ── Tổng hợp ──
      await testInfo.attach('ket-qua.json', {
        body: JSON.stringify({ taiKhoan: tk.ma, ten: tk.ten, moiTruong: ORIGIN, ketQua }, null, 2),
        contentType: 'application/json',
      });
      for (const kq of ketQua) {
        testInfo.annotations.push({
          type: kq.loi.length ? '❌ ' + kq.nhan : '✅ ' + kq.nhan,
          description: `${kq.url} · ${kq.soDong ?? '?'} dòng · xem: ${kq.moChiTiet}${kq.loi.length ? ' · ' + kq.loi.join('; ') : ''}`,
        });
      }
      const hong = ketQua.filter((k) => k.loi.length);
      expect(
        hong.map((k) => `${k.nhan} (${k.url}): ${k.loi.join('; ')}`),
        `${tk.ten}: ${hong.length}/${ketQua.length} màn GĐT/TT bị 403/401`,
      ).toEqual([]);
    });
  });
}
