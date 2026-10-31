import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai5A } from '../cau-hinh-5A';
import { moVuAn, phanCongVuAn } from './chung';

/**
 * BƯỚC 07 · Phân công Thẩm phán chủ tọa = CHỦ TÀI KHOẢN (hướng dẫn bước 7)
 *
 *  Chi tiết vụ án → tab "Phân công" → "Phân công" › "Quyết định phân công Thẩm phán giải quyết vụ án dân sự"
 *  → Ngày quyết định = hôm nay · Người ký = chủ tài khoản · Vai trò "Thẩm phán chủ tọa" · người = chủ tài khoản → mũi tên
 *  → "Dùng số" → "Lưu" → "Ký logic" → "Đóng"
 * Phải là chủ tài khoản: các biên bản, quyết định, bản án ở bước 08–13 do Thẩm phán chủ tọa ký.
 */
export const buoc07: Buoc<DonNguon, TrangThai5A> = {
  so: 7,
  ten: 'Phân công Thẩm phán chủ tọa (chủ tài khoản), dùng số, ký logic',
  huongDan: '7',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    if (!tk.ten) throw new Error(`Taikhoan.xlsx: tài khoản ${tk.taiKhoan} chưa có cột "Tên" — cần để chọn Thẩm phán chủ tọa`);
    const m = await moVuAn(await moPhien(tk), can('urlVuAn', 6));
    const { nguoi, soQD } = await phanCongVuAn(m, 'Quyết định phân công Thẩm phán giải quyết vụ án dân sự', 'Thẩm phán chủ tọa', 1, tk.ten, tk.ten);
    return { thamPhanChuToa: nguoi[0], soQDThamPhan: soQD || tt.soQDThamPhan };
  },
};
