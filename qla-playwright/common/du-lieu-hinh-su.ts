/**
 * Dữ liệu test cho luồng "Vụ án hình sự sơ thẩm" (Training AI hình sự.docx).
 * Nguồn: data/data-test-hinh-su.xlsx — đọc trực tiếp, không hard-code và không tự sinh.
 *
 *   sheet "03_MASTER_VU_AN"   : một dòng một vụ án (Mã vụ án, Tên vụ án, Điều luật, Ngày thụ lý ST,
 *                               Bộ luật, Địa bàn, Trạng thái sơ thẩm…)
 *   sheet "04_MASTER_BI_CAO"  : một dòng một bị can, nối với vụ án qua "ID vụ án" = "Mã vụ án"
 *                               (Họ và tên, Giới tính, Năm sinh, Dân tộc, Quốc tịch, Nghề nghiệp,
 *                               Đặc điểm nhân thân, Tội danh VKS truy tố, Khoản)
 *
 * Bị can đầu vụ là dòng đầu tiên của vụ trong sheet 04; các dòng sau là đồng phạm.
 */
import path from 'path';
import { docXlsx } from './xlsx';

export const FILE_HINH_SU = process.env.QLA_HS_FILE || path.resolve(__dirname, '../data/data-test-hinh-su.xlsx');
export const SHEET_VU_AN = '03_MASTER_VU_AN';
export const SHEET_BI_CAO = '04_MASTER_BI_CAO';

export interface BiCanHinhSu {
  /** "BC001" */
  id: string;
  hoTen: string;
  namSinh: number;
  gioiTinh: string;
  quocTich: string;
  danToc: string;
  ngheNghiep: string;
  /** Các mã trong cột "Đặc điểm nhân thân", vd ["khong_nghe", "tai_pham"] */
  dacDiemNhanThan: string[];
  /** Cột "Tội danh VKS truy tố" (bị can đầu vụ dùng cho ô "Tội danh bị truy tố" khi tạo hồ sơ) */
  toiDanhTruyTo: string;
  /** Số khoản lấy từ cột "Khoản" ("khoản 1" → "1"); rỗng nếu không ghi */
  khoan: string;
  /** Cột "Hình phạt chính ST" — loại hình phạt Viện kiểm sát đề nghị (bước 10.7) */
  hinhPhatChinhST: string;
  /** Cột "Mức hình phạt" — mức Tòa án tuyên (bước 10.15) */
  mucHinhPhat: string;
}

export interface VuAnHinhSu {
  /** Số thứ tự dòng trong sheet 03 (dòng 1 là tiêu đề) */
  dong: number;
  maVuAn: string;
  tenVuAn: string;
  toaAn: string;
  toiDanh: string;
  /** Số điều, vd "123" từ "Điều 123" */
  dieuLuat: string;
  nhomToiPham: string;
  /** DD/MM/YYYY */
  ngayThuLyST: string;
  boLuat: string;
  ketQuaST: string;
  /** DD/MM/YYYY, có thể trống */
  ngayKetQua: string;
  diaBan: string;
  /** Cột "Đặc điểm vụ án" — dùng để biết vụ có "Áp dụng án lệ" hay không (bước 10.2) */
  dacDiemVuAn: string;
  trangThai: string;
  biCan: BiCanHinhSu[];
}

/** Ô ngày: "20/08/2025" hoặc số serial Excel (46097) → DD/MM/YYYY */
export function ngayExcel(o: string): string {
  const s = (o || '').trim();
  if (!s) return '';
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  if (/^\d+(\.\d+)?$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86_400_000);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
  }
  return s;
}

/** DD/MM/YYYY → Date (giờ địa phương) */
export const docNgay = (s: string) => {
  const [d, m, y] = s.split('/').map(Number);
  return new Date(y, m - 1, d);
};

