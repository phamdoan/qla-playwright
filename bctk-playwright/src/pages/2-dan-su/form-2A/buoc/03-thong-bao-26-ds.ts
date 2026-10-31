import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai2A } from '../cau-hinh-2A';
import { ngay } from '../../../../utils/fake-data';
import { chonMenu, chonNguoiKy, dungSo, kyTiepNeuChuaKy, luuKyDong, moChiTietDon, moMucKhop, popup } from './chung';

/**
 * BƯỚC 03 · Thông báo yêu cầu sửa đổi, bổ sung đơn khởi kiện 26-DS (hướng dẫn B9.1–B9.4)
 *
 *  1. Tab "Kết quả xử lý" → mục "Chưa đủ điều kiện" (sau này đổi tên "Đủ điều kiện thụ lý") → "Thêm thông báo" › "… (26-DS)"
 *  2. Lý do xử lý "Thiếu nội dung bắt buộc khác của đơn khởi kiện" (hướng dẫn ghi "Đơn khởi kiện thiếu nội dung
 *     theo quy định" — danh sách trên màn không có mục này, đây là mục gần nhất) · Hạn sửa đổi, bổ sung = hôm nay
 *     · Nội dung yêu cầu và Căn cứ pháp lý hệ thống tự điền theo lý do
 *  3. "Dùng số" dưới ô Số thông báo → "Lưu" → "Ký logic" → "Đóng"
 */
export const buoc03: Buoc<DonNguon, TrangThai2A> = {
  so: 3,
  ten: 'Thông báo yêu cầu sửa đổi, bổ sung đơn khởi kiện (26-DS)',
  huongDan: 'B9.1–B9.4',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    const m = await moChiTietDon(await moPhien(tk), can('urlDon', 1));
    await m.moTab('ket-qua-xu-ly');
    // Tiêu đề mục là "Chưa đủ điều kiện", đơn đủ điều kiện thì đổi thành "Đủ điều kiện thụ lý"
    const muc = await moMucKhop(m, /^\s*(Chưa đủ|Đủ) điều kiện/);

    // Lượt trước đã lập 26-DS → đọc lại số
    const dong26 = muc.locator('tbody tr').filter({ hasText: '26-DS' }).first();
    if (await dong26.isVisible().catch(() => false)) {
      // Lưu mà chưa ký → mở sửa, ký nốt
      const soDaKy = await kyTiepNeuChuaKy(m, dong26, /Yêu cầu sửa đổi, bổ sung đơn khởi kiện/, 'Số thông báo', tk.ten);
      return { soTB26: soDaKy ?? (await dong26.innerText()).replace(/\s+/g, ' ').match(/26-DS\S*\s+(\S+)/)?.[1] ?? '' };
    }

    await chonMenu(m, muc, 'Thêm thông báo', '26-DS');
    const bm = popup(m, 'Yêu cầu sửa đổi, bổ sung đơn khởi kiện (26-DS)');
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    if (tk.ten) await chonNguoiKy(m, bm, tk.ten);
    await m.chon(bm, 'Lý do xử lý', 'Thiếu nội dung bắt buộc khác của đơn khởi kiện');
    await m.ngay(bm, 'Hạn sửa đổi, bổ sung', ngay(0));
    const soTB26 = await dungSo(m, bm, 'Số thông báo');
    await luuKyDong(m, bm);
    return { soTB26 };
  },
};
