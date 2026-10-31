import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { chuaChu } from '../../../base.page';
import { TrangThai1A1, VuNguon } from '../cau-hinh-1A1';
import { ngay, ngayLamViec } from '../../../../utils/fake-data';
import { moVuAn } from './chung';

/**
 * BƯỚC 08 · Quyết định đưa vụ án ra xét xử sơ thẩm, ký logic
 * (nút "Tạo bản án" ở bước 09 chỉ mở khi đã có quyết định này)
 *
 *  1. Tab "Chuẩn bị xét xử" → nút "Quyết định đưa vụ án ra xét xử" → popup "… ra xét xử sơ thẩm"
 *  2. Ngày quyết định = hôm nay · "Dùng số" · Người ký = chủ tài khoản (thường đã chọn sẵn)
 *  3. "Chọn lịch xét xử" → ô ngày hôm nay (Chủ nhật → thứ Hai) → form "Thêm lịch xét xử (mở phiên tòa)":
 *     "Cả ngày", "Xét xử công khai", địa điểm ngẫu nhiên → "Tạo mới" (trùng phòng xử vẫn đồng ý)
 *  4. Vật chứng → "Lưu" → "Ký logic" → "Đóng"
 */
export const buoc08: Buoc<VuNguon, TrangThai1A1> = {
  so: 8,
  ten: 'Quyết định đưa vụ án ra xét xử sơ thẩm, lịch xét xử, ký logic',
  huongDan: 'bổ sung',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    const m = await moVuAn(await moPhien(tk), can('urlVuAn', 2));
    await m.moTab('chuan-bi-xet-xu');

    // Lượt trước đã lập quyết định → đọc lại số (ngày xét xử lấy ở state lượt trước, không có thì lấy ngày quyết định)
    const muc = await m.moMuc('Quyết định tố tụng');
    await m.choBang(muc);
    const daCo = muc.locator('.ant-table-row').filter({ hasText: 'Quyết định đưa vụ án ra xét xử' }).first();
    if (await daCo.count()) {
      const dong = (await daCo.innerText()).replace(/\s+/g, ' ');
      if (!/Đã ký/.test(dong)) throw new Error(`Quyết định đưa vụ án ra xét xử đã lập nhưng chưa ký — ký tay hoặc xóa rồi chạy lại: ${dong}`);
      return {
        soQDXetXu: dong.match(/(\d+)\/\d{4}\/QĐXXST/)?.[1] ?? '',
        ngayXetXu: tt.ngayXetXu ?? dong.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] ?? ngayLamViec(),
      };
    }

    await m.nut(m.page.locator('main'), 'Quyết định đưa vụ án ra xét xử').click();
    const bm = m.popup('Quyết định đưa vụ án ra xét xử sơ thẩm');
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    await m.ngay(bm, 'Ngày quyết định', ngay(0));
    const oSo = m.oTheoNhan('Số quyết định', bm).locator('input').first();
    await m.nut(bm, /Dùng số/).click();
    await expect(oSo, 'Bấm "Dùng số" nhưng ô "Số quyết định" vẫn trống').not.toHaveValue('', { timeout: 10_000 });
    const oKy = m.oTheoNhan('Người ký', bm);
    if (tk.ten && !(await oKy.locator('.ant-select-selection-item').filter({ hasText: tk.ten }).count())) await m.chonTrong(oKy, chuaChu(tk.ten));

    // Chọn lịch xét xử (lịch tháng): bấm ô ngày → form "Thêm lịch xét xử (mở phiên tòa)"
    const ngayXetXu = ngayLamViec();
    await m.nut(bm, 'Chọn lịch xét xử').click();
    const lich = m.popup('Chọn lịch xét xử cho vụ án');
    await lich.waitFor({ timeout: 30_000 });
    await m.choTaiXong();
    const mauNgay = new RegExp(`^\\s*0?${Number(ngayXetXu.slice(0, 2))}\\s*$`);
    // Ngày thuộc tháng đang xem; thứ Hai rơi sang tháng sau thì là ô "off-range" cuối lưới
    let oNgay = lich.locator('.rbc-date-cell:not(.rbc-off-range)').filter({ hasText: mauNgay }).first();
    if (!(await oNgay.count())) oNgay = lich.locator('.rbc-date-cell.rbc-off-range').filter({ hasText: mauNgay }).last();
    await oNgay.click();

    // Ngày đã có lịch của vụ thì bấm chỉ CHỌN lịch đó, không mở form tạo
    const formLich = m.popup('Thêm lịch xét xử (mở phiên tòa)');
    if (await formLich.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false)) {
      await m.choTaiXong();
      const caNgay = formLich.locator('#caNgay');
      if (!(await caNgay.isChecked())) await caNgay.check();
      await m.chon(formLich, 'Tính chất phiên tòa', /công khai/i);
      await m.chon(formLich, 'Địa điểm xét xử');
      const chiTiet = m.oTheoNhan('Địa điểm xét xử (chi tiết)', formLich);
      if (await chiTiet.isVisible().catch(() => false)) await chiTiet.locator('input').fill('Hội trường xét xử lưu động');
      // "Tạo mới" chính là nút lưu của form lịch
      await m.nut(formLich, 'Tạo mới').click();
      await m.dongYTatCaXacNhan();
      await formLich.waitFor({ state: 'hidden', timeout: 30_000 });
    }
    await lich.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => undefined);
    await expect(
      bm.locator('.ant-table').filter({ hasText: 'Ngày mở phiên tòa' }).locator('.ant-table-row').first(),
      'Chọn lịch xong nhưng bảng "Lịch xét xử" vẫn trống',
    ).toBeVisible({ timeout: 30_000 });

    const vatChung = m.oTheoNhan(/Vật chứng cần đưa ra xét xử/, bm).locator('textarea').first();
    if (!(await vatChung.inputValue())) await vatChung.fill('Không có vật chứng');

    await m.nut(bm, 'Lưu').click();
    await m.choThongBao(/Lưu quyết định thành công/);
    const soQD = await oSo.inputValue();
    const nutKy = m.nut(bm, 'Ký logic');
    await nutKy.waitFor({ timeout: 30_000 });
    await nutKy.click();
    await m.choThongBao(/Ký logic thành công/);
    await m.nut(bm, 'Đóng').click();
    await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    return { soQDXetXu: soQD, ngayXetXu };
  },
};
