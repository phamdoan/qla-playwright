import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai10A } from '../cau-hinh-10A';
import { hoaGiai, ketThucKhac, lapBieuMauKyLogic, moChiTietDon, soVanBan } from './chung';

/**
 * BƯỚC 06 · Thông báo chuyển vụ việc sang hòa giải — Mẫu 07 (hướng dẫn b5)
 *
 *  1. Mở chi tiết đơn → tab "Hòa giải" → mục "Thông báo chuyển vụ việc sang hòa giải" › "Biểu mẫu hòa giải" ›
 *     "Thông báo về việc chuyển vụ việc sang hòa giải (Dành cho Thẩm phán được phân công) (07-HG)"
 *  2. Ngày quyết định = hôm nay → "Dùng số" → "Lưu" → "Ký logic" → "Đóng"
 */
export const buoc06: Buoc<DonNguon, TrangThai10A> = {
  so: 6,
  ten: 'Lập thông báo chuyển vụ việc sang hòa giải (07-HG), ký logic',
  huongDan: 'b5',
  chay: async ({ vuAn, moPhien, tkToa, can, tt }) => {
    if (tt.ketThucKhac) return;
    const m = await moChiTietDon(await moPhien(tkToa(vuAn.toaAn)), can('urlDon', 1));
    await m.moTab('hoa-giai-doi-thoai');
    const main = m.page.locator('main');
    const kt = await ketThucKhac(m);
    if (kt) return { ketThucKhac: kt };

    const daCo = await soVanBan(m, hoaGiai('Thông báo về việc chuyển vụ việc sang hòa giải'));
    // Số trần (vd. 435796, chưa có đuôi /TB-TA) là bản nháp chưa ban hành → ghi nhận kết quả bị chặn "Chỉ ghi nhận kết quả sau khi ban hành Mẫu 07"
    if (daCo?.includes('/')) return { soTBChuyenHoaGiai: daCo };

    // Tab có 3 nút "Biểu mẫu hòa giải" (01-HG, 07-HG, giấy mời) → mở lần lượt đến nút có mục (07-HG) — đơn hành chính: (07-ĐT)
    const cacNut = main.locator('button').filter({ hasText: hoaGiai('Biểu mẫu hòa giải') });
    const muc07 = m.page.locator('.ant-dropdown:visible li').filter({ hasText: /\(07-(?:HG|ĐT)\)/ }).first();
    for (let i = 0; i < (await cacNut.count()); i++) {
      await cacNut.nth(i).click();
      if (await muc07.waitFor({ timeout: 3_000 }).then(() => true).catch(() => false)) break;
      await m.page.keyboard.press('Escape');
    }
    await muc07.click();
    const bm = m.popup(/\(07-(?:HG|ĐT)\)/);
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    const so = await lapBieuMauKyLogic(m, bm);
    // Ô "Số quyết định" chỉ có phần số; bảng văn bản có số đầy đủ (…/2026/TB-TA)
    return { soTBChuyenHoaGiai: (await soVanBan(m, hoaGiai('Thông báo về việc chuyển vụ việc sang hòa giải'))) ?? so };
  },
};
