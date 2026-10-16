import { Locator, Page, expect } from '@playwright/test';
import { BasePage, chuaChu, dungChu } from '../../base.page';
import { ngay, ngayLamViec } from '../../../utils/fake-data';
import { chuanHoa } from '../../../utils/tai-khoan';

export interface ThongTinThuLy {
  maVuAnPhucTham: string;
  soThuLy: string;
  ngayThuLy: string;
}

const batDauBang = (ten: string) => new RegExp(`^\\s*${ten.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

/**
 * Hình sự › Quản lý án phúc thẩm — phía Tòa phúc thẩm (hướng dẫn bước 4 → 5.5):
 * tiếp nhận hồ sơ → thụ lý → phân công thẩm phán → quyết định đưa vụ án ra xét xử → tạo bản án phúc thẩm.
 */
export class VuAnPhucThamPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * B4.1–4.3: Hồ sơ tiếp nhận → tìm theo tên vụ án → đối chiếu "Đủ" → Biên bản giao nhận → thêm tài liệu
   * "Vụ chuyển - Biên bản giao nhận" → "Mở vụ án phúc thẩm để thụ lý".
   * Chạy lại được: việc nào lượt trước đã làm thì bỏ qua; hồ sơ đã thụ lý thì mở thẳng vụ án phúc thẩm.
   *
   * @param tenVuAn tên lấy từ danh sách sơ thẩm (ô tìm ở đây không phân biệt hoa thường, nhận một phần tên)
   * @param maDinhDanh mã D01-… — giống nhau ở sơ thẩm và phúc thẩm, dùng để chọn đúng vụ khi trùng tên
   * @returns URL chi tiết vụ án phúc thẩm
   */
  async tiepNhanHoSo(tenVuAn: string, maDinhDanh: string, fileDinhKem: string): Promise<string> {
    await this.moMenu('Vụ việc', 'Hình sự', 'Quản lý án phúc thẩm', 'Hồ sơ tiếp nhận');
    await this.timKiem('Tìm kiếm…', tenVuAn);
    const hoSo = await this.dong(this.page, chuaChu(tenVuAn));
    if (/Đã thụ lý/.test(await hoSo.innerText())) return this.moVuAnDaThuLy(tenVuAn, maDinhDanh);
    await hoSo.locator('strong').first().click();
    await this.page.waitForURL(/ho-so-chuyen-den\/chi-tiet/, { timeout: 60_000 });
    await this.choTaiXong(2000);

    // Nút trên cùng là "Tiếp nhận hồ sơ" (chưa đủ điều kiện) hoặc "Mở vụ án phúc thẩm để thụ lý" (đã đủ):
    // chờ một trong hai hiện rồi mới quyết định
    const nutMo = this.nut(this.page, 'Mở vụ án phúc thẩm để thụ lý');
    await expect(nutMo.or(this.nut(this.page, 'Tiếp nhận hồ sơ')).first()).toBeVisible({ timeout: 30_000 });
    if (await nutMo.isVisible()) return this.moVuAnPhucTham(nutMo);

    // Đối chiếu đầu mục hồ sơ bắt buộc: bấm mọi nút "Đủ" chưa xanh lá
    const cacNutDu = this.page.locator('button').filter({ hasText: dungChu('Đủ') });
    for (let i = 0; i < (await cacNutDu.count()); i++) {
      const nutDu = cacNutDu.nth(i);
      const daXanh = await nutDu.evaluate(e => {
        const [r, g, b] = (getComputedStyle(e).backgroundColor.match(/\d+/g) ?? []).map(Number);
        return g > 120 && r < 100 && b < 120;
      });
      if (!daXanh) await nutDu.click();
    }

    // Biên bản giao nhận: nút bị khóa khi biên bản đã lập ở lượt trước → bỏ qua
    const nutBienBan = this.nut(this.page, 'Biên bản giao nhận');
    await nutBienBan.waitFor({ timeout: 30_000 });
    if (await nutBienBan.isEnabled()) {
      await nutBienBan.click();
      const bienBan = this.popup('Biên bản về việc giao, nhận hồ sơ');
      await bienBan.waitFor({ timeout: 30_000 });
      await this.choTaiXong();
      await this.chon(bienBan, 'Họ tên bên giao');
      await this.nut(bienBan, 'Lưu').click();
      const daLuu = this.popup('Đã lưu biên bản giao nhận');
      await daLuu.waitFor({ timeout: 30_000 });
      await this.nut(daLuu, 'Đóng').click();
      await this.choTaiXong();
    }

    // Tài liệu: tab "Tải file" đang mở (các tab quét/nhập tay cũng có ô loại tài liệu nhưng ẩn).
    // Neo theo nút "Chọn tệp" — KHÔNG theo chữ "Loại tài liệu": đó là placeholder, chọn loại xong là mất
    // và khung không còn khớp (lượt chạy 16/10/2026 kẹt ở nút "Thêm mới" vì vậy).
    const khung = this.page
      .locator('.ant-tabs-tabpane-active')
      .filter({ has: this.page.locator('button').filter({ hasText: dungChu('Chọn tệp') }) })
      .last();
    await khung.scrollIntoViewIfNeeded();
    await this.choBang(khung);
    if (!(await khung.locator('.ant-table-row').filter({ hasText: 'Vụ chuyển - Biên bản giao nhận' }).count())) {
      await khung.locator('input[type=file]').first().setInputFiles(fileDinhKem);
      await this.chonTrong(khung, 'Vụ chuyển - Biên bản giao nhận');
      await this.nut(khung, 'Thêm mới').click();
      await this.choThongBao(/Đã lưu tài liệu/);
    }
    return this.moVuAnPhucTham(nutMo);
  }

  private async moVuAnPhucTham(nutMo: Locator): Promise<string> {
    await nutMo.click();
    await this.page.waitForURL(/phuc-tham\/chi-tiet\?id=/, { timeout: 60_000 });
    await this.choTaiXong(2000);
    return this.page.url();
  }

  /** Hồ sơ đã thụ lý ở lượt trước → Quản lý án phúc thẩm › Vụ án phúc thẩm → mở đúng vụ (khớp mã định danh) */
  private async moVuAnDaThuLy(tenVuAn: string, maDinhDanh: string): Promise<string> {
    await this.moMenu('Vụ việc', 'Hình sự', 'Quản lý án phúc thẩm', 'Vụ án phúc thẩm');
    await this.timKiem('Nhập từ khóa tìm kiếm', tenVuAn);
    const vuAn = await this.dong(this.page, maDinhDanh || chuaChu(tenVuAn));
    await vuAn.locator('td').nth(1).locator('.ant-typography:not(.ant-typography-secondary)').first().click();
    await this.page.waitForURL(/phuc-tham\/chi-tiet\?id=/, { timeout: 60_000 });
    await this.choTaiXong(2000);
    return this.page.url();
  }

  /** B4.3 (tiếp): tab "Thụ lý" → "Thụ lý" → ngày thụ lý = hôm nay → "Xác nhận thụ lý" */
  async thuLy(): Promise<ThongTinThuLy> {
    await this.moTab('thu-ly');
    // Đầu trang: "VA26-006321 • Số thụ lý: 1 • Ngày thụ lý: 16/10/2026" (vẽ chậm vài giây sau khi tải)
    const mau = /(VA\d{2}-\d+)\s*•?\s*Số thụ lý:\s*(\S+)\s*•?\s*Ngày thụ lý:\s*(\d{2}\/\d{2}\/\d{4})/;
    const dau = this.page.locator('main').first();

    // Chờ trang vẽ xong: hoặc còn nút "Thụ lý", hoặc đầu trang đã có số thụ lý (thụ lý ở lượt trước)
    const nutThuLy = this.nut(this.page, 'Thụ lý');
    await expect(nutThuLy.or(dau.filter({ hasText: mau })).first()).toBeVisible({ timeout: 30_000 });
    if (await nutThuLy.isVisible()) {
      await nutThuLy.click();
      const m = this.popup('Cấp số thụ lý vụ án');
      await m.waitFor({ timeout: 30_000 });
      await this.choTaiXong();
      await this.ngay(m, 'Ngày thụ lý', ngay(0));
      await this.nut(m, 'Xác nhận thụ lý').click();
      await this.choThongBao(/Lưu thụ lý thành công/);
      await this.choTaiXong(2000);
    }
    await expect(dau, 'Thụ lý xong nhưng đầu trang không hiện số thụ lý').toContainText(mau, { timeout: 30_000 });
    const t = (await dau.innerText()).match(mau)!;
    return { maVuAnPhucTham: t[1], soThuLy: t[2], ngayThuLy: t[3] };
  }

  /**
   * B5.1: Phân công › Danh sách quyết định phân công › "Phân công" › "Phân công Thẩm phán" → vai trò
   * "Thẩm phán chủ tọa" → chọn người → mũi tên thêm vào bảng → Lưu → Trình ký → Gửi.
   *
   * @param uuTien họ tên ưu tiên chọn làm chủ tọa (người có tài khoản để ký quyết định đưa vụ án ra xét xử);
   *        không ai trong danh sách thì chọn ngẫu nhiên
   * @returns chủ tọa đã chọn và người ký quyết định phân công
   */
  async phanCongThamPhan(uuTien: string[]): Promise<{ chuToa: string; nguoiKy: string }> {
    await this.moTab('phan-cong');
    const muc = await this.moMuc('Danh sách quyết định phân công');
    // Lượt trước đã phân công chủ tọa → đọc lại từ bảng
    await this.choBang(muc);
    const daCo = muc.locator('.ant-table-row').filter({ hasText: 'Thẩm phán chủ tọa' }).first();
    if (await daCo.count()) {
      return { chuToa: await this.docCot(daCo, 'Người được phân công'), nguoiKy: await this.docCot(daCo, 'Người ký') };
    }
    await this.nut(muc, 'Phân công').click();
    await this.page.locator('.ant-dropdown:visible').getByText('Phân công Thẩm phán', { exact: true }).click();
    const m = this.popup('Phân công Thẩm phán');
    await m.waitFor({ timeout: 30_000 });
    await this.choTaiXong();

    await this.chon(m, 'Vai trò', /Thẩm phán chủ tọa/);
    await this.page.waitForTimeout(800);
    const cacNguoi = await this.cacLuaChon(m, 'Tên người được phân công');
    const coTaiKhoan = cacNguoi.filter(n => uuTien.some(t => chuanHoa(n).startsWith(chuanHoa(t))));
    const muon = coTaiKhoan.length ? coTaiKhoan[Math.floor(Math.random() * coTaiKhoan.length)] : undefined;
    const daChon = await this.chon(m, 'Tên người được phân công', muon ? batDauBang(muon.split(' - ')[0]) : undefined);
    const chuToa = daChon.split(' - ')[0].trim();

    await m.locator('button:has(.anticon-arrow-down)').first().click();
    await m.locator('.ant-table-row').filter({ hasText: chuToa }).first().waitFor({ timeout: 15_000 });
    await this.nut(m, 'Lưu').click();
    await this.choThongBao(/Lưu quyết định thành công/);
    const nguoiKy = await this.trinhKy(m);
    return { chuToa, nguoiKy };
  }

  /**
   * B5.3: Chuẩn bị xét xử › "Quyết định đưa vụ án ra xét xử" → người ký → "Chọn lịch xét xử" → ngày hôm nay
   * (Chủ nhật → thứ Hai) → "Cả ngày", "Xét xử công khai", địa điểm ngẫu nhiên → "Tạo mới" (trùng lịch vẫn
   * đồng ý) → Lưu → Trình ký → Gửi.
   *
   * @param nguoiKy người ký quyết định. Ô này chỉ liệt kê thẩm phán của Tòa phúc thẩm, nên dùng chủ tọa vừa
   *        phân công (người dùng chốt 16/10/2026: ký bằng tài khoản chủ tọa).
   * @param diaDiemChiTiet điền khi địa điểm là "Phòng xử lưu động" (màn đòi thêm "Địa điểm xét xử (chi tiết)")
   */
  async quyetDinhXetXu(nguoiKy: string, diaDiemChiTiet: string): Promise<{ nguoiKy: string }> {
    await this.moTab('chuan-bi-xet-xu');
    // Lượt trước đã lập quyết định → đọc người ký từ bảng "Quyết định tố tụng"
    const muc = await this.moMuc('Quyết định tố tụng');
    await this.choBang(muc);
    const daCo = muc.locator('.ant-table-row').filter({ hasText: 'Quyết định đưa vụ án ra xét xử' }).first();
    if (await daCo.count()) return { nguoiKy: await this.docCot(daCo, 'Người ký') };

    await this.nut(this.page, 'Quyết định đưa vụ án ra xét xử').click();
    const m = this.popup('Quyết định đưa vụ án ra xét xử phúc thẩm');
    await m.waitFor({ timeout: 30_000 });
    await this.choTaiXong();
    await this.chon(m, 'Người ký/người phân công', batDauBang(nguoiKy));

    await this.nut(m, 'Chọn lịch xét xử').click();
    const lich = this.popup('Chọn lịch xét xử cho vụ án');
    await lich.waitFor({ timeout: 30_000 });
    await this.choTaiXong();
    const ngayXetXu = ngayLamViec();
    const soNgay = Number(ngayXetXu.slice(0, 2));
    const mauNgay = new RegExp(`^\\s*0?${soNgay}\\s*$`);
    // Ngày thuộc tháng đang xem; thứ Hai rơi sang tháng sau thì là ô "off-range" cuối lưới
    let oNgay = lich.locator('.rbc-date-cell:not(.rbc-off-range)').filter({ hasText: mauNgay }).first();
    if (!(await oNgay.count())) oNgay = lich.locator('.rbc-date-cell.rbc-off-range').filter({ hasText: mauNgay }).last();
    await oNgay.click();

    // Ngày đã có lịch của vụ thì bấm chỉ CHỌN lịch đó, không mở form tạo
    const formLich = this.popup('Thêm lịch xét xử (mở phiên tòa)');
    if (await formLich.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false)) {
      await this.choTaiXong();
      const caNgay = formLich.locator('#caNgay');
      if (!(await caNgay.isChecked())) await caNgay.check();
      await this.chon(formLich, 'Tính chất phiên tòa', /công khai/i);
      await this.chon(formLich, 'Địa điểm xét xử');
      const chiTiet = this.oTheoNhan('Địa điểm xét xử (chi tiết)', formLich);
      if (await chiTiet.isVisible().catch(() => false)) await chiTiet.locator('input').fill(diaDiemChiTiet);
      // "Tạo mới" chính là nút lưu của form lịch
      await this.nut(formLich, 'Tạo mới').click();
      await this.dongYTatCaXacNhan();
      await formLich.waitFor({ state: 'hidden', timeout: 30_000 });
    }
    await lich.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => undefined);
    await expect(
      m.locator('.ant-table').filter({ hasText: 'Ngày mở phiên tòa' }).locator('.ant-table-row').first(),
      'Chọn lịch xong nhưng bảng "Thời gian & địa điểm phiên tòa" vẫn trống',
    ).toBeVisible({ timeout: 30_000 });

    await this.nut(m, 'Lưu').click();
    await this.choThongBao(/Lưu quyết định thành công/);
    return { nguoiKy: await this.trinhKy(m) };
  }

  /**
   * B5.5: Xét xử › Kết quả xét xử › "Bản án" → "Tạo bản án phúc thẩm" (mở form, hướng dẫn dừng ở đây).
   * @returns ngày xét xử đọc từ mục lịch "Lịch xét xử - … dd/mm/yyyy · giờ"
   */
  async moTaoBanAn(): Promise<string> {
    await this.moTab('xet-xu');
    const dauLich = this.page.locator('.ant-collapse-header').filter({ hasText: /Lịch xét xử/ }).first();
    await dauLich.waitFor({ timeout: 30_000 }).catch(() => undefined);
    const ngayXetXu = ((await dauLich.innerText().catch(() => '')).match(/\d{2}\/\d{2}\/\d{4}/) ?? [''])[0];
    const muc = await this.moMuc('Kết quả xét xử');
    const nutTao = this.nut(muc, 'Tạo bản án phúc thẩm');
    if (!(await nutTao.isVisible().catch(() => false))) {
      await muc.getByText('Bản án', { exact: true }).first().click();
      await this.choTaiXong();
    }
    // Nút còn chạy hiệu ứng nên Playwright hay báo "not stable" dù form đã mở → kiểm bằng form
    await nutTao.click({ timeout: 10_000 }).catch(() => undefined);
    await expect(this.popup('Thêm bản án phúc thẩm'), 'Không mở được form "Thêm bản án phúc thẩm"').toBeVisible({
      timeout: 30_000,
    });
    return ngayXetXu;
  }

  /** "Trình ký" → popup "Nhập thông tin trình duyệt ký" → "Gửi" → đóng biểu mẫu. Trả về người ký văn bản. */
  private async trinhKy(bieuMau: Locator): Promise<string> {
    await this.nut(bieuMau, 'Trình ký').click();
    const tk = this.popup('Nhập thông tin trình duyệt ký');
    await tk.waitFor({ timeout: 30_000 });
    const nguoiKy = await this.docGiaTri('Người ký văn bản', tk);
    await this.nut(tk, 'Gửi').click();
    await this.choThongBao(/Đã trình ký/);
    await this.choTaiXong();
    await this.nut(bieuMau, 'Đóng').click().catch(() => undefined);
    await bieuMau.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    return nguoiKy;
  }
}
