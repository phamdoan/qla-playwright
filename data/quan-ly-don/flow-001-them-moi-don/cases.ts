/**
 * LUỒNG THÊM MỚI ĐƠN · DANH SÁCH CASE.
 *
 * Phủ TOÀN BỘ ba giá trị "Loại QĐ/BA" mà màn hình thật mở ra, nhân với HAI đường vào (OCR và không
 * OCR) → 6 case. Mỗi case còn đổi thêm Cấp xét xử · Hình thức nhận · Thủ tục giải quyết · Loại án
 * để dữ liệu trên màn Danh sách đơn trông đa dạng như thật, không phải 6 bản sao.
 *
 * ⚠ GIÁ TRỊ Ở ĐÂY ĐO TỪ MÀN HÌNH, không lấy từ `QTDM.DANHMUC`.
 * `tests/quan-ly-don/flows/do-loai-qd-ba.spec.ts` ngày 04/10/2026:
 *
 *   Loại QĐ/BA (3)        Bản án · Quyết định · Quyết định miễn/giảm THA
 *   Cấp xét xử (4)        Sơ thẩm · Phúc thẩm · Giám đốc thẩm · Tái thẩm
 *   Thủ tục giải quyết (4) Giám đốc thẩm · Tái thẩm · Giám đốc thẩm - Tái thẩm · Chưa xác định
 *   Hình thức nhận (5)    Trực tiếp · Tiếp công dân · Bưu điện · Điện tử · Nội bộ
 *   Loại án (9)           Hình sự · Dân sự · Hành chính · Kinh doanh thương mại · Hôn nhân gia đình
 *                         · Lao động · Sở hữu trí tuệ · Phá sản · Phục hồi
 *
 * CSDL nói khác hẳn cho 4/5 ô trên (`LOAI_QUYET_DINH_BAN_AN` có 6 giá trị, không có "Quyết định
 * miễn/giảm THA"; `HINH_THUC_NHAN_DON` có 3 và tên khác). Gieo theo CSDL là case chết.
 *
 * Chọn case lúc chạy:
 *   QLA_CASE=don-01-ban-an-khong-ocr          chỉ một case
 *   QLA_CASE=don-01-...,don-04-...            vài case
 *
 * ⚠ CASE OCR CHẬM: bóc tách tệp PDF mất vài phút, FE tự dừng sau 15 phút. Ba case OCR nên chạy
 * riêng, đừng chạy cùng ba case không-OCR nếu đang cần kết quả nhanh.
 */
import type { CaseChay } from '../../../khung/luong';
import type { InputThemMoiDon } from '../../../flows/quan-ly-don/flow-001-them-moi-don/cai-dat';
import { FLOW_QLD_001 } from '../../../flows/quan-ly-don/flow-001-them-moi-don/flow';
import type { DinhDanhCase } from '../../../khung/case-state';

/** Định danh của một case bất kỳ trong luồng này — khoá gieo bất biến, biết trước khi chạy */
export function ddCase(caseId: string): DinhDanhCase {
  return {
    phanHe: FLOW_QLD_001.phanHe,
    flow: FLOW_QLD_001.flow,
    caseId,
    module: FLOW_QLD_001.module,
    rootCaseKey: `${FLOW_QLD_001.module}|${FLOW_QLD_001.flow}|${caseId}`,
  };
}

/** Vai nhập đơn: cán bộ HCTP — cùng vai mà bước 24 của luồng KDTM đang dùng */
const VAI = 'canBo';

type KhaiCase = {
  id: string;
  input: InputThemMoiDon;
};

const DS: KhaiCase[] = [
  // ───────── Đường KHÔNG OCR (nhanh, dùng để xác nhận dữ liệu trước) ─────────
  {
    id: 'don-01-ban-an-khong-ocr',
    input: {
      vaiNhapDon: VAI,
      duongVao: 'khong-ocr',
      loaiAnMa: 'DAN_SU',
      loaiQdBa: 'Bản án',
      capXetXu: 'Phúc thẩm',
      hinhThucNhan: 'Trực tiếp',
      thuTucGiaiQuyet: 'Giám đốc thẩm',
      quanHePhapLuat: 'Tranh chấp hợp đồng vay tài sản',
    },
  },
  {
    id: 'don-02-quyet-dinh-khong-ocr',
    input: {
      vaiNhapDon: VAI,
      duongVao: 'khong-ocr',
      loaiAnMa: 'DAN_SU',
      loaiQdBa: 'Quyết định',
      capXetXu: 'Phúc thẩm',
      hinhThucNhan: 'Bưu điện',
      thuTucGiaiQuyet: 'Tái thẩm',
      quanHePhapLuat: 'Tranh chấp hợp đồng chuyển nhượng quyền sử dụng đất',
    },
  },
  {
    id: 'don-03-mien-giam-tha-khong-ocr',
    input: {
      vaiNhapDon: VAI,
      duongVao: 'khong-ocr',
      /**
       * "Quyết định miễn/giảm THA" là chuyện thi hành án → gieo án HÌNH SỰ, và case này cũng là case
       * duy nhất đi qua bảng "Thông tin khiếu nại" (bảng chỉ có ở án hình sự).
       */
      loaiAnMa: 'HINH_SU',
      loaiQdBa: 'Quyết định miễn/giảm THA',
      capXetXu: 'Sơ thẩm',
      hinhThucNhan: 'Tiếp công dân',
      thuTucGiaiQuyet: 'Chưa xác định',
    },
  },

  // ───────── Đường OCR (chậm: bóc tách tệp PDF, FE tự dừng sau 15 phút) ─────────
  {
    id: 'don-04-ban-an-ocr',
    input: {
      vaiNhapDon: VAI,
      duongVao: 'ocr',
      loaiAnMa: 'DAN_SU',
      loaiQdBa: 'Bản án',
      capXetXu: 'Phúc thẩm',
      hinhThucNhan: 'Điện tử',
      thuTucGiaiQuyet: 'Giám đốc thẩm',
      quanHePhapLuat: 'Tranh chấp về thừa kế tài sản',
    },
  },
  {
    id: 'don-05-quyet-dinh-ocr',
    input: {
      vaiNhapDon: VAI,
      duongVao: 'ocr',
      loaiAnMa: 'HINH_SU',
      loaiQdBa: 'Quyết định',
      capXetXu: 'Giám đốc thẩm',
      hinhThucNhan: 'Nội bộ',
      thuTucGiaiQuyet: 'Giám đốc thẩm - Tái thẩm',
    },
  },
  {
    id: 'don-06-mien-giam-tha-ocr',
    input: {
      vaiNhapDon: VAI,
      duongVao: 'ocr',
      loaiAnMa: 'DAN_SU',
      loaiQdBa: 'Quyết định miễn/giảm THA',
      capXetXu: 'Tái thẩm',
      hinhThucNhan: 'Trực tiếp',
      thuTucGiaiQuyet: 'Tái thẩm',
      quanHePhapLuat: 'Tranh chấp hợp đồng thuê nhà',
    },
  },
];

export const DS_CASE: CaseChay<InputThemMoiDon>[] = DS.map(c => ({ dd: ddCase(c.id), input: c.input }));
