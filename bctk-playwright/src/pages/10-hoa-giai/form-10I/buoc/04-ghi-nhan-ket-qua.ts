import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai10I } from '../cau-hinh-10I';
import { moChiTietDon } from './chung';

/**
 * BƯỚC 04 · Ghi nhận kết quả lựa chọn đối thoại (hướng dẫn b3, ý cuối)
 *
 *  1. Mở chi tiết đơn → tab "Hòa giải" → mục "Kết quả lựa chọn hòa giải của đương sự"
 *  2. "Ghi nhận" ở cột Thao tác → popup → Kết quả lựa chọn "Đồng ý" → "Lưu kết quả"
 */
export const buoc04: Buoc<DonNguon, TrangThai10I> = {
  so: 4,
  ten: 'Ghi nhận kết quả lựa chọn đối thoại "Đồng ý"',
  huongDan: 'b3',
  chay: async ({ vuAn, moPhien, tkToa, can, tt }) => {
    const urlDon = can('urlDon', 1);
    const tk = tkToa(vuAn.toaAn);
    const m = await moChiTietDon(await moPhien(tk), urlDon);
    await m.moTab('hoa-giai-doi-thoai');
    const main = m.page.locator('main');

    // Bảng kết quả (có cột "Hòa giải viên lựa chọn"); còn nút "Ghi nhận" thì chưa ghi nhận
    const bangKQ = main.locator('.ant-table-wrapper').filter({ hasText: 'Hòa giải viên lựa chọn' }).first();
    await m.choBang(bangKQ);
    const choGhiNhan = bangKQ.locator('.ant-table-row').filter({ has: m.page.getByText('Ghi nhận', { exact: true }) }).first();
    let ketQuaLuaChon = tt.ketQuaLuaChon ?? 'Đồng ý';
    if (await choGhiNhan.count()) {
      await choGhiNhan.getByText('Ghi nhận', { exact: true }).click();
      const bm = m.popup(/Ghi nhận kết quả lựa chọn/);
      await bm.waitFor({ timeout: 30_000 });
      await m.choTaiXong();
      ketQuaLuaChon = await m.chon(bm, 'Kết quả lựa chọn', 'Đồng ý');
      await m.nut(bm, 'Lưu kết quả').click();
      await m.choThongBao(/Thành công/);
      await bm.waitFor({ state: 'hidden', timeout: 15_000 });
    }
    return { ketQuaLuaChon };
  },
};
