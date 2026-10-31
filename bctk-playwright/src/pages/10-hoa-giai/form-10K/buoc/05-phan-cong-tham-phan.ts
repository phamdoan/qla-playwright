import { Buoc } from '../../../common/buoc';
import { Don10K, THAM_PHAN_10K, TrangThai10K } from '../cau-hinh-10K';
import { dinhKemTep, lapVanBanKyLogic, moHoSo, nutHoacXong, oHien } from './chung';

/**
 * BƯỚC 05 · Phân công Thẩm phán xem xét đề nghị (hướng dẫn bước 5)
 *
 *  1. Mở hồ sơ DNKN → tab "Phân công" › "Phân công Thẩm phán"
 *  2. "Dùng số" · Ngày văn bản phân công = hôm nay · Thẩm phán được phân công (Nguyễn Mậu Trường) · Ghi chú · tệp (.pdf)
 *  3. "Lưu" → "Ký logic" → "Đóng"
 * Bảng "Người tiến hành tố tụng" đã có thẩm phán (lượt trước đã phân công) → bỏ qua.
 */
export const buoc05: Buoc<Don10K, TrangThai10K> = {
  so: 5,
  ten: 'Phân công Thẩm phán, dùng số, ký logic',
  huongDan: '5',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    if (tt.ketThucKhac) return;
    const { m } = await moHoSo(await moPhien(tkToa(vuAn.toaAn)), can('soQDCongNhan', 1), tt.urlHoSo, 'Phân công');
    const main = m.page.locator('main');
    const nut = main.getByRole('button', { name: 'Phân công Thẩm phán', exact: true });
    if ((await nutHoacXong(m, nut, /Người tiến hành tố tụng (?!.*Chưa phân công Thẩm phán)/)) === 'xong') return {};

    await nut.click();
    const bm = m.popup(/Phân công Thẩm phán/);
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();
    let thamPhan = '';
    const soPhanCong = await lapVanBanKyLogic(m, bm, async () => {
      thamPhan = (await m.chonTrong(oHien(m, bm, /Thẩm phán được phân công/), THAM_PHAN_10K)).split(' - ')[0].trim();
      await oHien(m, bm, /Ghi chú/).locator('textarea').first().fill('Phân công Thẩm phán xem xét đề nghị.');
      await dinhKemTep(m, bm);
    });
    return { thamPhan, soPhanCong };
  },
};
