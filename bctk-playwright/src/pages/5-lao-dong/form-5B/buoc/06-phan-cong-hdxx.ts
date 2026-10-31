import { Buoc } from '../../../common/buoc';
import { TrangThai5B, VuAn5B } from '../cau-hinh-5B';
import { ngay } from '../../../../utils/fake-data';
import { chonNguoiKy, dungSo, luuKyBieuMau, moVuAn, popup, themNguoiPhanCong } from './chung';

/**
 * BƯỚC 06 · Tòa phúc thẩm · Phân công người tiến hành tố tụng (hướng dẫn bước 6)
 *
 *  1. Tab "Phân công" → "Thêm phân công" → popup "Quyết định phân công người tiến hành tố tụng"
 *  2. Ngày quyết định = hôm nay · "Dùng số" · Người ký/người phân công = chủ tài khoản (mặc định là người khác)
 *  3. "Thẩm phán chủ tọa phiên tòa" = CHỦ TÀI KHOẢN (ký các văn bản bước 07–10) · "Thành viên HĐXX" ngẫu nhiên
 *     · "Thư ký phiên tòa" ngẫu nhiên — mỗi người: chọn vai trò, người → mũi tên
 *  4. "Lưu" → "Ký logic" → "Đóng"
 * Đã có Thẩm phán chủ tọa phiên tòa (lượt trước) → bỏ qua.
 */
export const buoc06: Buoc<VuAn5B, TrangThai5B> = {
  so: 6,
  ten: 'Tòa phúc thẩm · Phân công chủ tọa (chủ tài khoản), thành viên HĐXX, thư ký; ký logic',
  huongDan: '6',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaPhucTham);
    if (!tk.ten) throw new Error(`Taikhoan.xlsx: tài khoản ${tk.taiKhoan} chưa có cột "Tên" — cần để chọn Thẩm phán chủ tọa`);
    const m = await moVuAn(await moPhien(tk), can('urlVuAnPT', 4));
    await m.moTab('phan-cong');
    const main = m.page.locator('main');
    if (await main.locator('tbody tr').filter({ hasText: 'Thẩm phán chủ tọa' }).count()) {
      return { chuToa: tt.chuToa ?? tk.ten, soQDPhanCong: tt.soQDPhanCong };
    }

    await m.nut(main, 'Thêm phân công').click();
    const bm = popup(m, 'Quyết định phân công người tiến hành tố tụng');
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong(1500);

    await m.ngay(bm, 'Ngày quyết định', ngay(0));
    const soQDPhanCong = await dungSo(m, bm, 'Số quyết định');
    await chonNguoiKy(m, bm, tk.ten);
    // Bảng ghi vai trò khác chữ ở ô chọn ("… chủ tọa phúc thẩm") nên tên đọc lại bị lẫn — chủ tọa luôn là chủ tài khoản
    await themNguoiPhanCong(m, bm, 'Thẩm phán chủ tọa phiên tòa', tk.ten);
    const chuToa = tk.ten;
    const thanhVienHDXX = await themNguoiPhanCong(m, bm, 'Thành viên HĐXX');
    const thuKy = await themNguoiPhanCong(m, bm, 'Thư ký phiên tòa');
    await luuKyBieuMau(m, bm);
    return { chuToa, thanhVienHDXX, thuKy, soQDPhanCong };
  },
};
