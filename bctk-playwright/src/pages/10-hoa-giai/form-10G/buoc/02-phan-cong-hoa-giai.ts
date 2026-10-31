import { expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai10G } from '../cau-hinh-10G';
import { hoaGiai, moChiTietDon } from './chung';

/**
 * BƯỚC 02 · Phân công Thẩm phán hòa giải (hướng dẫn "Xử lý chi tiết đơn" b1–b2)
 *
 *  1. Mở chi tiết đơn → tab "Phân công"
 *  2. "Phân công" › "Phân công Thẩm phán hoà giải" → popup quyết định phân công
 *  3. Vai trò "Thẩm phán phụ trách hòa giải" → chọn một người được phân công → mũi tên thêm vào bảng
 *  4. "Dùng số" (nút link ngay dưới ô "Số văn bản phân công", điền số gợi ý) → "Lưu" → "Ký logic" → "Đóng"
 *     (người ký mặc định là chính tài khoản đang dùng)
 */
export const buoc02: Buoc<DonNguon, TrangThai10G> = {
  so: 2,
  ten: 'Phân công Thẩm phán hòa giải, dùng số, ký logic',
  huongDan: 'b1–b2',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const m = await moChiTietDon(await moPhien(tkToa(vuAn.toaAn)), can('urlDon', 1));
    await m.moTab('phan-cong');
    const main = m.page.locator('main');

    // Lượt trước đã có quyết định phân công thẩm phán hòa giải (có hoặc chưa có số) → đọc lại số và thẩm phán
    const bangPC = main.locator('.ant-table-tbody tr.ant-table-row');
    await bangPC.first().or(main.locator('.ant-table-placeholder').first()).first().waitFor({ timeout: 30_000 });
    const daCo = bangPC.filter({ hasText: hoaGiai('Quyết định phân công thẩm phán hòa giải') }).first();
    if (await daCo.count()) {
      const tp = (await bangPC.filter({ hasText: hoaGiai('Thẩm phán hòa giải') }).filter({ hasNotText: hoaGiai('Quyết định phân công') }).first().innerText().catch(() => ''))
        .replace(/\s+/g, ' ')
        .match(/Thẩm phán h(?:òa|oà) giải\s+(.+?)\s*\(/)?.[1];
      return { soQuyetDinhPhanCong: (await daCo.innerText()).match(/\S+\/QĐ-\S+/)?.[0] ?? '', thamPhanHoaGiai: tp };
    }

    await m.nut(main, 'Phân công').click();
    await m.page.locator('.ant-dropdown:visible li').filter({ hasText: hoaGiai('Phân công Thẩm phán hòa giải') }).first().click();
    const bm = m.popup(hoaGiai('Quyết định phân công Thẩm phán phụ trách hòa giải'));
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    await m.chon(bm, 'Vai trò', hoaGiai('Thẩm phán phụ trách hòa giải'));
    await m.page.waitForTimeout(800);
    const thamPhan = (await m.chon(bm, 'Người được phân công')).split(' - ')[0].trim();
    await bm.locator('button:has(.anticon-arrow-down)').first().click();
    await bm.locator('.ant-table-row').filter({ hasText: thamPhan }).first().waitFor({ timeout: 15_000 });

    // HD b2.6: nút link "Dùng số <số gợi ý>" ngay dưới ô "Số văn bản phân công" → bấm để điền số (thay cho "Lấy số")
    const oSo = m.oTheoNhan('Số văn bản phân công', bm).locator('input');
    const nutDungSo = m.nut(bm, /Dùng số/);
    if (await nutDungSo.isVisible().catch(() => false)) {
      await nutDungSo.click();
      await expect(oSo, 'Bấm "Dùng số" nhưng ô "Số văn bản phân công" vẫn trống').not.toHaveValue('', { timeout: 10_000 });
    } else {
      test.info().annotations.push({ type: 'Dùng số', description: 'Không thấy nút "Dùng số" dưới ô "Số văn bản phân công"' });
    }
    let soQuyetDinhPhanCong = await oSo.inputValue().catch(() => '');

    await m.nut(bm, 'Lưu').click();
    await m.choThongBao(/Lưu quyết định thành công/);
    // Lưu xong thanh nút đổi (… | Ký số | Ký logic…) → chờ "Ký logic" hiện rồi ký
    const nutKy = m.nut(bm, /Ký logic/);
    await nutKy.waitFor({ timeout: 30_000 });
    await nutKy.click();
    await m.choThongBao(/Ký logic thành công/);
    // Không có "Dùng số" thì hệ thống có thể cấp số khi ký → đọc lại
    if (!soQuyetDinhPhanCong) soQuyetDinhPhanCong = await oSo.inputValue().catch(() => '');
    await m.nut(bm, 'Đóng').click();
    await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    if (!soQuyetDinhPhanCong) {
      // Vẫn chưa có → đọc ở dòng quyết định trong bảng phân công (nếu có)
      await m.choTaiXong(1500);
      const dongQD = bangPC.filter({ hasText: hoaGiai('Quyết định phân công thẩm phán hòa giải') }).first();
      soQuyetDinhPhanCong = (await dongQD.innerText().catch(() => '')).match(/\S+\/QĐ-\S+/)?.[0] ?? '';
    }
    return { soQuyetDinhPhanCong, thamPhanHoaGiai: thamPhan };
  },
};
