import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh, dungChu } from '../../../base.page';
import { TrangThai1A, VuNguon } from '../cau-hinh-1A';
import { hoTen, ngay, so8 } from '../../../../utils/fake-data';
import { batUrl, ngauNhien, soNgauNhien } from './chung';

/** Các điều BLHS 2015 cá nhân hay phạm (đều có khoản 1): cố ý gây thương tích, cướp giật, trộm cắp, lừa đảo, lạm dụng tín nhiệm,
 * hủy hoại tài sản, tàng trữ / mua bán trái phép chất ma túy, vi phạm quy định giao thông, đánh bạc */
const DIEU_CA_NHAN = [134, 171, 173, 174, 175, 178, 249, 251, 260, 321];

/**
 * BƯỚC 01 · Tạo mới hồ sơ tiếp nhận (hướng dẫn bước 1)
 *
 *  1. Vụ việc › Quản lý án sơ thẩm › Hồ sơ tiếp nhận → "Tạo mới hồ sơ"
 *  2. Tên bị can (Đầu vụ) ngẫu nhiên · Tội danh bị truy tố: gõ "Điều N" (N ngẫu nhiên trong các điều
 *     cá nhân hay phạm) rồi chọn mục "Điều N - …"
 *  3. Đơn vị chuyển đến "Tòa án" → Số bản án (số ngẫu nhiên) · Ngày bản án = hôm nay
 *  4. Biện pháp ngăn chặn "Không xác định" · Tổng số bút lục (số ngẫu nhiên)
 *  5. "Lưu & tiếp nhận" → "Tạo mới hồ sơ thành công!" → sang chi tiết hồ sơ (ghi lại link, mã TN…)
 */
export const buoc01: Buoc<VuNguon, TrangThai1A> = {
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
    // N lấy ngẫu nhiên trong các điều cá nhân hay phạm; không có thì chọn mục đang hiện.
    const oToiDanh = m.oTheoNhan('Tội danh bị truy tố', main);
    const dieu = ngauNhien(DIEU_CA_NHAN);
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

    // Lưu xong app chuyển sang chi tiết hồ sơ; có lúc đẩy tiếp sang 404 → vẫn giữ link hồ sơ (có id) và vào lại,
    // không để hồ sơ đã tạo mà state không có link (lần sau tạo trùng)
    const urlHoSo = await batUrl(m.page, /ho-so-tiep-nhan\/chi-tiet\//, async () => {
      await m.nut(main, 'Lưu & tiếp nhận').click();
      await m.choThongBao(/Tạo mới hồ sơ thành công/);
    });
    if (!urlHoSo) {
      throw new Error(`Đã báo tạo hồ sơ thành công nhưng không sang chi tiết hồ sơ (đang ở ${m.page.url()}) — xem danh sách Hồ sơ tiếp nhận (bị can "${tenBiCanHoSo}") trước khi chạy lại để tránh tạo trùng`);
    }
    if (m.page.url() !== urlHoSo) await phien.vao(urlHoSo);
    await m.choTaiXong(1500);
    // Mã hồ sơ vẽ sau khung trang — chờ một lúc; không thấy thì bước 02 đọc lại
    await expect(main).toContainText(/TN\d{2}-\d+/, { timeout: 15_000 }).catch(() => undefined);
    const maHoSo = (await main.innerText()).match(/TN\d{2}-\d+/)?.[0] ?? '';
    return { urlHoSo, maHoSo, tenBiCanHoSo, toiDanh };
  },
};
