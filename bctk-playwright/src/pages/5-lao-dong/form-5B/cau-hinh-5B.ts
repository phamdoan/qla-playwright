import path from 'path';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docBangExcelSync } from '../../../utils/excel-helper';
import { TrangThaiChung } from '../../../utils/trang-thai';
import { VuAnLuong } from '../../common/buoc';

/**
 * Phần dùng chung của luồng 5B: danh sách vụ án đầu vào (data-form-5B.xlsx) và kiểu dữ liệu các bước để lại cho nhau.
 * Luồng KHÁNG NGHỊ: tòa sơ thẩm tiếp nhận quyết định kháng nghị → giấy xác nhận → gửi hồ sơ lên
 * → tòa phúc thẩm tiếp nhận → thụ lý → phân công → 66-DS → biên bản nghị án → biên bản phiên tòa → bản án phúc thẩm.
 * Các bước nằm ở ./buoc/, ghép thành luồng ở create-case-5B.page.ts.
 */

export const LINH_VUC_5B: LinhVuc = '5-lao-dong';
export const BIEU_MAU_5B = '5B';

/**
 * File đầu vào: src/data/5-lao-dong/data-form-5B.xlsx (BCTK_FILE_5B trong .env ghi đè — đường dẫn đầy đủ hoặc tính từ src/data),
 * sheet đầu, cột: Mã vụ án | Tòa án sơ thẩm | Tòa án phúc thẩm | Link vụ án | Luồng
 */
export const FILE_VU_AN_5B = process.env.BCTK_FILE_5B
  ? path.resolve(DATA_DIR, process.env.BCTK_FILE_5B)
  : path.join(DATA_DIR, LINH_VUC_5B, 'data-form-5B.xlsx');

/** Một dòng của data-form-5B.xlsx — mỗi dòng là một vụ án lao động sơ thẩm đã có bản án */
export interface VuAn5B extends VuAnLuong {
  /** Tòa thụ lý sơ thẩm — tài khoản mở "Link vụ án", tiếp nhận kháng nghị, gửi hồ sơ */
  toaSoTham: string;
  /** Tòa cấp phúc thẩm — tài khoản tiếp nhận hồ sơ, xét xử phúc thẩm */
  toaPhucTham: string;
  /** Link chi tiết vụ án sơ thẩm */
  linkVuAn: string;
  luong: string;
}

/** Dữ liệu các bước để lại, lưu ở state/5-lao-dong/form-5B/<mã vụ án>.json */
export interface TrangThai5B extends TrangThaiChung {
  soKhangNghi?: string;
  vienKiemSat?: string;
  banAnSoTham?: string;
  soGiayXacNhan?: string;
  /** Link chi tiết vụ án phúc thẩm (sau "Mở vụ án phúc thẩm") */
  urlVuAnPT?: string;
  maVuAnPT?: string;
  soThuLyPT?: string;
  chuToa?: string;
  thanhVienHDXX?: string;
  thuKy?: string;
  soQDPhanCong?: string;
  soQDXetXu?: string;
  ngayXetXu?: string;
  soBanAnPT?: string;
}

/** Đọc các vụ án trong file đầu vào; thiếu cột thì báo rõ cột nào */
export function docVuAn5B(): VuAn5B[] {
  const dong = docBangExcelSync(FILE_VU_AN_5B).filter(d => d['Mã vụ án']);
  return dong.map((d, i) => {
    /** Giá trị cột đầu tiên có dữ liệu trong `cacTen` (cùng một cột có thể đặt tên khác nhau) */
    const bat = (...cacTen: string[]) => {
      const cot = cacTen.find(t => d[t]);
      if (!cot) throw new Error(`${FILE_VU_AN_5B}: dòng ${i + 2} (${d['Mã vụ án']}) thiếu cột "${cacTen[0]}"`);
      return d[cot].trim();
    };
    // Luồng chưa hỗ trợ (vd. "Kháng cáo") không chặn cả file — bước 01 của vụ đó báo lỗi
    return {
      maVuAn: bat('Mã vụ án'),
      toaSoTham: bat('Tòa án sơ thẩm', 'Tòa sơ thẩm'),
      toaPhucTham: bat('Tòa án phúc thẩm', 'Tòa phúc thẩm'),
      linkVuAn: bat('Link vụ án'),
      luong: d['Luồng'] || 'Kháng nghị',
    };
  });
}
