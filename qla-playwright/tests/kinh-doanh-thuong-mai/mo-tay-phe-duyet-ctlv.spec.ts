/**
 * MỞ TAY · HÀNG CHỜ PHÊ DUYỆT CỦA CHÁNH ÁN — không phải bước của flow, KHÔNG bấm Phê duyệt/Ký.
 *
 * Trả lời một câu: **Chương trình làm việc HĐXX của case-001 (bản án phúc thẩm số 12, nguyên đơn
 * Thái Minh Thắng) đang ở đâu trong hàng chờ, và dòng nào là của nó?**
 *
 * Vì sao cần: bước 42 của case-001 không neo được văn bản. Sổ cái không có id (bước 41 của lượt đó
 * thấy "Chờ duyệt" nên bỏ qua trình ký, chỉ ghi `gdtKhoaChuongTrinh = "đã trình · 12"`), mà dòng trong
 * hàng chờ KHÔNG hiện số bản án lẫn tên đương sự — chỉ "Chương trình làm việc của HĐXX | người tạo |
 * thời điểm". Kịch bản dừng thay vì đoán, vì đoán là duyệt lên văn bản của vụ khác.
 *
 *   npm run gdt:mo-tay-ctlv
 *
 * Màn in ra:
 *  1. Số dòng từng tab (Chờ duyệt / Đã duyệt) và TẤT CẢ các trang.
 *  2. Riêng các dòng "Chương trình làm việc", kèm số thứ tự trang/dòng để bạn bấm vào đúng dòng.
 *  3. Dừng ở `page.pause()`: bạn mở từng dòng, xem bên trong có số bản án 12 / Thái Minh Thắng không.
 *     Biết dòng nào là của case-001 thì nói id/vị trí, tôi neo bước 42 theo id đó.
 *
 * Biến môi trường: QLA_MO_TAY=1 (npm script đặt sẵn) · QLA_VAI=<vai, mặc định chanhAn>
 *   QLA_LOC=<chuỗi>  đổi loại văn bản cần soi (mặc định "Chương trình làm việc")
 */
import { test } from '@playwright/test';
import { choHetSpin, nghi } from '../../common/antd';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';
import { PheDuyetPage } from '../../pages/phe-duyet.page';

test('mo-tay CTLV · liệt kê hàng chờ phê duyệt rồi dừng cho người dùng xem', async ({ browser }, testInfo) => {
  test.skip(process.env.QLA_MO_TAY !== '1', 'Chỉ chạy khi QLA_MO_TAY=1');
  testInfo.setTimeout(60 * 60_000);

  const vai = process.env.QLA_VAI || 'chanhAn';
  const loc = process.env.QLA_LOC || 'Chương trình làm việc';
  const { page } = await moTrangVaiCauHinh(browser, testInfo, vai);
  const pd = new PheDuyetPage(page);
  await pd.mo();
  await choHetSpin(page);
  await nghi(page, 1500, 2200);
  console.log(`\n→ Vai: ${vai} · lọc theo: "${loc}"\n   ${page.url()}`);

  for (const tenTab of ['Chờ duyệt', 'Đã duyệt']) {
    const tab = page.getByRole('tab', { name: new RegExp(`^${tenTab}`) }).first();
    if (!(await tab.isVisible().catch(() => false))) {
      console.log(`\n=== TAB "${tenTab}": không thấy tab này với vai ${vai}`);
      continue;
    }
    await tab.click().catch(() => undefined);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await nghi(page, 1200, 1800);
    console.log(`\n=== TAB "${tenTab}" ===`);
    const khop: string[] = [];
    for (let trang = 1; trang <= 20; trang++) {
      const ds = await page
        .locator('.ant-table-row:visible')
        .allInnerTexts()
        .catch(() => []);
      ds.forEach((t, i) => {
        const chu = t.replace(/\s+/g, ' ').trim();
        if (chu.includes(loc)) khop.push(`trang ${trang} · dòng ${i + 1}: ${chu.slice(0, 180)}`);
      });
      console.log(`   trang ${trang}: ${ds.length} dòng`);
      const sau = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)').first();
      if (!(await sau.isVisible().catch(() => false))) break;
      await sau.click().catch(() => undefined);
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await nghi(page, 1000, 1500);
    }
    console.log(`   → dòng khớp "${loc}": ${khop.length}`);
    for (const d of khop) console.log(`     · ${d}`);
  }

  console.log(
    '\nCẦN KIỂM: mở từng dòng "Chương trình làm việc của HĐXX" → bên trong có số bản án 12 ' +
      '(hoặc nguyên đơn Thái Minh Thắng) không? Dòng nào là của case-001?\n' +
      '  ⚠ CHỈ XEM — đừng bấm Phê duyệt ở đây nếu chưa chắc là vụ của case-001.\n',
  );
  await page.pause();
});
