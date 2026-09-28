/**
 * Dữ liệu test cho luồng "Đơn khởi kiện và yêu cầu" (dân sự sơ thẩm).
 * Nguồn: data/data-test-dan-su.xlsx, sheet "Sơ thẩm 2A" — đọc trực tiếp, không hard-code trong test.
 *
 * Cột dùng tới: Mã vụ án ST | Tòa án | Loại vụ án | Nguyên đơn | Bị đơn
 * Ô người có dạng "Nguyễn Hương Giang ( 20 tuổi )" → tách tên và tuổi; ngày sinh suy ra theo
 * (năm hiện tại − số tuổi) đúng như mô tả trong yêu cầu.
 */
import path from 'path';
import { docXlsx } from './xlsx';

export const FILE_DAN_SU = process.env.QLA_DS_FILE || path.resolve(__dirname, '../data/data-test-dan-su.xlsx');
export const SHEET_MAC_DINH = process.env.QLA_DS_SHEET || 'Sơ thẩm 2A';

export interface NguoiDanSu {
  /** Nguyên văn trong file, vd. "Nguyễn Hương Giang ( 20 tuổi )" */
  nguyenVan: string;
  hoTen: string;
  /** Có trong ngoặc thì tách ra, không thì undefined */
  tuoi?: number;
  /** Năm sinh = năm hiện tại − tuổi (chỉ khi có tuổi) */
  namSinh?: number;
  /** true khi ô không phải cá nhân: "Cơ quan, tổ chức", "Viện Kiểm sát"… */
  laToChuc: boolean;
}

export interface VuAnDanSu {
  /** Số thứ tự dòng trong sheet (dòng 1 là tiêu đề) */
  dong: number;
  maVuAn: string;
  toaAn: string;
  /** Dùng cho ô "Quan hệ pháp luật (Thống kê)" */
  loaiVuAn: string;
  nguyenDon: NguoiDanSu;
  biDon: NguoiDanSu;
  nguoiBaoVe?: string;
}

const TO_CHUC = /^(cơ quan|viện kiểm sát|tổ chức|công ty|doanh nghiệp|ubnd|ủy ban)/i;

/** "Nguyễn Hương Giang ( 20 tuổi )" → { hoTen, tuoi, namSinh } */
export function tachNguoi(o: string): NguoiDanSu {
  const nguyenVan = (o || '').trim();
  const m = nguyenVan.match(/^(.*?)\s*\(\s*(\d{1,3})\s*tu[oổ]i\s*\)\s*$/i);
  const hoTen = (m ? m[1] : nguyenVan).trim();
  const tuoi = m ? Number(m[2]) : undefined;
  return {
    nguyenVan,
    hoTen,
    tuoi,
    namSinh: tuoi ? new Date().getFullYear() - tuoi : undefined,
    laToChuc: TO_CHUC.test(hoTen),
  };
}

/** Đọc sheet, trả các vụ án dùng được (có đủ nguyên đơn + bị đơn) */
export function docVuAnDanSu(sheet = SHEET_MAC_DINH): VuAnDanSu[] {
  const wb = docXlsx(FILE_DAN_SU);
  const sh = wb[sheet];
  if (!sh) throw new Error(`Không thấy sheet "${sheet}" trong ${FILE_DAN_SU} (có: ${Object.keys(wb).join(', ')})`);
  const tieuDe = sh[0] || [];
  const cot = (ten: string) => tieuDe.findIndex(t => (t || '').trim() === ten);
  const iMa = cot('Mã vụ án ST');
  const iToa = cot('Tòa án');
  const iLoai = cot('Loại vụ án');
  const iNguyen = cot('Nguyên đơn');
  const iBi = cot('Bị đơn');
  const iBaoVe = cot('Người bảo vệ quyền lợi');
  if (iNguyen < 0 || iBi < 0) throw new Error(`Sheet "${sheet}" thiếu cột "Nguyên đơn"/"Bị đơn"`);

  const ds: VuAnDanSu[] = [];
  for (let i = 1; i < sh.length; i++) {
    const h = sh[i] || [];
    const nguyenDon = tachNguoi(h[iNguyen] || '');
    const biDon = tachNguoi(h[iBi] || '');
    if (!nguyenDon.hoTen || !biDon.hoTen) continue;
    ds.push({
      dong: i + 1,
      maVuAn: (h[iMa] || '').trim(),
      toaAn: (h[iToa] || '').trim(),
      loaiVuAn: (h[iLoai] || '').trim(),
      nguyenDon,
      biDon,
      nguoiBaoVe: iBaoVe >= 0 ? (h[iBaoVe] || '').trim() || undefined : undefined,
    });
  }
  return ds;
}

/**
 * Các vụ sẽ chạy. Mặc định HẾT các vụ trong sheet (bước đã xong bị bỏ qua theo sổ cái); thu hẹp bằng:
 *   QLA_DS_DONG=2,5     → đúng các dòng đó
 *   QLA_DS_SO_DONG=3    → 3 vụ đầu
 *   QLA_DS_CA_NHAN=1    → chỉ lấy vụ mà cả nguyên đơn lẫn bị đơn là cá nhân (có tuổi)
 */
export function chonVuChay(ds: VuAnDanSu[]): VuAnDanSu[] {
  let nguon = ds;
  if (process.env.QLA_DS_CA_NHAN === '1') nguon = ds.filter(v => !v.nguyenDon.laToChuc && !v.biDon.laToChuc);
  const chiDinh = (process.env.QLA_DS_DONG || '').split(',').map(s => Number(s.trim())).filter(Boolean);
  if (chiDinh.length) return nguon.filter(v => chiDinh.includes(v.dong));
  const soDong = Number(process.env.QLA_DS_SO_DONG || 0);
  return soDong > 0 ? nguon.slice(0, soDong) : nguon;
}
