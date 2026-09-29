import { Locator, Page, expect } from '@playwright/test';
import path from 'path';
import { choHetSpin, chonNgay, chonSelect, chonTreeSelect, ghiNhanToast, go, hienTrong, nghi, toast, toastDaHien } from '../common/antd';
import { NguoiGia, ddmmyyyy, nguoiNgauNhien, soBanAn, soNgau, truocNgay } from '../common/du-lieu';
import { DiaChiDayDu, NguoiDayDu, PhapNhanDayDu, dienFormNguoi, dienNguoiDayDu, dienPhapNhanDayDu } from '../common/form-nguoi';
import { moMenu } from '../common/menu';

/** File trong bộ nhớ cho setInputFiles */
export interface FilePayload {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

/**
 * Màn Thêm mới Đơn đề nghị GĐT/TT (qla-webapp: pages/QuanLyDon/ThemMoiDon, OCRDon).
 * Form chính không có `name` → id antd = đường dẫn field nối "_" (vd. #thongTinBanAn_soBanAnQd);
 * form trong modal/drawer cũng không có `name` → id là tên field trần (vd. #soThongBao, #conNguoi_hoTen).
 */

/** File đơn PDF đưa vào OCR (bắt buộc khi thêm mới đơn) */
export const FILE_DON = process.env.QLA_FILE_DON || path.resolve(__dirname, '../data/BanAn_A.pdf');

/** OCR mất vài phút; FE tự dừng sau 15 phút (OCR_POLL_TIMEOUT_MS) */
const CHO_OCR_MS = 16 * 60_000;
/** Toast lỗi trên màn them-moi-tu-ocr (vd. ocrId hết hạn → 404) */
const LOI_OCR = /Request failed|thất bại|Quá thời gian|Có lỗi|huỷ phiên/;

export interface ThongTinDon {
  nguoi: NguoiGia;
  ngayToaNhan: string;
  ngayDauBuuDien: string;
  ngayGhiTrenDon: string;
  /** Phúc thẩm: để khối "Danh sách bản án/quyết định liên quan" cho thêm bản án sơ thẩm */
  capXetXu: string;
  soBanAn: string;
  ngayBanAn: string;
  loaiAn: string;
  /** Tư cách tố tụng của người đứng đơn (Dân sự: Nguyên đơn; Hình sự: Bị cáo) */
  tuCach: string;
  /** Từ khoá chọn "Đơn vị chuyển đến" (Vụ GĐKT nhận đơn); bỏ trống → chọn mục đầu tiên */
  donViChuyenDen?: string;
  /** Từ khoá tìm tòa (TreeSelect); không khớp thì chọn tòa đầu tiên */
  toaAn: string;
  tinh: string;
  /** Tên Phường/Xã (đúng nhãn danh mục); bỏ trống → chọn mục đầu tiên */
  phuongXa?: string;
  /** Nội dung đơn theo tên tòa đang chọn; bỏ trống → mẫu mặc định */
  noiDung?: (tenToa: string) => string;
  /** Ghi chú; bỏ trống → mẫu mặc định */
  ghiChu?: string;
  soDen: string;
  maBiThu: string;
  banAnSoTham: { so: string; ngay: string };
  ketQua: { loai: string; so: string; ngay: string };
  donThuLyKem: { soDen: string; ngayNhan: string; ngayGhi: string };
  quanHePhapLuat: string;
  biDon: NguoiGia;
  nguoiLienQuan: NguoiGia;
}

/** Loại án: quyết định tư cách tố tụng, ký hiệu bản án và Vụ nhận đơn */
export const LOAI_AN = {
  DAN_SU: { loaiAn: 'Dân sự', tuCach: 'Nguyên đơn', kyHieu: 'DS', tenAn: 'dân sự', donViChuyenDen: undefined },
  HINH_SU: { loaiAn: 'Hình sự', tuCach: 'Bị cáo', kyHieu: 'HS', tenAn: 'hình sự', donViChuyenDen: 'hình sự' },
} as const;
export type LoaiAn = keyof typeof LOAI_AN;

export function taoThongTinDon(nguoi: NguoiGia, loai: LoaiAn = 'DAN_SU'): ThongTinDon {
  const la = LOAI_AN[loai];
  const ngayBanAn = truocNgay(120);
  const ngaySoTham = truocNgay(300);
  return {
    nguoi,
    ngayToaNhan: ddmmyyyy(new Date()),
    ngayDauBuuDien: ddmmyyyy(truocNgay(3)),
    ngayGhiTrenDon: ddmmyyyy(truocNgay(7)),
    capXetXu: 'Phúc thẩm',
    soBanAn: soBanAn(ngayBanAn.getFullYear(), `${la.kyHieu}-PT`),
    ngayBanAn: ddmmyyyy(ngayBanAn),
    loaiAn: la.loaiAn,
    tuCach: la.tuCach,
    donViChuyenDen: la.donViChuyenDen,
    toaAn: process.env.QLA_TOA_AN || 'thành phố Hà Nội',
    tinh: process.env.QLA_TINH || 'Hà Nội',
    soDen: soNgau(4),
    maBiThu: `BT${soNgau(6)}`,
    banAnSoTham: { so: soBanAn(ngaySoTham.getFullYear(), `${la.kyHieu}-ST`), ngay: ddmmyyyy(ngaySoTham) },
    ketQua: { loai: 'Thông báo trả lời đơn', so: `${soNgau(3)}/TB-TA`, ngay: ddmmyyyy(truocNgay(30)) },
    donThuLyKem: { soDen: soNgau(4), ngayNhan: ddmmyyyy(truocNgay(2)), ngayGhi: ddmmyyyy(truocNgay(10)) },
    quanHePhapLuat: 'Tranh chấp hợp đồng vay tài sản',
    biDon: nguoiNgauNhien(),
    nguoiLienQuan: nguoiNgauNhien(),
  };
}

type KieuTruong = 'text' | 'ngay' | 'select' | 'tree';

/** Một trường trên form chính: cách tìm, kiểu control, cách điền */
interface Truong {
  ten: string;
  o: (page: Page) => Locator;
  kieu: KieuTruong;
  dien: (page: Page, o: Locator, d: ThongTinDon) => Promise<unknown>;
}

const theoId = (ten: string) => (page: Page) => page.locator(`#${ten}`);
/** Field người đứng đơn thứ nhất: …dsNguoiDungDon_0_<field> */
const nguoiDungDon = (field: string) => (page: Page) => page.locator(`[id$="dsNguoiDungDon_0_${field}"]`).first();

const text = (ten: string, o: Truong['o'], gt: (d: ThongTinDon) => string): Truong => ({
  ten, o, kieu: 'text', dien: (_p, l, d) => go(l, gt(d)),
});
const ngay = (ten: string, o: Truong['o'], gt: (d: ThongTinDon) => string): Truong => ({
  ten, o, kieu: 'ngay', dien: (_p, l, d) => chonNgay(l, gt(d)),
});
const select = (ten: string, o: Truong['o'], gt?: (d: ThongTinDon) => string): Truong => ({
  ten, o, kieu: 'select', dien: (p, l, d) => chonSelect(p, l, gt?.(d)),
});

/** Khung .ant-select bao ngoài ô input (đi ngược lên từ input, dùng được cả khi input nằm trong modal/drawer) */
const khungSelect = (_page: Page, input: Locator) =>
  input.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');

/** Nhãn đang hiển thị của Select/TreeSelect ('' nếu chưa chọn) */
const nhanSelect = async (page: Page, input: Locator) => {
  const item = khungSelect(page, input).locator('.ant-select-selection-item');
  if ((await item.count()) === 0) return '';
  return ((await item.first().getAttribute('title')) || (await item.first().innerText())).trim();
};

/** Tên tòa đang chọn ở "Tòa án ra bản án" (OCR điền hoặc test chọn) */
const tenToaDangChon = (page: Page) => nhanSelect(page, page.locator('#thongTinBanAn_maToaXetXu'));

/**
 * Các trường trên form chính theo thứ tự hiển thị (bắt buộc + nên có).
 * Nguồn: ThemMoiDon/components/Steps/*, Common/NguoiDungDonTable.tsx
 */
const TRUONG: Truong[] = [
  // Thông tin chung (Hình thức nhận mặc định "Trực tiếp" → bắt buộc Ngày trên dấu bưu điện)
  text('Số đến', theoId('thongTinChiTietDon_soHieuDon'), d => d.soDen),
  ngay('Ngày tòa nhận', theoId('thongTinChiTietDon_ngayTiepNhan'), d => d.ngayToaNhan),
  ngay('Ngày ghi trên đơn', theoId('thongTinChiTietDon_ngayLamDon'), d => d.ngayGhiTrenDon),
  text('Mã bì thư', theoId('thongTinChiTietDon_maBiThu'), d => d.maBiThu),
  ngay('Ngày trên dấu bưu điện', theoId('thongTinChiTietDon_ngayTheoDauBuuDien'), d => d.ngayDauBuuDien),
  text('Người gửi/ Đơn vị gửi', theoId('thongTinChiTietDon_nguoiGuiDon'), d => d.nguoi.hoTen),
  text('Số điện thoại người gửi', theoId('thongTinChiTietDon_soDienThoaiNguoiGui'), d => d.nguoi.sdt),
  // Thông tin bản án đề nghị (Loại QĐ/BA = Bản án: mặc định; Cấp xét xử đặt riêng ở datCapXetXu)
  select('Loại án', theoId('thongTinChuyenDonVO_loaiVuAn'), d => d.loaiAn),
  text('Số bản án', theoId('thongTinBanAn_soBanAnQd'), d => d.soBanAn),
  ngay('Ngày bản án', theoId('thongTinBanAn_ngayBanAnQd'), d => d.ngayBanAn),
  { ten: 'Tòa án ra bản án', o: theoId('thongTinBanAn_maToaXetXu'), kieu: 'tree', dien: (p, l, d) => chonTreeSelect(p, l, d.toaAn) },
  // Thông tin đơn – người đứng đơn
  select('Tư cách tố tụng', nguoiDungDon('loaiConNguoi'), d => d.tuCach),
  text('Họ và tên', nguoiDungDon('tenDoiTuongLienQuan'), d => d.nguoi.hoTen),
  select('Giới tính', nguoiDungDon('gioiTinh'), d => d.nguoi.gioiTinh),
  text('Ngày sinh', nguoiDungDon('ngaySinh'), d => d.nguoi.ngaySinh),
  text('Số CCCD', nguoiDungDon('soCccd'), d => d.nguoi.cccd),
  text('Số điện thoại', nguoiDungDon('sdt'), d => d.nguoi.sdt),
  // Địa chỉ liên lạc: Phường/Xã chỉ bật sau khi tải xong danh sách theo Tỉnh
  select('Tỉnh/Thành phố', theoId('thongTinChiTietDon_diaChiLienLac_maTinh'), d => d.tinh),
  select('Phường/Xã', theoId('thongTinChiTietDon_diaChiLienLac_maXa'), d => d.phuongXa ?? ''),
  text('Địa chỉ liên hệ', theoId('thongTinChiTietDon_diaChiLienLac_diaChi'), d => d.nguoi.diaChi),
  {
    ten: 'Nội dung đơn',
    o: theoId('thongTinChiTietDon_noiDung'),
    kieu: 'text',
    dien: async (p, l, d) => {
      const tenToa = (await tenToaDangChon(p)) || 'Tòa án nhân dân';
      return go(
        l,
        d.noiDung?.(tenToa) ??
          `Đề nghị xem xét theo thủ tục giám đốc thẩm đối với Bản án ${d.loaiAn.toLowerCase()} phúc thẩm số ${d.soBanAn} ngày ${d.ngayBanAn} ` +
            `của ${tenToa}, vì bản án đã đánh giá chứng cứ không khách quan, ` +
            'gây thiệt hại đến quyền lợi hợp pháp của tôi.',
      );
    },
  },
  text('Ghi chú', theoId('thongTinChiTietDon_ghiChu'), d => d.ghiChu ?? 'Đương sự nộp kèm bản sao bản án và giấy tờ tùy thân.'),
  // Xử lý đơn (Nơi chuyển đến = Nội bộ, Trạng thái = Đơn đủ điều kiện, Thụ lý mới: mặc định)
  select('Đơn vị chuyển đến', theoId('thongTinChuyenDonVO_maDonViChuyenDenNoiBo'), d => d.donViChuyenDen ?? ''),
  // Người tham gia tố tụng
  text('Quan hệ pháp luật', theoId('nguoiLienQuan_noiDungQuanHePhapLuat'), d => d.quanHePhapLuat),
];

/** Các trường chụp lại trước khi lưu để so sau khi mở lại đơn */
const TRUONG_KIEM_TRA: Truong[] = [
  select('Cấp xét xử', theoId('thongTinBanAn_capXetXu')),
  select('Loại QĐ/BA', theoId('thongTinBanAn_loaiQdBa')),
  select('Thủ tục giải quyết', theoId('thongTinBanAn_thuTucGiaiQuyet')),
  select('Hình thức nhận', theoId('thongTinChiTietDon_hinhThucNhan')),
  ...TRUONG,
];

async function docGiaTri(page: Page, t: Truong, o: Locator) {
  return t.kieu === 'select' || t.kieu === 'tree' ? nhanSelect(page, o) : (await o.inputValue()).trim();
}

/** Trường đang báo lỗi validate? */
const dangLoi = async (_page: Page, o: Locator) =>
  (await o.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-form-item-has-error ")]').count()) > 0;

const hienThi = async (o: Locator) => (await o.count()) > 0 && (await o.isVisible());

/** Modal/Drawer đang mở theo tiêu đề */
const modal = (page: Page, tieuDe: string) =>
  page.locator('.ant-modal-wrap:visible .ant-modal').filter({ has: page.locator('.ant-modal-title', { hasText: tieuDe }) });
const drawer = (page: Page, tieuDe: string) =>
  page.locator('.ant-drawer-content').filter({ has: page.locator('.ant-drawer-title', { hasText: tieuDe }) });

/** Tiêu đề bảng (ProTable headerTitle hoặc CollapsibleTableWrapper) */
const tieuDeBang = (page: Page, tieuDe: string) =>
  page.locator('.ant-pro-table-list-toolbar-title').filter({ hasText: tieuDe }).first();

/** CollapsibleTableWrapper đóng khi bảng rỗng → bấm tiêu đề để mở; trả về khung bao (tiêu đề + bảng) */
async function moBangThuGon(page: Page, tieuDe: string) {
  const td = tieuDeBang(page, tieuDe);
  await td.scrollIntoViewIfNeeded();
  if ((await td.locator('.anticon-right').count()) > 0) {
    await td.click();
    await nghi(page);
  }
  return td.locator('xpath=..');
}

/** Nút "Thêm mới" gần nhất với tiêu đề bảng ProTable (các bảng Người tham gia tố tụng) */
const nutThemMoiCuaBang = (page: Page, tieuDe: string) =>
  tieuDeBang(page, tieuDe)
    .locator('xpath=ancestor::div[.//button[contains(normalize-space(.),"Thêm mới")]][1]')
    .getByRole('button', { name: /Thêm mới$/ })
    .first();

export interface KetQuaKiemTra {
  truong: { ten: string; truoc: string; sau: string }[];
  bang: { ten: string; canCo: string; co: boolean }[];
}

/**
 * Chọn Tỉnh rồi Phường/Xã: danh sách xã nạp theo tỉnh, đổi tỉnh mà danh sách cũ chưa thay thì chọn lại tỉnh và thử lại.
 */
async function chonTinhXa(page: Page, oTinh: Locator, oXa: Locator, tinh: string, xa?: string, opt?: { goDeLoc?: boolean }) {
  await chonSelect(page, oTinh, tinh, opt);
  for (let lan = 0; ; lan++) {
    try {
      await chonSelect(page, oXa, xa, opt);
      return;
    } catch (e) {
      if (lan >= 1) throw e;
      await chonSelect(page, oTinh, tinh, opt);
      await nghi(page, 800, 1200);
    }
  }
}

export class ThemMoiDonPage {
  /** Giá trị các trường chụp ngay trước khi lưu */
  private giaTriTruocLuu = new Map<string, string>();
  /** Nội dung phải thấy trong các bảng sau khi mở lại đơn */
  private bangCanCo: { ten: string; canCo: string }[] = [];

  constructor(readonly page: Page) {}

  // ───────────────────────────── Mở màn & OCR ─────────────────────────────

  /**
   * Danh sách đơn → bấm "Thêm mới" → màn Thêm mới Đơn đề nghị GĐT/TT.
   * `quaMenu`: mở Danh sách đơn bằng menu trái như người dùng thay vì vào thẳng URL.
   */
  /**
   * BƯỚC 0 (nghiệp vụ chốt 29/09/2026): trước khi tạo đơn, tìm ở "Quản lý đơn › Danh sách đơn" xem bản
   * án này ĐÃ CÓ đơn chưa — lọc theo Số BA/QĐ + Ngày BA/QĐ + Tòa ra BA/QĐ.
   *
   * Vì sao: tạo thêm đơn cho bản án đã có đơn thì đơn mới thành ĐƠN PHỤ (DON.IS_DON_CHINH = 0) của
   * cùng một vụ án, mà các màn GĐT/TT (Nhận đơn và TL vụ án, Phân công TTV…) CHỈ hiện đơn chính — nên
   * về sau không tìm thấy đơn vừa tạo. Ví dụ trên STG: bản án 3 – 24/09/2026 – TAND TP Hải Phòng có
   * đơn chính 9870 (về Vụ dân sự D01.107, đã phân công TTV), còn 10234/10185/10146 là đơn phụ nằm ở
   * D01.106 và D01.108.
   *
   * Trả về mã đơn đã có (nếu tìm thấy) để luồng dùng lại thay vì tạo thêm.
   */
  async timDonDaCoTheoBanAn(b: { soBanAn: string; ngayBanAn?: string; toaAn?: string }): Promise<string | undefined> {
    const { page } = this;
    await moMenu(page, ['Quản lý đơn', 'Danh sách đơn']);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await choHetSpin(page);

    const oSo = page.getByLabel(/^Số BA\/QĐ$/).first();
    if (!(await hienTrong(oSo, 10_000))) {
      console.log('    · Bước 0: màn Danh sách đơn không có ô lọc "Số BA/QĐ" → bỏ qua kiểm tra trùng đơn');
      return undefined;
    }
    await go(oSo, b.soBanAn);
    if (b.ngayBanAn) {
      const oNgay = page.getByLabel(/^Ngày BA\/QĐ$/).first();
      if (await hienTrong(oNgay, 5_000)) {
        const laKhoang = await oNgay.evaluate(el => !!el.closest('.ant-picker-range')).catch(() => false);
        await oNgay.click();
        await oNgay.fill(b.ngayBanAn);
        await page.keyboard.press('Enter');
        if (laKhoang) {
          await nghi(page, 400, 800);
          await page.keyboard.type(b.ngayBanAn);
          await page.keyboard.press('Enter');
        }
        await page.keyboard.press('Escape');
      }
    }
    if (b.toaAn) {
      const oToa = page.getByLabel(/^Tòa ra BA\/QĐ$/).first();
      if (await hienTrong(oToa, 5_000)) await chonSelect(page, oToa, b.toaAn, { goDeLoc: true }).catch(() => undefined);
    }
    const nut = page.getByRole('button', { name: /Tìm kiếm$/ }).first();
    if (await hienTrong(nut, 5_000)) {
      await nut.click();
      await choHetSpin(page);
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await nghi(page, 1200, 2000);
    }
    const dong = page.locator('.ant-table-row:visible').first();
    if (!(await hienTrong(dong, 8_000))) return undefined;
    const chu = (await dong.innerText()).replace(/\s+/g, ' ').trim();
    const maDon = /Mã đơn:\s*(\d+)/.exec(chu)?.[1];
    console.log(
      `    · Bước 0: bản án ${b.soBanAn}${b.ngayBanAn ? ' ngày ' + b.ngayBanAn : ''} ĐÃ CÓ đơn` +
        `${maDon ? ' (mã ' + maDon + ')' : ''} → tạo thêm sẽ thành đơn phụ. ${chu.slice(0, 160)}`,
    );
    return maDon || '(không đọc được mã đơn)';
  }

  async moTuDanhSachDon({ quaMenu = false }: { quaMenu?: boolean } = {}) {
    const { page } = this;
    await ghiNhanToast(page);
    if (quaMenu) await moMenu(page, ['Quản lý đơn', 'Danh sách đơn']);
    else await page.goto('quan-ly-don/danh-sach-don');
    // Nút có icon nên accessible name là "plus Thêm mới"
    const nut = page.getByRole('button', { name: /Thêm mới$/ });
    await expect(nut).toBeVisible({ timeout: 60_000 });
    await nghi(page, 500, 1000);
    await nut.click();
    await page.waitForURL(/\/quan-ly-don\/them-moi$/);
    await expect(page.getByText('Thêm mới Đơn đề nghị GĐT/TT')).toBeVisible({ timeout: 60_000 });
  }

  /**
   * Popup "Tải lên tài liệu" tự mở khi vào màn → chọn file (Tên tài liệu tự lấy theo tên file, hoặc gõ `tenTaiLieu`) → "Tải lên".
   * `file`: đường dẫn hoặc nội dung file trong bộ nhớ (vd. PDF đơn sinh riêng cho từng hồ sơ).
   */
  async taiLenFileDon(file: string | FilePayload = FILE_DON, tenTaiLieu?: string, vanBan?: { so: string; ngay: string }) {
    const { page } = this;
    const m = modal(page, 'Tải lên tài liệu');
    await expect(m).toBeVisible({ timeout: 60_000 });
    await nghi(page, 500, 1000);
    await m.locator('input[type=file]').setInputFiles(file);
    await expect(m.locator('#tenTaiLieu')).not.toHaveValue('');
    if (tenTaiLieu) await go(m.locator('#tenTaiLieu'), tenTaiLieu);
    if (vanBan) {
      await go(m.getByRole('textbox', { name: 'Số văn bản' }), vanBan.so);
      await chonNgay(m.getByRole('textbox', { name: 'Ngày văn bản' }), vanBan.ngay);
    }
    await nghi(page, 500, 1000);
    await m.getByRole('button', { name: 'Tải lên' }).click();
  }

  /**
   * Nhập đơn thủ công, KHÔNG OCR: popup "Xác nhận xử lý OCR" → "Quay lại".
   * FE (useOcrDonStepper.handleCancelOcr) giữ file vừa tải làm tài liệu đơn, ở lại màn /them-moi để nhập tay;
   * file được lưu vào hồ sơ số hoá sau khi "Lưu thông tin".
   */
  async boQuaOcr() {
    const { page } = this;
    const ocr = modal(page, 'Xác nhận xử lý OCR');
    await expect(ocr).toBeVisible({ timeout: 30_000 });
    await nghi(page, 500, 1000);
    await ocr.getByRole('button', { name: 'Quay lại' }).click();
    await expect(ocr).toBeHidden({ timeout: 15_000 });
    await expect(page, 'Bỏ qua OCR nhưng màn hình vẫn chuyển sang luồng OCR').toHaveURL(/\/quan-ly-don\/them-moi$/);
    await expect(page.getByText('Thêm mới Đơn đề nghị GĐT/TT')).toBeVisible({ timeout: 30_000 });
  }

  /** "Xác nhận xử lý OCR" → "Bắt đầu OCR" → chờ "Bóc tách thành công" → "Lấy thông tin" → màn them-moi-tu-ocr */
  async ocrVaLayThongTin() {
    const { page } = this;
    const ocr = page.locator('.ant-modal').filter({ has: page.getByRole('button', { name: /Bắt đầu OCR|Lấy thông tin|Thử lại/ }) });
    await expect(ocr.getByText('Xác nhận xử lý OCR')).toBeVisible({ timeout: 30_000 });
    await nghi(page, 500, 1000);
    await ocr.getByRole('button', { name: 'Bắt đầu OCR' }).click();

    const thanhCong = ocr.getByText('Bóc tách thành công', { exact: true });
    const thatBai = ocr.getByText('Bóc tách dữ liệu thất bại');
    await expect(thanhCong.or(thatBai)).toBeVisible({ timeout: CHO_OCR_MS });
    if (await thatBai.isVisible()) {
      throw new Error(`OCR thất bại: ${(await ocr.locator('.ant-alert').innerText()).replace(/\s+/g, ' ')}`);
    }

    await nghi(page, 500, 1000);
    // Form được đổ dữ liệu OCR sau toast này (useOcrDonSession) + API lấy kết quả OCR (useOcrDonStepper)
    await ocr.getByRole('button', { name: 'Lấy thông tin' }).click();
    await page.waitForURL(/\/quan-ly-don\/them-moi-tu-ocr\?ocrId=/, { timeout: 60_000 });
    await toastDaHien(page, 'Nhận dạng và bóc tách dữ liệu đơn thành công', CHO_OCR_MS, LOI_OCR);
    await this.choFormOcr();
  }

  /** Gỡ lỗi: mở thẳng màn them-moi-tu-ocr với kết quả OCR đã có (QLA_OCR_ID) */
  async moKetQuaOcr(ocrId: string) {
    const { page } = this;
    await ghiNhanToast(page);
    await page.goto(`quan-ly-don/them-moi-tu-ocr?ocrId=${ocrId}`);
    await toastDaHien(page, 'Nhận dạng và bóc tách dữ liệu đơn thành công', CHO_OCR_MS, LOI_OCR);
    await this.choFormOcr();
  }

  private async choFormOcr() {
    const { page } = this;
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await expect(page.locator('.don-stepper-spin .ant-spin-spinning')).toHaveCount(0, { timeout: 60_000 });
    await nghi(page, 1500, 2500);
  }

  // ───────────────────────────── Form chính ─────────────────────────────

  /** Cấp xét xử phải đặt trước Tòa án (danh sách tòa lọc theo cấp) và trước Tra cứu */
  async datCapXetXu(d: ThongTinDon) {
    const o = this.page.locator('#thongTinBanAn_capXetXu');
    if ((await nhanSelect(this.page, o)) !== d.capXetXu) await chonSelect(this.page, o, d.capXetXu);
  }

  /**
   * Ép các trường quyết định luồng nghiệp vụ, không tin giá trị OCR điền sẵn:
   * Loại án (quyết định Vụ GĐKT nhận đơn), Tư cách tố tụng, Đơn vị chuyển đến.
   * Loại án phải đặt trước dienTruongThieu (đổi Loại án làm đổi danh sách tư cách tố tụng).
   */
  async datLoaiAn(d: ThongTinDon) {
    const { page } = this;
    const o = page.locator('#thongTinChuyenDonVO_loaiVuAn');
    if ((await nhanSelect(page, o)) !== d.loaiAn) await chonSelect(page, o, d.loaiAn);
  }

  /** Hình thức nhận (mặc định "Trực tiếp") */
  async datHinhThucNhan(nhan: string) {
    const o = this.page.locator('#thongTinChiTietDon_hinhThucNhan');
    if ((await nhanSelect(this.page, o)) !== nhan) await chonSelect(this.page, o, nhan);
  }

  /**
   * Địa chỉ liên lạc: Tỉnh → chờ Phường/Xã tải xong theo Tỉnh (chonSelect chờ hết disabled) → Phường/Xã.
   * Điền trước dienTruongThieu vì dienTruongThieu bỏ qua ô Phường/Xã khi danh sách chưa tải xong.
   */
  async datDiaChiLienLac(d: ThongTinDon) {
    const { page } = this;
    await chonTinhXa(page, page.locator('#thongTinChiTietDon_diaChiLienLac_maTinh'), page.locator('#thongTinChiTietDon_diaChiLienLac_maXa'), d.tinh, d.phuongXa);
  }

  /**
   * Thông tin chung → Địa chỉ bì thư: Tỉnh → Phường/Xã → Địa chỉ bì thư.
   * Ô chọn của khối này bị render lại khi gõ lọc (mất ký tự cuối, dropdown tự đóng) → mở danh sách và cuộn tới mục cần chọn.
   */
  async datDiaChiBiThu(dc: DiaChiDayDu) {
    const { page } = this;
    await chonTinhXa(page, page.locator('#thongTinChiTietDon_diaChiBiThu_maTinh'), page.locator('#thongTinChiTietDon_diaChiBiThu_maXa'), dc.tinh, dc.xa, { goDeLoc: false });
    await go(page.locator('#thongTinChiTietDon_diaChiBiThu_diaChi'), dc.soNha);
  }

  /** Thông tin đơn → nút "Sửa" cạnh người đứng đơn → Drawer "Sửa người đứng đơn" → nhập đầy đủ → Lưu */
  async suaNguoiDungDonDayDu(n: NguoiDayDu, tuCach: string) {
    const { page } = this;
    await page.getByRole('button', { name: /^edit Sửa$/ }).first().click();
    await dienNguoiDayDu(page, drawer(page, 'Sửa người đứng đơn'), n, tuCach);
  }

  /**
   * Bảng người tham gia tố tụng → Thêm mới → Drawer → nhập đầy đủ cá nhân hoặc cơ quan/tổ chức → Lưu.
   * Kiểm tra bảng đã có dòng mang tên vừa thêm.
   */
  async themDuongSuDayDu(
    tieuDeBang: string,
    tieuDeDrawer: string,
    ai: { nguoi: NguoiDayDu } | { phapNhan: PhapNhanDayDu },
    tuCach?: string,
    toiDanh?: string,
  ) {
    const { page } = this;
    await nutThemMoiCuaBang(page, tieuDeBang).click();
    const dr = drawer(page, tieuDeDrawer);
    const ten = 'nguoi' in ai ? ai.nguoi.hoTen : ai.phapNhan.ten;
    if ('nguoi' in ai) await dienNguoiDayDu(page, dr, ai.nguoi, tuCach, toiDanh);
    else await dienPhapNhanDayDu(page, dr, ai.phapNhan, tuCach);
    await expect(tieuDeBang_(page, tieuDeBang)).toContainText(ten);
    this.bangCanCo.push({ ten: tieuDeBang, canCo: ten });
  }

  /** Án hình sự: bảng "Thông tin khiếu nại" → Thêm mới → chọn người khiếu nại / người được khiếu nại → nội dung → Thêm */
  async themThongTinKhieuNai(nguoiKhieuNai: string, nguoiDuocKhieuNai: string | undefined, noiDung: string): Promise<boolean> {
    const { page } = this;
    await nutThemMoiCuaBang(page, 'Thông tin khiếu nại').click();
    const m = modal(page, 'Thêm thông tin khiếu nại');
    await expect(m).toBeVisible();
    await chonSelect(page, m.locator('#idDoiTuongChinh'), nguoiKhieuNai, { goDeLoc: false });
    // Bỏ trống → lấy người đầu tiên còn lại trong đơn. Đơn chỉ có đúng một người (không tra ra bản án cũ)
    // thì danh sách "Người được khiếu nại" rỗng → đóng modal, báo về để test ghi nhận thay vì hỏng luồng.
    try {
      await chonSelect(page, m.locator('#idDoiTuongLienQuan'), nguoiDuocKhieuNai, { goDeLoc: false });
    } catch (loi) {
      if (nguoiDuocKhieuNai) throw loi;
      await page.keyboard.press('Escape');
      await nghi(page, 600, 1000);
      // Escape thường đã đóng modal; bấm tiếp nút Hủy lúc modal đang trượt ra sẽ treo ("element is not stable")
      if (await m.isHidden().catch(() => true)) return false;
      const huy = m.getByRole('button', { name: /^(Hủy|Huỷ|Đóng)$/ });
      if (await hienTrong(huy, 3_000)) await huy.first().click();
      else await m.locator('.ant-modal-close').first().click();
      await expect(m).toBeHidden({ timeout: 15_000 });
      return false;
    }
    await go(m.locator('#noiDung'), noiDung);
    await m.getByRole('button', { name: /^Thêm$/ }).click();
    await expect(m).toBeHidden();
    await expect(tieuDeBang_(page, 'Thông tin khiếu nại')).toContainText(nguoiKhieuNai);
    return true;
  }

  /** Xử lý đơn → "Chuyển đến Vụ trưởng" (hiện sau khi chọn Đơn vị chuyển đến): chọn Vụ trưởng theo danh sách của hệ thống */
  async chonVuTruongNhan() {
    const { page } = this;
    const o = page.locator('#thongTinChuyenDonVO_chuyenDenCaNhan');
    // Ô hiện ra sau khi FE tải danh sách Vụ trưởng theo Đơn vị chuyển đến
    if (!(await hienTrong(o, 3_000)) || !(await o.isEnabled()) || (await nhanSelect(page, o))) return '';
    return chonSelect(page, o);
  }

  async datTuCachVaDonViNhan(d: ThongTinDon) {
    const { page } = this;
    const tuCach = nguoiDungDon('loaiConNguoi')(page);
    if ((await hienThi(tuCach)) && (await nhanSelect(page, tuCach)) !== d.tuCach) await chonSelect(page, tuCach, d.tuCach);
    const donVi = page.locator('#thongTinChuyenDonVO_maDonViChuyenDenNoiBo');
    if (d.donViChuyenDen && (await hienThi(donVi))) {
      const hienTai = await nhanSelect(page, donVi);
      if (!hienTai.toLowerCase().includes(d.donViChuyenDen.toLowerCase())) await chonSelect(page, donVi, d.donViChuyenDen);
    }

    // "Thụ lý đơn" phải là "Thụ lý mới": đơn không thụ lý (TRANG_THAI_THU_LY_DON = KHONG, không có số thụ lý)
    // sẽ không hiện ở Phân công thẩm phán và bộ lọc "Tờ trình phân công thẩm phán" (DonServiceImpl: case TO_TRINH)
    const thuLy = page.locator('#thongTinChuyenDonVO_trangThaiThuLyDon');
    if (await hienThi(thuLy)) {
      if (!(await nhanSelect(page, thuLy)).includes('Thụ lý mới')) await chonSelect(page, thuLy, 'Thụ lý mới');
      const ngayThuLy = page.locator('#thongTinChuyenDonVO_ngayThuLy');
      if ((await hienThi(ngayThuLy)) && !(await ngayThuLy.inputValue())) {
        await chonNgay(ngayThuLy, ddmmyyyy(new Date()));
      }
    }
  }

  /**
   * Điền các trường còn trống. `chiTruongLoi` = true: chỉ sửa các trường đang báo lỗi validate
   * (vd. OCR điền ngày sai ràng buộc). Trả về tên các trường đã điền.
   */
  async dienTruongThieu(d: ThongTinDon, chiTruongLoi = false) {
    const { page } = this;
    const daDien: string[] = [];
    for (const t of TRUONG) {
      const o = t.o(page);
      if (!(await hienThi(o)) || !(await o.isEnabled())) continue; // trường ẩn/khoá theo điều kiện
      const canDien = chiTruongLoi ? await dangLoi(page, o) : (await docGiaTri(page, t, o)) === '';
      if (!canDien) continue;
      await t.dien(page, o, d);
      daDien.push(t.ten);
    }
    return daDien;
  }

  /**
   * Bấm nút kính lúp cạnh "Cấp xét xử": tra cứu bản án cũ, đơn liên quan, kết quả giải quyết.
   * Cần đủ Số/Ngày/Tòa án; bật cờ isDaTraCuu để hiện "Thêm mới" ở bảng bản án liên quan.
   */
  /**
   * Bấm tra cứu theo Số bản án / Ngày bản án / Tòa án ra bản án.
   * batBuocTimThay: FE còn tự lọc lại theo 3 ô sau khi API trả về, nên chỉ tin thông báo trên màn hình —
   * có ant-message "Không tìm thấy bản án trong hệ thống" thì báo lỗi (dùng cho luồng nhập theo bản án thật;
   * dữ liệu seed số bản án ngẫu nhiên thì để false).
   */
  async traCuuBanAn({ batBuocTimThay = false }: { batBuocTimThay?: boolean } = {}) {
    const { page } = this;
    const nut = page
      .locator('div')
      .filter({ has: page.locator('#thongTinBanAn_capXetXu') })
      .filter({ has: page.locator('button .anticon-search') })
      .last()
      .locator('button:has(.anticon-search)');
    const choKetQua = page.waitForResponse(r => r.url().includes('/don/tra-cuu-ban-an-cu/'), { timeout: 60_000 }).catch(() => null);
    await nghi(page, 400, 800);
    await nut.click();
    const kq = await choKetQua;
    if (!kq) {
      const canhBao = page.locator('.ant-modal-confirm').filter({ hasText: 'Chưa đủ thông tin kiểm tra' });
      if (await canhBao.isVisible()) {
        await canhBao.getByRole('button', { name: 'Đã hiểu' }).click();
        throw new Error('Tra cứu bản án: chưa đủ Số/Ngày/Tòa án');
      }
      throw new Error('Tra cứu bản án: không thấy phản hồi API tra-cuu-ban-an-cu');
    }
    if (batBuocTimThay) {
      // message.info hiện ngay sau khi xử lý phản hồi, tự tắt sau ~3s
      const khongThay = await toast(page, 'Không tìm thấy bản án trong hệ thống')
        .waitFor({ state: 'visible', timeout: 5_000 })
        .then(() => true, () => false);
      if (khongThay) {
        const giaTri = (id: string) => page.locator(`#${id}`).inputValue().catch(() => '?');
        const toaAn = await tenToaDangChon(page).catch(() => '?');
        throw new Error(
          `Tra cứu bản án: "Không tìm thấy bản án trong hệ thống" — Số bản án ${await giaTri('thongTinBanAn_soBanAnQd')}, ` +
            `Ngày bản án ${await giaTri('thongTinBanAn_ngayBanAnQd')}, Tòa án ra bản án "${toaAn}"`,
        );
      }
    }
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await nghi(page, 1000, 1500);
  }

  /** "Danh sách bản án/quyết định liên quan" → Thêm mới bản án sơ thẩm (chỉ có khi tra cứu không ra bản án thật) */
  async themBanAnLienQuan(d: ThongTinDon) {
    const { page } = this;
    const khung = await moBangThuGon(page, 'Danh sách bản án/quyết định liên quan');
    const nut = khung.getByRole('button', { name: /Thêm mới$/ });
    if (!(await nut.isVisible())) return 'bỏ qua: tra cứu đã ra bản án trong hệ thống (không cho thêm tay)';

    await nut.click();
    const m = modal(page, 'Thêm mới bản án liên quan');
    await expect(m).toBeVisible();
    await go(m.locator('#SO_THAM_soBanAn'), d.banAnSoTham.so);
    await chonNgay(m.locator('#SO_THAM_ngayBanAn'), d.banAnSoTham.ngay);
    // ProFormTreeSelect không gắn id theo name → tìm theo nhãn
    await chonTreeSelect(page, m.getByRole('combobox', { name: 'Tòa án sơ thẩm' }), d.toaAn);
    await m.getByRole('button', { name: /^Lưu$/ }).click();
    await expect(m).toBeHidden();
    await expect(khung).toContainText(d.banAnSoTham.so);
    this.bangCanCo.push({ ten: 'Bản án liên quan', canCo: d.banAnSoTham.so });
    return 'đã thêm';
  }

  /** "Danh sách kết quả giải quyết liên quan" → Thêm mới → modal "Thêm kết quả giải quyết liên quan" */
  async themKetQuaGiaiQuyet(d: ThongTinDon) {
    const { page } = this;
    const khung = await moBangThuGon(page, 'Danh sách kết quả giải quyết liên quan');
    await khung.getByRole('button', { name: /Thêm mới$/ }).click();
    const m = modal(page, 'Thêm kết quả giải quyết liên quan');
    await expect(m).toBeVisible();
    await chonSelect(page, m.locator('#loaiThongBao'), d.ketQua.loai);
    await go(m.locator('#nguoiDungDon'), d.nguoi.hoTen);
    await go(m.locator('#soThongBao'), d.ketQua.so);
    await chonNgay(m.locator('#ngayThongBao'), d.ketQua.ngay);
    await chonTreeSelect(page, m.locator('#toaAn'), d.toaAn);
    await m.getByRole('button', { name: /^Thêm$/ }).click();
    await expect(m).toBeHidden();
    await expect(khung).toContainText(d.ketQua.so);
    this.bangCanCo.push({ ten: 'Kết quả giải quyết liên quan', canCo: d.ketQua.so });
  }

  /** Mục "Đơn thụ lý kèm" (thu gọn mặc định) → Thêm mới → modal "Thêm đơn thụ lý kèm" */
  async themDonThuLyKem(d: ThongTinDon) {
    const { page } = this;
    const muc = page.locator('.ant-collapse-item').filter({
      has: page.locator('.ant-collapse-header', { hasText: 'Đơn thụ lý kèm' }),
    }).first();
    await muc.scrollIntoViewIfNeeded();
    if (!(await muc.evaluate(e => e.classList.contains('ant-collapse-item-active')))) {
      await muc.locator('.ant-collapse-header').first().click();
      await nghi(page);
    }
    await muc.getByRole('button', { name: /Thêm mới$/ }).first().click();
    const m = modal(page, 'Thêm đơn thụ lý kèm');
    await expect(m).toBeVisible();
    await go(m.locator('#soHieuDon'), d.donThuLyKem.soDen);
    await chonNgay(m.locator('#ngayNhanDon'), d.donThuLyKem.ngayNhan);
    await chonNgay(m.locator('#ngayGhiTrenDon'), d.donThuLyKem.ngayGhi);
    await m.getByRole('button', { name: /^Thêm$/ }).click();
    // Modal không đóng = form còn lỗi (hay gặp: ô ngày bị form xoá trắng vì ngày ở tương lai)
    // → nêu rõ trường nào đang lỗi thay vì chỉ báo "toBeHidden failed"
    if (await hienTrong(m, 5_000)) {
      const loi = (await m.locator('.ant-form-item-explain-error').allInnerTexts()).join(' | ');
      const gt = {
        soHieuDon: await m.locator('#soHieuDon').inputValue().catch(() => '?'),
        ngayNhanDon: await m.locator('#ngayNhanDon').inputValue().catch(() => '?'),
        ngayGhiTrenDon: await m.locator('#ngayGhiTrenDon').inputValue().catch(() => '?'),
      };
      if (loi) {
        throw new Error(`Modal "Thêm đơn thụ lý kèm" báo lỗi: ${loi} (đang nhập ${JSON.stringify(gt)})`);
      }
    }
    await expect(m).toBeHidden();
    await expect(muc).toContainText(d.donThuLyKem.soDen);
    this.bangCanCo.push({ ten: 'Đơn thụ lý kèm', canCo: d.donThuLyKem.soDen });
  }

  /**
   * Bảng người tham gia tố tụng → Thêm mới → Drawer (FormPhapNhanConNguoi) → Lưu.
   * `tuCach` bỏ trống khi drawer đã điền sẵn (Nguyên đơn / Bị đơn).
   */
  async themNguoiThamGiaToTung(tieuDeBang: string, tieuDeDrawer: string, n: NguoiGia, d: ThongTinDon, tuCach?: string) {
    const { page } = this;
    await nutThemMoiCuaBang(page, tieuDeBang).click();
    await dienFormNguoi(page, drawer(page, tieuDeDrawer), n, d.tinh, tuCach);
    const bang = tieuDeBang_(page, tieuDeBang);
    await expect(bang).toContainText(n.hoTen);
    this.bangCanCo.push({ ten: tieuDeBang, canCo: n.hoTen });
  }

  async nhapNguoiThamGiaToTung(d: ThongTinDon) {
    await this.themNguoiThamGiaToTung('Nguyên đơn/Người khởi kiện', 'Thêm nguyên đơn/người khởi kiện', d.nguoi, d);
    await this.themNguoiThamGiaToTung('Bị đơn/Người bị kiện', 'Thêm bị đơn/người bị kiện', d.biDon, d);
    await this.themNguoiThamGiaToTung(
      'Người có quyền lợi, nghĩa vụ liên quan',
      'Thêm người có quyền lợi, nghĩa vụ liên quan',
      d.nguoiLienQuan,
      d,
      'Người có quyền lợi, nghĩa vụ liên quan',
    );
  }

  /**
   * Đơn cho bản án này đã nhập từ lần chạy trước chưa (để bỏ qua, không tạo đơn trùng).
   * Tìm trong Danh sách đơn theo đúng nội dung nút "[Gợi ý]" sinh ra — chuỗi đó gắn chặt với
   * Số bản án + Ngày bản án + Tòa ra bản án nên nhận đúng bản án.
   * Trả { maDon, soThuLy } của đơn cũ, hoặc null nếu chưa có.
   */
  async timDonDaNhapTheoBanAn(noiDungGoiY: string): Promise<{ maDon: string; soThuLy: string } | null> {
    const { page } = this;
    await moMenu(page, ['Quản lý đơn', 'Danh sách đơn']);
    const o = page.getByPlaceholder('Nhập bất kỳ thông tin nào (người gửi, nội dung...)');
    await expect(o).toBeVisible({ timeout: 60_000 });
    await go(o, noiDungGoiY);
    await page.getByRole('button', { name: /Tìm kiếm$/ }).click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await nghi(page, 1500, 2500);

    const dong = page.locator('.ant-table-row:visible').first();
    if (!(await hienTrong(dong, 5_000))) return null;
    const chu = (await dong.innerText()).replace(/\s+/g, ' ');
    const maDon = (chu.match(/Mã đơn:s*(S+)/) || [])[1] || '';
    const soThuLy = (chu.match(/Số TL:s*(d+)/) || [])[1] || '';
    return maDon ? { maDon, soThuLy } : null;
  }


  // ────────── Nhập theo bản án sơ thẩm có sẵn trong hệ thống (Luông nhập data.txt, Bước 2) ──────────

  /**
   * 3 ô lấy từ Excel + Cấp xét xử. Đặt Cấp xét xử TRƯỚC vì danh sách tòa lọc theo cấp,
   * và Số/Ngày/Tòa là điều kiện bắt buộc của nút tra cứu (ThongTinBanAnStep).
   */
  async datThongTinBanAnTheoDuLieu(b: { soBanAn: string; ngayBanAn: string; toaAn: string; capXetXu: string }) {
    const { page } = this;
    const capXetXu = page.locator('#thongTinBanAn_capXetXu');
    if ((await nhanSelect(page, capXetXu)) !== b.capXetXu) await chonSelect(page, capXetXu, b.capXetXu);
    await go(page.locator('#thongTinBanAn_soBanAnQd'), b.soBanAn);
    await chonNgay(page.locator('#thongTinBanAn_ngayBanAnQd'), b.ngayBanAn);
    await this.chonToaRaBanAn(b.toaAn);
  }

  /**
   * "Thời hiệu giải quyết" (4 ô tick trên tab Thông tin bản án) bắt buộc chọn 1 từ commit 88ea29d
   * (ThongTinBanAnStep: "Vui lòng chọn thời hiệu giải quyết"); tra cứu bản án không tự tick. Dữ liệu
   * GĐT/TT không có cột này → tick "Trong hạn giải quyết 1 năm" như các đơn đã nhập trước đó. Gọi SAU
   * tra cứu (tra cứu điền lại tab). Đã có ô được tick, hoặc ô bị ẩn/khoá (đơn được miễn) thì để nguyên.
   */
  async chonThoiHieuGiaiQuyetNeuTrong(): Promise<string> {
    const { page } = this;
    const dsId = [
      'thongTinBanAn_khongXacDinhThoiHieuGiaiQuyet',
      'thongTinBanAn_trongHanGiaiQuyet1Nam',
      'thongTinBanAn_anQuaThoiHieu3Nam',
      'thongTinBanAn_anQuaThoiHieu5Nam',
    ];
    for (const id of dsId) {
      if (await page.locator(`#${id}`).isChecked().catch(() => false)) return `đã có: ${id}`;
    }
    const o = page.locator('#thongTinBanAn_trongHanGiaiQuyet1Nam');
    if (!(await o.isVisible().catch(() => false)) || !(await o.isEnabled().catch(() => false))) return 'ô thời hiệu ẩn/khoá — bỏ qua';
    await o.check({ force: true });
    await expect(o, 'Không tick được "Trong hạn giải quyết 1 năm"').toBeChecked({ timeout: 10_000 });
    return 'Trong hạn giải quyết 1 năm';
  }

  /**
   * Bước 2 · ô "Thủ tục giải quyết": chọn "Giám đốc thẩm" hoặc "Tái thẩm" theo file dữ liệu.
   * Phải gọi SAU tra cứu bản án và KHÔNG đi qua dienTruongThieu: tra cứu xong màn tự fill sẵn
   * "Giám đốc thẩm", mà dienTruongThieu chỉ điền ô đang trống nên sẽ bỏ qua và đơn Tái thẩm bị lưu
   * nhầm thành Giám đốc thẩm (đã xảy ra với đơn 9683 ngày 27/09/2026).
   */
  async datThuTucGiaiQuyet(giaTri?: string): Promise<string> {
    const { page } = this;
    if (!giaTri) return 'không khai trong bộ dữ liệu — giữ giá trị màn tự điền';
    const o = page.locator('#thongTinBanAn_thuTucGiaiQuyet');
    if (!(await o.isVisible().catch(() => false))) return 'ô Thủ tục giải quyết ẩn — bỏ qua';
    const dangCo = await nhanSelect(page, o);
    if (dangCo.trim() === giaTri) return `đã đúng: ${giaTri}`;
    await chonSelect(page, o, giaTri, { goDeLoc: false });
    const sauKhiChon = await nhanSelect(page, o);
    expect(sauKhiChon.trim(), `Không chọn được Thủ tục giải quyết "${giaTri}"`).toBe(giaTri);
    return `${dangCo.trim() || '(trống)'} → ${giaTri}`;
  }

  /**
   * TreeSelect "Tòa án ra bản án": phải đúng tòa ghi trong dữ liệu test, KHÔNG lấy tòa gần đúng —
   * chọn nhầm tòa thì tra cứu ra bản án khác, kết quả kiểm tra mất ý nghĩa.
   */
  async chonToaRaBanAn(tenToa: string) {
    const { page } = this;
    const input = page.locator('#thongTinBanAn_maToaXetXu');
    const khung = input.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
    await khung.evaluate(e => e.scrollIntoView({ block: 'center' }));
    await khung.click();
    const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').filter({ has: page.locator('.ant-select-tree') }).last();
    await expect(dd).toBeVisible({ timeout: 30_000 });
    await input.fill('');
    await input.pressSequentially(tenToa, { delay: 20 });
    await nghi(page, 800, 1200);
    const nut = dd.locator('.ant-select-tree-title').filter({ hasText: tenToa });
    if (!(await hienTrong(nut.first(), 10_000))) {
      const co = (await dd.locator('.ant-select-tree-title').allInnerTexts()).slice(0, 10).join(' | ');
      throw new Error(`Danh mục tòa án không có "${tenToa}" (danh sách đang hiện: ${co || 'trống'})`);
    }
    await nut.first().click();
    await nghi(page, 400, 800);
    return (await nhanSelect(page, input)) || tenToa;
  }

  /** Nhãn "Loại án" đang hiển thị (sau khi tra cứu, hệ thống tự điền theo bản án tìm được) */
  async loaiAnHienTai() {
    return nhanSelect(this.page, this.page.locator('#thongTinChuyenDonVO_loaiVuAn'));
  }

  /** Select "Chọn người từ bản án cũ" ở khối Người đứng đơn (chỉ hiện khi tra cứu ra người) */
  private oNguoiTuBanAnCu() {
    return this.page
      .locator('.ant-select')
      .filter({ has: this.page.locator('.ant-select-selection-placeholder', { hasText: 'Chọn người từ bản án cũ' }) })
      .first();
  }

  /** Nhãn các lựa chọn "Chọn người từ bản án cũ" ("Họ tên - ngày sinh - CCCD"); [] nếu ô không hiện */
  async dsNguoiTuBanAnCu(): Promise<string[]> {
    const { page } = this;
    const o = this.oNguoiTuBanAnCu();
    if (!(await hienTrong(o, 10_000))) return [];
    await o.evaluate(e => e.scrollIntoView({ block: 'center' }));
    await o.click();
    const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
    await expect(dd).toBeVisible({ timeout: 15_000 });
    await nghi(page, 500, 900);
    const ds = await dd.locator('.ant-select-item-option').allInnerTexts();
    await page.keyboard.press('Escape');
    return ds.map(s => s.trim()).filter(Boolean);
  }

  /**
   * Chọn người từ bản án cũ (Luông nhập data.txt: "click dropdown Chọn người từ bản án cũ rồi chọn người hiện ra").
   * `ten` bỏ trống → lấy người đầu tiên. Trả nhãn đã chọn.
   */
  async chonNguoiTuBanAnCu(ten?: string): Promise<string> {
    const { page } = this;
    const o = this.oNguoiTuBanAnCu();
    await expect(o, 'Không thấy ô "Chọn người từ bản án cũ" (tra cứu chưa ra người của bản án)').toBeVisible({ timeout: 15_000 });
    await o.evaluate(e => e.scrollIntoView({ block: 'center' }));
    await o.click();
    const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
    await expect(dd).toBeVisible({ timeout: 15_000 });
    const muc = ten ? dd.locator('.ant-select-item-option').filter({ hasText: ten }) : dd.locator('.ant-select-item-option');
    if (!(await hienTrong(muc.first(), 10_000))) {
      const co = (await dd.locator('.ant-select-item-option').allInnerTexts()).join(' | ');
      throw new Error(`Không có người "${ten}" trong danh sách từ bản án cũ (đang có: ${co || 'trống'})`);
    }
    const nhan = (await muc.first().innerText()).trim();
    await muc.first().click();
    await toastDaHien(page, 'Đã thêm người từ bản án cũ vào danh sách', 20_000, /đã có trong danh sách/);
    await nghi(page, 500, 1000);
    return nhan;
  }

  /** Bấm "[Gợi ý]" cạnh nhãn "Nội dung" → FE tự sinh nội dung đơn; trả nội dung trong ô */
  async goiYNoiDungDon(): Promise<string> {
    const { page } = this;
    const o = page.locator('#thongTinChiTietDon_noiDung');
    const nhan = o
      .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-form-item ")][1]')
      .locator('.ant-form-item-label');
    await nhan.getByText('[Gợi ý]').click();
    await nghi(page, 500, 1000);
    return o.inputValue();
  }

  // ───────────────────────────── Lưu ─────────────────────────────

  /** Chụp giá trị các trường đang hiển thị để so sau khi mở lại đơn */
  async chupGiaTri() {
    const { page } = this;
    this.giaTriTruocLuu.clear();
    for (const t of TRUONG_KIEM_TRA) {
      const o = t.o(page);
      if (await hienThi(o)) this.giaTriTruocLuu.set(t.ten, await docGiaTri(page, t, o));
    }
    return Object.fromEntries(this.giaTriTruocLuu);
  }

  /** Bấm "Lưu thông tin". Trả về { ok, loi } — loi là toast lỗi (nếu có) */
  async bamLuu() {
    const { page } = this;
    await nghi(page, 500, 1000);
    await page.getByRole('button', { name: 'Lưu thông tin' }).click();
    const loi = toast(page, /Vui lòng|thất bại|chưa nhập/);
    const ok = toast(page, 'Lưu thông tin thành công');
    await expect(ok.or(loi)).toBeVisible({ timeout: 120_000 });
    return (await ok.isVisible()) ? { ok: true as const } : { ok: false as const, loi: await loi.innerText() };
  }

  /** Lưu; nếu báo thiếu/sai trường thì sửa các trường lỗi và lưu lại (tối đa 2 lần). Trả về id đơn */
  async luu(d: ThongTinDon) {
    const { page } = this;
    for (let lan = 0; ; lan++) {
      await this.chupGiaTri();
      const kq = await this.bamLuu();
      if (kq.ok) break;
      // Có toast lỗi nhưng server vẫn đã tạo đơn (FE chuyển sang /them-moi/<id>) → KHÔNG bấm Lưu lại,
      // bấm lại sẽ sinh thêm một đơn trùng (đã gặp trên STG: đơn 9331 + 9332 cùng bản án 119)
      const daTaoDon = await page
        .waitForURL(/\/quan-ly-don\/them-moi\/[^/?]+/, { timeout: 10_000 })
        .then(() => true, () => false);
      if (daTaoDon) break;
      const truongLoi = await page.locator('.ant-form-item-has-error .ant-form-item-label').allInnerTexts();
      if (lan >= 2) throw new Error(`Lưu đơn lỗi: ${kq.loi} | Trường lỗi: ${truongLoi.join(', ') || '(không rõ)'}`);
      const daSua = await this.dienTruongThieu(d, true);
      if (daSua.length === 0 && truongLoi.length) {
        throw new Error(`Lưu đơn lỗi, không tự sửa được: ${kq.loi} | Trường lỗi: ${truongLoi.join(', ')}`);
      }
    }
    await page.waitForURL(/\/quan-ly-don\/them-moi\/[^/?]+/, { timeout: 60_000 });
    return page.url().split('/them-moi/')[1].split(/[?#]/)[0];
  }

  // ───────────────────────────── Kiểm tra sau lưu ─────────────────────────────

  /**
   * Màn chỉnh sửa /them-moi/<id>: chờ tiêu đề "Chỉnh sửa … - Mã đơn: … - Người đứng đơn: …",
   * so từng trường với giá trị trước khi lưu, kiểm tra các bảng đã nạp lại dòng vừa thêm.
   */
  async kiemTraSauLuu(): Promise<{ maDon: string; ketQua: KetQuaKiemTra }> {
    const { page } = this;
    const tieuDe = page.getByText(/Chỉnh sửa Đơn đề nghị GĐT\/TT - Mã đơn:/).first();
    await expect(tieuDe).toBeVisible({ timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await expect(page.locator('.don-stepper-spin .ant-spin-spinning')).toHaveCount(0, { timeout: 60_000 });
    const maDon = ((await tieuDe.innerText()).match(/Mã đơn:\s*([^-\s]+)/)?.[1] || '').trim();

    const ketQua: KetQuaKiemTra = { truong: [], bang: [] };
    for (const t of TRUONG_KIEM_TRA) {
      const truoc = this.giaTriTruocLuu.get(t.ten);
      if (truoc === undefined || truoc === '') continue;
      const o = t.o(page);
      // Select nạp nhãn sau khi danh mục tải xong → chờ tối đa 20s cho khớp
      let sau = '';
      await expect
        .poll(async () => (sau = (await hienThi(o)) ? await docGiaTri(page, t, o) : '(không hiển thị)'), { timeout: 20_000 })
        .toBe(truoc)
        .catch(() => {});
      ketQua.truong.push({ ten: t.ten, truoc, sau });
    }

    // Mở các bảng thu gọn rồi tìm dòng đã thêm
    for (const tieuDe of ['Danh sách bản án/quyết định liên quan', 'Danh sách kết quả giải quyết liên quan']) {
      if (await tieuDeBang(page, tieuDe).isVisible()) await moBangThuGon(page, tieuDe);
    }
    for (const b of this.bangCanCo) {
      const co = await page
        .getByText(b.canCo, { exact: true })
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 })
        .then(() => true, () => false);
      ketQua.bang.push({ ...b, co });
    }
    return { maDon, ketQua };
  }

  /** Danh sách đơn → tab "Đơn của tôi" → tìm theo mã đơn → phải thấy đúng đơn và người đứng đơn */
  async timTrongDanhSachDon(maDon: string, tenNguoiDungDon: string) {
    const { page } = this;
    await page.goto('quan-ly-don/danh-sach-don');
    const tab = page.getByRole('tab', { name: /Đơn của tôi/ });
    await expect(tab).toBeVisible({ timeout: 60_000 });
    await tab.click();
    await nghi(page, 500, 1000);
    await go(page.getByPlaceholder('Nhập bất kỳ thông tin nào (người gửi, nội dung...)'), maDon);
    await page.getByRole('button', { name: /Tìm kiếm$/ }).click();
    const dong = page.locator('.ant-table-row').filter({ hasText: `Mã đơn: ${maDon}` });
    await expect(dong.first()).toBeVisible({ timeout: 60_000 });
    await expect(dong.first()).toContainText(tenNguoiDungDon);
  }
}

/** Bảng ProTable theo tiêu đề (để kiểm tra dòng vừa thêm) */
const tieuDeBang_ = (page: Page, tieuDe: string) =>
  tieuDeBang(page, tieuDe).locator('xpath=ancestor::div[contains(concat(" ",normalize-space(@class)," ")," ant-pro-table ")][1]');
