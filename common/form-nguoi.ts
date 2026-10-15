import { Locator, Page, expect } from '@playwright/test';
import { chonNgay, chonNgauNhien, chonSelect, chonTheoTuKhoa, go, nghi } from './antd';
import { NguoiGia } from './du-lieu';

/** Ô "Giới tính": FE f03ddb6 (checkbox "Giới tính Khác") bọc ô vào component riêng, mất id #conNguoi_maGioiTinh */
export const oGioiTinh = (page: Page, khung: Locator): Locator =>
  khung
    .locator('#conNguoi_maGioiTinh')
    .or(khung.locator('.ant-form-item').filter({ has: page.locator('label[title="Giới tính"]') }).locator('input[role="combobox"]'))
    .first();

/**
 * Điền form người tham gia tố tụng dùng chung (qla-webapp components/FormPhapNhanConNguoi) trong Drawer
 * ("Thêm nguyên đơn…", "Thêm bị đơn…", "Thêm Bị cáo"...) rồi bấm "Lưu".
 * Form không có `name` → id là đường dẫn field (#conNguoi_hoTen, #diaChi_4_maTinh...).
 * `tuCach`: chọn "Tư cách tham gia tố tụng" nếu đang trống (Nguyên đơn/Bị đơn/Bị cáo thường điền sẵn).
 */
export async function dienFormNguoi(page: Page, dr: Locator, n: NguoiGia, tinh: string, tuCach?: string, toiDanh?: string) {
  await expect(dr).toBeVisible({ timeout: 30_000 });
  await nghi(page, 500, 1000);

  const oTuCach = dr.locator('#loaiConNguoi');
  if (tuCach && (await oTuCach.count())) {
    const khung = oTuCach.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
    const daChon = await khung.locator('.ant-select-selection-item').first().innerText().catch(() => '');
    if (!daChon) await chonSelect(page, oTuCach, tuCach);
  }
  await go(dr.locator('#conNguoi_hoTen'), n.hoTen);
  await chonSelect(page, oGioiTinh(page, dr), n.gioiTinh);
  await go(dr.locator('#conNguoi_ngaySinh'), n.ngaySinh);
  await go(dr.locator('#conNguoi_soCccd'), n.cccd);
  const sdt = dr.locator('#conNguoiChiTiet_soDienThoai');
  if ((await sdt.count()) && (await sdt.isVisible())) await go(sdt, n.sdt);
  // Nơi ở hiện tại (Quốc gia mặc định Việt Nam) → cột "Địa chỉ" trong bảng
  await chonSelect(page, dr.locator('#diaChi_4_maTinh'), tinh);
  await chonSelect(page, dr.locator('#diaChi_4_maXa'));
  await go(dr.locator('#diaChi_4_soNha'), n.diaChi);

  // Bị cáo: bắt buộc ≥1 tội danh (tội danh đầu tiên tự là tội danh chính) – FormPhapNhanConNguoi validateToiDanhHinhPhat
  if (toiDanh) await themToiDanh(page, dr, toiDanh);

  await dr.getByRole('button', { name: /^Lưu$/ }).click();
  await expect(dr).toBeHidden({ timeout: 15_000 }).catch(async () => {
    const loi = await page.locator('.ant-message-notice-error').first().innerText().catch(() => '');
    const truong = await dr.locator('.ant-form-item-has-error .ant-form-item-label').allInnerTexts();
    throw new Error(`Form người "${n.hoTen}" không lưu được: ${loi} | Trường lỗi: ${truong.join(', ')}`);
  });
}

/**
 * Khối "Thông tin tội danh" → "Thêm tội danh" → modal: Bộ luật áp dụng (mặc định), Tội danh (tìm theo từ khoá,
 * không có thì chọn tội danh đầu tiên) → "Thêm" → toast "Đã thêm tội danh".
 */
async function themToiDanh(page: Page, dr: Locator, tuKhoa: string) {
  const nut = dr.getByRole('button', { name: /Thêm tội danh$/ });
  if (!(await nut.count())) return;
  await nut.first().scrollIntoViewIfNeeded();
  await nut.first().click();
  const m = page.locator('.ant-modal').filter({ has: page.locator('.ant-modal-title', { hasText: 'Thêm tội danh' }) });
  await expect(m).toBeVisible({ timeout: 15_000 });
  const boLuat = m.locator('#boLuat');
  const daCoBoLuat = await boLuat
    .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]')
    .locator('.ant-select-selection-item')
    .count();
  if (!daCoBoLuat) await chonSelect(page, boLuat);
  // Không khớp từ khoá thì chọn tội danh đầu tiên (không Escape: Escape đóng luôn modal Thêm tội danh)
  await chonSelect(page, m.locator('#dieu'), tuKhoa).catch(() => chonSelect(page, m.locator('#dieu')));
  await m.getByRole('button', { name: /^Thêm$/ }).click();
  await expect(m).toBeHidden({ timeout: 15_000 });
}

