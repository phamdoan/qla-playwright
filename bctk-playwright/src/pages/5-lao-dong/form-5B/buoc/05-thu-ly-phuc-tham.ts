import { Buoc } from '../../../common/buoc';
import { TrangThai5B, VuAn5B } from '../cau-hinh-5B';
import { moVuAn, popup } from './chung';

/**
 * BƯỚC 05 · Tòa phúc thẩm · Thụ lý vụ án phúc thẩm (hướng dẫn bước 5)
 *
 *  1. Chi tiết vụ án phúc thẩm → tab "Thụ lý" → "Thụ lý" → popup "Thụ lý vụ án dân sự"
 *  2. Trường hợp thụ lý = "Thụ lý phúc thẩm theo kháng nghị" (mặc định là kháng cáo) · số, ngày hệ thống điền sẵn
 *  3. "Lưu"
 * Nút "Thụ lý" không còn (lượt trước đã thụ lý) → bỏ qua.
 */
export const buoc05: Buoc<VuAn5B, TrangThai5B> = {
  so: 5,
  ten: 'Tòa phúc thẩm · Thụ lý phúc thẩm theo kháng nghị',
  huongDan: '5',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaPhucTham)), can('urlVuAnPT', 4));
    await m.moTab('thu-ly');
    const nutThuLy = m.nut(m.page.locator('main'), 'Thụ lý');
    if (!(await nutThuLy.isVisible().catch(() => false))) return { soThuLyPT: tt.soThuLyPT };

    await nutThuLy.click();
    const bm = popup(m, 'Thụ lý vụ án');
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong(1500);
    // Nhãn ở popup này có dấu "*" trong chữ → tìm theo regex
    await m.chon(bm, /Trường hợp thụ lý/, /theo kháng nghị/);
    const oSo = m.oTheoNhan(/Số thụ lý/, bm).locator('input').first();
    if (!(await oSo.inputValue())) await m.nut(bm, /Dùng số/).click();
    const soThuLyPT = await oSo.inputValue();
    const ngayThuLyPT = await m.oTheoNhan(/Ngày thụ lý/, bm).locator('input').first().inputValue({ timeout: 3_000 }).catch(() => '');
    await m.nut(bm, 'Lưu').click();
    await m.choThongBao(/thành công/i);
    await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    return { soThuLyPT, ngayThuLyPT };
  },
};