/** Cộng/trừ ngày trên chuỗi DD/MM/YYYY */
export function congNgay(s: string, soNgay: number): string {
  const d = docNgay(s);
  d.setDate(d.getDate() + soNgay);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Chỉ số cột theo tiêu đề; thiếu cột là lỗi thật, không đoán */
function chiSoCot(sheet: string, tieuDe: string[], ten: string): number {
  const i = tieuDe.indexOf(ten);
  if (i < 0) throw new Error(`Sheet "${sheet}" thiếu cột "${ten}" (có: ${tieuDe.filter(Boolean).join(', ')})`);
  return i;
}

/** "1985.0" → 1985; ô trống hoặc không phải số → 0 */
const namSinhExcel = (o: string) => Math.trunc(Number((o || '').trim())) || 0;

/** "khoản 1" / "Khoản 2" → "1" / "2" */
const soKhoan = (o: string) => ((o || '').match(/\d+/) || [''])[0];

/** "khong_nghe, tai_pham" → ["khong_nghe", "tai_pham"] */
const tachDacDiem = (o: string) =>
  (o || '')
    .split(/[,;]/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

/** Bị can theo từng vụ, khoá là "ID vụ án" trong sheet 04 */
function docBiCan(wb: Record<string, string[][]>): Map<string, BiCanHinhSu[]> {
  const sh = wb[SHEET_BI_CAO];
  if (!sh) throw new Error(`Không thấy sheet "${SHEET_BI_CAO}" trong ${FILE_HINH_SU} (có: ${Object.keys(wb).join(', ')})`);
  const tieuDe = (sh[0] || []).map(t => (t || '').trim());
  const c = {
    id: chiSoCot(SHEET_BI_CAO, tieuDe, 'ID bị cáo'),
    idVuAn: chiSoCot(SHEET_BI_CAO, tieuDe, 'ID vụ án'),
    hoTen: chiSoCot(SHEET_BI_CAO, tieuDe, 'Họ và tên'),
    gioiTinh: chiSoCot(SHEET_BI_CAO, tieuDe, 'Giới tính'),
    namSinh: chiSoCot(SHEET_BI_CAO, tieuDe, 'Năm sinh'),
    danToc: chiSoCot(SHEET_BI_CAO, tieuDe, 'Dân tộc'),
    quocTich: chiSoCot(SHEET_BI_CAO, tieuDe, 'Quốc tịch'),
    ngheNghiep: chiSoCot(SHEET_BI_CAO, tieuDe, 'Nghề nghiệp'),
    nhanThan: chiSoCot(SHEET_BI_CAO, tieuDe, 'Đặc điểm nhân thân'),
    truyTo: chiSoCot(SHEET_BI_CAO, tieuDe, 'Tội danh VKS truy tố'),
    khoan: chiSoCot(SHEET_BI_CAO, tieuDe, 'Khoản'),
    hinhPhat: chiSoCot(SHEET_BI_CAO, tieuDe, 'Hình phạt chính ST'),
    mucHinhPhat: chiSoCot(SHEET_BI_CAO, tieuDe, 'Mức hình phạt'),
  };
  const theoVu = new Map<string, BiCanHinhSu[]>();
  for (let i = 1; i < sh.length; i++) {
    const h = (sh[i] || []).map(v => (v || '').trim());
    const idVuAn = h[c.idVuAn];
    if (!idVuAn || !h[c.hoTen]) continue;
    const ds = theoVu.get(idVuAn) || [];
    ds.push({
      id: h[c.id],
      hoTen: tenHopLe(h[c.hoTen]),
      namSinh: namSinhExcel(h[c.namSinh]),
      gioiTinh: h[c.gioiTinh],
      quocTich: h[c.quocTich],
      danToc: h[c.danToc],
      ngheNghiep: h[c.ngheNghiep],
      dacDiemNhanThan: tachDacDiem(h[c.nhanThan]),
      toiDanhTruyTo: h[c.truyTo],
      khoan: soKhoan(h[c.khoan]),
      hinhPhatChinhST: h[c.hinhPhat] || '',
      mucHinhPhat: h[c.mucHinhPhat] || '',
    });
    theoVu.set(idVuAn, ds);
  }
  return theoVu;
}


/**
 * Họ tên hợp lệ với ô "Họ và tên" của QLA: FE chỉ nhận chữ cái, dấu, khoảng trắng và dấu nháy
 * (pattern /^[\p{L}\p{M}\s']+$/u) nên dấu ngoặc và chữ số trong file dữ liệu đều bị chặn.
 * Bỏ luôn phần chú thích trong ngoặc, giữ đúng họ tên:
 *   "Trần Văn Oánh (anh)"        → "Trần Văn Oánh"
 *   "Trần Văn Thẩm (bị cáo 2)"   → "Trần Văn Thẩm"
 * Hệ quả: trong một vụ có thể có nhiều bị can trùng họ tên, nên chỗ nào tìm dòng theo tên phải
 * phân biệt thêm bằng năm sinh hoặc thứ tự (xem dongCuaBiCan trong spec).
 */
export function tenHopLe(ten: string): string {
  return String(ten || '')
    .replace(/[([{].*?[)\]}]/g, ' ')
    .replace(/[^\p{L}\p{M}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function docVuAnHinhSu(): VuAnHinhSu[] {
  const wb = docXlsx(FILE_HINH_SU);
  const sh = wb[SHEET_VU_AN];
  if (!sh) throw new Error(`Không thấy sheet "${SHEET_VU_AN}" trong ${FILE_HINH_SU} (có: ${Object.keys(wb).join(', ')})`);
  const biCanTheoVu = docBiCan(wb);
  const tieuDe = (sh[0] || []).map(t => (t || '').trim());
  const c = {
    ma: chiSoCot(SHEET_VU_AN, tieuDe, 'Mãn vụ án'),
    trangThai: chiSoCot(SHEET_VU_AN, tieuDe, 'Trạng thái sơ thẩm'),
    ten: chiSoCot(SHEET_VU_AN, tieuDe, 'Tên vụ án'),
    toa: chiSoCot(SHEET_VU_AN, tieuDe, 'Tòa án'),
    toiDanh: chiSoCot(SHEET_VU_AN, tieuDe, 'Tội danh'),
    dieu: chiSoCot(SHEET_VU_AN, tieuDe, 'Điều luật'),
    nhom: chiSoCot(SHEET_VU_AN, tieuDe, 'Nhóm tội phạm'),
    ngayTL: chiSoCot(SHEET_VU_AN, tieuDe, 'Ngày thụ lý ST'),
    boLuat: chiSoCot(SHEET_VU_AN, tieuDe, 'Bộ luật'),
    kq: chiSoCot(SHEET_VU_AN, tieuDe, 'Kết quả sơ thẩm'),
    ngayKq: chiSoCot(SHEET_VU_AN, tieuDe, 'Ngày kết quả'),
    diaBan: chiSoCot(SHEET_VU_AN, tieuDe, 'Địa bàn'),
    dacDiem: chiSoCot(SHEET_VU_AN, tieuDe, 'Đặc điểm vụ án'),
  };
  const ds: VuAnHinhSu[] = [];
  for (let i = 1; i < sh.length; i++) {
    const h = (sh[i] || []).map(v => (v || '').trim());
    if (!h[c.ma] || !h[c.ten]) continue;
    ds.push({
      dong: i + 1,
      maVuAn: h[c.ma],
      tenVuAn: h[c.ten],
      toaAn: h[c.toa],
      toiDanh: h[c.toiDanh],
      dieuLuat: (h[c.dieu].match(/\d+/) || [''])[0],
      nhomToiPham: h[c.nhom],
      ngayThuLyST: ngayExcel(h[c.ngayTL]),
      boLuat: h[c.boLuat],
      ketQuaST: h[c.kq],
      ngayKetQua: ngayExcel(h[c.ngayKq]),
      diaBan: h[c.diaBan],
      dacDiemVuAn: h[c.dacDiem] || '',
      trangThai: h[c.trangThai],
      biCan: biCanTheoVu.get(h[c.ma]) || [],
    });
  }
  return ds;
}

/**
 * Các vụ sẽ chạy. Mặc định: các vụ chưa làm (cột "Trạng thái sơ thẩm" trống) VÀ có bị can trong
 * sheet 04 — không có bị can thì không nhập được hồ sơ. Lọc tuỳ chọn:
 *   QLA_HS_MA=VA017,VA020   → đúng các mã vụ án đó
 *   QLA_HS_SO_VU=3          → 3 vụ chưa làm đầu tiên
 */
export function chonVuHinhSu(ds: VuAnHinhSu[]): VuAnHinhSu[] {
  const ma = (process.env.QLA_HS_MA || '').split(',').map(s => s.trim()).filter(Boolean);
  if (ma.length) return ds.filter(v => ma.includes(v.maVuAn));
  const chuaLam = ds.filter(v => !v.trangThai && v.biCan.length);
  const soVu = Number(process.env.QLA_HS_SO_VU || 0);
  return soVu > 0 ? chuaLam.slice(0, soVu) : chuaLam;
}

/** "Bộ luật hình sự 2025" → nhãn trong danh mục Năm/Bộ luật trong file */
export function nhanBoLuat(boLuat: string): string {
  if (/2025/.test(boLuat)) return 'Bộ luật Hình sự năm 2015 sửa đổi năm 2025';
  if (/2017/.test(boLuat)) return 'Bộ luật Hình sự năm 2015 sửa đổi năm 2017';
  return 'Bộ luật Hình sự 2015';
}
