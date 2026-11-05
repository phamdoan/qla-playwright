import path from 'path';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docKhoaGiaTriSync } from '../../../utils/excel-helper';
import { TrangThaiChung } from '../../../utils/trang-thai';
import { VuAnLuong } from '../../common/buoc';

/**
 * Phần dùng chung của luồng 1A1: cấu hình (data-form-1A1.xlsx) và kiểu dữ liệu các bước để lại cho nhau.
 * Form này KHÔNG có file đầu vào — mọi dữ liệu (bị can, pháp nhân, người bào chữa, tội danh…) sinh ngẫu nhiên.
 * Các bước nằm ở ./buoc/, ghép thành luồng ở create-case-1A1.page.ts.
 */

/** Cấu hình luồng 1A1 (src/data/1-hinh-su/data-form-1A1.xlsx, sheet "Cấu hình") */
export interface CauHinh1A1 {
  linhVuc: LinhVuc;
  bieuMau: string;
  tenBieuMau: string;
  /** Tòa tạo vụ án — chọn tài khoản theo cột "Tòa án" của Taikhoan.xlsx */
  toaAn: string;
  /** Số vụ án tạo mỗi lần chạy (BCTK_SO_VU trong .env ghi đè) */
  soVu: number;
  /** Số bị can pháp nhân thêm vào mỗi vụ ở bước 03 (BCTK_SO_PHAP_NHAN trong .env ghi đè) */
  soPhapNhan: number;
}

/** Một bị can pháp nhân thương mại đã thêm ở bước 03 */
export interface PhapNhan {
  ten: string;
  maSoThue: string;
  nguoiDaiDien: string;
  dieuLuat: string;
}

/** Người bào chữa đã thêm ở bước 04 — mỗi pháp nhân một người */
export interface NguoiBaoChua {
  ten: string;
  tuCach: string;
  /** Tên pháp nhân được bào chữa */
  phapNhan: string;
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
  /** Các pháp nhân bước 03 đã thêm, theo thứ tự lượt */
  dsPhapNhan?: PhapNhan[];
  /** Các người bào chữa bước 04 đã thêm, theo thứ tự lượt (người thứ i bào chữa cho pháp nhân thứ i) */
  dsBaoChua?: NguoiBaoChua[];
  /** @deprecated state cũ (một pháp nhân) — đọc qua `dsPhapNhan()` */
  tenPhapNhan?: string;
  /** @deprecated */
  maSoThue?: string;
  /** @deprecated */
  nguoiDaiDien?: string;
  /** @deprecated */
  dieuLuat?: string;
  /** @deprecated state cũ (một người bào chữa) — đọc qua `dsBaoChua()` */
  nguoiBaoChua?: string;
  /** @deprecated */
  tuCachBaoChua?: string;
  soThuLy?: string;
  ngayThuLy?: string;
  /** Viện kiểm sát đã chọn khi thụ lý (bước 05) — theo tòa của tài khoản */
  vienKiemSat?: string;
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

export function docCauHinh1A1(): CauHinh1A1 {
  const file = path.join(DATA_DIR, '1-hinh-su', 'data-form-1A1.xlsx');
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
    soVu: Math.max(1, Number(process.env.BCTK_SO_DON_1A1) || Number(process.env.BCTK_SO_DON) || Number(ch['Số vụ tạo mỗi lần chạy']) || 1),
    soPhapNhan: Math.max(1, Number(process.env.BCTK_SO_PHAP_NHAN) || Number(ch['Số pháp nhân mỗi vụ']) || 1),
  };
}

/** Pháp nhân đã thêm — đọc được cả state cũ chỉ có một pháp nhân (tenPhapNhan…) */
export const dsPhapNhan = (tt: TrangThai1A1): PhapNhan[] =>
  tt.dsPhapNhan ??
  (tt.tenPhapNhan ? [{ ten: tt.tenPhapNhan, maSoThue: tt.maSoThue ?? '', nguoiDaiDien: tt.nguoiDaiDien ?? '', dieuLuat: tt.dieuLuat ?? '' }] : []);

/** Người bào chữa đã thêm — đọc được cả state cũ chỉ có một người */
export const dsBaoChua = (tt: TrangThai1A1): NguoiBaoChua[] =>
  tt.dsBaoChua ??
  (tt.nguoiBaoChua ? [{ ten: tt.nguoiBaoChua, tuCach: tt.tuCachBaoChua ?? '', phapNhan: tt.tenPhapNhan ?? '' }] : []);

/** Cấu hình đã đọc sẵn, dùng chung cho các bước */
export const cauHinh1A1 = docCauHinh1A1();

/** Các ô vụ án của lần chạy: Vụ 01 … Vụ N */
export const danhSachVu1A1 = (ch: CauHinh1A1): VuNguon[] =>
  Array.from({ length: ch.soVu }, (_, i) => ({ maVuAn: `Vụ ${String(i + 1).padStart(2, '0')}`, toaAn: ch.toaAn }));
