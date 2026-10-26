import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { TrangThai1B, VuAnNguon, cauHinh1B } from '../cau-hinh-1B';
import { ngayLamViec } from '../../../../utils/fake-data';
import { batDauBang, trinhKy } from './chung';

/**
 * BƯỚC 09 · Tòa phúc thẩm · Quyết định đưa vụ án ra xét xử, trình ký (hướng dẫn 5.3)
 *
 *  1. Mở vụ án phúc thẩm → tab "Chuẩn bị xét xử" › "Quyết định tố tụng" › "Quyết định đưa vụ án ra xét xử"
 *  2. Người ký = chủ tọa (ô này chỉ liệt kê thẩm phán Tòa phúc thẩm — người dùng chốt 16/10/2026)
 *  3. "Chọn lịch xét xử" → ngày hôm nay (Chủ nhật → thứ Hai) → form "Thêm lịch xét xử": "Cả ngày",
 *     "Xét xử công khai", địa điểm ngẫu nhiên (+ địa điểm chi tiết nếu là phòng xử lưu động) → "Tạo mới"
 *     (trùng lịch vẫn đồng ý)
 *  4. "Lưu" → "Trình ký" → "Gửi"
 */
export const buoc09: Buoc<VuAnNguon, TrangThai1B> = {
  so: 9,
  ten: 'Tòa phúc thẩm · Quyết định đưa vụ án ra xét xử, trình ký',
  huongDan: '5.3',
  chay: async ({ moPhien, tkToa, can }) => {
    const phien = await moPhien(tkToa(can('toaPhucTham', 4)));
    await phien.vao(can('urlVuAn', 5));
    const m = new ManHinh(phien.page);
    await m.moTab('chuan-bi-xet-xu');

    // Lượt trước đã lập quyết định → đọc người ký từ bảng "Quyết định tố tụng"
    const muc = await m.moMuc('Quyết định tố tụng');
    await m.choBang(muc);
    const daCo = muc.locator('.ant-table-row').filter({ hasText: 'Quyết định đưa vụ án ra xét xử' }).first();
    if (await daCo.count()) return { nguoiKyQuyetDinh: await m.docCot(daCo, 'Người ký') };

    await m.nut(m.page, 'Quyết định đưa vụ án ra xét xử').click();
    const bm = m.popup('Quyết định đưa vụ án ra xét xử phúc thẩm');
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();
    await m.chon(bm, 'Người ký/người phân công', batDauBang(can('chuToa', 7)));

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
      if (await chiTiet.isVisible().catch(() => false)) await chiTiet.locator('input').fill(cauHinh1B.diaDiemXetXuChiTiet);
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
    await m.choThongBao(/Lưu quyết định thành công/);
    return { nguoiKyQuyetDinh: await trinhKy(m, bm) };
  },
};
