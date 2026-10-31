import { Locator, expect, test } from '@playwright/test';
import { ManHinh } from '../../../base.page';
import { ngay } from '../../../../utils/fake-data';
import { PhienDangNhap } from '../../../common/login.page';

/**
 * Thao tác màn hình DÙNG CHUNG cho nhiều bước của luồng 10C.
 * Thao tác riêng của bước nào nằm ngay trong file bước đó. Giao diện đổi → chỉ sửa trong thư mục buoc/.
 */

/**
 * "hòa giải" trên màn viết lúc "hòa" lúc "hoà" (dấu đặt khác nhau là KÝ TỰ khác nhau) → khớp cả hai.
 * vd. hoaGiai('Phân công Thẩm phán hòa giải') khớp cả "…hoà giải".
 */
export const hoaGiai = (chu: string) =>
  new RegExp(chu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/h(?:òa|oà)/gi, 'h(?:òa|oà)'), 'i');

/**
 * [Bước 05, 08] Ô đang HIỆN trong biểu mẫu theo nhãn. Biểu mẫu 06-HG còn các ô ẩn của phần nội dung văn bản trùng nhãn
 * (vd. "Phạm vi lựa chọn Hòa giải viên" ẩn có id …_TEN_TOA_AN_TRUC_THUOC) → m.oTheoNhan trúng ô ẩn, chọn mãi không được.
 */
export const oHien = (m: ManHinh, bm: Locator, nhan: RegExp) =>
  bm.locator('.ant-form-item:visible').filter({ has: m.page.locator('.ant-form-item-label', { hasText: nhan }) }).first();

/**
 * [Bước 05–08] Đơn đã kết thúc theo hướng khác (trả đơn, hòa giải/đối thoại không thành, không tiến hành…) — thường do
 * thao tác tay trên đơn của luồng → trả về chữ trạng thái ở đầu trang; còn đang xử lý → undefined.
 */
export async function ketThucKhac(m: ManHinh): Promise<string | undefined> {
  const dau = (await m.page.locator('main').innerText()).split('\n').slice(0, 8).join('\n');
  return dau.match(/^\s*(TRẢ ĐƠN|(?:HÒA GIẢI|HOÀ GIẢI|ĐỐI THOẠI) KHÔNG THÀNH|KHÔNG TIẾN HÀNH.*)\s*$/m)?.[1];
}

/**
 * [Bước 05, 06, 08] Số hiệu của văn bản đã ban hành trong bảng "Thông báo, quyết định, văn bản" (cuối tab Hòa giải);
 * chưa có văn bản → undefined. Dùng để bỏ qua phần đã làm khi chạy lại.
 */
export async function soVanBan(m: ManHinh, tenVanBan: RegExp): Promise<string | undefined> {
  const bang = m.page.locator('main .ant-table-wrapper').filter({ hasText: 'Số hiệu' }).filter({ hasText: 'Ngày ban hành' }).last();
  await m.choBang(bang);
  const dong = bang.locator('.ant-table-row').filter({ hasText: tenVanBan }).first();
  if (!(await dong.count())) return undefined;
  return (await m.docCot(dong, 'Số hiệu').catch(() => '')) || '-';
}

/**
 * [Bước 05, 06, 08] Phần chung của biểu mẫu quyết định / thông báo đang mở:
 * "Ngày quyết định" trống thì điền hôm nay → "Dùng số" (nút link dưới ô "Số quyết định") → "Lưu" → "Ký logic" → "Đóng".
 * `dienThem` điền các ô riêng của biểu mẫu (chạy sau "Dùng số", trước "Lưu"). Trả về số quyết định đã dùng.
 */
export async function lapBieuMauKyLogic(m: ManHinh, bm: Locator, dienThem?: () => Promise<void>): Promise<string> {
  const oNgay = oHien(m, bm, /^\s*\*?\s*Ngày quyết định/).locator('.ant-picker input').first();
  if ((await oNgay.count()) && !(await oNgay.inputValue())) {
    await oNgay.click();
    await oNgay.fill(ngay());
    await oNgay.press('Enter');
    await m.page.waitForTimeout(300);
  }
  const oSo = oHien(m, bm, /^\s*\*?\s*Số quyết định/).locator('input').first();
  const nutDungSo = m.nut(bm, /Dùng số/);
  if (await nutDungSo.isVisible().catch(() => false)) {
    await nutDungSo.click();
    await expect(oSo, 'Bấm "Dùng số" nhưng ô "Số quyết định" vẫn trống').not.toHaveValue('', { timeout: 10_000 });
  } else {
    test.info().annotations.push({ type: 'Dùng số', description: 'Không thấy nút "Dùng số" dưới ô "Số quyết định"' });
  }
  if (dienThem) await dienThem();
  const so = await oSo.inputValue().catch(() => '');

  await m.nut(bm, 'Lưu').click();
  await m.choThongBao(/^(?!Upload).*thành công/i); // bỏ qua "Upload thành công" khi mẫu có tải tệp
  const nutKy = m.nut(bm, /Ký logic/);
  await nutKy.waitFor({ timeout: 30_000 });
  await nutKy.click();
  await m.dongYTatCaXacNhan();
  await m.choThongBao(/Ký logic thành công/);
  await m.nut(bm, 'Đóng').click();
  await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  await m.choTaiXong(1500);
  return so;
}

/** [Bước 02, 03, 04] Mở chi tiết đơn theo link (bước 01 để lại) và chờ trang vẽ xong */
export async function moChiTietDon(phien: PhienDangNhap, urlDon: string): Promise<ManHinh> {
  const m = new ManHinh(phien.page);
  // Trang 404 / trang trống → mở Dashboard rồi vào lại link đến khi hiện giao diện
  await phien.vaoCho(urlDon, m.page.locator('[role=tab][id$="-tab-thong-tin-chung"]'));
  await m.choTaiXong(1500);
  return m;
}
