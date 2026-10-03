import { Locator, Page, expect } from '@playwright/test';
import { nghi } from './antd';
import { veTrangChu } from './vai';

/** Thoát ký tự đặc biệt để ghép vào RegExp */
const thoat = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/**
 * Khung menu bên trái — đỡ cả HAI thế hệ menu.
 *
 * ⚠ MENU V3 (STG từ 02/10/2026, `src/layouts/MenuV3`): trang có HAI thẻ `<aside>` và thẻ ĐỨNG TRƯỚC
 * là thẻ ẩn (`class="fixed bottom-0 left-0 overflow-hidden …"`), nên `locator('aside').first()` luôn
 * trả về cái ẩn và `toBeVisible()` chờ hết 60 s dù menu vẫn hiện bình thường. Menu thật là
 * `<aside aria-label="Menu chính">` (role `complementary`). Menu cũ là `.ant-layout-sider`.
 */
function khungMenu(page: Page): Locator {
  return page
    .locator('aside[aria-label="Menu chính"], .ant-layout-sider')
    .filter({ has: page.locator('a, [role="menuitem"]') })
    .first();
}

/**
 * NHÃN MENU ĐỔI Ở MENU V3 (đo STG 02/10/2026) — nhãn cũ → các nhãn có thể gặp.
 *
 * Nhóm "Quản lý án GĐT/TT" giờ là "Giám đốc thẩm, tái thẩm", và các mục con nằm PHẲNG trong nhóm đó.
 * Giữ cả hai tên để bộ test chạy được trên môi trường chưa cập nhật menu.
 */
const TEN_KHAC: Record<string, string[]> = {
  'Quản lý án GĐT/TT': ['Giám đốc thẩm, tái thẩm'],
  'Nhận đơn và TL vụ án': ['Nhận đơn và thụ lý vụ án'],
  'Phân công TTV': ['Phân công thẩm tra viên'],
};

/**
 * Một mục menu theo nhãn — Menu V3 vẽ mục là `<a>` (role `link`), menu cũ là `role=menuitem`.
 * Nhãn có thể kèm số đếm ("Quản lý đơn 20") nên chỉ khớp PHẦN ĐẦU, và nhận cả tên cũ lẫn tên mới.
 */
function mucMenu(menu: Locator, nhan: string): Locator {
  const ds = [nhan, ...(TEN_KHAC[nhan] || [])];
  const mau = new RegExp(`^(${ds.map(thoat).join('|')})(\\s|$)`);
  return menu.getByRole('menuitem', { name: mau }).or(menu.getByRole('link', { name: mau })).first();
}

/**
 * Đi tới màn của một mục menu. ĐƯỜNG DẪN LẤY TỪ CHÍNH MỤC MENU (`href`), không đoán và cũng không
 * phải bấm: Menu V3 kiểu "Bàn khởi động" xếp các mục dưới thẻ `section.bk-card`, thẻ này chặn con trỏ
 * nên `click()` hỏng "intercepts pointer events" rồi hết 30 s (đo 02/10/2026). Mục nhóm (`href="#"`)
 * thì vẫn phải bấm để mở nhóm.
 *
 * @returns true nếu đã điều hướng xong
 */
async function diTheoMuc(page: Page, muc: Locator): Promise<boolean> {
  const href = await muc.getAttribute('href').catch(() => null);
  if (href && href !== '#' && !href.startsWith('#')) {
    await page.goto(href, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    return true;
  }
  await muc.click({ force: true });
  await nghi(page, 300, 600);
  return false;
}

/**
 * Mở màn hình bằng menu bên trái như người dùng (menu lấy từ DB nên không đoán URL).
 * `duong` là chuỗi nhãn từ menu cha tới menu con, vd. ['Quản lý đơn', 'Phân công thẩm phán'].
 */
export async function moMenu(page: Page, duong: string[]) {
  // Trang hiện tại không có menu (about:blank, trang 404...) → về dashboard
  const trang404 = await page.getByText('Không tìm thấy trang').isVisible().catch(() => false);
  if (!/\/qla\//.test(page.url()) || /about:blank|exception/.test(page.url()) || trang404) await veTrangChu(page);

  /**
   * MÁY CHỦ CHẾT THÌ NÓI THẲNG: nginx trả trang "503 Service Temporarily Unavailable" (HTTP 200 với
   * `page.goto` của SPA đã vào trước đó) và mọi thứ sau đó chỉ báo "không thấy menu/phần tử X", trông
   * như lỗi selector (đo 02/10/2026 giữa đợt chạy GĐT).
   */
  const loiMayChu = await page
    .getByRole('heading', { name: /50[0-9] |Service Temporarily Unavailable|Bad Gateway/i })
    .first()
    .innerText()
    .catch(() => '');
  if (loiMayChu) {
    throw new Error(
      `Máy chủ đang lỗi — KHÔNG phải lỗi kịch bản: "${loiMayChu.replace(/\s+/g, ' ').trim()}" ` +
        `(${process.env.QLA_ENV || 'stg'}, URL ${page.url()}). Chờ môi trường rồi chạy lại.`,
    );
  }

  let menu = khungMenu(page);
  if (!(await menu.isVisible().catch(() => false))) {
    // Màn Thêm mới đơn… thu gọn menu; có nút mở thì bấm, không thì về dashboard rồi tìm lại
    const moRong = page.getByRole('button', { name: /menu-unfold/ });
    if (await moRong.isVisible().catch(() => false)) await moRong.click();
    else await veTrangChu(page);
    menu = khungMenu(page);
  }
  await expect(menu, 'Không thấy menu bên trái (cả MenuV3 "Menu chính" và .ant-layout-sider)').toBeVisible({
    timeout: 60_000,
  });

  /**
   * MENU V3 vẽ SẴN cả cây: mục con nằm trong DOM ngay cả khi nhóm cha chưa bấm. Nên thử mục CUỐI
   * trước — bấm trúng là xong. Bấm nhóm cha khi nó đang mở thì lại ĐÓNG nhóm (link cha có `href="#"`,
   * không có `aria-expanded` để biết trạng thái) → mục con biến mất.
   */
  const cuoi = mucMenu(menu, duong[duong.length - 1]);
  if (await cuoi.isVisible().catch(() => false)) {
    if (await diTheoMuc(page, cuoi)) return;
  }

  for (let i = 0; i < duong.length; i++) {
    const nhan = duong[i];
    const muc = mucMenu(menu, nhan);
    await expect(muc, `Không thấy menu "${nhan}"`).toBeVisible({ timeout: 30_000 });
    const laCuoi = i === duong.length - 1;
    const dangMo = (await muc.getAttribute('aria-expanded')) === 'true';
    if (laCuoi || !dangMo) {
      if (await diTheoMuc(page, muc)) return;
    }
  }
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
}
