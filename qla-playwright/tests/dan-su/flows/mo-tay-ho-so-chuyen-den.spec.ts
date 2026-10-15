/**
 * MỞ TAY · HỒ SƠ CHUYỂN ĐẾN (tòa phúc thẩm) — chỉ XEM, không bấm Tiếp nhận.
 *
 * Trả lời: vụ đã chuyển lên phúc thẩm có nằm trong hộp của tòa này không, và nằm ở tab nào?
 *
 * Bối cảnh: bước 16 của case-ds-004 báo "Tab Chờ tiếp nhận không có vụ VA26-005391". Hỏi API hộp hồ
 * sơ chuyển đến thì đúng là KHÔNG CÓ (0/238 bản ghi), trong khi case-ds-003 cùng điều kiện lại qua
 * được hai tiếng trước đó — chưa rõ vì sao (đo 03/10/2026).
 *
 *   npm run ds:mo-tay-chuyen-den
 *
 * Màn in ra: URL · hai hàng tab (loại hồ sơ + trạng thái) kèm tab nào đang chọn · THẺ LỌC còn sót ·
 * toàn bộ dòng của tab đang mở. Rồi dừng ở page.pause() cho bạn tự bấm.
 *
 * Biến môi trường: QLA_MO_TAY=1 (npm script đặt sẵn) · QLA_VAI (mặc định chanhAnPhucThamHanhChinh)
 *   QLA_MA_VU=VA26-005391  mã vụ cần tìm (chỉ để tô dấu ★, không gõ vào ô tìm)
 */
import { test } from '@playwright/test';
import { choHetSpin, nghi } from '../../../common/antd';
import { moTrangVaiCauHinh } from '../../../common/luong-tkm';

const CAT = (s: unknown, n = 150) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

test('mo-tay · hồ sơ chuyển đến của tòa phúc thẩm', async ({ browser }, testInfo) => {
  test.skip(process.env.QLA_MO_TAY !== '1', 'Chỉ chạy khi QLA_MO_TAY=1');
  testInfo.setTimeout(60 * 60_000);

  const maVu = process.env.QLA_MA_VU || 'VA26-005391';
  const vai = process.env.QLA_VAI || 'chanhAnPhucThamHanhChinh';
  const { page } = await moTrangVaiCauHinh(browser, testInfo, vai);

  await page.goto('vu-an/dan-su/phuc-tham/ho-so-phuc-tham');
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await choHetSpin(page);
  await nghi(page, 2000, 3000);

  console.log(`\n→ Vai: ${vai} · tìm vụ: ${maVu}\n   ${page.url()}`);

  console.log('\nTAB (hàng trên = loại hồ sơ, hàng dưới = trạng thái):');
  const tabs = page.getByRole('tab');
  for (let i = 0; i < (await tabs.count()); i++) {
    const t = tabs.nth(i);
    const dangChon = (await t.getAttribute('aria-selected')) === 'true';
    console.log(`   ${dangChon ? '▶' : ' '} ${CAT(await t.innerText().catch(() => ''), 50)}`);
  }

  // Thẻ lọc còn sót: màn giữ từ khoá thành thẻ "Tìm kiếm theo: <mã> ×", KHÔNG mất khi tải lại trang
  const the = await page
    .getByText(/Tìm kiếm theo/)
    .first()
    .locator('xpath=..')
    .innerText()
    .catch(() => '');
  console.log(`\nTHẺ LỌC đang áp: ${CAT(the, 120) || '(không có)'}`);

  const dong = page.locator('.ant-table-row:visible');
  const n = await dong.count();
  console.log(`\nDÒNG TRONG TAB ĐANG MỞ (${n}):`);
  for (let i = 0; i < n; i++) {
    const chu = CAT(await dong.nth(i).innerText().catch(() => ''), 150);
    console.log(`   ${chu.includes(maVu) ? '★' : '·'} ${chu}`);
  }
  if (!n) console.log('   (lưới rỗng — nếu có thẻ lọc ở trên thì gỡ thẻ rồi xem lại)');

  console.log(
    `\nCẦN KIỂM: bấm lần lượt "Vụ án dân sự" → "Chờ tiếp nhận" / "Đã tiếp nhận" / "Đã thụ lý", ` +
      `xem ${maVu} nằm ở tab nào. Nếu không ở đâu cả thì hồ sơ chưa sang tòa này.\n` +
      '  ⚠ CHỈ XEM — đừng bấm "Tiếp nhận" nếu chưa chắc.\n',
  );
  await page.pause();
});
