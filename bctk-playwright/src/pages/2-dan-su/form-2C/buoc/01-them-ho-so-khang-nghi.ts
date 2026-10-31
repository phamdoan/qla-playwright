import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BanAn2C, TK_VU_TRUONG, TrangThai2C } from '../cau-hinh-2C';
import { ngay } from '../../../../utils/fake-data';
import { chonTimKiem } from './chung';

const QUAN_HE_PHAP_LUAT = [
  'Tranh chấp hợp đồng vay tài sản',
  'Tranh chấp quyền sử dụng đất',
  'Tranh chấp hợp đồng mua bán tài sản',
  'Tranh chấp về thừa kế tài sản',
];

/**
 * BƯỚC 01 · Vụ trưởng · Nhập hồ sơ kháng nghị đến (hướng dẫn bước 1)
 *
 *  1. Giám đốc thẩm, tái thẩm › Quản lý hồ sơ giao nhận › tab "Hồ sơ kháng nghị đến" → "Thêm mới HSKN"
 *  2. Thủ tục giải quyết "Giám đốc thẩm" · Số bản án, Ngày bản án, Tòa án ra bản án, Cấp xét xử theo file đầu vào
 *     → nút tìm kiếm (kính lúp) → hệ thống tự điền "Loại án"
 *  3. Số QĐKN ngẫu nhiên · Ngày QĐKN = hôm nay · Người kháng nghị theo file đầu vào
 *  4. Quan hệ pháp luật (chữ) · Quan hệ pháp luật thống kê (ngẫu nhiên) → "Lưu thông tin"
 */
export const buoc01: Buoc<BanAn2C, TrangThai2C> = {
  so: 1,
  ten: 'Vụ trưởng · Thêm mới hồ sơ kháng nghị giám đốc thẩm',
  huongDan: '1',
  chay: async ({ vuAn, tt, moPhien }) => {
    if (tt.soKhangNghi) return;
    const phien = await moPhien(TK_VU_TRUONG);
    const m = new ManHinh(phien.page);
    await phien.vao('vu-an/gdt-tt/ho-so-khang-nghi/them-moi-den');
    const main = m.page.locator('main');
    await m.oTheoNhan('Thủ tục giải quyết', main).waitFor({ timeout: 60_000 });
    await m.choTaiXong(1500);

    if ((await m.docGiaTri('Thủ tục giải quyết', main)) !== 'Giám đốc thẩm') await m.chon(main, 'Thủ tục giải quyết', 'Giám đốc thẩm');
    await m.nhap(main, 'Số bản án', vuAn.soBanAn);
    await m.ngay(main, 'Ngày bản án', vuAn.ngayBanAn);
    await chonTimKiem(m, m.oTheoNhan('Tòa án ra bản án', main), vuAn.toaAn);
    if ((await m.docGiaTri('Cấp xét xử', main)) !== vuAn.capXetXu) await m.chon(main, 'Cấp xét xử', vuAn.capXetXu);
    // Kính lúp: tìm bản án → hệ thống tự điền "Loại án"
    await main.locator('.qla-them-moi-hskn-search-btn-item button').first().click();
    await m.dongYTatCaXacNhan();
    await expect.poll(() => m.docGiaTri('Loại án', main), { message: 'Tìm bản án xong nhưng "Loại án" chưa tự điền', timeout: 20_000 }).not.toBe('');

    const soKhangNghi = String(1000 + Math.floor(Math.random() * 9000));
    await m.nhap(main, 'Số QĐKN', soKhangNghi);
    const ngayKhangNghi = await m.ngay(main, 'Ngày QĐKN', ngay(0));
    await m.chon(main, 'Người kháng nghị', vuAn.nguoiKhangNghi);

    const quanHePhapLuat = QUAN_HE_PHAP_LUAT[Math.floor(Math.random() * QUAN_HE_PHAP_LUAT.length)];
    await m.nhap(main, 'Quan hệ pháp luật', quanHePhapLuat);
    await m.chon(main, 'Quan hệ pháp luật thống kê');

    await m.nut(main, 'Lưu thông tin').click();
    await m.choThongBao(/thành công/i);
    await m.choTaiXong(1500);
    return { soKhangNghi, ngayKhangNghi, quanHePhapLuat };
  },
};
