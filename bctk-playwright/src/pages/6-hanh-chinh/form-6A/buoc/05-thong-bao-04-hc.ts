import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai6A } from '../cau-hinh-6A';
import { chonMenu, chonNguoiKy, dungSo, luuKyDong, moChiTietDon, popup } from './chung';

/**
 * BƯỚC 05 · Thông báo nộp tiền tạm ứng án phí 04-HC (hướng dẫn B9.13–B9.16)
 *  (hướng dẫn ghi mẫu 29-DS của dân sự; đơn hành chính dùng mẫu 04-HC cùng tên)
 *
 *  1. Tab "Kết quả xử lý" → mục "Thông báo tạm ứng án phí và chi phí tố tụng" → "Thêm thông báo" › "Thông báo nộp tiền tạm ứng án phí (Dành cho Thẩm phán được phân công)(04-HC)"
 *  2. Người ký = chủ tài khoản (mặc định là Thẩm phán được phân công → đổi lại)
 *     · Người khởi kiện phải nộp, số tiền, cơ quan thi hành án hệ thống tự điền — giữ nguyên
 *  3. "Dùng số" dưới ô Số thông báo → "Lưu" → "Ký logic" → "Đóng"
 */
export const buoc05: Buoc<DonNguon, TrangThai6A> = {
  so: 5,
  ten: 'Thông báo nộp tiền tạm ứng án phí (04-HC)',
  huongDan: 'B9.13–B9.16',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    const m = await moChiTietDon(await moPhien(tk), can('urlDon', 1));
    await m.moTab('ket-qua-xu-ly');
    const muc = await m.moMuc('Thông báo tạm ứng án phí và chi phí tố tụng');

    // Lượt trước đã ban hành → đọc lại số (cột thứ 3: Số thông báo)
    const dong = muc.locator('tbody tr').filter({ hasText: /tạm ứng án phí/i }).first();
    if (await dong.isVisible().catch(() => false)) {
      return { soTB29: (await dong.locator('td').nth(2).innerText()).trim() };
    }

    await chonMenu(m, muc, 'Thêm thông báo', '04-HC');
    const bm = popup(m, '(04-HC)');
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    if (tk.ten) await chonNguoiKy(m, bm, tk.ten);
    const soTB29 = await dungSo(m, bm, 'Số thông báo');
    await luuKyDong(m, bm);
    return { soTB29 };
  },
};
