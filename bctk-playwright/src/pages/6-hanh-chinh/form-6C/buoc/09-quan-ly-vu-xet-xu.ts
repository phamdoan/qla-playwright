import { expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BanAn6C, TK_VU_TRUONG, TrangThai6C } from '../cau-hinh-6C';
import { chonTab } from './chung';

/**
 * BƯỚC 09 · Vụ trưởng · Màn "Quản lý vụ xét xử", kiểm tra vụ đã có lịch, lưu kết quả (hướng dẫn bước 9)
 *
 *  1. Giám đốc thẩm, tái thẩm › Quản lý xét xử GĐT → tab "Đã có lịch xét xử" → có dòng của hồ sơ (Kháng nghị: <số KN>)
 *  2. Ghi output/6-hanh-chinh/6C/output-ma-vu-an-form-6C_<ngày>_<giờ>.xlsx
 */
export const buoc09: Buoc<BanAn6C, TrangThai6C> = {
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
    // Màn có lúc KHÔNG có tab "Đã có lịch xét xử" (chỉ "Tất cả" · "Chưa có lịch xét xử" · "Đã có kết quả xét xử" — 30/10)
    // → dùng tab đó nếu có, không thì "Tất cả"
    const tabDaCoLich = main.locator('[role=tab]').filter({ hasText: 'Đã có lịch xét xử' });
    await main.locator('[role=tab]').first().waitFor({ timeout: 30_000 });
    const tenTab = (await tabDaCoLich.count()) ? 'Đã có lịch xét xử' : 'Tất cả';
    await chonTab(m, tenTab);
    await m.nhap(main, 'Số BA/QĐ', vuAn.soBanAn);
    await m.nut(main, 'Tìm kiếm').click();
    await m.choTaiXong(2500);
    const dong = main.locator('.ant-table-row').filter({ hasText: new RegExp(`Kháng nghị:\\s*${soKhangNghi}(?!\\d)`) }).first();
    await expect(dong, `Hồ sơ KN ${soKhangNghi} chưa có ở tab "${tenTab}"`).toBeVisible({ timeout: 30_000 });
    const trangThai = await m.docCot(dong, 'TRẠNG THÁI').catch(() => m.docCot(dong, 'Trạng thái')).catch(() => '');

    test.info().annotations.push({ type: 'Vụ giám đốc thẩm', description: `KN ${soKhangNghi} · BA ${vuAn.soBanAn} · ${tt.lichXetXu} · ${trangThai}` });
  },
};
