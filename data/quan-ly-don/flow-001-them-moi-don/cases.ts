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
 *
 * ⚠ PRE-PROD CHỈ CHẠY BA CASE KHÔNG OCR (chốt 04/10/2026). Case `ocr` chạy trên pre-prod bị NÉM LỖI
 * ngay ở bước 01 — xem `them-moi.flow.ts`. Lệnh sẵn: `npm run don:preprod`.
 *
 * ───────────────────────── TỆP ĐƠN TẢI LÊN LÀ TỆP THẬT ─────────────────────────
 *
 * Màn Thêm mới bắt buộc tải tệp trước khi vào form. Mỗi case dùng MỘT tệp khác nhau, lấy từ bộ tài
 * liệu thật `D:\gtel\OCR - Giám đốc thẩm - tái thẩm-20261002T081636Z-1-001` (9 PDF), đã chép vào
 * `data/` với tên ASCII:
 *
 *   don-gdt.pdf                       ← "Đơn GĐT.pdf"                        4,4 MB
 *   phieu-chuyen-kem-don-gdt.pdf      ← "Phiếu chuyển + Đơn GĐT.pdf"         1,6 MB
 *   qd-khang-nghi-vksndtc.pdf         ← "04-QĐ kháng nghị số 11 … VKSNDTC"   229 KB
 *   don-de-nghi-gdt.pdf               ← "Don de nghị GDT.pdf"                10,4 MB
 *   don-giam-doc-tham.pdf             ← "Don giam doc tham.pdf"              13,2 MB
 *   cv-kien-nghi.pdf                  ← "CV Kiến nghị.pdf"                   1,8 MB
 *   (còn cv-chuyen-don.pdf, phieu-chuyen-don.pdf, don-khieu-nai-tu-phap-kem-cv.pdf chưa dùng)
 *
 * Ba case KHÔNG OCR nhận tệp NHỎ (229 KB – 4,4 MB) để lượt chạy nhanh; ba case OCR nhận tệp lớn,
 * nhiều nội dung hơn cho bộ bóc tách.
 *
 * `data/*.pdf` bị gitignore — tài liệu thật KHÔNG lên repo công khai, và `git archive` không mang
 * sang bản sao, nên phải dựng bản sao bằng `node tools/dung-ban-sao-chay.js <tên>`.
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
      tepDon: 'don-gdt.pdf',
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
      tepDon: 'phieu-chuyen-kem-don-gdt.pdf',
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
      tepDon: 'qd-khang-nghi-vksndtc.pdf',
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
      tepDon: 'don-de-nghi-gdt.pdf',
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
      tepDon: 'don-giam-doc-tham.pdf',
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
      tepDon: 'cv-kien-nghi.pdf',
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
