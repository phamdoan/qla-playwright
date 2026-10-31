import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai3A } from '../cau-hinh-3A';
import { moVuAn, phanCongVuAn } from './chung';

/**
 * BƯỚC 09 · Phân công Thư ký (hướng dẫn B10, ý 2 — PC-002)
 *
 *  Tab "Phân công" → "Phân công" › "Quyết định phân công Thư ký Tòa án tiến hành tố tụng"
 *  → Vai trò "Thư ký" · người ngẫu nhiên → mũi tên → "Dùng số" → "Lưu" → "Ký logic" → "Đóng"
 *  (hướng dẫn ghi "Lấy số" sau "Lưu"; trên màn dùng nút "Dùng số" trước "Lưu" như các quyết định khác)
 */
export const buoc09: Buoc<DonNguon, TrangThai3A> = {
  so: 9,
  ten: 'Phân công Thư ký Tòa án, dùng số, ký logic',
  huongDan: 'B10',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    const m = await moVuAn(await moPhien(tk), can('urlVuAn', 7));
    const { nguoi, soQD } = await phanCongVuAn(m, 'Quyết định phân công Thư ký Tòa án tiến hành tố tụng', 'Thư ký', 1, tk.ten);
    return { thuKy: nguoi[0], soQDThuKy: soQD || tt.soQDThuKy };
  },
};
