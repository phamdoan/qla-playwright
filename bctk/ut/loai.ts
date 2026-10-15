/**
 * UT BÁO CÁO THỐNG KÊ — kiểu dữ liệu.
 *
 * MỘT UT = MỘT CỘT của một biểu mẫu báo cáo (2A cột 8, 4C cột 23…), và câu hỏi của UT luôn là:
 *
 *     "Thứ mà mapping nói ô này cần — ĐÃ CÓ TRÊN MÀN HÌNH chưa?"
 *
 * Chốt 14/10/2026 (người dùng): **không kiểm bằng SQL**. SQL trong `Mapping_<mã>.xlsx` chỉ để biết ô
 * đó cần dữ liệu gì; việc kiểm phải lên màn thao tác. Vì vậy mỗi UT mang theo thứ phải đi tìm trên
 * màn (mã biểu mẫu, nhóm danh mục, trường nhập) chứ không mang câu truy vấn.
 */

/** Loại UT = cách kiểm trên màn. */
export type LoaiUt =
  /** cột cộng/trừ cột khác → kiểm bằng chính các ô khác của biểu mẫu, không cần màn nguồn */
  | 'CONG_THUC'
  /** ô chốt bằng `VANBAN.MA_BIEUMAU IN (…)` → tìm mã đó trên màn Quản lý biểu mẫu */
  | 'BIEU_MAU'
  /** ô chốt bằng `MA_LOAI_DANHMUC IN (…)` → tìm nhóm đó trên ô chọn danh mục của màn nghiệp vụ */
  | 'DANH_MUC'
  /** ô chốt bằng cột DB (`VUAN.NGAY_THULY`…) → tìm trường tương ứng trên màn, cần khai neo */
  | 'TRUONG'
  /** mapping chưa chốt được gì → không bịa UT, ghi rõ lý do */
  | 'CHUA_RO';

/** Màn hình (giải mã từ cột "Mockup/ Màn hình" của BA). */
export type MaMan =
  | 'XU_LY_DON'
  | 'THU_LY'
  | 'CHUAN_BI_XET_XU'
  | 'XET_XU'
  | 'KET_QUA'
  | 'NGUOI_THAM_GIA'
  | 'TOA_CAP_TREN'
  | 'LAY_TU_SO_THAM'
  | 'TOAN_BO'
  | 'CONG_THUC';

export interface ManhUt {
  kieu: LoaiUt;
  /** mã biểu mẫu, mã nhóm danh mục, `BẢNG.CỘT`, hoặc nguyên văn công thức */
  chiTiet: string;
}

export interface UtCot {
  /** mã biểu mẫu báo cáo: '2A', '4C'… */
  bieuMau: string;
  /** số cột trên biểu mẫu (cột 1, 2, 3…) — khớp với đầu đề in trên biểu mẫu giấy */
  soCot: number;
  /** tên cột, ghép các mức tiêu đề: 'SỐ VỤ VIỆC ĐÃ GIẢI QUYẾT · Đình chỉ · Tổng số' */
  tenCot: string;
  /** nguyên văn ô "Mockup/ Màn hình" của BA — rỗng là BA chưa ghi */
  manHinhMapping: string;
  manHinh: MaMan[];
  loai: LoaiUt;
  /** mã biểu mẫu phải có trên hệ thống để ô này đếm được */
  maBieuMauCanCo: string[];
  /** nhóm danh mục phải có */
  nhomDanhMucCanCo: string[];
  /** cột DB mapping nhắc tới → suy ra trường phải có trên màn */
  cotDbCanCo: string[];
  /** 'Cột 6 = Cột 2 + Cột 3 - Cột 4 - Cột 5' */
  congThuc: string;
  /** cột "Trạng thái nghiệp vụ dữ liệu" của BA */
  trangThaiBa: string;
  coTaiLieu: string;
  coDb: string;
  coHeThong: string;
  /** chỉ có khi loai = 'CHUA_RO' */
  lyDoChuaRo: string;
  /** dòng trong sheet mapping — để tra lại tài liệu gốc */
  dongExcel: number;
}

export interface BoUt {
  /** mã biểu mẫu báo cáo */
  ma: string;
  /** tên tệp mapping đã bóc (tệp gốc KHÔNG nằm trong repo) */
  tepNguon: string;
  /** nguyên văn dòng "Bộ lọc chung" của sheet mapping */
  boLocChung: string;
  cot: UtCot[];
}

/** NEO: chỗ phải đi tìm trên màn hình cho một thứ mapping yêu cầu. */
export interface Neo {
  /** màn hình mở để kiểm (route tương đối với `/qla/`) */
  route: string;
  /** tên màn người dùng thấy — vào tên test */
  tenMan: string;
  /** nhãn trường / mục cần tìm trên màn đó */
  nhan: string;
  /** vì sao tin là đúng chỗ: `file:line` trong qla-webapp, hoặc lần chạy thật */
  bangChung: string;
}

/**
 * NEO của một nhóm danh mục: tổ hợp ô phải chọn để ô "Quan hệ pháp luật (Thống kê)" nạp nhóm đó.
 *
 * Mã nhóm KHÔNG hiện trên màn (màn chỉ hiện tên nhánh), nên bằng chứng "nhóm đã có" là: chọn đúng
 * tổ hợp thì cây có nhánh. Vì vậy neo mang tổ hợp + số nhánh đã đo, không mang một nhãn duy nhất.
 */
export interface NeoNhomDanhMuc {
  /** giá trị ô "Loại đơn" */
  loaiDon: string;
  /** giá trị ô "Phân loại đơn" */
  phanLoai: string;
  /** số nhánh cấp 1 đã đo được — 0 nghĩa là nhóm chưa có trên màn */
  soNhanhDaDo: number;
  /** một nhánh làm mẫu, để biết đúng nhóm chứ không phải nhóm khác */
  nhanhMau: string;
  bangChung: string;
}

export const TEN_LOAI_UT: Record<LoaiUt, string> = {
  CONG_THUC: 'cột phép tính',
  BIEU_MAU: 'mã biểu mẫu',
  DANH_MUC: 'nhóm danh mục',
  TRUONG: 'trường trên màn',
  CHUA_RO: 'mapping chưa chốt',
};
