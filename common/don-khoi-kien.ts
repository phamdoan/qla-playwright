/**
 * Thao tác dùng chung của màn "Thêm mới đơn khởi kiện và yêu cầu".
 *
 * Tách ra từ tests/don-khoi-kien-dan-su-26-09-2026.spec.ts (30/09/2026) để luồng Kinh doanh thương
 * mại dùng lại, không chép code. Không thêm logic mới ở đây.
 */
import { Locator, Page, expect } from '@playwright/test';
import { chonNgay, chonSelect, choHetSpin, go, hienTrong, nghi, nguyenNhanLoi, toastDaHien } from './antd';
import { giaTri } from './cau-hinh-luong';
import { dienFormNguoi } from './form-nguoi';

export const khungSelectCua = (o: import('@playwright/test').Locator) =>
  o.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');

export async function chonDanhMucThongKe(
  page: import('@playwright/test').Page,
  o: import('@playwright/test').Locator,
  tuKhoa: string,
): Promise<{ qhplDaChon: string; soMuc: number }> {
  const khung = khungSelectCua(o);
  const daChon = async () => (await khung.locator('.ant-select-selection-item').first().innerText().catch(() => '')).trim();

  for (let lan = 0; lan < 3; lan++) {
    await khung.click();
    await o.fill(tuKhoa);
    await nghi(page, 1500, 2500);

    const idList = (await o.getAttribute('aria-controls')) || '';
    const soMuc = await page.evaluate(id => {
      const list = id ? document.getElementById(id) : null;
      const hop = (list && list.closest('.ant-select-dropdown')) || document;
      return hop.querySelectorAll('.ant-select-item-option').length;
    }, idList);
    if (!soMuc) {
      await page.keyboard.press('Escape');
      continue;
    }

    // Lấy mục đầu tiên trong danh sách đã lọc (chọn bất kỳ, không random để khỏi chập chờn)
    await o.press('Enter');
    await nghi(page, 800, 1200);

    const ten = await daChon();
    if (ten) return { qhplDaChon: ten, soMuc };
  }
  throw new Error(`Không chọn được "Quan hệ pháp luật (Thống kê)" với từ khoá "${tuKhoa}"`);
}

async function chonTuCachThamGia(
  page: import('@playwright/test').Page,
  form: import('@playwright/test').Locator,
  tuCach: string,
) {
  const o = form
    .locator('.ant-form-item')
    .filter({ has: page.locator('label', { hasText: 'Tư cách tham gia tố tụng' }) })
    .first()
    .locator('[role="combobox"]')
    .first();
  await expect(o, 'Không thấy ô "Tư cách tham gia tố tụng"').toBeVisible({ timeout: 30_000 });

  for (let lan = 0; lan < 3; lan++) {
    if ((await o.getAttribute('aria-expanded')) !== 'true') await o.click();
    const bang = form.locator('[role="listbox"]').first();
    await expect(bang, 'Bấm ô tư cách nhưng danh sách không mở').toBeVisible({ timeout: 10_000 });
    const muc = bang.getByText(tuCach, { exact: true }).first();
    if (await hienTrong(muc, 10_000)) {
      await muc.click();
      await nghi(page, 600, 1000);
      // Danh sách cho chọn nhiều nên vẫn mở sau khi chọn → đóng lại để không che các ô phía dưới
      if ((await o.getAttribute('aria-expanded')) === 'true') await o.click();
      await expect(o.getByText(tuCach, { exact: true }).first(), `Chọn tư cách "${tuCach}" không ăn`).toBeVisible({
        timeout: 10_000,
      });
      return;
    }
    await page.keyboard.press('Escape');
    await nghi(page, 500, 800);
  }
  throw new Error(`Không thấy tư cách "${tuCach}" trong danh sách`);
}

