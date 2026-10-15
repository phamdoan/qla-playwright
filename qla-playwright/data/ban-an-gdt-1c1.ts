/**
 * Bộ bản án cho luồng GĐT/TT biểu 1C1 (Quyết định GĐT – pháp nhân thương mại).
 * Nguồn: data/data-test-hinh-su-gdt-tai-tham.xlsx (bản chép của "DATA TEST HÌNH SỰ - GĐT TÁI THẨM.xlsx"),
 * sheet "25_QD_GDT_PHAP_NHAN_1C1" — đọc trực tiếp, không hard-code. Đổi file qua QLA_GDT_1C1_FILE.
 *
 * Cột dùng: cột A (VG01…, tiêu đề là số lạc "789"), "ID pháp nhân", "Mã vụ án thực tế", "Tòa án",
 * "Ngày bản án" (thực chất là ký hiệu "Bản án số 377/2024/HS-ST ngày 1/09/2024"), "Tên pháp nhân thương mại", "Tội danh".
 *
 * Theo "Luồng nhập data.txt": Số bản án / Ngày bản án / Cấp xét xử lấy từ ký hiệu bản án (HS-ST → Hình sự,
 * Sơ thẩm), Tòa ra bản án lấy ở cột "Tòa án". Dòng không có ký hiệu bản án thì không nhập được đơn →
 * đưa vào DS_THIEU_BAN_AN_1C1 kèm lý do, không tự suy đoán.
 */
import path from 'path';
import { BanAnSoTham, chuanNgay, TEN_TOA_THEO_DANH_MUC } from '../common/ban-an-so-tham';
import { docXlsx } from '../common/xlsx';

export const FILE_GDT_1C1 = process.env.QLA_GDT_1C1_FILE || path.resolve(__dirname, 'data-test-hinh-su-gdt-tai-tham.xlsx');
export const SHEET_1C1 = '25_QD_GDT_PHAP_NHAN_1C1';

export interface BanAnGdt1C1 extends BanAnSoTham {
  /** Mã dòng trong sheet (VG01…) */
  maExcel: string;
  idPhapNhan: string;
  tenPhapNhan: string;
}

export interface DongThieuBanAn1C1 {
  maExcel: string;
  tenPhapNhan: string;
  lyDo: string;
}

const LOAI_AN: Record<string, string> = { HS: 'Hình sự', DS: 'Dân sự' };
const CAP_XET_XU: Record<string, string> = { ST: 'Sơ thẩm', PT: 'Phúc thẩm' };

function chiSoCot(tieuDe: string[], ten: string): number {
  const i = tieuDe.indexOf(ten);
  if (i < 0) throw new Error(`Sheet "${SHEET_1C1}" thiếu cột "${ten}" (có: ${tieuDe.filter(Boolean).join(', ')})`);
  return i;
}

function docSheet1C1() {
  const sh = docXlsx(FILE_GDT_1C1)[SHEET_1C1];
  if (!sh) throw new Error(`Không thấy sheet "${SHEET_1C1}" trong ${FILE_GDT_1C1}`);
  const tieuDe = (sh[0] || []).map(t => (t || '').trim());
  const c = {
    idPhapNhan: chiSoCot(tieuDe, 'ID pháp nhân'),
    maVuAn: chiSoCot(tieuDe, 'Mã vụ án thực tế'),
    toa: chiSoCot(tieuDe, 'Tòa án'),
    banAn: chiSoCot(tieuDe, 'Ngày bản án'),
    ten: chiSoCot(tieuDe, 'Tên pháp nhân thương mại'),
    toiDanh: chiSoCot(tieuDe, 'Tội danh'),
  };
  const ds: BanAnGdt1C1[] = [];
  const thieu: DongThieuBanAn1C1[] = [];
  for (let i = 1; i < sh.length; i++) {
    const h = (sh[i] || []).map(v => (v || '').trim());
    // Cột A là mã dòng VG01…; dòng trống cuối sheet bỏ qua
    const maExcel = h[0];
    if (!/^VG\d+$/.test(maExcel || '')) continue;
    const tenPhapNhan = h[c.ten];
    const m = h[c.banAn].match(/số\s*([^/]+)\/(\d{4})\/([A-ZĐ]+)\s*-\s*([A-ZĐ]+)\s*ngày\s*([\d/]+)/i);
    if (!m) {
      thieu.push({ maExcel, tenPhapNhan, lyDo: `Dòng ${i + 1}: cột "Ngày bản án" trống/không đúng dạng "Bản án số …/…/HS-ST ngày …" → chưa nhập được đơn` });
      continue;
    }
    const loaiAn = LOAI_AN[m[3].toUpperCase()];
    const capXetXu = CAP_XET_XU[m[4].toUpperCase()];
    const toaAnTrongFile = h[c.toa];
    if (!loaiAn || !capXetXu || !toaAnTrongFile) {
      thieu.push({ maExcel, tenPhapNhan, lyDo: `Dòng ${i + 1}: ký hiệu "${m[3]}-${m[4]}" chưa có trong bảng quy đổi hoặc thiếu cột "Tòa án"` });
      continue;
    }
    const soBanAn = m[1].trim();
    const ngayBanAn = chuanNgay(m[5]);
    const toaAn = TEN_TOA_THEO_DANH_MUC[toaAnTrongFile] || toaAnTrongFile;
    ds.push({
      dong: i + 1,
      maExcel,
      idPhapNhan: h[c.idPhapNhan],
      tenPhapNhan,
      soBanAn,
      ngayBanAn,
      toaAn,
      toaAnTrongFile,
      capXetXu,
      loaiAn,
      biCao: tenPhapNhan,
      toiDanh: h[c.toiDanh],
      maVuAn: h[c.maVuAn],
      // FE: `Khiếu nại ${loại QĐ/BA} số ${số} ngày ${ngày} của ${tên tòa}` (mặc định Loại QĐ/BA = Bản án)
      noiDungGoiY: `Khiếu nại Bản án số ${soBanAn} ngày ${ngayBanAn} của ${toaAn}`,
    });
  }
  return { ds, thieu };
}

const { ds, thieu } = docSheet1C1();
export const DS_BAN_AN_GDT_1C1: BanAnGdt1C1[] = ds;
export const DS_THIEU_BAN_AN_1C1: DongThieuBanAn1C1[] = thieu;
