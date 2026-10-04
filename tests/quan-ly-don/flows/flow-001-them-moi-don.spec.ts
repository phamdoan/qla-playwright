/**
 * FLOW QUẢN LÝ ĐƠN 001 — MỘT FILE, chạy cả luồng "Thêm mới đơn" cho từng case.
 *
 * ⚠ TẠO DỮ LIỆU THẬT trên môi trường. Chỉ chạy khi `QLA_TKM_CHO_PHEP_GHI=1` (npm script có `--ghi`).
 *
 *   npm run don:ui              xem từng bước trên giao diện Playwright (KHÔNG tự chạy, bấm ▶ từng test)
 *   npm run don:khong-ocr       chạy thẳng 3 case không OCR  (nhanh — xác nhận dữ liệu trước)
 *   npm run don:ocr             chạy 3 case OCR              (chậm: bóc tách PDF)
 *   npm run don                 chạy cả 6 case
 *
 * Mỗi case 2 bước: 01 nhập + lưu (bằng chứng = `idDon` máy chủ trả) · 02 mở lại so TỪNG TRƯỜNG.
 */
import { khaiLuong } from '../../../khung/luong';
import { CAI_DAT } from '../../../flows/quan-ly-don/flow-001-them-moi-don/cai-dat';
import { FLOW_QLD_001 } from '../../../flows/quan-ly-don/flow-001-them-moi-don/flow';
import { DS_CASE } from '../../../data/quan-ly-don/flow-001-them-moi-don/cases';

khaiLuong({
  flow: FLOW_QLD_001,
  dsCase: DS_CASE,
  caiDat: CAI_DAT,
  /** Cả luồng chạy bằng một tài khoản cán bộ HCTP — khai ở `vaiNhapDon` của case */
  vai: (buoc, input) => (buoc.vai === 'canBo' ? input.vaiNhapDon : buoc.vai),
  /**
   * Case OCR phải chờ bóc tách tệp PDF; FE tự dừng sau 15 phút (`OCR_POLL_TIMEOUT_MS`) nên bước 01
   * cần hơn 15 phút, không thì Playwright đóng context trước FE và lỗi in ra lại là "không thấy nút",
   * sai hẳn chỗ — đúng cái đã xảy ra với bước 01 của luồng hình sự.
   */
  phut: (buoc, input) => (buoc.ma === '01-them-moi-don' && input.duongVao === 'ocr' ? 30 : 12),
});
