import path from 'path';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docBangExcelSync } from '../../../utils/excel-helper';
import { TrangThaiChung } from '../../../utils/trang-thai';
import { VuAnLuong } from '../../common/buoc';

/**
 * Phần dùng chung của luồng 6B: danh sách vụ án đầu vào (data-form-6B.xlsx) và kiểu dữ liệu các bước để lại cho nhau.
 * Vụ án HÀNH CHÍNH PHÚC THẨM: tòa sơ thẩm tiếp nhận kháng nghị / đơn kháng cáo → giấy xác nhận 25-HC → thông báo 32-HC
 * → chuyển hồ sơ → tòa phúc thẩm tiếp nhận → thụ lý → phân công → 36-HC → biên bản 45-HC, 21-HC → bản án phúc thẩm 46-HC.
 * Các bước nằm ở ./buoc/, ghép thành luồng ở create-case-6B.page.ts.
 */

export const LINH_VUC_6B: LinhVuc = '6-hanh-chinh';
export const BIEU_MAU_6B = '6B';

/**
 * File đầu vào: src/data/6-hanh-chinh/data-form-6B.xlsx (BCTK_FILE_6B trong .env ghi đè — đường dẫn đầy đủ hoặc tính từ src/data),
 * sheet đầu, cột: Mã vụ án | Tòa án sơ thẩm | Tòa án phúc thẩm | Link vụ án | Luồng
 */
export const FILE_VU_AN_6B = process.env.BCTK_FILE_6B
  ? path.resolve(DATA_DIR, process.env.BCTK_FILE_6B)
  : path.join(DATA_DIR, LINH_VUC_6B, 'data-form-6B.xlsx');

/** Một dòng của data-form-6B.xlsx — mỗi dòng là một vụ án hành chính sơ thẩm đã có bản án */
export interface VuAn6B extends VuAnLuong {
  /** Tòa thụ lý sơ thẩm — tài khoản mở "Link vụ án", tiếp nhận kháng cáo/kháng nghị, chuyển hồ sơ */
  toaSoTham: string;
  /** Tòa cấp phúc thẩm — tài khoản tiếp nhận hồ sơ, xét xử phúc thẩm */
  toaPhucTham: string;
  /** Link chi tiết vụ án sơ thẩm */
  linkVuAn: string;
  /** "Kháng cáo" | "Kháng nghị" | "Kháng cáo, kháng nghị" */
  luong: string;
}

/** Luồng có kháng cáo (đơn kháng cáo → 25-HC → 32-HC) */
export const coKhangCao = (v: VuAn6B) => /cáo/i.test(v.luong);
/** Luồng có kháng nghị của Viện kiểm sát */
export const coKhangNghi = (v: VuAn6B) => /nghị/i.test(v.luong);

/** Dữ liệu các bước để lại, lưu ở state/6-hanh-chinh/form-6B/<mã vụ án>.json */
export interface TrangThai6B extends TrangThaiChung {
  /** Mã định danh của vụ (giữ nguyên khi lên phúc thẩm) — dùng tìm vụ ở "Hồ sơ phúc thẩm" */
  maDinhDanh?: string;
  soKhangNghi?: string;
  nguoiKhangCao?: string;
  soGiayXacNhan?: string;
  soThongBao?: string;
  /** Link chi tiết vụ án phúc thẩm */
  urlVuAnPT?: string;
  maVuAnPT?: string;
  soThuLyPT?: string;
  chuToa?: string;
  soQDPhanCong?: string;
  soQDXetXu?: string;
  ngayXetXu?: string;
  soBanAnPT?: string;
  ngayBanAnPT?: string;
}

/** Đọc các vụ án trong file đầu vào; thiếu cột thì báo rõ cột nào */
export function docVuAn6B(): VuAn6B[] {
  const dong = docBangExcelSync(FILE_VU_AN_6B).filter(d => d['Mã vụ án']);
  return dong.map((d, i) => {
    const bat = (cot: string) => {
      if (!d[cot]) throw new Error(`${FILE_VU_AN_6B}: dòng ${i + 2} (${d['Mã vụ án']}) thiếu cột "${cot}"`);
      return d[cot].trim();
    };
    return {
      maVuAn: bat('Mã vụ án'),
      toaSoTham: bat('Tòa án sơ thẩm'),
      toaPhucTham: bat('Tòa án phúc thẩm'),
      linkVuAn: bat('Link vụ án'),
      luong: d['Luồng'] || 'Kháng cáo',
    };
  });
}
