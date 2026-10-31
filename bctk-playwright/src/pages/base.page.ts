import { Locator, Page, expect } from '@playwright/test';

/** Một trường trên form, khai báo trong file data JSON */
export interface TruongForm {
  /** Nhãn hiển thị trên form (khớp phần đầu nhãn) */
  nhan: string;
  /** text (mặc định) | select (Ant Design Select) | date (DatePicker dd/MM/yyyy) | textarea | checkbox | radio */
  loai?: 'text' | 'select' | 'date' | 'textarea' | 'checkbox' | 'radio';
  giaTri: string | boolean;
}

/** Khung chứa form: cả trang, một drawer hoặc một modal */
type Khung = Page | Locator;
type Nhan = string | RegExp;

const thoatRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Khớp đúng chữ hiển thị (bỏ khoảng trắng hai đầu) */
export const dungChu = (s: string) => new RegExp(`^\\s*${thoatRegex(s)}\\s*$`);
/** Chứa chuỗi, không phân biệt hoa thường (tên vụ án ở mỗi màn viết hoa khác nhau) */
export const chuaChu = (s: string) => new RegExp(thoatRegex(s), 'i');

/**
 * Lớp cha cho mọi Page Object: điều hướng, chờ tải và thao tác với control Ant Design.
 *
 * Mấy điều đã đo trên STG (16/10/2026), áp dụng cho mọi màn:
 *   · Tên trợ năng của nút có kèm nhãn icon ("edit Ký logic") → tìm nút theo CHỮ HIỂN THỊ (`nut()`).
 *   · Escape đóng luôn drawer/modal đang mở → không dùng Escape để đóng dropdown.
 *   · Dropdown cũ còn trong DOM khi đang ẩn dần → neo dropdown theo `aria-controls` của chính ô select.
 */
export abstract class BasePage {
  constructor(readonly page: Page) {}

  /** Đường dẫn tương đối so với baseURL (…/qla/) hoặc URL đầy đủ */
  async goto(duongDan: string) {
    await this.page.goto(duongDan);
    await this.choTaiXong();
  }

