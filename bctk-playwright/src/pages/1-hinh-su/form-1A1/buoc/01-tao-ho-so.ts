import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh, dungChu } from '../../../base.page';
import { TrangThai1A1, VuNguon } from '../cau-hinh-1A1';
import { hoTen, ngay, so8 } from '../../../../utils/fake-data';
import { ngauNhien, soNgauNhien } from './chung';

/** Các điều BLHS 2015 mà pháp nhân thương mại có thể bị truy cứu (Điều 76), đều có khoản 1 */
const DIEU_PHAP_NHAN = [188, 189, 190, 191, 192, 193, 194, 195, 196, 200, 203, 209, 210, 211, 213, 216, 217, 225, 226, 227, 232, 234, 235, 237, 238, 239, 242, 243, 244, 245, 246, 300, 324];

/**
 * BƯỚC 01 · Tạo mới hồ sơ tiếp nhận (hướng dẫn bước 1)
 *
 *  1. Vụ việc › Quản lý án sơ thẩm › Hồ sơ tiếp nhận → "Tạo mới hồ sơ"
 *  2. Tên bị can (Đầu vụ) ngẫu nhiên · Tội danh bị truy tố: gõ "Điều N" (N ngẫu nhiên trong các điều
 *     pháp nhân thương mại có thể phạm) rồi chọn mục "Điều N - …"
 *  3. Đơn vị chuyển đến "Tòa án" → Số bản án (số ngẫu nhiên) · Ngày bản án = hôm nay
 *  4. Biện pháp ngăn chặn "Không xác định" · Tổng số bút lục (số ngẫu nhiên)
 *  5. "Lưu & tiếp nhận" → "Tạo mới hồ sơ thành công!" → sang chi tiết hồ sơ (ghi lại link, mã TN…)
 */
export const buoc01: Buoc<VuNguon, TrangThai1A1> = {
  so: 1,
  ten: 'Tạo mới hồ sơ tiếp nhận (Tòa án chuyển đến), Lưu & tiếp nhận',
  huongDan: '1',
  chay: async ({ vuAn, tt, moPhien, tkToa }) => {
    // Ô này đã tạo hồ sơ ở lượt trước nhưng chưa chạy hết các bước → không tạo lại
    if (tt.urlHoSo) return;

    const phien = await moPhien(tkToa(vuAn.toaAn));
    const m = new ManHinh(phien.page);
    const main = m.page.locator('main');

    await m.moMenu('Vụ việc', 'Quản lý án sơ thẩm', 'Hồ sơ tiếp nhận');
    await m.nut(main, 'Tạo mới hồ sơ').click();
    await m.page.waitForURL(/ho-so-tiep-nhan\/tao-ho-so/, { timeout: 60_000 });
    await m.oTheoNhan('Tên bị can (Đầu vụ)', main).waitFor({ timeout: 60_000 });
    await m.choTaiXong(1000);

    const tenBiCanHoSo = await m.nhap(main, 'Tên bị can (Đầu vụ)', hoTen());
    // Tội danh: ProSelect có tìm kiếm, mục dạng "Điều 192 - Sản xuất, buôn bán hàng giả" → gõ "Điều N" rồi chọn.
    // N lấy ngẫu nhiên trong các điều pháp nhân thương mại có thể phạm (Điều 76 BLHS); không có thì chọn mục đang hiện.
    const oToiDanh = m.oTheoNhan('Tội danh bị truy tố', main);
    const dieu = ngauNhien(DIEU_PHAP_NHAN);
    await oToiDanh.locator('.ant-select-selector').click();
    await oToiDanh.locator('input').first().fill(`Điều ${dieu}`);
    await m.page.waitForTimeout(1500);
    const mucDieu = m.page
      .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
      .filter({ hasText: new RegExp(`^\\s*Điều ${dieu} -`) })
      .first();
    let toiDanh: string;
    if (await mucDieu.isVisible().catch(() => false)) {
      toiDanh = (await mucDieu.innerText()).replace(/\s+/g, ' ').trim();
      await mucDieu.click();
    } else {
      await oToiDanh.locator('input').first().fill('');
      await oToiDanh.locator('.ant-select-selector').click();
      toiDanh = await m.chonTrong(oToiDanh);
    }
    await expect(oToiDanh.locator('.ant-select-selection-item').first(), 'Chưa chọn được tội danh').not.toBeEmpty();

    // Đơn vị chuyển đến: "Tòa án" → form đổi sang Số bản án / Ngày bản án
    const toaAn = main.locator('.ant-radio-wrapper').filter({ hasText: dungChu('Tòa án') }).first();
    if (!(await toaAn.locator('input').isChecked())) await toaAn.click();
    await m.oTheoNhan('Số bản án', main).waitFor({ timeout: 15_000 });
    await m.nhap(main, 'Số bản án', so8());
    await m.ngay(main, 'Ngày bản án', ngay(0));

    await m.chon(main, 'Biện pháp ngăn chặn', 'Không xác định');
    await m.nhap(main, 'Tổng số bút lục', soNgauNhien(3));

    await m.nut(main, 'Lưu & tiếp nhận').click();
    await m.choThongBao(/Tạo mới hồ sơ thành công/);
    await m.page.waitForURL(/ho-so-tiep-nhan\/chi-tiet\//, { timeout: 60_000 });
    await m.choTaiXong(1500);
    const maHoSo = (await main.innerText()).match(/TN\d{2}-\d+/)?.[0] ?? '';
    return { urlHoSo: m.page.url(), maHoSo, tenBiCanHoSo, toiDanh };
  },
};
