import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BanAn5D, TK_VU_TRUONG, TrangThai5D } from '../cau-hinh-5D';
import { ngay } from '../../../../utils/fake-data';
import { chonTimKiem } from './chung';

const QUAN_HE_PHAP_LUAT = [
  'Tranh chấp về đơn phương chấm dứt hợp đồng lao động',
  'Tranh chấp về tiền lương',
  'Tranh chấp về bảo hiểm xã hội',
  'Tranh chấp về bồi thường thiệt hại do vi phạm hợp đồng lao động',
];

/**
 * BƯỚC 01 · Vụ trưởng · Nhập hồ sơ kháng nghị đến và nhận hồ sơ (hướng dẫn bước 1)
 * Hai lượt (state lưu sau từng lượt → lỗi ở lượt 2 thì chạy lại không tạo trùng hồ sơ):
 *
 *  Lượt 1. Giám đốc thẩm, tái thẩm › Quản lý hồ sơ giao nhận → "Thêm mới HSKN"
 *     · Thủ tục giải quyết "Tái thẩm" · Số bản án, Ngày bản án, Tòa án ra bản án, Cấp xét xử theo file đầu vào
 *       → nút tìm kiếm (kính lúp) → hệ thống tự điền thông tin bản án
 *     · Số QĐKN ngẫu nhiên · Ngày QĐKN = hôm nay · Người kháng nghị theo file đầu vào · Số bút lục VKS chuyển
 *     · Quan hệ pháp luật (chữ) · Quan hệ pháp luật thống kê (ngẫu nhiên) — bắt buộc với án không phải hình sự
 *     → "Lưu thông tin"
 *  Lượt 2. Danh sách tab "Hồ sơ kháng nghị đến" → lọc theo số bản án → dòng của hồ sơ → icon "Nhận hồ sơ" (✓)
 */
export const buoc01: Buoc<BanAn5D, TrangThai5D> = {
  so: 1,
  ten: 'Vụ trưởng · Thêm mới hồ sơ kháng nghị tái thẩm, nhận hồ sơ',
  huongDan: '1',
  soLan: 2,
  chay: async ({ vuAn, tt, lan, moPhien, can }) => {
    const phien = await moPhien(TK_VU_TRUONG);
    const m = new ManHinh(phien.page);
    const main = m.page.locator('main');

    if (lan === 1) {
      if (tt.soKhangNghi) return;
      await phien.vao('vu-an/gdt-tt/ho-so-khang-nghi/them-moi-den');
      await m.oTheoNhan('Thủ tục giải quyết', main).waitFor({ timeout: 60_000 });
      await m.choTaiXong(1500);

      if ((await m.docGiaTri('Thủ tục giải quyết', main)) !== 'Tái thẩm') await m.chon(main, 'Thủ tục giải quyết', 'Tái thẩm');
      await m.nhap(main, 'Số bản án', vuAn.soBanAn);
      await m.ngay(main, 'Ngày bản án', vuAn.ngayBanAn);
      await chonTimKiem(m, m.oTheoNhan('Tòa án ra bản án', main), vuAn.toaAn);
      if ((await m.docGiaTri('Cấp xét xử', main)) !== vuAn.capXetXu) await m.chon(main, 'Cấp xét xử', vuAn.capXetXu);
      // Kính lúp: tìm bản án → hệ thống tự điền "Loại án"
      await main.locator('.qla-them-moi-hskn-search-btn-item button').first().click();
      await m.dongYTatCaXacNhan();
      await expect.poll(() => m.docGiaTri('Loại án', main), { message: 'Tìm bản án xong nhưng "Loại án" chưa tự điền', timeout: 20_000 }).not.toBe('');

      const soKhangNghi = String(100000 + Math.floor(Math.random() * 900000));
      await m.nhap(main, 'Số QĐKN', soKhangNghi);
      const ngayKhangNghi = await m.ngay(main, 'Ngày QĐKN', ngay(0));
      await m.chon(main, 'Người kháng nghị', vuAn.nguoiKhangNghi);
      const soButLuc = String(5 + Math.floor(Math.random() * 50));
      await m.nhap(main, 'Số bút lục VKS chuyển', soButLuc);
      const quanHePhapLuat = QUAN_HE_PHAP_LUAT[Math.floor(Math.random() * QUAN_HE_PHAP_LUAT.length)];
      await m.nhap(main, 'Quan hệ pháp luật', quanHePhapLuat);
      // Điền QHPL xong form còn vẽ lại (tính thời hạn KN) → danh sách thống kê có lúc vừa mở đã đóng → chờ, thử lại
      await m.choTaiXong(1500);
      for (let lan = 1; ; lan++) {
        const daChon = await m.chon(main, 'Quan hệ pháp luật thống kê').then(() => true).catch(e => (lan >= 3 ? Promise.reject(e) : false));
        if (daChon) break;
        await m.page.keyboard.press('Escape');
        await m.page.waitForTimeout(2000);
      }

      await m.nut(main, 'Lưu thông tin').click();
      await m.choThongBao(/thành công/i);
      await m.choTaiXong(1500);
      return { soKhangNghi, ngayKhangNghi, soButLuc, quanHePhapLuat };
    }

    // ── Lượt 2: nhận hồ sơ ──
    if (tt.daNhanHoSo) return;
    const soKhangNghi = can('soKhangNghi', 1);
    await phien.vao('vu-an/gdt-tt/ho-so-khang-nghi/danh-sach');
    await m.choTaiXong(2000);
    await main.locator('[role=tab]').filter({ hasText: 'Hồ sơ kháng nghị đến' }).click();
    await m.choTaiXong(2500);
    await m.nhap(main, 'Số bản án/quyết định', vuAn.soBanAn);
    await m.nut(main, 'Tìm kiếm').click();
    await m.choTaiXong(2500);
    const dong = main.locator('.ant-table-row').filter({ hasText: new RegExp(`Số KN:\\s*${soKhangNghi}(?!\\d)`) }).first();
    await expect(dong, `Không thấy hồ sơ KN ${soKhangNghi} ở tab "Hồ sơ kháng nghị đến"`).toBeVisible({ timeout: 30_000 });
    if (!/Đã nhận/.test(await dong.innerText())) {
      await dong.locator('button.bctk-nhan-ho-so').click();
      await m.dongYTatCaXacNhan();
      const hoi = m.page.locator('.ant-modal-wrap:visible .ant-modal').last();
      if (await hoi.waitFor({ timeout: 5_000 }).then(() => true).catch(() => false)) {
        await m.nut(hoi, /Nhận hồ sơ|Đồng ý|Xác nhận|Lưu/).last().click();
      }
      await expect(dong, 'Bấm "Nhận hồ sơ" nhưng hồ sơ chưa chuyển "Đã nhận"').toContainText('Đã nhận', { timeout: 30_000 });
    }
    return { daNhanHoSo: true };
  },
};
