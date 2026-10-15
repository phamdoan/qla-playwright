import { Page, expect } from '@playwright/test';
import { BasePage, TruongForm } from '../../base.page';

/**
 * Biểu mẫu 2A — Thống kê thụ lý và giải quyết các vụ, việc dân sự sơ thẩm.
 * Tạo vụ án dân sự sơ thẩm (thụ lý) để có số liệu lên báo cáo 2A.
 */
export class CreateCase2APage extends BasePage {
  // TODO: xác nhận lại đường dẫn màn thêm mới vụ án DS sơ thẩm trên môi trường đang chạy
  static readonly DUONG_DAN = 'dan-su/so-tham/vu-an/them-moi';

  constructor(page: Page) {
    super(page);
  }

  async mo() {
    await this.goto(CreateCase2APage.DUONG_DAN);
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
