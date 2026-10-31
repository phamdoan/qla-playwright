import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai5A } from '../cau-hinh-5A';
import { ngay, ngayLamViec } from '../../../../utils/fake-data';
import { O_BIEU_MAU, chonNguoiKy, daCoBieuMau, dungSo, luuKyBieuMau, moBieuMau, moVuAn, popup } from './chung';

/**
 * BƯỚC 10 · Quyết định đưa vụ án ra xét xử (47A-DS) (hướng dẫn bước 10)
 *
 *  1. Tab "Chuẩn bị xét xử" → ô chọn biểu mẫu gõ "47" → "Thêm biểu mẫu"
 *  2. Ngày quyết định = hôm nay · "Dùng số" · Người ký = chủ tài khoản
 *  3. "Chọn lịch xét xử" → ô ngày làm việc gần nhất → "Thêm lịch xét xử (mở phiên tòa)":
 *     "Cả ngày" · "Xét xử công khai" · địa điểm ngẫu nhiên → "Tạo mới" (trùng phòng xử vẫn đồng ý)
 *  4. "Lưu" → "Ký logic" → "Đóng"
 */
export const buoc10: Buoc<DonNguon, TrangThai5A> = {
  so: 10,
  ten: 'Quyết định đưa vụ án ra xét xử (47A-DS), lịch xét xử, ký logic',
  huongDan: '10',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    const m = await moVuAn(await moPhien(tk), can('urlVuAn', 6));
    await m.moTab('chuan-bi-xet-xu');
    if (await daCoBieuMau(m, /47A?-DS/)) return { soQDXetXu: tt.soQDXetXu, ngayXetXu: tt.ngayXetXu ?? ngayLamViec() };

    const bm = await moBieuMau(m, O_BIEU_MAU.chuanBi, '47', 'Thêm biểu mẫu');
    await m.ngay(bm, 'Ngày quyết định', ngay(0));
    const soQDXetXu = await dungSo(m, bm, 'Số quyết định');
    if (tk.ten) await chonNguoiKy(m, bm, tk.ten);

    // Lịch tháng: bấm ô ngày → form "Thêm lịch xét xử (mở phiên tòa)"
    const ngayXetXu = ngayLamViec();
    await m.nut(bm, 'Chọn lịch xét xử').click();
    const lich = popup(m, /Chọn lịch xét xử/);
    await lich.waitFor({ timeout: 30_000 });
    await m.choTaiXong();
    // Lịch có lúc mở ở tháng khác (Đơn 02 chọn nhầm 29/09) → về tháng hiện tại trước khi bấm ô ngày
    const nutHomNay = lich.locator('button').filter({ hasText: /^\s*(Hôm nay|Today)\s*$/ }).first();
    if (await nutHomNay.isVisible().catch(() => false)) {
      await nutHomNay.click();
      await m.choTaiXong(800);
    }
    const mauNgay = new RegExp(`^\\s*0?${Number(ngayXetXu.slice(0, 2))}\\s*$`);
    // Ngày thuộc tháng đang xem; rơi sang tháng sau thì là ô "off-range" cuối lưới
    let oNgay = lich.locator('.rbc-date-cell:not(.rbc-off-range)').filter({ hasText: mauNgay }).first();
    if (!(await oNgay.count())) oNgay = lich.locator('.rbc-date-cell.rbc-off-range').filter({ hasText: mauNgay }).last();
    await oNgay.click();

    // Ngày đã có lịch của vụ thì bấm chỉ CHỌN lịch đó, không mở form tạo
    const formLich = popup(m, 'Thêm lịch xét xử (mở phiên tòa)');
    if (await formLich.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false)) {
      await m.choTaiXong();
      const caNgay = formLich.locator('#caNgay');
      if ((await caNgay.count()) && !(await caNgay.isChecked())) await caNgay.check();
      await m.chon(formLich, 'Tính chất phiên tòa', /công khai/i);
      await m.chon(formLich, 'Địa điểm xét xử');
      // "Phòng xử lưu động" bắt buộc nhập thêm địa điểm chi tiết
      const chiTiet = m.oTheoNhan('Địa điểm xét xử (chi tiết)', formLich);
      if (await chiTiet.isVisible().catch(() => false)) await chiTiet.locator('input').fill('Hội trường xét xử lưu động');
      await m.nut(formLich, 'Tạo mới').click();
      await m.dongYTatCaXacNhan();
      await formLich.waitFor({ state: 'hidden', timeout: 30_000 });
    }
    await lich.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => undefined);
    await expect(bm.getByText(ngayXetXu).first(), `Chọn lịch xong nhưng chưa thấy ngày xét xử ${ngayXetXu} trong quyết định`).toBeVisible({ timeout: 30_000 });

    await luuKyBieuMau(m, bm);
    return { soQDXetXu, ngayXetXu };
  },
};
