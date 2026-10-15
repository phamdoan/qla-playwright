/**
 * Dữ liệu test cho luồng "Đơn khởi kiện hành chính — sơ thẩm".
 * Nguồn: data/data-test-hanh-chinh.xlsx, sheet "Hành chính sơ thẩm" — đọc trực tiếp, không hard-code.
 *
 * Sheet này có DÒNG 1 là nhóm cột, DÒNG 2 mới là tiêu đề thật, dữ liệu từ dòng 3.
 * Cột dùng tới: Mã vụ án sơ thẩm | Trạng thái nhập | Ngày thụ lý sở thẩm | Tòa án giải quyết |
 *               Người khởi kiện | Người bị kiện | Tên loại vụ án | Cơ quan bị kiện
 */
import path from 'path';
import { docXlsx } from './xlsx';

export const FILE_HANH_CHINH = process.env.QLA_HC_FILE || path.resolve(__dirname, '../data/data-test-hanh-chinh.xlsx');
export const SHEET_HANH_CHINH = process.env.QLA_HC_SHEET || 'Hành chính sơ thẩm';
/** Tiêu đề nằm ở dòng 2 của sheet (dòng 1 là nhóm cột) */
const DONG_TIEU_DE = 1;

export interface NguoiHanhChinh {
  /** Nguyên văn trong file, vd. "Ông Trần Văn Hùng" */
  nguyenVan: string;
  /** Đã bỏ tiền tố "Ông/Bà/Anh/Chị" và phần "(… tuổi)" */
  hoTen: string;
  tuoi?: number;
  /** Năm sinh = năm hiện tại − tuổi (chỉ khi ô có ghi tuổi) */
  namSinh?: number;
  /** true khi ô không phải cá nhân: "Công ty…", "Cơ quan…", "UBND…" */
  laToChuc: boolean;
}

export interface VuAnHanhChinh {
  /** Số thứ tự dòng trong sheet (dòng 1 là nhóm cột, dòng 2 là tiêu đề) */
  dong: number;
  maVuAn: string;
  /** true khi ô "Mã vụ án sơ thẩm" đã là mã thật (VA26-…) → vụ đã nhập vào hệ thống */
  daCoMa: boolean;
  trangThaiNhap: string;
  /** DD/MM/YYYY, có thể trống */
  ngayThuLyST: string;
  toaAn: string;
  nguoiKhoiKien: NguoiHanhChinh;
  /** Nguyên văn cột "Người bị kiện", vd. "UBND xã Minh Khai" */
  nguoiBiKien: string;
  /** Dùng cho ô "Quan hệ pháp luật (Thống kê)" */
  loaiVuAn: string;
  coQuanBiKien: string;
  /** Cột "Đã xét xử…" = 1 → vụ kết thúc bằng bản án (0: đình chỉ/tạm đình chỉ, không ra bản án) */
  daXetXu: boolean;
}

/** Ô ngày: "21/01/2026" hoặc số serial Excel (46357) → DD/MM/YYYY; ô rỗng/không phải ngày → '' */
export function ngayExcel(o: string): string {
  const s = (o || '').trim();
  if (!s) return '';
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  // Số serial Excel hợp lệ nằm trong khoảng vài chục nghìn; số nhỏ là thứ khác (mã, số thứ tự)
  const n = Number(s);
  if (Number.isFinite(n) && n > 20_000 && n < 80_000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86_400_000);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
  }
  return '';
}

/** Ô người khởi kiện không phải cá nhân thì bắt đầu bằng các từ này */
const TO_CHUC = /^(công ty|cơ quan|tổ chức|doanh nghiệp|ubnd|ủy ban|viện|sở|cục|bộ|chi nhánh|hợp tác xã|htx|ngân hàng|trường)/i;

/** "Ông Trần Văn Hùng (45 tuổi)" → { hoTen: "Trần Văn Hùng", tuoi: 45, namSinh } */
export function tachNguoiHanhChinh(o: string): NguoiHanhChinh {
  const nguyenVan = (o || '').replace(/\s+/g, ' ').trim();
  const m = nguyenVan.match(/^(.*?)\s*\(\s*(\d{1,3})\s*tu[oổ]i\s*\)\s*$/i);
  const tuoi = m ? Number(m[2]) : undefined;
  const hoTen = (m ? m[1] : nguyenVan).replace(/^(ông|bà|anh|chị)\s+/i, '').trim();
  return {
    nguyenVan,
    hoTen,
    tuoi,
    namSinh: tuoi ? new Date().getFullYear() - tuoi : undefined,
    laToChuc: TO_CHUC.test(hoTen),
  };
}

