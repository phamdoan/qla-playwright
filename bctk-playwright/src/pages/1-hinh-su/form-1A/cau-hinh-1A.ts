import path from 'path';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docKhoaGiaTriSync } from '../../../utils/excel-helper';
import { TrangThaiChung } from '../../../utils/trang-thai';
import { VuAnLuong } from '../../common/buoc';

/**
 * Phần dùng chung của luồng 1A: cấu hình (data-form-1A.xlsx) và kiểu dữ liệu các bước để lại cho nhau.
 * Form này KHÔNG có file đầu vào — mọi dữ liệu (bị can, người bào chữa, tội danh…) sinh ngẫu nhiên.
 * Giống 1A1, khác ở bị can là CÁ NHÂN (bước 03) và bản án phải điền thông tin bị cáo (bước 09).
 * Các bước nằm ở ./buoc/, ghép thành luồng ở create-case-1A.page.ts.
 */

/** Cấu hình luồng 1A (src/data/1-hinh-su/data-form-1A.xlsx, sheet "Cấu hình") */
export interface CauHinh1A {
  linhVuc: LinhVuc;
  bieuMau: string;
  tenBieuMau: string;
  /** Tòa tạo vụ án — chọn tài khoản theo cột "Tòa án" của Taikhoan.xlsx */
  toaAn: string;
  /** Viện kiểm sát chọn khi thụ lý */
  vienKiemSat: string;
  /** Số vụ án tạo mỗi lần chạy (BCTK_SO_DON_1A trong .env.staging ghi đè; trống thì BCTK_SO_DON chung) */
  soVu: number;
  /** Số bị can cá nhân thêm vào mỗi vụ ở bước 03 (BCTK_SO_BI_CAN_1A trong .env.staging ghi đè) */
  soBiCan: number;
}

/** Một bị can cá nhân đã thêm ở bước 03 */
export interface BiCan {
  ten: string;
  ngaySinh: string;
  cccd: string;
  dieuLuat: string;
}

/** Người bào chữa đã thêm ở bước 04 */
export interface NguoiBaoChua {
  ten: string;
  tuCach: string;
  /** Tên bị can được bào chữa */
  biCan: string;
}

/**
 * Một "ô" vụ án trong lần chạy: Vụ 01, Vụ 02…
 * Ô chạy hết các bước thì lần sau tự tạo vụ mới; ô đang dở thì lần sau chạy tiếp từ chỗ dừng.
 */
export interface VuNguon extends VuAnLuong {
  toaAn: string;
}

/** Dữ liệu các bước để lại, lưu ở state/1-hinh-su/form-1A/<Vụ NN>.json */
export interface TrangThai1A extends TrangThaiChung {
  /** Link chi tiết hồ sơ tiếp nhận (…/ho-so-tiep-nhan/chi-tiet/<id>) */
  urlHoSo?: string;
  maHoSo?: string;
  /** Tên bị can đầu vụ ở hồ sơ — bước 03 dùng làm tên bị can thứ nhất */
  tenBiCanHoSo?: string;
  /** Tội danh chọn ở hồ sơ, vd. "Điều 173 - Trộm cắp tài sản" */
  toiDanh?: string;
  /** Link chi tiết vụ án sơ thẩm (…/so-tham/chi-tiet?id=…) */
  urlVuAn?: string;
  /** Mã vụ án thật trên hệ thống, vd. VA26-006694 */
  maVuAnHeThong?: string;
  /** Các bị can bước 03 đã thêm, theo thứ tự lượt */
  dsBiCan?: BiCan[];
  /** Người bào chữa bước 04 đã thêm */
  dsBaoChua?: NguoiBaoChua[];
  soThuLy?: string;
  ngayThuLy?: string;
  thamPhanChuToa?: string;
  soQDThamPhan?: string;
  hoiTham?: string;
  soQDHoiTham?: string;
  /** Số quyết định đưa vụ án ra xét xử (bước 08) */
  soQDXetXu?: string;
  /** Ngày mở phiên tòa đã lên lịch ở bước 08 — dùng làm ngày bản án */
  ngayXetXu?: string;
  soBanAn?: string;
  ngayBanAn?: string;
}

export function docCauHinh1A(): CauHinh1A {
  const file = path.join(DATA_DIR, '1-hinh-su', 'data-form-1A.xlsx');
  const ch = docKhoaGiaTriSync(file, 'Cấu hình');
  const bat = (khoa: string) => {
    if (!ch[khoa]) throw new Error(`${file}: sheet "Cấu hình" thiếu giá trị "${khoa}"`);
    return ch[khoa];
  };
  return {
    linhVuc: bat('Lĩnh vực') as LinhVuc,
    bieuMau: bat('Biểu mẫu'),
    tenBieuMau: bat('Tên biểu mẫu'),
    toaAn: bat('Tòa án'),
    vienKiemSat: bat('Viện kiểm sát'),
    soVu: Math.max(1, Number(process.env.BCTK_SO_DON_1A) || Number(process.env.BCTK_SO_DON) || Number(ch['Số vụ tạo mỗi lần chạy']) || 1),
    soBiCan: Math.max(1, Number(process.env.BCTK_SO_BI_CAN_1A) || Number(ch['Số bị can mỗi vụ']) || 1),
  };
}

/** Bị can đã thêm */
export const dsBiCan = (tt: TrangThai1A): BiCan[] => tt.dsBiCan ?? [];

/** Người bào chữa đã thêm */
export const dsBaoChua = (tt: TrangThai1A): NguoiBaoChua[] => tt.dsBaoChua ?? [];

/** Cấu hình đã đọc sẵn, dùng chung cho các bước */
export const cauHinh1A = docCauHinh1A();

/** Các ô vụ án của lần chạy: Vụ 01 … Vụ N */
export const danhSachVu1A = (ch: CauHinh1A): VuNguon[] =>
  Array.from({ length: ch.soVu }, (_, i) => ({ maVuAn: `Vụ ${String(i + 1).padStart(2, '0')}`, toaAn: ch.toaAn }));
