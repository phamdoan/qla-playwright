/**
 * Sửa đơn ĐÃ TẠO: Xử lý đơn → "Thụ lý đơn" = "Thụ lý mới" rồi "Lưu thông tin" (nút "Sửa" ở Danh sách đơn).
 * Thụ lý qua giao diện để máy chủ cấp số/ngày thụ lý — không sửa thẳng DB.
 *
 *   QLA_SUA_ID_DON=<id đơn> node tools/chay-ui.js daotao --ghi --cli --file=sua-thu-ly-don
 */
import { expect, test } from '@playwright/test';
import { ORIGIN } from '../../../playwright.config';
import { choPhepGhiTKM, credentialsTKM } from '../../../account';
import { loginSSO } from '../../../common/login';
import { choHetSpin, chonSelect } from '../../../common/antd';
import { ThemMoiDonPage } from '../../../pages/them-moi-don.page';

const ID_DON = process.env.QLA_SUA_ID_DON || '';

test.use({ storageState: { cookies: [], origins: [] } });

test(`sửa đơn ${ID_DON || '(chưa đặt QLA_SUA_ID_DON)'} · Thụ lý đơn = Thụ lý mới`, async ({ page }) => {
  test.setTimeout(10 * 60_000);
  test.skip(!ID_DON, 'Thiếu QLA_SUA_ID_DON');
  test.skip(!choPhepGhiTKM(), 'Chế độ chỉ đọc — chạy với --ghi');

  const tk = credentialsTKM();
  if (!tk) throw new Error('Thiếu QLA_TKM_USER trong .env của môi trường');
  await loginSSO(page, tk.user, { pass: tk.pass });

  await page.goto(`${ORIGIN}/qla/quan-ly-don/them-moi/${ID_DON}`);
  await choHetSpin(page);
  const oThuLy = page.locator('#thongTinChuyenDonVO_trangThaiThuLyDon');
  await expect(oThuLy, 'Không mở được form sửa đơn (thiếu ô "Thụ lý đơn")').toBeVisible({ timeout: 60_000 });

  const trang = new ThemMoiDonPage(page);
  // QLA_SUA_DON_VI: đổi "Đơn vị chuyển đến" (từ khoá trong tên Vụ, vd "kinh doanh, thương mại") TRƯỚC khi chọn thụ lý
  const donVi = process.env.QLA_SUA_DON_VI;
  if (donVi) {
    const o = page.locator('#thongTinChuyenDonVO_maDonViChuyenDenNoiBo');
    const daChon = await chonSelect(page, o, donVi);
    console.log(`    · đơn vị chuyển đến: ${daChon}`);
  }
  console.log(`    · thụ lý đơn: ${await trang.chonThuLyMoi()}`);

  const kq = await trang.bamLuu();
  expect(kq.ok, `Lưu thông tin không thành công: ${kq.ok ? '' : kq.loi}`).toBe(true);
  console.log('    · đã lưu: Thụ lý đơn = Thụ lý mới');

  // Đọc lại sau khi tải lại trang: giá trị phải còn là "Thụ lý mới"
  await page.reload();
  await choHetSpin(page);
  await expect(oThuLy.locator('xpath=ancestor::div[contains(@class,"ant-select")][1]')).toContainText('Thụ lý mới', {
    timeout: 60_000,
  });
  const soThuLy = await page.locator('#thongTinChuyenDonVO_soThuLy').inputValue().catch(() => '');
  const ngayThuLy = await page.locator('#thongTinChuyenDonVO_ngayThuLy').inputValue().catch(() => '');
  console.log(`    · đọc lại: Thụ lý mới · số thụ lý ${soThuLy || '(trống)'} · ngày thụ lý ${ngayThuLy || '(trống)'}`);
});
