import { expect } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ORIGIN } from '../../../../../playwright.config';
import { TrangThai6B, VuAn6B } from '../cau-hinh-6B';
import { moDanhSach, moVuAn, popup } from './chung';

/**
 * BƯỚC 07 · Tòa phúc thẩm · Mở vụ án phúc thẩm, thụ lý (hướng dẫn bước 7)
 *
 *  1. Vụ việc › Hành chính › Quản lý phúc thẩm › "Hồ sơ phúc thẩm" → dòng có Mã định danh của vụ (bước 01)
 *     → "Xem chi tiết" (con mắt) → ghi lại link vụ án phúc thẩm
 *  2. Tab "Thụ lý" → "Thụ lý" → popup (số, ngày thụ lý hệ thống điền sẵn) → "Lưu"
 * Nút "Thụ lý" không còn (lượt trước đã thụ lý) → bỏ qua.
 */
export const buoc07: Buoc<VuAn6B, TrangThai6B> = {
  so: 7,
  ten: 'Tòa phúc thẩm · Mở vụ án phúc thẩm, thụ lý',
  huongDan: '7',
  chay: async ({ vuAn, tt, moPhien, tkToa, can }) => {
    const phien = await moPhien(tkToa(vuAn.toaPhucTham));
    let urlVuAnPT = tt.urlVuAnPT;
    let maVuAnPT = tt.maVuAnPT;
    if (!urlVuAnPT) {
      const maDinhDanh = can('maDinhDanh', 1);
      const ds = await moDanhSach(phien, 'Vụ việc', 'Hành chính', 'Quản lý phúc thẩm', 'Hồ sơ phúc thẩm');
      const dong = ds.page.locator('main .ant-table-row').filter({ hasText: maDinhDanh }).first();
      await expect(dong, `Không thấy mã định danh ${maDinhDanh} trong "Hồ sơ phúc thẩm" (bước 06 chưa tiếp nhận?)`).toBeVisible({ timeout: 30_000 });
      await dong.locator('button:has(.anticon-eye), a:has(.anticon-eye)').first().click();
      await ds.page.waitForURL(/phuc-tham\/chi-tiet\?id=/, { timeout: 60_000 });
      await ds.choTaiXong(2000);
      const url = new URL(ds.page.url());
      urlVuAnPT = `${ORIGIN}${url.pathname}?id=${url.searchParams.get('id')}`;
    }

    const m = await moVuAn(phien, urlVuAnPT);
    const main = m.page.locator('main');
    if (!maVuAnPT) maVuAnPT = ((await main.innerText()).match(/VA\d{2}-\d+/) ?? [''])[0];
    await m.moTab('thu-ly');
    const nutThuLy = m.nut(main, /^\s*Thụ lý\s*$/);
    let ngayThuLyPT = tt.ngayThuLyPT ?? '';
    if (await nutThuLy.isVisible().catch(() => false)) {
      await nutThuLy.click();
      const bm = popup(m, /Thụ lý/);
      await bm.waitFor({ timeout: 30_000 });
      await m.choTaiXong(1500);
      const oSo = m.oTheoNhan(/Số thụ lý/, bm).locator('input').first();
      if ((await oSo.count()) && !(await oSo.inputValue())) await m.nut(bm, /Dùng số/).click().catch(() => undefined);
      ngayThuLyPT = await m.oTheoNhan(/Ngày thụ lý/, bm).locator('input').first().inputValue({ timeout: 3_000 }).catch(() => '');
      await m.nut(bm, /^\s*Lưu\s*$/).click();
      await m.choThongBao(/thành công/i);
      await bm.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
      await m.choTaiXong(1500);
    }
    const soThuLyPT = ((await main.innerText()).match(/(\d+\/\d{4}\/TLPT-HC)/) ?? ['', tt.soThuLyPT ?? ''])[1];
    return { urlVuAnPT, maVuAnPT, soThuLyPT, ngayThuLyPT };
  },
};
