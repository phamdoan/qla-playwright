import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { TrangThai6B, VuAn6B } from '../cau-hinh-6B';
import { moDanhSach } from './chung';

/**
 * BƯỚC 05 · Tòa sơ thẩm · Chuyển hồ sơ lên tòa phúc thẩm (hướng dẫn bước 5)
 *
 *  1. Menu Vụ việc › Hành chính › Quản lý sơ thẩm › "Hồ sơ vụ án chuyển đi"
 *  2. Dòng của vụ (theo Mã vụ án) → "Chuyển" → hộp xác nhận "Chuyển"
 * Dòng của vụ không còn nút "Chuyển" (lượt trước đã chuyển) → bỏ qua.
 */
export const buoc05: Buoc<VuAn6B, TrangThai6B> = {
  so: 5,
  ten: 'Tòa sơ thẩm · Chuyển hồ sơ vụ án lên tòa phúc thẩm',
  huongDan: '5',
  chay: async ({ vuAn, moPhien, tkToa }) => {
    const m = await moDanhSach(await moPhien(tkToa(vuAn.toaSoTham)), 'Vụ việc', 'Hành chính', 'Quản lý sơ thẩm', 'Hồ sơ vụ án chuyển đi');
    const dong = m.page.locator('main .ant-table-row').filter({ hasText: vuAn.maVuAn }).first();
    await expect(dong, `Không thấy ${vuAn.maVuAn} trong "Hồ sơ vụ án chuyển đi" (chưa ký thông báo 32-HC?)`).toBeVisible({ timeout: 30_000 });
    const nutChuyen = dong.locator('button').filter({ hasText: /^\s*Chuyển\s*$/ }).first();
    if (!(await nutChuyen.isVisible().catch(() => false)) || !(await nutChuyen.isEnabled())) return;

    await nutChuyen.click();
    const hoi = m.page.locator('.ant-modal-wrap:visible .ant-modal').last();
    await hoi.waitFor({ timeout: 15_000 });
    await m.nut(hoi, /^\s*Chuyển\s*$/).click();
    await m.choThongBao(/thành công|Đã chuyển/i);
    await m.choTaiXong(1500);
  },
};
