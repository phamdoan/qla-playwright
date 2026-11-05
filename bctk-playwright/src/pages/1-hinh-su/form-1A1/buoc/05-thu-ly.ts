import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { TrangThai1A1, VuNguon } from '../cau-hinh-1A1';
import { ngay } from '../../../../utils/fake-data';
import { chonVienKiemSat, dauTrangVuAn, moVuAn } from './chung';

/**
 * BƯỚC 05 · Thụ lý vụ án (hướng dẫn bước 5)
 *
 *  1. Mở chi tiết vụ án → tab "Thụ lý" → nút "Thụ lý" → popup "Cấp số thụ lý vụ án"
 *  2. Thủ tục áp dụng "Thủ tục thông thường" · Số thụ lý: bấm "Dùng số" · Ngày thụ lý = hôm nay
 *     · Viện kiểm sát cùng địa bàn với tòa của tài khoản (không có thì mục đầu tiên) — các ô khác hệ thống tự điền, giữ nguyên
 *  3. "Xác nhận thụ lý" → "Lưu thụ lý thành công"
 */
export const buoc05: Buoc<VuNguon, TrangThai1A1> = {
  so: 5,
  ten: 'Thụ lý vụ án (Dùng số, ngày thụ lý hôm nay)',
  huongDan: '5',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaAn)), can('urlVuAn', 2));
    // Đã thụ lý ở lượt trước → đầu trang có "Số thụ lý: N · Ngày thụ lý: …"
    const dau = await dauTrangVuAn(m);
    const daThuLy = dau.match(/Số thụ lý:\s*(\d+)\s*·\s*Ngày thụ lý:\s*(\d{2}\/\d{2}\/\d{4})/);
    if (daThuLy) return { soThuLy: daThuLy[1], ngayThuLy: daThuLy[2] };

    await m.moTab('thu-ly');
    const main = m.page.locator('main');
    await m.nut(main, 'Thụ lý').click();
    const bm = m.popup('Cấp số thụ lý vụ án');
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    if ((await m.docGiaTri('Thủ tục áp dụng', bm)) !== 'Thủ tục thông thường') await m.chon(bm, 'Thủ tục áp dụng', 'Thủ tục thông thường');
    const oSo = m.oTheoNhan('Số thụ lý', bm).locator('input').first();
    await m.nut(bm, /Dùng số/).click();
    await expect(oSo, 'Bấm "Dùng số" nhưng ô "Số thụ lý" vẫn trống').not.toHaveValue('', { timeout: 10_000 });
    const soThuLy = await oSo.inputValue();
    const ngayThuLy = await m.ngay(bm, 'Ngày thụ lý', ngay(0));
    const vienKiemSat = await chonVienKiemSat(m, m.oTheoNhan('Viện kiểm sát', bm), vuAn.toaAn);

    await m.nut(bm, 'Xác nhận thụ lý').click();
    await m.choThongBao(/Lưu thụ lý thành công/);
    await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    return { soThuLy, ngayThuLy, vienKiemSat };
  },
};
