import path from 'path';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docBangExcelSync } from '../../../utils/excel-helper';
import { TaiKhoan } from '../../../utils/tai-khoan';
import { TrangThaiChung } from '../../../utils/trang-thai';
import { VuAnLuong } from '../../common/buoc';

/**
 * Phần dùng chung của luồng 6C — vụ án hành chính GIÁM ĐỐC THẨM (hồ sơ kháng nghị đến Vụ Giám đốc, kiểm tra về hành chính),
 * theo src/step/6-hanh-chinh/form-6C/HD 6C.docx. Đầu vào: src/data/6-hanh-chinh/data-form-6C.xlsx (mỗi dòng một bản án bị kháng nghị).
 * Các bước nằm ở ./buoc/, ghép thành luồng ở create-case-6C.page.ts.
 */

export const LINH_VUC_6C: LinhVuc = '6-hanh-chinh';
export const BIEU_MAU_6C = '6C';

/** Vụ trưởng Vụ Giám đốc, kiểm tra về hành chính — người làm hồ sơ, phân công, tham mưu (BCTK_TK_VU_TRUONG_6C ghi đè) */
export const TK_VU_TRUONG: TaiKhoan = { toaAn: 'Vụ Giám đốc, kiểm tra về HÀNH CHÍNH', taiKhoan: process.env.BCTK_TK_VU_TRUONG_6C || '001076010754', ten: 'Trần Phụng Vương' };
/** Lãnh đạo TANDTC — người ký tờ trình, phê duyệt chương trình làm việc, ký quyết định (BCTK_TK_LANH_DAO_6C ghi đè) */
export const TK_LANH_DAO: TaiKhoan = { toaAn: 'Lãnh đạo & Văn phòng TANDTC', taiKhoan: process.env.BCTK_TK_LANH_DAO_6C || '001175010767', ten: 'Nguyễn Hải Trâm' };
/** Thẩm tra viên phân công ở bước 03 (lãnh đạo chọn ngẫu nhiên trong danh sách) */
export const THAM_TRA_VIEN = 'Mai Hương Sen';

/** File đầu vào (BCTK_FILE_6C ghi đè — đường dẫn đầy đủ hoặc tính từ src/data) */
export const FILE_VU_AN_6C = process.env.BCTK_FILE_6C
  ? path.resolve(DATA_DIR, process.env.BCTK_FILE_6C)
  : path.join(DATA_DIR, LINH_VUC_6C, 'data-form-6C.xlsx');

/** Một dòng của data-form-6C.xlsx: Số bản án | Ngày bản án | Tòa ra quyết định | Cấp xét xử | Người kháng nghị */
export interface BanAn6C extends VuAnLuong {
  soBanAn: string;
  /** dd/mm/yyyy */
  ngayBanAn: string;
  toaAn: string;
  /** "Sơ thẩm" | "Phúc thẩm" */
  capXetXu: string;
  nguoiKhangNghi: string;
}

/** Dữ liệu các bước để lại, lưu ở state/6-hanh-chinh/form-6C/<mã>.json */
export interface TrangThai6C extends TrangThaiChung {
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
  /** Bước chạy lại vẫn chạy cả bước đã xong → các bước ký/duyệt ghi cờ để lượt sau bỏ qua */
  daKyToTrinh?: boolean;
  daPheDuyetChuongTrinh?: boolean;
  daKyCongVanVKS?: boolean;
}

/** Đọc các bản án trong file đầu vào; mã (tên file state) = "BA <số> ngày <dd-mm-yyyy>" */
export function docBanAn6C(): BanAn6C[] {
  return docBangExcelSync(FILE_VU_AN_6C)
    .filter(d => d['Số bản án'])
    .map((d, i) => {
      const bat = (cot: string) => {
        if (!d[cot]) throw new Error(`${FILE_VU_AN_6C}: dòng ${i + 2} thiếu cột "${cot}"`);
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
