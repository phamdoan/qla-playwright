import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BanAn5D, THAM_PHAN, TK_LANH_DAO, TK_VU_TRUONG, TrangThai5D } from '../cau-hinh-5D';
import { chonNguoi, chonTab, dongHoSo, locTheoBanAn } from './chung';

/**
 * BƯỚC 02 · Vụ trưởng · Phân công thẩm phán chỉ định, tạo tờ trình, trình ký (hướng dẫn bước 2)
 *
 *  1. Giám đốc thẩm, tái thẩm › Phân công › Phân công thẩm phán → tab "DS chưa phân công chỉ định" 
 *     · lọc theo số bản án → tick dòng của hồ sơ → "-- Chọn thẩm phán --" = Lê Hưng Dũng · Lý do phân công (chung)
 *     → "Phân công chỉ định (1 hồ sơ)" → "Xác nhận"
 *  2. Tab "Quản lý kết quả phân công" → tick dòng của hồ sơ → "Tạo tờ trình phân công"
 *     → Người ký = lãnh đạo (Nguyễn Hải Trâm) → "Lưu văn bản" → "Trình ký"
 */
export const buoc02: Buoc<BanAn5D, TrangThai5D> = {
  so: 2,
  ten: 'Vụ trưởng · Phân công thẩm phán chỉ định, tạo tờ trình phân công, trình ký',
  huongDan: '2',
  chay: async ({ vuAn, tt, moPhien, can }) => {
    const soKhangNghi = can('soKhangNghi', 1);
    const phien = await moPhien(TK_VU_TRUONG);
    const m = new ManHinh(phien.page);
    await phien.vao('vu-an/gdt-tt/phan-cong-vu-an/danh-sach');
    const main = m.page.locator('main');

    // ── Phân công chỉ định (hồ sơ còn ở danh sách chưa phân công) ──
    await chonTab(m, 'DS chưa phân công chỉ định');
    await locTheoBanAn(m, vuAn.soBanAn);
    const chuaPC = dongHoSo(m, soKhangNghi);
    // Bảng tải chậm sau khi lọc → chờ dòng (không có sau 15s = đã phân công ở lượt trước)
    if (await chuaPC.waitFor({ timeout: 15_000 }).then(() => true).catch(() => false)) {
      await chuaPC.locator('input[type=checkbox]').first().check();
      // Ô "-- Chọn thẩm phán --": mục hiện "Họ tên - ngày sinh - chức vụ", title không phải họ tên → gõ lọc rồi bấm theo chữ
      // Chọn xong thì chữ gợi ý "Chọn thẩm phán" mất → cố định ô theo vị trí trước khi chọn
      const viTri = (await main.locator('.ant-select').allInnerTexts()).findIndex(t => t.includes('Chọn thẩm phán'));
      const oThamPhan = main.locator('.ant-select').nth(viTri);
      await oThamPhan.locator('.ant-select-selector').click();
      await oThamPhan.locator('input').first().fill(THAM_PHAN);
      await m.page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: THAM_PHAN }).first().click();
      await expect(oThamPhan, `Chưa chọn được thẩm phán "${THAM_PHAN}"`).toContainText(THAM_PHAN, { timeout: 5_000 });
      await m.page.getByRole('textbox', { name: 'Lý do phân công (chung)' }).fill('Phân công giải quyết hồ sơ kháng nghị tái thẩm');
      await m.nut(main, /Phân công chỉ định \(\d+ hồ sơ\)/).click();
      const hoi = m.page.locator('.ant-modal-wrap:visible .ant-modal').last();
      await hoi.waitFor({ timeout: 15_000 });
      await m.nut(hoi, /Xác nhận/).click();
      await expect(chuaPC, 'Phân công chỉ định xong nhưng hồ sơ vẫn ở danh sách chưa phân công').toBeHidden({ timeout: 30_000 });
      await m.choTaiXong(1500);
    }

    // ── Tờ trình phân công ──
    await chonTab(m, 'Quản lý kết quả phân công');
    await locTheoBanAn(m, vuAn.soBanAn);
    const dong = dongHoSo(m, soKhangNghi);
    await expect(dong, `Không thấy hồ sơ KN ${soKhangNghi} trong "Quản lý kết quả phân công"`).toBeVisible({ timeout: 30_000 });
    const chu = (await dong.innerText()).replace(/\s+/g, ' ');
    // Tên thẩm phán = chuỗi từ VIẾT HOA liền trước nút "Sửa" ở cuối dòng
    const thamPhan = chu.match(/((?:\p{Lu}\p{Ll}*\s+){1,5}\p{Lu}\p{Ll}*)\s*Sửa\s*$/u)?.[1]?.trim() ?? tt.thamPhan ?? THAM_PHAN;
    // Tờ trình "Dự thảo" vẫn giữ chữ này sau khi trình ký (đổi thành "Đã ban hành" khi lãnh đạo ký)
    if (tt.daTrinhKyToTrinh || /Đã ban hành/.test(chu)) return { thamPhan, daTrinhKyToTrinh: true };

    await dong.locator('input[type=checkbox]').first().check();
    await m.nut(main, /Tạo tờ trình phân công/).click();
    const tt2 = m.page.locator('.ant-modal-wrap:visible .ant-modal').last();
    await tt2.waitFor({ timeout: 30_000 });
    await m.choTaiXong(1500);
    // Mở lại bản dự thảo thì ô Người ký trống → luôn chọn lại (thiếu người ký thì "Trình ký" bấm không có tác dụng)
    await chonNguoi(m, m.oTheoNhan('Người ký', tt2), TK_LANH_DAO.ten!);
    const nutLuu = m.nut(tt2, /Lưu văn bản/);
    const nutTrinh = m.nut(tt2, /Trình ký/);
    // Chọn người ký xong nút "Lưu văn bản" sáng lên hơi trễ → chờ; "Trình ký" còn mờ nghĩa là chưa lưu → lưu
    await m.page.waitForTimeout(1500);
    if ((await nutLuu.isEnabled()) || !(await nutTrinh.isEnabled())) {
      await nutLuu.click();
      await m.choThongBao(/thành công/i);
    }
    const nutLaySo = m.nut(tt2, /Lấy số/);
    if (await nutLaySo.isVisible().catch(() => false)) {
      await nutLaySo.click();
      await m.choTaiXong(1500);
    }
    await expect(nutTrinh, 'Nút "Trình ký" vẫn mờ sau khi lưu văn bản').toBeEnabled({ timeout: 15_000 });
    // Trình ký không hiện thông báo → xác nhận bằng phản hồi của API trình ký
    const [phanHoi] = await Promise.all([
      m.page.waitForResponse(r => /phe-duyet-de-xuat\/trinh-ky/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 }),
      nutTrinh.click(),
    ]);
    const kq = await phanHoi.json().catch(() => ({}));
    if (!kq?.success) throw new Error(`Trình ký tờ trình phân công không thành công: ${JSON.stringify(kq).slice(0, 300)}`);
    await m.choTaiXong(1500);
    return { thamPhan, soToTrinh: chu.match(/Người ký[^]*?Số:\s*(\d+)/)?.[1] ?? tt.soToTrinh, daTrinhKyToTrinh: true };
  },
};
