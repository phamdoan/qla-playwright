import { Buoc } from '../../../common/buoc';
import { TrangThai6B, VuAn6B } from '../cau-hinh-6B';
import { ngay } from '../../../../utils/fake-data';
import { chonNguoiKy, dungSo, luuKyBieuMau, moVuAn, popup, themNguoiPhanCong } from './chung';

/**
 * BƯỚC 08 · Tòa phúc thẩm · Quyết định phân công Thẩm phán (hướng dẫn bước 8)
 *
 *  1. Tab "Phân công" → "Thêm phân công" ▾ › "Quyết định phân công Thẩm phán…" → popup
 *  2. "Dùng số" · Ngày quyết định = hôm nay · Người ký/người phân công = chủ tài khoản
 *  3. Vai trò "Thẩm phán chủ tọa phiên tòa" · Tên người được phân công = CHỦ TÀI KHOẢN (ký các văn bản bước 09–12) → mũi tên
 *  4. "Lưu" → "Ký logic" → "Đóng"
 * Đã có Thẩm phán chủ tọa phiên tòa (lượt trước) → bỏ qua.
 */
export const buoc08: Buoc<VuAn6B, TrangThai6B> = {
  so: 8,
  ten: 'Tòa phúc thẩm · Phân công Thẩm phán chủ tọa (chủ tài khoản), ký logic',
  huongDan: '8',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaPhucTham);
    if (!tk.ten) throw new Error(`Taikhoan.xlsx: tài khoản ${tk.taiKhoan} chưa có cột "Tên" — cần để chọn Thẩm phán chủ tọa`);
    const m = await moVuAn(await moPhien(tk), can('urlVuAnPT', 7));
    await m.moTab('phan-cong');
    const main = m.page.locator('main');
    if (await main.locator('tbody tr').filter({ hasText: 'Thẩm phán chủ tọa' }).count()) {
      return { chuToa: tt.chuToa ?? tk.ten, soQDPhanCong: tt.soQDPhanCong };
    }

    await m.nut(main, /^\s*Thêm phân công\s*$/).click();
    await m.page.locator('.ant-dropdown:visible li').filter({ hasText: /phân công Thẩm phán/i }).first().click();
    const bm = popup(m, /phân công/i);
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong(1500);

    const soQDPhanCong = await dungSo(m, bm, 'Số quyết định');
    await m.ngay(bm, 'Ngày quyết định', ngay(0));
    if (await m.oTheoNhan('Người ký/người phân công', bm).isVisible().catch(() => false)) await chonNguoiKy(m, bm, tk.ten);
    const chuToa = await themNguoiPhanCong(m, bm, 'Thẩm phán chủ tọa phiên tòa', tk.ten);
    await luuKyBieuMau(m, bm);
    return { chuToa, soQDPhanCong };
  },
};
