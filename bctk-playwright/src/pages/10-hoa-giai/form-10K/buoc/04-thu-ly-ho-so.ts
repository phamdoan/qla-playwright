import { Buoc } from '../../../common/buoc';
import { Don10K, TrangThai10K } from '../cau-hinh-10K';
import { dinhKemTep, lapVanBanKyLogic, moHoSo, nutHoacXong } from './chung';

/**
 * BƯỚC 04 · Thụ lý hồ sơ đề nghị/kiến nghị (hướng dẫn bước 4)
 *
 *  1. Mở hồ sơ DNKN → tab "Thụ lý" › "Thụ lý hồ sơ"
 *  2. "Dùng số" · Ngày thụ lý, Hạn hoàn tất thụ lý & phân công = hôm nay · tệp thông báo thụ lý (.pdf)
 *  3. "Lưu" → "Ký logic" → "Đóng"
 * Thẻ "THỤ LÝ" không còn "CHƯA THỰC HIỆN" (lượt trước đã thụ lý) → bỏ qua.
 */
export const buoc04: Buoc<Don10K, TrangThai10K> = {
  so: 4,
  ten: 'Thụ lý hồ sơ đề nghị, dùng số, ký logic',
  huongDan: '4',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    if (tt.ketThucKhac) return;
    const { m } = await moHoSo(await moPhien(tkToa(vuAn.toaAn)), can('soQDCongNhan', 1), tt.urlHoSo, 'Thụ lý');
    const main = m.page.locator('main');
    const nut = main.getByRole('button', { name: 'Thụ lý hồ sơ', exact: true });
    // "THỤ LÝ VÀ PHÂN CÔNG" là trạng thái ở đầu trang, không phải thẻ thụ lý
    if ((await nutHoacXong(m, nut, /THỤ LÝ (?!CHƯA THỰC HIỆN|VÀ PHÂN CÔNG)\S/)) === 'xong') {
      return { soThuLy: (await main.innerText()).match(/Số thụ lý\s*\n?\s*(\d[^\s]*)/)?.[1] };
    }

    await nut.click();
    const bm = m.popup(/Thụ lý hồ sơ/);
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();
    const soThuLy = await lapVanBanKyLogic(m, bm, () => dinhKemTep(m, bm));
    return { soThuLy };
  },
};
