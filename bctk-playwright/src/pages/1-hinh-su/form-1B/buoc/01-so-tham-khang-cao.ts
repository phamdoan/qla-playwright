import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { TrangThai1B, VuAnNguon } from '../cau-hinh-1B';
import { hoTen, ngay, so8 } from '../../../../utils/fake-data';
import { khoiDon, moVuAnSoTham } from './chung';

/**
 * BƯỚC 01 · Tòa sơ thẩm · Thêm đơn kháng cáo / quyết định kháng nghị (hướng dẫn bước 1)
 *
 *  1. Đăng nhập tài khoản tòa sơ thẩm (cột "Tòa án sơ thẩm") → mở vụ án theo cột "Link vụ án"
 *  2. Tab "Kết quả sơ thẩm" › mục "Kháng cáo, kháng nghị"
 *  3. Luồng "Kháng cáo" — khối "Đơn kháng cáo" › Thêm mới: ngày tiếp nhận / kháng cáo = hôm nay · số tiếp nhận
 *     · Trực tiếp tại tòa · Bị cáo · người kháng cáo · Kháng cáo toàn bộ bản án
 *     · tick "Kháng cáo đề nghị thay đổi điều khoản áp dụng"
 *     Luồng "Kháng nghị" — khối "Quyết định kháng nghị" › Thêm mới: ngày tiếp nhận · số tiếp nhận · Trực tiếp tại tòa
 *     · Viện kiểm sát cùng địa bàn tòa sơ thẩm · tên người kháng nghị · số kháng nghị · ngày kháng nghị
 *     · người bị kháng nghị · tick "Toàn bộ bản án"
 *  4. "Lưu mới"
 * Vụ đã chuyển phúc thẩm, hoặc khối đã có đơn/quyết định (lượt trước) → bỏ qua.
 */
export const buoc01: Buoc<VuAnNguon, TrangThai1B> = {
  so: 1,
  ten: 'Tòa sơ thẩm · Thêm kháng cáo / kháng nghị',
  huongDan: '1',
  chay: async ({ vuAn, moPhien, tkToa }) => {
    const vu = await moVuAnSoTham(await moPhien(tkToa(vuAn.toaAn)), vuAn.urlVuAnSoTham);
    const m: ManHinh = vu.m;
    const ketQua = { luong: vuAn.luong, tenVuAn: vu.tenVuAn, maDinhDanh: vu.maDinhDanh };

    const khoi = await khoiDon(m, vuAn.luong);
    if (vu.daChuyenPhucTham || (await khoi.locator('.ant-table-row').count()) > 0) return ketQua;

    const homNay = ngay(0);
    await m.nut(khoi, 'Thêm mới').click();

    if (vuAn.luong === 'khang-cao') {
      const d = m.popup('Thêm mới quyết định kháng cáo');
      await d.waitFor({ timeout: 30_000 });
      await m.choTaiXong();
      await m.ngay(d, 'Ngày tiếp nhận', homNay);
      await m.nhap(d, 'Số tiếp nhận', so8());
      await m.chon(d, 'Hình thức tiếp nhận', 'Trực tiếp tại tòa');
      await m.ngay(d, 'Ngày kháng cáo', homNay);
      // Vai trò phải chọn trước: danh sách "Tên người kháng cáo" lọc theo vai trò
      await m.chon(d, 'Vai trò tố tụng', 'Bị cáo');
      await m.page.waitForTimeout(800);
      await m.chon(d, 'Tên người kháng cáo');
      await m.page.waitForTimeout(800);
      // "Kháng cáo đối với bị can, bị cáo" tự điền theo người kháng cáo; trống thì chọn một người
      if (!(await m.docGiaTri('Kháng cáo đối với', d))) await m.chon(d, 'Kháng cáo đối với');
      await m.chon(d, 'Phạm vi kháng cáo', 'Kháng cáo toàn bộ bản án');
      await m.tichO(d, 'Kháng cáo đề nghị thay đổi điều khoản áp dụng');
      await m.nut(d, 'Lưu mới').click();
      await m.choThongBao(/thành công/i);
      await d.waitFor({ state: 'hidden', timeout: 30_000 });
    } else {
      const d = m.popup('Thêm mới quyết định kháng nghị');
      await d.waitFor({ timeout: 30_000 });
      await m.choTaiXong();
      await m.ngay(d, 'Ngày tiếp nhận', homNay);
      await m.nhap(d, 'Số tiếp nhận', so8());
      await m.chon(d, 'Hình thức tiếp nhận', 'Trực tiếp tại tòa');
      // Viện kiểm sát cùng địa bàn: "Tòa án nhân dân khu vực 9 - Hà Nội" → "Viện kiểm sát nhân dân khu vực 9 - Hà Nội"
      const vks = vuAn.toaAn.replace(/^Tòa án/, 'Viện kiểm sát');
      const cacVks = await m.cacLuaChon(d, 'Đơn vị kháng nghị');
      await m.chon(d, 'Đơn vị kháng nghị', cacVks.includes(vks) ? vks : undefined);
      await m.nhap(d, 'Tên người kháng nghị', hoTen());
      await m.nhap(d, 'Số kháng nghị', so8());
      await m.ngay(d, 'Ngày kháng nghị', homNay);
      await m.chon(d, 'Người bị kháng nghị');
      await m.tichO(d, 'Toàn bộ bản án');
      await m.nut(d, 'Lưu mới').click();
      await m.choThongBao(/thành công/i);
      await d.waitFor({ state: 'hidden', timeout: 30_000 });
    }
    await m.choTaiXong();
    return ketQua;
  },
};
