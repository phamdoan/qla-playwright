import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai10C } from '../cau-hinh-10C';
import { hoaGiai, ketThucKhac, lapBieuMauKyLogic, moChiTietDon, oHien, soVanBan } from './chung';

/**
 * BƯỚC 05 · Chỉ định Hòa giải viên — Mẫu 06 (hướng dẫn b4)
 *
 *  1. Mở chi tiết đơn → tab "Hòa giải" → mục "Chỉ định hòa giải viên" › "Chỉ định Hòa giải viên — Mẫu 06"
 *     → popup "Quyết định chỉ định hòa giải viên (06-HG)"
 *  2. Ngày quyết định = hôm nay → "Dùng số"
 *  3. Phạm vi lựa chọn Hòa giải viên "Tòa án đang giải quyết đơn" → Người được chỉ định: một Hòa giải viên
 *     → Lý do chỉ định "Xét việc người khởi kiện/người yêu cầu không lựa chọn Hòa giải viên"
 *  4. "Lưu" → "Ký logic" → "Đóng"
 */
export const buoc05: Buoc<DonNguon, TrangThai10C> = {
  so: 5,
  ten: 'Chỉ định Hòa giải viên (Mẫu 06-HG), dùng số, ký logic',
  huongDan: 'b4',
  chay: async ({ vuAn, moPhien, tkToa, can, tt }) => {
    if (tt.ketThucKhac) return;
    const m = await moChiTietDon(await moPhien(tkToa(vuAn.toaAn)), can('urlDon', 1));
    await m.moTab('hoa-giai-doi-thoai');
    const main = m.page.locator('main');
    const kt = await ketThucKhac(m);
    if (kt) return { ketThucKhac: kt };
    const docHGV = async () =>
      (await main.innerText()).match(/HÒA GIẢI VIÊN ĐƯỢC CHỈ ĐỊNH\s*\n\s*(.+)/i)?.[1]?.trim();

    // Lượt trước đã ban hành quyết định chỉ định → đọc lại số và hòa giải viên
    const daCo = await soVanBan(m, hoaGiai('Quyết định chỉ định hòa giải viên'));
    if (daCo) return { soQDChiDinhHGV: daCo, hoaGiaiVien: await docHGV() };

    await m.nut(main, hoaGiai('Chỉ định Hòa giải viên — Mẫu 06')).click();
    // Đơn hành chính (10I) dùng mẫu 06-ĐT thay cho 06-HG
    const bm = m.popup(/\(06-(?:HG|ĐT)\)/);
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    let hoaGiaiVien = '';
    const soQDChiDinhHGV = await lapBieuMauKyLogic(m, bm, async () => {
      // Chọn bằng RegExp (không gõ chữ để lọc): ô này gõ vào thì danh sách lọc ra rỗng
      await m.chonTrong(oHien(m, bm, hoaGiai('Phạm vi lựa chọn Hòa giải viên')), /Tòa án đang giải quyết đơn/);
      await m.page.waitForTimeout(800);
      hoaGiaiVien = (await m.chonTrong(oHien(m, bm, /Người được chỉ định/))).split(' - ')[0].trim();
      await m.chonTrong(oHien(m, bm, /Lý do chỉ định/), hoaGiai('không lựa chọn Hòa giải viên'));
    });
    // Ô "Số quyết định" chỉ có phần số; bảng văn bản có số đầy đủ (…/2026/QĐ-CĐHGV)
    return {
      soQDChiDinhHGV: (await soVanBan(m, hoaGiai('Quyết định chỉ định hòa giải viên'))) ?? soQDChiDinhHGV,
      hoaGiaiVien: hoaGiaiVien || (await docHGV()),
    };
  },
};
