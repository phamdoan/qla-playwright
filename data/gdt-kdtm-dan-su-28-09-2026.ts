/**
 * Bộ dữ liệu GIÁM ĐỐC THẨM — đợt 28/09/2026 (án Kinh doanh thương mại và Dân sự).
 *
 * Nguồn: "Data_GĐT.xlsx" (sheet "GĐT", 20 dòng có dữ liệu).
 *
 * Số/ngày bản án và loại án ở đây lấy từ DB STG (VUAN + BAN_AN theo "mã ST"), KHÔNG lấy nguyên văn
 * từ Excel, vì hai chỗ trong file lệch với hệ thống:
 *   · 10 dòng "Ngày bản án ST" bị Excel lưu dạng số (46032…) do gõ dd/mm bị hiểu thành mm/dd —
 *     quy đổi ra 10/01/2026 trong khi bản án thật là 01/10/2026.
 *   · Cột "Loại vụ việc" ghi tất cả là KDTM, nhưng DB cho thấy 10 vụ ở Tòa khu vực 9 - Hà Nội là
 *     LOAI_AN = 002 (Dân sự); chỉ 10 vụ ở Hải Phòng là 004 (Kinh doanh thương mại).
 *
 * Cả 20 vụ đều đã có bản án sơ thẩm trên STG (kiểm 28/09/2026), giai đoạn 0, trạng thái
 * TT_VUAN.003.002 (riêng VA26-004017 là TT_VUAN.003.007).
 *
 * Từ Bước 10 trở đi mỗi nhóm chạy theo Vụ đã nhận đơn ở Bước 3 (định tuyến theo loại án):
 *   · 10 vụ Dân sự  → Vụ Giám đốc kiểm tra về DÂN SỰ (D01.107), các khoá *DanSu trong config/luong-gdt.json
 *   · 10 vụ KDTM    → Vụ mặc định (hình sự) — đơn nhóm này hiện đúng ở đó (kiểm STG 29/09/2026)
 * Xem VU_GDKT_DAN_SU trong tests/luong-gdt-tt-28-09-2026-kdtm.spec.ts.
 */
import { BanAnSoTham } from '../common/ban-an-so-tham';

export interface VuGdtKdtm extends BanAnSoTham {
  /** Mã dòng để lọc khi chạy: QLA_GDT_MA=K01,D03 */
  maSheet: string;
  /** Người đứng đơn của vụ sơ thẩm (án KDTM/dân sự không có bị cáo) */
  nguyenDon?: string;
}

const vu = (
  maSheet: string,
  maVuAn: string,
  soBanAn: string,
  ngayBanAn: string,
  loaiAn: string,
  toaAn: string,
  phuThem: Partial<VuGdtKdtm> = {},
): VuGdtKdtm => ({
  dong: 0,
  maSheet,
  maVuAn,
  soBanAn,
  ngayBanAn,
  toaAn,
  toaAnTrongFile: toaAn,
  capXetXu: 'Sơ thẩm',
  loaiAn,
  thuTucGiaiQuyet: 'Giám đốc thẩm',
  noiDungGoiY: `Khiếu nại Bản án số ${soBanAn} ngày ${ngayBanAn} của ${toaAn}`,
  ...phuThem,
});

/** 10 vụ Kinh doanh thương mại — Tòa án nhân dân thành phố Hải Phòng */
const DS_KDTM: VuGdtKdtm[] = [
  vu('K01', 'VA26-003635', '3', '24/09/2026', 'Kinh doanh thương mại', 'Tòa án nhân dân thành phố Hải Phòng', {
    nguyenDon: 'Hoàng Phương Yến',
    quanHePhapLuat: 'Tranh chấp hợp đồng bảo lãnh',
  }),
  vu('K02', 'VA26-003641', '1', '25/09/2026', 'Kinh doanh thương mại', 'Tòa án nhân dân thành phố Hải Phòng', {
    nguyenDon: 'Lê Thu Hoa',
    quanHePhapLuat: 'Tranh chấp hợp đồng mua bán hàng hoá',
  }),
  vu('K03', 'VA26-003646', '2', '24/09/2026', 'Kinh doanh thương mại', 'Tòa án nhân dân thành phố Hải Phòng', {
    nguyenDon: 'Dương Hữu Nam',
    quanHePhapLuat: 'Tranh chấp hợp đồng cung ứng dịch vụ',
  }),
  vu('K04', 'VA26-003648', '4', '24/09/2026', 'Kinh doanh thương mại', 'Tòa án nhân dân thành phố Hải Phòng', {
    nguyenDon: 'Đỗ Hồng Lan',
    quanHePhapLuat: 'Tranh chấp hợp đồng cung ứng dịch vụ',
  }),
  vu('K05', 'VA26-003651', '5', '23/09/2026', 'Kinh doanh thương mại', 'Tòa án nhân dân thành phố Hải Phòng', {
    nguyenDon: 'Vũ Ngọc Mai',
    quanHePhapLuat: 'Tranh chấp hợp đồng mua bán hàng hoá',
  }),
  vu('K06', 'VA26-003653', '6', '23/09/2026', 'Kinh doanh thương mại', 'Tòa án nhân dân thành phố Hải Phòng', {
    nguyenDon: 'Trần Văn Hùng',
    quanHePhapLuat: 'Tranh chấp hợp đồng ký quỹ',
  }),
  vu('K07', 'VA26-003655', '7', '26/09/2026', 'Kinh doanh thương mại', 'Tòa án nhân dân thành phố Hải Phòng', {
    nguyenDon: 'Hoàng Hữu Long',
    quanHePhapLuat: 'Tranh chấp hợp đồng bảo lãnh',
  }),
  vu('K08', 'VA26-003657', '8', '26/09/2026', 'Kinh doanh thương mại', 'Tòa án nhân dân thành phố Hải Phòng', {
    nguyenDon: 'Phạm Quang Long',
    quanHePhapLuat: 'Tranh chấp hợp đồng đại diện, đại lý',
  }),
  vu('K09', 'VA26-003659', '9', '26/09/2026', 'Kinh doanh thương mại', 'Tòa án nhân dân thành phố Hải Phòng', {
    nguyenDon: 'Ngô Thị Trang',
    quanHePhapLuat: 'Tranh chấp hợp đồng bảo lãnh',
  }),
  vu('K10', 'VA26-003661', '10', '22/09/2026', 'Kinh doanh thương mại', 'Tòa án nhân dân thành phố Hải Phòng', {
    nguyenDon: 'Hồ Thị Hạnh',
    quanHePhapLuat: 'Tranh chấp hợp đồng đại diện, đại lý',
  }),
];

