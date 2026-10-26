import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { TrangThai1B, VuAnNguon } from '../cau-hinh-1B';
import { khoiDon, moVuAnSoTham } from './chung';

/**
 * BƯỚC 02 · Tòa sơ thẩm · Duyệt (hướng dẫn 3)
 *
 *  1. Mở vụ án sơ thẩm → tab "Kết quả sơ thẩm" › "Kháng cáo, kháng nghị"
 *  2. Dòng đơn/quyết định "Chờ xử lý" → nút "Duyệt" ở cột Thao tác
 *  3. Popup xác nhận → "Duyệt"
 */
export const buoc02: Buoc<VuAnNguon, TrangThai1B> = {
  so: 2,
  ten: 'Tòa sơ thẩm · Duyệt',
  huongDan: '3',
  chay: async ({ vuAn, moPhien, tkToa }) => {
    const m = new ManHinh((await moPhien(tkToa(vuAn.toaAn))).page);
    const vu = await moVuAnSoTham(m, vuAn.maVuAn);
    if (vu.daChuyenPhucTham) return;

    const choDuyet = (await khoiDon(m, vuAn.luong)).locator('.ant-table-row').filter({ hasText: 'Chờ xử lý' }).first();
    if (!(await choDuyet.count())) return; // đã duyệt ở lượt trước

    await m.nut(choDuyet, 'Duyệt').click();
    const xacNhan = m.page.locator('.ant-popover:visible').last();
    await m.nut(xacNhan, 'Duyệt').click();
    await m.choThongBao(/thành công/i);
    await m.choTaiXong();
  },
};
