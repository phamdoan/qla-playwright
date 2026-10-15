/**
 * ĐO TẠM: bản đồ TAB của màn chi tiết vụ án sơ thẩm KDTM (`vu-an/dan-su/so-tham/chi-tiet`).
 *
 * Mục đích: biết CHÍNH XÁC mỗi tab có khối nào, danh mục biểu mẫu nào, nút thao tác nào — trước
 * khi viết bước 11 (48-DS biên bản phiên tòa, 51-DS biên bản nghị án) và bước 12 (bản án 52-DS).
 * ĐO 30/09/2026: tab "Xét xử" CHỈ có "Giấy triệu tập đương sự" và "Tài liệu khác".
 *
 * Chạy: npx playwright test tests/kinh-doanh-thuong-mai/do-tab-xet-xu.spec.ts
 */
import { test } from '@playwright/test';
import { choHetSpin, nghi } from '../../common/antd';
import { moTab } from '../../common/bieu-mau';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';

const ID = process.env.QLA_ID || 'd9d4fb63-229b-4ab2-8a7a-6a9539148c58';

test('do-tab-xet-xu · bản đồ tab của màn chi tiết vụ án sơ thẩm', async ({ browser }, testInfo) => {
  testInfo.setTimeout(15 * 60_000);
  const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'chanhAn');

  await page.goto(`vu-an/dan-su/so-tham/chi-tiet?id=${ID}&tab=thong-tin-chung`, {
    waitUntil: 'domcontentloaded',
  });
  await choHetSpin(page);
  await moTab(page, 'Xét xử'); // ép dải tab render xong rồi mới đọc tên

  const tenTab = [
    ...new Set(
      await page
        .locator('.ant-tabs-tab, [role="tab"]')
        .evaluateAll(ds => ds.map(el => (el.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)),
    ),
  ];
  console.log(`\n═══ TAB CỦA MÀN CHI TIẾT (${tenTab.length}) ═══\n  ` + tenTab.join('\n  '));

  for (const tab of tenTab) {
    console.log(`\n\n╔══════ TAB: ${tab} ══════`);
    const xong = await moTab(page, tab)
      .then(() => true)
      .catch((e: Error) => {
        console.log(`  (không mở được: ${e.message.slice(0, 90)})`);
        return false;
      });
    if (!xong) continue;
    await choHetSpin(page);
    await nghi(page, 1200, 1600);

    const khoi = page.locator('.ant-collapse-item, .ant-card');
    const so = await khoi.count();
    for (let i = 0; i < so; i++) {
      const tieuDe = (
        await khoi.nth(i).locator('.ant-collapse-header, .ant-card-head').first().innerText().catch(() => '')
      )
        .replace(/\s+/g, ' ')
        .trim();
      const nut = (await khoi.nth(i).getByRole('button').allInnerTexts().catch(() => []))
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      console.log(`  ║ [${i}] ${tieuDe || '(không tiêu đề)'}`);
      if (nut.length) console.log(`  ║      nút: ${nut.join(' | ')}`);

      const oChonLoai = khoi
        .nth(i)
        .locator('.ant-select')
        .filter({ hasText: /Chọn loại|Chọn biểu mẫu/i })
        .locator('[role="combobox"]')
        .first();
      if (!(await oChonLoai.count())) continue;
      await oChonLoai.click({ force: true });
      await nghi(page, 900, 1300);
      const muc = (
        await page
          .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
          .allInnerTexts()
      )
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      console.log(`  ║      biểu mẫu (${muc.length}): ${muc.join(' | ') || '(rỗng)'}`);
      await page.keyboard.press('Escape');
      await nghi(page, 300, 500);
    }
  }

  await context.close();
});
