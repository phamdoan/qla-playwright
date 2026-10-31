import path from 'path';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docKhoaGiaTriSync } from '../../../utils/excel-helper';
import { TrangThaiChung } from '../../../utils/trang-thai';
import { VuAnLuong } from '../../common/buoc';

/**
 * Phần dùng chung của luồng 5A: cấu hình (data-form-5A.xlsx) và kiểu dữ liệu các bước để lại cho nhau.
 * Form này KHÔNG có file đầu vào — mọi dữ liệu (đương sự, quan hệ pháp luật, yêu cầu, biên bản…) sinh ngẫu nhiên.
 * Luồng: đơn khởi kiện lao động → xử lý đơn → thụ lý → phân công Thẩm phán chủ tọa → chuẩn bị xét xử
 * (31-DS, 35-DS, 47-DS) → xét xử (51-DS, 48-DS) → bản án.
 * Các bước nằm ở ./buoc/, ghép thành luồng ở create-case-5A.page.ts.
 */

/** Cấu hình luồng 5A (src/data/5-lao-dong/data-form-5A.xlsx, sheet "Cấu hình") */
export interface CauHinh5A {
  linhVuc: LinhVuc;
  bieuMau: string;
  tenBieuMau: string;
  /** Tòa tạo đơn — chọn tài khoản theo cột "Tòa án" của Taikhoan.xlsx */
  toaAn: string;
  /** Số vụ tạo mỗi lần chạy (BCTK_SO_DON_5A trong .env.staging ghi đè; trống thì BCTK_SO_DON chung) */
  soDon: number;
}

/**
 * Một "ô" vụ trong lần chạy: Đơn 01, Đơn 02…
 * Ô chạy hết các bước thì lần sau tự tạo đơn mới; ô đang dở thì lần sau chạy tiếp từ chỗ dừng.
 */
export interface DonNguon extends VuAnLuong {
  toaAn: string;
}

/** Dữ liệu các bước để lại, lưu ở state/5-lao-dong/form-5A/<Đơn NN>.json */
export interface TrangThai5A extends TrangThaiChung {
  /** Link chi tiết đơn (…/don-khoi-kien-va-yeu-cau/chi-tiet?id=…) */
  urlDon?: string;
  soTiepNhan?: string;
  tenDon?: string;
  quanHePhapLuat?: string;
  nguoiKhoiKien?: string;
  nguoiBiKien?: string;
  lyDoKhongHoaGiai?: string;
  thamPhanXuLyDon?: string;
  soQDPhanCongDon?: string;
  soTB29?: string;
  soBienLai?: string;
  /** Link chi tiết vụ án sơ thẩm (…/so-tham/dan-su/chi-tiet?id=…) sau khi thụ lý */
  urlVuAn?: string;
  /** Mã vụ án thật trên hệ thống, vd. VA26-… */
  maVuAnHeThong?: string;
  soTBThuLy?: string;
  ngayThuLy?: string;
  thamPhanChuToa?: string;
  soQDThamPhan?: string;
  /** Số thông báo phiên họp kiểm tra giao nộp, tiếp cận, công khai chứng cứ (31-DS) */
  soTB31?: string;
  soQDXetXu?: string;
  ngayXetXu?: string;
  soBanAn?: string;
}

export function docCauHinh5A(): CauHinh5A {
  const file = path.join(DATA_DIR, '5-lao-dong', 'data-form-5A.xlsx');
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
    soDon: Math.max(1, Number(process.env.BCTK_SO_DON_5A) || Number(process.env.BCTK_SO_DON) || Number(ch['Số vụ tạo mỗi lần chạy']) || 1),
  };
}

/** Cấu hình đã đọc sẵn, dùng chung cho các bước */
export const cauHinh5A = docCauHinh5A();

/** Các ô vụ của lần chạy: Đơn 01 … Đơn N */
export const danhSachDon5A = (ch: CauHinh5A): DonNguon[] =>
  Array.from({ length: ch.soDon }, (_, i) => ({ maVuAn: `Đơn ${String(i + 1).padStart(2, '0')}`, toaAn: ch.toaAn }));
