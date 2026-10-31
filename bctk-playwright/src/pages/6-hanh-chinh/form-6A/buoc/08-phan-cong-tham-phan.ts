import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai6A } from '../cau-hinh-6A';
import { moVuAn, phanCongVuAn } from './chung';

/**
 * BƯỚC 08 · Phân công Thẩm phán chủ tọa (hướng dẫn B10, ý 1)
 *
 *  Chi tiết vụ án → tab "Phân công" → "Phân công" › "Quyết định phân công Thẩm phán giải quyết vụ án hành chính"
 *  → Ngày quyết định = hôm nay · Người ký = chủ tài khoản · Vai trò "Thẩm phán chủ tọa" · người ngẫu nhiên → mũi tên
 *  → "Dùng số" → "Lưu" → "Ký logic" → "Đóng"
 */
export const buoc08: Buoc<DonNguon, TrangThai6A> = {
  so: 8,
  ten: 'Phân công Thẩm phán chủ tọa vụ án, dùng số, ký logic',
  huongDan: 'B10',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    const m = await moVuAn(await moPhien(tk), can('urlVuAn', 7));
    const { nguoi, soQD } = await phanCongVuAn(m, 'Quyết định phân công Thẩm phán giải quyết vụ án hành chính', 'Thẩm phán chủ tọa', 1, tk.ten);
    return { thamPhanChuToa: nguoi[0], soQDThamPhan: soQD || tt.soQDThamPhan };
  },
};
