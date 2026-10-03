/**
 * FLOW-001 · BẢNG CÀI ĐẶT: mã bước → thân nghiệp vụ.
 *
 * Bước nào chưa có ở đây thì khung đánh `fixme` — hiện trong `--list` để thấy luồng còn thiếu gì,
 * và KHÔNG bao giờ báo xanh giả. Cài đặt xong một bước thì thêm đúng một dòng vào đây.
 *
 * Quy tắc cho thân bước:
 *   1. Dữ liệu gieo lấy từ `input` (data/.../input.ts) — tất định, không random.
 *   2. Dữ liệu bước trước sinh ra lấy bằng `can('<khoá>')` — **không gõ lại** số/ngày/mã đã có.
 *   3. Trả về đúng các khoá khai ở `ra` của bước trong `flow.ts` (bằng chứng do hệ thống cấp).
 *
 * Xem khoá nào do bước nào sinh: `npm run flow:lineage`.
 */
import type { BangCaiDat } from '../../../khung/luong';
import type { INPUT } from '../../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';
import { taoDonKhoiKien } from './tao-don.flow';
import { phanCongThamPhanXuLyDon } from './phan-cong-don.flow';
import { tamUngAnPhi, thongBaoSuaDoiBoSung, thuLyVuAn, xacMinhBienLai } from './xu-ly-don.flow';
import { soThamPhanCong, soThamThuLy } from './so-tham.flow';
import { soThamDuaRaXetXu, soThamPhienHopHoaGiai } from './chuan-bi-xet-xu.flow';
import { soThamBanAn, soThamBienBanPhienToa } from './xet-xu.flow';
import { soThamKhangCao, soThamThongBaoKhangCao } from './khang-cao.flow';
import { chuyenHoSoLenPhucTham } from './chuyen-phuc-tham.flow';
import {
  phucThamDuaRaXetXu,
  phucThamBienBanPhienToa,
  phucThamBanAn,
  phucThamKiemKetQua,
  phucThamPhanCong,
  phucThamTamUngAnPhi,
  phucThamThuLy,
  phucThamTiepNhanHoSo,
} from './phuc-tham.flow';
import {
  gdtBieuMauHoiDong,
  gdtChuyenNhanHoSoKhangNghi,
  gdtCvpKyThongBao,
  gdtCvpTrinhPca,
  gdtDanhSachVuXetXu,
  gdtDuThaoKhangNghi,
  gdtGiaoTieuHoSo,
  gdtKiemManQuanLyVuXetXu,
  gdtKiemThuLyDon,
  gdtKyBieuMauHoiDong,
  gdtKyToTrinhToiCao,
  gdtPcaPheDuyetToTrinh,
  gdtPheDuyetChuongTrinh,
  gdtPheDuyetKhangNghi,
  gdtPhanCongThamPhanDon,
  gdtPhanCongThamPhanToiCao,
  gdtPhanCongTtvDon,
  gdtPhanCongTtvHoSo,
  gdtTaoDonDeNghi,
  gdtThongBaoPhanCong,
  gdtThuLyVuXetXu,
  gdtToTrinhPhanCong,
} from './gdt-tt.flow';

export type InputKdtm = typeof INPUT;

