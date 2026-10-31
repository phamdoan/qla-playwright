import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { TrangThai1B, VuAnNguon } from '../cau-hinh-1B';
import { ngay, ngayLamViec } from '../../../../utils/fake-data';
import { batDauBang, dungSo, kyLogicVaDong } from './chung';

/**
 * BƯỚC 08 · Tòa phúc thẩm · Quyết định đưa vụ án ra xét xử, ký logic (hướng dẫn bước 8)
 *
 *  1. Mở vụ án phúc thẩm → tab "Chuẩn bị xét xử" › "Quyết định tố tụng" › "Quyết định đưa vụ án ra xét xử"
 *  2. "Dùng số" · ngày quyết định = hôm nay · Người ký = người của tài khoản tòa phúc thẩm (vd. Nguyễn Xuân Kỳ)
 *     để ký logic ngay trên biểu mẫu
 *  3. "Chọn lịch xét xử" → ngày hôm nay (Chủ nhật → thứ Hai) → form "Thêm lịch xét xử": "Cả ngày",
 *     "Xét xử công khai", địa điểm ngẫu nhiên (+ địa điểm chi tiết nếu là phòng xử lưu động) → "Tạo mới"
 *     (trùng lịch vẫn đồng ý)
 *  4. "Lưu" → "Ký logic" → "Đóng"
 */
export const buoc08: Buoc<VuAnNguon, TrangThai1B> = {
  so: 8,
  ten: 'Tòa phúc thẩm · Quyết định đưa vụ án ra xét xử, ký logic',
  huongDan: '8',
  chay: async ({ moPhien, tkToa, can }) => {
    const tk = tkToa(can('toaPhucTham', 4));
    const phien = await moPhien(tk);
    await phien.vao(can('urlVuAn', 5));
    const m = new ManHinh(phien.page);
    await m.moTab('chuan-bi-xet-xu');

    // Lượt trước đã lập quyết định → đọc số từ bảng "Quyết định tố tụng"
    const muc = await m.moMuc('Quyết định tố tụng');
    await m.choBang(muc);
    const daCo = muc.locator('.ant-table-row').filter({ hasText: 'Quyết định đưa vụ án ra xét xử' }).first();
    if (await daCo.count()) return { soQuyetDinhXetXu: await m.docCot(daCo, 'Số').catch(() => '') };

    await m.nut(m.page, 'Quyết định đưa vụ án ra xét xử').click();
    const bm = m.popup('Quyết định đưa vụ án ra xét xử phúc thẩm');
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();
    await dungSo(m, bm);
    const oNgayQD = m.oTheoNhan('Ngày quyết định', bm);
    if (!(await oNgayQD.locator('input').first().inputValue().catch(() => ''))) await m.ngay(bm, 'Ngày quyết định', ngay(0));
    // Người ký = chủ tài khoản đang đăng nhập → bấm "Ký logic" ngay trên biểu mẫu được
    if (!tk.ten) throw new Error(`Taikhoan.xlsx: tài khoản ${tk.taiKhoan} (${tk.toaAn}) thiếu cột "Tên" — cần để chọn người ký`);
    await m.chon(bm, 'Người ký/người phân công', batDauBang(tk.ten));

    // Chọn lịch xét xử (lịch tháng): bấm ô ngày → form "Thêm lịch xét xử (mở phiên tòa)"
    await m.nut(bm, 'Chọn lịch xét xử').click();
    const lich = m.popup('Chọn lịch xét xử cho vụ án');
    await lich.waitFor({ timeout: 30_000 });
    await m.choTaiXong();
    const soNgay = Number(ngayLamViec().slice(0, 2));
    const mauNgay = new RegExp(`^\\s*0?${soNgay}\\s*$`);
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
      if (await chiTiet.isVisible().catch(() => false)) await chiTiet.locator('input').fill('Phòng xử án lưu động');
      // "Tạo mới" chính là nút lưu của form lịch
      await m.nut(formLich, 'Tạo mới').click();
      await m.dongYTatCaXacNhan();
      await formLich.waitFor({ state: 'hidden', timeout: 30_000 });
    }
    await lich.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => undefined);
    await expect(
      bm.locator('.ant-table').filter({ hasText: 'Ngày mở phiên tòa' }).locator('.ant-table-row').first(),
      'Chọn lịch xong nhưng bảng "Thời gian & địa điểm phiên tòa" vẫn trống',
    ).toBeVisible({ timeout: 30_000 });

    await m.nut(bm, 'Lưu').click();
    await m.choThongBao(/Lưu quyết định thành công|thành công/i);
    const soQuyetDinhXetXu = (await m.oTheoNhan('Số', bm).locator('input').first().inputValue().catch(() => '')) || '';
    await kyLogicVaDong(m, bm);
    return { soQuyetDinhXetXu };
  },
};
