import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh, chuaChu, dungChu } from '../../../base.page';
import { TEP_MAU_1B, TrangThai1B, VuAnNguon } from '../cau-hinh-1B';
import { moVuAnPhucThamTheoTen } from './chung';

/**
 * BƯỚC 05 · Tòa phúc thẩm · Tiếp nhận hồ sơ (hướng dẫn bước 5)
 *
 *  1. Vụ việc › Quản lý án phúc thẩm › Hồ sơ tiếp nhận → tìm theo tên vụ án → mở hồ sơ
 *  2. "Đối chiếu đầu mục hồ sơ bắt buộc" → bấm mọi nút "Đủ" chưa xanh
 *  3. "Biên bản giao nhận" → chọn họ tên bên giao → "Lưu" → "Đã lưu biên bản giao nhận" → "Đóng"
 *  4. Mục Tài liệu: chọn tệp → loại "Vụ chuyển - Biên bản giao nhận" → "Thêm mới"
 *  5. "Mở vụ án phúc thẩm để thụ lý" → ghi lại URL vụ án phúc thẩm cho các bước sau
 */
export const buoc05: Buoc<VuAnNguon, TrangThai1B> = {
  so: 5,
  ten: 'Tòa phúc thẩm · Tiếp nhận hồ sơ',
  huongDan: '5',
  chay: async ({ moPhien, tkToa, can }) => {
    const phien = await moPhien(tkToa(can('toaPhucTham', 4)));
    const m = new ManHinh(phien.page);
    const tenVuAn = can('tenVuAn', 1);

    // Vụ việc › Quản lý án phúc thẩm › Hồ sơ tiếp nhận (vào thẳng link)
    await phien.vao('vu-an/phuc-tham/ho-so-chuyen-den');
    // Ô tìm ở đây không phân biệt hoa thường, nhận một phần tên
    await m.timKiem('Tìm kiếm…', tenVuAn);
    const hoSo = await m.dong(m.page, chuaChu(tenVuAn));
    // Đã thụ lý ở lượt trước → mở thẳng vụ án phúc thẩm
    if (/Đã thụ lý/.test(await hoSo.innerText())) return { urlVuAn: await moVuAnPhucThamTheoTen(m, tenVuAn, can('maDinhDanh', 1)) };
    await hoSo.locator('strong').first().click();
    await m.page.waitForURL(/ho-so-chuyen-den\/chi-tiet/, { timeout: 60_000 });
    await m.choTaiXong(2000);

    // Nút trên cùng: "Tiếp nhận hồ sơ" (chưa đủ điều kiện) hoặc "Mở vụ án phúc thẩm để thụ lý" (đã đủ)
    const nutMo = m.nut(m.page, 'Mở vụ án phúc thẩm để thụ lý');
    await expect(nutMo.or(m.nut(m.page, 'Tiếp nhận hồ sơ')).first()).toBeVisible({ timeout: 30_000 });

    if (!(await nutMo.isVisible())) {
      // Đối chiếu đầu mục: bấm mọi nút "Đủ" chưa xanh lá
      const cacNutDu = m.page.locator('button').filter({ hasText: dungChu('Đủ') });
      for (let i = 0; i < (await cacNutDu.count()); i++) {
        const nutDu = cacNutDu.nth(i);
        const daXanh = await nutDu.evaluate(e => {
          const [r, g, b] = (getComputedStyle(e).backgroundColor.match(/\d+/g) ?? []).map(Number);
          return g > 120 && r < 100 && b < 120;
        });
        if (!daXanh) await nutDu.click();
      }

      // Biên bản giao nhận (nút bị khóa khi biên bản đã lập ở lượt trước)
      const nutBienBan = m.nut(m.page, 'Biên bản giao nhận');
      await nutBienBan.waitFor({ timeout: 30_000 });
      if (await nutBienBan.isEnabled()) {
        await nutBienBan.click();
        const bienBan = m.popup('Biên bản về việc giao, nhận hồ sơ');
        await bienBan.waitFor({ timeout: 30_000 });
        await m.choTaiXong();
        await m.chon(bienBan, 'Họ tên bên giao');
        await m.nut(bienBan, 'Lưu').click();
        const daLuu = m.popup('Đã lưu biên bản giao nhận');
        await daLuu.waitFor({ timeout: 30_000 });
        await m.nut(daLuu, 'Đóng').click();
        await m.choTaiXong();
      }

      // Tài liệu — neo theo nút "Chọn tệp" (KHÔNG theo chữ "Loại tài liệu": đó là placeholder, chọn loại xong là mất)
      const khung = m.page
        .locator('.ant-tabs-tabpane-active')
        .filter({ has: m.page.locator('button').filter({ hasText: dungChu('Chọn tệp') }) })
        .last();
      await khung.scrollIntoViewIfNeeded();
      // Bảng tệp đã thêm nằm NGOÀI khung tab "Tải file" (ngay dưới), dòng trống ghi "Chưa có tệp đính kèm nào"
      const bangTep = m.page.locator('.ant-table-wrapper').filter({ hasText: 'Tên tệp' }).filter({ hasText: 'Loại tài liệu' }).last();
      await bangTep.locator('tbody tr').first().waitFor({ timeout: 30_000 });
      if (!(await bangTep.locator('tbody tr').filter({ hasText: 'Vụ chuyển - Biên bản giao nhận' }).count())) {
        await khung.locator('input[type=file]').first().setInputFiles(TEP_MAU_1B);
        await m.chonTrong(khung, 'Vụ chuyển - Biên bản giao nhận');
        await m.nut(khung, 'Thêm mới').click();
        await m.choThongBao(/Đã lưu tài liệu/);
      }
    }

    await nutMo.click();
    await m.page.waitForURL(/phuc-tham\/chi-tiet\?id=/, { timeout: 60_000 });
    await m.choTaiXong(2000);
    return { urlVuAn: m.page.url() };
  },
};