export async function themNguoiThamGia(
  page: import('@playwright/test').Page,
  tuCach: string,
  nguoi: import('../common/du-lieu-dan-su').NguoiDanSu,
  nutKetThuc: 'Lưu & Thêm mới' | 'Lưu',
) {
  // "Lưu & Thêm mới" giữ nguyên drawer và tự xoá trắng form → người thứ hai trở đi không bấm lại
  // nút "Thêm người tham gia" (nút nằm dưới lớp phủ của drawer, bấm sẽ bị chặn).
  const form = page.locator('.ant-drawer-content').filter({ hasText: 'Thêm mới thành phần tham gia tố tụng' }).last();
  if (!(await hienTrong(form, 3_000))) {
    await page.getByRole('button', { name: /Thêm người tham gia/ }).first().click();
    await expect(form, 'Không mở được form Thêm mới thành phần tham gia tố tụng').toBeVisible({ timeout: 30_000 });
  }
  await expect(form.locator('#conNguoi_hoTen'), 'Form đương sự chưa render xong').toBeVisible({ timeout: 30_000 });
  await nghi(page, 1200, 2000);

  await chonTuCachThamGia(page, form, tuCach);

  // Thông tin chung
  await go(form.locator('#conNguoi_hoTen'), nguoi.hoTen);
  await chonSelect(page, form.locator('#conNguoi_maGioiTinh'), undefined, { goDeLoc: false });
  // Ô ngày sinh là input chữ, nhận "dd/mm/yyyy hoặc yyyy" → Excel chỉ cho tuổi nên nhập năm sinh.
  // Nhiều dòng Excel không ghi tuổi (vd "Nguyễn Du") trong khi form bắt buộc ngày sinh → dùng tuổi
  // mặc định khai trong config (nghiepVu.tuoiMacDinhDuongSu) để giá trị vẫn là một năm sinh hợp lý.
  const namSinh = nguoi.namSinh ?? new Date().getFullYear() - Number(giaTri('tuoiMacDinhDuongSu'));
  await go(form.locator('#conNguoi_ngaySinh'), String(namSinh));
  await form.locator('#conNguoi_ngaySinh').blur();
  // b6.4 — "Số định danh cá nhân": tick ô "Chưa xác định" (dữ liệu Excel không có số định danh)
  // Ô tick nằm trong addonBefore của ô "Số định danh cá nhân" (div.cccd-addon-checkbox), không có nhãn chữ
  const khungChuaXacDinh = form.locator('.cccd-addon-checkbox').first();
  const oChuaXacDinh = khungChuaXacDinh.locator('input[type="checkbox"]').first();
  // Input thật của antd bị che nên click thẳng vào nó không đổi trạng thái → click vào khung bọc
  if (!(await oChuaXacDinh.isChecked())) await khungChuaXacDinh.click();
  await expect(oChuaXacDinh, 'Không tick được "Chưa xác định" của Số định danh cá nhân').toBeChecked({ timeout: 10_000 });
  await nghi(page, 500, 900);

  // Thông tin địa chỉ: Excel không có địa chỉ → tick "Không có thông tin" cho mọi dòng địa chỉ.
  // Panel đã mở sẵn, không bấm tiêu đề panel.
  const oKhongCo = form.locator('input[type="checkbox"][id^="khongCoDiaChiTheoLoai"]');
  await expect(oKhongCo.first(), 'Không thấy ô "Không có thông tin" của địa chỉ').toBeVisible({ timeout: 30_000 });
  const soO = await oKhongCo.count();
  for (let i = 0; i < soO; i++) await oKhongCo.nth(i).check({ force: true });
  await nghi(page, 600, 1000);

  await form.getByRole('button', { name: nutKetThuc === 'Lưu' ? /^Lưu$/ : /^Lưu & Thêm mới$/ }).last().click();
  await toastDaHien(page, /Đã lưu đương sự|thành công/i, 60_000, /Không thể lưu|Vui lòng|thất bại/i);
  await nghi(page, 1200, 2000);
}
