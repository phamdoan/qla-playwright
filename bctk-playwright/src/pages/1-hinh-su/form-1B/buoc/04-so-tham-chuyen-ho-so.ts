import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { TrangThai1B, VuAnNguon } from '../cau-hinh-1B';

/**
 * BƯỚC 04 · Tòa sơ thẩm · Chuyển hồ sơ lên phúc thẩm (hướng dẫn 3.2)
 *
 *  1. Vụ việc › Hình sự › Quản lý án sơ thẩm › Hồ sơ chuyển đi › Xem danh sách → tìm mã vụ án
 *  2. Tích checkbox dòng vụ án → "Chuyển hồ sơ đi"
 *  3. Cảnh báo "chưa hết thời hạn kháng cáo" → "Vẫn chuyển"
 *  4. Ghi lại Tòa phúc thẩm nhận (cột "Đơn vị nhận") cho các bước sau
 */
export const buoc04: Buoc<VuAnNguon, TrangThai1B> = {
  so: 4,
  ten: 'Tòa sơ thẩm · Chuyển hồ sơ lên phúc thẩm',
  huongDan: '3.2',
  chay: async ({ vuAn, moPhien, tkToa }) => {
    const m = new ManHinh((await moPhien(tkToa(vuAn.toaAn))).page);
    await m.moMenu('Vụ việc', 'Hình sự', 'Quản lý án sơ thẩm', 'Hồ sơ chuyển đi', 'Xem danh sách');
    await m.timKiem(/Nhập mã vụ án, mã hồ sơ/, vuAn.maVuAn);

    const dong = await m.dong(m.page, vuAn.maVuAn);
    if (/Chưa chuyển/.test(await dong.innerText())) {
      await dong.locator('input[type=checkbox]').check();
      await m.nut(m.page, 'Chuyển hồ sơ đi').click();
      const canhBao = m.popup('Vẫn chuyển');
      if (await canhBao.waitFor({ timeout: 5_000 }).then(() => true).catch(() => false)) {
        await m.nut(canhBao, 'Vẫn chuyển').click();
      }
      await m.choThongBao(/Đã chuyển vụ án thành công/);
      await m.choTaiXong(1500);
    }

    const toaPhucTham = await m.docCot(await m.dong(m.page, vuAn.maVuAn), 'Đơn vị nhận');
    if (!toaPhucTham) throw new Error(`Đã chuyển ${vuAn.maVuAn} nhưng không đọc được "Đơn vị nhận"`);
    return { toaPhucTham };
  },
};
