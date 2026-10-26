import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { TrangThai1B, VuAnNguon } from '../cau-hinh-1B';
import { ngay } from '../../../../utils/fake-data';

/**
 * BƯỚC 06 · Tòa phúc thẩm · Thụ lý (hướng dẫn 4.3)
 *
 *  1. Mở vụ án phúc thẩm → tab "Thụ lý" → nút "Thụ lý"
 *  2. Popup "Cấp số thụ lý vụ án": ngày thụ lý = hôm nay → "Xác nhận thụ lý"
 *  3. Đọc mã vụ án phúc thẩm, số thụ lý, ngày thụ lý ở đầu trang
 */
export const buoc06: Buoc<VuAnNguon, TrangThai1B> = {
  so: 6,
  ten: 'Tòa phúc thẩm · Thụ lý',
  huongDan: '4.3',
  chay: async ({ moPhien, tkToa, can }) => {
    const phien = await moPhien(tkToa(can('toaPhucTham', 4)));
    await phien.vao(can('urlVuAn', 5));
    const m = new ManHinh(phien.page);
    await m.moTab('thu-ly');

    // Đầu trang: "VA26-006321 • Số thụ lý: 1 • Ngày thụ lý: 16/10/2026" (vẽ chậm vài giây sau khi tải)
    const mau = /(VA\d{2}-\d+)\s*•?\s*Số thụ lý:\s*(\S+)\s*•?\s*Ngày thụ lý:\s*(\d{2}\/\d{2}\/\d{4})/;
    const dau = m.page.locator('main').first();
    // Chờ trang vẽ xong: còn nút "Thụ lý", hoặc đầu trang đã có số thụ lý (thụ lý ở lượt trước)
    const nutThuLy = m.nut(m.page, 'Thụ lý');
    await expect(nutThuLy.or(dau.filter({ hasText: mau })).first()).toBeVisible({ timeout: 30_000 });

    if (await nutThuLy.isVisible()) {
      await nutThuLy.click();
      const popup = m.popup('Cấp số thụ lý vụ án');
      await popup.waitFor({ timeout: 30_000 });
      await m.choTaiXong();
      await m.ngay(popup, 'Ngày thụ lý', ngay(0));
      await m.nut(popup, 'Xác nhận thụ lý').click();
      await m.choThongBao(/Lưu thụ lý thành công/);
      await m.choTaiXong(2000);
    }

    await expect(dau, 'Thụ lý xong nhưng đầu trang không hiện số thụ lý').toContainText(mau, { timeout: 30_000 });
    const t = (await dau.innerText()).match(mau)!;
    return { maVuAnPhucTham: t[1], soThuLy: t[2], ngayThuLy: t[3] };
  },
};
