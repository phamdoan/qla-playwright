import { expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BanAn6D, LOAI_AN, TK_LANH_DAO, TK_VU_TRUONG, TrangThai6D, Y_KIEN_DE_XUAT } from '../cau-hinh-6D';
import { chonNguoi, moChiTietVuAn } from './chung';

/**
 * BƯỚC 07 · Vụ trưởng · Thụ lý, lập tờ trình vụ xét xử, đưa vào tiểu hồ sơ, trình lãnh đạo (hướng dẫn bước 7)
 *
 *  1. Giám đốc thẩm, tái thẩm › Quản lý xét xử GĐT → dòng của hồ sơ (Kháng nghị: <số KN>) → Xem chi tiết
 *  2. Tab "Thụ lý" → "Thụ lý"
 *  3. Tab "Tờ trình" → "Tạo văn bản" › "Tạo tờ trình vụ xét xử" → Tóm tắt nội dung vụ án, Diễn biến quá trình giải quyết
 *     → "Lưu" → Chọn ý kiến đề xuất → "Lưu" → "Ký logic"
 *  4. "Tiểu hồ sơ" → "Thêm tài liệu vào THS" → tick "Tờ trình vụ xét xử" → "Thêm" → quay lại
 *  5. Tick tờ trình → "Trình văn bản" → Cấp trình "Phó Chánh án" · Người được trình = lãnh đạo → "Xin ý kiến"
 * Ý kiến đề xuất: Y_KIEN_DE_XUAT, trống thì mục đầu của danh mục (lưu "yKienDeXuat").
 * Mỗi phần xong thì ghi cờ vào state (daThuLy, daKyToTrinhVXX, daThemTHS) → chạy lại chỉ làm phần còn thiếu.
 */
