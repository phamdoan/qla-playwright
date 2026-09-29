/**
 * LUỒNG GIÁM ĐỐC THẨM — ĐỢT 28/09/2026 (án Kinh doanh thương mại và Dân sự).
 *
 * Dữ liệu: data/gdt-kdtm-dan-su-28-09-2026.ts — nguồn "Data_GĐT.xlsx" sheet "GĐT", 20 vụ:
 *   · K01–K10 · Kinh doanh thương mại · Tòa án nhân dân thành phố Hải Phòng
 *   · D01–D10 · Dân sự                · Tòa án nhân dân khu vực 9 - Hà Nội
 * Số/ngày bản án và loại án lấy từ DB STG, không lấy nguyên văn Excel (xem ghi chú trong file dữ liệu:
 * 10 ngày bị Excel hiểu nhầm dd/mm → mm/dd, và cột "Loại vụ việc" ghi KDTM cho cả 20 dòng).
 *
 * Các bước dùng chung common/luong-gdt-tt.ts, đánh số khớp tài liệu
 * "Playwright nhập data GDT-TT-báo cáo thống kê.txt" (23 bước).
 *
 * Tài khoản từng vai dùng ĐÚNG như tài liệu (Trương Minh Trang, Nguyễn Thị Bình, Bùi Thị Thanh Loan,
 * Nguyễn Hải Trâm…). Tài liệu không khai vai nào khác cho án kinh doanh thương mại / dân sự, nên
 * không tự đổi sang Vụ khác.
 *
 * Lọc khi chạy: QLA_GDT_MA=K01,D03  (mã dòng trong bộ dữ liệu)
 * Sổ cái: seed-output/gdt-kdtm-dan-su-28-09-2026.<env>.ledger.json
 *
 * ⚠ TẠO DỮ LIỆU THẬT trên STG. Chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1.
 */
import { VuGdkt, dangKyLuongGdtTT } from '../common/luong-gdt-tt';
import { DS_GDT_28_09 } from '../data/gdt-kdtm-dan-su-28-09-2026';

/**
 * Vụ Giám đốc, kiểm tra về DÂN SỰ (D01.107) — khai đúng như luồng dân sự 26/09/2026
 * (tests/don-kien-dan-su-luong-gdt-tt-26-09-2026.spec.ts), không thêm tài khoản mới.
 *
 * Vì sao 10 vụ dân sự phải chạy nhánh này: Bước 3 định tuyến đơn theo LOẠI ÁN
 * (VU_NHAN_THEO_LOAI_AN: 'Dân sự' → Vụ dân sự), nên từ Bước 10 trở đi tài khoản Vụ hình sự KHÔNG
 * nhìn thấy các đơn đó. Kiểm chứng trên STG ngày 29/09/2026: tab "Đã có vụ án" của Thư ký Vụ hình sự
 * chỉ hiện đơn 10243, 10245, 10248, 10250 (nhóm KDTM – Hải Phòng), không có 10246, 10249, 10252
 * (nhóm dân sự – Tòa khu vực 9 Hà Nội).
 * Nhóm KDTM vẫn chạy tài khoản mặc định (Vụ hình sự) vì đơn của nhóm này hiện đúng ở đó.
 */
const VU_GDKT_DAN_SU: VuGdkt = {
  thuKyVu: 'thuKyVuDanSu',
  vuTruong: 'vuTruongDanSu',
  thamTraVien: 'thamTraVienDanSu',
  doiGiaTri: {
    thamTraVien: 'thamTraVienDanSu',
    lanhDaoPhuTrach: 'lanhDaoPhuTrachDanSu',
    nguoiNhanTieuHoSo: 'nguoiNhanTieuHoSoDanSu',
  },
};

const chiDinh = (process.env.QLA_GDT_MA || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const DS_CHAY = chiDinh.length ? DS_GDT_28_09.filter(v => chiDinh.includes(v.maSheet)) : DS_GDT_28_09;

const dong = (v: (typeof DS_CHAY)[number]) => ({
  tieuDe: `${v.maSheet} · ${v.loaiAn} · ${v.nguyenDon || v.maVuAn}-${v.soBanAn}-${v.ngayBanAn}-${v.toaAn}`,
  banAn: v,
});
const TEN_SO_CAI = 'gdt-kdtm-dan-su-28-09-2026';
// CẢ HAI nhóm chạy nhánh Vụ GĐKT dân sự: kiểm DB ngày 29/09/2026 cho thấy 18/20 vụ án GĐ3 của đợt
// này có DON_VI_KHOI_TAO = D01.107 — kể cả 10 vụ Kinh doanh thương mại (LOAI_AN = 004). Hai vụ ngoại lệ
// nằm ở D01.121.KTNVTHA (đơn 10230 – bản án 4, đơn 10252 – bản án 142); tài liệu chưa khai tài khoản của
// đơn vị này nên hai vụ đó cần nghiệp vụ xác nhận, không tự chọn tài khoản thay.
dangKyLuongGdtTT(DS_CHAY.map(dong), { tenSoCai: TEN_SO_CAI, vuGdkt: VU_GDKT_DAN_SU });
