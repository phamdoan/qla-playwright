import { Locator, expect } from '@playwright/test';
import path from 'path';
import { DATA_DIR } from '../../../../utils/file-helper';
import { ManHinh } from '../../../base.page';
import { PhienDangNhap } from '../../../common/login.page';
import { ngay } from '../../../../utils/fake-data';

/**
 * Thao tác màn hình DÙNG CHUNG cho nhiều bước của luồng 5A.
 * Thao tác riêng của bước nào nằm ngay trong file bước đó. Giao diện đổi → chỉ sửa trong thư mục buoc/.
 */

/** Popup của màn: modal hoặc drawer (màn vụ án dân sự dùng drawer) */
const POPUP = '.ant-modal-wrap:visible .ant-modal, .ant-drawer-open .ant-drawer-content';

/**
 * Vào link chi tiết, chờ tab "Thông tin chung" hiện. Hệ thống đôi khi nhảy sang trang 404 hoặc hiện Trang chủ trống
 * → trang trống / 404 / bị đẩy đi thì mở Dashboard rồi vào lại link, đến khi hiện giao diện (PhienDangNhap.vaoCho)
 */
async function vaoChiTiet(phien: PhienDangNhap, url: string): Promise<ManHinh> {
  const m = new ManHinh(phien.page);
  await phien.vaoCho(url, m.page.locator('[role=tab][id$="-tab-thong-tin-chung"]'));
  await m.choTaiXong(1500);
  return m;
}

/** [Bước 02–06] Mở chi tiết đơn theo link (bước 01 để lại) */
export const moChiTietDon = (phien: PhienDangNhap, urlDon: string) => vaoChiTiet(phien, urlDon);

/** [Bước 07–13] Mở chi tiết vụ án sơ thẩm theo link (bước 06 để lại; vụ lao động cũng mở ở màn quan-ly-so-tham/dan-su) */
export const moVuAn = (phien: PhienDangNhap, urlVuAn: string) => vaoChiTiet(phien, urlVuAn);

/** Popup (modal/drawer) đang mở có chứa chữ `tieuDe` */
export const popup = (m: ManHinh, tieuDe: string | RegExp): Locator => m.page.locator(POPUP).filter({ hasText: tieuDe }).last();

/** Bấm `nut` (vd. "Phân công", "Thêm thông báo") trong `khung` rồi chọn mục menu xổ xuống chứa `muc` */
export async function chonMenu(m: ManHinh, khung: Locator, nut: string, muc: string | RegExp) {
  await m.nut(khung, nut).click();
  await m.page.locator('.ant-dropdown:visible li').filter({ hasText: muc }).first().click();
}

/** Người ký = chủ tài khoản (mặc định có khi là Thẩm phán được phân công) */
export async function chonNguoiKy(m: ManHinh, bm: Locator, ten: string) {
  const o = m.oTheoNhan('Người ký/người phân công', bm);
  if ((await m.docGiaTri('Người ký/người phân công', bm)).startsWith(ten)) return;
  await m.chonTrong(o, new RegExp(`^\\s*${ten}`));
  await expect(o.locator('.ant-select-selection-item').first(), `Chưa chọn được người ký ${ten}`).toContainText(ten, { timeout: 5_000 });
}

/**
 * Bấm nút link "Dùng số <số gợi ý>" ngay dưới ô `nhan` → ô có số; trả về số.
 * Nút có khi nằm trong khung ô (popup có 2 ô số, vd. thụ lý), có khi nằm ngoài → không thấy trong ô thì lấy nút đầu của popup.
 */
export async function dungSo(m: ManHinh, bm: Locator, nhan: string): Promise<string> {
  const o = m.oTheoNhan(nhan, bm);
  const ip = o.locator('input').first();
  if (!(await ip.inputValue())) {
    const trongO = m.nut(o, /Dùng số/);
    await ((await trongO.count()) ? trongO : m.nut(bm, /Dùng số/)).click();
  }
  await expect(ip, `Bấm "Dùng số" nhưng ô "${nhan}" vẫn trống`).not.toHaveValue('', { timeout: 10_000 });
  return ip.inputValue();
}

/** "Lưu" → "Lưu quyết định thành công" → "Ký logic" → "Ký logic thành công" → "Đóng" */
export async function luuKyDong(m: ManHinh, bm: Locator) {
  await m.nut(bm, 'Lưu').click();
  await m.choThongBao(/Lưu quyết định thành công/);
  const nutKy = m.nut(bm, /Ký logic/);
  await nutKy.waitFor({ timeout: 30_000 });
  await nutKy.click();
  await m.choThongBao(/Ký logic thành công/);
  await m.nut(bm, 'Đóng').click();
  await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  await m.choTaiXong(1000);
}

/**
 * Chọn vai trò + người được phân công (`ten`; bỏ trống = ngẫu nhiên) rồi bấm mũi tên thêm vào bảng; trả về TÊN ĐỌC TỪ BẢNG.
 * (Chọn ngẫu nhiên trong danh sách ảo đôi khi trúng người khác với tên vừa đọc → lấy tên ở dòng mới thêm.)
 */
