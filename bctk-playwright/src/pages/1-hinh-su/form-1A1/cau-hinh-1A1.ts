import path from 'path';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docKhoaGiaTriSync } from '../../../utils/excel-helper';
import { TrangThaiChung } from '../../../utils/trang-thai';
import { VuAnLuong } from '../../common/buoc';

/**
 * Phần dùng chung của luồng 1A1: cấu hình (form-1A1.xlsx) và kiểu dữ liệu các bước để lại cho nhau.
 * Form này KHÔNG có file đầu vào — mọi dữ liệu (bị can, pháp nhân, người bào chữa, tội danh…) sinh ngẫu nhiên.
 * Các bước nằm ở ./buoc/, ghép thành luồng ở create-case-1A1.page.ts.
 */

/** Cấu hình luồng 1A1 (src/data/1-hinh-su/form-1A1.xlsx, sheet "Cấu hình") */
export interface CauHinh1A1 {
  linhVuc: LinhVuc;
  bieuMau: string;
  tenBieuMau: string;
  /** Tòa tạo vụ án — chọn tài khoản theo cột "Tòa án" của Taikhoan.xlsx */
  toaAn: string;
  /** Viện kiểm sát chọn khi thụ lý */
  vienKiemSat: string;
  /** Số vụ án tạo mỗi lần chạy (BCTK_SO_VU trong .env ghi đè) */
  soVu: number;
}

/**
 * Một "ô" vụ án trong lần chạy: Vụ 01, Vụ 02…
 * Ô chạy hết các bước thì lần sau tự tạo vụ mới; ô đang dở thì lần sau chạy tiếp từ chỗ dừng.
 */
export interface VuNguon extends VuAnLuong {
  toaAn: string;
}

/** Dữ liệu các bước để lại, lưu ở state/1-hinh-su/form-1A1/<Vụ NN>.json */
export interface TrangThai1A1 extends TrangThaiChung {
  /** Link chi tiết hồ sơ tiếp nhận (…/ho-so-tiep-nhan/chi-tiet/<id>) */
  urlHoSo?: string;
  maHoSo?: string;
  tenBiCanHoSo?: string;
  /** Tội danh chọn ở hồ sơ, vd. "Điều 173 - Trộm cắp tài sản" */
  toiDanh?: string;
  /** Link chi tiết vụ án sơ thẩm (…/so-tham/chi-tiet?id=…) */
  urlVuAn?: string;
  /** Mã vụ án thật trên hệ thống, vd. VA26-006694 */
  maVuAnHeThong?: string;
  tenPhapNhan?: string;
  maSoThue?: string;
  nguoiDaiDien?: string;
  dieuLuat?: string;
  nguoiBaoChua?: string;
  tuCachBaoChua?: string;
  soThuLy?: string;
  ngayThuLy?: string;
  thamPhanChuToa?: string;
  soQDThamPhan?: string;
  hoiTham?: string;
  soQDHoiTham?: string;
}

export function docCauHinh1A1(): CauHinh1A1 {
  const file = path.join(DATA_DIR, '1-hinh-su', 'form-1A1.xlsx');
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
    soVu: Math.max(1, Number(process.env.BCTK_SO_VU) || Number(ch['Số vụ tạo mỗi lần chạy']) || 1),
  };
}

/** Cấu hình đã đọc sẵn, dùng chung cho các bước */
export const cauHinh1A1 = docCauHinh1A1();

/** Các ô vụ án của lần chạy: Vụ 01 … Vụ N */
export const danhSachVu1A1 = (ch: CauHinh1A1): VuNguon[] =>
  Array.from({ length: ch.soVu }, (_, i) => ({ maVuAn: `Vụ ${String(i + 1).padStart(2, '0')}`, toaAn: ch.toaAn }));
