/**
 * DÒ (chỉ đọc) — tài khoản nào ở TAND tối cao thấy hồ sơ phúc thẩm hình sự chuyển đến (án tử hình/chung thân
 * được chuyển lên D01 — VuChuyenServiceImpl.timVuAnTuyenTuHinhChungThan). Không bấm nút ghi.
 *
 *   QLA_DO_TK="<cccd>:<tên>,..." QLA_DO_MA_HO_SO=HSD26-018541 node tools/chay-ui.js daotao --cli --file=do-tiep-nhan-pt-toi-cao
 */
import fs from 'fs';
import path from 'path';
import { test } from '@playwright/test';
import { ORIGIN } from '../../../playwright.config';
import { loginSSO } from '../../../common/login';
import { choHetSpin } from '../../../common/antd';

const DS_TK = (process.env.QLA_DO_TK || '').split(',').filter(Boolean).map(s => {
  const [cccd, ten] = s.split(':');
  return { cccd: cccd.trim(), ten: (ten || cccd).trim() };
});
const MA_HO_SO = process.env.QLA_DO_MA_HO_SO || '';
const THU_MUC = path.resolve(__dirname, '../../../reports/do-tiep-nhan-pt-toi-cao');

test.use({ storageState: { cookies: [], origins: [] } });

for (const tk of DS_TK) {
  test(`do-tiep-nhan-pt-toi-cao · ${tk.ten}`, async ({ page }) => {
    test.setTimeout(5 * 60_000);
    fs.mkdirSync(THU_MUC, { recursive: true });
    const kq: Record<string, unknown> = { cccd: tk.cccd, ten: tk.ten };
    try {
      await loginSSO(page, tk.cccd, { pass: `Ta@${tk.cccd}` });
      await page.goto(`${ORIGIN}/qla/vu-an/phuc-tham/ho-so-chuyen-den`);
      await choHetSpin(page);
      await page.waitForTimeout(2_000);
      // Mục menu "Vụ án phúc thẩm chuyển đến" (hình sự) — lấy href thật rồi đi theo
      const dsLink = await page.locator('a').filter({ hasText: /chuyển đến/ }).evaluateAll(es =>
        es.map(e => `${(e.textContent || '').replace(/\s+/g, ' ').trim()}=${e.getAttribute('href')}`),
      );
      kq.linkChuyenDen = dsLink;
      const href = dsLink.map(s => s.split('=')[1]).find(h => /phuc-tham/.test(h || '') && !/hanh-chinh|dan-su/.test(h || '') && h !== '/qla/vu-an/phuc-tham/ho-so-chuyen-den');
      if (href) await page.goto(`${ORIGIN}${href}`);
      await choHetSpin(page);
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(2_500);
      kq.url = page.url();
      kq.c404 = await page.getByText('Không tìm thấy trang').isVisible().catch(() => false);
      kq.tab = (await page.getByRole('tab').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
      // Không tìm (ô tìm không khớp mã hồ sơ) → tab "Chưa nhận", cỡ trang 100, khớp theo tên trong QLA_DO_TEN
      await page.getByRole('tab', { name: /^Chưa nhận/ }).first().click().catch(() => {});
      await choHetSpin(page);
      await page.waitForTimeout(2_000);
      const coTrang = page.locator('.ant-pagination-options .ant-select').first();
      if (await coTrang.isVisible().catch(() => false)) {
        await coTrang.click();
        await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^100/ }).first().click().catch(() => {});
        await choHetSpin(page);
        await page.waitForTimeout(2_500);
      }
      const TEN = process.env.QLA_DO_TEN || 'Lường Văn Thắm';
      const khop = (await page.locator('.ant-table-row').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(s => s.includes(TEN) || s.includes(MA_HO_SO));
      kq.dongKhop = khop.map(s => s.slice(0, 300));
      kq.thayHoSo = khop.length;
      kq.soDong = await page.locator('.ant-table-row:visible').count();
      kq.nut = (await page.locator('button:visible').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 10);
    } catch (e) {
      kq.loi = e instanceof Error ? e.message.split('\n')[0] : String(e);
    }
    await page.screenshot({ path: path.join(THU_MUC, `${tk.cccd}.png`), fullPage: true }).catch(() => undefined);
    console.log(`    · ${tk.ten}: ${JSON.stringify(kq)}`);
  });
}
