/**
 * Dữ liệu test cho luồng "nhập đơn theo bản án sơ thẩm" (tài khoản mới).
 *
 * Nguồn (không hard-code trong test, đọc thẳng từ Excel):
 *  - Đầu vào  : data/BAN_AN_SO_THAM_TOA_AN_GDT.xlsx — 3 cột đúng bằng 3 ô trên màn hình
 *               "Số bản án" | "Ngày bản án" | "Tòa ra quyết định bản án"
 *  - Đối chiếu: data/22A_BAN_AN_ST_TOA_AN_DATA.xlsx — dữ liệu gốc của hệ thống, cột
 *               "Bản án sơ thẩm gốc (sheet 03)" ("Bản án số 2/2024/HS-ST ngày 1/8/2024"),
 *               "Tòa án", "Bị cáo", "Tội danh", "Điều luật", "Mã vụ án thực tế".
 *
 * Kết quả mong đợi suy ra từ đuôi ký hiệu bản án: HS→Hình sự, DS→Dân sự; ST→Sơ thẩm, PT→Phúc thẩm.
 * Đổi đường dẫn file qua QLA_TKM_FILE_INPUT / QLA_TKM_FILE_DOI_CHIEU.
 */
import path from 'path';
import { docSheetDau } from './xlsx';

export const FILE_INPUT = process.env.QLA_TKM_FILE_INPUT || path.resolve(__dirname, '../data/BAN_AN_SO_THAM_TOA_AN_GDT.xlsx');
export const FILE_DOI_CHIEU = process.env.QLA_TKM_FILE_DOI_CHIEU || path.resolve(__dirname, '../data/22A_BAN_AN_ST_TOA_AN_DATA.xlsx');

/**
 * File dữ liệu ghi tắt tên tòa, không khớp danh mục đơn vị của hệ thống nên không chọn/tra cứu được.
 * Đã kiểm chứng trên STG: bản án 34 ngày 25/03/2026 của "Tòa án nhân dân thành phố Hà Nội" (D01.131)
 * trả đúng vụ án VA26-002228 – Phan Văn Uy như file đối chiếu ghi, nên đây là cùng một tòa.
 * Chỉ thêm dòng vào bảng này khi đã kiểm chứng tương tự, không suy đoán theo tên.
 */
export const TEN_TOA_THEO_DANH_MUC: Record<string, string> = {
  'Tòa án TP Hà Nội': 'Tòa án nhân dân thành phố Hà Nội',
};

const LOAI_AN_THEO_KY_HIEU: Record<string, string> = { HS: 'Hình sự', DS: 'Dân sự' };
const CAP_XET_XU_THEO_KY_HIEU: Record<string, string> = { ST: 'Sơ thẩm', PT: 'Phúc thẩm' };

/**
 * Vụ nhận đơn tương ứng loại án — ĐÚNG như tài liệu "docs/stepdata/GDT-TT-bao-cao-thong-ke.txt"
 * Bước 2 mục 6 ghi: Hình sự → Vụ giám đốc kiểm tra về hình sự; Dân sự → Vụ giám đốc kiểm tra về dân sự.
 * Tài liệu KHÔNG nói loại án khác (kinh doanh thương mại, lao động…) chuyển về Vụ nào → không tự suy,
 * chờ nghiệp vụ bổ sung rồi mới thêm dòng vào đây.
 */
export const VU_NHAN_THEO_LOAI_AN: Record<string, string> = {
  'Hình sự': 'hình sự',
  'Dân sự': 'dân sự',
};

