import { Locator, expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai10C } from '../cau-hinh-10C';
import { hoaGiai, moChiTietDon } from './chung';

/**
 * BƯỚC 03 · Biểu mẫu 01-HG (hướng dẫn b3)
 *
 *  1. Mở chi tiết đơn → tab "Hòa giải"
 *  2. Mục "Thông báo về quyền lựa chọn hòa giải" › "Biểu mẫu hòa giải" ›
 *     "Thông báo về quyền lựa chọn hòa giải và lựa chọn Hòa giải viên (…) (01-HG)"
 *  3. "Dùng số" (nút link ngay dưới ô "Số quyết định", điền số gợi ý vào ô) → "Lưu" → "Ký logic" → "Đóng"
 */
export const buoc03: Buoc<DonNguon, TrangThai10C> = {
  so: 3,
  ten: 'Lập thông báo 01-HG, ký logic',
  huongDan: 'b3',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const m = await moChiTietDon(await moPhien(tkToa(vuAn.toaAn)), can('urlDon', 1));
    await m.moTab('hoa-giai-doi-thoai');
    const main = m.page.locator('main');

    // Bảng thông báo (cột "Số TB, ngày TB") đã có thông báo 01-HG ở lượt trước → đọc lại số
    const bangTB = main.locator('.ant-table-wrapper').filter({ hasText: 'Số TB, ngày TB' }).first();
    await m.choBang(bangTB);
    // Cột "Số TB, ngày TB": dòng đầu là số (có lúc chỉ là số trần, vd. 435839, không có đuôi /TB-…)
    const soTB = async (dong: Locator) => (await m.docCot(dong, 'Số TB, ngày TB')).trim().split(/\s+/)[0];
    const daCo = bangTB.locator('.ant-table-row').filter({ hasText: hoaGiai('Thông báo về quyền lựa chọn hòa giải') }).first();
    if (await daCo.count()) return { soThongBao01HG: await soTB(daCo) };

    // Màn có nhiều nút "Biểu mẫu hòa giải"; nút đầu thuộc mục "Thông báo về quyền lựa chọn hòa giải"
    await main.locator('button').filter({ hasText: hoaGiai('Biểu mẫu hòa giải') }).first().click();
    await m.page.locator('.ant-dropdown:visible li').filter({ hasText: /\(01-HG\)/ }).first().click();
    const bm = m.popup(/\(01-HG\)/);
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    // Nút link "Dùng số <số gợi ý>" ngay dưới ô "Số quyết định" → bấm để điền số vào ô
    const nutDungSo = m.nut(bm, /Dùng số/);
    if (await nutDungSo.isVisible().catch(() => false)) {
      await nutDungSo.click();
      await expect(m.oTheoNhan('Số quyết định', bm).locator('input'), 'Bấm "Dùng số" nhưng ô "Số quyết định" vẫn trống').not.toHaveValue('', {
        timeout: 10_000,
      });
    } else {
      test.info().annotations.push({ type: 'Dùng số', description: 'Không thấy nút "Dùng số" dưới ô "Số quyết định"' });
    }

    await m.nut(bm, 'Lưu').click();
    await m.choThongBao(/Lưu quyết định thành công/);
    await m.nut(bm, /Ký logic/).click();
    await m.choThongBao(/Ký logic thành công/);
    await m.nut(bm, 'Đóng').click();
    await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    await m.choTaiXong(1500);

    const dong = bangTB.locator('.ant-table-row').filter({ hasText: hoaGiai('Thông báo về quyền lựa chọn hòa giải') }).first();
    await dong.waitFor({ timeout: 30_000 });
    return { soThongBao01HG: await soTB(dong) };
  },
};
