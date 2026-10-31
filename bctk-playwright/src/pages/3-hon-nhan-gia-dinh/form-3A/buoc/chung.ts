import { Locator, expect } from '@playwright/test';
import { ManHinh } from '../../../base.page';
import { PhienDangNhap } from '../../../common/login.page';
import { ngay } from '../../../../utils/fake-data';

/**
 * Thao tác màn hình DÙNG CHUNG cho nhiều bước của luồng 3A.
 * Thao tác riêng của bước nào nằm ngay trong file bước đó. Giao diện đổi → chỉ sửa trong thư mục buoc/.
 */

/** Popup của màn: modal hoặc drawer (màn vụ án sơ thẩm dùng drawer) */
const POPUP = '.ant-modal-wrap:visible .ant-modal, .ant-drawer-open .ant-drawer-content';

/**
 * Vào link chi tiết, chờ tab "Thông tin chung" hiện. Hệ thống đôi khi nhảy sang trang 404 hoặc hiện trang trống
 * → trang trống / 404 / bị đẩy đi thì mở Dashboard rồi vào lại link, đến khi hiện giao diện (PhienDangNhap.vaoCho)
 */
async function vaoChiTiet(phien: PhienDangNhap, url: string): Promise<ManHinh> {
  const m = new ManHinh(phien.page);
  await phien.vaoCho(url, m.page.locator('[role=tab][id$="-tab-thong-tin-chung"]'));
  await m.choTaiXong(1500);
  return m;
}

/** [Bước 02–07] Mở chi tiết đơn theo link (bước 01 để lại) */
export const moChiTietDon = (phien: PhienDangNhap, urlDon: string) => vaoChiTiet(phien, urlDon);

/** [Bước 08–10] Mở chi tiết vụ án sơ thẩm theo link (bước 07 để lại) */
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
 * Chọn vai trò + người được phân công rồi bấm mũi tên thêm vào bảng; trả về TÊN ĐỌC TỪ BẢNG.
 * (Chọn ngẫu nhiên trong danh sách ảo đôi khi trúng người khác với tên vừa đọc → lấy tên ở dòng mới thêm.)
 */
export async function themNguoiPhanCong(m: ManHinh, bm: Locator, vaiTro: string): Promise<string> {
  const bang = bm.locator('tbody tr').filter({ hasNotText: 'Không có dữ liệu' });
  const truoc = await bang.count();
  await m.chon(bm, 'Vai trò', vaiTro);
  await m.page.waitForTimeout(500);
  await m.chon(bm, 'Tên người được phân công');
  await bm.locator('button:has(.anticon-arrow-down)').first().click();
  await expect(bang, 'Người được phân công chưa vào bảng').toHaveCount(truoc + 1, { timeout: 15_000 });
  // Dòng: "<STT> <Vai trò> <Họ tên> (<ngày sinh>)" — bỏ STT, vai trò và phần ngày sinh
  const chu = (await bang.nth(truoc).innerText()).replace(/\s+/g, ' ').trim();
  return chu.replace(/^\d+\s*/, '').replace(new RegExp(`^${vaiTro}\\s*`), '').replace(/\s*\(.*$/, '').trim();
}


/**
 * [Bước 08–10] Tab "Phân công" của vụ án › "Phân công" › `menu` → drawer quyết định:
 *   Ngày quyết định = hôm nay · Người ký = chủ tài khoản · `soNguoi` lần (Vai trò `vaiTro` → người ngẫu nhiên → mũi tên)
 *   → "Dùng số" → "Lưu" → "Ký logic" → "Đóng".
 * Lượt trước đã có đủ người cho vai trò này trong "Danh sách người tiến hành tố tụng" → không phân công lại.
 * @returns tên người được phân công (đọc từ bảng) và số quyết định
 */
export async function phanCongVuAn(m: ManHinh, menu: string, vaiTro: string, soNguoi: number, nguoiKy?: string) {
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
  for (let i = 0; i < soNguoi; i++) nguoi.push(await themNguoiPhanCong(m, bm, vaiTro));
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
