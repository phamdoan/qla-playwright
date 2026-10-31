import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BanAn2C, TK_LANH_DAO, TK_VU_TRUONG, TrangThai2C } from '../cau-hinh-2C';
import { chonTab, dongHoSo, locTheoBanAn, xuLyChoDuyet } from './chung';

/**
 * BƯỚC 04 · Lãnh đạo · Ký tờ trình phân công thẩm phán (hướng dẫn bước 4)
 *
 *  Tài khoản lãnh đạo (Nguyễn Hải Trâm) → Công tác lãnh đạo › Phê duyệt đề xuất › tab "Chờ duyệt"
 *  → mở "Tờ trình phân công thẩm phán Tòa án nhân dân tối cao" do Vụ trưởng tạo, đúng số tờ trình (bước 02)
 *  → màn "Ký số văn bản" → "Ký logic"
 * Tờ trình đã "Đã ban hành" (lượt trước / luồng khác đã ký) → bỏ qua.
 */
export const buoc04: Buoc<BanAn2C, TrangThai2C> = {
  so: 4,
  ten: 'Lãnh đạo · Ký logic tờ trình phân công thẩm phán',
  huongDan: '4',
  chay: async ({ vuAn, can, moPhien }) => {
    // Bắt buộc có số tờ trình: "Chờ duyệt" có nhiều tờ trình cùng tên của các hồ sơ khác → không có số thì ký nhầm
    // (30/10: BA 17769/91292/34002 ký nhầm, tờ trình 546–548 vẫn "Chờ duyệt" → bước 05 báo "chưa xác định thẩm phán chủ tọa")
    const soToTrinh = can('soToTrinh', 2);
    const soKhangNghi = can('soKhangNghi', 1);

    // Đã ban hành thì không còn ở "Chờ duyệt" → xem trạng thái ở "Quản lý kết quả phân công" của Vụ trưởng trước
    const phienVT = await moPhien(TK_VU_TRUONG);
    const m = new ManHinh(phienVT.page);
    await phienVT.vao('vu-an/gdt-tt/phan-cong-vu-an/danh-sach');
    await chonTab(m, 'Quản lý kết quả phân công');
    await locTheoBanAn(m, vuAn.soBanAn);
    const dong = dongHoSo(m, soKhangNghi);
    await dong.waitFor({ timeout: 30_000 });
    if (/Đã ban hành/.test(await dong.innerText())) return;

    await xuLyChoDuyet(
      await moPhien(TK_LANH_DAO),
      /Tờ trình phân công thẩm phán/i,
      TK_VU_TRUONG.ten!,
      'Ký logic',
      new RegExp(`Số:\\s*${soToTrinh}(?!\\d)|(?<!\\d)${soToTrinh}\\s*/\\s*TTr`),
    );
  },
};
