/**
 * Bộ bản án cho đợt chạy luồng GĐT/TT ngày 26-09-2026: 22 bản án HÌNH SỰ SƠ THẨM đã ký trên STG,
 * sinh ra bởi luồng tests/vu-an-hinh-su-so-tham.spec.ts (bước kyBanAn).
 *
 * Nguyên văn bảng người dùng giao (Mã vụ án | Bị cáo | Số bản án | Ngày bản án | Tòa ra bản án).
 * Cột maExcel (VA017…) là mã vụ trong data/data-test-hinh-su.xlsx, ghép theo
 * seed-output/hinh-su-so-tham.stg.json (VA017 → VA26-003432 …) — dùng để lấy "Tên vụ án" làm tên nhóm test.
 *
 * ⚠ TÒA RA BẢN ÁN: bảng giao ghi "Tòa án TP Hà Nội" cho 8 vụ đầu (theo cột "Tòa án" của Excel), nhưng
 * luồng hình sự tạo MỌI vụ bằng tài khoản thuộc D01.131.09 (VKS/Tòa khu vực 9) và
 * seed-output/ban-an-hinh-su-stg.csv (xuất từ hệ thống) ghi tòa ra bản án D01.131.09 cho cả 22 vụ.
 * Vì vậy ô "Tòa ra quyết định bản án" nhập theo hệ thống (TOA_TREN_HE_THONG); tên nguyên văn giữ ở toaAnTrongFile.
 * Tra cứu hiện "Không tìm thấy bản án trong hệ thống" thì luồng báo lỗi, dừng trước khi Lưu (không tạo đơn sai).
 */
import { BanAnSoTham, chuanNgay } from '../common/ban-an-so-tham';

/** Tòa D01.131.09 theo tên trong danh mục đơn vị (đã dùng thành công ở đợt 24-09-2026 trên STG) */
const TOA_TREN_HE_THONG = 'Tòa án nhân dân khu vực 9 - Hà Nội';

export interface BanAnHinhSuGdt extends BanAnSoTham {
  /** Mã vụ trong data/data-test-hinh-su.xlsx (VA017…) */
  maExcel: string;
}

