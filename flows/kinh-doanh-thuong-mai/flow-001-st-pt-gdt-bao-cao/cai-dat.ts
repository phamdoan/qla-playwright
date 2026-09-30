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
  phucThamPhanCong,
  phucThamTamUngAnPhi,
  phucThamThuLy,
  phucThamTiepNhanHoSo,
} from './phuc-tham.flow';

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
  '20-phuc-tham-dua-ra-xet-xu-66-ds': ({ page, input, ghi }) => phucThamDuaRaXetXu(page, input, ghi),

  // Bước 21–44 chưa cài đặt.
  //
  // ĐÍNH CHÍNH 30/09/2026: ghi chú cũ ở đây nói 48-DS/51-DS "không có trên màn vụ án KDTM" là SAI.
  // Kịch bản dò không thấy chúng vì hai khối "Bản án sơ thẩm" và "Quyết định của Hội đồng xét xử"
  // không dùng `.ant-card`, còn ô chọn loại thì đã điền sẵn "48-DS" nên bộ lọc theo chữ
  // "Chọn loại biểu mẫu" trượt. Người dùng xác nhận bằng ảnh màn hình — xem xet-xu.flow.ts.
};
