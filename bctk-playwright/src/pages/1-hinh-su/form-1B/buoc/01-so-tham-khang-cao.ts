import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { TrangThai1B, VuAnNguon, cauHinh1B } from '../cau-hinh-1B';
import { hoTen, ngay, so8 } from '../../../../utils/fake-data';
import { khoiDon, moVuAnSoTham } from './chung';

/**
 * BƯỚC 01 · Tòa sơ thẩm · Thêm kháng cáo / kháng nghị (hướng dẫn 1–2.5)
 *
 *  1. Vụ việc › Hình sự › Quản lý án sơ thẩm › Vụ án sơ thẩm → tìm mã vụ án → mở vụ (phải "Đã xét xử")
 *  2. Tab "Kết quả sơ thẩm" › mục "Kháng cáo, kháng nghị"
 *  3. Luồng 1 — khối "Đơn kháng cáo" › Thêm mới: Trong hạn · ngày tiếp nhận/kháng cáo = hôm nay · số tiếp nhận 8 số
 *     · Trực tiếp tại tòa · Bị cáo · người kháng cáo ngẫu nhiên · Kháng cáo toàn bộ bản án · Kêu oan
 *     Luồng 2 — khối "Quyết định kháng nghị" › Thêm mới: ngày tiếp nhận · số tiếp nhận · Trực tiếp tại tòa
 *     · đơn vị kháng nghị · tên người kháng nghị · số kháng nghị · ngày kháng nghị · người bị kháng nghị · Toàn bộ bản án
 *  4. Tệp đính kèm → "Thêm mới" → "Lưu mới"
 */
export const buoc01: Buoc<VuAnNguon, TrangThai1B> = {
  so: 1,
  ten: 'Tòa sơ thẩm · Thêm kháng cáo / kháng nghị',
  huongDan: '1–2.5',
  chay: async ({ vuAn, moPhien, tkToa }) => {
    const m = new ManHinh((await moPhien(tkToa(vuAn.toaAn))).page);
    const vu = await moVuAnSoTham(m, vuAn.maVuAn);
    const ketQua = { luong: vuAn.luong, tenVuAn: vu.tenVuAn, maDinhDanh: vu.maDinhDanh };

    // Đã chuyển lên phúc thẩm, hoặc khối đã có đơn/quyết định (lượt trước) → không thêm nữa
    const khoi = await khoiDon(m, vuAn.luong);
    if (vu.daChuyenPhucTham || (await khoi.locator('.ant-table-row').count()) > 0) return ketQua;

    const homNay = ngay(0);
    await m.nut(khoi, 'Thêm mới').click();

    if (vuAn.luong === 'khang-cao') {
      const d = m.popup('Thêm mới quyết định kháng cáo');
      await d.waitFor({ timeout: 30_000 });
      await m.choTaiXong();
      await m.radio(d, 'Tình trạng thời hạn', 'Trong hạn');
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
      // "Yêu cầu kháng cáo" là nhóm checkbox; tích "Kêu oan" thì "Nội dung kháng cáo" tự điền
      await m.tichO(d, 'Kêu oan');
      if (!(await m.docGiaTri('Nội dung kháng cáo', d))) await m.nhap(d, 'Nội dung kháng cáo', 'Kêu oan');
      await m.dinhKemTep(d, cauHinh1B.fileDinhKem);
      await m.nut(d, 'Lưu mới').click();
      await m.choThongBao(/Thêm mới kháng cáo thành công/);
      await d.waitFor({ state: 'hidden', timeout: 30_000 });
    } else {
      const d = m.popup('Thêm mới quyết định kháng nghị');
      await d.waitFor({ timeout: 30_000 });
      await m.choTaiXong();
      await m.ngay(d, 'Ngày tiếp nhận', homNay);
      await m.nhap(d, 'Số tiếp nhận', so8());
      await m.chon(d, 'Hình thức tiếp nhận', 'Trực tiếp tại tòa');
      await m.chon(d, 'Đơn vị kháng nghị', cauHinh1B.donViKhangNghi);
      await m.nhap(d, 'Tên người kháng nghị', hoTen());
      await m.chon(d, 'Phạm vi kháng nghị', 'Kháng nghị toàn bộ bản án');
      await m.nhap(d, 'Số kháng nghị', so8());
      await m.ngay(d, 'Ngày kháng nghị', homNay);
      await m.chon(d, 'Người bị kháng nghị');
      // Nhóm checkbox "Yêu cầu kháng nghị" → "Toàn bộ bản án"
      await m.tichO(d, 'Toàn bộ bản án');
      if (!(await m.docGiaTri('Nội dung kháng nghị', d))) await m.nhap(d, 'Nội dung kháng nghị', 'Kháng nghị toàn bộ bản án');
      await m.dinhKemTep(d, cauHinh1B.fileDinhKem);
      await m.nut(d, 'Lưu mới').click();
      await m.choThongBao(/thành công/i);
      await d.waitFor({ state: 'hidden', timeout: 30_000 });
    }
    await m.choTaiXong();
    return ketQua;
  },
};
