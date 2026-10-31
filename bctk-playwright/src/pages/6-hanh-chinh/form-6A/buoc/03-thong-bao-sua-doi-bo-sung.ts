import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai6A } from '../cau-hinh-6A';
import { ngay } from '../../../../utils/fake-data';
import { chonMenu, chonNguoiKy, dungSo, kyTiepNeuChuaKy, luuKyDong, moChiTietDon, moMucKhop, popup } from './chung';

/**
 * BƯỚC 03 · Thông báo yêu cầu sửa đổi, bổ sung đơn khởi kiện hành chính (hướng dẫn B9.1–B9.4)
 *  (hướng dẫn ghi mẫu 26-DS của dân sự; đơn hành chính dùng mẫu "Thông báo yêu cầu sửa đổi, bổ sung đơn khởi kiện hành chính")
 *
 *  1. Tab "Kết quả xử lý" → mục "Chưa đủ điều kiện" (sau này đổi tên "Đủ điều kiện thụ lý") → "Thêm thông báo" › "Thông báo yêu cầu sửa đổi, bổ sung đơn khởi kiện hành chính"
 *  2. Lý do xử lý "Đơn khởi kiện thiếu nội dung theo quy định" (theo hướng dẫn; danh sách không có thì lấy mục gần nhất
 *     "Thiếu nội dung bắt buộc khác…" / mục đầu có chữ "thiếu nội dung") · Hạn sửa đổi, bổ sung = hôm nay
 *     · Nội dung yêu cầu và Căn cứ pháp lý hệ thống tự điền theo lý do
 *  3. "Dùng số" dưới ô Số thông báo → "Lưu" → "Ký logic" → "Đóng"
 */
export const buoc03: Buoc<DonNguon, TrangThai6A> = {
  so: 3,
  ten: 'Thông báo yêu cầu sửa đổi, bổ sung đơn khởi kiện hành chính',
  huongDan: 'B9.1–B9.4',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    const m = await moChiTietDon(await moPhien(tk), can('urlDon', 1));
    await m.moTab('ket-qua-xu-ly');
    // Tiêu đề mục là "Chưa đủ điều kiện", đơn đủ điều kiện thì đổi thành "Đủ điều kiện thụ lý"
    const muc = await moMucKhop(m, /^\s*(Chưa đủ|Đủ) điều kiện/);

    // Lượt trước đã lập thông báo → không lập lại (số đã lưu ở lượt trước); lưu mà chưa ký thì ký nốt
    const dongTB = muc.locator('tbody tr').filter({ hasText: /sửa đổi, bổ sung/i }).first();
    if (await dongTB.isVisible().catch(() => false)) {
      await kyTiepNeuChuaKy(m, dongTB, 'Thông báo yêu cầu sửa đổi, bổ sung đơn khởi kiện hành chính');
      return;
    }

    await chonMenu(m, muc, 'Thêm thông báo', 'yêu cầu sửa đổi, bổ sung đơn khởi kiện hành chính');
    const bm = popup(m, 'Thông báo yêu cầu sửa đổi, bổ sung đơn khởi kiện hành chính');
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    if (tk.ten) await chonNguoiKy(m, bm, tk.ten);
    const cacLyDo = await m.cacLuaChon(bm, 'Lý do xử lý');
    const lyDo = [/Đơn khởi kiện thiếu nội dung theo quy định/, /Thiếu nội dung bắt buộc khác/, /thiếu nội dung/i]
      .map(mau => cacLyDo.find(s => mau.test(s)))
      .find(Boolean);
    await m.chon(bm, 'Lý do xử lý', lyDo);
    await m.ngay(bm, 'Hạn sửa đổi, bổ sung', ngay(0));
    const soTB26 = await dungSo(m, bm, 'Số thông báo');
    await luuKyDong(m, bm);
    return { soTB26 };
  },
};
