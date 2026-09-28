/**
 * Bộ bản án sơ thẩm cho đợt nhập dữ liệu ngày 24-09-2026 (do người dùng cung cấp trực tiếp,
 * KHÔNG nằm trong data/22A_BAN_AN_ST_TOA_AN_DATA.xlsx).
 *
 * Nguyên văn 3 cột được giao:
 *   Số bản án | Ngày bản án | Tòa ra quyết định bản án
 *   515  | 7/10/2024  | Tòa án nhân dân khu vực 9 - Hà Nội
 *   25   | 21/10/2024 | Tòa án nhân dân khu vực 9 - Hà Nội
 *   26   | 28/10/2024 | Tòa án nhân dân khu vực 9 - Hà Nội
 *   27   | 4/11/2024  | Tòa án nhân dân khu vực 9 - Hà Nội
 *   28   | 11/1/2024  | Tòa án nhân dân khu vực 9 - Hà Nội   ← xem ghi chú bên dưới
 *   29   | 18/11/2024 | Tòa án nhân dân khu vực 9 - Hà Nội
 *
 * ⚠ NGHI VẤN DỮ LIỆU (không tự sửa): các bản án 25→29 cách nhau đúng 7 ngày
 * (21/10 → 28/10 → 4/11 → ? → 18/11), nên bản án 28 nhiều khả năng là 11/11/2024 chứ không phải
 * 11/01/2024. Ở đây giữ NGUYÊN VĂN 11/01/2024; nếu tra cứu không ra bản án, test sẽ ghi GAP.
 * Muốn đổi thì sửa đúng một dòng bên dưới.
 *
 * Loại án / cấp xét xử: đây là bản án SƠ THẨM; "Loại án" do hệ thống tự điền sau khi tra cứu,
 * chỉ khi không tra ra mới dùng giá trị mặc định LOAI_AN_MAC_DINH.
 */
import { BanAnSoTham, chuanNgay } from '../common/ban-an-so-tham';

/** Dùng khi tra cứu không ra bản án (hệ thống không tự điền được Loại án) */
export const LOAI_AN_MAC_DINH = 'Hình sự';
const TOA = 'Tòa án nhân dân khu vực 9 - Hà Nội';

const NGUYEN_VAN: { soBanAn: string; ngayBanAn: string; toaAn: string }[] = [
  { soBanAn: '515', ngayBanAn: '7/10/2024', toaAn: TOA },
  { soBanAn: '25', ngayBanAn: '21/10/2024', toaAn: TOA },
  { soBanAn: '26', ngayBanAn: '28/10/2024', toaAn: TOA },
  { soBanAn: '27', ngayBanAn: '4/11/2024', toaAn: TOA },
  { soBanAn: '28', ngayBanAn: '11/1/2024', toaAn: TOA }, // nghi là 11/11/2024 – xem ghi chú đầu file
  { soBanAn: '29', ngayBanAn: '18/11/2024', toaAn: TOA },
];

/** Bộ dữ liệu đã chuẩn hoá ngày về dd/MM/yyyy, dùng chung kiểu với bộ đọc từ Excel */
export const DS_BAN_AN_24_09_2026: BanAnSoTham[] = NGUYEN_VAN.map((b, i) => {
  const ngayBanAn = chuanNgay(b.ngayBanAn);
  return {
    dong: i + 1,
    soBanAn: b.soBanAn,
    ngayBanAn,
    toaAn: b.toaAn,
    toaAnTrongFile: b.toaAn,
    capXetXu: 'Sơ thẩm',
    loaiAn: LOAI_AN_MAC_DINH,
    // Bộ này không có file đối chiếu nên không biết trước bị cáo / mã vụ án
    biCao: undefined,
    toiDanh: undefined,
    dieuLuat: undefined,
    maVuAn: undefined,
    // FE: `Khiếu nại ${loại QĐ/BA} số ${số} ngày ${ngày} của ${tên tòa}` (mặc định Loại QĐ/BA = Bản án)
    noiDungGoiY: `Khiếu nại Bản án số ${b.soBanAn} ngày ${ngayBanAn} của ${b.toaAn}`,
  };
});
