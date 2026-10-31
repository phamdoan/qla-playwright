import { Buoc } from '../../../common/buoc';
import { TrangThai5B, VuAn5B } from '../cau-hinh-5B';
import { ngay } from '../../../../utils/fake-data';
import { luuKyBieuMau, moVuAn, popup } from './chung';

/**
 * BƯỚC 02 · Tòa sơ thẩm · Giấy xác nhận quyết định kháng nghị (hướng dẫn bước 2)
 *
 *  1. Tab "Kết quả sơ thẩm" → mục "Danh sách kháng nghị" → dòng kháng nghị → "…" › "Giấy xác nhận quyết định kháng nghị"
 *  2. Ngày quyết định = hôm nay · "Dùng số" · Phương thức gửi quyết định "Nộp trực tiếp"
 *  3. "Lưu" → "Ký logic" → "Đóng"
 * Đã có giấy xác nhận đã ký (mục "Danh sách thông báo kháng cáo, kháng nghị") → bỏ qua.
 */
export const buoc02: Buoc<VuAn5B, TrangThai5B> = {
  so: 2,
  ten: 'Tòa sơ thẩm · Giấy xác nhận quyết định kháng nghị, ký logic',
  huongDan: '2',
  chay: async ({ vuAn, tt, moPhien, tkToa }) => {
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaSoTham)), vuAn.linkVuAn);
    await m.moTab('quan-ly-an');
    const tb = await m.moMuc('Danh sách thông báo kháng cáo, kháng nghị');
    await m.choBang(tb);
    if (await tb.locator('.ant-table-row').filter({ hasText: /xác nhận/i }).filter({ hasText: /Đã ký|hiệu lực|Hoàn thành/ }).count()) {
      return { soGiayXacNhan: tt.soGiayXacNhan };
    }

    const ds = await m.moMuc('Danh sách kháng nghị');
    await m.choBang(ds);
    const dong = ds.locator('.ant-table-row').first();
    await dong.locator('button:has(.anticon-more), button:has(.anticon-ellipsis)').first().click();
    await m.page.locator('.ant-dropdown:visible li').filter({ hasText: /Giấy xác nhận/ }).first().click();
    const bm = popup(m, /Giấy xác nhận/);
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong(1500);
    // Giấy đã ký ở lượt trước nhưng "Danh sách thông báo…" vẫn trống (dòng kháng nghị vẫn hiện "+ Lập giấy XN")
    // → mở ra là biểu mẫu chỉ xem, ô ngày bị khóa → đóng lại, coi như xong
    if (await m.oTheoNhan('Ngày quyết định', bm).locator('input').first().isDisabled()) {
      await m.nut(bm, 'Đóng').click().catch(() => undefined);
      return { soGiayXacNhan: tt.soGiayXacNhan };
    }

    await m.ngay(bm, 'Ngày quyết định', ngay(0));
    const nutSo = m.nut(bm, /Dùng số/);
    const soGiayXacNhan = ((await nutSo.innerText()).match(/\d+/) ?? [''])[0];
    await nutSo.click();
    await m.chon(bm, 'Phương thức gửi quyết định', 'Nộp trực tiếp');
    await luuKyBieuMau(m, bm);
    return { soGiayXacNhan };
  },
};
