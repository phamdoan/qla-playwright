import { expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BanAn2D, TK_LANH_DAO, TK_VU_TRUONG, TrangThai2D } from '../cau-hinh-2D';
import { ngay } from '../../../../utils/fake-data';
import { chonNguoi, locTheoBanAn } from './chung';

/**
 * Hai biểu mẫu lập ở chi tiết hội đồng (theo hướng dẫn): `menu` = chữ mục trong "Thêm biểu mẫu",
 * `bang` = tên hiện ở bảng "Quyết định/Thông báo" sau khi lưu (quyết định đổi tên thành "… phân công Hội đồng xét xử …")
 */
const BIEU_MAU = [
  { menu: /Quyết định thành lập hội đồng xét xử/i, bang: /Quyết định (thành lập|phân công) Hội đồng xét xử/i },
  { menu: /Công văn mời Viện kiểm sát/i, bang: /Công văn mời Viện kiểm sát/i },
];

/**
 * Popup biểu mẫu vừa mở: ngày = hôm nay · Người ký = lãnh đạo · nội dung (nếu trống) · một nơi nhận
 * → "Lưu" → "Lấy số" → "Trình ký" → "Gửi" (nếu có hộp nhập thông tin trình duyệt)
 */
async function dienVaTrinhKy(m: ManHinh, tenMau: RegExp) {
  const p = m.page;
  const d = p.locator('.ant-modal-wrap:visible .ant-modal, .ant-drawer-open .ant-drawer-content').filter({ hasText: tenMau }).last();
  await d.waitFor({ timeout: 30_000 });
  await m.choTaiXong(2000);

  // Ô ngày có khi bị khóa (hệ thống điền khi lấy số) → chỉ điền khi nhập được
  const oNgay = m.oTheoNhan(/^\s*Ngày (quyết định|thông báo|công văn|ban hành)/, d).locator('.ant-picker input').first();
  if (await oNgay.isEnabled().catch(() => false)) await m.ngay(d, /^\s*Ngày (quyết định|thông báo|công văn|ban hành)/, ngay(0));
  await chonNguoi(m, m.oTheoNhan(/^\s*Người ký/, d), TK_LANH_DAO.ten!);
  const noiDung = d.locator('textarea').first();
  if ((await noiDung.count()) && !(await noiDung.inputValue())) {
    await noiDung.fill('Căn cứ Bộ luật Tố tụng dân sự năm 2015 và quyết định kháng nghị giám đốc thẩm của Chánh án Tòa án nhân dân tối cao.');
  }

  // Cấu hình nơi nhận: thêm một dòng → phân loại (mục đầu) → nơi nhận chi tiết (mục đầu) → "Lưu" của dòng
  await m.nut(d, /Thêm (mới )?nơi nhận|Thêm mới nhận/).click();
  const bang = d.locator('.ant-table').filter({ hasText: /Phân loại nơi nhận/ }).last();
  const dong = bang.locator('.ant-table-row').last();
  await m.chonTrong(dong.locator('.ant-select').nth(0));
  await p.waitForTimeout(800);
  await m.chonTrong(dong.locator('.ant-select').nth(1));
  await dong.locator('a').filter({ hasText: /^\s*Lưu\s*$/ }).click();
  await p.waitForTimeout(800);

  await m.nut(d, /^\s*Lưu\s*$/).click();
  await m.choThongBao(/thành công|Đã lưu/i);
  await m.choTaiXong(1500);
  const nutLaySo = m.nut(d, 'Lấy số');
  if (await nutLaySo.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false)) {
    await nutLaySo.click();
    await m.choTaiXong(1500);
  }
  await m.nut(d, 'Trình ký').click();
  const gui = p.locator('.ant-modal-wrap:visible .ant-modal').filter({ has: p.locator('button', { hasText: /^\s*Gửi\s*$/ }) }).last();
  if (await gui.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false)) await m.nut(gui, /^\s*Gửi\s*$/).click();
  await m.choTaiXong(2000);
  // Đóng popup biểu mẫu nếu còn mở
  if (await d.isVisible().catch(() => false)) await m.nut(d, 'Đóng').click().catch(() => undefined);
}

