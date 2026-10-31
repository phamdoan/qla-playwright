import { Buoc } from '../../../common/buoc';
import { Don10H, TrangThai10H } from '../cau-hinh-10H';
import { dinhKemTep, lapVanBanKyLogic, moHoSo, nutHoacXong, oHien } from './chung';

/**
 * BƯỚC 02 · Yêu cầu chuyển hồ sơ (hướng dẫn bước 2)
 *
 *  1. Mở chi tiết đơn → tab "Hòa giải" › "Mở danh sách xử lý cấp tỉnh" → dòng của quyết định công nhận → bấm mã hồ sơ (DNKN-…)
 *  2. Tab "Thụ lý" › "Yêu cầu chuyển hồ sơ" → "Dùng số" · Ngày văn bản, Hạn Tòa án nguồn chuyển hồ sơ = hôm nay
 *     · Nội dung yêu cầu · tệp văn bản (.pdf)
 *  3. "Lưu" → "Ký logic" → "Đóng"
 * Nút "Yêu cầu chuyển hồ sơ" không còn (lượt trước đã gửi) → bỏ qua.
 */
export const buoc02: Buoc<Don10H, TrangThai10H> = {
  so: 2,
  ten: 'Mở hồ sơ xử lý đề nghị, yêu cầu chuyển hồ sơ, ký logic',
  huongDan: '2',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    if (tt.ketThucKhac) return;
    const { m, maHoSo, urlHoSo } = await moHoSo(await moPhien(tkToa(vuAn.toaAn)), can('soQDCongNhan', 1), tt.urlHoSo, 'Thụ lý');
    const main = m.page.locator('main');
    const nut = main.getByRole('button', { name: 'Yêu cầu chuyển hồ sơ', exact: true });
    if ((await nutHoacXong(m, nut, /YÊU CẦU CHUYỂN HỒ SƠ (?!CHƯA THỰC HIỆN)\S/)) === 'xong') return { maHoSo, urlHoSo };

    await nut.click();
    const bm = m.popup(/Yêu cầu chuyển hồ sơ/);
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();
    const soYeuCauChuyenHS = await lapVanBanKyLogic(m, bm, async () => {
      await oHien(m, bm, /Nội dung yêu cầu/).locator('textarea').first().fill('Đề nghị Tòa án đã ra quyết định công nhận chuyển hồ sơ để xem xét đề nghị.');
      await dinhKemTep(m, bm);
    });
    return { maHoSo, urlHoSo, soYeuCauChuyenHS };
  },
};