export interface BanAnSoTham {
  /** Số thứ tự dòng trong file đầu vào (dòng 1 là tiêu đề) */
  dong: number;
  /** 3 ô nhập trên màn hình (toaAn đã quy về đúng tên trong danh mục đơn vị) */
  soBanAn: string;
  ngayBanAn: string;
  toaAn: string;
  /** Tên tòa nguyên văn trong file đầu vào (khác toaAn khi file ghi tắt) */
  toaAnTrongFile: string;
  /** Suy ra từ ký hiệu bản án trong file đối chiếu */
  capXetXu: string;
  loaiAn: string;
  /** Kết quả mong đợi lấy từ file đối chiếu */
  biCao?: string;
  toiDanh?: string;
  dieuLuat?: string;
  maVuAn?: string;
  /** Quan hệ pháp luật của vụ sơ thẩm (án dân sự) — điền ô "Quan hệ pháp luật" của đơn */
  quanHePhapLuat?: string;
  /**
   * Ô "Thủ tục giải quyết" ở Bước 2: 'Giám đốc thẩm' hoặc 'Tái thẩm' (tài liệu Playwright nhập data
   * GDT-TT, Bước 2). Bỏ trống thì giữ giá trị màn tự fill sau khi tra cứu bản án.
   */
  thuTucGiaiQuyet?: string;
  /**
   * Cột "Người kháng nghị" trong file dữ liệu — dùng ở bước lập dự thảo kháng nghị, mỗi vụ một giá trị
   * (Chánh án TANDTC / Chánh án Tòa án có thẩm quyền / Viện trưởng Viện kiểm sát).
   */
  nguoiKhangNghi?: string;
  /** Nội dung nút [Gợi ý] sinh ra (ThongTinCVDonStep.handleGoiYNoiDung) */
  noiDungGoiY: string;
}

