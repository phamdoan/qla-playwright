import fs from 'fs';
import path from 'path';
import type { TruongForm } from '../pages/base.page';
import { docBangExcel, docBangExcelSync, docKhoaGiaTriSync, ghiDongExcel } from './excel-helper';

const ROOT = path.resolve(__dirname, '../..');
export const OUTPUT_DIR = path.join(ROOT, 'output');
export const DATA_DIR = path.join(ROOT, 'src/data');

/** Lĩnh vực = tên thư mục cấp 1, dùng chung cho pages / tests / data / output */
export type LinhVuc =
  | '1-hinh-su'
  | '2-dan-su'
  | '3-hon-nhan-gia-dinh'
  | '4-kinh-doanh-thuong-mai'
  | '5-lao-dong'
  | '6-hanh-chinh'
  | '7-ap-dung-bien-phap-xu-ly-hanh-chinh'
  | '8-don-tu-phap'
  | '9-bao-cao-quoc-hoi'
  | '10-hoa-giai';

export interface CaseData {
  id: string;
  moTa: string;
  /** Số vụ án tạo cho case này (BCTK_SO_LUONG trong .env ghi đè) */
  soLuong?: number;
  truong: TruongForm[];
}

export interface FormData {
  linhVuc: LinhVuc;
  bieuMau: string;
  tenBieuMau: string;
  cases: CaseData[];
}

/**
 * Đọc data của biểu mẫu: ưu tiên src/data/<linhVuc>/data-form-<bieuMau>.xlsx, không có thì .json.
 *
 * File Excel gồm:
 *   · sheet "Thông tin": Khóa | Giá trị — "Lĩnh vực", "Biểu mẫu", "Tên biểu mẫu"
 *   · sheet "Cases": Case | Mô tả | Số lượng | Nhãn trường | Loại | Giá trị — mỗi dòng một trường;
 *     các dòng tiếp theo của cùng case để trống Case/Mô tả/Số lượng
 */
export function docData(linhVuc: LinhVuc, bieuMau: string): FormData {
  const xlsx = path.join(DATA_DIR, linhVuc, `data-form-${bieuMau}.xlsx`);
  if (fs.existsSync(xlsx)) {
    const tt = docKhoaGiaTriSync(xlsx, 'Thông tin');
    const cases: CaseData[] = [];
    for (const d of docBangExcelSync(xlsx, 'Cases')) {
      if (d['Case']) cases.push({ id: d['Case'], moTa: d['Mô tả'], soLuong: Number(d['Số lượng']) || 1, truong: [] });
      const c = cases[cases.length - 1];
      if (!c) throw new Error(`${xlsx}: dòng đầu sheet "Cases" phải có cột Case`);
      if (d['Nhãn trường']) {
        c.truong.push({ nhan: d['Nhãn trường'], loai: (d['Loại'] || undefined) as TruongForm['loai'], giaTri: d['Giá trị'] });
      }
    }
    return { linhVuc: (tt['Lĩnh vực'] || linhVuc) as LinhVuc, bieuMau: tt['Biểu mẫu'] || bieuMau, tenBieuMau: tt['Tên biểu mẫu'], cases };
  }
  const file = path.join(DATA_DIR, linhVuc, `data-form-${bieuMau}.json`);
  if (!fs.existsSync(file)) throw new Error(`Không tìm thấy file data: ${xlsx} (hoặc .json)`);
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as FormData;
}

/**
 * Mốc của lần chạy (vd. "2026-10-28_15-30-12"): playwright.config.ts đặt BCTK_LAN_CHAY cho cả lần chạy;
 * chạy ngoài Playwright (script lẻ) thì lấy thời điểm nạp module.
 */
const LAN_CHAY =
  process.env.BCTK_LAN_CHAY || new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(' ', '_').replace(/:/g, '-');

/**
 * output/<linhVuc>/<bieuMau>/output-ma-vu-an-form-<bieuMau>_<ngày>_<giờ>.xlsx — mỗi biểu mẫu một thư mục,
 * MỖI LẦN CHẠY MỘT FILE MỚI (tên theo lúc bắt đầu chạy); tạo thư mục nếu chưa có
 */
export function fileOutput(linhVuc: LinhVuc, bieuMau: string): string {
  const dir = path.join(OUTPUT_DIR, linhVuc, bieuMau);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `output-ma-vu-an-form-${bieuMau}_${LAN_CHAY}.xlsx`);
}

const thoiDiemHienTai = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

/** Ghi nối một mã vụ án vào file output của biểu mẫu (cột: Thời điểm | Case | Mã vụ án) */
export async function luuMaVuAn(linhVuc: LinhVuc, bieuMau: string, caseId: string, maVuAn: string) {
  await ghiDongExcel(fileOutput(linhVuc, bieuMau), ['Thời điểm', 'Case', 'Mã vụ án'], [[thoiDiemHienTai(), caseId, maVuAn]]);
}

/** Đọc file JSON trong src/data, vd. docJson('1-hinh-su/data-form-1B.json') */
export function docJson<T>(duongDan: string): T {
  const file = path.join(DATA_DIR, duongDan);
  if (!fs.existsSync(file)) throw new Error(`Không tìm thấy file: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
}

/** Các cột của file output — giống nhau ở mọi biểu mẫu */
const COT_KET_QUA = ['Thời điểm', 'Mã vụ án', 'Tòa giải quyết', 'Ngày bản án', 'Số bản án', 'Thẩm phán - Tài khoản', 'Ngày thụ lý', 'Link vụ án', 'Bước đã chạy đến'];

/** Một dòng file output (trừ "Thời điểm") — khung bước `chayBuoc` tính từ state và ghi sau mỗi bước */
export interface DongKetQua {
  maVuAn: string;
  toaGiaiQuyet: string;
  ngayBanAn: string;
  soBanAn: string;
  thamPhanTaiKhoan: string;
  ngayThuLy: string;
  linkVuAn: string;
  buocDaChay: string;
}

/**
 * Ghi dòng của một vụ vào file output của lần chạy, MỖI VỤ MỘT DÒNG (khóa "Mã vụ án"): bước sau cập nhật chính dòng đó.
 * @param oVuAn tên ô của vụ (Vụ 01, Đơn 01…) — cột "Mã vụ án" ghi tên ô cho tới khi vụ có mã thật, nên vẫn tìm được dòng cũ
 * @param soLanThu số lần thử khi file đang mở trong Excel, mỗi lần cách 5s
 */
export async function luuDongKetQua(linhVuc: LinhVuc, bieuMau: string, d: DongKetQua, oVuAn: string, soLanThu?: number) {
  await ghiDongExcel(
    fileOutput(linhVuc, bieuMau),
    COT_KET_QUA,
    [[thoiDiemHienTai(), d.maVuAn, d.toaGiaiQuyet, d.ngayBanAn, d.soBanAn, d.thamPhanTaiKhoan, d.ngayThuLy, d.linkVuAn, d.buocDaChay]],
    'Mã vụ án',
    [oVuAn],
    soLanThu,
  );
}

/** Đọc lại các mã vụ án đã lưu (cột "Mã vụ án", hoặc cột cuối nếu không có) */
export async function docMaVuAn(linhVuc: LinhVuc, bieuMau: string): Promise<string[]> {
  const file = fileOutput(linhVuc, bieuMau);
  if (!fs.existsSync(file)) return [];
  return (await docBangExcel(file)).map(d => d['Mã vụ án'] ?? Object.values(d).pop() ?? '').filter(Boolean);
}
