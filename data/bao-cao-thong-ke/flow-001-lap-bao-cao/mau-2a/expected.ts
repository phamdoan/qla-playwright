/**
 * CASE MAU-2A · KẾT QUẢ MONG ĐỢI.
 *
 * Nguồn: sheet "Kịch bản 2A" và sheet "2A" của `Tester/Testcase_BCTK_2_Dân sự.xlsx`.
 *
 * `soLieu` đang để trống: Kịch bản 2A chỉ liệt kê vụ và cột bị ảnh hưởng, chưa có con số mong đợi
 * cho từng ô. Điền bằng số đã chốt với Tester — KHÔNG lấy số đang hiện trên màn làm mong đợi
 * (thế là tự so với chính mình).
 */
export const EXPECTED = {
  /** Bước 02: số cột biểu mẫu 2A phải hiện đủ (sheet "2A": cột (1)…(47) — "Chia biểu giai đoạn cuối") */
  soCot: 47,

  /** Bước 03: giá trị mong đợi theo cột, khoá = số cột, vd. { 3: 12 } */
  soLieu: {} as Record<number, number>,

  /** Bước 03: công thức cột cộng phải đúng trên mọi dòng — CHƯA CHÉP từ sheet "2A" */
  congThuc: [] as { cot: number; bang: number[] }[],
};
