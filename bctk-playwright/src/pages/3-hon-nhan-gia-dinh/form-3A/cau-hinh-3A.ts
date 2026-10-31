import path from 'path';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docKhoaGiaTriSync } from '../../../utils/excel-helper';
import { TrangThaiChung } from '../../../utils/trang-thai';
import { VuAnLuong } from '../../common/buoc';

/**
 * Phần dùng chung của luồng 3A: cấu hình (data-form-3A.xlsx) và kiểu dữ liệu các bước để lại cho nhau.
 * Form này KHÔNG có file đầu vào — mọi dữ liệu (đương sự, quan hệ pháp luật, yêu cầu, người được phân công…) sinh ngẫu nhiên.
 * Luồng: đơn khởi kiện → xử lý đơn → thụ lý thành vụ án hôn nhân và gia đình sơ thẩm → phân công người tiến hành tố tụng.
 * Các bước nằm ở ./buoc/, ghép thành luồng ở create-case-3A.page.ts.
 */

/** Cấu hình luồng 3A (src/data/3-hon-nhan-gia-dinh/data-form-3A.xlsx, sheet "Cấu hình") */
export interface CauHinh3A {
  linhVuc: LinhVuc;
  bieuMau: string;
  tenBieuMau: string;
  /** Tòa tạo đơn — chọn tài khoản theo cột "Tòa án" của Taikhoan.xlsx */
  toaAn: string;
  /** Số đơn tạo mỗi lần chạy (BCTK_SO_DON_3A trong .env.staging ghi đè; trống thì BCTK_SO_DON chung) */
  soDon: number;
}

/**
 * Một "ô" đơn trong lần chạy: Đơn 01, Đơn 02…
 * Ô chạy hết các bước thì lần sau tự tạo đơn mới; ô đang dở thì lần sau chạy tiếp từ chỗ dừng.
 */
export interface DonNguon extends VuAnLuong {
  toaAn: string;
}

/** Dữ liệu các bước để lại, lưu ở state/3-hon-nhan-gia-dinh/form-3A/<Đơn NN>.json */
export interface TrangThai3A extends TrangThaiChung {
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
  soTB26?: string;
  soTB29?: string;
  soBienLai?: string;
  /** Link chi tiết vụ án sơ thẩm (…/so-tham/chi-tiet?id=…) sau khi thụ lý */
  urlVuAn?: string;
  /** Mã vụ án thật trên hệ thống, vd. VA26-… */
  maVuAnHeThong?: string;
  soTBThuLy?: string;
  ngayThuLy?: string;
  thamPhanChuToa?: string;
  soQDThamPhan?: string;
  thuKy?: string;
  soQDThuKy?: string;
  /** Hai hội thẩm nhân dân, nối bằng " ; " */
  hoiTham?: string;
  soQDHoiTham?: string;
}

export function docCauHinh3A(): CauHinh3A {
  const file = path.join(DATA_DIR, '3-hon-nhan-gia-dinh', 'data-form-3A.xlsx');
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
    soDon: Math.max(1, Number(process.env.BCTK_SO_DON_3A) || Number(process.env.BCTK_SO_DON) || Number(ch['Số đơn tạo mỗi lần chạy']) || 1),
  };
}

/** Cấu hình đã đọc sẵn, dùng chung cho các bước */
export const cauHinh3A = docCauHinh3A();

/** Các ô đơn của lần chạy: Đơn 01 … Đơn N */
export const danhSachDon3A = (ch: CauHinh3A): DonNguon[] =>
  Array.from({ length: ch.soDon }, (_, i) => ({ maVuAn: `Đơn ${String(i + 1).padStart(2, '0')}`, toaAn: ch.toaAn }));
