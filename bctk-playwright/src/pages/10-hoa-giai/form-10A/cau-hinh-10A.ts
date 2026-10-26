import path from 'path';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docKhoaGiaTriSync } from '../../../utils/excel-helper';
import { TrangThaiChung } from '../../../utils/trang-thai';
import { VuAnLuong } from '../../common/buoc';

/**
 * Phần dùng chung của luồng 10A: cấu hình (form-10A.xlsx) và kiểu dữ liệu các bước để lại cho nhau.
 * Form này KHÔNG có file đầu vào — mọi dữ liệu đơn (đương sự, quan hệ pháp luật, yêu cầu…) sinh ngẫu nhiên.
 * Các bước nằm ở ./buoc/, ghép thành luồng ở create-case-10A.page.ts.
 */

/** Cấu hình luồng 10A (src/data/10-hoa-giai/form-10A.xlsx, sheet "Cấu hình") */
export interface CauHinh10A {
  linhVuc: LinhVuc;
  bieuMau: string;
  tenBieuMau: string;
  /** Tòa tạo đơn — chọn tài khoản theo cột "Tòa án" của Taikhoan.xlsx */
  toaAn: string;
  /** Số đơn tạo mỗi lần chạy (BCTK_SO_DON trong .env ghi đè) */
  soDon: number;
}

/**
 * Một "ô" đơn trong lần chạy: Đơn 01, Đơn 02…
 * Ô chạy hết các bước thì lần sau tự tạo đơn mới; ô đang dở thì lần sau chạy tiếp từ chỗ dừng.
 */
export interface DonNguon extends VuAnLuong {
  toaAn: string;
}

/** Dữ liệu các bước để lại, lưu ở state/10-hoa-giai/form-10A/<Đơn NN>.json */
export interface TrangThai10A extends TrangThaiChung {
  /** Link chi tiết đơn (…/don-khoi-kien-va-yeu-cau/chi-tiet?id=…) */
  urlDon?: string;
  soTiepNhan?: string;
  tenDon?: string;
  quanHePhapLuat?: string;
  nguoiKhoiKien?: string;
  nguoiBiKien?: string;
  thamPhanHoaGiai?: string;
  soQuyetDinhPhanCong?: string;
  soThongBao01HG?: string;
  ketQuaLuaChon?: string;
}

export function docCauHinh10A(): CauHinh10A {
  const file = path.join(DATA_DIR, '10-hoa-giai', 'form-10A.xlsx');
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
    soDon: Math.max(1, Number(process.env.BCTK_SO_DON) || Number(ch['Số đơn tạo mỗi lần chạy']) || 1),
  };
}

/** Cấu hình đã đọc sẵn, dùng chung cho các bước */
export const cauHinh10A = docCauHinh10A();

/** Các ô đơn của lần chạy: Đơn 01 … Đơn N */
export const danhSachDon10A = (ch: CauHinh10A): DonNguon[] =>
  Array.from({ length: ch.soDon }, (_, i) => ({ maVuAn: `Đơn ${String(i + 1).padStart(2, '0')}`, toaAn: ch.toaAn }));
