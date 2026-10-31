import path from 'path';
import { Luong } from './buoc/chung';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docBangExcelSync } from '../../../utils/excel-helper';
import { TrangThaiChung, docTrangThai } from '../../../utils/trang-thai';
import { VuAnLuong } from '../../common/buoc';

/**
 * Phần dùng chung của luồng 1B — vụ án phúc thẩm hình sự (kháng cáo / kháng nghị),
 * theo src/step/1-hinh-su/form-1B/HD 1B.docx. Đầu vào: src/data/1-hinh-su/data-form-1B.xlsx
 * (sheet "Vụ án": Mã vụ án | Tòa án sơ thẩm | Tòa án phúc thẩm | Link vụ án | Luồng).
 * Các bước nằm ở ./buoc/, ghép thành luồng ở create-case-1B.page.ts.
 */

export const LINH_VUC_1B: LinhVuc = '1-hinh-su';
export const BIEU_MAU_1B = '1B';
/** Số bước của luồng — vụ đã chạy xong bước cuối thì không chạy lại (tránh tạo bản án thứ hai) */
export const BUOC_CUOI_1B = 9;

/** File đầu vào (BCTK_FILE_1B ghi đè — đường dẫn đầy đủ hoặc tính từ src/data) */
export const FILE_VU_AN_1B = process.env.BCTK_FILE_1B
  ? path.resolve(DATA_DIR, process.env.BCTK_FILE_1B)
  : path.join(DATA_DIR, LINH_VUC_1B, 'data-form-1B.xlsx');

/** Tệp đính kèm mẫu (biên bản giao nhận ở bước 05) */
export const TEP_MAU_1B = path.join(DATA_DIR, 'files', 'tai-lieu-mau.pdf');

/** Một dòng của data-form-1B.xlsx */
export interface VuAnNguon extends VuAnLuong {
  maVuAn: string;
  /** Tòa sơ thẩm — tài khoản bước 01–04 */
  toaAn: string;
  /** Tòa phúc thẩm — tài khoản bước 05–09 */
  toaPhucTham: string;
  /** Link chi tiết vụ án sơ thẩm */
  urlVuAnSoTham: string;
  luong: Luong;
}

/** Dữ liệu các bước để lại cho nhau, lưu ở state/1-hinh-su/form-1B/<mã vụ án>.json */
export interface TrangThai1B extends TrangThaiChung {
  luong?: Luong;
  tenVuAn?: string;
  maDinhDanh?: string;
  soThongBao?: string;
  toaPhucTham?: string;
  urlVuAn?: string;
  maVuAnPhucTham?: string;
  soThuLy?: string;
  ngayThuLy?: string;
  chuToa?: string;
  soPhanCong?: string;
  soQuyetDinhXetXu?: string;
  ngayXetXu?: string;
  soBanAn?: string;
}

/** Vụ án trong data-form-1B.xlsx, bỏ những vụ đã chạy xong cả luồng ở lượt trước */
export function docVuAn1B(): VuAnNguon[] {
  return docBangExcelSync(FILE_VU_AN_1B, 'Vụ án')
    .filter(d => d['Mã vụ án'])
    .map((d, i) => {
      const bat = (cot: string) => {
        if (!d[cot]) throw new Error(`${FILE_VU_AN_1B}: dòng ${i + 2} thiếu cột "${cot}"`);
        return d[cot].trim();
      };
      const luong: Luong = /nghị|nghi/i.test(d['Luồng'] || process.env.BCTK_LUONG || '') ? 'khang-nghi' : 'khang-cao';
      return {
        maVuAn: bat('Mã vụ án'),
        toaAn: bat('Tòa án sơ thẩm'),
        toaPhucTham: bat('Tòa án phúc thẩm'),
        urlVuAnSoTham: bat('Link vụ án'),
        luong,
      };
    })
    .filter(v => (docTrangThai<TrangThai1B>(LINH_VUC_1B, BIEU_MAU_1B, v.maVuAn).buocXong ?? 0) < BUOC_CUOI_1B);
}
