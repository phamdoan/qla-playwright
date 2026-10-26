import { Locator, expect } from '@playwright/test';
import { ManHinh, dungChu } from '../../../base.page';
import { PhienDangNhap } from '../../../common/login.page';

/**
 * Thao tác màn hình DÙNG CHUNG cho nhiều bước của luồng 1A1.
 * Thao tác riêng của bước nào nằm ngay trong file bước đó. Giao diện đổi → chỉ sửa trong thư mục buoc/.
 */

export const ngauNhien = <T>(ds: T[]) => ds[Math.floor(Math.random() * ds.length)];
export const soNgauNhien = (doDai: number) =>
  String(1 + Math.floor(Math.random() * 9)) + Array.from({ length: doDai - 1 }, () => Math.floor(Math.random() * 10)).join('');
/** Ngày sinh dd/mm/yyyy, năm trong khoảng 1965–2000 */
export const ngaySinh = () =>
  `${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}/${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}/${1965 + Math.floor(Math.random() * 36)}`;

/**
 * [Bước 03–07] Mở chi tiết vụ án theo link (bước 02 để lại) và chờ trang vẽ xong.
 * Đi bằng link (goto) chứ không F5: tải lại trang chi tiết đôi khi nhảy sang trang 404.
 */
export async function moVuAn(phien: PhienDangNhap, urlVuAn: string): Promise<ManHinh> {
  await phien.vao(urlVuAn);
  const m = new ManHinh(phien.page);
  await m.page.locator('[role=tab][id$="-tab-thu-ly"]').waitFor({ timeout: 60_000 });
  await m.choTaiXong(1500);
  return m;
}

/** Dòng chữ đầu trang chi tiết: "Mã vụ án: VA26-… · Số thụ lý: 78 · Ngày thụ lý: …" */
export async function dauTrangVuAn(m: ManHinh): Promise<string> {
  return (await m.page.locator('main').innerText()).match(/Mã vụ án:[^\n]*/)?.[0] ?? '';
}

/**
 * Ô "Thêm người tham gia tố tụng" là form tự viết (không phải form antd): nhãn là thẻ <label>,
 * ô là input/select thường. Lấy ô `chon` nằm cùng khối với nhãn bắt đầu bằng `nhan`.
 */
export function oNtg(d: Locator, nhan: string | RegExp, chon: string): Locator {
  const mau = typeof nhan === 'string' ? new RegExp(`^\\s*${nhan.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) : nhan;
  return d.locator('div').filter({ has: d.page().locator('label', { hasText: mau }) }).filter({ has: d.page().locator(chon) }).last().locator(chon).first();
}

/**
 * Ô ngày của form người tham gia tố tụng: placeholder ghi "mm/dd/yyyy" nhưng thực tế chỉ nhận dd/mm/yyyy
 * (gõ mm/dd thì Enter xong ô trống) → gõ dd/mm/yyyy rồi Enter, kiểm lại giá trị.
 */
export async function ngayNtg(o: Locator, ddmmyyyy: string) {
  await o.click();
  await o.fill(ddmmyyyy);
  await o.press('Enter');
  await expect(o, `Ô ngày không nhận ${ddmmyyyy}`).toHaveValue(ddmmyyyy, { timeout: 5_000 });
}

/**
 * Chọn trong select antd rồi KIỂM ô đã nhận đúng mục; chưa nhận thì bấm lại theo title của mục.
 * (Ô "Viện kiểm sát" khi thụ lý: lần bấm đầu có lúc không ăn dù dropdown đã đóng.)
 */
export async function chonChac(m: ManHinh, item: Locator, giaTri: string) {
  await m.chonTrong(item, giaTri);
  const daChon = item.locator('.ant-select-selection-item');
  if ((await daChon.allInnerTexts()).some(t => t.includes(giaTri))) return;
  await item.locator('.ant-select-selector').first().click();
  await m.page.locator(`.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option[title="${giaTri}"]`).first().click();
  await expect(daChon.first(), `Chưa chọn được "${giaTri}"`).toContainText(giaTri, { timeout: 5_000 });
}

/**
 * [Bước 06, 07] Tab "Phân công" › "Phân công" › `menu` → popup quyết định:
 *   Vai trò `vaiTro` → chọn ngẫu nhiên người được phân công → mũi tên thêm vào bảng
 *   → "Dùng số" → "Lưu" → "Ký logic" → "Đóng".
 * Lượt trước đã có quyết định cho vai trò này thì không tạo lại, chỉ đọc số và người được phân công.
 * @returns số quyết định và tên người được phân công
 */
export async function phanCongVaKy(m: ManHinh, menu: string, vaiTro: string, loaiTru?: RegExp) {
  await m.moTab('phan-cong');
  const muc = await m.moMuc('Danh sách quyết định phân công');
  await m.choBang(muc);
  let dongQD = muc.locator('.ant-table-row').filter({ hasText: vaiTro });
  if (loaiTru) dongQD = dongQD.filter({ hasNotText: loaiTru });
  if (await dongQD.count()) {
    return { soQD: await m.docCot(dongQD.first(), 'Số QĐ'), nguoi: await m.docCot(dongQD.first(), 'Người được phân công') };
  }

  await m.nut(muc, 'Phân công').click();
  await m.page.locator('.ant-dropdown:visible [role=menuitem]').filter({ hasText: dungChu(menu) }).first().click();
  const bm = m.popup(menu);
  await bm.waitFor({ timeout: 30_000 });
  await m.choTaiXong();

  await m.chon(bm, 'Vai trò', vaiTro);
  await m.page.waitForTimeout(500);
  const nguoi = (await m.chon(bm, 'Tên người được phân công')).split(' - ')[0].trim();
  await bm.locator('button:has(.anticon-arrow-down)').first().click();
  await bm.locator('tbody tr').filter({ hasText: nguoi }).first().waitFor({ timeout: 15_000 });

  // Nút link "Dùng số <số gợi ý>" dưới ô "Số quyết định" → bấm để điền số
  const oSo = m.oTheoNhan('Số quyết định', bm).locator('input').first();
  await m.nut(bm, /Dùng số/).click();
  await expect(oSo, 'Bấm "Dùng số" nhưng ô "Số quyết định" vẫn trống').not.toHaveValue('', { timeout: 10_000 });
  const soQD = await oSo.inputValue();

  await m.nut(bm, 'Lưu').click();
  await m.choThongBao(/Lưu quyết định thành công/);
  const nutKy = m.nut(bm, /Ký logic/);
  await nutKy.waitFor({ timeout: 30_000 });
  await nutKy.click();
  await m.choThongBao(/Ký logic thành công/);
  await m.nut(bm, 'Đóng').click();
  await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  return { soQD, nguoi };
}
