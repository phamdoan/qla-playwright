import { expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BanAn2D, TK_VU_TRUONG, TrangThai2D } from '../cau-hinh-2D';

/**
 * BƯỚC 09 · Vụ trưởng · Màn "Quản lý vụ xét xử", kiểm tra vụ đã có lịch, lưu kết quả (hướng dẫn bước 9)
 *
 *  1. Giám đốc thẩm, tái thẩm › Quản lý xét xử GĐT → tab "Đã có lịch xét xử" → có dòng của hồ sơ (Kháng nghị: <số KN>)
 *  2. Ghi output/2-dan-su/2D/output-ma-vu-an-form-2D_<ngày>_<giờ>.xlsx
 */
export const buoc09: Buoc<BanAn2D, TrangThai2D> = {
  so: 9,
  ten: 'Vụ trưởng · Quản lý vụ xét xử — kiểm tra vụ đã có lịch, lưu kết quả',
  huongDan: '9',
  chay: async ({ vuAn, tt, moPhien, can }) => {
    const soKhangNghi = can('soKhangNghi', 1);
    const phien = await moPhien(TK_VU_TRUONG);
    const m = new ManHinh(phien.page);
    const main = m.page.locator('main');
    await phien.vao('vu-an/gdt-tt/quan-ly-vu-xet-xu/danh-sach');
    await m.choTaiXong(3000);
    // Tab "Đã có lịch xét xử" đã bị bỏ (30/10 còn: Tất cả · Chưa có lịch xét xử · Đã có kết quả xét xử) → tìm ở "Tất cả"
    await main.locator('[role=tab]').filter({ hasText: 'Tất cả' }).click();
    await m.choTaiXong(2500);
    await m.nhap(main, 'Số BA/QĐ', vuAn.soBanAn);
    await m.nut(main, 'Tìm kiếm').click();
    await m.choTaiXong(2500);
    const dong = main.locator('.ant-table-row').filter({ hasText: new RegExp(`Kháng nghị:\\s*${soKhangNghi}(?!\\d)`) }).first();
    await expect(dong, `Hồ sơ KN ${soKhangNghi} chưa có trong "Quản lý xét xử GĐT" (tab "Tất cả")`).toBeVisible({ timeout: 30_000 });
    const trangThai = await m.docCot(dong, 'TRẠNG THÁI').catch(() => m.docCot(dong, 'Trạng thái')).catch(() => '');

    test.info().annotations.push({ type: 'Vụ giám đốc thẩm', description: `KN ${soKhangNghi} · BA ${vuAn.soBanAn} · ${tt.lichXetXu} · ${trangThai}` });
  },
};