  async choTaiXong(ms = 800) {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    await this.page.waitForTimeout(ms);
    await this.page.locator('.ant-spin-spinning').first().waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => undefined);
    await this.dongHuongDan();
  }

  /** Popup "Hướng dẫn làm quen hệ thống" hiện ngẫu nhiên ở góc phải và che nút → bấm "Để sau" */
  async dongHuongDan() {
    const nut = this.page.locator('button').filter({ hasText: dungChu('Để sau') }).first();
    if (await nut.isVisible().catch(() => false)) await nut.click().catch(() => undefined);
  }

  /**
   * Mở sidebar theo đường dẫn menu, vd. moMenu('Vụ việc', 'Hình sự', 'Quản lý án sơ thẩm', 'Vụ án sơ thẩm').
   * Mỗi link có title = cả đường dẫn nối bằng " › ". Nhóm đang đóng là `section.bk-card` / `div.bk-sub`
   * không có class `open` → mở lần lượt từ ngoài vào trong rồi bấm link.
   * (Một số trang báo 404 nếu vào thẳng bằng URL, nên phải đi qua menu.)
   */
  async moMenu(...duong: string[]) {
    const link = this.page.locator(`.sb-book a.nav-item[title="${duong.join(' › ')}"]`).first();
    // Ngay sau đăng nhập, sidebar có lúc chỉ nạp nhóm "Hệ thống", "Hỗ trợ" (chưa nạp quyền) và không tự nạp thêm
    // (1A1 Vụ 05 bước 01, 29/10) → F5 rồi chờ lại
    for (let lan = 1; ; lan++) {
      if (await link.waitFor({ state: 'attached', timeout: 20_000 }).then(() => true).catch(() => false)) break;
      if (lan >= 3) {
        throw new Error(`Menu không có mục "${duong.join(' › ')}" sau ${lan - 1} lần F5 (tài khoản thiếu quyền hoặc sidebar không nạp đủ) — đang ở ${this.page.url()}`);
      }
      await this.page.reload();
      await this.choTaiXong(2000);
    }
    for (let vong = 0; vong < 8; vong++) {
      const conDong = await link.evaluate(a => {
        document.querySelectorAll('[data-mo-menu]').forEach(e => e.removeAttribute('data-mo-menu'));
        const dong: Element[] = [];
        for (let p = a.parentElement; p && !p.classList.contains('sb-book'); p = p.parentElement) {
          if ((p.classList.contains('bk-sub') || p.classList.contains('bk-card')) && !p.classList.contains('open')) dong.unshift(p);
        }
        if (!dong.length) return false;
        const nut = dong[0].classList.contains('bk-card') ? dong[0].querySelector('button.bk-hd') : dong[0].previousElementSibling;
        nut?.setAttribute('data-mo-menu', '1');
        return !!nut;
      });
      if (!conDong) break;
      await this.page.locator('[data-mo-menu="1"]').click();
      await this.page.waitForTimeout(400);
    }
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await this.choTaiXong(1500);
  }

  /** Nút theo chữ hiển thị chính xác (tên trợ năng có lẫn nhãn icon nên không dùng getByRole) */
  nut(khung: Khung, ten: string | RegExp): Locator {
    return khung.locator('button').filter({ hasText: typeof ten === 'string' ? dungChu(ten) : ten }).first();
  }

  /** Modal / drawer đang mở có chứa chữ `tieuDe` */
  popup(tieuDe: string | RegExp): Locator {
    return this.page
      .locator('.ant-modal-wrap:visible .ant-modal, .ant-drawer-open .ant-drawer-content')
      .filter({ hasText: tieuDe })
      .last();
  }

  /** Tab chi tiết vụ án theo khóa trong id, vd. 'ket-qua-so-tham', 'phan-cong', 'xet-xu' */
  async moTab(khoa: string) {
    const tab = this.page.locator(`[role=tab][id$="-tab-${khoa}"]`).first();
    // Tab bị khóa (aria-disabled) = trang chưa tải được dữ liệu (API đơn/vụ án báo lỗi) → F5 một lần rồi chờ lại
    const moDuoc = await expect(tab).not.toHaveAttribute('aria-disabled', 'true', { timeout: 15_000 }).then(() => true).catch(() => false);
    if (!moDuoc) {
      await this.page.reload();
      await this.choTaiXong(3000);
      await expect(tab, `Tab "${khoa}" vẫn bị khóa sau F5 — máy chủ không trả được dữ liệu của trang`).not.toHaveAttribute('aria-disabled', 'true', { timeout: 30_000 });
    }
    // Có lúc tab đã chuyển nhưng cú bấm vẫn treo chờ (trang đang tải nặng) → tab đã chọn thì coi như xong
    await tab.click().catch(async e => {
      if ((await tab.getAttribute('aria-selected')) !== 'true') throw e;
    });
    await this.choTaiXong(1500);
  }

  /** Mở (nếu đang đóng) một mục thu gọn có tiêu đề bắt đầu bằng `tieuDe`, trả về khối của mục */
  async moMuc(tieuDe: string): Promise<Locator> {
    // Chỉ lấy mục đang hiện: tab khác đã vẽ (ẩn) có thể có mục cùng tên nằm trước trong DOM → .first() trúng mục ẩn, chờ mãi
    const muc = this.page
      .locator('.ant-collapse-item:visible')
      .filter({ has: this.page.locator('.ant-collapse-header', { hasText: new RegExp(`^\\s*${thoatRegex(tieuDe)}`) }) })
      .first();
    const dau = muc.locator('.ant-collapse-header').first();
    // Khung trang đã vẽ mà các mục của tab chưa hiện (1A1 Vụ 01 bước 04, 29/10) → F5, mở lại đúng tab đang chọn rồi chờ lại
    if (!(await dau.waitFor({ timeout: 30_000 }).then(() => true).catch(() => false))) {
      const idTab = await this.page.locator('[role=tab][aria-selected=true]').first().getAttribute('id', { timeout: 5_000 }).catch(() => null);
      await this.page.reload();
      await this.choTaiXong(3000);
      const khoa = idTab?.match(/-tab-(.+)$/)?.[1];
      if (khoa) await this.moTab(khoa);
      await dau.waitFor({ timeout: 30_000 });
    }
    if ((await dau.getAttribute('aria-expanded')) !== 'true') await dau.click();
    await this.choTaiXong(800);
    return muc;
  }

  /**
   * Ô tìm kiếm của các danh sách: từ khóa cũ được giữ lại thành tag ("… hoặc …") kể cả sau khi tải lại
   * trang → xóa hết tag trước rồi mới tìm.
   */
  async timKiem(placeholder: string | RegExp, tuKhoa: string) {
    const xoaHet = this.page.locator('[title="Xóa tất cả"]').first();
    if (await xoaHet.isVisible().catch(() => false)) {
      await xoaHet.click();
      await this.choTaiXong();
    }
    const o = this.page.getByPlaceholder(placeholder).first();
    await o.fill(tuKhoa);
    await this.page.locator('.ant-input-search-button').first().click();
    await this.choTaiXong(1500);
  }

  /** Dòng trong bảng có chứa tất cả `chu` (chờ tối đa 30s) */
  async dong(khung: Khung, ...chu: (string | RegExp)[]): Promise<Locator> {
    let d = khung.locator('.ant-table-tbody tr.ant-table-row');
    for (const c of chu) d = d.filter({ hasText: c });
    await d.first().waitFor({ timeout: 30_000 });
    return d.first();
  }

  /**
   * Chờ bảng trong `khung` tải xong (có dòng, hoặc hiện "không có dữ liệu") trước khi đếm dòng.
   * Đếm ngay sau khi mở màn thì bảng còn rỗng → tưởng "chưa làm" rồi làm trùng.
   */
  async choBang(khung: Locator) {
    await expect(khung.locator('.ant-table-row, .ant-table-placeholder').first()).toBeVisible({ timeout: 30_000 });
    await khung.locator('.ant-spin-spinning').first().waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => undefined);
  }

  /** Chữ ở ô thuộc cột có tiêu đề `tenCot` của dòng `dong` (bảng antd) */
  async docCot(dong: Locator, tenCot: string): Promise<string> {
    const bang = dong.locator('xpath=ancestor::div[contains(@class,"ant-table-wrapper")][1]');
    const tieuDe = (await bang.locator('.ant-table-thead th').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
    const cot = tieuDe.findIndex(t => t === tenCot);
    if (cot < 0) throw new Error(`Bảng không có cột "${tenCot}" (đang có: ${tieuDe.join(' | ')})`);
    return (await dong.locator(':scope > td').nth(cot).innerText()).replace(/\s+/g, ' ').trim();
  }

  /** Chờ thông báo (antd message/notification) khớp `noiDung`, trả về nội dung */
  async choThongBao(noiDung: RegExp, timeout = 30_000): Promise<string> {
    const tb = this.page.locator('.ant-message-notice, .ant-notification-notice').filter({ hasText: noiDung }).first();
    // Máy chủ từ chối thì hiện thông báo lỗi (đỏ) thay vì thông báo thành công → dừng ngay, báo đúng câu lỗi thay vì chờ hết giờ
    const loi = this.page
      .locator('.ant-message-notice:has(.ant-message-error), .ant-notification-notice:has(.ant-notification-notice-icon-error)')
      .first();
    await expect(tb.or(loi).first(), `Không thấy thông báo ${noiDung}`).toBeVisible({ timeout });
    if (!(await tb.isVisible()) && (await loi.isVisible())) {
      const cauLoi = (await loi.innerText().catch(() => '')).trim();
      // "Vui lòng kiểm tra lại dữ liệu nhập!" không nói ô nào sai → kèm lỗi của từng ô đang hiện (1A1 Vụ 02 bước 03, 29/10)
      const oLoi = await this.loiCacO();
      throw new Error(`Hệ thống báo lỗi "${cauLoi}" (đang chờ thông báo ${noiDung})${oLoi.length ? ` — ô lỗi: ${oLoi.join(' | ')}` : ''}`);
    }
    // Thông báo đã thấy nhưng có khi tắt ngay trước lúc đọc chữ → không chờ, trả về mẫu đang chờ
    return ((await tb.innerText({ timeout: 2_000 }).catch(() => null)) ?? noiDung.source).trim();
  }

  /**
   * Các ô đang báo lỗi trên form (dạng "Nhãn: câu lỗi"): ô antd (.ant-form-item-has-error) và ô form tự viết
   * (chữ đỏ có class chứa "error" ngay dưới ô, vd. "Vui lòng chọn ngày sinh"). Tối đa 8 ô.
   */
  async loiCacO(): Promise<string[]> {
    const ds = await this.page
      .evaluate(() => {
        const hien = (e: Element) => !!(e as HTMLElement).offsetParent;
        const gon = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
        const ra: string[] = [];
        document.querySelectorAll('.ant-form-item-has-error').forEach(item => {
          if (!hien(item)) return;
          const nhan = gon(item.querySelector('.ant-form-item-label')?.textContent);
          const cau = gon(item.querySelector('.ant-form-item-explain')?.textContent);
          ra.push(nhan ? `${nhan}: ${cau}` : cau);
        });
        document.querySelectorAll('[class*="error"]:not(.ant-form-item-explain-error):not([class*="ant-form-item"])').forEach(e => {
          const cau = gon(e.textContent);
          if (!hien(e) || !cau || cau.length > 80 || e.children.length > 1) return;
          const nhan = gon(e.parentElement?.querySelector('label')?.textContent);
          ra.push(nhan ? `${nhan}: ${cau}` : cau);
        });
        return ra;
      })
      .catch(() => [] as string[]);
    return [...new Set(ds.filter(Boolean))].slice(0, 8);
  }

  /**
   * Hệ thống có thể hỏi xác nhận NHIỀU LẦN NỐI TIẾP (vd. trùng phòng xử, trùng thành viên HĐXX).
   * Bỏ sót một hộp thì dữ liệu không lưu mà cũng không báo lỗi → đồng ý cho tới khi hết hộp.
   */
  async dongYTatCaXacNhan(): Promise<string[]> {
    const hoi = this.page.locator('.ant-modal-confirm:visible').first();
    const daHoi: string[] = [];
    for (let lan = 0; lan < 5; lan++) {
      const co = await hoi.waitFor({ state: 'visible', timeout: lan === 0 ? 8_000 : 3_000 }).then(() => true).catch(() => false);
      if (!co) break;
      // Hộp vừa thấy đã đóng (hiệu ứng đóng của hộp trước) → đọc chữ không chờ lâu, mất thì xét lại vòng sau
      const chu = await hoi.innerText({ timeout: 2_000 }).catch(() => null);
      if (chu === null) continue;
      daHoi.push(chu.replace(/\s+/g, ' ').trim());
      // Hộp đang chạy hiệu ứng (nhiều hộp chồng nhau) → nút "không ổn định", bấm thường hết giờ → bấm cưỡng bức
      const dongY = hoi.locator('.ant-btn-primary').last();
      // Hộp vừa bấm "Đồng ý" đang chạy hiệu ứng đóng vẫn khớp :visible → bấm lại không được rồi hộp biến mất → bỏ qua, không báo lỗi
      await dongY.click({ timeout: 10_000 }).catch(() => dongY.click({ force: true, timeout: 5_000 }).catch(() => undefined));
      await this.page.waitForTimeout(1000);
    }
    return daHoi;
  }

  // ───────────── Ô nhập trong form antd ─────────────

  /** `.ant-form-item` có nhãn bắt đầu bằng `nhan` (chuỗi) hoặc khớp `nhan` (RegExp) */
  oTheoNhan(nhan: Nhan, khung: Khung = this.page): Locator {
    const mau = typeof nhan === 'string' ? new RegExp(`^\\s*${thoatRegex(nhan)}`) : nhan;
    return khung.locator('.ant-form-item').filter({ has: this.page.locator('.ant-form-item-label', { hasText: mau }) }).first();
  }

  private async moDropdown(item: Locator) {
    const input = item.locator('input.ant-select-selection-search-input, input[aria-controls]').first();
    await item.locator('.ant-select-selector').first().click();
    const listId = await input.getAttribute('aria-controls');
    // Chỉ lấy dropdown THẬT SỰ hiện: 2 ô trùng id (10I tab Yêu cầu: "Người / Cơ quan bị kiện" và "Người bị kiện" cùng id idNguoiBiKien)
    // → dropdown cũ của ô trước còn trong DOM, không có class -hidden mà không hiện; .last() khớp nhầm nó (10I Đơn 01, 30/10)
    const dangMo = this.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').filter({ visible: true });
    // Form cũ (vd. "Thêm lịch xét xử" mở lần trước) còn nằm ẩn trong DOM với cùng id danh sách → chỉ lấy dropdown đang mở
    // (Đơn 04 bước 10: dropdown "Tính chất phiên tòa" đã mở mà vẫn chờ hết giờ vì khớp nhầm bản ẩn)
    let dd = listId ? dangMo.filter({ has: this.page.locator(`[id="${listId}"]`) }).last() : dangMo.last();
    if (!(await dd.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false))) {
      dd = dangMo.last();
      await dd.waitFor({ state: 'visible', timeout: 7_000 });
    }
    await dd.locator('.ant-select-item-option').first().waitFor({ timeout: 15_000 });
    return { dd, input };
  }

  /**
   * Chọn trong ô select nằm trong `item`.
   * @param giaTri chuỗi (ưu tiên khớp đúng, rồi chứa) | RegExp | bỏ trống = chọn ngẫu nhiên
   * @returns chữ của mục đã chọn
   */
  async chonTrong(item: Locator, giaTri?: string | RegExp): Promise<string> {
    const { dd, input } = await this.moDropdown(item);
    const cacMuc = dd.locator('.ant-select-item-option:not(.ant-select-item-option-disabled)');
    let muc: Locator;
    const ngauNhien = giaTri === undefined;
    if (ngauNhien) {
      // Ngẫu nhiên: lấy TÊN một mục đang hiện rồi bấm đúng mục đó; cuối hàm đọc lại ô để chắc đã nhận
      // Danh mục tải chậm → chờ có mục rồi mới lấy (danh sách rỗng thì giaTri = undefined)
      await cacMuc.first().waitFor({ timeout: 15_000 }).catch(() => undefined);
      await this.page.waitForTimeout(500);
      const ten = (await cacMuc.allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
      if (!ten.length) throw new Error('Ô chọn không có mục nào để chọn ngẫu nhiên');
      giaTri = ten[Math.floor(Math.random() * ten.length)];
      muc = cacMuc.filter({ hasText: dungChu(giaTri) }).first();
    } else if (giaTri instanceof RegExp) {
      muc = cacMuc.filter({ hasText: giaTri }).first();
    } else {
      // readonly="" là chuỗi rỗng → so với null, không dùng truthy
      if ((await input.getAttribute('readonly')) === null) await input.fill(giaTri!).catch(() => undefined);
      const dung = cacMuc.filter({ hasText: dungChu(giaTri!) }).first();
      muc = (await dung.count()) ? dung : cacMuc.filter({ hasText: giaTri! }).first();
    }
    await this.page.waitForTimeout(400);
    const chu = (await muc.innerText()).replace(/\s+/g, ' ').trim();
    // ProSelect có tìm kiếm render lại liên tục → click có thể không "ổn định"; khi đó chọn bằng phím
    const daBam = await muc.click({ timeout: 5_000 }).then(() => true).catch(() => false);
    if (!daBam) {
      await muc.hover({ force: true }).catch(() => undefined);
      await this.page.keyboard.press('Enter');
    }
    const daDong = await dd.waitFor({ state: 'hidden', timeout: 3_000 }).then(() => true).catch(() => false);
    // Select nhiều lựa chọn vẫn mở sau khi chọn → bấm lại ô để đóng
    if (!daDong) await item.locator('.ant-select-selector').first().click().catch(() => undefined);
    await this.page.waitForTimeout(300);

    // Chọn ngẫu nhiên mà ô vẫn trống (danh sách ảo dài, mục nằm ngoài vùng nhìn) → gõ tên để lọc rồi chọn lại
    if (ngauNhien && !(await item.locator('.ant-select-selection-item').count())) {
      return this.chonTrong(item, chu);
    }
    return chu;
  }

  async chon(khung: Khung, nhan: Nhan, giaTri?: string | RegExp) {
    return this.chonTrong(this.oTheoNhan(nhan, khung), giaTri);
  }

  /** Danh sách mục của ô select trong `item` (mở rồi đóng lại bằng cách bấm lại ô, không dùng Escape) */
  async cacLuaChonTrong(item: Locator): Promise<string[]> {
    const { dd } = await this.moDropdown(item);
    await this.page.waitForTimeout(600);
    const ds = (await dd.locator('.ant-select-item-option').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
    if (await dd.isVisible().catch(() => false)) await item.locator('.ant-select-selector').first().click();
    await dd.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
    return ds;
  }

  async cacLuaChon(khung: Khung, nhan: Nhan): Promise<string[]> {
    return this.cacLuaChonTrong(this.oTheoNhan(nhan, khung));
  }

  /** Tích checkbox theo chữ của nó (checkbox nằm ngoài form-item, vd. nhóm "Yêu cầu kháng cáo") */
  async tichO(khung: Khung, chu: string) {
    const nhan = khung.locator('label.ant-checkbox-wrapper').filter({ hasText: dungChu(chu) }).first();
    if (!(await nhan.locator('input').isChecked())) await nhan.click();
  }

  /** Chọn tệp ở khối "Tệp đính kèm" rồi bấm "Thêm mới" cùng hàng; kiểm tệp đã vào bảng */
  async dinhKemTep(khung: Locator, file: string) {
    await khung.locator('input[type=file]').first().setInputFiles(file);
    await this.page.waitForTimeout(500);
    const hang = this.nut(khung, 'Chọn tệp').locator('xpath=ancestor::div[contains(@class,"ant-row")][1]');
    await this.nut(hang, 'Thêm mới').click();
    const tenTep = file.split(/[\\/]/).pop()!;
    await expect(khung.locator('.ant-table-row').filter({ hasText: tenTep }).first()).toBeVisible({ timeout: 15_000 });
  }

  async nhap(khung: Khung, nhan: Nhan, giaTri: string) {
    await this.oTheoNhan(nhan, khung).locator('input, textarea').first().fill(giaTri);
    return giaTri;
  }

  /** Ô ngày dd/mm/yyyy: gõ rồi Enter */
  async ngay(khung: Khung, nhan: Nhan, ddmmyyyy: string) {
    const o = this.oTheoNhan(nhan, khung).locator('.ant-picker input').first();
    await o.click();
    await o.fill(ddmmyyyy);
    await o.press('Enter');
    await this.page.waitForTimeout(300);
    return ddmmyyyy;
  }

  async radio(khung: Khung, nhan: Nhan, giaTri: string) {
    await this.oTheoNhan(nhan, khung).locator('.ant-radio-wrapper', { hasText: giaTri }).first().click();
    return giaTri;
  }

  /** Giá trị đang hiển thị của ô theo nhãn */
  async docGiaTri(nhan: Nhan, khung: Khung = this.page): Promise<string> {
    const o = this.oTheoNhan(nhan, khung);
    const chon = o.locator('.ant-select-selection-item');
    if (await chon.count()) return (await chon.allInnerTexts()).join(', ').trim();
    const input = o.locator('input, textarea').first();
    if (await input.count()) return (await input.inputValue()).trim();
    return (await o.locator('.ant-form-item-control').innerText()).trim();
  }

  // ───────────── API cũ cho các form khai báo bằng JSON (1A, 1C, 1D, 2A) ─────────────

  async nhapText(nhan: string, giaTri: string) {
    await this.nhap(this.page, nhan, giaTri);
  }

  async chonSelect(nhan: string, giaTri: string) {
    await this.chon(this.page, nhan, giaTri);
  }

  async chonNgay(nhan: string, ddMMyyyy: string) {
    await this.ngay(this.page, nhan, ddMMyyyy);
  }

  async danhDau(nhan: string, bat: boolean) {
    await this.oTheoNhan(nhan).locator('input[type="checkbox"]').first().setChecked(bat);
  }

  async chonRadio(nhan: string, giaTri: string) {
    await this.radio(this.page, nhan, giaTri);
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

  async bamNut(ten: string | RegExp) {
    await this.nut(this.page, ten).click();
  }

  /** Chờ thông báo thành công của antd (message/notification) */
  async choThongBaoThanhCong(noiDung: RegExp = /thành công/i) {
    await this.choThongBao(noiDung);
  }
}

/**
 * Bộ thao tác màn hình dùng trực tiếp trong các file bước (pages/<lĩnh vực>/form-<mã>/buoc/*.ts):
 *   const m = new ManHinh(page);  await m.moMenu(…);  await m.nut(m.page, 'Lưu').click();
 */
export class ManHinh extends BasePage {}
