/**
 * ĐO TẠM: menu "⋮" trên dòng đơn kháng cáo có những thao tác nào?
 *
 * Vì sao hỏi: bước 15 (chuyển hồ sơ lên phúc thẩm) chưa tìm được màn — màn "Hồ sơ vụ án chuyển đi"
 * của nhánh Dân sự không chứa vụ KDTM, nhánh KDTM lại không có mục đó. Dòng kháng cáo đang
 * "Chờ xử lý" và có nút "⋮" ở cột Thao tác, nên thao tác chuyển hồ sơ có thể nằm ở đây.
 *
 *   $env:QLA_HO_SO_ENV="staging"; $env:QLA_VAI="chanhAnDanSu"
 *   npx playwright test tests/kinh-doanh-thuong-mai/do-menu-khang-cao.spec.ts
 */
import { test } from '@playwright/test';
import { choHetSpin, hienTrong, nghi } from '../../common/antd';
import { moTab } from '../../common/bieu-mau';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';

const ID = process.env.QLA_ID || '1bf5cb23-745a-42d6-82b9-4647244aa612';

test('do-menu-khang-cao · thao tác trên dòng đơn kháng cáo', async ({ browser }, testInfo) => {
  testInfo.setTimeout(10 * 60_000);
  const { page, context } = await moTrangVaiCauHinh(browser, testInfo, process.env.QLA_VAI || 'chanhAnDanSu');

  await page.goto(`vu-an/dan-su/so-tham/chi-tiet?id=${ID}&tab=thong-tin-chung`, {
    waitUntil: 'domcontentloaded',
  });
  await moTab(page, 'Quản lý án');
  await choHetSpin(page);
  await nghi(page, 1500, 2000);

  // Tab "Quản lý án" có nhiều bảng cùng nhắc tới bản án/kháng cáo — phải neo ĐÚNG KHỐI
  // "Danh sách kháng cáo" (khối chứa nút "Thêm mới đơn kháng cáo"), không lọc theo chữ.
  const khoi = page
    .locator('div')
    .filter({ hasText: /Danh sách kháng cáo/i })
    .filter({ has: page.getByRole('button', { name: /Thêm mới đơn kháng cáo/i }) })
    .last();
  const dong = khoi.locator('.ant-table-row').first();
  if (!(await hienTrong(dong, 15_000))) {
    console.log('(không thấy dòng kháng cáo)');
    await context.close();
    return;
  }
  console.log('\n═══ DÒNG KHÁNG CÁO ═══\n  ' + (await dong.innerText()).replace(/\s+/g, ' ').trim());

  const icon = await dong.getByRole('img').evaluateAll(ds => ds.map(e => e.getAttribute('aria-label')));
  console.log('  icon thao tác: ' + icon.filter(Boolean).join(' | '));

  const kebab = dong.locator('button:has(.anticon-more), button:has(.anticon-ellipsis)').first();
  if (!(await hienTrong(kebab, 8_000))) {
    console.log('  (không thấy nút "⋮")');
    await context.close();
    return;
  }
  await kebab.click();
  await nghi(page, 900, 1400);

  const muc = (await page.getByRole('menuitem').allInnerTexts())
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  console.log(`\n═══ MENU "⋮" (${muc.length}) ═══\n  ` + muc.join('\n  '));

  // Toàn bộ nút của tab "Quản lý án" — biết còn thao tác nào ở mức khối
  await page.keyboard.press('Escape');
  await nghi(page, 500, 800);
  const nut = [
    ...new Set((await page.getByRole('button').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean)),
  ];
  console.log(`\n═══ NÚT TRÊN TAB "QUẢN LÝ ÁN" (${nut.length}) ═══\n  ` + nut.join('\n  '));

  await context.close();
});
