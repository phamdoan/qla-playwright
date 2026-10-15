import { Locator, Page, expect } from '@playwright/test';

/** Một trường trên form, khai báo trong file data JSON */
export interface TruongForm {
  /** Nhãn hiển thị trên form (khớp gần đúng, không phân biệt hoa thường) */
  nhan: string;
  /** text (mặc định) | select (Ant Design Select) | date (DatePicker dd/MM/yyyy) | textarea | checkbox | radio */
  loai?: 'text' | 'select' | 'date' | 'textarea' | 'checkbox' | 'radio';
  giaTri: string | boolean;
}

/**
 * Lớp cha cho mọi Page Object: điều hướng, chờ tải và thao tác với control Ant Design
 * (hệ thống quản lý án dùng antd nên label/select/datepicker có cấu trúc giống nhau ở mọi form).
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Đường dẫn tương đối so với baseURL (…/qla/) */
  async goto(duongDan: string) {
    await this.page.goto(duongDan);
    await this.choTaiXong();
  }

  async choTaiXong() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
    await this.page.locator('.ant-spin-spinning').first().waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => undefined);
  }

  /** Mở menu theo chuỗi tên, vd. moMenu('Báo cáo thống kê', 'Hình sự') */
  async moMenu(...tenMuc: string[]) {
    for (const ten of tenMuc) {
      await this.page.locator('.ant-menu').getByText(ten, { exact: true }).first().click();
    }
    await this.choTaiXong();
  }

  /** Ô nhập ứng với nhãn: tìm .ant-form-item chứa label rồi lấy control bên trong */
  protected oTheoNhan(nhan: string): Locator {
    return this.page
      .locator('.ant-form-item')
      .filter({ has: this.page.locator('.ant-form-item-label', { hasText: nhan }) })
      .first();
  }

  async nhapText(nhan: string, giaTri: string) {
    const o = this.oTheoNhan(nhan).locator('input, textarea').first();
    await o.fill(giaTri);
  }

  async chonSelect(nhan: string, giaTri: string) {
    await this.oTheoNhan(nhan).locator('.ant-select-selector').click();
    // Select có tìm kiếm: gõ để lọc trước khi chọn
    await this.page.keyboard.type(giaTri);
    await this.page
      .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
      .filter({ hasText: giaTri })
      .first()
      .click();
  }

  async chonNgay(nhan: string, ddMMyyyy: string) {
    const o = this.oTheoNhan(nhan).locator('input').first();
    await o.click();
    await o.fill(ddMMyyyy);
    await o.press('Enter');
  }

  async danhDau(nhan: string, bat: boolean) {
    const o = this.oTheoNhan(nhan).locator('input[type="checkbox"]').first();
    await o.setChecked(bat);
  }

  async chonRadio(nhan: string, giaTri: string) {
    await this.oTheoNhan(nhan).locator('.ant-radio-wrapper', { hasText: giaTri }).first().click();
  }

  /** Điền lần lượt các trường khai báo trong data */
  async dienForm(truong: TruongForm[]) {
    for (const t of truong) {
      const giaTri = String(t.giaTri);
      switch (t.loai ?? 'text') {
        case 'select':
          await this.chonSelect(t.nhan, giaTri);
          break;
        case 'date':
          await this.chonNgay(t.nhan, giaTri);
          break;
        case 'checkbox':
          await this.danhDau(t.nhan, t.giaTri === true || giaTri === 'true');
          break;
        case 'radio':
          await this.chonRadio(t.nhan, giaTri);
          break;
        default:
          await this.nhapText(t.nhan, giaTri);
      }
    }
  }

  /** Giá trị đang hiển thị của ô theo nhãn (input readonly hoặc text) */
  async docGiaTri(nhan: string): Promise<string> {
    const o = this.oTheoNhan(nhan);
    const input = o.locator('input, textarea').first();
    if (await input.count()) return (await input.inputValue()).trim();
    return (await o.locator('.ant-form-item-control').innerText()).trim();
  }

  async bamNut(ten: string | RegExp) {
    await this.page.getByRole('button', { name: ten }).first().click();
  }

  /** Chờ thông báo thành công của antd (message/notification) */
  async choThongBaoThanhCong(noiDung: RegExp = /thành công/i) {
    await expect(this.page.locator('.ant-message-notice, .ant-notification-notice').filter({ hasText: noiDung }).first()).toBeVisible({
      timeout: 30_000,
    });
  }
}
