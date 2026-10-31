import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { TrangThai6B, VuAn6B } from '../cau-hinh-6B';
import { moDanhSach } from './chung';

/**
 * BƯỚC 06 · Tòa phúc thẩm · Tiếp nhận hồ sơ (hướng dẫn bước 6)
 *
 *  1. Tài khoản tòa phúc thẩm → Vụ việc › Hành chính › Quản lý phúc thẩm › "Hồ sơ chuyển đến"
 *  2. Dòng của vụ (theo Mã vụ án) → "Tiếp nhận" → hộp thoại: Cán bộ tiếp nhận = chủ tài khoản → "Tiếp nhận"
 * Dòng của vụ đã "Đã tiếp nhận" (lượt trước) → bỏ qua.
 */
export const buoc06: Buoc<VuAn6B, TrangThai6B> = {
  so: 6,
  ten: 'Tòa phúc thẩm · Tiếp nhận hồ sơ chuyển đến',
  huongDan: '6',
  chay: async ({ vuAn, moPhien, tkToa }) => {
    const tk = tkToa(vuAn.toaPhucTham);
    const m = await moDanhSach(await moPhien(tk), 'Vụ việc', 'Hành chính', 'Quản lý phúc thẩm', 'Hồ sơ chuyển đến');
    const dong = m.page.locator('main .ant-table-row').filter({ hasText: vuAn.maVuAn }).first();
    await expect(dong, `Không thấy ${vuAn.maVuAn} trong "Hồ sơ chuyển đến" (bước 05 chưa chuyển?)`).toBeVisible({ timeout: 30_000 });
    if (/Đã tiếp nhận/.test(await dong.innerText())) return;

    await dong.locator('button').filter({ hasText: /^\s*Tiếp nhận\s*$/ }).first().click();
    const hop = m.page.locator('.ant-modal-wrap:visible .ant-modal').last();
    await hop.waitFor({ timeout: 15_000 });
    await m.choTaiXong(800);
    // Cán bộ tiếp nhận: gõ tên rồi chọn mục có số tài khoản — "Nguyễn Xuân Kỳ (001075009057)"
    const oCanBo = m.oTheoNhan('Cán bộ tiếp nhận', hop);
    if (!(await oCanBo.locator('.ant-select-selection-item').count())) {
      await m.chonTrong(oCanBo, tk.ten || tk.taiKhoan).catch(() => m.chonTrong(oCanBo, new RegExp(tk.taiKhoan)));
    }
    await m.nut(hop, /^\s*Tiếp nhận\s*$/).click();
    await m.choThongBao(/thành công|Đã tiếp nhận/i);
    await m.choTaiXong(1500);
  },
};
