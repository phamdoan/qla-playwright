import { Buoc } from '../../../common/buoc';
import { Don10B, TrangThai10B } from '../cau-hinh-10B';
import { dienNgay, dinhKemTep, moHoSo, nutHoacXong, oHien } from './chung';

/**
 * BƯỚC 06 · Thêm hoạt động xác minh, nghiên cứu hồ sơ (hướng dẫn bước 6)
 *
 *  1. Mở hồ sơ DNKN → tab "Thu thập chứng cứ" › "Thêm hoạt động" → popup "Cập nhật xác minh, nghiên cứu hồ sơ"
 *  2. Ngày thực hiện = hôm nay · Loại hoạt động để mặc định "Nghiên cứu hồ sơ" · Chủ thể liên quan để trống (áp dụng toàn hồ sơ)
 *     · Nội dung thực hiện · Kết quả · tài liệu kèm theo (.pdf)
 *  3. "Lưu"
 * Mục "Hoạt động xác minh, thu thập chứng cứ" đã có dữ liệu (lượt trước) → bỏ qua.
 */
export const buoc06: Buoc<Don10B, TrangThai10B> = {
  so: 6,
  ten: 'Thêm hoạt động xác minh, nghiên cứu hồ sơ',
  huongDan: '6',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const { m } = await moHoSo(await moPhien(tkToa(vuAn.toaAn)), can('soQDCongNhan', 1), tt.urlHoSo, 'Thu thập chứng cứ');
    const main = m.page.locator('main');
    const nut = main.getByRole('button', { name: 'Thêm hoạt động', exact: true });
    if ((await nutHoacXong(m, nut, /Hoạt động xác minh, thu thập chứng cứ Thêm hoạt động (?!Chưa phát sinh)\S/)) === 'xong') {
      return { daThemHoatDong: true };
    }

    await nut.click();
    const bm = m.popup(/Cập nhật xác minh, nghiên cứu hồ sơ/);
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();
    await dienNgay(oHien(m, bm, /Ngày thực hiện/));
    await oHien(m, bm, /Nội dung thực hiện/).locator('textarea').first().fill('Nghiên cứu hồ sơ vụ việc hòa giải và quyết định công nhận.');
    await oHien(m, bm, /^\s*\*?\s*Kết quả/).locator('textarea').first().fill('Đã nghiên cứu toàn bộ hồ sơ.');
    await dinhKemTep(m, bm);
    await m.nut(bm, 'Lưu').click();
    await m.choThongBao(/thành công/i);
    await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    await m.choTaiXong(1500);
    return { daThemHoatDong: true };
  },
};
