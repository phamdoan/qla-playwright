import path from 'path';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docBangExcelSync } from '../../../utils/excel-helper';
import { TaiKhoan } from '../../../utils/tai-khoan';
import { TrangThaiChung } from '../../../utils/trang-thai';
import { VuAnLuong } from '../../common/buoc';

/**
 * Phần dùng chung của luồng 2C — vụ án dân sự GIÁM ĐỐC THẨM (hồ sơ kháng nghị đến Vụ Giám đốc, kiểm tra về dân sự),
 * theo src/step/2-dan-su/form-2C/HD 2C.docx. Đầu vào: src/data/2-dan-su/data-form-2C.xlsx (mỗi dòng một bản án bị kháng nghị).
 * Các bước nằm ở ./buoc/, ghép thành luồng ở create-case-2C.page.ts.
 */

export const LINH_VUC_2C: LinhVuc = '2-dan-su';
export const BIEU_MAU_2C = '2C';

/** Vụ trưởng Vụ Giám đốc, kiểm tra về dân sự — người làm hồ sơ, phân công, tham mưu (BCTK_TK_VU_TRUONG_2C ghi đè) */
export const TK_VU_TRUONG: TaiKhoan = { toaAn: 'Vụ Giám đốc, kiểm tra về DÂN SỰ', taiKhoan: process.env.BCTK_TK_VU_TRUONG_2C || '034179003391', ten: 'Nguyễn Thị Hà' };
/** Lãnh đạo TANDTC — người ký tờ trình, phê duyệt chương trình làm việc, ký quyết định (BCTK_TK_LANH_DAO_2C ghi đè) */
export const TK_LANH_DAO: TaiKhoan = { toaAn: 'Lãnh đạo & Văn phòng TANDTC', taiKhoan: process.env.BCTK_TK_LANH_DAO_2C || '001175010767', ten: 'Nguyễn Hải Trâm' };
/** Thẩm tra viên, lãnh đạo phân công ở bước 03 (theo hướng dẫn) */
export const THAM_TRA_VIEN = 'Nguyễn Thị Hương';
export const LANH_DAO_TTV = 'Trần Quốc Hạnh';

/** File đầu vào (BCTK_FILE_2C ghi đè — đường dẫn đầy đủ hoặc tính từ src/data) */
export const FILE_VU_AN_2C = process.env.BCTK_FILE_2C
  ? path.resolve(DATA_DIR, process.env.BCTK_FILE_2C)
  : path.join(DATA_DIR, LINH_VUC_2C, 'data-form-2C.xlsx');

/** Một dòng của data-form-2C.xlsx: Số bản án | Ngày bản án | Tòa ra quyết định | Cấp xét xử | Người kháng nghị */
export interface BanAn2C extends VuAnLuong {
  soBanAn: string;
  /** dd/mm/yyyy */
  ngayBanAn: string;
  toaAn: string;
  /** "Sơ thẩm" | "Phúc thẩm" */
  capXetXu: string;
  nguoiKhangNghi: string;
}

/** Dữ liệu các bước để lại, lưu ở state/2-dan-su/form-2C/<mã>.json */
export interface TrangThai2C extends TrangThaiChung {
  /** Số quyết định kháng nghị (ngẫu nhiên, dùng để tìm lại hồ sơ ở các màn sau) */
  soKhangNghi?: string;
  ngayKhangNghi?: string;
  quanHePhapLuat?: string;
  thamPhan?: string;
  soToTrinh?: string;
  /** Tờ trình phân công đã trình ký (tờ trình vẫn hiện "Dự thảo" tới khi lãnh đạo ký) */
  daTrinhKyToTrinh?: boolean;
  /** Thẩm phán khác của hội đồng 5 người, nối " ; " */
  thanhVienHDXX?: string;
  /** Thời gian – phòng xét xử đã chọn, vd. "29/10/2026 05:00:00 – Phòng xét xử 102" */
  lichXetXu?: string;
  /** Danh sách vụ xét xử (chương trình làm việc) đã lấy số, trình ký */
  daTrinhKyChuongTrinh?: boolean;
  soChuongTrinh?: string;
  /** Link chi tiết hội đồng xét xử (…/chi-tiet-hdxx/<id>) */
  urlHoiDong?: string;
  /** Số quyết định thành lập (phân công) HĐXX, vd. "444/QĐ-TANDTC" */
  soQDHoiDong?: string;
  /** Số công văn mời Viện kiểm sát, vd. "70/TANDTC-VP" */
  soCongVanVKS?: string;
  /** Bước 08 đã ký quyết định HĐXX (còn công văn VKS) */
  daKyQDHoiDong?: boolean;
}

/** Đọc các bản án trong file đầu vào; mã (tên file state) = "BA <số> ngày <dd-mm-yyyy>" */
export function docBanAn2C(): BanAn2C[] {
  return docBangExcelSync(FILE_VU_AN_2C)
    .filter(d => d['Số bản án'])
    .map((d, i) => {
      const bat = (cot: string) => {
        if (!d[cot]) throw new Error(`${FILE_VU_AN_2C}: dòng ${i + 2} thiếu cột "${cot}"`);
        return d[cot].trim();
      };
      const soBanAn = bat('Số bản án');
      const ngayBanAn = bat('Ngày bản án');
      return {
        maVuAn: `BA ${soBanAn} ngày ${ngayBanAn.replace(/\//g, '-')}`,
        soBanAn,
        ngayBanAn,
        toaAn: bat('Tòa ra quyết định'),
        capXetXu: d['Cấp xét xử']?.trim() || 'Sơ thẩm',
        nguoiKhangNghi: bat('Người kháng nghị'),
      };
    });
}
