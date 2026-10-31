import { expect, test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BIEU_MAU_2C, BanAn2C, LINH_VUC_2C, TK_LANH_DAO, TK_VU_TRUONG, TrangThai2C } from '../cau-hinh-2C';
import { luuDongKetQua } from '../../../../utils/file-helper';

/**
 * BƯỚC 09 · Vụ trưởng · Màn "Quản lý vụ xét xử", kiểm tra vụ đã có lịch, lưu kết quả (hướng dẫn bước 9)
 *
 *  1. Giám đốc thẩm, tái thẩm › Quản lý xét xử GĐT → tab "Đã có lịch xét xử" → có dòng của hồ sơ (Kháng nghị: <số KN>)
 *  2. Ghi output/2-dan-su/2C/output-ma-vu-an-form-2C_<ngày>_<giờ>.xlsx
 */
export const buoc09: Buoc<BanAn2C, TrangThai2C> = {
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

    await luuDongKetQua(
      LINH_VUC_2C,
      BIEU_MAU_2C,
      TK_VU_TRUONG,
      ['Số bản án', 'Ngày bản án', 'Tòa ra quyết định', 'Cấp xét xử', 'Người kháng nghị', 'Số QĐKN', 'Ngày QĐKN', 'Quan hệ pháp luật', 'Thẩm phán', 'Số tờ trình PC', 'Chủ tọa', 'Thẩm phán khác', 'Lịch xét xử', 'Số chương trình làm việc', 'Số QĐ thành lập HĐXX', 'Số công văn mời VKS', 'Trạng thái', 'Link hội đồng'],
      [vuAn.soBanAn, vuAn.ngayBanAn, vuAn.toaAn, vuAn.capXetXu, vuAn.nguoiKhangNghi, soKhangNghi, tt.ngayKhangNghi ?? '', tt.quanHePhapLuat ?? '', tt.thamPhan ?? '', tt.soToTrinh ?? '', TK_LANH_DAO.ten!, tt.thanhVienHDXX ?? '', tt.lichXetXu ?? '', tt.soChuongTrinh ?? '', tt.soQDHoiDong ?? '', tt.soCongVanVKS ?? '', trangThai, tt.urlHoiDong ?? ''],
      'Số QĐKN',
    );
    test.info().annotations.push({ type: 'Vụ giám đốc thẩm', description: `KN ${soKhangNghi} · BA ${vuAn.soBanAn} · ${tt.lichXetXu} · ${trangThai}` });
  },
};
