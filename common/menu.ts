import { Page, expect } from '@playwright/test';
import { nghi } from './antd';
import { veTrangChu } from './vai';

/**
 * Mở màn hình bằng menu bên trái như người dùng (menu lấy từ DB nên không đoán URL).
 * `duong` là chuỗi nhãn từ menu cha tới menu con, vd. ['Quản lý đơn', 'Phân công thẩm phán'].
 * Nhãn menu có thể kèm số đếm (vd. "Quản lý đơn 1 6") → so khớp phần đầu.
 */
export async function moMenu(page: Page, duong: string[]) {
  // Trang hiện tại không có menu (about:blank, trang 404...) → về dashboard
  const trang404 = await page.getByText('Không tìm thấy trang').isVisible().catch(() => false);
  if (!/\/qla\//.test(page.url()) || /about:blank|exception/.test(page.url()) || trang404) await veTrangChu(page);
  const menu = page.locator('.ant-layout-sider, aside').first();
  await expect(menu).toBeVisible({ timeout: 60_000 });
  // Sidebar đang thu gọn (màn Thêm mới đơn...) → mở ra
  const moRong = page.getByRole('button', { name: /menu-unfold/ });
  if (await moRong.isVisible().catch(() => false)) await moRong.click();

  for (let i = 0; i < duong.length; i++) {
    const nhan = duong[i];
    const muc = menu.getByRole('menuitem', { name: new RegExp(`^${nhan.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(\\s|$)`) }).first();
    await expect(muc, `Không thấy menu "${nhan}"`).toBeVisible({ timeout: 30_000 });
    const laCuoi = i === duong.length - 1;
    const dangMo = (await muc.getAttribute('aria-expanded')) === 'true';
    if (laCuoi || !dangMo) {
      await muc.click();
      await nghi(page, 300, 600);
    }
  }
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
}
