import { Page, expect } from '@playwright/test';
import { BasePage, TruongForm } from '../../base.page';

/**
 * Biểu mẫu 1D — Thống kê thụ lý và giải quyết các vụ án hình sự tái thẩm do cá nhân phạm tội.
 * Tạo vụ án hình sự tái thẩm (thụ lý kháng nghị tái thẩm) để có số liệu lên báo cáo 1D.
 */
export class CreateCase1DPage extends BasePage {
  // TODO: xác nhận lại đường dẫn màn thêm mới vụ án HS tái thẩm trên môi trường đang chạy
  static readonly DUONG_DAN = 'hinh-su/tai-tham/vu-an/them-moi';

  constructor(page: Page) {
    super(page);
  }

  async mo() {
    await this.goto(CreateCase1DPage.DUONG_DAN);
    await expect(this.page.locator('form').first()).toBeVisible();
  }

  async taoVuAn(truong: TruongForm[]): Promise<string> {
    await this.dienForm(truong);
    await this.bamNut(/^Lưu$/);
    await this.choThongBaoThanhCong();
    await this.choTaiXong();
    return this.layMaVuAn();
  }

  async layMaVuAn(): Promise<string> {
    const ma = await this.docGiaTri('Mã vụ án');
    if (!ma) throw new Error('Đã lưu nhưng không đọc được "Mã vụ án" trên màn hình');
    return ma;
  }
}
