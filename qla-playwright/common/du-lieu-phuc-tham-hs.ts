/**
 * Dữ liệu phúc thẩm hình sự: sheet "07_KHANG_CAO_KHANG_NGHI_PT" (kháng cáo/kháng nghị) ghép với
 * "08_BAN_AN_PHUC_THAM" (thụ lý + bản án phúc thẩm) qua cột "ID vụ án".
 *
 * Cùng file Excel với luồng sơ thẩm (data/data-test-hinh-su.xlsx) nên "ID vụ án" ở đây chính là
 * cột "Mã vụ án" của sheet 03 — dùng nó để tra mã vụ án thật đã tạo trong sổ cái sơ thẩm.
 */
import { FILE_HINH_SU, ngayExcel } from './du-lieu-hinh-su';
import { docXlsx } from './xlsx';

export const SHEET_KHANG_CAO = '07_KHANG_CAO_KHANG_NGHI_PT';
export const SHEET_BAN_AN_PT = '08_BAN_AN_PHUC_THAM';

export interface KhangCaoPT {
  /** Mã dòng trong sheet 07, vd "KC014" */
  ma: string;
  /** Mã vụ án sơ thẩm trong file, vd "VA054" */
  maVuAnST: string;
  trangThai: string;
  /** Mã vụ án phúc thẩm thật, có khi người khác đã tạo tay */
  maVuAnPT: string;
  /** "Kháng cáo" | "Kháng nghị phúc thẩm" */
  loai: string;
  /** Vd "Bị cáo Quách Văn Nam" */
  chuThe: string;
  /** DD/MM/YYYY */
  ngay: string;
  noiDung: string;
  ghiChu: string;
}

export interface BanAnPT {
  ma: string;
  maVuAnST: string;
  toaAnPT: string;
  soThuLyPT: string;
  /** DD/MM/YYYY */
  ngayThuLyPT: string;
  soBanAnPT: string;
  /** DD/MM/YYYY */
  ngayBanAnPT: string;
  ketQua: string;
  dacDiem: string;
  ghiChu: string;
}

const docSheet = (ten: string): Record<string, string>[] => {
  const wb = docXlsx(FILE_HINH_SU);
  const b = wb[ten];
  if (!b) throw new Error(`Không thấy sheet "${ten}" trong ${FILE_HINH_SU} (có: ${Object.keys(wb).join(', ')})`);
  const tieuDe = (b[0] || []).map(t => (t || '').trim());
  return b
    .slice(1)
    .filter(h => (h || []).some(x => (x || '').trim()))
    .map(h => Object.fromEntries(tieuDe.map((t, i) => [t, (h[i] || '').trim()])));
};

export function docKhangCaoPT(): KhangCaoPT[] {
  return docSheet(SHEET_KHANG_CAO)
    .filter(r => r['Mã'] && r['ID vụ án'])
    .map(r => ({
      ma: r['Mã'],
      maVuAnST: r['ID vụ án'],
      trangThai: r['Trạng thái'],
      maVuAnPT: r['Mã vụ án thực tế ( phúc thẩm )'],
      loai: r['Loại'],
      chuThe: r['Chủ thể'],
      ngay: ngayExcel(r['Ngày Kháng cáo/ Kháng nghị']),
      noiDung: r['Nội dung'],
      ghiChu: r['Ghi chú'],
    }));
}

export function docBanAnPT(): BanAnPT[] {
  return docSheet(SHEET_BAN_AN_PT)
    .filter(r => r['ID vụ án'])
    .map(r => ({
      ma: r['ID bản án PT'],
      maVuAnST: r['ID vụ án'],
      toaAnPT: r['Tòa án phúc thẩm'],
      soThuLyPT: r['Số thụ lý PT'],
      ngayThuLyPT: ngayExcel(r['Ngày thụ lý PT']),
      soBanAnPT: r['Số bản án PT'],
      ngayBanAnPT: ngayExcel(r['Ngày bản án PT']),
      ketQua: r['Kết quả'],
      dacDiem: r['Đặc điểm'],
      ghiChu: r['Ghi chú'],
    }));
}

/**
 * Họ tên người kháng cáo tách từ cột "Chủ thể": "Bị cáo Quách Văn Nam" → "Quách Văn Nam".
 * Trả chuỗi rỗng khi chủ thể là cơ quan (kháng nghị) — khi đó không có bị cáo nào để tra.
 */
export function tenNguoiKhangCao(chuThe: string): string {
  const s = String(chuThe || '').trim();
  const m = s.match(/^\s*(?:Bị cáo|Bị hại|Nguyên đơn dân sự|Bị đơn dân sự|Người có quyền lợi[^ ]*)\s+(.+?)\s*$/i);
  return m ? m[1].replace(/\s+và\s+\d+.*$/i, '').trim() : '';
}
