/**
 * FLOW-001 QUẢN LÝ ĐƠN · BẢN ĐỒ BƯỚC — thêm mới Đơn đề nghị GĐT/TT ở `/qla/quan-ly-don/them-moi`.
 *
 * Vì sao có luồng này: đơn vào hệ thống bằng NHIỀU đường — nhận từ hình sự, nhận từ dân sự, hoặc
 * cán bộ HCTP tự nhập mới. Hai luồng vụ án hiện có chỉ đi đường "tạo đơn khởi kiện"; đường
 * "Thêm mới đơn" (có OCR) thì trước đây chỉ chạy bằng hai spec rời, đã bị xoá ở commit `05ec318`:
 *   · `tests/them-moi-don.spec.ts`        — đường OCR
 *   · `tests/tao-don-khong-ocr.spec.ts`   — đường không OCR, seed 20 đơn
 * Page object `pages/them-moi-don.page.ts` và bộ sinh dữ liệu `seed/du-lieu-don-khong-ocr.ts` thì
 * VẪN CÒN. Luồng này đưa cả hai đường vào khung FLOW/CASE/STEP, case là dữ liệu.
 *
 * ───────────────────────── HAI ĐƯỜNG VÀO, MỘT BỘ BƯỚC ─────────────────────────
 *
 * Màn Thêm mới BẮT BUỘC tải tệp đơn PDF trước khi vào form. Sau khi tải xong hệ thống hỏi
 * "Xác nhận xử lý OCR":
 *   · bấm "Bắt đầu OCR" → chờ bóc tách (FE tự dừng sau 15 phút) → "Lấy thông tin" → màn
 *     `them-moi-tu-ocr` đã điền sẵn một phần → kịch bản điền phần còn thiếu;
 *   · bấm "Quay lại" → nhập tay toàn bộ.
 * Hai đường về CÙNG một form, nên cùng một bộ bước; `duongVao` của case quyết định đi đường nào.
 *
 * ───────────────────────── "Loại QĐ/BA": NGUỒN SỰ THẬT LÀ MÀN HÌNH ─────────────────────────
 *
 * Đo bằng `tests/quan-ly-don/flows/do-loai-qd-ba.spec.ts` ngày 04/10/2026 — màn mở ĐÚNG BA lựa chọn:
 *
 *   Bản án · Quyết định · Quyết định miễn/giảm THA
 *
 * KHÔNG phải sáu giá trị của `QTDM.DANHMUC` nơi `MA_LOAI_DANHMUC='LOAI_QUYET_DINH_BAN_AN'`, và nhãn
 * "Quyết định miễn/giảm THA" tra cả bảng danh mục cũng không ra dòng nào. Ba select khác cũng lệch
 * CSDL y như vậy (Cấp xét xử 4 ≠ 3 · Thủ tục giải quyết 4 ≠ 3 · Hình thức nhận 5 và khác hẳn tên).
 * Vì thế bộ case gieo theo kết quả DÒ, không gieo theo bảng danh mục.
 */
import type { DinhNghiaFlow } from '../../../khung/flow';

const NGUON = 'tests/quan-ly-don/flows/do-loai-qd-ba.spec.ts (đo màn 04/10/2026)';

export const FLOW_QLD_001: DinhNghiaFlow = {
  phanHe: 'quan-ly-don',
  flow: 'flow-001-them-moi-don',
  module: 'QUAN_LY_DON',
  ten: 'Thêm mới Đơn đề nghị GĐT/TT: tải tệp → (OCR | không OCR) → điền kín mọi khối → lưu → mở lại so từng trường',
  nguon: NGUON,
  buoc: [
    {
      ma: '01-them-moi-don',
      ten: 'Tải tệp đơn → OCR hoặc bỏ qua → điền kín mọi khối → Lưu thông tin',
      manHinh: 'Danh sách đơn → Thêm mới đơn (/qla/quan-ly-don/them-moi)',
      /**
       * Mở DANH SÁCH đơn, không mở thẳng `quan-ly-don/them-moi`: màn Thêm mới ẩn thanh menu bên
       * trái, mà bước này vào qua menu — cùng lý do đã ghi ở bước 24 của luồng KDTM.
       */
      route: 'quan-ly-don/danh-sach-don',
      vai: 'canBo',
      vao: [],
      ra: ['idDon', 'maDon'],
      nguon: NGUON,
      xacMinh: 'API',
      bangChungXacMinh:
        'API lưu đơn trả id + toast "Lưu thông tin thành công"; `maDon` do máy chủ cấp, không gieo trước',
    },
    {
      ma: '02-kiem-tra-sau-luu',
      ten: 'Mở lại đơn, so TỪNG TRƯỜNG với giá trị đã nhập + kiểm các bảng con có đủ dòng',
      manHinh: 'Chi tiết đơn (/qla/quan-ly-don/them-moi/{idDon})',
      route: 'quan-ly-don/them-moi/{idDon}',
      vai: 'canBo',
      vao: ['idDon'],
      ra: ['soTruongKhop', 'soBangKhop'],
      nguon: NGUON,
      xacMinh: 'MAN-HINH',
      bangChungXacMinh:
        'đọc lại từng ô trên màn chi tiết và so với giá trị chụp trước khi lưu — lệch một ô là bước đỏ',
    },
  ],
};
