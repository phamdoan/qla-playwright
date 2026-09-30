/**
 * ĐO TẠM: sau khi ký 47DS, quyết định nằm ở tab nào — và phân hệ nào chứa biên bản phiên tòa 48-DS?
 *
 * ĐO 30/09/2026: tab "Chuẩn bị xét xử" sau khi ký 47DS hiện "Chưa có quyết định nào" và nút
 * "Thêm biểu mẫu" bị DISABLED → vụ đã sang giai đoạn sau, danh sách quyết định chuyển tab.
 *
 * Chạy: npx playwright test tests/kinh-doanh-thuong-mai/do-47ds-lich.spec.ts
 */
import { test } from '@playwright/test';
import { choHetSpin, nghi } from '../../common/antd';
import { moTab } from '../../common/bieu-mau';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';

const ID = process.env.QLA_ID || 'd9d4fb63-229b-4ab2-8a7a-6a9539148c58';

test('do-47ds-lich · quyết định nằm tab nào, menu trái có gì', async ({ browser }, testInfo) => {
  testInfo.setTimeout(10 * 60_000);
  const { page, context } = await moTrangVaiCauHinh(browser, testInfo, process.env.QLA_VAI || 'chanhAn');

  await page.goto(`vu-an/dan-su/so-tham/chi-tiet?id=${ID}&tab=thong-tin-chung`, {
    waitUntil: 'domcontentloaded',
  });
  await choHetSpin(page);

  console.log('vai:', process.env.QLA_VAI || 'chanhAn');
  for (const tab of ['Chuẩn bị xét xử', 'Xét xử', 'Quản lý án']) {
    await moTab(page, tab).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 1500, 2000);
    const hang = (await page.locator('.ant-table-row').allInnerTexts())
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    console.log(`\n═══ TAB "${tab}" · ${hang.length} dòng bảng ═══`);
    for (const h of hang.slice(0, 12)) console.log('  · ' + h);
    const nutThem = page.getByRole('button', { name: /Thêm biểu mẫu/i }).first();
    if (await nutThem.count()) {
      console.log(`  nút "Thêm biểu mẫu" bật? ${await nutThem.isEnabled().catch(() => 'không đọc được')}`);
    }
  }

  const menu = [
    ...new Set(
      await page
        .locator('[role="menuitem"], .ant-menu-item, .ant-menu-submenu-title')
        .evaluateAll(ds => ds.map(el => (el.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)),
    ),
  ];
  console.log(`\n═══ MENU TRÁI (${menu.length}) ═══\n  ` + menu.join('\n  '));

  await context.close();
});
