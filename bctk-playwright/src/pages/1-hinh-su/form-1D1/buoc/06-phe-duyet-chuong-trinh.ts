import { Buoc } from '../../../common/buoc';
import { BanAn1D1, TK_LANH_DAO, TK_VU_TRUONG, TrangThai1D1 } from '../cau-hinh-1D1';
import { xuLyChoDuyet } from './chung';

/**
 * BƯỚC 06 · Lãnh đạo · Phê duyệt chương trình làm việc (hướng dẫn bước 6)
 *
 *  Tài khoản lãnh đạo → Công tác lãnh đạo › Phê duyệt đề xuất › tab "Chờ duyệt"
 *  → mở "Chương trình làm việc" do Vụ trưởng trình (nội dung có số kháng nghị của hồ sơ) → "Phê duyệt"
 * Không còn đề xuất chờ duyệt của hồ sơ (lượt trước đã duyệt) → bỏ qua.
 */
export const buoc06: Buoc<BanAn1D1, TrangThai1D1> = {
  so: 6,
  ten: 'Lãnh đạo · Phê duyệt chương trình làm việc (danh sách vụ xét xử)',
  huongDan: '6',
  chay: async ({ moPhien, can }) => {
    const soKhangNghi = can('soKhangNghi', 1);
    await xuLyChoDuyet(
      await moPhien(TK_LANH_DAO),
      /Chương trình làm việc|vụ xét xử/i,
      TK_VU_TRUONG.ten!,
      'Phê duyệt',
      new RegExp(`${soKhangNghi}(?!\\d)`),
    );
  },
};
