import { expect } from '@playwright/test';
import path from 'path';
import { Buoc } from '../../../common/buoc';
import { ManHinh, dungChu } from '../../../base.page';
import { TrangThai1A1, VuNguon } from '../cau-hinh-1A1';
import { DATA_DIR } from '../../../../utils/file-helper';
import { hoTen } from '../../../../utils/fake-data';
import { ORIGIN } from '../../../../../playwright.config';
import { batUrl, moVuAn } from './chung';

const TAI_LIEU = path.join(DATA_DIR, 'files', 'tai-lieu-mau.pdf');

/**
 * BƯỚC 02 · Tiếp nhận hồ sơ → chuyển thành vụ án (hướng dẫn bước 2)
 *
 *  1. Mở chi tiết hồ sơ (link bước 01) → bấm "Đủ" ở mọi mục đối chiếu chưa xanh
 *  2. "Biên bản giao nhận" → Họ tên bên giao (ngẫu nhiên) · Chức vụ bên giao "Kiểm sát viên" → "Lưu"
 *     → hộp "Đã lưu biên bản giao nhận" → "Đóng"
 *  3. Tài liệu: chọn tệp PDF mẫu · Loại "Hồ sơ tiếp nhận - Biên bản giao nhận" → "Thêm mới"
 *  4. "Chuyển đến vụ án" → sang chi tiết vụ án sơ thẩm (ghi lại link, mã vụ án VA…)
 */
export const buoc02: Buoc<VuNguon, TrangThai1A1> = {
  so: 2,
  ten: 'Tiếp nhận hồ sơ: đủ tài liệu, biên bản giao nhận, đính kèm, chuyển đến vụ án',
  huongDan: '2',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    if (tt.urlVuAn) return;

    const phien = await moPhien(tkToa(vuAn.toaAn));
    await phien.vao(can('urlHoSo', 1));
    const m = new ManHinh(phien.page);
    const main = m.page.locator('main');
    // Hồ sơ "Chưa nhận": có nút "Biên bản giao nhận"; đã lưu biên bản (lượt trước) thì nút đó mất, hiện "Chuyển đến vụ án"
    const nutBienBan = m.nut(main, 'Biên bản giao nhận');
    const nutChuyen = m.nut(main, /Chuyển đến vụ án/);
    await nutBienBan.or(nutChuyen).first().waitFor({ timeout: 60_000 });
    await m.choTaiXong(1500);

    // 1. "Đủ" — nút đã bấm có nền xanh lá → chỉ bấm nút chưa xanh (hồ sơ đã tiếp nhận thì nút bị khóa)
    const cacNutDu = main.locator('button:not([disabled])').filter({ hasText: dungChu('Đủ') });
    for (let i = 0; i < (await cacNutDu.count()); i++) {
      const nut = cacNutDu.nth(i);
      const xanh = await nut.evaluate(e => {
        const [r, g, b] = (getComputedStyle(e).backgroundColor.match(/\d+/g) || []).map(Number);
        return g > 120 && r < 100 && b < 120;
      });
      if (!xanh) {
        await nut.click();
        await m.page.waitForTimeout(400);
      }
    }

    // 2. Biên bản giao nhận (lưu xong hồ sơ chuyển "Đã tiếp nhận")
    if (await nutBienBan.isVisible().catch(() => false)) {
      await nutBienBan.click();
      const bb = m.page.locator('.ant-modal-wrap:visible .ant-modal').filter({ has: m.page.getByPlaceholder('VD: Kiểm sát viên') }).last();
      await bb.waitFor({ timeout: 30_000 });
      await m.choTaiXong();
      await m.nhap(bb, 'Họ tên bên giao', hoTen());
      await bb.getByPlaceholder('VD: Kiểm sát viên').fill('Kiểm sát viên');
      await m.nut(bb, 'Lưu').click();
      await m.choThongBao(/Lưu thành công/);
      const daLuu = m.popup(/Đã lưu biên bản giao nhận/);
      if (await daLuu.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false)) {
        await m.nut(daLuu, 'Đóng').click();
        await daLuu.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
      }
    }

    // 3. Tài liệu: khung tab đang mở có nút "Chọn tệp"; tệp đã thêm hiện ở bảng của thẻ "Tài liệu"
    const tenTep = path.basename(TAI_LIEU);
    const dongTep = main.locator('tr').filter({ hasText: tenTep }).first();
    if (!(await dongTep.isVisible().catch(() => false))) {
      const khung = m.page.locator('.ant-tabs-tabpane-active').filter({ has: m.nut(m.page, 'Chọn tệp') }).last();
      await khung.scrollIntoViewIfNeeded();
      await khung.locator('input[type=file]').first().setInputFiles(TAI_LIEU);
      await m.page.waitForTimeout(500);
      await m.chonTrong(khung.locator('.ant-select').first(), /Hồ sơ tiếp nhận - Biên bản giao nhận/);
      await m.nut(khung, 'Thêm mới').click();
      await expect(dongTep, 'Tài liệu chưa vào bảng').toBeVisible({ timeout: 15_000 });
    }

    // Bước 01 có lúc đọc mã hồ sơ khi trang chưa vẽ xong (mã trống) → đọc lại ở đây
    let maHoSo = tt.maHoSo;
    if (!maHoSo) maHoSo = (await main.innerText()).match(/TN\d{2}-\d+/)?.[0] ?? '';

    // 4. Chuyển đến vụ án — app có lúc mở chi tiết vụ án rồi đẩy tiếp sang trang 404 (Vụ 02, 29/10):
    //    bắt URL thoáng qua (có id) rồi vào lại qua Dashboard. Không bắt được thì mở lại hồ sơ, bấm lại (tối đa 3 lần).
    let urlDen: string | null = null;
    for (let lan = 1; lan <= 3 && !urlDen; lan++) {
      // Lưu biên bản / thêm tài liệu xong, nút "Chuyển đến vụ án" có lúc hiện rất chậm (>30s, Vụ 01 30/10) → chờ 30s, chưa có thì mở lại hồ sơ
      const coNut = lan === 1 && (await nutChuyen.waitFor({ timeout: 30_000 }).then(() => true).catch(() => false));
      if (!coNut) {
        await phien.vao(can('urlHoSo', 1));
        await nutChuyen.waitFor({ timeout: 60_000 });
        await m.choTaiXong(1500);
      }
      await nutChuyen.scrollIntoViewIfNeeded();
      urlDen = await batUrl(m.page, /so-tham\/chi-tiet\?id=/, () => nutChuyen.click());
    }
    if (!urlDen) throw new Error(`Bấm "Chuyển đến vụ án" 3 lần vẫn không sang chi tiết vụ án (đang ở ${m.page.url()})`);
    const urlVuAn = `${ORIGIN}/qla/vu-an/so-tham/chi-tiet?id=${new URL(urlDen).searchParams.get('id')}`;
    await moVuAn(phien, urlVuAn);
    const maVuAnHeThong = (await main.innerText()).match(/VA\d{2}-\d+/)?.[0] ?? '';
    return { urlVuAn, maVuAnHeThong, maHoSo };
  },
};
