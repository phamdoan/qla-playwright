import fs from 'fs';
import path from 'path';
import { Luong } from './buoc/chung';
import { DATA_DIR, LinhVuc } from '../../../utils/file-helper';
import { docBangExcelSync, docKhoaGiaTriSync } from '../../../utils/excel-helper';
import { TaiKhoan } from '../../../utils/tai-khoan';
import { TrangThaiChung } from '../../../utils/trang-thai';
import { VuAnLuong } from '../../common/buoc';

/**
 * Phần dùng chung của luồng 1B: cấu hình (data-form-1B.xlsx), danh sách vụ án mới (data-1B.xlsx),
 * kiểu trạng thái các bước để lại cho nhau. Các bước nằm ở ./buoc/, ghép thành luồng ở create-case-1B.page.ts.
 */

/** Cấu hình luồng 1B (src/data/1-hinh-su/data-form-1B.xlsx) */
export interface CauHinh1B {
  linhVuc: LinhVuc;
  bieuMau: string;
  tenBieuMau: string;
  /** File vụ án nguồn trong src/data/1-hinh-su (cột: Mã vụ án | Tòa án | Luồng) */
  fileVuAn: string;
  /** File lưu các vụ đã chạy (vụ chạy xong được chuyển từ fileVuAn sang đây) */
  fileVuAnDaChay: string;
  /** Luồng mặc định khi file vụ án không ghi cột "Luồng" */
  luong: Luong;
  /** Tệp đính kèm (đường dẫn tính từ gốc project) */
  fileDinhKem: string;
  donViKhangNghi: string;
  diaDiemXetXuChiTiet: string;
  /** Tài khoản người ký chưa có trong Taikhoan.xlsx */
  taiKhoanBoSung: TaiKhoan[];
}

/** Một dòng của data-1B.xlsx */
export interface VuAnNguon extends VuAnLuong {
  maVuAn: string;
  toaAn: string;
  luong: Luong;
  /** Dòng gốc trong file Excel (để chuyển sang file old nguyên vẹn) */
  dongGoc: Record<string, string>;
}

/** Dữ liệu các bước để lại cho nhau, lưu ở state/1-hinh-su/form-1B/<mã vụ án>.json */
export interface TrangThai1B extends TrangThaiChung {
  luong?: Luong;
  tenVuAn?: string;
  maDinhDanh?: string;
  toaPhucTham?: string;
  urlVuAn?: string;
  maVuAnPhucTham?: string;
  soThuLy?: string;
  ngayThuLy?: string;
  chuToa?: string;
  nguoiKyPhanCong?: string;
  nguoiKyQuyetDinh?: string;
  ngayXetXu?: string;
}

const ROOT = path.resolve(__dirname, '../../../..');

/**
 * Đọc src/data/1-hinh-su/data-form-1B.xlsx:
 *   · sheet "Cấu hình": Khóa | Giá trị | Ghi chú
 *   · sheet "Tài khoản bổ sung": Tòa án | Tài khoản | Tên (người ký chưa có trong Taikhoan.xlsx)
 */
export function docCauHinh1B(): CauHinh1B {
  const file = path.join(DATA_DIR, '1-hinh-su', 'data-form-1B.xlsx');
  const ch = docKhoaGiaTriSync(file, 'Cấu hình');
  const bat = (khoa: string) => {
    if (!ch[khoa]) throw new Error(`${file}: sheet "Cấu hình" thiếu giá trị "${khoa}"`);
    return ch[khoa];
  };
  return {
    linhVuc: bat('Lĩnh vực') as LinhVuc,
    bieuMau: bat('Biểu mẫu'),
    tenBieuMau: bat('Tên biểu mẫu'),
    fileVuAn: bat('File vụ án'),
    fileVuAnDaChay: ch['File vụ án đã chạy'] || bat('File vụ án').replace(/\.xlsx$/i, '-old.xlsx'),
    luong: /nghị|nghi/i.test(bat('Luồng mặc định')) ? 'khang-nghi' : 'khang-cao',
    fileDinhKem: path.resolve(ROOT, bat('File đính kèm')),
    donViKhangNghi: bat('Đơn vị kháng nghị'),
    diaDiemXetXuChiTiet: bat('Địa điểm xét xử (chi tiết)'),
    taiKhoanBoSung: docBangExcelSync(file, 'Tài khoản bổ sung')
      .filter(d => d['Tài khoản'])
      .map(d => ({ toaAn: d['Tòa án'], taiKhoan: d['Tài khoản'], ten: d['Tên'] || undefined })),
  };
}

/**
 * Vụ án CHƯA chạy trong data-1B.xlsx (bỏ những mã đã có trong file old).
 * Luồng theo cột "Luồng" ("Kháng cáo" / "Kháng nghị"), không có thì BCTK_LUONG, rồi "Luồng mặc định".
 */
export function docVuAnMoi1B(ch: CauHinh1B): VuAnNguon[] {
  const fileCu = path.join(DATA_DIR, ch.linhVuc, ch.fileVuAnDaChay);
  const daChay = new Set(fs.existsSync(fileCu) ? docBangExcelSync(fileCu).map(d => d['Mã vụ án']) : []);
  return docBangExcelSync(path.join(DATA_DIR, ch.linhVuc, ch.fileVuAn))
    .filter(d => d['Mã vụ án'] && !daChay.has(d['Mã vụ án']))
    .map(d => {
      const ghi = d['Luồng'] || process.env.BCTK_LUONG || '';
      const luong: Luong = /nghị|nghi/i.test(ghi) ? 'khang-nghi' : /cáo|cao/i.test(ghi) ? 'khang-cao' : ch.luong;
      return { maVuAn: d['Mã vụ án'], toaAn: d['Tòa án'], luong, dongGoc: d };
    });
}

/** Cấu hình đã đọc sẵn, dùng chung cho các bước */
export const cauHinh1B = docCauHinh1B();
