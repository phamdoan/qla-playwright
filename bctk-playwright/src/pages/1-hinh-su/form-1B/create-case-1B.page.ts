import { Page, expect } from '@playwright/test';
import { BasePage, TruongForm } from '../../base.page';

/**
 * Biểu mẫu 1B — Thống kê thụ lý và giải quyết các vụ án hình sự phúc thẩm do cá nhân phạm tội.
 * Tạo vụ án hình sự phúc thẩm (thụ lý kháng cáo/kháng nghị) để có số liệu lên báo cáo 1B.
 */
export class CreateCase1BPage extends BasePage {
  // TODO: xác nhận lại đường dẫn màn thêm mới vụ án HS phúc thẩm trên môi trường đang chạy
  static readonly DUONG_DAN = 'hinh-su/phuc-tham/vu-an/them-moi';

  constructor(page: Page) {
    super(page);
  }

  async mo() {
    await this.goto(CreateCase1BPage.DUONG_DAN);
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
