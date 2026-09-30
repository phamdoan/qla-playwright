/**
 * KDTM_CASE_001 — dữ liệu gieo của case, TẤT ĐỊNH.
 *
 * Không đọc Excel, không `Math.random`, không `Date.now()` làm khoá nghiệp vụ. Mọi giá trị mô tả
 * sinh từ `rootCaseKey` nên chạy bao nhiêu lần cũng ra cùng một bộ.
 *
 * Tên đương sự MANG LUÔN MÃ CASE → nhìn dữ liệu trên hệ thống là biết của case nào, và tra trùng
 * chỉ bằng một lần tìm kiếm theo tên.
 *
 * Số/ngày/tòa bản án KHÔNG khai ở đây: chúng là OUTPUT, do hệ thống cấp ở bước "Lấy số" của bản án
 * sơ thẩm, rồi ghi vào CaseState cho giai đoạn sau dùng lại.
 */
export const MODULE = 'KINH_DOANH_THUONG_MAI';
export const CASE_ID = 'KDTM_CASE_001';
export const ROOT_CASE_KEY = `${MODULE}|${CASE_ID}`;

export const CASE_001 = {
  module: MODULE,
  caseId: CASE_ID,
  rootCaseKey: ROOT_CASE_KEY,

  /**
   * Tài khoản chạy thông luồng: chanhAn = 031069016666 (Chánh án TANDTC) — tài khoản cao nhất,
   * dùng để thông luồng đơn → sơ thẩm → phúc thẩm → GĐT/TT (chốt 30/09/2026).
   *
   * StepData b1 ghi 001072038795 (Nguyễn Mậu Trường) nhưng ĐO 30/09/2026 tài khoản đó mở
   * /qla/quan-ly-don/don-khoi-kien-va-yeu-cau/danh-sach ra 'Rất tiếc! Không tìm thấy trang!';
   * canBoDanSu thì menu chỉ có cụm Thi hành án. Nguyễn Mậu Trường vẫn là giá trị ô 'Người nhận đơn'.
   */
  vaiNhapDon: 'chanhAn',

  /** Bước 1 — Thông tin đơn */
  hinhThucNhanDon: 'Trực tiếp',
  /** StepData b4.5 — Người nhận đơn */
  nguoiNhanDon: 'Nguyễn Mậu Trường',
  loaiDon: 'Kinh doanh, thương mại',
  phanLoaiDon: 'Đơn khởi kiện',
  /** Từ khoá tra danh mục "Quan hệ pháp luật (Thống kê)" — nhóm tranh chấp KDTM */
  /** Thử lần lượt tới khi danh mục ra mục — danh mục lọc phía máy chủ, từ khoá dài dễ ra rỗng */
  tuKhoaQhpl: ['Tranh chấp hợp đồng mua bán', 'mua bán hàng hóa', 'Tranh chấp hợp đồng', 'Tranh chấp'],
  quanHePhapLuatChiTiet: 'Tranh chấp hợp đồng mua bán hàng hóa',
  lyDoKhongHoaGiai: 'Các bên đã thỏa thuận không tiến hành hòa giải tại Tòa án.',

  /**
   * Bước 2 — Đương sự.
   *
   * ⚠ LỆCH ĐẶC T�ả: StepData b6.2/b6.3 yêu cầu "Doanh nghiệp / Tổ chức". Helper dùng chung
   *  hiện CHỈ có nhánh cá nhân (điền #conNguoi_hoTen, giới tính, ngày sinh).
   * Để thông luồng một vụ KDTM trước, tạm dùng đương sự CÁ NHÂN; nhánh pháp nhân bổ sung sau.
   * Tên vẫn mang mã case (K001) để tra trùng bằng một lần tìm kiếm.
   */
  nguyenDon: { nguyenVan: 'Trần Kinh Doanh K001', hoTen: 'Trần Kinh Doanh K001', tuoi: 45, laToChuc: false },
  biDon: { nguyenVan: 'Lê Thương Mại K001', hoTen: 'Lê Thương Mại K001', tuoi: 50, laToChuc: false },

  /** Bước 3 — Yêu cầu */
  noiDungYeuCau:
    'Đề nghị Tòa án giải quyết tranh chấp kinh doanh thương mại giữa Trần Kinh Doanh K001 và Lê Thương Mại K001.',
  giaTriYeuCau: '150000000',
} as const;

/** Bước bắt buộc phải xong trước mỗi bước của case này */
export const PHU_THUOC: Record<string, string | undefined> = {
  'A02-phan-cong-tham-phan-xu-ly-don': 'A01-tao-don-khoi-kien',
  'A03-ket-qua-xu-ly-don': 'A02-phan-cong-tham-phan-xu-ly-don',
  'A04-thu-ly-vu-an': 'A03-ket-qua-xu-ly-don',
};
