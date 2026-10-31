import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ORIGIN } from '../../../../../playwright.config';
import { TrangThai5B, VuAn5B } from '../cau-hinh-5B';
import { hoTen } from '../../../../utils/fake-data';
import { luuTaiBanKy, moDanhSach, popup } from './chung';

/**
 * BƯỚC 04 · Tòa phúc thẩm · Tiếp nhận hồ sơ, mở vụ án phúc thẩm (hướng dẫn bước 4)
 *
 *  1. Tài khoản tòa phúc thẩm → Vụ việc › Dân sự › Quản lý phúc thẩm › "Hồ sơ vụ án chuyển đến" → dòng của vụ → "Tiếp nhận"
 *  2. Mục "Tống đạt bản án…": "Đã tống đạt" ở từng đương sự
 *  3. "Lập biên bản giao nhận và tiếp nhận" → Họ tên người đại diện · Số bút lục → "Lưu" → tải bản đã ký → "Xác nhận đã ký" → "Đóng"
 *  4. "Tiếp nhận hồ sơ" → "Mở vụ án phúc thẩm" → ghi lại link vụ án phúc thẩm
 */
export const buoc04: Buoc<VuAn5B, TrangThai5B> = {
  so: 4,
  ten: 'Tòa phúc thẩm · Tiếp nhận hồ sơ, biên bản giao nhận, mở vụ án phúc thẩm',
  huongDan: '4',
  chay: async ({ vuAn, tt, moPhien, tkToa }) => {
    if (tt.urlVuAnPT) return;
    const m = await moDanhSach(await moPhien(tkToa(vuAn.toaPhucTham)), 'Vụ việc', 'Dân sự', 'Quản lý phúc thẩm', 'Hồ sơ vụ án chuyển đến');
    const dong = m.page.locator('main .ant-table-row').filter({ hasText: vuAn.maVuAn }).first();
    await expect(dong, `Không thấy ${vuAn.maVuAn} trong "Hồ sơ vụ án chuyển đến" (bước 03 chưa gửi?)`).toBeVisible({ timeout: 30_000 });
    await dong.locator('button, a').filter({ hasText: /Tiếp nhận|Xem|Chi tiết/ }).first().click();
    await m.page.waitForURL(/ho-so-chuyen-den\/chi-tiet/, { timeout: 60_000 });
    await m.choTaiXong(2000);
    const main = m.page.locator('main');

    const nutMo = m.nut(main, /Mở vụ án phúc thẩm/);
    // Trang chi tiết hiện dần: phải đợi khung "Đối chiếu…" (chưa tiếp nhận) hoặc nút "Mở vụ án phúc thẩm" (đã tiếp nhận)
    // rồi mới xét trạng thái — xét sớm thì không thấy nút nào, bỏ qua tống đạt + biên bản
    await main.getByText('Đối chiếu đầu mục hồ sơ').or(nutMo).first().waitFor({ timeout: 30_000 });
    await m.choTaiXong(1000);
    if (!(await nutMo.isVisible().catch(() => false))) {
      // Tống đạt bản án: "Đã tống đạt" ở từng đương sự (nút đã chọn thì bấm lại vẫn giữ nguyên)
      const cacNut = main.locator('button').filter({ hasText: /^\s*Đã tống đạt\s*$/ });
      for (let i = 0; i < (await cacNut.count()); i++) await cacNut.nth(i).click();

      const nutBienBan = m.nut(main, /Lập biên bản giao nhận/);
      if (await nutBienBan.isVisible().catch(() => false)) {
        await nutBienBan.click();
        const bb = popup(m, /Biên bản/);
        await bb.waitFor({ timeout: 30_000 });
        await m.choTaiXong(1500);
        await m.nhap(bb, 'Họ tên người đại diện', hoTen());
        await m.nhap(bb, 'Số bút lục', String(20 + Math.floor(Math.random() * 180)));
        await luuTaiBanKy(m, bb);
      }
      const nutTiepNhan = m.nut(main, /Tiếp nhận hồ sơ/);
      if (await nutTiepNhan.isVisible().catch(() => false)) {
        await nutTiepNhan.click();
        await m.dongYTatCaXacNhan();
        await m.choTaiXong(1500);
      }
    }
    await nutMo.waitFor({ timeout: 30_000 });
    await nutMo.click();
    await m.page.waitForURL(/phuc-tham.*chi-tiet\?id=/, { timeout: 60_000 });
    await m.choTaiXong(2000);
    const url = new URL(m.page.url());
    const maVuAnPT = ((await main.innerText()).match(/VA\d{2}-\d+/) ?? [''])[0];
    return { urlVuAnPT: `${ORIGIN}${url.pathname}?id=${url.searchParams.get('id')}`, maVuAnPT };
  },
};
