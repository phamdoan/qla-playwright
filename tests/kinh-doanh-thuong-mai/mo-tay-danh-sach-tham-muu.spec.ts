/**
 * MỞ TAY · DANH SÁCH THAM MƯU VỤ XÉT XỬ GĐT — chỉ XEM, không bấm Lưu/Trình ký/Duyệt gì cả.
 *
 * Trả lời một câu: **danh sách vụ xét xử của case-001 (bản án 12) có bị danh sách của case-002
 * (bản án 13) ghi đè không?**
 *
 * Vì sao hỏi: 03/10/2026 lọc số bản án 12 ở màn này ra 0 dòng, hôm 02/10 vẫn còn. Hai vụ cùng NGÀY bản
 * án 16/10/2026, mà `ModalTaoDSVuXetXu.handleLuu` khi cập nhật thì THAY TOÀN BỘ `danhSachIdVuAn`
 * (qla-webapp .../ModalTaoDSVuXetXu/index.tsx:747,758) → dùng chung một lịch xét xử là vụ sau đẩy vụ
 * trước ra khỏi danh sách.
 *
 *   npm run gdt:mo-tay-tham-muu
 *
 * Màn in ra, cho TỪNG số bản án (mặc định 12 rồi 13):
 *  1. Số dòng tìm được và TRỌN chữ của từng dòng (chủ toạ, kháng nghị, số/ngày bản án, trạng thái).
 *  2. Với dòng đầu tiên tìm được: mở chi tiết và in MỌI dòng bảng bên trong — tức danh sách vụ án
 *     thật sự nằm trong hội đồng đó. Đây mới là câu trả lời: bên trong là vụ 12, vụ 13, hay cả hai.
 *  3. Dừng ở `page.pause()` để bạn tự xem thêm; bấm Resume trên thanh Playwright khi xong.
 *
 * Biến môi trường: QLA_MO_TAY=1 (npm script đặt sẵn) · QLA_VAI (mặc định vuTruongDanSu)
 *   QLA_SO=12,13   danh sách số bản án cần soi, phân cách bằng dấu phẩy
 */
import { test } from '@playwright/test';
import { choHetSpin, go, nghi } from '../../common/antd';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';

const CAT = (s: string, n = 300) => s.replace(/\s+/g, ' ').trim().slice(0, n);

test('mo-tay tham mưu · soi danh sách vụ xét xử theo số bản án', async ({ browser }, testInfo) => {
  test.skip(process.env.QLA_MO_TAY !== '1', 'Chỉ chạy khi QLA_MO_TAY=1');
  testInfo.setTimeout(60 * 60_000);

  const vai = process.env.QLA_VAI || 'vuTruongDanSu';
  const dsSo = (process.env.QLA_SO || '12,13').split(',').map(s => s.trim()).filter(Boolean);
  const { page } = await moTrangVaiCauHinh(browser, testInfo, vai);
  console.log(`\n→ Vai: ${vai} · soi số bản án: ${dsSo.join(', ')}`);

  for (const so of dsSo) {
    await page.goto('vu-an/gdt-tt/quan-ly-vu-xet-xu/tham-muu');
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await nghi(page, 1500, 2200);

    // Ô lọc của màn này: name="soBanAnQuyetDinh", placeholder "Nhập số BA/QĐ"
    // (qla-webapp PhanCongHDXX/index.tsx · truongTimKiemBaQd)
    const oSo = page
      .locator('input[id="soBanAnQuyetDinh"], input[id$="_soBanAnQuyetDinh"]')
      .first()
      .or(page.getByPlaceholder(/Nhập số BA\/QĐ/i).first())
      .first();
    if (!(await oSo.isVisible().catch(() => false))) {
      console.log(`\n=== SỐ ${so}: không thấy ô lọc "Số BA/QĐ" trên màn — URL ${page.url()}`);
      continue;
    }
    await go(oSo, so);
    await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
    await choHetSpin(page);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await nghi(page, 1500, 2500);

    console.log(`\n=== SỐ BẢN ÁN "${so}" ===`);
    const dong = page.locator('.ant-table-row:visible');
    const tong = await dong.count();
    console.log(`   tìm được ${tong} dòng`);
    for (let i = 0; i < tong; i++) console.log(`   · dòng ${i + 1}: ${CAT(await dong.nth(i).innerText().catch(() => ''))}`);
    if (!tong) continue;

    // Mở chi tiết dòng đầu để xem DANH SÁCH VỤ ÁN bên trong hội đồng
    const mat = dong.first().locator('button, a').filter({ has: page.locator('[aria-label="eye"]') }).first();
    if (!(await mat.isVisible().catch(() => false))) {
      console.log('   (dòng không có icon mắt để mở chi tiết)');
      continue;
    }
    await mat.scrollIntoViewIfNeeded().catch(() => {});
    await mat.click({ force: true }).catch(() => undefined);
    await choHetSpin(page);
    await nghi(page, 2500, 3500);
    console.log(`   → CHI TIẾT (${page.url()})`);
    const ben = page.locator('.ant-modal:visible .ant-table-row, .ant-drawer-open .ant-table-row, .ant-table-row:visible');
    const soBen = await ben.count();
    console.log(`     bảng bên trong có ${soBen} dòng:`);
    for (let i = 0; i < Math.min(soBen, 25); i++) console.log(`     · ${CAT(await ben.nth(i).innerText().catch(() => ''), 220)}`);
  }

  console.log(
    '\nCẦN KIỂM: hội đồng "Hội đồng toàn thể · Chủ toạ Nguyễn Văn Quảng" chứa vụ nào — bản án 12, 13, ' +
      'hay cả hai? Nếu chỉ còn 13 thì danh sách của case-001 đã bị ghi đè (dùng chung lịch xét xử).\n' +
      '  ⚠ CHỈ XEM — đừng bấm Lưu/Trình ký ở popup này, bấm Lưu là ghi đè tiếp.\n',
  );
  await page.pause();
});
