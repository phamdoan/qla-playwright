/**
 * ĐO TẠM: biên bản phiên tòa sơ thẩm (48-DS) đã lập có những ô nào, ô nào còn trống?
 *
 * Vì sao hỏi: 48-DS đã "Hoàn thành" nhưng khối "Lịch sử mở phiên tòa" vẫn ghi
 * "Số lần mở phiên tòa = 0", "Kết quả xét xử = Chưa có kết quả", nên nút "Tạo bản án" bị khoá và
 * 51-DS không xuất hiện trong danh mục. Nghi 48-DS còn ô bắt buộc chưa điền (ngày mở phiên tòa,
 * kết quả phiên tòa…) mà kịch bản chỉ điền phần nội dung.
 *
 *   $env:QLA_HO_SO_ENV="staging"; npx playwright test tests/kinh-doanh-thuong-mai/do-48ds.spec.ts
 */
import { test } from '@playwright/test';
import { choHetSpin, hienTrong, moTaForm, nghi } from '../../common/antd';
import { bieuMauDangMo, moTab } from '../../common/bieu-mau';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';

const ID = process.env.QLA_ID || 'd9d4fb63-229b-4ab2-8a7a-6a9539148c58';

test('do-48ds · liệt kê nút của biểu mẫu đang chờ ký', async ({ browser }, testInfo) => {
  testInfo.setTimeout(10 * 60_000);
  const { page, context } = await moTrangVaiCauHinh(browser, testInfo, process.env.QLA_VAI || 'chanhAn');

  await page.goto(`vu-an/dan-su/so-tham/chi-tiet?id=${ID}&tab=thong-tin-chung`, {
    waitUntil: 'domcontentloaded',
  });
  await moTab(page, process.env.QLA_TAB || 'Chuẩn bị xét xử');
  await choHetSpin(page);
  await nghi(page, 1500, 2000);

  console.log('vai:', process.env.QLA_VAI || 'chanhAn');
  const dong = page.locator('.ant-table-row').filter({ hasText: new RegExp(process.env.QLA_DONG || "đưa vụ án ra xét xử", "i") }).first();
  const mat = dong.getByRole('img', { name: 'eye' }).first();
  if (!(await hienTrong(mat, 10_000))) {
    console.log('(không thấy dòng 48-DS hoặc icon xem)');
    await context.close();
    return;
  }
  await mat.click();
  await choHetSpin(page);
  await nghi(page, 1500, 2000);

  const bm = bieuMauDangMo(page);
  console.log('\n═══ Ô CỦA BIỂU MẪU 48-DS ═══');
  for (const d of await moTaForm(bm)) console.log('  · ' + d);

  const nut = (await bm.getByRole('button').allInnerTexts())
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  console.log('\n═══ NÚT TRÊN BIỂU MẪU ═══\n  ' + nut.join(' | '));

  const chu = (await bm.innerText()).replace(/\s+/g, ' ');
  console.log('\n═══ CHỮ TRÊN BIỂU MẪU (1200 ký tự đầu) ═══\n  ' + chu.slice(0, 1200));

  await context.close();
});
