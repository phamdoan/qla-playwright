import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { TrangThai5B, VuAn5B } from '../cau-hinh-5B';
import { ngay } from '../../../../utils/fake-data';
import { chonNguoiKy, daCoBieuMau, dungSo, luuKyBieuMau, moVuAn, popup } from './chung';

/**
 * BƯỚC 07 · Tòa phúc thẩm · Quyết định đưa vụ án ra xét xử phúc thẩm (66-DS) (hướng dẫn bước 7)
 *
 *  1. Tab "Chuẩn bị xét xử" → "Thêm mới quyết định" ▾ › "Quyết định đưa vụ án ra xét xử phúc thẩm (66-DS)"
 *  2. "Dùng số" · Ngày quyết định = hôm nay · Người ký = chủ tài khoản (nếu có ô)
 *  3. "Chọn lịch xét xử" → ô hôm nay → "Thêm lịch xét xử (mở phiên tòa)": "Cả ngày" · "Xét xử công khai"
 *     · địa điểm ngẫu nhiên → "Tạo mới" (trùng lịch → "Đồng ý")
 *  4. "Lưu" → "Ký logic" → "Đóng"
 */
export const buoc07: Buoc<VuAn5B, TrangThai5B> = {
  so: 7,
  ten: 'Tòa phúc thẩm · Quyết định đưa vụ án ra xét xử phúc thẩm (66-DS), lịch xét xử, ký logic',
  huongDan: '7',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const tk = tkToa(vuAn.toaPhucTham);
    const m = await moVuAn(await moPhien(tk), can('urlVuAnPT', 4));
    await m.moTab('chuan-bi-xet-xu');
    if (await daCoBieuMau(m, /66-DS|ra xét xử phúc thẩm/)) return { soQDXetXu: tt.soQDXetXu, ngayXetXu: tt.ngayXetXu };

    const main = m.page.locator('main');
    await m.nut(main, /^\s*Thêm mới quyết định\s*$/).click();
    await m.page.locator('.ant-dropdown:visible li').filter({ hasText: /66-DS/ }).first().click();
    const bm = popup(m, /ra xét xử phúc thẩm/);
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong(1500);

    const soQDXetXu = await dungSo(m, bm, 'Số quyết định');
    await m.ngay(bm, 'Ngày quyết định', ngay(0));
    if (tk.ten && (await m.oTheoNhan('Người ký/người phân công', bm).isVisible().catch(() => false))) await chonNguoiKy(m, bm, tk.ten);

    // Lịch tháng: bấm nền ô hôm nay → form "Thêm lịch xét xử (mở phiên tòa)"
    const ngayXetXu = ngay(0);
    await m.nut(bm, 'Chọn lịch xét xử').click();
    const lich = popup(m, /Chọn lịch xét xử/);
    await lich.waitFor({ timeout: 30_000 });
    await m.choTaiXong();
    // Ô hôm nay đã có lịch (lượt trước tạo xong lịch nhưng chưa lưu quyết định) → thẻ lịch che giữa ô:
    // bấm sát đáy ô (phần nền trống) thay vì giữa ô
    const oHomNay = lich.locator('.rbc-day-bg.rbc-today').first();
    await oHomNay.waitFor({ timeout: 30_000 });
    const khung = (await oHomNay.boundingBox())!;
    await m.page.mouse.click(khung.x + khung.width / 2, khung.y + khung.height - 4);
    const formLich = popup(m, 'Thêm lịch xét xử (mở phiên tòa)');
    if (await formLich.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false)) {
      await m.choTaiXong();
      const caNgay = formLich.locator('#caNgay');
      if ((await caNgay.count()) && !(await caNgay.isChecked())) await caNgay.check();
      await m.chon(formLich, 'Tính chất phiên tòa', /công khai/i);
      await m.chon(formLich, 'Địa điểm xét xử');
      // "Phòng xử lưu động" bắt buộc nhập thêm địa điểm chi tiết
      const chiTiet = m.oTheoNhan('Địa điểm xét xử (chi tiết)', formLich);
      if (await chiTiet.isVisible().catch(() => false)) await chiTiet.locator('input').fill('Hội trường xét xử lưu động');
      await m.nut(formLich, 'Tạo mới').click();
      await m.dongYTatCaXacNhan();
      await formLich.waitFor({ state: 'hidden', timeout: 30_000 });
    }
    await lich.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => undefined);
    await expect(bm.getByText(ngayXetXu).first(), `Chọn lịch xong nhưng chưa thấy ngày xét xử ${ngayXetXu} trong quyết định`).toBeVisible({ timeout: 30_000 });

    await luuKyBieuMau(m, bm);
    return { soQDXetXu, ngayXetXu };
  },
};
