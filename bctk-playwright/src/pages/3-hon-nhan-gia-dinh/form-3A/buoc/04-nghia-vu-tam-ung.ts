import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai3A } from '../cau-hinh-3A';
import { moChiTietDon, popup } from './chung';

/**
 * BƯỚC 04 · Xác định nghĩa vụ tạm ứng án phí theo yêu cầu (hướng dẫn B9.8–B9.12)
 *
 *  1. Tab "Kết quả xử lý" → mục "Xác định nghĩa vụ tạm ứng án phí theo yêu cầu"
 *  2. "Xác nhận chế độ thủ tục" → "Xác nhận chế độ thủ tục thành công"
 *  3. "Xác định nghĩa vụ" → drawer: mỗi yêu cầu, Người có nghĩa vụ = Người khởi kiện (thường đã chọn sẵn)
 *     · ô "Nguồn/căn cứ xác định giá trị" BẮT BUỘC (hướng dẫn chưa ghi) → "Theo giá trị đương sự kê khai trong đơn"
 *  4. "Xác nhận tất cả" → "Xác nhận nghĩa vụ tạm ứng thành công"
 */
export const buoc04: Buoc<DonNguon, TrangThai3A> = {
  so: 4,
  ten: 'Xác nhận chế độ thủ tục, xác định nghĩa vụ tạm ứng án phí',
  huongDan: 'B9.8–B9.12',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const nguoiKhoiKien = can('nguoiKhoiKien', 1);
    const m = await moChiTietDon(await moPhien(tkToa(vuAn.toaAn)), can('urlDon', 1));
    await m.moTab('ket-qua-xu-ly');
    const muc = await m.moMuc('Xác định nghĩa vụ tạm ứng án phí');

    // Đã xác định hết (không còn dòng "Chờ xác định"; trạng thái sau đó đổi dần: Đã xác nhận → Đã nộp…) → xong
    const choXacDinh = muc.locator('tbody tr').filter({ hasText: 'Chờ xác định' });
    // Chờ bảng có dòng nghĩa vụ (yêu cầu không có giá ngạch như ly hôn thì chưa có số tiền)
    await muc.locator('tbody tr').filter({ hasText: /Chờ xác định|Đã |đồng/ }).first().waitFor({ timeout: 30_000 });
    if (!(await choXacDinh.count())) return;

    const nutCheDo = m.nut(muc, 'Xác nhận chế độ thủ tục');
    if ((await nutCheDo.isVisible().catch(() => false)) && (await nutCheDo.isEnabled())) {
      await nutCheDo.click();
      await m.choThongBao(/Xác nhận chế độ thủ tục thành công/);
      await m.choTaiXong(1000);
    }

    await m.nut(muc, 'Xác định nghĩa vụ').click();
    const d = popup(m, 'Xác định nghĩa vụ tạm ứng');
    await d.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    // Người có nghĩa vụ: ô chọn nhiều đầu tiên của mỗi yêu cầu (có placeholder thì là ô trống)
    const oNguoi = d.locator('.ant-select-multiple');
    for (let i = 0; i < (await oNguoi.count()); i++) {
      const o = oNguoi.nth(i);
      if (!(await o.locator('.ant-select-selection-item').filter({ hasText: nguoiKhoiKien }).count())) {
        await m.chonTrong(o, nguoiKhoiKien);
      }
    }
    const cacCanCu = d.locator('input[placeholder^="Nguồn/căn cứ"], textarea[placeholder^="Nguồn/căn cứ"]');
    for (let i = 0; i < (await cacCanCu.count()); i++) {
      if (!(await cacCanCu.nth(i).inputValue())) await cacCanCu.nth(i).fill('Theo giá trị đương sự kê khai trong đơn');
    }
    await m.page.waitForTimeout(1000);
    await m.nut(d, 'Xác nhận tất cả').click();
    await m.choThongBao(/Xác nhận nghĩa vụ tạm ứng thành công/);
    await d.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    await m.choTaiXong(1000);
    await expect(choXacDinh, 'Vẫn còn yêu cầu "Chờ xác định"').toHaveCount(0, { timeout: 15_000 });
  },
};
