import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { TrangThai1A, VuNguon, dsBaoChua, dsBiCan } from '../cau-hinh-1A';
import { hoTen, ngay } from '../../../../utils/fake-data';
import { moVuAn, ngauNhien, ngayNtg, ngaySinh, oNtg, soNgauNhien } from './chung';

/**
 * BƯỚC 04 · Thêm người tham gia tố tụng: MỘT Người bào chữa cho một bị can bất kỳ (hướng dẫn bước 4)
 *
 *  1. Mở lại chi tiết vụ án (BẮT BUỘC tải lại: bị can vừa thêm ở bước 03 chỉ hiện trong ô "Bào chữa cho"
 *     sau khi tải lại trang) → tab "Thụ lý" → mục "Người tham gia tố tụng" → "Thêm mới"
 *  2. Cá nhân · Tư cách tham gia tố tụng "Người bào chữa" → "+ Thêm tư cách"
 *     → Vai trò người bào chữa: Tư cách (ngẫu nhiên) · Bào chữa cho = một bị can ngẫu nhiên trong số bước 03 đã thêm
 *  3. Họ và tên, Ngày sinh, Số định danh, Ngày cấp, Nơi cấp, Giới tính — ngẫu nhiên
 *     (ô ngày ghi "mm/dd/yyyy" nhưng chỉ nhận dd/mm/yyyy)
 *  4. Thông tin địa chỉ, khối đầu tiên: số nhà · Thành phố Hà Nội · xã/phường ngẫu nhiên
 *  5. "Thêm vào danh sách" → "Đã lưu người tham gia tố tụng" → "Đóng"
 *
 * Vụ có bao nhiêu bị can cũng chỉ thêm một người bào chữa.
 */
export const buoc04: Buoc<VuNguon, TrangThai1A> = {
  so: 4,
  ten: 'Thêm một người bào chữa cho một bị can bất kỳ',
  huongDan: '4',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const cacBiCan = dsBiCan(tt);
    if (!cacBiCan.length) throw new Error('Chưa có bị can nào — chạy lại Bước 03 trước');
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaAn)), can('urlVuAn', 2));
    await m.moTab('thu-ly');
    const muc = await m.moMuc('Người tham gia tố tụng');
    // Lượt trước đã thêm người bào chữa → không thêm nữa (bảng HTML thường, không phải bảng antd)
    if (await muc.locator('tbody tr').filter({ hasText: 'Người bào chữa' }).count()) return { dsBaoChua: dsBaoChua(tt) };
    const tenBiCan = ngauNhien(cacBiCan).ten;

    await m.nut(muc, 'Thêm mới').click();
    const d = m.popup('Thêm người tham gia tố tụng');
    await d.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    // ── Tư cách: "Người bào chữa" (select thường) → "+ Thêm tư cách" mở khối "Vai trò người bào chữa" ──
    await d.locator('select').first().selectOption({ label: 'Người bào chữa' });
    await m.nut(d, /Thêm tư cách/).click();
    const khungTuCach = d.locator('div').filter({ has: m.page.getByText(/^\s*Tư cách\s*\*?\s*$/) }).filter({ has: m.page.locator('.ant-select') }).last();
    await khungTuCach.waitFor({ timeout: 10_000 });
    const tuCachBaoChua = await m.chonTrong(khungTuCach);
    const khungBaoChua = d.locator('div').filter({ has: m.page.getByText(/^\s*Bào chữa cho\s*\*?\s*$/) }).filter({ has: m.page.locator('.ant-select') }).last();
    // Select nhiều lựa chọn, không gõ tìm được (readonly) → mở, bấm mục theo title, kiểm đã thành thẻ; chưa ăn thì thử lại
    const theBC = khungBaoChua.locator('.ant-select-selection-item').filter({ hasText: tenBiCan }).first();
    const idDs = await khungBaoChua.locator('input[aria-controls]').first().getAttribute('aria-controls');
    const dsBC = m.page.locator('.ant-select-dropdown').filter({ has: m.page.locator(`[id="${idDs}"]`) });
    for (let lan = 0; lan < 3 && !(await theBC.isVisible().catch(() => false)); lan++) {
      if (!(await dsBC.isVisible().catch(() => false))) await khungBaoChua.locator('.ant-select-selector').first().click();
      const mucBC = dsBC.locator(`.ant-select-item-option[title="${tenBiCan}"]`).first();
      await mucBC.waitFor({ timeout: 10_000 });
      await m.page.waitForTimeout(400);
      await mucBC.click({ timeout: 5_000 }).catch(() => undefined);
      await m.page.waitForTimeout(600);
    }
    await expect(theBC, `"Bào chữa cho" chưa chọn được ${tenBiCan}`).toBeVisible({ timeout: 5_000 });
    // Đóng danh sách bằng cách bấm vào nhãn (Escape sẽ đóng cả drawer)
    if (await dsBC.isVisible().catch(() => false)) await d.getByText(/^\s*Bào chữa cho\s*\*?\s*$/).first().click();

    // ── Thông tin cá nhân ──
    const nguoiBaoChua = hoTen();
    await oNtg(d, 'Họ và tên', 'input[placeholder="Họ và tên"]').fill(nguoiBaoChua);
    // Ô ngày: không lọc theo placeholder (Ngày sinh đã đổi sang "dd/mm/yyyy hoặc yyyy" → lọc cũ trúng ô Ngày cấp, ngày sinh bỏ trống)
    await ngayNtg(oNtg(d, 'Ngày tháng năm sinh', 'input'), ngaySinh());
    await oNtg(d, 'Số định danh cá nhân', 'input[placeholder="Nhập dữ liệu"]').fill('0' + soNgauNhien(11));
    await ngayNtg(oNtg(d, 'Ngày cấp', 'input'), ngay(-(365 + Math.floor(Math.random() * 1500))));
    await oNtg(d, 'Nơi cấp', 'input[placeholder="Nơi cấp"]').fill('Cục Cảnh sát QLHC về TTXH');
    await oNtg(d, 'Giới tính', 'select').selectOption(ngauNhien(['NAM', 'NU']));

    // ── Địa chỉ: khối đầu tiên ──
    const diaChi = d.locator('.addr-block-row').first();
    await d.locator('input[placeholder="Số nhà, tên đường, tổ/thôn..."]').first().fill(`Số ${1 + Math.floor(Math.random() * 200)} ${ngauNhien(['Lê Duẩn', 'Trần Phú', 'Kim Mã', 'Láng Hạ'])}`);
    await diaChi.locator('select').first().selectOption({ label: 'Thành phố Hà Nội' });
    const xa = diaChi.locator('select').nth(1);
    await expect.poll(() => xa.locator('option').count(), { message: 'Danh sách xã/phường chưa tải', timeout: 15_000 }).toBeGreaterThan(1);
    const cacXa = await xa.locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value).filter(Boolean));
    await xa.selectOption(ngauNhien(cacXa));

    await m.nut(d, /Thêm vào danh sách/).click();
    await m.choThongBao(/Đã lưu người tham gia tố tụng/);
    await m.nut(d, 'Đóng').click();
    await d.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    await expect(muc.locator('tbody tr').filter({ hasText: nguoiBaoChua }).first(), 'Người bào chữa chưa vào bảng').toBeVisible({ timeout: 15_000 });
    return { dsBaoChua: [{ ten: nguoiBaoChua, tuCach: tuCachBaoChua, biCan: tenBiCan }] };
  },
};
