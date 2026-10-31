import { expect } from '@playwright/test';
import path from 'path';
import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai5A } from '../cau-hinh-5A';
import { DATA_DIR } from '../../../../utils/file-helper';
import { so8 } from '../../../../utils/fake-data';
import { moChiTietDon, popup } from './chung';

const CHUNG_TU = path.join(DATA_DIR, 'files', 'tai-lieu-mau.pdf');

/**
 * BƯỚC 05 · Ghi nhận nộp tạm ứng án phí (hướng dẫn bước 5)
 *
 *  1. Tab "Kết quả xử lý" → mục "Thông tin nộp tạm ứng án phí và chi phí tố tụng" → "Ghi nhận nộp phí"
 *  2. Popup "Xác minh biên lai": thông báo, người nộp, số tiền, ngày nộp hệ thống tự điền — giữ nguyên
 *     · Số biên lai (ngẫu nhiên) · Cơ quan thu · Tệp chứng từ (PDF mẫu)
 *  3. "Xác minh biên lai" → "Ghi nhận và xác minh biên lai thành công"
 */
export const buoc05: Buoc<DonNguon, TrangThai5A> = {
  so: 5,
  ten: 'Ghi nhận nộp phí, xác minh biên lai',
  huongDan: '5',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const m = await moChiTietDon(await moPhien(tkToa(vuAn.toaAn)), can('urlDon', 1));
    await m.moTab('ket-qua-xu-ly');
    const muc = await m.moMuc('Thông tin nộp tạm ứng án phí');

    // Đã nộp đủ ở lượt trước → dòng nghĩa vụ "Hoàn thành"
    if (await muc.locator('tbody tr').filter({ hasText: 'Hoàn thành' }).first().isVisible().catch(() => false)) return;

    await m.nut(muc, 'Ghi nhận nộp phí').click();
    const bm = popup(m, 'Xác minh biên lai');
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    const soBienLai = await m.nhap(bm, 'Số biên lai', 'BL' + so8());
    await m.nhap(bm, 'Cơ quan thu', 'Chi cục Thi hành án dân sự');
    await bm.locator('input[type=file]').first().setInputFiles(CHUNG_TU);
    await expect(bm.getByText(path.basename(CHUNG_TU)).first(), 'Tệp chứng từ chưa nhận').toBeVisible({ timeout: 15_000 });
    await m.nut(bm, 'Xác minh biên lai').click();
    await m.choThongBao(/Ghi nhận và xác minh biên lai thành công/);
    await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    return { soBienLai };
  },
};
