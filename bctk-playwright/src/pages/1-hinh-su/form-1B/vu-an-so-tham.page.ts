import { Locator, Page } from '@playwright/test';
import { BasePage, dungChu } from '../../base.page';
import { hoTen, ngay, so8 } from '../../../utils/fake-data';

/** Luồng 1: kháng cáo · Luồng 2: kháng nghị */
export type Luong = 'khang-cao' | 'khang-nghi';

const TIEU_DE_KHOI: Record<Luong, string> = { 'khang-cao': 'Đơn kháng cáo', 'khang-nghi': 'Quyết định kháng nghị' };
const MAU_THONG_BAO: Record<Luong, string> = {
  'khang-cao': 'Thông báo về việc kháng cáo',
  'khang-nghi': 'Thông báo về việc kháng nghị',
};

/**
 * Hình sự › Quản lý án sơ thẩm — phía Tòa sơ thẩm (hướng dẫn bước 2 → 3.2):
 * tìm vụ án đã xét xử → thêm kháng cáo/kháng nghị → duyệt → lập thông báo + ký logic → chuyển hồ sơ lên phúc thẩm.
 */
export class VuAnSoThamPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * B2–2.2: Vụ việc › Hình sự › Quản lý án sơ thẩm › Vụ án sơ thẩm → tìm → mở vụ án (phải "Đã xét xử").
   * @returns tên vụ án (dùng để tìm ở Tòa phúc thẩm — ô tìm ở đó không phân biệt hoa thường), mã định danh
   *          (D01-…, giữ nguyên khi lên phúc thẩm) và vụ đã được chuyển lên phúc thẩm ở lượt trước chưa
   */
  async moVuAn(maVuAn: string): Promise<{ tenVuAn: string; maDinhDanh: string; daChuyenPhucTham: boolean }> {
    await this.moMenu('Vụ việc', 'Hình sự', 'Quản lý án sơ thẩm', 'Vụ án sơ thẩm');
    await this.timKiem('Nhập từ khóa tìm kiếm', maVuAn);
    const dong = await this.dong(this.page, maVuAn);
    const chu = (await dong.innerText()).replace(/\s+/g, ' ');
    if (!/Đã xét xử/.test(chu)) throw new Error(`Vụ án ${maVuAn} chưa ở trạng thái "Đã xét xử": ${chu.slice(0, 250)}`);
    // Cột "Thông tin vụ án": tên vụ án là .ant-typography đầu tiên (không phải dòng chữ phụ màu xám)
    const oTen = dong.locator('td').nth(1).locator('.ant-typography:not(.ant-typography-secondary)').first();
    const tenVuAn = (await oTen.innerText()).trim();
    await oTen.click();
    await this.page.waitForURL(/so-tham\/chi-tiet/, { timeout: 60_000 });
    await this.choTaiXong(1500);
    return { tenVuAn, maDinhDanh: chu.match(/D\d{2}-\d{4}-\d+/)?.[0] ?? '', daChuyenPhucTham: /Đã chuyển phúc thẩm/.test(chu) };
  }

  /** Khối đơn kháng cáo / quyết định kháng nghị đã có dòng nào chưa (lượt trước đã thêm) */
  async daCoDon(luong: Luong): Promise<boolean> {
    const khoi = await this.khoi(luong);
    await this.choBang(khoi);
    return (await khoi.locator('.ant-table-row').count()) > 0;
  }

  /** Còn đơn/quyết định "Chờ xử lý" cần duyệt không */
  async conChoDuyet(luong: Luong): Promise<boolean> {
    const khoi = await this.khoi(luong);
    await this.choBang(khoi);
    return (await khoi.locator('.ant-table-row').filter({ hasText: 'Chờ xử lý' }).count()) > 0;
  }

  /** Bảng "Văn bản xử lý KC/KN" đã có thông báo về việc kháng cáo/kháng nghị chưa */
  async daCoThongBao(luong: Luong): Promise<boolean> {
    await this.moTab('ket-qua-so-tham');
    const muc = await this.moMuc('Kháng cáo, kháng nghị');
    // Mục có 3 bảng (đơn KC, QĐ KN, văn bản xử lý) → chờ cả bảng cuối
    await this.choBang(muc.locator('.ant-table-wrapper').last());
    return (await muc.locator('.ant-table-row').filter({ hasText: MAU_THONG_BAO[luong] }).count()) > 0;
  }

  /** Khối "Đơn kháng cáo" / "Quyết định kháng nghị" trong mục "Kháng cáo, kháng nghị" của tab "Kết quả sơ thẩm" */
  private async khoi(luong: Luong): Promise<Locator> {
    await this.moTab('ket-qua-so-tham');
    const muc = await this.moMuc('Kháng cáo, kháng nghị');
    const khac: Luong = luong === 'khang-cao' ? 'khang-nghi' : 'khang-cao';
    return muc
      .locator('div')
      .filter({ has: this.page.getByText(TIEU_DE_KHOI[luong], { exact: true }) })
      .filter({ has: this.page.locator('button').filter({ hasText: dungChu('Thêm mới') }) })
      .filter({ hasNotText: TIEU_DE_KHOI[khac] })
      .last();
  }

  /** B2.4 · Luồng 1 + B2.5: thêm đơn kháng cáo kèm tệp, "Lưu mới" */
  async themKhangCao(fileDinhKem: string) {
    await this.nut(await this.khoi('khang-cao'), 'Thêm mới').click();
    const d = this.popup('Thêm mới quyết định kháng cáo');
    await d.waitFor({ timeout: 30_000 });
    await this.choTaiXong();

    const homNay = ngay(0);
    await this.radio(d, 'Tình trạng thời hạn', 'Trong hạn');
    await this.ngay(d, 'Ngày tiếp nhận', homNay);
    await this.nhap(d, 'Số tiếp nhận', so8());
    await this.chon(d, 'Hình thức tiếp nhận', 'Trực tiếp tại tòa');
    await this.ngay(d, 'Ngày kháng cáo', homNay);
    // Vai trò phải chọn trước: danh sách "Tên người kháng cáo" lọc theo vai trò
    await this.chon(d, 'Vai trò tố tụng', 'Bị cáo');
    await this.page.waitForTimeout(800);
    await this.chon(d, 'Tên người kháng cáo');
    await this.page.waitForTimeout(800);
    // "Kháng cáo đối với bị can, bị cáo" tự điền theo người kháng cáo; trống thì chọn một người
    if (!(await this.docGiaTri('Kháng cáo đối với', d))) await this.chon(d, 'Kháng cáo đối với');
    await this.chon(d, 'Phạm vi kháng cáo', 'Kháng cáo toàn bộ bản án');
    // "Yêu cầu kháng cáo" là nhóm checkbox; tích "Kêu oan" thì "Nội dung kháng cáo" tự điền
    await this.tichO(d, 'Kêu oan');
    if (!(await this.docGiaTri('Nội dung kháng cáo', d))) await this.nhap(d, 'Nội dung kháng cáo', 'Kêu oan');

    await this.dinhKemTep(d, fileDinhKem);
    await this.nut(d, 'Lưu mới').click();
    await this.choThongBao(/Thêm mới kháng cáo thành công/);
    await d.waitFor({ state: 'hidden', timeout: 30_000 });
    await this.choTaiXong();
  }

  /** B2.4 · Luồng 2 + B2.5: thêm quyết định kháng nghị kèm tệp, "Lưu mới" */
  async themKhangNghi(fileDinhKem: string, donViKhangNghi: string) {
    await this.nut(await this.khoi('khang-nghi'), 'Thêm mới').click();
    const d = this.popup('Thêm mới quyết định kháng nghị');
    await d.waitFor({ timeout: 30_000 });
    await this.choTaiXong();

    const homNay = ngay(0);
    await this.ngay(d, 'Ngày tiếp nhận', homNay);
    await this.nhap(d, 'Số tiếp nhận', so8());
    await this.chon(d, 'Hình thức tiếp nhận', 'Trực tiếp tại tòa');
    await this.chon(d, 'Đơn vị kháng nghị', donViKhangNghi);
    await this.nhap(d, 'Tên người kháng nghị', hoTen());
    await this.chon(d, 'Phạm vi kháng nghị', 'Kháng nghị toàn bộ bản án');
    await this.nhap(d, 'Số kháng nghị', so8());
    await this.ngay(d, 'Ngày kháng nghị', homNay);
    await this.chon(d, 'Người bị kháng nghị');
    // Nhóm checkbox "Yêu cầu kháng nghị" → "Toàn bộ bản án"
    await this.tichO(d, 'Toàn bộ bản án');
    if (!(await this.docGiaTri('Nội dung kháng nghị', d))) await this.nhap(d, 'Nội dung kháng nghị', 'Kháng nghị toàn bộ bản án');

    await this.dinhKemTep(d, fileDinhKem);
    await this.nut(d, 'Lưu mới').click();
    await this.choThongBao(/thành công/i);
    await d.waitFor({ state: 'hidden', timeout: 30_000 });
    await this.choTaiXong();
  }

  /** B3: "Duyệt" ở cột Thao tác → popup xác nhận → "Duyệt" */
  async duyet(luong: Luong) {
    const dong = await this.dong(await this.khoi(luong), 'Chờ xử lý');
    await this.nut(dong, 'Duyệt').click();
    const xacNhan = this.page.locator('.ant-popover:visible').last();
    await this.nut(xacNhan, 'Duyệt').click();
    await this.choThongBao(/thành công/i);
    await this.choTaiXong();
  }

  /**
   * B3.1: "Lập biểu mẫu" → "Thông báo về việc kháng cáo/kháng nghị" → chọn người được thông báo
   * (ưu tiên "Bị cáo …") → mũi tên thêm vào bảng → Lưu → Ký logic.
   * @returns tên vụ án đúng như hệ thống ghi (dùng để tìm ở Tòa phúc thẩm và ở danh sách phê duyệt)
   */
  async lapThongBao(luong: Luong): Promise<string> {
    const dong = await this.dong(await this.khoi(luong), 'Lập biểu mẫu');
    await dong.getByText('Lập biểu mẫu', { exact: true }).click();
    await this.page.locator('.ant-dropdown:visible').getByText(MAU_THONG_BAO[luong], { exact: true }).click();
    const m = this.popup(MAU_THONG_BAO[luong]);
    await m.waitFor({ timeout: 30_000 });
    await this.choTaiXong();

    const tenVuAn = ((await m.innerText()).match(/Tên vụ án:\s*([^\n]+)/)?.[1] ?? '').trim();
    if (!tenVuAn) throw new Error('Không đọc được "Tên vụ án" trên biểu mẫu thông báo');

    const hang = m
      .locator('.ant-row')
      .filter({ has: this.page.getByText(/Người liên quan đến kháng (cáo|nghị)/) })
      .last();
    const cacNguoi = await this.cacLuaChonTrong(hang);
    const biCao = cacNguoi.find(n => /^Bị cáo/.test(n));
    await this.chonTrong(hang, biCao ? dungChu(biCao) : undefined);
    await hang.locator('button:has(.anticon-arrow-down)').first().click();
    await m.locator('.ant-table').filter({ hasText: 'Địa vị pháp lý' }).locator('.ant-table-row').first().waitFor({ timeout: 15_000 });

    await this.nut(m, 'Lưu').click();
    await this.choThongBao(/Lưu quyết định thành công/);
    await this.nut(m, /Ký logic/).click();
    await this.choThongBao(/Ký logic thành công/);
    await this.nut(m, 'Đóng').click();
    await m.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    return tenVuAn;
  }

  /**
   * B3.2: Quản lý án sơ thẩm › Hồ sơ chuyển đi › Xem danh sách → tích vụ án → "Chuyển hồ sơ đi"
   * (cảnh báo chưa hết hạn kháng cáo → "Vẫn chuyển"). Đã chuyển ở lượt trước thì chỉ đọc đơn vị nhận.
   * @returns tên Tòa phúc thẩm nhận hồ sơ (cột "Đơn vị nhận")
   */
  async chuyenHoSo(maVuAn: string): Promise<string> {
    await this.moMenu('Vụ việc', 'Hình sự', 'Quản lý án sơ thẩm', 'Hồ sơ chuyển đi', 'Xem danh sách');
    await this.timKiem(/Nhập mã vụ án, mã hồ sơ/, maVuAn);
    const dongVuAn = await this.dong(this.page, maVuAn);
    if (/Chưa chuyển/.test(await dongVuAn.innerText())) {
      await dongVuAn.locator('input[type=checkbox]').check();
      await this.nut(this.page, 'Chuyển hồ sơ đi').click();
      const canhBao = this.popup('Vẫn chuyển');
      if (await canhBao.waitFor({ timeout: 5_000 }).then(() => true).catch(() => false)) {
        await this.nut(canhBao, 'Vẫn chuyển').click();
      }
      await this.choThongBao(/Đã chuyển vụ án thành công/);
      await this.choTaiXong(1500);
    }

    const tieuDe = await this.page.locator('.ant-table-thead th').allInnerTexts();
    const cot = tieuDe.findIndex(t => /Đơn vị nhận/.test(t));
    const toa = (await (await this.dong(this.page, maVuAn)).locator('td').nth(cot).innerText()).replace(/\s+/g, ' ').trim();
    if (!toa) throw new Error(`Đã chuyển ${maVuAn} nhưng không đọc được "Đơn vị nhận"`);
    return toa;
  }
}
