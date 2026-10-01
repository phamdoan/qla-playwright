/**
 * ĐO TẠM: cấu trúc LỚP của biểu mẫu 66-DS (phúc thẩm).
 *
 * Vì sao: bước 20 điền/lưu rơi vào khoảng không — nghi `bm` neo sai lớp. Đo thẳng: sau khi chọn
 * 66-DS trong menu, liệt kê MỌI lớp đang mở kèm thẻ, tiêu đề, số ô `.ant-form-item` và nút.
 *
 *   $env:QLA_HO_SO_ENV="staging"; $env:QLA_VAI="chanhAnPhucThamHanhChinh"
 *   npx playwright test tests/kinh-doanh-thuong-mai/do-66ds.spec.ts
 */
import { test } from '@playwright/test';
import { choHetSpin, hienTrong, nghi } from '../../common/antd';
import { moTab } from '../../common/bieu-mau';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';

const ID = process.env.QLA_ID || '91e32606-9997-42f8-9844-54d54b40bdd4';

test('do-66ds · cấu trúc lớp của biểu mẫu 66-DS', async ({ browser }, testInfo) => {
  testInfo.setTimeout(10 * 60_000);
  const { page, context } = await moTrangVaiCauHinh(
    browser,
    testInfo,
    process.env.QLA_VAI || 'chanhAnPhucThamHanhChinh',
  );

  await page.goto(`quan-ly-phuc-tham/dan-su/chi-tiet?id=${ID}&tab=thu-ly`, { waitUntil: 'domcontentloaded' });
  await choHetSpin(page);
  await moTab(page, 'Chuẩn bị xét xử');
  await choHetSpin(page);
  await nghi(page, 1500, 2000);

  // Tên trợ năng của nút KHÁC chữ hiển thị → lọc theo TEXT, và neo hai đầu để không trúng
  // header khối ("Quyết định Thêm mới quyết định 0").
  const nut = page.locator('button').filter({ hasText: /^\s*Thêm mới quyết định\s*$/ }).first();
  if (!(await hienTrong(nut, 15_000))) {
    const ds = [
      ...new Set(
        (await page.getByRole('button').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean),
      ),
    ];
    console.log('(không thấy nút "Thêm mới quyết định"). Nút đang có: ' + ds.join(' | '));
    await context.close();
    return;
  }
  await nut.click();
  await choHetSpin(page);
  await nghi(page, 900, 1400);

  const muc = page.getByRole('menuitem', { name: /66-DS/i }).first();
  if (!(await hienTrong(muc, 8_000))) {
    const ds = (await page.getByRole('menuitem').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
    console.log('(menu không có 66-DS). Menu: ' + ds.slice(-10).join(' | '));
    await context.close();
    return;
  }
  await muc.click();
  await choHetSpin(page);
  await nghi(page, 2500, 3500);

  const lop = page.locator('.ant-modal-content, .ant-drawer-content');
  const so = await lop.count();
  console.log(`\n═══ LỚP ĐANG CÓ (${so}) ═══`);
  for (let i = 0; i < so; i++) {
    const e = lop.nth(i);
    const hien = await e.isVisible().catch(() => false);
    const cls = (await e.getAttribute('class').catch(() => '')) || '';
    const chu = (await e.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 110);
    const soO = await e.locator('.ant-form-item').count();
    const nutLop = (await e.getByRole('button').allInnerTexts().catch(() => []))
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    console.log(
      `  [${i}] hiện=${hien} · ô=${soO} · class=${cls.slice(0, 60)}\n` +
        `      nút: ${nutLop.slice(0, 10).join(' | ') || '(không)'}\n` +
        `      chữ: ${chu}`,
    );
  }

  await context.close();
});
