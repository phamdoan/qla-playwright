import { Locator, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BanAn6C, THAM_TRA_VIEN, TK_VU_TRUONG, TrangThai6C } from '../cau-hinh-6C';
import { ngay } from '../../../../utils/fake-data';
import { chonNguoi, chonTab } from './chung';

/** Ô chọn người trong dòng bảng: theo title (họ tên); không có mục theo title thì gõ tìm */
async function chonNguoiTrongDong(m: ManHinh, o: Locator, ten: string) {
  const daChon = await chonNguoi(m, o, ten).then(() => true).catch(() => false);
  if (!daChon) await m.chonTrong(o, ten);
}

/** Ô "Lãnh đạo": chọn ngẫu nhiên một người trong danh sách thực có của ô → trả về tên đã chọn */
async function chonLanhDao(m: ManHinh, o: Locator): Promise<string> {
  await o.locator('.ant-select-selector').first().click();
  const cacMuc = m.page.locator('.ant-select-dropdown:visible .ant-select-item-option');
  // Máy bận: danh sách tải chậm hoặc cú bấm chưa mở được ô (BA 12360 bước 03, 30/10) → đóng, bấm mở lại, chờ lâu hơn
  if (!(await cacMuc.first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false))) {
    await m.page.keyboard.press('Escape');
    await o.locator('.ant-select-selector').first().click();
    await cacMuc.first().waitFor({ timeout: 30_000 });
  }
  const cacTen = (await cacMuc.evaluateAll(es => es.map(e => e.getAttribute('title') || (e as HTMLElement).innerText))).map(t => t.trim()).filter(Boolean);
  const ten = cacTen[Math.floor(Math.random() * cacTen.length)];
  await m.page.keyboard.press('Escape');
  await chonNguoiTrongDong(m, o, ten);
  test.info().annotations.push({ type: 'Lãnh đạo', description: ten });
  return ten;
}

/**
 * BƯỚC 03 · Vụ trưởng · Phân công thẩm tra viên, lãnh đạo (hướng dẫn bước 3)
 *
 *  1. Giám đốc thẩm, tái thẩm › Phân công › Phân công thẩm tra viên → tab "Chưa phân công TTV"
 *     · Hình thức phân công "Hồ sơ kháng nghị GĐT-TT" · Số BA/QĐ → "Tìm kiếm"
 *  2. "Phân công chỉ định" → tick dòng của hồ sơ → trong dòng: ngày + Thẩm tra viên (Mai Hương Sen),
 *     ngày + Lãnh đạo (ngẫu nhiên một người trong danh sách)
 *  3. "Phân công TTV/LĐ" → "Đồng ý"
 * Hồ sơ không còn ở tab "Chưa phân công TTV" (lượt trước) → bỏ qua.
 */
export const buoc03: Buoc<BanAn6C, TrangThai6C> = {
  so: 3,
  ten: 'Vụ trưởng · Phân công thẩm tra viên và lãnh đạo (chỉ định)',
  huongDan: '3',
  chay: async ({ vuAn, moPhien, can }) => {
    const soKhangNghi = can('soKhangNghi', 1);
    const phien = await moPhien(TK_VU_TRUONG);
    const m = new ManHinh(phien.page);
    const main = m.page.locator('main');
    await phien.vao('vu-an/gdt-tt/danh-sach-phan-cong-TTV/danh-sach');
    await m.choTaiXong(2000);
    await m.chon(main, 'Hình thức phân công', /kháng nghị/i);
    await m.choTaiXong(1000);
    await m.nhap(main, 'Số BA/QĐ', vuAn.soBanAn);
    await m.nut(main, 'Tìm kiếm').click();
    await m.choTaiXong(2500);

    // Dòng của hồ sơ: số KN đứng riêng một ô. hasText so với textContent — ô STT "1" dính liền số KN ("17628")
    // → so trên innerText (các ô cách nhau bằng khoảng trắng) để lấy vị trí dòng
    const timDong = async () => {
      await m.choBang(main);
      const cuaHoSo = new RegExp(`(^|\\s)${soKhangNghi}(\\s|$)`);
      const i = (await main.locator('.ant-table-row').allInnerTexts()).findIndex(t => cuaHoSo.test(t) && t.includes(vuAn.soBanAn));
      return i < 0 ? undefined : main.locator('.ant-table-row').nth(i);
    };
    const dong = await timDong();
    if (!dong) {
      // Không ở "Chưa phân công TTV" → lượt trước đã phân công; không ở cả "Đã phân công TTV" → báo lỗi, không bỏ qua âm thầm
      await chonTab(m, 'Đã phân công TTV');
      await m.chon(main, 'Hình thức phân công', /kháng nghị/i);
      await m.nhap(main, 'Số BA/QĐ', vuAn.soBanAn);
      await m.nut(main, 'Tìm kiếm').click();
      await m.choTaiXong(2500);
      if (await timDong()) return;
      throw new Error(`Hồ sơ KN ${soKhangNghi} không có ở tab "Chưa phân công TTV" lẫn "Đã phân công TTV"`);
    }

    await main.locator('.ant-radio-wrapper').filter({ hasText: 'Phân công chỉ định' }).click();
    await m.page.waitForTimeout(1000);
    await dong.locator('input[type=checkbox]').first().check();
    await m.page.waitForTimeout(1000);

    const cacNgay = dong.locator('.ant-picker input');
    for (let i = 0; i < (await cacNgay.count()); i++) {
      const o = cacNgay.nth(i);
      await o.click();
      await o.fill(ngay(0));
      await o.press('Enter');
    }
    // Theo thứ tự cột (chọn xong chữ gợi ý "Chọn TTV" mất → không lọc theo chữ): ô 1 Thẩm tra viên, ô 2 Lãnh đạo
    await chonNguoiTrongDong(m, dong.locator('.ant-select').nth(0), THAM_TRA_VIEN);
    await chonLanhDao(m, dong.locator('.ant-select').nth(1));

    await m.nut(main, /Phân công TTV\/LĐ/).click();
    // Hộp "Xác nhận … lưu phân công TTV" là modal thường (không phải .ant-modal-confirm) → bấm "Đồng ý" trực tiếp
    const hoi = m.page.locator('.ant-modal-wrap:visible .ant-modal').filter({ hasText: /phân công TTV/i }).last();
    await hoi.waitFor({ timeout: 15_000 });
    await m.nut(hoi, 'Đồng ý').click();
    await m.choThongBao(/Phân công TTV\/LĐ thành công/);
  },
};
