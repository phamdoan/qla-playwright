import { Buoc } from '../../../common/buoc';
import { TrangThai1A1, VuNguon } from '../cau-hinh-1A1';
import { moVuAn, phanCongVaKy } from './chung';

/**
 * BƯỚC 06 · Phân công Thẩm phán chủ tọa (hướng dẫn bước 6)
 *
 *  1. Mở chi tiết vụ án → tab "Phân công" → mục "Danh sách quyết định phân công"
 *  2. "Phân công" › "Phân công Thẩm phán" → popup
 *  3. Vai trò "Thẩm phán chủ tọa" · Tên người được phân công ngẫu nhiên → mũi tên thêm vào bảng
 *  4. "Dùng số" → "Lưu" → "Ký logic" → "Đóng" (người ký mặc định là tài khoản đang dùng)
 */
export const buoc06: Buoc<VuNguon, TrangThai1A1> = {
  so: 6,
  ten: 'Phân công Thẩm phán chủ tọa, dùng số, ký logic',
  huongDan: '6',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaAn)), can('urlVuAn', 2));
    const { soQD, nguoi } = await phanCongVaKy(m, 'Phân công Thẩm phán', 'Thẩm phán chủ tọa');
    return { soQDThamPhan: soQD, thamPhanChuToa: nguoi };
  },
};
