import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai2A } from '../cau-hinh-2A';
import { chonMenu, chonNguoiKy, dungSo, kyTiepNeuChuaKy, luuKyDong, moChiTietDon, popup } from './chung';

/**
 * BƯỚC 05 · Thông báo nộp tiền tạm ứng án phí 29-DS (hướng dẫn B9.13–B9.16)
 *
 *  1. Tab "Kết quả xử lý" → mục "Thông báo tạm ứng án phí và chi phí tố tụng" → "Thêm thông báo" › "… (29-DS)"
 *  2. Người ký = chủ tài khoản (mặc định là Thẩm phán được phân công → đổi lại)
 *     · Người khởi kiện phải nộp, số tiền, cơ quan thi hành án hệ thống tự điền — giữ nguyên
 *  3. "Dùng số" dưới ô Số thông báo → "Lưu" → "Ký logic" → "Đóng"
 */
export const buoc05: Buoc<DonNguon, TrangThai2A> = {
  so: 5,
  ten: 'Thông báo nộp tiền tạm ứng án phí (29-DS)',
  huongDan: 'B9.13–B9.16',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    const m = await moChiTietDon(await moPhien(tk), can('urlDon', 1));
    await m.moTab('ket-qua-xu-ly');
    const muc = await m.moMuc('Thông báo tạm ứng án phí và chi phí tố tụng');

    // Lượt trước đã ban hành → đọc lại số (cột thứ 3: Số thông báo)
    const dong = muc.locator('tbody tr').filter({ hasText: /tạm ứng án phí/i }).first();
    if (await dong.isVisible().catch(() => false)) {
      // Lưu mà chưa ký ("Chưa có hiệu lực") → Bước 06 khóa nút "Ghi nhận nộp phí" → mở sửa, ký nốt
      const soDaKy = await kyTiepNeuChuaKy(m, dong, /Thông báo nộp tiền tạm ứng án phí/, 'Số thông báo', tk.ten);
      return { soTB29: soDaKy ?? (await dong.locator('td').nth(2).innerText()).trim() };
    }

    await chonMenu(m, muc, 'Thêm thông báo', '29-DS');
    const bm = popup(m, '(29-DS)');
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    if (tk.ten) await chonNguoiKy(m, bm, tk.ten);
    const soTB29 = await dungSo(m, bm, 'Số thông báo');
    await luuKyDong(m, bm);
    return { soTB29 };
  },
};