const NGUYEN_VAN: { maExcel: string; maVuAn: string; biCao: string; soBanAn: string; ngayBanAn: string; toaAn: string }[] = [
  { maExcel: 'VA017', maVuAn: 'VA26-003432', biCao: 'Hoàng Minh Tuấn', soBanAn: '65500423', ngayBanAn: '22/03/2026', toaAn: 'Tòa án TP Hà Nội' },
  { maExcel: 'VA020', maVuAn: 'VA26-003602', biCao: 'Cao Bá Xuyên', soBanAn: '65500358', ngayBanAn: '30/03/2026', toaAn: 'Tòa án TP Hà Nội' },
  { maExcel: 'VA022', maVuAn: 'VA26-003612', biCao: 'Trần Văn Bảo', soBanAn: '65500424', ngayBanAn: '05/04/2026', toaAn: 'Tòa án TP Hà Nội' },
  { maExcel: 'VA023', maVuAn: 'VA26-003614', biCao: 'Lê Văn Cảnh', soBanAn: '65500437', ngayBanAn: '10/04/2026', toaAn: 'Tòa án TP Hà Nội' },
  // Thêm 27/09/2026 để chạy lại luồng từ B1 và quan sát bước nào ghi DON.ID_VU_GIAIQUYET.
  // Vụ này đã có bản án sơ thẩm đã ký và chưa có đơn GĐT nào (xem seed-output/toan-bo-data-stg.csv).
  { maExcel: 'VA024', maVuAn: 'VA26-003617', biCao: 'Nguyễn Đức Dũng', soBanAn: '65500626', ngayBanAn: '12/04/2026', toaAn: 'TAND khu vực 9 - Hà Nội' },
  { maExcel: 'VA026', maVuAn: 'VA26-003618', biCao: 'Vũ Nhật Hưng', soBanAn: '65500464', ngayBanAn: '18/04/2026', toaAn: 'Tòa án TP Hà Nội' },
  { maExcel: 'VA028', maVuAn: 'VA26-003624', biCao: 'Nguyễn Văn Long', soBanAn: '65500448', ngayBanAn: '20/04/2026', toaAn: 'Tòa án TP Hà Nội' },
  { maExcel: 'VA033', maVuAn: 'VA26-003627', biCao: 'Nguyễn Văn Mạnh', soBanAn: '65500472', ngayBanAn: '05/05/2026', toaAn: 'Tòa án TP Hà Nội' },
  { maExcel: 'VA035', maVuAn: 'VA26-003629', biCao: 'Trần Văn Oai', soBanAn: '65500426', ngayBanAn: '09/05/2026', toaAn: 'Tòa án TP Hà Nội' },
  { maExcel: 'VA054', maVuAn: 'VA26-003630', biCao: 'Quách Văn Nam', soBanAn: '65500380', ngayBanAn: '10/01/2026', toaAn: 'TAND khu vực 9 - Hà Nội' },
  { maExcel: 'VA056', maVuAn: 'VA26-003633', biCao: 'Uông Văn Quang', soBanAn: '65500383', ngayBanAn: '14/01/2026', toaAn: 'TAND khu vực 9 - Hà Nội' },
  { maExcel: 'VA057', maVuAn: 'VA26-003636', biCao: 'Đặng Văn Sáng', soBanAn: '65500385', ngayBanAn: '16/01/2026', toaAn: 'TAND khu vực 9 - Hà Nội' },
  { maExcel: 'VA124', maVuAn: 'VA26-003639', biCao: 'Trần Văn Thẩm', soBanAn: '34', ngayBanAn: '06/03/2025', toaAn: 'TAND khu vực 9 - Hà Nội' },
  { maExcel: 'VA131', maVuAn: 'VA26-003643', biCao: 'Nguyễn Văn Hội', soBanAn: '23', ngayBanAn: '12/06/2025', toaAn: 'TAND khu vực 9 - Hà Nội' },
  { maExcel: 'VA133', maVuAn: 'VA26-003650', biCao: 'Lê Văn Chánh', soBanAn: '33', ngayBanAn: '26/06/2025', toaAn: 'TAND khu vực 9 - Hà Nội' },
  { maExcel: 'VA134', maVuAn: 'VA26-003656', biCao: 'Phạm Văn Viện', soBanAn: '24', ngayBanAn: '03/07/2025', toaAn: 'TAND khu vực 9 - Hà Nội' },
  { maExcel: 'VA135', maVuAn: 'VA26-003662', biCao: 'Hoàng Văn Quốc', soBanAn: '32', ngayBanAn: '10/07/2025', toaAn: 'TAND khu vực 9 - Hà Nội' },
  { maExcel: 'VA136', maVuAn: 'VA26-003664', biCao: 'Vũ Văn Hạnh', soBanAn: '25', ngayBanAn: '17/07/2025', toaAn: 'TAND khu vực 9 - Hà Nội' },
  { maExcel: 'VA137', maVuAn: 'VA26-003669', biCao: 'Đặng Văn Phúc', soBanAn: '26', ngayBanAn: '24/07/2025', toaAn: 'TAND khu vực 9 - Hà Nội' },
  { maExcel: 'VA138', maVuAn: 'VA26-003675', biCao: 'Ngô Văn Lộc', soBanAn: '27', ngayBanAn: '31/07/2025', toaAn: 'TAND khu vực 9 - Hà Nội' },
  { maExcel: 'VA139', maVuAn: 'VA26-003679', biCao: 'Bùi Văn Tân', soBanAn: '29', ngayBanAn: '07/08/2025', toaAn: 'TAND khu vực 9 - Hà Nội' },
  { maExcel: 'VA140', maVuAn: 'VA26-003683', biCao: 'Cao Văn Nghị', soBanAn: '36', ngayBanAn: '14/08/2025', toaAn: 'TAND khu vực 9 - Hà Nội' },
  { maExcel: 'VA132', maVuAn: 'VA26-003688', biCao: 'Trần Văn Đồng', soBanAn: '28', ngayBanAn: '19/06/2025', toaAn: 'TAND khu vực 9 - Hà Nội' },
];

export const DS_BAN_AN_HINH_SU_26_09_2026: BanAnHinhSuGdt[] = NGUYEN_VAN.map((b, i) => {
  const ngayBanAn = chuanNgay(b.ngayBanAn);
  return {
    dong: i + 1,
    maExcel: b.maExcel,
    soBanAn: b.soBanAn,
    ngayBanAn,
    toaAn: TOA_TREN_HE_THONG,
    toaAnTrongFile: b.toaAn,
    capXetXu: 'Sơ thẩm',
    loaiAn: 'Hình sự',
    biCao: b.biCao,
    toiDanh: undefined,
    dieuLuat: undefined,
    maVuAn: b.maVuAn,
    // FE: `Khiếu nại ${loại QĐ/BA} số ${số} ngày ${ngày} của ${tên tòa}` (mặc định Loại QĐ/BA = Bản án)
    noiDungGoiY: `Khiếu nại Bản án số ${b.soBanAn} ngày ${ngayBanAn} của ${TOA_TREN_HE_THONG}`,
  };
});
