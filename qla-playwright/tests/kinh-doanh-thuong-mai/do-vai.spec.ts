/**
 * ĐO TẠM: một vai có mở được màn "Danh sách đơn" và tạo đơn không?
 *
 * Vì sao hỏi: tài liệu chỉ định tài khoản Tòa sơ thẩm là `chanhAnDanSu`, nhưng cả luồng đang chạy
 * bằng `chanhAn`. Trước khi quyết có chạy lại case bằng vai đúng hay không, phải biết vai đó có
 * thao tác được từ bước 01 hay không.
 *
 *   $env:QLA_HO_SO_ENV="staging"; $env:QLA_VAI="chanhAnDanSu"
 *   npx playwright test tests/kinh-doanh-thuong-mai/do-vai.spec.ts
 */
import { test } from '@playwright/test';
import { choHetSpin, nghi } from '../../common/antd';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';

const DUONG_DAN = 'quan-ly-don/don-khoi-kien-va-yeu-cau/danh-sach?tab=ALL';

test('do-vai · vai có mở được màn danh sách đơn không', async ({ browser }, testInfo) => {
  testInfo.setTimeout(10 * 60_000);
  const vai = process.env.QLA_VAI || 'chanhAn';
  const { page, context } = await moTrangVaiCauHinh(browser, testInfo, vai);

  const traVe = await page.goto(DUONG_DAN, { waitUntil: 'domcontentloaded' });
  await choHetSpin(page);
  await nghi(page, 2000, 2500);

  console.log(`\n═══ VAI: ${vai} ═══`);
  console.log('  HTTP :', traVe?.status() ?? '?');
  console.log('  URL  :', page.url());

  const than = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  const hong = than.match(/Không tìm thấy trang|403|Không có quyền|Service Temporarily Unavailable/i);
  console.log('  Lỗi  :', hong ? hong[0] : '(không thấy)');

  const nut = (await page.getByRole('button').allInnerTexts())
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  console.log('  Nút  :', nut.slice(0, 15).join(' | ') || '(không có)');
  console.log('  Dòng :', await page.locator('.ant-table-row').count());

  const menu = [
    ...new Set(
      await page
        .locator('[role="menuitem"], .ant-menu-item, .ant-menu-submenu-title')
        .evaluateAll(ds => ds.map(el => (el.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)),
    ),
  ];
  console.log('  Menu :', menu.join(' · '));

  await context.close();
});
