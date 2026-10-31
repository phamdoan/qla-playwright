import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai6A } from '../cau-hinh-6A';
import { ngay } from '../../../../utils/fake-data';
import { ORIGIN } from '../../../../../playwright.config';
import { ManHinh } from '../../../base.page';
import { chonNguoiKy, dungSo, moChiTietDon, popup } from './chung';

/**
 * BƯỚC 07 · Thụ lý vụ án (hướng dẫn B9.21–B9.23)
 *
 *  1. Tab "Kết quả xử lý" → nút "Thụ lý vụ" (cuối tab; chỉ mở khi đã nộp đủ tạm ứng)
 *  2. Popup "Thông báo về việc thụ lý vụ án": Người ký = chủ tài khoản · Ngày thụ lý = hôm nay
 *     · "Dùng số" dưới Số thông báo VÀ dưới Số thụ lý (cả hai đều cần) → "Lưu" → "Ký logic" → "Đóng"
 *  3. Chỗ nút "Thụ lý vụ" hiện mã vụ án VA… → bấm để sang "Chi tiết vụ án" (ghi lại link)
 */
export const buoc07: Buoc<DonNguon, TrangThai6A> = {
  so: 7,
  ten: 'Thụ lý vụ án (thông báo thụ lý, dùng số, ký logic), mở chi tiết vụ án',
  huongDan: 'B9.21–B9.23',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaAn);
    const m = await moChiTietDon(await moPhien(tk), can('urlDon', 1));
    await m.moTab('ket-qua-xu-ly');
    const main = m.page.locator('main');
    const nutMaVuAn = m.nut(main, /^\s*VA\d{2}-\d+\s*$/);

    let soTBThuLy = tt.soTBThuLy;
    let ngayThuLy = tt.ngayThuLy;
    if (!(await nutMaVuAn.isVisible().catch(() => false))) {
      await m.nut(main, 'Thụ lý vụ').click();
      const bm = popup(m, 'Thông báo về việc thụ lý vụ án');
      await bm.waitFor({ timeout: 30_000 });
      await m.choTaiXong();

      if (tk.ten) await chonNguoiKy(m, bm, tk.ten);
      ngayThuLy = await m.ngay(bm, 'Ngày thụ lý', ngay(0));
      soTBThuLy = await dungSo(m, bm, 'Số thông báo');
      await dungSo(m, bm, 'Số thụ lý');
      await m.nut(bm, 'Lưu').click();
      await m.choThongBao(/Lưu quyết định thành công/);
      const nutKy = m.nut(bm, /Ký logic/);
      await nutKy.waitFor({ timeout: 30_000 });
      await nutKy.click();
      await m.choThongBao(/Ký logic thành công/);
      await m.nut(bm, 'Đóng').click();
      await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
      await m.choTaiXong(1500);
    }

    // Mã vụ án hiện tại chỗ nút "Thụ lý vụ" → bấm sang chi tiết vụ án sơ thẩm (vụ án hành chính mở ở màn vu-an/hanh-chinh/so-tham/chi-tiet — lấy đúng link đang mở)
    await nutMaVuAn.waitFor({ timeout: 30_000 });
    const maVuAnHeThong = (await nutMaVuAn.innerText()).trim();
    await nutMaVuAn.click();
    await m.page.waitForURL(/\/(vu-an|quan-ly-so-tham)\/.+\/chi-tiet\?id=/, { timeout: 60_000 });
    const url = new URL(m.page.url());
    await new ManHinh(m.page).choTaiXong(1500);
    return {
      urlVuAn: `${ORIGIN}${url.pathname}?id=${url.searchParams.get('id')}`,
      maVuAnHeThong,
      soTBThuLy,
      ngayThuLy,
    };
  },
};
