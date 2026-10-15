/**
 * ĐO TẠM: nhánh menu "Kinh doanh và thương mại" có những mục con nào?
 *
 * Vì sao hỏi: màn "Hồ sơ vụ án chuyển đi" của nhánh Dân sự
 * (`vu-an/dan-su/so-tham/ho-so-chuyen-di`) KHÔNG chứa vụ KDTM — tra cả tab "Tất cả (97)" cũng
 * không có. Cần biết nhánh KDTM có màn chuyển đi riêng hay không.
 *
 *   $env:QLA_HO_SO_ENV="staging"; $env:QLA_VAI="chanhAnDanSu"
 *   npx playwright test tests/kinh-doanh-thuong-mai/do-menu-kdtm.spec.ts
 */
import { test } from '@playwright/test';
import { choHetSpin, hienTrong, nghi } from '../../common/antd';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';

const MUC = '[role="menuitem"], .ant-menu-item, .ant-menu-submenu-title';

test('do-menu-kdtm · mục con của nhánh Kinh doanh và thương mại', async ({ browser }, testInfo) => {
  testInfo.setTimeout(10 * 60_000);
  const { page, context } = await moTrangVaiCauHinh(browser, testInfo, process.env.QLA_VAI || 'chanhAnDanSu');

  await page.goto('', { waitUntil: 'domcontentloaded' });
  await choHetSpin(page);
  await nghi(page, 1500, 2000);

  const doc = async (nhan: string) => {
    const ds = [
      ...new Set(
        await page
          .locator(MUC)
          .evaluateAll(els => els.map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)),
      ),
    ];
    console.log(`\n═══ ${nhan} (${ds.length}) ═══\n  ` + ds.join('\n  '));
  };

  await doc('MENU LÚC ĐẦU');

  for (const ten of ['Kinh doanh và thương mại', 'Quản lý sơ thẩm']) {
    const muc = page.locator(MUC).filter({ hasText: ten }).first();
    if (!(await hienTrong(muc, 10_000))) {
      console.log(`(không thấy mục "${ten}")`);
      break;
    }
    await muc.click();
    await choHetSpin(page);
    await nghi(page, 1200, 1800);
    await doc(`SAU KHI BẤM "${ten}" · URL: ${page.url()}`);
  }

  // Soi màn danh sách sơ thẩm KDTM: có tab/nút chuyển hồ sơ lên phúc thẩm không?
  await page.goto('vu-an/kinh-doanh-thuong-mai/so-tham/danh-sach', { waitUntil: 'domcontentloaded' });
  await choHetSpin(page);
  await nghi(page, 2000, 2500);
  const tab = [
    ...new Set(
      await page
        .locator('[role="tab"], .ant-tabs-tab')
        .evaluateAll(e => e.map(x => (x.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)),
    ),
  ];
  const nut = [
    ...new Set((await page.getByRole('button').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean)),
  ];
  console.log('\n═══ DANH SÁCH SƠ THẨM KDTM ═══');
  console.log('  tab: ' + tab.join(' | '));
  console.log('  nút: ' + nut.slice(0, 20).join(' | '));

  await context.close();
});
