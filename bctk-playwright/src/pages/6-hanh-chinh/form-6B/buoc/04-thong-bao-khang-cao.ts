import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { TrangThai6B, VuAn6B, coKhangCao } from '../cau-hinh-6B';
import { dungSo, luuKyBieuMau, moVuAn, popup } from './chung';

/**
 * BƯỚC 04 · Tòa sơ thẩm · Thông báo về việc kháng cáo (32-HC) (hướng dẫn bước 4)
 * Hồ sơ chỉ sang "Hồ sơ vụ án chuyển đi" sau khi 32-HC được ký.
 *
 *  1. Tab "Kết quả sơ thẩm" → mục "Danh sách thông báo kháng cáo, kháng nghị" → ô chọn loại "Thông báo về việc kháng cáo (32-HC)"
 *     → "Thêm mới thông báo"
 *  2. "Dùng số" · Người ký ban hành = chủ tài khoản · Đơn kháng cáo = đơn ở bước 02
 *     · Những vấn đề yêu cầu Tòa án cấp phúc thẩm giải quyết (Viện kiểm sát cùng cấp điền sẵn)
 *  3. "Lưu" → "Ký logic" → "Đóng"
 * Luồng không có kháng cáo, hoặc đã có thông báo về việc kháng cáo đã ký → bỏ qua.
 */
export const buoc04: Buoc<VuAn6B, TrangThai6B> = {
  so: 4,
  ten: 'Tòa sơ thẩm · Thông báo về việc kháng cáo (32-HC), ký logic',
  huongDan: '4',
  chay: async ({ vuAn, tt, moPhien, tkToa }) => {
    if (!coKhangCao(vuAn)) return;
    const tk = tkToa(vuAn.toaSoTham);
    const m = await moVuAn(await moPhien(tk), vuAn.linkVuAn);
    await m.moTab('quan-ly-an');
    const ds = await m.moMuc('Danh sách thông báo kháng cáo, kháng nghị');
    await m.choBang(ds);
    if (await ds.locator('.ant-table-row').filter({ hasText: 'Thông báo về việc kháng cáo' }).filter({ hasText: 'Đã ký' }).count()) {
      return { soThongBao: tt.soThongBao };
    }

    const oLoai = ds.locator('.ant-select.bctk-chon-loai-thong-bao').first();
    await oLoai.scrollIntoViewIfNeeded();
    await m.chonTrong(oLoai, /\(32-HC\)/);
    await m.nut(ds, /Thêm mới thông báo/).click();
    const bm = popup(m, 'Thông báo về việc kháng cáo');
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong(1500);

    const soThongBao = await dungSo(m, bm, 'Số thông báo');
    const oKy = m.oTheoNhan('Người ký ban hành', bm);
    await m.chonTrong(oKy, tk.ten ? new RegExp(tk.ten) : undefined);
    await m.chonTrong(m.oTheoNhan('Đơn kháng cáo', bm));
    await expect(m.oTheoNhan('Đơn kháng cáo', bm).locator('.ant-select-selection-item').first(), 'Chưa chọn được đơn kháng cáo').toBeVisible();
    await m.nhap(bm, 'Những vấn đề yêu cầu Tòa án cấp phúc thẩm', 'Xem xét lại toàn bộ bản án sơ thẩm theo nội dung đơn kháng cáo');
    await luuKyBieuMau(m, bm);
    return { soThongBao };
  },
};
