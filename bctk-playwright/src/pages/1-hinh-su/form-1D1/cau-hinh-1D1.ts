import path from 'path';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docBangExcelSync } from '../../../utils/excel-helper';
import { TaiKhoan } from '../../../utils/tai-khoan';
import { TrangThaiChung } from '../../../utils/trang-thai';
import { VuAnLuong } from '../../common/buoc';

/**
 * Phần dùng chung của luồng 1D1 — vụ án hình sự TÁI THẨM (hồ sơ kháng nghị đến Vụ Giám đốc kiểm tra về hình sự),
 * theo src/step/1-hinh-su/form-1D1/HD 1D1.docx. Đầu vào: src/data/1-hinh-su/data-form-1D1.xlsx (mỗi dòng một bản án bị kháng nghị).
 * Các bước nằm ở ./buoc/, ghép thành luồng ở create-case-1D1.page.ts.
 */

export const LINH_VUC_1D1: LinhVuc = '1-hinh-su';
export const BIEU_MAU_1D1 = '1D1';

/** Vụ trưởng Vụ Giám đốc kiểm tra về hình sự — người làm hồ sơ, phân công, tham mưu, thụ lý, tờ trình (BCTK_TK_VU_TRUONG_1D1 ghi đè) */
export const TK_VU_TRUONG: TaiKhoan = { toaAn: 'Vụ Giám đốc kiểm tra về HÌNH SỰ', taiKhoan: process.env.BCTK_TK_VU_TRUONG_1D1 || '022182001303', ten: 'Nguyễn Thị Bình' };
/** Lãnh đạo TANDTC — người ký tờ trình, phê duyệt chương trình làm việc, cho ý kiến tờ trình vụ xét xử (BCTK_TK_LANH_DAO_1D1 ghi đè) */
export const TK_LANH_DAO: TaiKhoan = { toaAn: 'Lãnh đạo & Văn phòng TANDTC', taiKhoan: process.env.BCTK_TK_LANH_DAO_1D1 || '001175010767', ten: 'Nguyễn Hải Trâm' };
/** Thẩm phán được phân công chỉ định ở bước 02 (theo thao tác ghi lại) */
export const THAM_PHAN = 'Lê Hưng Dũng';
/** Thẩm tra viên, lãnh đạo phân công ở bước 04 (theo thao tác ghi lại) */
export const THAM_TRA_VIEN = 'Trương Minh Trang';
export const LANH_DAO_TTV = 'Nguyễn Thị Bình';
/** Ý kiến đề xuất của tờ trình vụ xét xử (bước 07) = kết quả GĐT,TT lãnh đạo chọn (bước 08) */
export const Y_KIEN_DE_XUAT = 'Sửa phần bồi thường thiệt hại';

/** File đầu vào (BCTK_FILE_1D1 ghi đè — đường dẫn đầy đủ hoặc tính từ src/data) */
export const FILE_VU_AN_1D1 = process.env.BCTK_FILE_1D1
  ? path.resolve(DATA_DIR, process.env.BCTK_FILE_1D1)
  : path.join(DATA_DIR, LINH_VUC_1D1, 'data-form-1D1.xlsx');

/** Một dòng của data-form-1D1.xlsx: Số bản án | Ngày bản án | Tòa ra quyết định | Cấp xét xử | Người kháng nghị */
export interface BanAn1D1 extends VuAnLuong {
  soBanAn: string;
  /** dd/mm/yyyy */
  ngayBanAn: string;
  toaAn: string;
  /** "Sơ thẩm" | "Phúc thẩm" */
  capXetXu: string;
  nguoiKhangNghi: string;
}

/** Dữ liệu các bước để lại, lưu ở state/1-hinh-su/form-1D1/<mã>.json */
export interface TrangThai1D1 extends TrangThaiChung {
  /** Số quyết định kháng nghị (ngẫu nhiên, dùng để tìm lại hồ sơ ở các màn sau) */
  soKhangNghi?: string;
  ngayKhangNghi?: string;
  soButLuc?: string;
  /** Đã bấm "Nhận hồ sơ" ở danh sách hồ sơ kháng nghị đến */
  daNhanHoSo?: boolean;
  thamPhan?: string;
  soToTrinh?: string;
  /** Tờ trình phân công đã trình ký (tờ trình vẫn hiện "Dự thảo" tới khi lãnh đạo ký) */
  daTrinhKyToTrinh?: boolean;
  /** Thẩm phán khác của hội đồng 5 người, nối " ; " */
  thanhVienHDXX?: string;
  /** Thời gian – phòng xét xử đã chọn, vd. "29/10/2026 05:00:00 – Phòng xét xử 102" */
  lichXetXu?: string;
  /** Danh sách vụ xét xử (chương trình làm việc) đã trình ký */
  daTrinhKyChuongTrinh?: boolean;
  soChuongTrinh?: string;
  /** Link chi tiết vụ xét xử (…/quan-ly-vu-xet-xu/chi-tiet?id=<id>) */
  urlVuAn?: string;
  daThuLy?: boolean;
  /** Tờ trình vụ xét xử đã lưu + ký logic */
  daKyToTrinhVXX?: boolean;
  /** Tờ trình vụ xét xử đã đưa vào tiểu hồ sơ */
  daThemTHS?: boolean;
  /** Tờ trình vụ xét xử đã trình (xin ý kiến) lãnh đạo */
  daTrinhToTrinhVXX?: boolean;
}

/** Đọc các bản án trong file đầu vào; mã (tên file state) = "BA <số> ngày <dd-mm-yyyy>" */
export function docBanAn1D1(): BanAn1D1[] {
  return docBangExcelSync(FILE_VU_AN_1D1)
    .filter(d => d['Số bản án'])
    .map((d, i) => {
      const bat = (cot: string) => {
        if (!d[cot]) throw new Error(`${FILE_VU_AN_1D1}: dòng ${i + 2} thiếu cột "${cot}"`);
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
