import path from 'path';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docBangExcelSync } from '../../../utils/excel-helper';
import { TrangThaiChung } from '../../../utils/trang-thai';
import { VuAnLuong } from '../../common/buoc';

/**
 * Phần dùng chung của luồng 10K — đề nghị/kiến nghị xem xét lại quyết định công nhận kết quả đối thoại thành,
 * theo src/step/10-hoa-giai/form-10K/HD 10K.docx. Đầu vào: src/data/10-hoa-giai/data-form-10K.xlsx
 * (mỗi dòng một đơn 10I đã đối thoại thành). Các bước nằm ở ./buoc/, ghép thành luồng ở create-case-10K.page.ts.
 */

export const LINH_VUC_10K: LinhVuc = '10-hoa-giai';
export const BIEU_MAU_10K = '10K';

/** Thẩm phán được phân công xem xét đề nghị (bước 05) — trống thì lấy mục đầu của danh sách (BCTK_THAM_PHAN_10K ghi đè) */
export const THAM_PHAN_10K: string | undefined = process.env.BCTK_THAM_PHAN_10K || 'Nguyễn Mậu Trường';
/** Kết quả xem xét (bước 07) */
export const KET_QUA_10K = 'Không chấp nhận — giữ nguyên';

/** File đầu vào (BCTK_FILE_10K ghi đè — đường dẫn đầy đủ hoặc tính từ src/data) */
export const FILE_DON_10K = process.env.BCTK_FILE_10K
  ? path.resolve(DATA_DIR, process.env.BCTK_FILE_10K)
  : path.join(DATA_DIR, LINH_VUC_10K, 'data-form-10K.xlsx');

/** Một dòng của data-form-10K.xlsx: Số tiếp nhận | Tòa án | Link đơn */
export interface Don10K extends VuAnLuong {
  soTiepNhan: string;
  /** Tòa đang giải quyết đơn — chọn tài khoản theo cột "Tòa án" của Taikhoan.xlsx */
  toaAn: string;
  urlDon: string;
}

/** Dữ liệu các bước để lại, lưu ở state/10-hoa-giai/form-10K/<Đơn số tiếp nhận>.json */
export interface TrangThai10K extends TrangThaiChung {
  /** Bước 01: số tiếp nhận đọc trên đơn (cột "Số tiếp nhận" của file có thể ghi nhầm số khác) */
  soTiepNhan?: string;
  /** Bước 01: đơn không có quyết định công nhận (đối thoại không thành, trả đơn…) → bước 02–06 bỏ qua, bước 07 chỉ ghi dòng kết quả */
  ketThucKhac?: string;
  /** Số quyết định công nhận kết quả đối thoại thành bị đề nghị xem xét lại (vd. 46110/2026/QDCNHGT) */
  soQDCongNhan?: string;
  /** Bước 01: người đề nghị và căn cứ */
  nguoiDeNghi?: string;
  /** Mã hồ sơ xử lý đề nghị ở "Xử lý đề nghị, kiến nghị" (vd. DNKN-26-018) và link chi tiết */
  maHoSo?: string;
  urlHoSo?: string;
  /** Bước 02: số văn bản yêu cầu chuyển hồ sơ */
  soYeuCauChuyenHS?: string;
  /** Bước 03 */
  daNhanHoSo?: boolean;
  /** Bước 04 */
  soThuLy?: string;
  /** Bước 05 */
  thamPhan?: string;
  soPhanCong?: string;
  /** Bước 06 */
  daThemHoatDong?: boolean;
  /** Bước 07 */
  ketQua?: string;
  soQuyetDinh?: string;
}

export function docDon10K(): Don10K[] {
  return docBangExcelSync(FILE_DON_10K)
    .filter(d => d['Số tiếp nhận'])
    .map((d, i) => {
      const bat = (cot: string) => {
        if (!d[cot]) throw new Error(`${FILE_DON_10K}: dòng ${i + 2} thiếu cột "${cot}"`);
        return d[cot].trim();
      };
      const soTiepNhan = bat('Số tiếp nhận');
      return { maVuAn: `Đơn ${soTiepNhan}`, soTiepNhan, toaAn: bat('Tòa án'), urlDon: bat('Link đơn') };
    });
}
