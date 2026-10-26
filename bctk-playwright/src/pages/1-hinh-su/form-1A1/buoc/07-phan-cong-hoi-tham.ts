import { test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { TrangThai1A1, VuNguon, cauHinh1A1 } from '../cau-hinh-1A1';
import { moVuAn, phanCongVaKy } from './chung';
import { luuDongKetQua } from '../../../../utils/file-helper';

/**
 * BƯỚC 07 · Phân công Hội thẩm nhân dân (hướng dẫn bước 7), lưu kết quả — luồng dừng ở đây
 *
 *  1. Tab "Phân công" › "Phân công" › "Phân công Hội thẩm" → popup
 *  2. Vai trò "Hội thẩm nhân dân" · Tên người được phân công ngẫu nhiên → mũi tên thêm vào bảng
 *  3. "Dùng số" → "Lưu" → "Ký logic" → "Đóng"
 *  4. Ghi output/1-hinh-su/ma-vu-an-form-1A1.xlsx (kèm link vụ án)
 */
export const buoc07: Buoc<VuNguon, TrangThai1A1> = {
  so: 7,
  ten: 'Phân công Hội thẩm nhân dân, dùng số, ký logic, lưu kết quả',
  huongDan: '7',
  chay: async ({ vuAn, moPhien, tkToa, can, tt }) => {
    const urlVuAn = can('urlVuAn', 2);
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaAn)), urlVuAn);
    const { soQD, nguoi } = await phanCongVaKy(m, 'Phân công Hội thẩm', 'Hội thẩm nhân dân', /dự khuyết/);

    // ── Lưu kết quả (ô vụ này xong; lần chạy sau ô sẽ tạo vụ mới) ──
    await luuDongKetQua(
      cauHinh1A1.linhVuc,
      cauHinh1A1.bieuMau,
      ['Mã vụ án', 'Mã hồ sơ', 'Pháp nhân thương mại', 'Mã số thuế', 'Người đại diện', 'Tội danh', 'Điều luật áp dụng', 'Người bào chữa', 'Số thụ lý', 'Ngày thụ lý', 'Thẩm phán chủ tọa', 'Số QĐ phân công TP', 'Hội thẩm nhân dân', 'Số QĐ phân công HT', 'Link vụ án'],
      [tt.maVuAnHeThong ?? '', tt.maHoSo ?? '', tt.tenPhapNhan ?? '', tt.maSoThue ?? '', tt.nguoiDaiDien ?? '', tt.toiDanh ?? '', tt.dieuLuat ?? '', tt.nguoiBaoChua ?? '', tt.soThuLy ?? '', tt.ngayThuLy ?? '', tt.thamPhanChuToa ?? '', tt.soQDThamPhan ?? '', nguoi, soQD, urlVuAn],
    );
    test.info().annotations.push({ type: 'Vụ án đã tạo', description: `${tt.maVuAnHeThong} · ${tt.tenPhapNhan} · ${urlVuAn}` });
    return { hoiTham: nguoi, soQDHoiTham: soQD };
  },
};
