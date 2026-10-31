import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BanAn6C, TK_LANH_DAO, TK_VU_TRUONG, TrangThai6C } from '../cau-hinh-6C';
import { chonTab, dongHoSo, locTheoBanAn, xuLyChoDuyet } from './chung';

/**
 * BƯỚC 04 · Lãnh đạo · Ký tờ trình phân công thẩm phán (hướng dẫn bước 4)
 *
 *  Tài khoản lãnh đạo (Nguyễn Hải Trâm) → Công tác lãnh đạo › Phê duyệt đề xuất › tab "Chờ duyệt"
 *  → mở "Tờ trình phân công thẩm phán Tòa án nhân dân tối cao" do Vụ trưởng tạo, đúng số tờ trình (bước 02)
 *  → màn "Ký số văn bản" → "Ký logic"
 * Tờ trình đã "Đã ban hành" (lượt trước / luồng khác đã ký) → bỏ qua.
 */
export const buoc04: Buoc<BanAn6C, TrangThai6C> = {
  so: 4,
  ten: 'Lãnh đạo · Ký logic tờ trình phân công thẩm phán',
  huongDan: '4',
  chay: async ({ vuAn, tt, can, moPhien }) => {
    const soKhangNghi = can('soKhangNghi', 1);

    // Trạng thái tờ trình + số tờ trình ở "Quản lý kết quả phân công" của Vụ trưởng ("Người ký: … Số:546/TTr-TANDTC")
    const phienVT = await moPhien(TK_VU_TRUONG);
    const m = new ManHinh(phienVT.page);
    await phienVT.vao('vu-an/gdt-tt/phan-cong-vu-an/danh-sach');
    await chonTab(m, 'Quản lý kết quả phân công');
    await locTheoBanAn(m, vuAn.soBanAn);
    const dong = dongHoSo(m, soKhangNghi);
    await dong.waitFor({ timeout: 30_000 });
    const chu = (await dong.innerText()).replace(/\s+/g, ' ');
    // State cũ (bước 02 chưa lưu số) → lấy số trên dòng (cả khi đã ban hành, để output có "Số tờ trình PC")
    const soToTrinh = tt.soToTrinh || chu.match(/Người ký[^]*?Số:\s*(\d+)/)?.[1];
    if (/Đã ban hành/.test(chu)) return { ...(soToTrinh ? { soToTrinh } : {}), daKyToTrinh: true };

    // Bắt buộc có số tờ trình: "Chờ duyệt" có nhiều tờ trình cùng tên của các hồ sơ khác → không có số thì ký nhầm
    // (30/10: BA 12362/12364 ký nhầm → bước 05 báo "Vụ án chưa xác định thẩm phán phân chủ tọa").
    if (!soToTrinh) throw new Error(`Không đọc được số tờ trình phân công của hồ sơ KN ${soKhangNghi} (dòng: ${chu.slice(0, 200)})`);

    await xuLyChoDuyet(
      await moPhien(TK_LANH_DAO),
      /Tờ trình phân công thẩm phán/i,
      TK_VU_TRUONG.ten!,
      'Ký logic',
      new RegExp(`Số:\\s*${soToTrinh}(?!\\d)|(?<!\\d)${soToTrinh}\\s*/\\s*TTr`),
    );
    return { soToTrinh, daKyToTrinh: true };
  },
};
