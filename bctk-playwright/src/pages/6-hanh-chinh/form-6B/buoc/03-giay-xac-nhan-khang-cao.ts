import { Buoc } from '../../../common/buoc';
import { TrangThai6B, VuAn6B, coKhangCao } from '../cau-hinh-6B';
import { dungSo, luuKyBieuMau, moVuAn, popup } from './chung';

/**
 * BƯỚC 03 · Tòa sơ thẩm · Giấy xác nhận đã nhận đơn kháng cáo (25-HC) (hướng dẫn bước 3)
 *
 *  1. Tab "Kết quả sơ thẩm" → mục "Danh sách kháng cáo" → dòng đơn → "…" › "Giấy xác nhận đã nhận đơn kháng cáo (25-HC)"
 *  2. "Dùng số" (ngày xác nhận, người ký, thông tin đơn hệ thống điền sẵn)
 *  3. "Lưu" → "Ký logic" → "Đóng"
 * Luồng không có kháng cáo, hoặc giấy đã ký (drawer có "Hủy ký số") → bỏ qua.
 */
export const buoc03: Buoc<VuAn6B, TrangThai6B> = {
  so: 3,
  ten: 'Tòa sơ thẩm · Giấy xác nhận đã nhận đơn kháng cáo (25-HC), ký logic',
  huongDan: '3',
  chay: async ({ vuAn, tt, moPhien, tkToa }) => {
    if (!coKhangCao(vuAn)) return;
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaSoTham)), vuAn.linkVuAn);
    await m.moTab('quan-ly-an');
    const ds = await m.moMuc('Danh sách kháng cáo');
    await m.choBang(ds);
    const dong = ds.locator('.ant-table-row').first();
    await dong.waitFor({ timeout: 15_000 });
    await dong.locator('button:has(.anticon-more), button:has(.anticon-ellipsis)').first().click();
    await m.page.locator('.ant-dropdown:visible li').filter({ hasText: /Giấy xác nhận/ }).first().click();
    const bm = popup(m, /Giấy xác nhận đã nhận đơn kháng cáo/);
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong(1500);

    if (await m.nut(bm, /Hủy ký số/).isVisible().catch(() => false)) {
      await m.nut(bm, /^\s*Đóng\s*$/).click();
      await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
      return { soGiayXacNhan: tt.soGiayXacNhan };
    }
    const soGiayXacNhan = await dungSo(m, bm, 'Số xác nhận');
    await luuKyBieuMau(m, bm);
    return { soGiayXacNhan };
  },
};
