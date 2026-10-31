import { Buoc } from '../../../common/buoc';
import { ManHinh, dungChu } from '../../../base.page';
import { TrangThai1B, VuAnNguon } from '../cau-hinh-1B';
import { ngay } from '../../../../utils/fake-data';
import { MAU_THONG_BAO, dungSo, khoiDon, moVuAnSoTham, mucKhangCao } from './chung';

/**
 * BƯỚC 03 · Tòa sơ thẩm · Lập thông báo, ký logic (hướng dẫn bước 3)
 *
 *  1. Mở vụ án sơ thẩm → "Kháng cáo, kháng nghị" → dòng đơn/quyết định → "Lập biểu mẫu"
 *  2. Chọn "Thông báo về việc kháng cáo" (luồng 1) / "Thông báo về việc kháng nghị" (luồng 2)
 *  3. Ngày thông báo = hôm nay · "Dùng số"
 *  4. "Người được thông báo" › người liên quan: ưu tiên "Bị cáo …" → mũi tên thêm vào bảng
 *  5. "Lưu" → "Ký logic" → "Đóng"
 */
export const buoc03: Buoc<VuAnNguon, TrangThai1B> = {
  so: 3,
  ten: 'Tòa sơ thẩm · Lập thông báo, ký logic',
  huongDan: '3',
  chay: async ({ vuAn, moPhien, tkToa }) => {
    const vu = await moVuAnSoTham(await moPhien(tkToa(vuAn.toaAn)), vuAn.urlVuAnSoTham);
    const m: ManHinh = vu.m;
    if (vu.daChuyenPhucTham) return;

    // Bảng "Văn bản xử lý KC/KN" (bảng cuối của mục) đã có thông báo ở lượt trước → bỏ qua
    const muc = await mucKhangCao(m);
    await m.choBang(muc.locator('.ant-table-wrapper').last());
    if (await muc.locator('.ant-table-row').filter({ hasText: MAU_THONG_BAO[vuAn.luong] }).count()) return;

    const dong = await m.dong(await khoiDon(m, vuAn.luong), 'Lập biểu mẫu');
    await dong.getByText('Lập biểu mẫu', { exact: true }).click();
    await m.page.locator('.ant-dropdown:visible').getByText(MAU_THONG_BAO[vuAn.luong], { exact: true }).click();
    const bm = m.popup(MAU_THONG_BAO[vuAn.luong]);
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    const oNgay = m.oTheoNhan('Ngày thông báo', bm);
    if (await oNgay.isVisible().catch(() => false) && !(await oNgay.locator('input').first().inputValue())) await m.ngay(bm, 'Ngày thông báo', ngay(0));
    await dungSo(m, bm);

    // Người được thông báo
    const hang = bm.locator('.ant-row').filter({ has: m.page.getByText(/Người liên quan đến kháng (cáo|nghị)/) }).last();
    const biCao = (await m.cacLuaChonTrong(hang)).find(n => /^Bị cáo/.test(n));
    await m.chonTrong(hang, biCao ? dungChu(biCao) : undefined);
    await hang.locator('button:has(.anticon-arrow-down)').first().click();
    await bm.locator('.ant-table').filter({ hasText: 'Địa vị pháp lý' }).locator('.ant-table-row').first().waitFor({ timeout: 15_000 });

    await m.nut(bm, 'Lưu').click();
    await m.choThongBao(/Lưu quyết định thành công/);
    await m.nut(bm, /Ký logic/).click();
    await m.choThongBao(/Ký logic thành công/);
    await m.nut(bm, 'Đóng').click();
    await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  },
};