// ───────────────────────────── Nhập ĐẦY ĐỦ (dùng cho script seed) ─────────────────────────────

/** Một địa chỉ đã chọn theo danh mục thật (nhãn Tỉnh/Phường-Xã đúng như trên ô chọn) */
export interface DiaChiDayDu {
  tinh: string;
  xa: string;
  soNha: string;
}

/** Thông tin chi tiết trong Drawer cá nhân (FormPhapNhanConNguoi). Nhãn select = nhãn danh mục QTDM thật. */
export interface NguoiDayDu extends NguoiGia {
  ngayCap: string;
  noiCap: string;
  /** Số [0,1) để chọn ngẫu nhiên một mục có sẵn trong danh mục hệ thống */
  uDanToc: number;
  uTonGiao: number;
  quocTich: string;
  uNgheNghiep: number;
  /** Chỉ người làm cán bộ, công chức (danh mục Chức vụ là chức danh cơ quan nhà nước) */
  uChucVu: number;
  noiLamViec: string;
  uNgoaiNgu: number;
  uTrinhDoVanHoa: number;
  uTrinhDoDaoTao: number;
  uThanhPhanGiaDinh: number;
  email: string;
  /** Chỉ người làm việc tại cơ quan có số fax */
  fax?: string;
  congChucVienChuc: boolean;
  ghiChu: string;
  /** Nơi sinh, Quê quán, HKTT, Tạm trú, Nơi ở hiện tại (diaChi_5, _1, _2, _3, _4) */
  noiSinh: DiaChiDayDu;
  queQuan: DiaChiDayDu;
  hktt: DiaChiDayDu;
  tamTru: DiaChiDayDu;
  hienTai: DiaChiDayDu;
}

/** Cơ quan/tổ chức (chế độ "Cơ quan/tổ chức" trong Drawer người tham gia tố tụng) */
export interface PhapNhanDayDu {
  ten: string;
  tenEn: string;
  tenVietTat: string;
  /** Từ khoá ưu tiên cho các ô Phân loại tổ chức / Loại / Phân loại chi tiết (không khớp → mục đầu tiên) */
  tuKhoaPhanLoai: string[];
  ngayThanhLap: string;
  coQuanQuyetDinh?: string;
  soQuyetDinh?: string;
  giayChungNhanSo?: string;
  ngayCapChungNhan?: string;
  coQuanCapChungNhan?: string;
  coQuanKhac: string;
  moTa: string;
  sdt: string;
  tienAn: string;
  truSo: DiaChiDayDu;
  lienLac: DiaChiDayDu;
}

const khungSel = (o: Locator) => o.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');

/** Ô trong Drawer tìm theo nhãn form-item (antd sinh trùng id cho Ngày thành lập / Ngày quyết định) */
const oTheoNhan = (dr: Locator, nhan: string) =>
  dr
    .locator('.ant-form-item')
    .filter({ has: dr.page().locator('.ant-form-item-label', { hasText: new RegExp(`^\\*?\\s*${nhan}$`) }) })
    .first()
    .locator('input:not([type=hidden]), textarea')
    .first();

/** Ô phân loại (nếu đang mở khoá): chọn mục khớp từ khoá trong danh mục hệ thống, không khớp thì mục đầu tiên */
async function chonPhanLoai(page: Page, o: Locator, tuKhoa: string[]) {
  if (!(await o.count())) return '';
  if (await khungSel(o).evaluate(e => e.classList.contains('ant-select-disabled'))) return '';
  return chonTheoTuKhoa(page, o, tuKhoa);
}

async function dienDiaChi(page: Page, dr: Locator, loai: number, dc: DiaChiDayDu) {
  const tinh = dr.locator(`#diaChi_${loai}_maTinh`);
  const xa = dr.locator(`#diaChi_${loai}_maXa`);
  await chonSelect(page, tinh, dc.tinh);
  // Danh sách xã nạp theo tỉnh; đổi tỉnh mà danh sách cũ chưa được thay thì chọn lại tỉnh rồi thử lại
  for (let lan = 0; ; lan++) {
    try {
      await chonSelect(page, xa, dc.xa);
      break;
    } catch (e) {
      if (lan >= 1) throw e;
      await chonSelect(page, tinh, dc.tinh);
      await nghi(page, 800, 1200);
    }
  }
  await go(dr.locator(`#diaChi_${loai}_soNha`), dc.soNha);
}