export async function themNguoiPhanCong(m: ManHinh, bm: Locator, vaiTro: string, ten?: string): Promise<string> {
  const bang = bm.locator('tbody tr').filter({ hasNotText: 'Không có dữ liệu' });
  const truoc = await bang.count();
  await m.chon(bm, 'Vai trò', vaiTro);
  await m.page.waitForTimeout(500);
  await m.chon(bm, 'Tên người được phân công', ten);
  await bm.locator('button:has(.anticon-arrow-down)').first().click();
  await expect(bang, 'Người được phân công chưa vào bảng').toHaveCount(truoc + 1, { timeout: 15_000 });
  // Dòng: "<STT> <Vai trò> <Họ tên> (<ngày sinh>)" — bỏ STT, vai trò và phần ngày sinh
  const chu = (await bang.nth(truoc).innerText()).replace(/\s+/g, ' ').trim();
  return chu.replace(/^\d+\s*/, '').replace(new RegExp(`^${vaiTro}\\s*`), '').replace(/\s*\(.*$/, '').trim();
}


/**
 * [Bước 07] Tab "Phân công" của vụ án › "Phân công" › `menu` → drawer quyết định:
 *   Ngày quyết định = hôm nay · Người ký = chủ tài khoản · `soNguoi` lần (Vai trò `vaiTro` → `tenNguoi` hoặc người ngẫu nhiên → mũi tên)
 *   → "Dùng số" → "Lưu" → "Ký logic" → "Đóng".
 * Lượt trước đã có đủ người cho vai trò này trong "Danh sách người tiến hành tố tụng" → không phân công lại.
 * @returns tên người được phân công (đọc từ bảng) và số quyết định
 */
export async function phanCongVuAn(m: ManHinh, menu: string, vaiTro: string, soNguoi: number, nguoiKy?: string, tenNguoi?: string) {
  await m.moTab('phan-cong');
  const dsNguoi = await m.moMuc('Danh sách người tiến hành tố tụng');
  await m.page.waitForTimeout(1000);
  // Cột 3 "Người được phân công": dòng đầu là họ tên, dòng sau là số định danh — "… dự khuyết" không tính
  const cacDong = dsNguoi.locator('tbody tr').filter({ hasText: new RegExp(`${vaiTro}(?! dự khuyết)`) });
  if ((await cacDong.count()) >= soNguoi) {
    const ten: string[] = [];
    for (let i = 0; i < (await cacDong.count()); i++) {
      ten.push((await cacDong.nth(i).locator('td').nth(2).innerText()).trim().split('\n')[0].trim());
    }
    return { nguoi: ten, soQD: '' };
  }

  await chonMenu(m, m.page.locator('main'), 'Phân công', menu);
  const bm = popup(m, menu);
  await bm.waitFor({ timeout: 30_000 });
  await m.choTaiXong();

  await m.ngay(bm, 'Ngày quyết định', ngay(0));
  if (nguoiKy) await chonNguoiKy(m, bm, nguoiKy);
  const nguoi: string[] = [];
  for (let i = 0; i < soNguoi; i++) nguoi.push(await themNguoiPhanCong(m, bm, vaiTro, tenNguoi));
  const soQD = await dungSo(m, bm, 'Số quyết định');
  await luuKyDong(m, bm);
  return { nguoi, soQD };
}

/** Mở (nếu đang đóng) mục thu gọn có tiêu đề khớp `tieuDe` — dùng khi tiêu đề đổi theo trạng thái */
export async function moMucKhop(m: ManHinh, tieuDe: RegExp): Promise<Locator> {
  const muc = m.page.locator('.ant-collapse-item').filter({ has: m.page.locator('.ant-collapse-header', { hasText: tieuDe }) }).first();
  const dau = muc.locator('.ant-collapse-header').first();
  await dau.waitFor({ timeout: 30_000 });
  if ((await dau.getAttribute('aria-expanded')) !== 'true') await dau.click();
  await m.choTaiXong(800);
  return muc;
}

// ───────────── Biểu mẫu tab "Chuẩn bị xét xử" / "Xét xử" (bước 08–12) ─────────────

/** File PDF mẫu dùng làm "bản biên bản đã ký" */
export const BAN_KY_MAU = path.join(DATA_DIR, 'files', 'tai-lieu-mau.pdf');

/** Ô chọn biểu mẫu của tab "Chuẩn bị xét xử" và tab "Xét xử" (class riêng của từng ô) */
export const O_BIEU_MAU = { chuanBi: 'bctk-chon-loai-bieu-mau', xetXu: 'bctk-chon-quyet-dinh-hdxx' } as const;

/**
 * Ô chọn biểu mẫu `lop` → gõ mã `ma` (vd. "31") → chọn mục có "(<ma>…-" → bấm `nut` ("Thêm biểu mẫu" / "Thêm mới quyết định").
 * @returns drawer của biểu mẫu (tiêu đề = tên mục đã chọn)
 */
export async function moBieuMau(m: ManHinh, lop: string, ma: string, nut: string): Promise<Locator> {
  const main = m.page.locator('main');
  const o = main.locator(`.ant-select.${lop}`).first();
  await o.waitFor({ timeout: 30_000 });
  await o.locator('.ant-select-selector').click();
  await o.locator('input').first().fill(ma).catch(() => undefined);
  const dd = m.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  const muc = dd.locator('.ant-select-item-option').filter({ hasText: new RegExp(`\\(${ma}[A-Z]?-`) }).first();
  await muc.waitFor({ timeout: 15_000 });
  const ten = (await muc.innerText()).replace(/\s+/g, ' ').trim();
  await muc.click();
  await m.page.waitForTimeout(500);
  await m.nut(main, nut).click();
  const bm = popup(m, ten);
  await bm.waitFor({ timeout: 30_000 });
  await m.choTaiXong(1500);
  return bm;
}

/** Ô giờ (TimePicker "VD: 08:30") theo nhãn: gõ HH:mm → Enter; dropdown còn mở thì bấm "OK" */
export async function gio(m: ManHinh, bm: Locator, nhan: string | RegExp, hhmm: string) {
  const o = m.oTheoNhan(nhan, bm).locator('.ant-picker input').first();
  await o.click();
  await o.fill(hhmm);
  await o.press('Enter');
  // Enter thường đã nhận giờ và đóng dropdown; còn mở thì bấm "OK" (dropdown đang đóng dần cũng khớp → bấm thử, không chờ)
  await m.page.locator('.ant-picker-dropdown .ant-picker-ok button:visible').first().click({ timeout: 2_000 }).catch(() => undefined);
  await expect(o, `Ô "${nhan}" chưa nhận giờ ${hhmm}`).toHaveValue(hhmm, { timeout: 5_000 });
  return hhmm;
}

/** Ô select theo nhãn còn trống thì chọn (`giaTri` hoặc ngẫu nhiên) */
export async function chonNeuTrong(m: ManHinh, bm: Locator, nhan: string | RegExp, giaTri?: string | RegExp) {
  const o = m.oTheoNhan(nhan, bm);
  if (await o.locator('.ant-select-selection-item').count()) return m.docGiaTri(nhan, bm);
  return m.chonTrong(o, giaTri);
}

/** Biểu mẫu thông báo/quyết định: "Lưu" → "… thành công" → "Ký logic" → "Ký logic thành công" → "Đóng" */
export async function luuKyBieuMau(m: ManHinh, bm: Locator) {
  await m.nut(bm, 'Lưu').click();
  await m.choThongBao(/thành công/i);
  const nutKy = m.nut(bm, /Ký logic/);
  await nutKy.waitFor({ timeout: 30_000 });
  await nutKy.click();
  await m.choThongBao(/Ký logic thành công/);
  await m.nut(bm, 'Đóng').click();
  await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  await m.choTaiXong(1000);
}

/**
 * Biên bản: "Lưu" → vùng kéo-thả "Tải bản biên bản đã ký" (hiện sau khi lưu; nạp thẳng PDF mẫu vào input)
 * → "Xác nhận đã ký" → "Đóng"
 */
export async function luuTaiBanKy(m: ManHinh, bm: Locator) {
  await m.nut(bm, 'Lưu').click();
  await m.choThongBao(/thành công/i);
  const tep = m.page.locator('input[name="banBienBanDaKy"]').first();
  await tep.waitFor({ state: 'attached', timeout: 30_000 });
  await tep.setInputFiles(BAN_KY_MAU);
  await m.page.waitForTimeout(800);
  await m.nut(m.page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last(), 'Xác nhận đã ký').click();
  await m.choThongBao(/thành công|đã ký/i);
  await m.nut(bm, 'Đóng').click();
  await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  await m.choTaiXong(1000);
}

/**
 * Bảng danh sách biểu mẫu của tab đang mở đã có dòng khớp `mau` — đã lập ở lượt trước thì bỏ qua.
 * Tab "Chuẩn bị xét xử" ghi cả mã (vd. /31-DS/); tab "Xét xử" chỉ ghi tên (vd. /Biên bản nghị án/).
 */
export async function daCoBieuMau(m: ManHinh, mau: RegExp): Promise<boolean> {
  const bang = m.page.locator('main .ant-table').filter({ has: m.page.locator('.ant-table-row, .ant-table-placeholder') });
  await m.choTaiXong(800);
  // Chỉ tính bản đã ban hành ("Đã có hiệu lực" / "Hoàn thành" / "Đã ký…"); bản lưu dở không hiện ở bảng hoặc chưa có trạng thái này
  const dong = bang.locator('.ant-table-row').filter({ hasText: mau }).filter({ hasText: /Đã có hiệu lực|Hoàn thành|Đã ký/ });
  return (await dong.count()) > 0;
}
