import { Buoc } from '../../../common/buoc';
import { BanAn1D1, TK_LANH_DAO, TK_VU_TRUONG, TrangThai1D1 } from '../cau-hinh-1D1';
import { xuLyChoDuyet } from './chung';

/**
 * BƯỚC 03 · Lãnh đạo · Ký tờ trình phân công thẩm phán (hướng dẫn bước 3)
 *
 *  Tài khoản lãnh đạo (Nguyễn Hải Trâm) → Công tác lãnh đạo › Phê duyệt đề xuất › tab "Chờ duyệt"
 *  → mở "Tờ trình phân công thẩm phán Tòa án nhân dân tối cao" do Vụ trưởng tạo, đúng số tờ trình (bước 02)
 *  → màn "Ký số văn bản" → "Ký logic"
 * Không còn tờ trình chờ duyệt (lượt trước đã ký) → bỏ qua.
 */
export const buoc03: Buoc<BanAn1D1, TrangThai1D1> = {
  so: 3,
  ten: 'Lãnh đạo · Ký logic tờ trình phân công thẩm phán',
  huongDan: '3',
  chay: async ({ tt, moPhien }) => {
    const soToTrinh = tt.soToTrinh;
    await xuLyChoDuyet(
      await moPhien(TK_LANH_DAO),
      /Tờ trình phân công thẩm phán/i,
      TK_VU_TRUONG.ten!,
      'Ký logic',
      soToTrinh ? new RegExp(`Số:\\s*${soToTrinh}(?!\\d)`) : undefined,
    );
  },
};
