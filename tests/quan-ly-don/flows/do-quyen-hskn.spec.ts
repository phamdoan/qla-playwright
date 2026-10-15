/**
 * DÒ (chỉ đọc) — tài khoản đào tạo nào thấy nút "Thêm mới HSKN" ở Quản lý hồ sơ giao nhận → Kháng nghị → Đến.
 * Không bấm nút ghi; mỗi tài khoản: đăng nhập → mở màn → chụp ảnh → ghi có/không có nút.
 *
 *   QLA_DO_TK="<cccd>:<tên>,<cccd>:<tên>" node tools/chay-ui.js daotao --cli --file=do-quyen-hskn
 * Báo cáo: reports/do-quyen-hskn/ket-qua.json + ảnh.
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
const THU_MUC = path.resolve(__dirname, '../../../reports/do-quyen-hskn');

test.use({ storageState: { cookies: [], origins: [] } });

for (const tk of DS_TK) {
  test(`do-quyen-hskn · ${tk.ten}`, async ({ page }) => {
    test.setTimeout(5 * 60_000);
    test.skip(new URL(ORIGIN).host !== 'e-qlta-daotao.toaan.gov.vn', `Chỉ chạy trên đào tạo, đang ở ${ORIGIN}`);
    fs.mkdirSync(THU_MUC, { recursive: true });
    const kq: Record<string, unknown> = { cccd: tk.cccd, ten: tk.ten };
    try {
      await loginSSO(page, tk.cccd, { pass: `Ta@${tk.cccd}` });
      await page.goto(`${ORIGIN}/qla/vu-an/gdt-tt/quan-ly-ho-so-giao-nhan/danh-sach?nhom=khangNghi&chieu=den`);
      await choHetSpin(page);
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(3_000);
      kq.url = page.url();
      kq.tab = (await page.getByRole('tab').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
      kq.coNutThemMoiHskn = await page.getByRole('button', { name: /Thêm mới HSKN/ }).first().isVisible().catch(() => false);
      kq.soDong = await page.locator('.ant-table-row:visible').count();
      kq.thongBao = (await page.locator('.ant-result-title, .ant-empty-description, .ant-message-notice').allInnerTexts()).slice(0, 3);
    } catch (e) {
      kq.loi = e instanceof Error ? e.message.split('\n')[0] : String(e);
    }
    await page.screenshot({ path: path.join(THU_MUC, `${tk.cccd}.png`), fullPage: true }).catch(() => undefined);
    fs.writeFileSync(path.join(THU_MUC, `${tk.cccd}.json`), JSON.stringify(kq, null, 2));
    console.log(`    · ${tk.ten}: ${JSON.stringify(kq)}`);
  });
}