async function luuDrawer(page: Page, dr: Locator, ten: string) {
  await dr.getByRole('button', { name: /^Lưu$/ }).click();
  await expect(dr).toBeHidden({ timeout: 20_000 }).catch(async () => {
    const loi = await page.locator('.ant-message-notice-error, .ant-message-notice-warning').first().innerText().catch(() => '');
    const truong = await dr.locator('.ant-form-item-has-error .ant-form-item-label').allInnerTexts();
    throw new Error(`Form "${ten}" không lưu được: ${loi} | Trường lỗi: ${truong.join(', ')}`);
  });
}

/**
 * Điền ĐẦY ĐỦ Drawer cá nhân (Thêm/Sửa người đứng đơn, nguyên đơn, bị đơn, bị cáo...) rồi "Lưu".
 * Ô đã có giá trị (vd. Sửa người đứng đơn mang sẵn họ tên/CCCD) được ghi đè đúng giá trị hồ sơ.
 * Bỏ qua ô khoá theo điều kiện (Nghề nghiệp rõ, Phân loại đảng viên).
 */
export async function dienNguoiDayDu(page: Page, dr: Locator, n: NguoiDayDu, tuCach?: string, toiDanh?: string) {
  await expect(dr).toBeVisible({ timeout: 30_000 });
  await nghi(page, 300, 600);
  const oTuCach = dr.locator('#loaiConNguoi');
  if (tuCach && (await oTuCach.count())) {
    const daChon = await khungSel(oTuCach).locator('.ant-select-selection-item').first().innerText().catch(() => '');
    if (daChon !== tuCach && !(await khungSel(oTuCach).evaluate(e => e.classList.contains('ant-select-disabled')))) {
      await chonSelect(page, oTuCach, tuCach);
    }
  }
  await go(dr.locator('#conNguoi_hoTen'), n.hoTen);
  await chonSelect(page, oGioiTinh(page, dr), n.gioiTinh);
  await go(dr.locator('#conNguoi_ngaySinh'), n.ngaySinh);
  await go(dr.locator('#conNguoi_soCccd'), n.cccd);
  await chonNgay(dr.locator('#conNguoi_ngayCap'), n.ngayCap);
  await go(dr.locator('#conNguoi_noiCap'), n.noiCap);
  // Các ô danh mục không ràng buộc nghiệp vụ: chọn ngẫu nhiên một giá trị đang có trong danh mục hệ thống
  await chonNgauNhien(page, dr.locator('#conNguoiChiTiet_maDanToc'), n.uDanToc);
  await chonNgauNhien(page, dr.locator('#conNguoiChiTiet_maTonGiao'), n.uTonGiao);
  // Quốc tịch là select nhiều giá trị: chọn xong đóng dropdown
  const quocTich = dr.locator('#conNguoiChiTiet_danhSachQuocTich');
  if (!(await khungSel(quocTich).locator('.ant-select-selection-item', { hasText: n.quocTich }).count())) {
    await chonSelect(page, quocTich, n.quocTich);
    await page.keyboard.press('Escape');
  }
  await chonNgauNhien(page, dr.locator('#conNguoiChiTiet_maNgheNghiep'), n.uNgheNghiep);
  await chonNgauNhien(page, dr.locator('#conNguoiChiTiet_chucVu'), n.uChucVu);
  await go(dr.locator('#conNguoiChiTiet_noiCongTac'), n.noiLamViec);
  await chonNgauNhien(page, dr.locator('#conNguoiChiTiet_ngoaiNgu'), n.uNgoaiNgu);
  await chonNgauNhien(page, dr.locator('#conNguoiChiTiet_maTrinhDoHocVan'), n.uTrinhDoVanHoa);
  await chonNgauNhien(page, dr.locator('#conNguoiChiTiet_maTrinhDoDaoTao'), n.uTrinhDoDaoTao);
  await chonNgauNhien(page, dr.locator('#conNguoiChiTiet_thanhPhanGiaDinh'), n.uThanhPhanGiaDinh);
  await go(dr.locator('#conNguoiChiTiet_soDienThoai'), n.sdt);
  await go(dr.locator('#conNguoiChiTiet_email'), n.email);
  if (n.fax) await go(dr.locator('#conNguoiChiTiet_fax'), n.fax);
  if (n.congChucVienChuc) {
    await dr.locator('.ant-form-item').filter({ hasText: 'Công chức, viên chức' }).locator('.ant-radio-wrapper', { hasText: /^Có$/ }).click();
  }
  await go(dr.locator('#conNguoiChiTiet_ghiChu'), n.ghiChu);
  await dienDiaChi(page, dr, 5, n.noiSinh);
  await dienDiaChi(page, dr, 1, n.queQuan);
  await dienDiaChi(page, dr, 2, n.hktt);
  await dienDiaChi(page, dr, 3, n.tamTru);
  await dienDiaChi(page, dr, 4, n.hienTai);
  if (toiDanh) await themToiDanh(page, dr, toiDanh);
  await luuDrawer(page, dr, n.hoTen);
}

