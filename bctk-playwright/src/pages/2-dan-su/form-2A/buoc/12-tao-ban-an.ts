import { expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai2A } from '../cau-hinh-2A';
import { ngay } from '../../../../utils/fake-data';
import { oChonTheoGoiY } from '../../../5-lao-dong/form-5A/buoc/13-tao-ban-an';
import { moVuAn, popup } from './chung';

/**
 * BƯỚC 12 · Tạo bản án sơ thẩm, ký logic, lưu kết quả (hướng dẫn B12)
 *
 *  1. Tab "Xét xử" → "Tạo bản án" → drawer "Bản án sơ thẩm — soạn thảo"
 *  2. Ngày bản án = hôm nay · Số bản án ngẫu nhiên · Người ký = chủ tài khoản · Tóm tắt nội dung bản án
 *  3. Quyết định: "Chấp nhận toàn bộ yêu cầu" · Căn cứ pháp lý: Điều ngẫu nhiên → mũi tên
 *     · Áp dụng án lệ: "Có" → án lệ ngẫu nhiên → mũi tên
 *  4. "Thêm mới bản án" → "Ký logic" → "Đóng"
 *  5. Ghi output/2-dan-su/output-ma-vu-an-form-2A.xlsx (kèm link đơn và link vụ án)
 * Đã có bản án đã ký (lượt trước) → chỉ ghi lại kết quả.
 */
export const buoc12: Buoc<DonNguon, TrangThai2A> = {
  so: 12,
  ten: 'Tạo bản án sơ thẩm, ký logic, lưu kết quả',
  huongDan: 'B12',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    const urlVuAn = can('urlVuAn', 7);
    const m = await moVuAn(await moPhien(tk), urlVuAn);
    await m.moTab('xet-xu');
    const main = m.page.locator('main');

    const daKy = main.locator('.ant-table-row').filter({ hasText: /52-DS|Bản án/ }).filter({ hasText: /Đã ký|Đã có hiệu lực|Hoàn thành/ });
    let soBanAn = tt.soBanAn ?? '';
    let ngayBanAn = tt.ngayBanAn ?? '';
    // Ký xong mà lượt trước lỗi trước khi kịp lưu số → đọc từ dòng bản án ("… 23624/2026/DS-ST …")
    if ((await daKy.count()) && !soBanAn) soBanAn = (await daKy.first().innerText()).match(/(\d+)\/\d{4}\/DS-ST/)?.[1] ?? '';
    if (!(await daKy.count())) {
      await m.nut(main, 'Tạo bản án').click();
      const d = popup(m, /Bản án sơ thẩm/);
      await d.waitFor({ timeout: 30_000 });
      await m.choTaiXong(1500);

      // Ngày bản án: ô ngày đầu tiên của drawer, trống thì điền hôm nay
      const oNgay = d.locator('.ant-picker-input input').first();
      if (!(await oNgay.inputValue())) {
        await oNgay.click();
        await oNgay.fill(ngay(0));
        await oNgay.press('Enter');
      }
      ngayBanAn = await oNgay.inputValue();
      // Ô theo nhãn "Số bản án" là ô ẩn bị khóa — ô nhập thật có placeholder "Nhập số bản án"
      soBanAn = String(10000 + Math.floor(Math.random() * 90000));
      await d.getByPlaceholder('Nhập số bản án').first().fill(soBanAn);
      // Người ký mặc định là Thẩm phán chủ tọa → đổi sang chủ tài khoản để "Ký logic" được
      if (tk.ten && !(await m.docGiaTri('Người ký', d)).startsWith(tk.ten)) await m.chonTrong(m.oTheoNhan('Người ký', d), new RegExp(`^\\s*${tk.ten}`));
      await m.nhap(d, 'Tóm tắt nội dung bản án', 'Tranh chấp dân sự: Tòa án chấp nhận toàn bộ yêu cầu khởi kiện của nguyên đơn.');

      // Quyết định đối với yêu cầu của đương sự
      await m.nut(d, /Chấp nhận toàn bộ yêu cầu/).click();
      await m.page.waitForTimeout(500);

      // Căn cứ pháp lý: Bộ luật mặc định · Điều ngẫu nhiên → mũi tên (nút mũi tên thứ 2 của drawer; thứ 1 là người tiến hành tố tụng)
      const oDieu = await oChonTheoGoiY(m, d, 'Chọn điều luật');
      await oDieu.scrollIntoViewIfNeeded();
      const dieu = await m.chonTrong(oDieu);
      await d.locator('button:has(.anticon-arrow-down)').nth(1).click();
      await expect(d.getByText('Chưa có căn cứ pháp lý'), 'Điều luật chưa vào bảng căn cứ pháp lý').toBeHidden({ timeout: 10_000 });

      // Áp dụng án lệ: "Có" → án lệ ngẫu nhiên → mũi tên
      const khoiAnLe = d.locator('div').filter({ has: m.page.getByText(/^\s*Áp dụng án lệ\s*$/) }).filter({ has: m.page.locator('.ant-radio-wrapper') }).last();
      await khoiAnLe.locator('.ant-radio-wrapper').filter({ hasText: /^\s*Có\s*$/ }).click();
      await m.page.waitForTimeout(800);
      const oAnLe = await oChonTheoGoiY(m, d, /án lệ/i);
      const anLe = await m.chonTrong(oAnLe);
      await d.locator('button:has(.anticon-arrow-down)').last().click();
      await m.page.waitForTimeout(800);

      await m.nut(d, 'Thêm mới bản án').click();
      await m.choThongBao(/thành công|Đã lưu/i);
      const khung = m.page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
      const nutKy = m.nut(khung, /Ký logic/);
      await nutKy.waitFor({ timeout: 30_000 });
      await nutKy.click();
      await m.dongYTatCaXacNhan();
      // Máy chậm thì thông báo "Ký logic thành công" tắt trước khi kịp thấy → nút "Hủy ký số" hiện ra cũng là đã ký
      await expect(
        m.page.locator('.ant-message-notice, .ant-notification-notice').filter({ hasText: /Ký logic thành công/ }).or(m.nut(khung, /Hủy ký số/)).first(),
        'Bấm "Ký logic" nhưng chưa thấy ký xong',
      ).toBeVisible({ timeout: 60_000 });
      await m.page.locator('.ant-drawer-open button, .ant-modal-wrap:visible button').filter({ hasText: /^\s*Đóng\s*$/ }).last().click();
      await m.choTaiXong(1500);
      test.info().annotations.push({ type: 'Căn cứ', description: `${dieu} · án lệ ${anLe}` });
    }

    // ── Lưu kết quả (ô đơn này xong; lần chạy sau ô sẽ tạo đơn mới) ──
    test.info().annotations.push({ type: 'Vụ án đã tạo', description: `${tt.maVuAnHeThong} · bản án số ${soBanAn} · ${urlVuAn}` });
    return { soBanAn, ngayBanAn };
  },
};