/**
 * BƯỚC 07 · Vụ trưởng · Quyết định thành lập HĐXX và công văn mời VKS, trình ký (hướng dẫn bước 7)
 *
 *  1. Giám đốc thẩm, tái thẩm › Phân công › Phân công Hội đồng xét xử → dòng hội đồng của hồ sơ (Kháng nghị: <số KN>)
 *     → "Xem chi tiết"
 *  2. Mục "Quyết định/Thông báo" → "Thêm biểu mẫu" cho từng mẫu: "Quyết định thành lập hội đồng xét xử",
 *     "GDT_Công văn mời Viện kiểm sát tham gia phiên tòa"
 *  3. Mỗi mẫu: ngày hôm nay · Người ký = lãnh đạo · nơi nhận → "Lưu" → "Lấy số" → "Trình ký" → "Gửi"
 * Mẫu đã có trong danh sách (lượt trước) → không lập lại.
 */
export const buoc07: Buoc<BanAn2D, TrangThai2D> = {
  so: 7,
  ten: 'Vụ trưởng · Quyết định thành lập HĐXX, công văn mời VKS — lấy số, trình ký',
  huongDan: '7',
  chay: async ({ vuAn, moPhien, can }) => {
    // Hai biểu mẫu, mỗi mẫu Lưu → Lấy số → Trình ký → Gửi: trên staging gần chạm 300s mặc định
    test.setTimeout(600_000);
    const soKhangNghi = can('soKhangNghi', 1);
    const phien = await moPhien(TK_VU_TRUONG);
    const m = new ManHinh(phien.page);
    const main = m.page.locator('main');
    await phien.vao('vu-an/gdt-tt/phan-cong-hoi-dong-xet-xu/danh-sach');
    await m.choTaiXong(3000);
    await locTheoBanAn(m, vuAn.soBanAn);
    const dong = main.locator('.ant-table-row').filter({ hasText: new RegExp(`Kháng nghị:\\s*${soKhangNghi}(?!\\d)`) }).first();
    await expect(dong, `Không thấy hội đồng của hồ sơ KN ${soKhangNghi} ở "Phân công Hội đồng xét xử"`).toBeVisible({ timeout: 30_000 });
    await dong.locator('td').last().locator('button, a').first().click();
    await m.page.waitForURL(/chi-tiet-hdxx/, { timeout: 60_000 });
    await m.choTaiXong(2500);
    const urlHoiDong = m.page.url();

    const bangQD = main.locator('.ant-table').filter({ hasText: 'Tên biểu mẫu' }).last();
    for (const mau of BIEU_MAU) {
      await m.choBang(bangQD);
      if (await bangQD.locator('.ant-table-row').filter({ hasText: mau.bang }).count()) continue;
      await m.nut(main, 'Thêm biểu mẫu').click();
      await m.page.locator('.ant-dropdown:visible li').filter({ hasText: mau.menu }).first().click();
      await dienVaTrinhKy(m, mau.menu);
      await phien.vao(urlHoiDong);
      await m.choTaiXong(2500);
    }
    // Số văn bản (cột "Số quyết định", vd. "444/QĐ-TANDTC") — bước 08 dùng để ký đúng văn bản
    const soVanBan: string[] = [];
    for (const mau of BIEU_MAU) {
      const d = bangQD.locator('.ant-table-row').filter({ hasText: mau.bang }).first();
      await expect(d, `Chưa có biểu mẫu ${mau.bang} trong danh sách Quyết định/Thông báo`).toBeVisible({ timeout: 30_000 });
      soVanBan.push(await m.docCot(d, 'Số quyết định'));
    }
    return { urlHoiDong, soQDHoiDong: soVanBan[0], soCongVanVKS: soVanBan[1] };
  },
};
