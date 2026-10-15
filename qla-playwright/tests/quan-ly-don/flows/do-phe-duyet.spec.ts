/**
 * DÒ (CHỈ ĐỌC): hộp "Phê duyệt đề xuất" của một vai có đúng đề xuất mình cần không.
 *
 *   QLA_VAI=phoChanhAn QLA_KHOA=98ab5658-... npm run don:do-phe-duyet
 *
 * Vì sao cần: bước 28 báo 'Không thấy đề xuất "Tờ trình" của vụ này ở cả "Chờ duyệt" lẫn "Đã duyệt"'
 * dù bước 27 đã trình thành công và sinh khoá. Đã sửa hai nguyên nhân khả dĩ (đọc sai khoá, tên loại
 * văn bản khác môi trường) mà vẫn không thấy — nên phải XEM hộp duyệt thực sự có gì, thay vì vá tiếp
 * theo phỏng đoán.
 *
 * In ra: các TAB kèm số lượng · toàn bộ DÒNG của tab đang mở · có dòng nào mang khoá / số bản án
 * cần tìm không. KHÔNG bấm duyệt, KHÔNG ký.
 */
import { test } from '@playwright/test';
import { choHetSpin, nghi } from '../../../common/antd';
import { moTrangVaiCauHinh } from '../../../common/luong-tkm';
import { PheDuyetPage } from '../../../pages/phe-duyet.page';

const CAT = (s: unknown, n = 170) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

test('dò · hộp Phê duyệt đề xuất của một vai', async ({ browser }, testInfo) => {
  testInfo.setTimeout(20 * 60_000);
  const vai = process.env.QLA_VAI || 'phoChanhAn';
  const khoa = (process.env.QLA_KHOA || '').trim();
  const soBanAn = (process.env.QLA_SO_BA || '').trim();

  const { page } = await moTrangVaiCauHinh(browser, testInfo, vai);
  const pd = new PheDuyetPage(page);
  await pd.mo();
  await choHetSpin(page);
  await nghi(page, 1500, 2500);

  console.log(`\n→ Vai: ${vai}\n   URL: ${page.url()}`);
  console.log(`   tìm khoá: ${khoa || '(không khai)'} · số bản án: ${soBanAn || '(không khai)'}\n`);

  console.log('TAB (▶ = đang chọn):');
  const tabs = page.getByRole('tab');
  for (let i = 0; i < (await tabs.count()); i++) {
    const t = tabs.nth(i);
    const chon = (await t.getAttribute('aria-selected')) === 'true';
    console.log(`   ${chon ? '▶' : ' '} ${CAT(await t.innerText().catch(() => ''), 60)}`);
  }

  /** Đọc dòng của tab hiện tại; tô ★ nếu khớp khoá hoặc số bản án */
  const doc = async (nhan: string) => {
    await choHetSpin(page);
    await nghi(page, 1200, 1800);
    const dong = page.locator('.ant-table-row:visible');
    const n = await dong.count();
    console.log(`\n── ${nhan}: ${n} dòng`);
    for (let i = 0; i < Math.min(n, 15); i++) {
      const chu = CAT(await dong.nth(i).innerText().catch(() => ''));
      const trung = (khoa && chu.includes(khoa)) || (soBanAn && chu.includes(soBanAn));
      console.log(`   ${trung ? '★' : '·'} ${chu}`);
    }
    if (n > 15) console.log(`   … còn ${n - 15} dòng`);
    if (!n) console.log('   (rỗng)');
  };

  await doc('TAB ĐANG MỞ');

  // Mỗi tab một lượt — đề xuất có thể nằm ở tab khác với tab mặc định
  for (const ten of [/^Chờ duyệt/, /^Đã duyệt/, /^Tất cả/]) {
    const t = page.getByRole('tab', { name: ten }).first();
    if (!(await t.count())) {
      console.log(`\n── tab ${ten.source}: KHÔNG có trên màn này`);
      continue;
    }
    await t.click().catch(() => undefined);
    await doc(`TAB ${CAT(await t.innerText().catch(() => ten.source), 40)}`);
  }

  console.log(
    '\nCÁCH ĐỌC: không dòng nào có ★ ở bất kỳ tab nào → đề xuất KHÔNG ở hộp của vai này, tức bước\n' +
      'trước đã trình cho người khác. Có ★ ở tab mà mã không tìm → sai bộ chọn/tab, không phải sai vai.\n' +
      '⚠ Spec này KHÔNG bấm duyệt, KHÔNG ký.\n',
  );
});