export const buoc07: Buoc<BanAn6D, TrangThai6D> = {
  so: 7,
  ten: 'Vụ trưởng · Thụ lý, tờ trình vụ xét xử — ký logic, tiểu hồ sơ, trình lãnh đạo',
  huongDan: '7',
  soLan: 4,
  chay: async ({ vuAn, tt, lan, moPhien, can }) => {
    test.setTimeout(600_000);
    const soKhangNghi = can('soKhangNghi', 1);
    const phien = await moPhien(TK_VU_TRUONG);
    const m = new ManHinh(phien.page);
    const p = m.page;
    const urlVuAn = await moChiTietVuAn(phien, vuAn.soBanAn, soKhangNghi, tt.urlVuAn);
    const tab = async (ten: RegExp) => {
      await p.getByRole('tab', { name: ten }).first().click();
      await m.choTaiXong(2500);
    };
    const nutTrang = (ten: RegExp) => p.getByRole('button', { name: ten }).filter({ visible: true }).last();

    // ── Lượt 1: thụ lý ──
    if (lan === 1) {
      if (tt.daThuLy) return { urlVuAn };
      await tab(/Thụ lý/);
      const nut = nutTrang(/^(save )?Thụ lý$/i);
      if (await nut.isEnabled({ timeout: 10_000 }).catch(() => false)) {
        await nut.click();
        await m.dongYTatCaXacNhan();
        await m.choThongBao(/thành công/i);
        await m.choTaiXong(1500);
      }
      return { urlVuAn, daThuLy: true };
    }

    await tab(/Tờ trình/);
    const dongToTrinh = p.locator('main .ant-table-row').filter({ hasText: 'Tờ trình vụ xét xử' }).first();

    // ── Lượt 2: tạo tờ trình vụ xét xử → ký logic ──
    if (lan === 2) {
      if (tt.daKyToTrinhVXX) return;
      let yKienDeXuat = tt.yKienDeXuat;
      if (!(await dongToTrinh.waitFor({ timeout: 8_000 }).then(() => true).catch(() => false))) {
        // Popup "Thêm mới tờ trình": tóm tắt, diễn biến, ý kiến đề xuất (bắt buộc, cùng form) → "Lưu"
        await nutTrang(/Tạo văn bản/).click();
        await p.getByRole('menuitem', { name: 'Tạo tờ trình vụ xét xử' }).click();
        const d = p.locator('.ant-modal-wrap:visible .ant-modal').filter({ hasText: 'Thêm mới tờ trình' }).last();
        await d.waitFor({ timeout: 30_000 });
        await m.choTaiXong(1500);
        await d.getByRole('textbox', { name: /Tóm tắt nội dung vụ án/ }).fill(`Vụ án ${LOAI_AN.toLowerCase()} theo Bản án ${vuAn.capXetXu.toLowerCase()} số ${vuAn.soBanAn} ngày ${vuAn.ngayBanAn} của ${vuAn.toaAn}; kháng nghị tái thẩm số ${soKhangNghi}.`);
        await d.getByRole('textbox', { name: /Diễn biến quá trình giải/ }).fill(`Tòa án đã xét xử ${vuAn.capXetXu.toLowerCase()}; người có thẩm quyền kháng nghị theo thủ tục tái thẩm.`);
        await d.getByRole('combobox', { name: /Chọn ý kiến đề xuất/ }).click();
        // Danh mục ý kiến theo loại án → không cấu hình thì lấy mục đầu, ghi lại để bước 08 chọn đúng mục đó
        const cacMuc = p.locator('.ant-select-dropdown:visible .ant-select-item-option');
        const muc = Y_KIEN_DE_XUAT ? cacMuc.filter({ hasText: Y_KIEN_DE_XUAT }).first() : cacMuc.first();
        await muc.waitFor({ timeout: 15_000 });
        yKienDeXuat = (await muc.getAttribute('title')) || (await muc.innerText()).trim();
        await muc.click();
        await m.nut(d, /^\s*Lưu\s*$/).click();
        await m.choThongBao(/thành công/i);
        await m.choTaiXong(2000);
      } else {
        // Đã có tờ trình (lượt trước lưu nhưng chưa ký) → mở lại để ký
        await dongToTrinh.locator('a, button').first().click();
        await m.choTaiXong(2500);
      }
      await nutTrang(/Ký logic/).click();
      await m.dongYTatCaXacNhan();
      await m.choThongBao(/thành công|Đã ký/i);
      await m.choTaiXong(1500);
      return { daKyToTrinhVXX: true, yKienDeXuat };
    }

    // ── Lượt 3: đưa tờ trình vào tiểu hồ sơ ──
    if (lan === 3) {
      if (tt.daThemTHS) return;
      // Nút "Tiểu hồ sơ" ở cột Thao tác của dòng tờ trình → popup "Xem tiểu hồ sơ" (DANH SÁCH TÀI LIỆU (n))
      await expect(dongToTrinh, 'Tab "Tờ trình" chưa có tờ trình vụ xét xử').toBeVisible({ timeout: 30_000 });
      await dongToTrinh.getByRole('button', { name: /Tiểu hồ sơ/ }).click();
      const ths = p.locator('.ant-modal-wrap:visible .ant-modal, .ant-drawer-open .ant-drawer-content').filter({ hasText: /tiểu hồ sơ/i }).last();
      await ths.waitFor({ timeout: 30_000 });
      await m.choTaiXong(2500);
      const coTaiLieu = /DANH SÁCH TÀI LIỆU \([1-9]/.test((await ths.innerText()).replace(/\s+/g, ' '));
      if (!coTaiLieu) {
        await m.nut(ths, /Thêm tài liệu vào THS/).click();
        await p.getByRole('button', { name: /Tờ trình vụ xét xử/ }).filter({ visible: true }).last().locator('input[type=checkbox]').check();
        await nutTrang(/^(plus )?Thêm$/).click();
        await m.choTaiXong(2000);
        await expect(ths, 'Thêm tài liệu xong nhưng tiểu hồ sơ chưa có tờ trình').toContainText(/DANH SÁCH TÀI LIỆU \([1-9]/, { timeout: 30_000 });
      }
      await nutTrang(/arrow-left/).click();
      await m.choTaiXong(2000);
      return { daThemTHS: true };
    }

    // ── Lượt 4: trình văn bản (xin ý kiến lãnh đạo) ──
    if (tt.daTrinhToTrinhVXX) return;
    await expect(dongToTrinh, 'Tab "Tờ trình" chưa có tờ trình vụ xét xử').toBeVisible({ timeout: 30_000 });
    await dongToTrinh.locator('input[type=checkbox]').first().check();
    // "Trình văn bản" mở trang "Trình ký" (…Xin ý kiến lãnh đạo), không phải popup
    await nutTrang(/Trình văn bản/).click();
    const d = p.locator('main');
    await m.oTheoNhan(/Cấp trình/, d).waitFor({ timeout: 60_000 });
    await m.choTaiXong(2000);
    await m.chon(d, /Cấp trình/, 'Phó Chánh án');
    await m.page.waitForTimeout(800);
    const oNguoi = m.oTheoNhan(/Người được trình/, d);
    if (!(await chonNguoi(m, oNguoi, TK_LANH_DAO.ten!).then(() => true).catch(() => false))) {
      await m.chonTrong(oNguoi, new RegExp(TK_LANH_DAO.ten!));
    }
    await m.nut(d, /Xin ý kiến/).click();
    await m.choThongBao(/thành công/i);
    await m.choTaiXong(1500);
    return { daTrinhToTrinhVXX: true };
  },
};
