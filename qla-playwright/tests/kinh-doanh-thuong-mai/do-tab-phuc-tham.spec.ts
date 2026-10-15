/**
 * ĐO TẠM: dòng quyết định 66-DS nằm ở TAB NÀO của vụ án phúc thẩm?
 *
 * Vì sao hỏi: bấm "Lưu" trên 66-DS có toast "Lưu quyết định thành công" (người dùng xác nhận),
 * nhưng bảng trên tab "Chuẩn bị xét xử" vẫn 0 dòng. Ở sơ thẩm cũng từng vậy: 48-DS nằm ở tab
 * "Xét xử" chứ không phải tab vừa lập.
 *
 *   $env:QLA_HO_SO_ENV="staging"; $env:QLA_VAI="chanhAnPhucThamHanhChinh"
 *   npx playwright test tests/kinh-doanh-thuong-mai/do-tab-phuc-tham.spec.ts
 */
import { test } from '@playwright/test';
import { choHetSpin, nghi } from '../../common/antd';
import { moTab } from '../../common/bieu-mau';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';

const ID = process.env.QLA_ID || '91e32606-9997-42f8-9844-54d54b40bdd4';

test('do-tab-phuc-tham · dòng quyết định nằm tab nào', async ({ browser }, testInfo) => {
  testInfo.setTimeout(15 * 60_000);
  const { page, context } = await moTrangVaiCauHinh(
    browser,
    testInfo,
    process.env.QLA_VAI || 'chanhAnPhucThamHanhChinh',
  );

  await page.goto(`quan-ly-phuc-tham/dan-su/chi-tiet?id=${ID}&tab=thu-ly`, {
    waitUntil: 'domcontentloaded',
  });
  await choHetSpin(page);
  // Ép dải tab render xong rồi mới đọc — đọc ngay sau khi tải thì danh sách tab rỗng
  await moTab(page, 'Chuẩn bị xét xử').catch(() => {});
  await nghi(page, 1500, 2000);

  const tenTab = [
    ...new Set(
      await page
        .locator('.ant-tabs-tab, [role="tab"]')
        .evaluateAll(ds => ds.map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)),
    ),
  ];
  console.log(`\n═══ TAB CỦA VỤ ÁN PHÚC THẨM (${tenTab.length}) ═══\n  ` + tenTab.join('\n  '));

  for (const tab of tenTab) {
    const xong = await moTab(page, tab).then(() => true).catch(() => false);
    if (!xong) continue;
    await choHetSpin(page);
    await nghi(page, 1500, 2200);
    const hang = (await page.locator('.ant-table-row').allInnerTexts())
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    console.log(`\n── TAB "${tab}" · ${hang.length} dòng`);
    for (const h of hang.slice(0, 6)) console.log('   · ' + h.slice(0, 200));
  }

  await context.close();
});
