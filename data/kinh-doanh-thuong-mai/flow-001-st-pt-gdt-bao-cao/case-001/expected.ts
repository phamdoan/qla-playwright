/**
 * CASE-001 · KẾT QUẢ MONG ĐỢI.
 *
 * Tách khỏi `input.ts` vì đây là cái để VERIFY, không phải cái để gõ vào form. Mỗi khoá ghi rõ
 * bước nào kiểm và kiểm ở đâu trên UI — để khi hệ thống đổi chữ thì biết sửa một chỗ.
 *
 * Giá trị do hệ thống cấp (số thụ lý, mã vụ án, số bản án) KHÔNG mong đợi được trước; chỉ mong đợi
 * "có giá trị" — nên chúng là `KHOA_BAN_GIAO` bên dưới, kiểm bằng "khác rỗng" tại CHECKPOINT.
 */

export const EXPECTED = {
  /** Bước 05 → 06: sau thụ lý, tab Thụ lý của vụ án sơ thẩm phải có đủ ba thông tin này */
  thongTinThuLy: ['Số thụ lý', 'Ngày thụ lý', 'Trường hợp thụ lý'],

  /** Bước 07: danh sách người tiến hành tố tụng sơ thẩm (StepData Step4.11) */
  thanhPhanToTungSoTham: ['Thẩm phán chủ tọa', 'Thư ký', 'Hội thẩm nhân dân', 'Hội thẩm nhân dân'],

  /** Bước 08: sau 34-DS, section kết quả phiên họp hiển thị (StepData Step5.7) */
  ketQuaPhienHop: 'Phiên họp lần 1',

  /** Bước 09: section "Kết quả xét xử" sơ thẩm phải có hai ô này (StepData Step6.7) */
  oKetQuaXetXuSoTham: ['Kết quả giải quyết', 'Tình trạng giải quyết'],

  /** Bước 14: HĐXX phúc thẩm 03 Thẩm phán + Thư ký (StepData Phúc thẩm Step2.4) */
  thanhPhanToTungPhucTham: [
    'Thẩm phán chủ tọa',
    'Thẩm phán - Thành viên HĐXX',
    'Thẩm phán - Thành viên HĐXX',
    'Thư ký',
  ],

  /**
   * Bước 16: chọn "Không chấp nhận kháng cáo/kháng nghị" ở 51-DS thì 75-DS và section kết quả
   * phải hiển thị đúng câu này (StepData Phúc thẩm Step4.3, 4.5, 4.7).
   */
  ketQuaPhucTham: 'Giữ nguyên bản án sơ thẩm',

  /** Bước 18: vụ án của case phải đếm vào các ô này của biểu mẫu thống kê KDTM */
  oThongKe: {
    thuLySoTham: 1,
    giaiQuyetSoTham: 1,
    thuLyPhucTham: 1,
    giaiQuyetPhucTham: 1,
  },
} as const;

/**
 * Khoá bàn giao giữa các bước KHÔNG khai ở đây nữa — nguồn duy nhất là `flow.ts`:
 * mỗi bước khai `vao` (đọc từ state) và `ra` (sinh ra). Xem bản đồ và kiểm tính hợp lệ bằng:
 *
 *   npm run flow:lineage
 *
 * Khai hai nơi là lệch hai nơi — đó là lý do khối `KHOA_BAN_GIAO` cũ ở đây đã bỏ (30/09/2026).
 */
