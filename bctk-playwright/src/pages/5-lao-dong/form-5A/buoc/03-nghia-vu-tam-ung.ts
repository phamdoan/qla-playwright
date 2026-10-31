import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai5A } from '../cau-hinh-5A';
import { moChiTietDon, popup } from './chung';

/**
 * BƯỚC 03 · Xác định nghĩa vụ tạm ứng án phí theo yêu cầu (hướng dẫn bước 3)
 *
 *  1. Tab "Kết quả xử lý" → mục "Xác định nghĩa vụ tạm ứng án phí theo yêu cầu"
 *  2. "Xác nhận chế độ thủ tục" → "Xác nhận chế độ thủ tục thành công"
 *  3. "Xác định nghĩa vụ" → drawer: mỗi yêu cầu, Người có nghĩa vụ = Người khởi kiện (thường đã chọn sẵn)
 *     · ô "Nguồn/căn cứ xác định giá trị" BẮT BUỘC (hướng dẫn chưa ghi) → "Theo giá trị đương sự kê khai trong đơn"
 *  4. "Xác nhận tất cả" → "Xác nhận nghĩa vụ tạm ứng thành công"
 */
export const buoc03: Buoc<DonNguon, TrangThai5A> = {
  so: 3,
  ten: 'Xác nhận chế độ thủ tục, xác định nghĩa vụ tạm ứng án phí',
  huongDan: '3',
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

    let nutCheDo = m.nut(muc, 'Xác nhận chế độ thủ tục');
    for (let lan = 1; (await nutCheDo.isVisible().catch(() => false)) && (await nutCheDo.isEnabled()); lan++) {
      // Mức tham chiếu tải sau khung: còn "- - -" mà bấm xác nhận thì máy chủ trả 400, không có thông báo thành công
      await expect
        .poll(async () => /THAM CHIẾU THÔNG THƯỜNG\s*-\s*-\s*-/i.test(await muc.innerText()), { timeout: 15_000 })
        .toBe(false)
        .catch(() => undefined);
      await nutCheDo.click();
      const loi = await m.choThongBao(/Xác nhận chế độ thủ tục thành công/).then(() => '').catch(e => (e as Error).message.split('\n')[0]);
      if (!loi) {
        await m.choTaiXong(1000);
        break;
      }
      // Máy chủ từ chối có lý do (vd. "Cần phân công Thẩm phán giải quyết đơn…" = bước 02 chưa ký xong) → thử lại vô ích
      if (lan >= 2 || /Hệ thống báo lỗi/.test(loi)) throw new Error(`Không xác nhận được chế độ thủ tục: ${loi}`);
      // Lần đầu lỗi → F5, mở lại mục rồi thử lại
      await m.page.reload();
      await m.choTaiXong(3000);
      await m.moTab('ket-qua-xu-ly');
      nutCheDo = m.nut(await m.moMuc('Xác định nghĩa vụ tạm ứng án phí'), 'Xác nhận chế độ thủ tục');
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
