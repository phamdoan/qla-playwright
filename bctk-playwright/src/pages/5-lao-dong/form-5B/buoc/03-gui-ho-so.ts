import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { TrangThai5B, VuAn5B } from '../cau-hinh-5B';
import { moDanhSach } from './chung';

/**
 * BƯỚC 03 · Tòa sơ thẩm · Gửi hồ sơ lên tòa phúc thẩm (hướng dẫn bước 3)
 *
 *  1. Menu Vụ việc › Dân sự › Quản lý sơ thẩm › "Hồ sơ vụ án chuyển đi"
 *  2. Tick dòng của vụ (theo Mã vụ án) → "Gửi hồ sơ đã chọn" → "Gửi"
 * Dòng của vụ không còn nút chọn / đã ở trạng thái gửi (lượt trước) → bỏ qua.
 */
export const buoc03: Buoc<VuAn5B, TrangThai5B> = {
  so: 3,
  ten: 'Tòa sơ thẩm · Gửi hồ sơ vụ án lên tòa phúc thẩm',
  huongDan: '3',
  chay: async ({ vuAn, moPhien, tkToa }) => {
    const m = await moDanhSach(await moPhien(tkToa(vuAn.toaSoTham)), 'Vụ việc', 'Dân sự', 'Quản lý sơ thẩm', 'Hồ sơ vụ án chuyển đi');
    const dong = m.page.locator('main .ant-table-row').filter({ hasText: vuAn.maVuAn }).first();
    await expect(dong, `Không thấy ${vuAn.maVuAn} trong "Hồ sơ vụ án chuyển đi" (chưa có kháng nghị?)`).toBeVisible({ timeout: 30_000 });
    const chon = dong.locator('input[type=checkbox]').first();
    if (!(await chon.count()) || !(await chon.isEnabled())) return;

    await chon.check();
    await m.nut(m.page.locator('main'), /Gửi hồ sơ đã chọn/).click();
    const hoi = m.page.locator('.ant-modal-wrap:visible .ant-modal').last();
    await hoi.waitFor({ timeout: 15_000 });
    await m.nut(hoi, 'Gửi').click();
    await m.choThongBao(/thành công|Đã gửi/i);
    await m.choTaiXong(1500);
  },
};
