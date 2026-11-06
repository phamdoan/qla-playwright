import { Locator, expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { DonNguon, TrangThai6A } from '../cau-hinh-6A';
import { dungSo, moVuAn, popup } from './chung';

/**
 * Ô select (không có nhãn form) tìm theo chữ gợi ý đang hiện, rồi NEO THEO ID input:
 * chọn xong chữ gợi ý mất → locator lọc theo chữ không còn khớp ô nữa.
 */
async function oChonTheoGoiY(m: ManHinh, d: Locator, goiY: string | RegExp, thu = 0): Promise<Locator> {
  const o = d.locator('.ant-select').filter({ has: m.page.locator('.ant-select-selection-placeholder', { hasText: goiY }) }).nth(thu);
  await o.waitFor({ timeout: 10_000 });
  const id = await o.locator('input').first().getAttribute('id');
  return d.locator('.ant-select').filter({ has: m.page.locator(`[id="${id}"]`) }).first();
}

/**
 * BƯỚC 14 · Tạo bản án hành chính sơ thẩm (22-HC), ký logic, lưu kết quả (hướng dẫn B14)
 *
 *  1. Tab "Xét xử" → mục "Kết quả xét xử" bấm thẻ "Bản án" → "Tạo bản án" → drawer "Bản án hành chính sơ thẩm — dự thảo (Mẫu 22-HC)"
 *  2. Số bản án: "Dùng số" · Người ký = chủ tài khoản (mặc định là Thẩm phán chủ tọa → đổi)
 *     · Tình trạng cung cấp tài liệu, chứng cứ của người bị kiện — ngẫu nhiên
 *  3. Áp dụng án lệ: "Có" → án lệ ngẫu nhiên → "Thêm án lệ"
 *  4. Kết quả giải quyết theo đối tượng và yêu cầu: mỗi dòng (QĐ hành chính / hành vi / yêu cầu bồi thường) "Chọn kết quả" ngẫu nhiên
 *  5. Căn cứ pháp lý: Bộ luật mặc định "Luật tố tụng hành chính" · Điều, Khoản ngẫu nhiên → "Thêm căn cứ"
 *  6. "Thêm mới bản án" → "Ký logic" → "Đóng" (phần soạn thảo nội dung không bắt buộc — bỏ qua)
 *  7. Ghi output/6-hanh-chinh/output-ma-vu-an-form-6A.xlsx (kèm link đơn và link vụ án)
 */
export const buoc14: Buoc<DonNguon, TrangThai6A> = {
  so: 14,
  ten: 'Tạo bản án hành chính sơ thẩm (22-HC), ký logic, lưu kết quả',
  huongDan: 'B14',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    const urlVuAn = can('urlVuAn', 7);
    const m = await moVuAn(await moPhien(tk), urlVuAn);
    await m.moTab('xet-xu');
    const main = m.page.locator('main');

    // Lượt trước đã tạo bản án ("Kết quả giải quyết: Bản án sơ thẩm số 12358/2026/HC-ST") → chỉ ghi lại kết quả.
    // Mục kết quả tải chậm → chờ thẻ chọn loại kết quả / nút "Tạo bản án" / dòng kết quả hiện ra rồi mới xét
    const ketQua = main.getByText(/Bản án sơ thẩm số\s*\d+/).first();
    await ketQua.or(main.locator('.kqxx-pick-card').first()).or(m.nut(main, 'Tạo bản án')).first().waitFor({ timeout: 30_000 });
    let soBanAn = tt.soBanAn ?? '';
    let ngayBanAn = tt.ngayBanAn ?? '';
    if (await ketQua.isVisible().catch(() => false)) {
      soBanAn ||= (await ketQua.innerText()).match(/số\s*(\d+)/)?.[1] ?? '';
    } else {
      // Chưa chọn loại kết quả thì phải bấm thẻ "Bản án" mới hiện nút "Tạo bản án"
      const nutTao = m.nut(main, 'Tạo bản án');
      if (!(await nutTao.isVisible().catch(() => false))) await main.locator('.kqxx-pick-card').filter({ hasText: /^\s*Bản án/ }).first().click();
      await nutTao.click();
      const d = popup(m, /Bản án hành chính sơ thẩm/);
      await d.waitFor({ timeout: 30_000 });
      await m.choTaiXong(1500);

      soBanAn = await dungSo(m, d, 'Số bản án');
      ngayBanAn = (await d.locator('.ant-picker-input input').first().inputValue({ timeout: 3_000 }).catch(() => '')) || ngayBanAn;
      if (tk.ten && !(await m.docGiaTri('Người ký', d)).startsWith(tk.ten)) {
        await m.chonTrong(m.oTheoNhan('Người ký', d), new RegExp(`^\\s*${tk.ten}`));
      }
      await m.chon(d, 'Tình trạng cung cấp tài liệu');
      // Quan hệ pháp luật chi tiết bắt buộc — thường hệ thống điền sẵn, trống thì lấy theo quan hệ pháp luật thống kê
      const qhChiTiet = m.oTheoNhan('Quan hệ pháp luật chi tiết', d).locator('textarea').first();
      if (!(await qhChiTiet.inputValue())) await qhChiTiet.fill(tt.quanHePhapLuat || (await m.docGiaTri('Quan hệ pháp luật thống kê', d)));

      // Áp dụng án lệ (nhóm radio Không/Có duy nhất của drawer, không nằm trong ô form): "Có" → án lệ ngẫu nhiên → "Thêm án lệ"
      await d.locator('.ant-radio-wrapper').filter({ hasText: /^\s*Có\s*$/ }).first().click();
      await m.page.waitForTimeout(800);
      const oAnLe = await oChonTheoGoiY(m, d, /án lệ/i);
      const anLe = await m.chonTrong(oAnLe);
      await m.nut(d, 'Thêm án lệ').click();
      await m.page.waitForTimeout(800);

      // Kết quả giải quyết: mỗi dòng một ô "Chọn kết quả" (số dòng theo số quyết định/hành vi/yêu cầu bồi thường của đơn)
      const soO = await d.locator('.ant-select').filter({ has: m.page.locator('.ant-select-selection-placeholder', { hasText: /^Chọn kết quả$/ }) }).count();
      const cacO: Locator[] = [];
      for (let i = 0; i < soO; i++) cacO.push(await oChonTheoGoiY(m, d, /^Chọn kết quả$/, i));
      const ketQua: string[] = [];
      for (const o of cacO) {
        await o.scrollIntoViewIfNeeded();
        ketQua.push(await m.chonTrong(o));
      }

      // Căn cứ pháp lý: Bộ luật mặc định · Điều, Khoản ngẫu nhiên → "Thêm căn cứ"
      const oDieu = m.oTheoNhan(/^\s*Điều\s*$/, d);
      await oDieu.scrollIntoViewIfNeeded();
      const dieu = await m.chonTrong(oDieu);
      await m.page.waitForTimeout(800);
      const khoan = await m.chonTrong(m.oTheoNhan(/^\s*Khoản\s*$/, d)).catch(() => '');
      await m.nut(d, 'Thêm căn cứ').click();
      await expect(d.getByText('Chưa có căn cứ pháp lý'), 'Điều luật chưa vào bảng căn cứ pháp lý').toBeHidden({ timeout: 10_000 });

      await m.nut(d, 'Thêm mới bản án').click();
      await m.choThongBao(/thành công|Đã lưu/i);
      const nutKy = m.nut(m.page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last(), /Ký logic/);
      await nutKy.waitFor({ timeout: 30_000 });
      await nutKy.click();
      await m.dongYTatCaXacNhan();
      await m.choThongBao(/Ký logic thành công/);
      await m.page.locator('.ant-drawer-open button, .ant-modal-wrap:visible button').filter({ hasText: /^\s*Đóng\s*$/ }).last().click();
      await m.choTaiXong(1500);
      test.info().annotations.push({ type: 'Bản án', description: `kết quả: ${ketQua.join(' ; ')} · căn cứ ${dieu} ${khoan} · án lệ ${anLe}` });
    }

    // ── Lưu kết quả (ô đơn này xong; lần chạy sau ô sẽ tạo đơn mới) ──
    test.info().annotations.push({ type: 'Vụ án đã tạo', description: `${tt.maVuAnHeThong} · bản án số ${soBanAn} · ${urlVuAn}` });
    return { soBanAn, ngayBanAn };
  },
};