/** 10 vụ Dân sự — Tòa án nhân dân khu vực 9 - Hà Nội (Excel ghi KDTM, DB là Dân sự) */
const DS_DAN_SU: VuGdtKdtm[] = [
  vu('D01', 'VA26-003931', '127', '30/09/2026', 'Dân sự', 'Tòa án nhân dân khu vực 9 - Hà Nội', {
    nguyenDon: 'Mạnh Duy Hoàng',
    quanHePhapLuat: 'Tranh chấp hợp đồng vận chuyển',
  }),
  vu('D02', 'VA26-003963', '129', '01/10/2026', 'Dân sự', 'Tòa án nhân dân khu vực 9 - Hà Nội', {
    nguyenDon: 'Nguyễn Du',
    quanHePhapLuat: 'Tranh chấp về hợp đồng sử dụng tác phẩm',
  }),
  vu('D03', 'VA26-003983', '130', '02/10/2026', 'Dân sự', 'Tòa án nhân dân khu vực 9 - Hà Nội', {
    nguyenDon: 'Mạnh Duy Sơn',
    quanHePhapLuat: 'Tranh chấp hợp đồng vận chuyển',
  }),
  vu('D04', 'VA26-003993', '131', '05/10/2026', 'Dân sự', 'Tòa án nhân dân khu vực 9 - Hà Nội', {
    nguyenDon: 'Mạnh Duy Nam',
    quanHePhapLuat: 'Tranh chấp hợp đồng vận chuyển',
  }),
  vu('D05', 'VA26-004000', '134', '01/10/2026', 'Dân sự', 'Tòa án nhân dân khu vực 9 - Hà Nội', {
    nguyenDon: 'Mạnh Duy Phong',
    quanHePhapLuat: 'Tranh chấp hợp đồng vận chuyển',
  }),
  vu('D06', 'VA26-004002', '144', '01/10/2026', 'Dân sự', 'Tòa án nhân dân khu vực 9 - Hà Nội', {
    nguyenDon: 'Mạnh Duy Quý',
    quanHePhapLuat: 'Tranh chấp hợp đồng vận chuyển',
  }),
  vu('D07', 'VA26-004003', '136', '04/10/2026', 'Dân sự', 'Tòa án nhân dân khu vực 9 - Hà Nội', {
    nguyenDon: 'Mạnh Duy Bình',
    quanHePhapLuat: 'Tranh chấp hợp đồng vận chuyển',
  }),
  vu('D08', 'VA26-004007', '139', '03/10/2026', 'Dân sự', 'Tòa án nhân dân khu vực 9 - Hà Nội', {
    nguyenDon: 'Mạnh Duy Bảo',
    quanHePhapLuat: 'Tranh chấp hợp đồng vận chuyển',
  }),
  vu('D09', 'VA26-004011', '140', '02/10/2026', 'Dân sự', 'Tòa án nhân dân khu vực 9 - Hà Nội', {
    nguyenDon: 'Mạnh Duy Chức',
    quanHePhapLuat: 'Tranh chấp hợp đồng vận chuyển',
  }),
  vu('D10', 'VA26-004017', '142', '05/10/2026', 'Dân sự', 'Tòa án nhân dân khu vực 9 - Hà Nội', {
    nguyenDon: 'Nguyễn Quỳnh Chi',
    quanHePhapLuat: 'Tranh chấp về quyền tác giả',
  }),
];

export const DS_GDT_28_09 = [...DS_KDTM, ...DS_DAN_SU].map((v, i) => ({ ...v, dong: i + 1 }));