/** "1/8/2024" → "01/08/2024" (ô ngày trên form là dd/MM/yyyy) */
export const chuanNgay = (s: string) => {
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}` : String(s).trim();
};

/** "Bản án số 2/2024/HS-ST ngày 1/8/2024" → các phần */
const tachKyHieuBanAn = (s: string) => {
  const m = String(s).match(/số\s*([^/]+)\/(\d{4})\/([A-ZĐ]+)-([A-ZĐ]+)\s*ngày\s*([\d/]+)/i);
  return m ? { so: m[1].trim(), nam: m[2], loai: m[3].toUpperCase(), cap: m[4].toUpperCase(), ngay: chuanNgay(m[5]) } : null;
};

/** So sánh số bản án bỏ qua số 0 ở đầu ("02" ≡ "2"), vì file đầu vào giữ nguyên cách ghi của bản án */
const khoaBanAn = (so: string, ngay: string) => `${String(so).replace(/^0+(?=\d)/, '')}|${chuanNgay(ngay)}`;

export interface KetQuaDocDuLieu {
  ds: BanAnSoTham[];
  /** Chênh lệch giữa file đầu vào và file đối chiếu — ghi vào báo cáo, không tự suy đoán */
  lech: string[];
}

/** Đọc 2 file Excel, ghép đầu vào với dữ liệu đối chiếu */
export function docBanAnSoTham(): KetQuaDocDuLieu {
  const input = docSheetDau(FILE_INPUT);
  const doiChieu = docSheetDau(FILE_DOI_CHIEU);
  const tieuDe = doiChieu[0] || [];
  const cot = (ten: string) => tieuDe.findIndex(t => (t || '').trim() === ten);
  const iBanAn = cot('Bản án sơ thẩm gốc (sheet 03)');
  const iToa = cot('Tòa án');
  const iBiCao = cot('Bị cáo');
  const iToiDanh = cot('Tội danh');
  const iDieuLuat = cot('Điều luật');
  const iMaVuAn = cot('Mã vụ án thực tế');
  const lech: string[] = [];
  if (iBanAn < 0 || iToa < 0) {
    lech.push(`File đối chiếu thiếu cột "Bản án sơ thẩm gốc (sheet 03)" hoặc "Tòa án" (tiêu đề đọc được: ${tieuDe.join(' | ')})`);
  }

  const kho = new Map<string, { toa: string; loai: string; cap: string; biCao?: string; toiDanh?: string; dieuLuat?: string; maVuAn?: string }>();
  for (let i = 1; i < doiChieu.length && iBanAn >= 0; i++) {
    const t = tachKyHieuBanAn(doiChieu[i]?.[iBanAn] || '');
    if (!t) continue;
    kho.set(khoaBanAn(t.so, t.ngay), {
      toa: (doiChieu[i][iToa] || '').trim(),
      loai: t.loai,
      cap: t.cap,
      biCao: iBiCao >= 0 ? (doiChieu[i][iBiCao] || '').trim() : undefined,
      toiDanh: iToiDanh >= 0 ? (doiChieu[i][iToiDanh] || '').trim() : undefined,
      dieuLuat: iDieuLuat >= 0 ? (doiChieu[i][iDieuLuat] || '').trim() : undefined,
      maVuAn: iMaVuAn >= 0 ? (doiChieu[i][iMaVuAn] || '').trim() : undefined,
    });
  }

  const ds: BanAnSoTham[] = [];
  for (let i = 1; i < input.length; i++) {
    const [soBanAn, ngayRaw, toaAnTrongFile] = (input[i] || []).map(v => (v || '').trim());
    if (!soBanAn && !ngayRaw && !toaAnTrongFile) continue;
    const toaAn = TEN_TOA_THEO_DANH_MUC[toaAnTrongFile] || toaAnTrongFile;
    const ngayBanAn = chuanNgay(ngayRaw);
    const g = kho.get(khoaBanAn(soBanAn, ngayBanAn));
    if (!g) {
      lech.push(`Dòng ${i + 1} (${soBanAn} – ${ngayBanAn}): không có trong file đối chiếu → bỏ qua, không tự suy đoán loại án/cấp xét xử`);
      continue;
    }
    if (g.toa && toaAnTrongFile && g.toa !== toaAnTrongFile) {
      lech.push(`Dòng ${i + 1} (${soBanAn} – ${ngayBanAn}): Tòa án đầu vào "${toaAnTrongFile}" ≠ đối chiếu "${g.toa}"`);
    }
    const loaiAn = LOAI_AN_THEO_KY_HIEU[g.loai];
    const capXetXu = CAP_XET_XU_THEO_KY_HIEU[g.cap];
    if (!loaiAn || !capXetXu) {
      lech.push(`Dòng ${i + 1} (${soBanAn} – ${ngayBanAn}): ký hiệu "${g.loai}-${g.cap}" chưa có trong bảng quy đổi loại án/cấp xét xử`);
      continue;
    }
    ds.push({
      dong: i + 1,
      soBanAn,
      ngayBanAn,
      toaAn,
      toaAnTrongFile,
      capXetXu,
      loaiAn,
      biCao: g.biCao,
      toiDanh: g.toiDanh,
      dieuLuat: g.dieuLuat,
      maVuAn: g.maVuAn,
      // FE: `Khiếu nại ${loại QĐ/BA} số ${số} ngày ${ngày} của ${tên tòa}` (mặc định Loại QĐ/BA = Bản án)
      noiDungGoiY: `Khiếu nại Bản án số ${soBanAn} ngày ${ngayBanAn} của ${toaAn}`,
    });
  }
  return { ds, lech };
}

/**
 * Các dòng test sẽ chạy trên giao diện. Mặc định 1 dòng (chạy nhanh); đổi bằng:
 *   QLA_TKM_SO_DONG=3           → 3 dòng đầu
 *   QLA_TKM_DONG=2,5,25         → đúng các dòng Excel đó
 */
export function chonDongChay(ds: BanAnSoTham[]): BanAnSoTham[] {
  const chiDinh = (process.env.QLA_TKM_DONG || '').split(',').map(s => Number(s.trim())).filter(Boolean);
  if (chiDinh.length) return ds.filter(b => chiDinh.includes(b.dong));
  const soDong = Number(process.env.QLA_TKM_SO_DONG || 1);
  return ds.slice(0, Math.max(1, soDong));
}