export const CAI_DAT: BangCaiDat<InputKdtm> = {
  // ═════════ GIAI ĐOẠN A — ĐƠN KHỞI KIỆN ═════════
  '01-tao-don-khoi-kien': ({ page, input, ghi }) => taoDonKhoiKien(page, input, ghi),
  '02-phan-cong-tham-phan-xu-ly-don': ({ page, input, ghi }) => phanCongThamPhanXuLyDon(page, input, ghi),

  '03-thong-bao-sua-doi-bo-sung-26-ds': ({ page, input, ghi, dd }) => thongBaoSuaDoiBoSung(page, input, ghi, dd.rootCaseKey),
  '04-tam-ung-an-phi-29-ds': ({ page, input, ghi }) => tamUngAnPhi(page, input, ghi),
  '05-xac-minh-bien-lai': ({ page, input, ghi, dd }) => xacMinhBienLai(page, input, ghi, dd.rootCaseKey),
  '06-thu-ly-vu-an-30-ds': ({ page, input, ghi, dd }) => thuLyVuAn(page, input, ghi, dd.rootCaseKey),


  // ═════════ GIAI ĐOẠN B — VỤ ÁN SƠ THẨM ═════════
  '07-so-tham-thu-ly': ({ page, input, ghi }) => soThamThuLy(page, input, ghi),
  '08-so-tham-phan-cong': ({ page, input, ghi, dd }) => soThamPhanCong(page, input, ghi, dd.rootCaseKey),

  '09-so-tham-phien-hop-hoa-giai': ({ page, input, ghi }) => soThamPhienHopHoaGiai(page, input, ghi),
  '10-so-tham-dua-ra-xet-xu-47-ds': ({ page, input, ghi, can }) =>
    soThamDuaRaXetXu(page, input, ghi, can('ngayThuLySoTham')),

  '11-so-tham-bien-ban-phien-toa': ({ page, input, ghi, can }) =>
    soThamBienBanPhienToa(page, input, ghi, can('ngayMoPhienToaSoTham')),

  '12-so-tham-ban-an-52-ds': ({ page, input, ghi, can }) =>
    soThamBanAn(page, input, ghi, can('ngayMoPhienToaSoTham')),

  '13-so-tham-khang-cao-55-ds': ({ page, input, ghi, can }) =>
    soThamKhangCao(page, input, ghi, can('soBanAnSoTham'), can('ngayBanAnSoTham')),
  '14-so-tham-thong-bao-khang-cao-62-ds': ({ page, input, ghi }) => soThamThongBaoKhangCao(page, input, ghi),

  '15-chuyen-ho-so-len-phuc-tham': ({ page, input, ghi, can }) =>
    chuyenHoSoLenPhucTham(page, input, ghi, can('maVuAnSoTham')),

  // ═════════ GIAI ĐOẠN C — PHÚC THẨM (vai chanhAnPhucThamHanhChinh) ═════════
  '16-phuc-tham-tiep-nhan-ho-so': ({ page, input, ghi, can }) =>
    phucThamTiepNhanHoSo(page, input, ghi, can('maVuAnSoTham'), can('ngayChuyenHoSoPhucTham')),

  '17-phuc-tham-thu-ly-65-ds': ({ page, input, ghi }) => phucThamThuLy(page, input, ghi),

  '18-phuc-tham-phan-cong-84-ds': ({ page, input, ghi }) => phucThamPhanCong(page, input, ghi),

  '19-phuc-tham-tam-ung-an-phi-83-ds': ({ page, input, ghi }) => phucThamTamUngAnPhi(page, input, ghi),
  '22-phuc-tham-ban-an-75-ds': ({ page, input, ghi, can }) =>
    phucThamBanAn(page, input, ghi, can('ngayMoPhienToaPhucTham'), can('idVuAnPhucTham')),
  '23-phuc-tham-kiem-ket-qua': ({ page, ghi, can }) => phucThamKiemKetQua(page, ghi, can('soBanAnPhucTham')),
  '21-phuc-tham-bien-ban-phien-toa': ({ page, input, ghi, can }) =>
    phucThamBienBanPhienToa(page, input, ghi, can('ngayMoPhienToaPhucTham')),
  '20-phuc-tham-dua-ra-xet-xu-66-ds': ({ page, input, ghi }) => phucThamDuaRaXetXu(page, input, ghi),

  // ═══════════ GIAI ĐOẠN D · GĐT/TT (bước 24→45) ═══════════
  //
  // THỨ TỰ KHÔNG THEO TÀI LIỆU ở một chỗ: "Thông báo phân công" (bước 29) chỉ lập được SAU KHI Phó
  // Chánh án phê duyệt tờ trình (bước 28) — xem chú thích ở flow.ts.
  '24-gdt-tao-don-de-nghi': ({ page, dd, ghi, input }) => gdtTaoDonDeNghi(page, dd, ghi, input),
  '25-gdt-phan-cong-tham-phan-ngau-nhien': ({ page, ghi, can }) =>
    gdtPhanCongThamPhanDon(page, ghi, can('gdtSoThuLyDon')),
  '26-gdt-to-trinh-phan-cong': ({ page, ghi, can }) => gdtToTrinhPhanCong(page, ghi, can('gdtMaDon')),
  '27-gdt-cvp-trinh-pca': ({ page, dd, ghi, input, can }) =>
    gdtCvpTrinhPca(page, dd, ghi, input, can('gdtKhoaToTrinh')),
  '28-gdt-pca-phe-duyet-to-trinh': ({ page, dd, ghi, input, can }) =>
    gdtPcaPheDuyetToTrinh(page, dd, ghi, input, can('gdtKhoaToTrinh')),
  '29-gdt-thong-bao-phan-cong': ({ page, ghi, can }) => gdtThongBaoPhanCong(page, ghi, can('gdtMaDon')),
  '30-gdt-cvp-ky-thong-bao': ({ page, dd, ghi, input, can }) =>
    gdtCvpKyThongBao(page, dd, ghi, input, can('gdtKhoaThongBao')),
  '31-gdt-kiem-thu-ly-don': ({ page, dd, ghi, input, can }) =>
    gdtKiemThuLyDon(page, dd, ghi, input, can('gdtMaDon'), can('gdtSoThuLyDon')),
  '32-gdt-giao-tieu-ho-so': ({ page, dd, ghi, input, can }) =>
    gdtGiaoTieuHoSo(page, dd, ghi, input, can('gdtMaDon'), can('gdtSoThuLyDon')),
  '33-gdt-phan-cong-ttv-don': ({ page, dd, ghi, input, can }) =>
    gdtPhanCongTtvDon(page, dd, ghi, input, can('gdtSoThuLyDon')),
  '34-gdt-du-thao-khang-nghi': ({ page, dd, ghi, input, can }) =>
    gdtDuThaoKhangNghi(page, dd, ghi, input, can('gdtSoThuLyDon')),
  '35-gdt-phe-duyet-khang-nghi': ({ page, dd, ghi, input, can }) =>
    gdtPheDuyetKhangNghi(page, dd, ghi, input, can('gdtKhoaDuThao')),
  '36-gdt-chuyen-nhan-ho-so-khang-nghi': ({ page, dd, ghi, input }) =>
    gdtChuyenNhanHoSoKhangNghi(page, dd, ghi, input),
  '37-gdt-thu-ly-vu-xet-xu': ({ page, dd, ghi, input }) => gdtThuLyVuXetXu(page, dd, ghi, input),
  '38-gdt-phan-cong-tham-phan-toi-cao': ({ page, dd, ghi, input }) =>
    gdtPhanCongThamPhanToiCao(page, dd, ghi, input),
  '39-gdt-ky-so-to-trinh-toi-cao': ({ page, dd, ghi, input, can }) =>
    gdtKyToTrinhToiCao(page, dd, ghi, input, can('gdtKhoaToTrinhTPTC')),
  '40-gdt-phan-cong-ttv-hskn': ({ page, dd, ghi, input, can }) =>
    gdtPhanCongTtvHoSo(page, dd, ghi, input, can('gdtSoThuLyDon')),
  '41-gdt-danh-sach-vu-xet-xu': ({ page, dd, ghi, input }) => gdtDanhSachVuXetXu(page, dd, ghi, input),
  '42-gdt-phe-duyet-chuong-trinh': ({ page, dd, ghi, input, can }) =>
    gdtPheDuyetChuongTrinh(page, dd, ghi, input, can('gdtKhoaChuongTrinh')),
  '43-gdt-quyet-dinh-hdxx': ({ page, dd, ghi, input }) => gdtBieuMauHoiDong(page, dd, ghi, input),
  '44-gdt-ky-logic-hdxx': ({ page, dd, ghi, input, can }) =>
    gdtKyBieuMauHoiDong(page, dd, ghi, input, can('gdtKhoaBieuMauHoiDong')),
  '45-gdt-man-quan-ly-vu-xet-xu': ({ page, dd, ghi, input }) => gdtKiemManQuanLyVuXetXu(page, dd, ghi, input),

};
