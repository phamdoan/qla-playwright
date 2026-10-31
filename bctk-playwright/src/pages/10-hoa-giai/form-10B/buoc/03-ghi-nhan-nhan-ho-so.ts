import { Buoc } from '../../../common/buoc';
import { Don10B, TrangThai10B } from '../cau-hinh-10B';
import { dienNgay, dinhKemTep, moHoSo, nutHoacXong, oHien } from './chung';

/**
 * BƯỚC 03 · Ghi nhận đã nhận hồ sơ (hướng dẫn bước 3)
 *
 *  1. Mở hồ sơ DNKN → tab "Thụ lý" › "Ghi nhận đã nhận hồ sơ"
 *  2. Phương thức nhận "Trực tiếp" · Tình trạng hồ sơ "Đủ" · Người bàn giao/Đơn vị gửi · Ghi chú · tệp biên bản bàn giao (.pdf)
 *  3. "Lưu"
 * Nút "Ghi nhận đã nhận hồ sơ" không còn (lượt trước đã ghi nhận) → bỏ qua.
 */
export const buoc03: Buoc<Don10B, TrangThai10B> = {
  so: 3,
  ten: 'Ghi nhận đã nhận hồ sơ',
  huongDan: '3',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const { m } = await moHoSo(await moPhien(tkToa(vuAn.toaAn)), can('soQDCongNhan', 1), tt.urlHoSo, 'Thụ lý');
    const main = m.page.locator('main');
    const nut = main.getByRole('button', { name: 'Ghi nhận đã nhận hồ sơ', exact: true });
    if ((await nutHoacXong(m, nut, /NHẬN HỒ SƠ NGUỒN (?!CHƯA THỰC HIỆN)\S/)) === 'xong') return { daNhanHoSo: true };

    await nut.click();
    const bm = m.popup(/Ghi nhận đã nhận hồ sơ/);
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();
    await dienNgay(oHien(m, bm, /Ngày văn bản\/Ngày nhận/));
    await m.chonTrong(oHien(m, bm, /Phương thức nhận/), /^\s*Trực tiếp\s*$/);
    await m.chonTrong(oHien(m, bm, /Tình trạng hồ sơ/), /^\s*Đủ\s*$/);
    await oHien(m, bm, /Người bàn giao\/Đơn vị gửi/).locator('input, textarea').first().fill('Tòa án nhân dân khu vực 9 - Hà Nội');
    await oHien(m, bm, /Ghi chú/).locator('textarea').first().fill('Đã nhận đủ hồ sơ.');
    await dinhKemTep(m, bm);
    await m.nut(bm, 'Lưu').click();
    await m.choThongBao(/thành công/i);
    await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    await m.choTaiXong(1500);
    return { daNhanHoSo: true };
  },
};
