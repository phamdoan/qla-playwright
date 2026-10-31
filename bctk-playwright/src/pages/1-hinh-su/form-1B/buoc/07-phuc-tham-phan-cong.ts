import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { TrangThai1B, VuAnNguon } from '../cau-hinh-1B';
import { dungSo, kyLogicVaDong } from './chung';

/**
 * BƯỚC 07 · Tòa phúc thẩm · Phân công thẩm phán chủ tọa, ký logic (hướng dẫn bước 7)
 *
 *  1. Mở vụ án phúc thẩm → tab "Phân công" › "Danh sách quyết định phân công"
 *  2. "Phân công" › "Phân công Thẩm phán" → "Dùng số" → vai trò "Thẩm phán chủ tọa" → chọn người
 *     → mũi tên thêm vào bảng
 *  3. "Lưu" → "Ký logic" → "Đóng"
 * Bảng đã có "Thẩm phán chủ tọa" (lượt trước) → chỉ đọc lại.
 */
export const buoc07: Buoc<VuAnNguon, TrangThai1B> = {
  so: 7,
  ten: 'Tòa phúc thẩm · Phân công thẩm phán chủ tọa, ký logic',
  huongDan: '7',
  chay: async ({ moPhien, tkToa, can }) => {
    const phien = await moPhien(tkToa(can('toaPhucTham', 4)));
    await phien.vao(can('urlVuAn', 5));
    const m = new ManHinh(phien.page);
    await m.moTab('phan-cong');
    const muc = await m.moMuc('Danh sách quyết định phân công');

    await m.choBang(muc);
    const daCo = muc.locator('.ant-table-row').filter({ hasText: 'Thẩm phán chủ tọa' }).first();
    if (await daCo.count()) return { chuToa: (await m.docCot(daCo, 'Người được phân công')).split('\n')[0] };

    await m.nut(muc, 'Phân công').click();
    await m.page.locator('.ant-dropdown:visible').getByText('Phân công Thẩm phán', { exact: true }).click();
    const bm = m.popup('Phân công Thẩm phán');
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();
    await dungSo(m, bm);

    await m.chon(bm, 'Vai trò', /Thẩm phán chủ tọa/);
    await m.page.waitForTimeout(800);
    const chuToa = (await m.chon(bm, 'Tên người được phân công')).split(' - ')[0].trim();
    await bm.locator('button:has(.anticon-arrow-down)').first().click();
    await bm.locator('.ant-table-row').filter({ hasText: chuToa }).first().waitFor({ timeout: 15_000 });

    await m.nut(bm, 'Lưu').click();
    await m.choThongBao(/Lưu quyết định thành công|thành công/i);
    await kyLogicVaDong(m, bm);
    return { chuToa };
  },
};