export function docVuAnHanhChinh(sheet = SHEET_HANH_CHINH): VuAnHanhChinh[] {
  const wb = docXlsx(FILE_HANH_CHINH);
  const sh = wb[sheet];
  if (!sh) throw new Error(`Không thấy sheet "${sheet}" trong ${FILE_HANH_CHINH} (có: ${Object.keys(wb).join(', ')})`);
  const tieuDe = (sh[DONG_TIEU_DE] || []).map(t => (t || '').replace(/\s+/g, ' ').trim());
  const cot = (ten: string) => {
    const i = tieuDe.indexOf(ten);
    if (i < 0) throw new Error(`Sheet "${sheet}" thiếu cột "${ten}" (có: ${tieuDe.filter(Boolean).join(', ')})`);
    return i;
  };
  const c = {
    ma: 0, // cột A "Mã vụ án sơ thẩm" ở dòng 1, dòng 2 để trống
    trangThai: cot('Trạng thái nhập'),
    ngayTL: cot('Ngày thụ lý sở thẩm'),
    toa: cot('Tòa án giải quyết'),
    khoiKien: cot('Người khởi kiện'),
    biKien: cot('Người bị kiện'),
    loai: cot('Tên loại vụ án'),
    coQuan: cot('Cơ quan bị kiện'),
    // Tiêu đề trong file là "Đã xét xử thẩm" (gõ thiếu) → khớp theo tiền tố
    daXetXu: tieuDe.findIndex(t => t.startsWith('Đã xét xử')),
  };
  const ds: VuAnHanhChinh[] = [];
  for (let i = DONG_TIEU_DE + 1; i < sh.length; i++) {
    const h = (sh[i] || []).map(v => (v || '').replace(/\s+/g, ' ').trim());
    // Dòng là vụ án khi có đủ người khởi kiện và người bị kiện. Ô "Mã vụ án sơ thẩm" đã là mã thật
    // (VA26-…) nghĩa là vụ đã nhập vào hệ thống; còn ghi "Nhập mã ST" là vụ CHƯA có mã, cần tạo.
    if (!h[c.khoiKien] || !h[c.biKien]) continue;
    ds.push({
      dong: i + 1,
      maVuAn: h[c.ma],
      daCoMa: /^VA\d/.test(h[c.ma] || ''),
      trangThaiNhap: h[c.trangThai] || '',
      ngayThuLyST: ngayExcel(h[c.ngayTL]),
      toaAn: h[c.toa] || '',
      nguoiKhoiKien: tachNguoiHanhChinh(h[c.khoiKien]),
      nguoiBiKien: h[c.biKien],
      loaiVuAn: h[c.loai] || '',
      coQuanBiKien: h[c.coQuan] || '',
      daXetXu: c.daXetXu >= 0 && Number(h[c.daXetXu]) === 1,
    });
  }
  return ds;
}

/**
 * Các vụ sẽ chạy trên giao diện. Mặc định 1 vụ; đổi bằng:
 *   QLA_HC_DONG=3,5     → đúng các dòng đó trong sheet
 *   QLA_HC_SO_DONG=3    → 3 vụ đầu
 */
export function chonVuHanhChinh(ds: VuAnHanhChinh[]): VuAnHanhChinh[] {
  const chiDinh = (process.env.QLA_HC_DONG || '')
    .split(',')
    .map(s => Number(s.trim()))
    .filter(Boolean);
  if (chiDinh.length) return ds.filter(v => chiDinh.includes(v.dong));
  // Mặc định chỉ tạo các vụ CHƯA có mã vụ án (ô ghi "Nhập mã ST"); QLA_HC_CA_DA_CO_MA=1 để lấy hết
  const nguon = process.env.QLA_HC_CA_DA_CO_MA === '1' ? ds : ds.filter(v => !v.daCoMa);
  return nguon.slice(0, Math.max(1, Number(process.env.QLA_HC_SO_DONG || 1)));
}
