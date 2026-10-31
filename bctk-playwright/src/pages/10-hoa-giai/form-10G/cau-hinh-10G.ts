import path from 'path';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docKhoaGiaTriSync } from '../../../utils/excel-helper';
import { TrangThaiChung } from '../../../utils/trang-thai';
import { VuAnLuong } from '../../common/buoc';

/**
 * Phần dùng chung của luồng 10G: cấu hình (data-form-10G.xlsx) và kiểu dữ liệu các bước để lại cho nhau.
 * Form này KHÔNG có file đầu vào — mọi dữ liệu đơn (đương sự, quan hệ pháp luật, yêu cầu…) sinh ngẫu nhiên.
 * Các bước nằm ở ./buoc/, ghép thành luồng ở create-case-10G.page.ts.
 */

/** Cấu hình luồng 10G (src/data/10-hoa-giai/data-form-10G.xlsx, sheet "Cấu hình") */
export interface CauHinh10G {
  linhVuc: LinhVuc;
  bieuMau: string;
  tenBieuMau: string;
  /** Tòa tạo đơn — chọn tài khoản theo cột "Tòa án" của Taikhoan.xlsx */
  toaAn: string;
  /** Số đơn tạo mỗi lần chạy (BCTK_SO_DON_10G trong .env.staging ghi đè; trống thì BCTK_SO_DON chung) */
  soDon: number;
}

/**
 * Một "ô" đơn trong lần chạy: Đơn 01, Đơn 02…
 * Ô chạy hết các bước thì lần sau tự tạo đơn mới; ô đang dở thì lần sau chạy tiếp từ chỗ dừng.
 */
export interface DonNguon extends VuAnLuong {
  toaAn: string;
}

/** Dữ liệu các bước để lại, lưu ở state/10-hoa-giai/form-10G/<Đơn NN>.json */
export interface TrangThai10G extends TrangThaiChung {
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
  /** Bước 05: hòa giải viên được chỉ định và số quyết định 06-HG */
  hoaGiaiVien?: string;
  soQDChiDinhHGV?: string;
  /** Bước 06: số thông báo chuyển vụ việc sang hòa giải (Mẫu 07) */
  soTBChuyenHoaGiai?: string;
  /** Bước 07: kết quả hòa giải đã ghi nhận */
  ketQuaHoaGiai?: string;
  /** Bước 08: số quyết định công nhận kết quả hòa giải thành */
  soQDCongNhan?: string;
  /** Bước 05–08: đơn đã kết thúc theo hướng khác (vd. "TRẢ ĐƠN", "HÒA GIẢI KHÔNG THÀNH") → các bước sau không làm gì */
  ketThucKhac?: string;
}

export function docCauHinh10G(): CauHinh10G {
  const file = path.join(DATA_DIR, '10-hoa-giai', 'data-form-10G.xlsx');
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
    soDon: Math.max(1, Number(process.env.BCTK_SO_DON_10G) || Number(process.env.BCTK_SO_DON) || Number(ch['Số đơn tạo mỗi lần chạy']) || 1),
  };
}

/** Cấu hình đã đọc sẵn, dùng chung cho các bước */
export const cauHinh10G = docCauHinh10G();

/** Các ô đơn của lần chạy: Đơn 01 … Đơn N */
export const danhSachDon10G = (ch: CauHinh10G): DonNguon[] =>
  Array.from({ length: ch.soDon }, (_, i) => ({ maVuAn: `Đơn ${String(i + 1).padStart(2, '0')}`, toaAn: ch.toaAn }));
