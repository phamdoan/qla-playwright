import path from 'path';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docBangExcelSync } from '../../../utils/excel-helper';
import { TaiKhoan } from '../../../utils/tai-khoan';
import { TrangThaiChung } from '../../../utils/trang-thai';
import { VuAnLuong } from '../../common/buoc';

/**
 * Phần dùng chung của luồng 5D — vụ án lao động TÁI THẨM (hồ sơ kháng nghị đến Vụ GĐKT về kinh doanh thương mại, phá sản, lao động, gia đình & người chưa thành niên),
 * theo src/step/5-lao-dong/form-5D/HD 5D.docx. Đầu vào: src/data/5-lao-dong/data-form-5D.xlsx (mỗi dòng một bản án bị kháng nghị).
 * Các bước nằm ở ./buoc/, ghép thành luồng ở create-case-5D.page.ts.
 */

export const LINH_VUC_5D: LinhVuc = '5-lao-dong';
export const BIEU_MAU_5D = '5D';

/** Vụ trưởng Vụ GĐKT về kinh doanh thương mại, phá sản, lao động, gia đình & người chưa thành niên — người làm hồ sơ, phân công, tham mưu, thụ lý, tờ trình (BCTK_TK_VU_TRUONG_5D ghi đè) */
export const TK_VU_TRUONG: TaiKhoan = { toaAn: 'Vụ GĐKT về KINH DOANH THƯƠNG MẠI, PHÁ SẢN, LAO ĐỘNG, GIA ĐÌNH & NGƯỜI CHƯA THÀNH NIÊN', taiKhoan: process.env.BCTK_TK_VU_TRUONG_5D || '036077002085', ten: 'Trần Ngọc Thành' };
/** Lãnh đạo TANDTC — người ký tờ trình, phê duyệt chương trình làm việc, cho ý kiến tờ trình vụ xét xử (BCTK_TK_LANH_DAO_5D ghi đè) */
export const TK_LANH_DAO: TaiKhoan = { toaAn: 'Lãnh đạo & Văn phòng TANDTC', taiKhoan: process.env.BCTK_TK_LANH_DAO_5D || '001175010767', ten: 'Nguyễn Hải Trâm' };
/** Thẩm phán được phân công chỉ định ở bước 02 (như luồng 1D1) */
export const THAM_PHAN = 'Lê Hưng Dũng';
/** Thẩm tra viên, lãnh đạo phân công ở bước 04 — theo cột "Chức vụ" trong Taikhoan.xlsx (Thẩm tra viên / Phó Vụ trưởng) */
export const THAM_TRA_VIEN = 'Cao Phương Ly';
export const LANH_DAO_TTV = 'Phùng Hải Hiệp';
/**
 * Ý kiến đề xuất của tờ trình vụ xét xử (bước 07) = kết quả GĐT,TT lãnh đạo chọn (bước 08).
 * Trống = lấy mục đầu của danh mục (danh mục theo loại án, khác án hình sự); mục đã chọn lưu ở state "yKienDeXuat".
 */
export const Y_KIEN_DE_XUAT: string | undefined = process.env.BCTK_Y_KIEN_5D || undefined;
/** Loại án — danh sách của Vụ lọc sẵn theo lĩnh vực chính của Vụ → luôn chọn lại */
export const LOAI_AN = 'Lao động';

/** File đầu vào (BCTK_FILE_5D ghi đè — đường dẫn đầy đủ hoặc tính từ src/data) */
export const FILE_VU_AN_5D = process.env.BCTK_FILE_5D
  ? path.resolve(DATA_DIR, process.env.BCTK_FILE_5D)
  : path.join(DATA_DIR, LINH_VUC_5D, 'data-form-5D.xlsx');

/** Một dòng của data-form-5D.xlsx: Số bản án | Ngày bản án | Tòa ra quyết định | Cấp xét xử | Người kháng nghị */
export interface BanAn5D extends VuAnLuong {
  soBanAn: string;
  /** dd/mm/yyyy */
  ngayBanAn: string;
  toaAn: string;
  /** "Sơ thẩm" | "Phúc thẩm" */
  capXetXu: string;
  nguoiKhangNghi: string;
}

/** Dữ liệu các bước để lại, lưu ở state/5-lao-dong/form-5D/<mã>.json */
export interface TrangThai5D extends TrangThaiChung {
  /** Số quyết định kháng nghị (ngẫu nhiên, dùng để tìm lại hồ sơ ở các màn sau) */
  soKhangNghi?: string;
  ngayKhangNghi?: string;
  soButLuc?: string;
  quanHePhapLuat?: string;
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
  /** Ý kiến đề xuất đã chọn ở tờ trình vụ xét xử (bước 08 chọn lại đúng mục này) */
  yKienDeXuat?: string;
  /** Tờ trình vụ xét xử đã trình (xin ý kiến) lãnh đạo */
  daTrinhToTrinhVXX?: boolean;
}

/** Đọc các bản án trong file đầu vào; mã (tên file state) = "BA <số> ngày <dd-mm-yyyy>" */
export function docBanAn5D(): BanAn5D[] {
  return docBangExcelSync(FILE_VU_AN_5D)
    .filter(d => d['Số bản án'])
    .map((d, i) => {
      const bat = (cot: string) => {
        if (!d[cot]) throw new Error(`${FILE_VU_AN_5D}: dòng ${i + 2} thiếu cột "${cot}"`);
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