/** Điền ĐẦY ĐỦ Drawer ở chế độ "Cơ quan/tổ chức" rồi "Lưu" */
export async function dienPhapNhanDayDu(page: Page, dr: Locator, pn: PhapNhanDayDu, tuCach?: string) {
  await expect(dr).toBeVisible({ timeout: 30_000 });
  await nghi(page, 300, 600);
  await dr.locator('.ant-radio-wrapper', { hasText: 'Cơ quan/tổ chức' }).first().click();
  await expect(dr.locator('#phapNhan_tenFullVi')).toBeVisible({ timeout: 15_000 });
  const oTuCach = dr.locator('#loaiConNguoi');
  if (tuCach && (await oTuCach.count())) {
    const daChon = await khungSel(oTuCach).locator('.ant-select-selection-item').first().innerText().catch(() => '');
    if (daChon !== tuCach) await chonSelect(page, oTuCach, tuCach);
  }
  await go(dr.locator('#phapNhan_tenFullVi'), pn.ten);
  await go(dr.locator('#phapNhan_tenFullEn'), pn.tenEn);
  await go(dr.locator('#phapNhan_tenAlias'), pn.tenVietTat);
  await chonNgay(oTheoNhan(dr, 'Ngày thành lập'), pn.ngayThanhLap);
  await go(dr.locator('#phapNhan_coQuanKhac'), pn.coQuanKhac);
  await chonPhanLoai(page, dr.locator('#phapNhan_phanLoaiToChuc'), pn.tuKhoaPhanLoai);
  await chonPhanLoai(page, dr.locator('#phapNhan_loai'), pn.tuKhoaPhanLoai);
  await chonPhanLoai(page, dr.locator('#phapNhan_phanLoaiChiTiet'), pn.tuKhoaPhanLoai);
  if (pn.coQuanQuyetDinh) await go(dr.locator('#phapNhan_coQuanQuyetDinhThanhLap'), pn.coQuanQuyetDinh);
  if (pn.giayChungNhanSo) await go(dr.locator('#phapNhan_giayChungNhanSo'), pn.giayChungNhanSo);
  if (pn.ngayCapChungNhan) await chonNgay(dr.locator('#phapNhan_ngayCapChungNhan'), pn.ngayCapChungNhan);
  await go(dr.locator('#phapNhan_moTaDacDiem'), pn.moTa);
  await go(dr.locator('#phapNhan_soDienThoai'), pn.sdt);
  await chonSelect(page, dr.locator('#phapNhan_quocTich'), 'Việt Nam');
  if (pn.soQuyetDinh) await go(dr.locator('#phapNhan_soQuyetDinhThanhLap'), pn.soQuyetDinh);
  if (pn.coQuanCapChungNhan) await go(dr.locator('#phapNhan_coQuanCapChungNhan'), pn.coQuanCapChungNhan);
  await go(dr.locator('#phapNhan_thongTinTienAn'), pn.tienAn);
  const diaChiPN = async (loai: 'diaChiTSChinh' | 'diaChiLienLac', hauTo: string, dc: DiaChiDayDu) => {
    const goc = `#phapNhan_phapNhanDiaChi_${loai}_`;
    await chonSelect(page, dr.locator(`${goc}madiaChiPhapNhanQuocGia${hauTo}`), 'Việt Nam');
    await chonSelect(page, dr.locator(`${goc}madiaChiPhapNhanTinh${hauTo}`), dc.tinh);
    await chonSelect(page, dr.locator(`${goc}madiaChiPhapNhanXa${hauTo}`), dc.xa);
    await go(dr.locator(`${goc}diaChiPhapNhanSoNha${hauTo}`), dc.soNha);
  };
  await diaChiPN('diaChiTSChinh', 'TsChinh', pn.truSo);
  await diaChiPN('diaChiLienLac', '', pn.lienLac);
  await luuDrawer(page, dr, pn.ten);
}
