import { Page } from '@playwright/test';
import { BasePage, chuaChu } from '../base.page';

/**
 * Lãnh đạo › Công tác lãnh đạo › Phê duyệt đề xuất — người ký mở văn bản đang "Chờ ký" rồi Ký logic.
 * Dùng chung cho mọi văn bản được trình ký (phân công thẩm phán, quyết định đưa vụ án ra xét xử…).
 */
export class PheDuyetDeXuatPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * @param tenVuAn  tên vụ án đúng như hệ thống ghi, vd. "Vụ án Nguyễn Thị Hòa - lừa đảo chiếm đoạt tài sản"
   * @param loaiVanBan chữ ở cột "Nội dung đề xuất", vd. "Phân công Thẩm phán"
   */
  /**
   * @returns false nếu không còn văn bản "Chờ ký" (đã ký ở lượt trước) — khi đó bỏ qua
   */
  async kyLogic(tenVuAn: string, loaiVanBan: string): Promise<boolean> {
    await this.moMenu('Lãnh đạo', 'Công tác lãnh đạo', 'Phê duyệt đề xuất');
    // Tên vụ án ở đây viết hoa khác danh sách sơ thẩm → so không phân biệt hoa thường
    const cacDong = this.page
      .locator('.ant-table-tbody tr.ant-table-row')
      .filter({ hasText: chuaChu(tenVuAn) })
      .filter({ hasText: loaiVanBan })
      .filter({ hasText: 'Chờ ký' });
    if (!(await cacDong.first().waitFor({ timeout: 20_000 }).then(() => true).catch(() => false))) return false;
    const dong = cacDong.first();
    // Tên vụ án là thẻ <a> không có href (không mang role link)
    await dong.locator('a').first().click();
    await this.page.waitForURL(/phe-duyet-de-xuat\/y-kien-lanh-dao/, { timeout: 60_000 });
    await this.choTaiXong(2000);
    await this.nut(this.page, 'Ký logic').click();
    await this.choThongBao(/Ký logic.*thành công/i, 60_000);
    return true;
  }
}
