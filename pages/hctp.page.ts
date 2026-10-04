import { Locator, Page, expect } from '@playwright/test';
import { choHetSpin, chonSelect, chonSelectNeuCo, go, hienTrong, nghi, toastDaHien } from '../common/antd';
import { moMenu } from '../common/menu';

/**
 * Các màn HCTP sau khi đơn đã thụ lý mới (qla-webapp):
 * - Phân công thẩm phán: pages/QuanLyDon/PhanCongThamPhan (Trưởng phòng)
 * - Tờ trình / Thông báo phân công: Danh sách đơn → "Lưu số văn bản và in báo cáo"
 *   → LuuSoVanBanInBaoCaoDonModal_V2 ("Lưu số văn bản & In báo cáo")
 * - Phê duyệt đề xuất: pages/VuAn/CongTacLanhDao/PheDuyetDeXuat (+ XinYKienPageV2)
 * - Danh sách văn bản: pages/QuanLyDon/DanhSachVanBan
 */

/**
 * Khoá để bước duyệt mở đúng bản ghi: API trình duyệt trả khác nhau tuỳ đường
 * - /trinh-duyet-nhieu → KetQuaTrinhDuyetVanBanNhieuVO { dsIdVanBanDaTrinh } (id VĂN BẢN)
 * - /trinh-duyet-nguoi-duyet → YeuCauPheDuyet { id } (id YÊU CẦU)
 * Bước duyệt khớp bản ghi theo id yêu cầu HOẶC idDuLieu (= id văn bản).
 */
const layKhoaPheDuyet = (kq: any): string | undefined => {
  const d = kq?.data;
  const item = Array.isArray(d) ? d[0] : d;
  return item?.dsIdVanBanDaTrinh?.[0] || item?.id || item?.idYeuCauPheDuyet;
};

const LY_DO_PHAN_CONG = 'Phân công theo chuyên môn giải quyết án hình sự';

/** Dòng bảng chứa nội dung (mã đơn, số thụ lý...) */
const dongChua = (page: Page, noiDung: string) => page.locator('.ant-table-row').filter({ hasText: noiDung });

/** Nút xác nhận trong Modal.confirm đang mở */
async function xacNhan(page: Page, ten: RegExp) {
  const hop = page.locator('.ant-modal-confirm, .ant-modal').filter({ has: page.getByRole('button', { name: ten }) }).last();
  await expect(hop).toBeVisible({ timeout: 15_000 });
  await nghi(page, 300, 600);
  await hop.getByRole('button', { name: ten }).last().click();
}

export class HctpPage {
  constructor(readonly page: Page) {}

  /** Tên "Loại văn bản" THỰC SỰ đã chọn ở lần lập văn bản gần nhất — tên này khác nhau theo môi trường */
  loaiVanBanDaDung = '';

  // ───────────── Bước 2a: Trưởng phòng phân công thẩm phán dự kiến (chỉ định, chỉ đơn của luồng) ─────────────

  /**
   * Tab "DS chưa phân công chỉ định": tìm theo Số thụ lý, tick đúng đơn, chọn thẩm phán + lý do → "Phân công chỉ định".
   * Không dùng "Phân công ngẫu nhiên" vì nó phân công MỌI đơn đang lọc trên dev.
   * Không tick "Có lý do đặc biệt" (sẽ bỏ qua Tờ trình).
   */
  async phanCongThamPhanChiDinh(soThuLy: string, maDon: string) {
    const { page } = this;
    await moMenu(page, ['Quản lý đơn', 'Phân công thẩm phán']);
    await page.getByRole('tab', { name: /DS chưa phân công chỉ định/ }).click();
    await nghi(page, 500, 1000);

    const bang = await this.timTheoSoThuLy(soThuLy);
    const dong = bang.first();
    await dong.locator('.ant-checkbox-input').first().check();
    await nghi(page);

    const thamPhan = await chonSelect(page, dong.getByRole('combobox').first());
    await go(dong.getByPlaceholder('Nhập lý do phân công'), LY_DO_PHAN_CONG);

    await page.getByRole('button', { name: /Phân công chỉ định \(1 đơn\)/ }).click();
    await xacNhan(page, /^Xác nhận$/);
    // Thẩm phán đang nghỉ → hỏi thêm "Vẫn chỉ định"
    const vanChiDinh = page.getByRole('button', { name: 'Vẫn chỉ định' });
    if (await hienTrong(vanChiDinh, 3_000)) await vanChiDinh.click();
    await toastDaHien(page, 'Đã phân công chỉ định', 60_000, /thất bại|Không có đơn/);
    return { thamPhan, maDon };
  }

  /**
   * Tab "DS chưa phân công ngẫu nhiên" → "Phân công ngẫu nhiên" (Luồng nhập data.txt, Bước 3).
   *
   * NGUY HIỂM: nút này gọi API phanCongDonGdtTuDong với BỘ LỌC ĐANG ÁP DỤNG, tức phân công MỌI đơn
   * đang có trên màn chứ không theo dòng được tick. Vì vậy chỉ bấm khi đã lọc theo Số thụ lý và
   * danh sách còn đúng 1 đơn; nhiều hơn thì dừng, không bấm (tránh phân công nhầm đơn của người khác).
   */
  async phanCongThamPhanNgauNhien(soThuLy: string) {
    const { page } = this;
    await moMenu(page, ['Quản lý đơn', 'Phân công thẩm phán']);
    await page.getByRole('tab', { name: /DS chưa phân công ngẫu nhiên/ }).click();
    await nghi(page, 500, 1000);

    // Đơn có thể đã được phân công ở lượt chạy trước bị dừng giữa chừng (sổ cái chưa kịp ghi) →
    // không còn ở tab "chưa phân công". Kiểm tab "đã phân công" trước khi kết luận là lỗi.
    if (!(await this.locTheoSoThuLy(soThuLy))) {
      // Màn này KHÔNG có tab tên "đã phân công". Ba tab thật (PhanCongThamPhan/index.tsx TAB_TITLE):
      // "DS chưa phân công ngẫu nhiên", "DS chưa phân công chỉ định", "Quản lý kết quả phân công".
      // Đơn đã phân công nằm ở tab kết quả.
      const tabKetQua = page.getByRole('tab').filter({ hasText: /Quản lý kết quả phân công/ }).first();
      if (await tabKetQua.count()) {
        await tabKetQua.click();
        await choHetSpin(page);
        await nghi(page, 1000, 1600);
        if (await this.locTheoSoThuLy(soThuLy)) return soThuLy; // đã phân công từ trước → coi như xong
      }
      throw new Error(`Không thấy đơn có số thụ lý ${soThuLy} ở cả "DS chưa phân công ngẫu nhiên" lẫn "Quản lý kết quả phân công"`);
    }
    // Chờ bảng nạp xong kết quả lọc rồi mới kiểm: đếm ngay sau khi bấm Tìm kiếm là đếm nhầm dữ liệu cũ
    await choHetSpin(page);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await nghi(page, 1500, 2500);
    const dsDong = await page.locator('.ant-table-row:visible').allInnerTexts();
    const khac = dsDong.filter(t => !t.includes(soThuLy));
    if (dsDong.length !== 1 || khac.length) {
      throw new Error(
        `Bộ lọc Số thụ lý ${soThuLy} còn ${dsDong.length} đơn (${khac.length} đơn khác) — không bấm "Phân công ngẫu nhiên" ` +
          'vì nút này phân công mọi đơn đang có trên màn',
      );
    }

    await page.getByRole('button', { name: /^Phân công ngẫu nhiên$/ }).click();
    await xacNhan(page, /^Xác nhận$/);
    await toastDaHien(page, /thành công/i, 90_000, /thất bại|Không có đơn|lỗi/i);
    await nghi(page, 1500, 2500);
    return soThuLy;
  }

  /** Mở "Tìm kiếm nâng cao", lọc theo Số thụ lý; trả về các dòng khớp */
  private async timTheoSoThuLy(soThuLy: string) {
    const { page } = this;
    const dong = dongChua(page, soThuLy);
    if (!(await this.locTheoSoThuLy(soThuLy))) {
      await expect(dong.first(), `Không thấy đơn có số thụ lý ${soThuLy} trong danh sách chưa phân công`).toBeVisible({ timeout: 60_000 });
    }
    return dong;
  }

  /** Lọc theo Số thụ lý trên tab đang mở; trả về có tìm thấy dòng hay không (không ném lỗi) */
  private async locTheoSoThuLy(soThuLy: string): Promise<boolean> {
    const { page } = this;
    const moRong = page.getByRole('button', { name: /Tìm kiếm nâng cao/ });
    if (await moRong.isVisible().catch(() => false)) await moRong.click();
    await go(page.getByLabel('Số thụ lý', { exact: true }), soThuLy);
    await page.getByRole('button', { name: /Tìm kiếm$/ }).click();
    await choHetSpin(page);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    return dongChua(page, soThuLy)
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(
        () => true,
        () => false,
      );
  }

  // ───────────── Bước 2b / 3b: Cán bộ lập văn bản từ Danh sách đơn (Tờ trình MS_02, Thông báo MS_03) ─────────────

  /**
   * Danh sách đơn → lọc "Loại văn bản" → tick đơn → "Lưu số văn bản và in báo cáo"
   * → chọn Người duyệt / Người ký → "Lưu văn bản" → "Trình ký".
   */
  /**
   * ⚠ TÊN LOẠI VĂN BẢN KHÁC NHAU GIỮA CÁC MÔI TRƯỜNG.
   *
   * Đo pre-prod 04/10/2026: ô "Loại văn bản" ở Danh sách đơn có ĐÚNG 9 mục, và KHÔNG có
   * "Tờ trình phân công thẩm phán":
   *
   *   Giấy xác nhận · Giấy xác nhận cơ quan chuyển đơn · Công văn chuyển nội bộ ·
   *   Công văn chuyển tòa khác · Công văn chuyển ngoài tòa án · Trả lại đơn ·
   *   Thông báo phân công TP · Yêu cầu bổ sung · Tờ trình khác
   *
   * Gần nhất với "tờ trình phân công" (BƯỚC 4 của đặc tả) là **"Tờ trình khác"**; còn
   * "Thông báo phân công TP" là văn bản của BƯỚC 5. Nên nhận một DANH SÁCH tên theo thứ tự ưu tiên
   * và dùng tên ĐẦU TIÊN mà danh mục thật có — không gieo cứng một tên rồi đỏ ở môi trường khác.
   *
   * `QLA_LOAI_VB_TO_TRINH` cho phép đổi mà không sửa mã (vd. khi môi trường bổ sung tên đúng).
   */
  async lapTamTrinhPhanCong(maDon: string, nguoiDuyet: string, nguoiKy: string) {
    const uuTien = [
      ...(process.env.QLA_LOAI_VB_TO_TRINH ? [process.env.QLA_LOAI_VB_TO_TRINH] : []),
      'Tờ trình phân công thẩm phán',
      'Tờ trình khác',
    ];
    return this.lapVanBanTuDanhSachDon(maDon, uuTien, 'Tờ trình phân công', nguoiDuyet, nguoiKy, {
      xemBieuMau: true,
    });
  }

  /**
   * Lập một văn bản cho đơn ngay từ Danh sách đơn (Luồng nhập data.txt, Bước 4 và Bước 5):
   * lọc "Loại văn bản" → tick đơn → "Lưu số văn bản và in báo cáo" → Người duyệt / Người ký
   * → "Lưu văn bản" → "Trình ký". Trả về id yêu cầu phê duyệt.
   *
   * `loaiVanBan`  : nhãn trong ô lọc "Loại văn bản" (vd. /Tờ trình phân công thẩm phán/i)
   * `tenVanBan`   : tên hiển thị ở Danh sách văn bản, dùng khi phải trình lại bản nháp
   */
  async lapVanBanTuDanhSachDon(
    maDon: string,
    loaiVanBan: RegExp | string[],
    tenVanBan: string,
    nguoiDuyet: string,
    nguoiKy: string,
    { xemBieuMau = false }: { xemBieuMau?: boolean } = {},
  ) {
    // Ngay sau khi tờ trình vừa được duyệt, lưu Thông báo có lúc trả "Không có văn bản nào có thay đổi để lưu"
    // mà server không ghi gì (đã gặp trên STG, DB không có MS_03) → kiểm tra bản nháp thật sự tồn tại,
    // chưa có thì chờ rồi lập lại
    for (let lan = 1; ; lan++) {
      const kq = await this.lapVanBanMotLan(maDon, loaiVanBan, tenVanBan, nguoiDuyet, nguoiKy, { xemBieuMau });
      if (kq.ketQua === 'da-trinh') return kq.idYeuCau;
      if (await this.coBanNhap(maDon, tenVanBan)) return this.trinhKyBanNhap(maDon, tenVanBan, nguoiDuyet, nguoiKy);
      if (lan >= 3) throw new Error(`Đã bấm "Lưu văn bản" ${lan} lần nhưng không có bản nháp "${tenVanBan}" của đơn ${maDon} — server không ghi văn bản`);
      await nghi(this.page, 30_000, 45_000);
    }
  }

  /** Một lượt lập văn bản: có bản nháp sẵn thì báo 'nhap', không thì lọc → tick đơn → lưu (→ trình nếu popup cho) */
  private async lapVanBanMotLan(
    maDon: string,
    loaiVanBan: RegExp | string[],
    tenVanBan: string,
    nguoiDuyet: string,
    nguoiKy: string,
    { xemBieuMau = false }: { xemBieuMau?: boolean } = {},
  ): Promise<{ ketQua: 'nhap' | 'da-trinh'; idYeuCau?: string }> {
    const { page } = this;
    // Chạy lại sau khi đã lưu văn bản (lần trước lỗi ở bước trình): đơn không còn trong bộ lọc loại
    // văn bản đó nữa → trình bản nháp có sẵn
    if (await this.coBanNhap(maDon, tenVanBan)) return { ketQua: 'nhap' };
    await moMenu(page, ['Quản lý đơn', 'Danh sách đơn']);
    // Select "Loại văn bản :" trên thanh công cụ bảng; tìm theo nhãn (placeholder mất sau khi chọn)
    const oLoai = page.getByRole('combobox', { name: /^Loại văn bản/ }).first();
    /**
     * Mảng tên = THỨ TỰ ƯU TIÊN. Dùng tên ĐẦU TIÊN mà danh mục thật có, vì tên loại văn bản khác
     * nhau giữa các môi trường (xem `lapTamTrinhPhanCong`). Hết danh sách mà không tên nào khớp thì
     * ném lỗi của lần thử CUỐI — lỗi đó đã liệt kê đủ các mục danh mục đang có.
     */
    if (Array.isArray(loaiVanBan)) {
      let loiCuoi: Error | undefined;
      let daChon = '';
      for (const ten of loaiVanBan) {
        try {
          await chonSelect(page, oLoai, ten);
          daChon = ten;
          break;
        } catch (e) {
          if (!/Danh mục không có mục/.test((e as Error).message)) throw e;
          loiCuoi = e as Error;
        }
      }
      if (!daChon) throw loiCuoi ?? new Error('Không chọn được Loại văn bản nào trong danh sách ưu tiên');
      this.loaiVanBanDaDung = daChon;
    } else {
      await chonSelect(page, oLoai, loaiVanBan);
      this.loaiVanBanDaDung = loaiVanBan.source;
    }
    await go(page.getByLabel('Từ khóa tìm kiếm chung'), maDon);
    await choHetSpin(page);
    await page.getByRole('button', { name: /Tìm kiếm$/ }).click();
    const dong = dongChua(page, `Mã đơn: ${maDon}`);
    await expect(dong.first(), `Không thấy đơn ${maDon} khi lọc loại văn bản ${loaiVanBan}`).toBeVisible({ timeout: 60_000 });
    await dong.first().locator('.ant-checkbox-input').first().check();
    await page.getByRole('button', { name: /Lưu số văn bản và in báo cáo/ }).click();
    return this.luuVaTrinhKy(nguoiDuyet, nguoiKy, { xemBieuMau });
  }

  /** Popup "Lưu số văn bản & In báo cáo": Người duyệt / Người ký → Lưu văn bản → Trình ký */
  async luuVaTrinhKy(nguoiDuyet: string, nguoiKy: string, { xemBieuMau = false }: { xemBieuMau?: boolean } = {}) {
    const { page } = this;
    const m = page.locator('.luu-so-van-ban-modal, .ant-modal').filter({ hasText: 'Lưu số văn bản & In báo cáo' }).last();
    await expect(m).toBeVisible({ timeout: 60_000 });
    await nghi(page, 800, 1200);
    await this.chonNeuTrong(m.locator('#nguoiDuyet'), nguoiDuyet);
    await this.chonNeuTrong(m.locator('#nguoiKy'), nguoiKy);

    // Dev hay nghẽn: lưu văn bản trả "Kết nối không ổn định, vui lòng thử lại sau" → bấm lưu lại
    const hopDaLuu = page.locator('.ant-modal').filter({ hasText: /Không có văn bản nào có thay đổi để lưu/ }).last();
    for (let lan = 0; ; lan++) {
      await m.getByRole('button', { name: /Lưu văn bản/ }).click();
      // Lần lưu trước có thể đã ghi xong ở server dù FE báo lỗi kết nối → không còn gì để lưu, coi như xong
      if (await hienTrong(hopDaLuu, 5_000)) {
        await hopDaLuu.getByRole('button', { name: /^OK$/ }).click();
        break;
      }
      // Hộp "Xác nhận": Bạn có chắc chắn muốn lưu văn bản cho N đơn đã chọn? → Đồng ý
      await xacNhan(page, /^Đồng ý$/);
      try {
        await toastDaHien(page, 'Lưu văn bản thành công', 90_000, /thất bại|Vui lòng|Không thể|không ổn định/);
        break;
      } catch (loi) {
        if (lan >= 2 || !/không ổn định/i.test(String(loi))) throw loi;
        await nghi(page, 5_000, 8_000);
      }
    }

    if (xemBieuMau) await this.xemBieuMau(m);

    // Tờ trình: nút "Trình ký" hiện ngay trong popup. Thông báo tạo từ tờ trình: popup tự đóng sau khi lưu
    // → văn bản nằm ở tab "Nháp" của Danh sách văn bản, trình bằng icon "send" (xem trinhKyBanNhap).
    const trinhKy = m.getByRole('button', { name: /Trình ký$/ });
    if (!(await hienTrong(trinhKy, 5_000))) return { ketQua: 'nhap' as const };
    const choApi = page
      .waitForResponse(r => r.request().method() === 'POST' && r.url().includes('/phe-duyet-de-xuat/trinh-duyet'), { timeout: 90_000 })
      .catch(() => null);
    await trinhKy.click();
    await this.choTrinhDuyetThanhCong();
    const res = await choApi;
    return { ketQua: 'da-trinh' as const, idYeuCau: res ? layKhoaPheDuyet(await res.json().catch(() => null)) : undefined };
  }

  /**
   * Nút "Xem biểu mẫu" ở chân popup mở POPUP xem trước ("Biểu mẫu <tên>") – file văn bản đã được sinh sẵn
   * lúc "Lưu văn bản", không cần bước này để tạo file. Mở rồi đóng cho đúng kịch bản 1.3.
   */
  private async xemBieuMau(m: Locator) {
    const { page } = this;
    await m.getByRole('button', { name: /Xem biểu mẫu$/ }).last().click();
    const xem = page.locator('.ant-modal').filter({ hasText: /^Biểu mẫu/ }).last();
    await expect(xem, 'Không mở được popup xem biểu mẫu').toBeVisible({ timeout: 60_000 });
    await nghi(page, 1500, 2500);
    await xem.locator('.ant-modal-close').first().click();
    await expect(xem).toBeHidden({ timeout: 15_000 });
  }

  private async choTrinhDuyetThanhCong() {
    const { page } = this;
    const thanhCong = page.locator('.ant-modal').filter({ hasText: 'Trình duyệt thành công' });
    await expect(thanhCong, 'Không thấy thông báo "Trình duyệt thành công"').toBeVisible({ timeout: 60_000 });
    await thanhCong.getByRole('button', { name: 'Đóng' }).click();
  }

  /** Danh sách văn bản → tab "Nháp" → lọc Mã đơn → dòng văn bản → icon "send" → Người duyệt/Người ký → "Gửi" */
  async trinhKyBanNhap(maDon: string, tenVanBan: string, nguoiDuyet: string, nguoiKy: string) {
    const { page } = this;
    await moMenu(page, ['Quản lý đơn', 'Danh sách văn bản']);
    await page.getByRole('tab', { name: /^Nháp/ }).click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await this.locMaDon(maDon);
    const dong = page.locator('.ant-table-row').filter({ hasText: tenVanBan }).first();
    /**
     * BẢN FE MỚI (đo 02/10/2026): văn bản vừa tạo được CẤP SỐ VÀ KÝ NGAY, nên tab "Nháp" rỗng còn
     * "Đã ký"/"Đã ban hành" có dòng của nó — không còn bản nháp nào để trình ký. Trước khi báo lỗi,
     * kiểm các tab kia: thấy đúng tên văn bản của đơn này thì coi như bước trình ký đã xong.
     */
    if (!(await hienTrong(dong, 15_000))) {
      for (const tenTab of [/^Đã ký/, /^Đã ban hành/, /^Chờ ký/, /^Chờ duyệt/]) {
        const tab = page.getByRole('tab', { name: tenTab }).first();
        if (!(await hienTrong(tab, 3_000))) continue;
        await tab.click().catch(() => undefined);
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
        await nghi(page, 1000, 1500);
        const dongKhac = page.locator('.ant-table-row').filter({ hasText: tenVanBan }).first();
        if (await hienTrong(dongKhac, 5_000)) {
          const chu = (await dongKhac.innerText()).replace(/\s+/g, ' ').trim();
          console.log(
            `    · "${tenVanBan}" của đơn ${maDon} KHÔNG ở tab Nháp mà ở tab ` +
              `"${(await tab.innerText()).replace(/\s+/g, ' ').trim()}" → bản này cấp số/ký ngay khi tạo, ` +
              `không cần trình ký. Dòng: ${chu.slice(0, 160)}`,
          );
          return undefined;
        }
      }
    }
    await expect(dong, `Không thấy bản nháp "${tenVanBan}" của đơn ${maDon}`).toBeVisible({ timeout: 30_000 });
    await dong.locator('button').filter({ has: page.locator('[aria-label="send"]') }).first().click();

    const m = page.locator('.ant-modal:visible').filter({ has: page.getByRole('button', { name: /^Gửi$/ }) }).last();
    await expect(m).toBeVisible({ timeout: 60_000 });
    await nghi(page, 800, 1200);
    await this.chonNeuTrong(m.locator('#nguoiDuyet'), nguoiDuyet);
    await this.chonNeuTrong(m.locator('#nguoiKy'), nguoiKy);
    // Đường này không hiện hộp "Trình duyệt thành công" → xác nhận qua API trình duyệt
    const choApi = page.waitForResponse(r => r.url().includes('/phe-duyet-de-xuat/trinh-duyet') && r.request().method() === 'POST', { timeout: 60_000 });
    await m.getByRole('button', { name: /^Gửi$/ }).click();
    const kq = await (await choApi).json();
    expect(kq.success, `Trình duyệt thất bại: ${kq.message}`).toBeTruthy();
    const hop = page.locator('.ant-modal').filter({ hasText: 'Trình duyệt thành công' });
    if (await hienTrong(hop, 3_000)) await hop.getByRole('button', { name: 'Đóng' }).click();
    return layKhoaPheDuyet(kq);
  }

  private async coBanNhap(maDon: string, tenVanBan: string) {
    const { page } = this;
    await moMenu(page, ['Quản lý đơn', 'Danh sách văn bản']);
    await page.getByRole('tab', { name: /^Nháp/ }).click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    // Đơn chưa có văn bản nào thì bộ lọc không có mã đơn này → chắc chắn chưa có bản nháp
    if (!(await this.locMaDon(maDon))) return false;
    return hienTrong(page.locator('.ant-table-row').filter({ hasText: tenVanBan }).first(), 5_000);
  }

  /** Select "Mã đơn: tất cả" trên thanh công cụ Danh sách văn bản (lấy id trước khi chọn vì nhãn đổi sau khi chọn) */
  private async locMaDon(maDon: string) {
    const { page } = this;
    // Đã lọc sẵn (ô hiển thị đúng mã đơn) → giữ nguyên
    const daLoc = page.locator('.ant-select-selection-item').filter({ hasText: new RegExp(`^${maDon}$`) }).first();
    if (await daLoc.isVisible().catch(() => false)) return true;
    // Thanh công cụ bảng: select [Người tạo] [Mã đơn] (+ [10 / trang] ở phân trang, ngoài thanh công cụ).
    // Id rc_select_N đổi mỗi lần render và nhãn "Mã đơn: tất cả" mất sau khi chọn → lấy theo vị trí
    const thanhLoc = page.locator('.ant-pro-table-list-toolbar-container').first();
    const co = await chonSelectNeuCo(page, thanhLoc.locator('.ant-select').nth(1).locator('input'), maDon);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    return co;
  }

  // ───────────── Bước 3d: Cán bộ tạo Thông báo phân công TP từ tờ trình đã ban hành ─────────────

  /**
   * Danh sách văn bản → tab "Đã ban hành" → lọc "Mã đơn" → dòng Tờ trình phân công → icon "Tạo thông báo phân công"
   * → popup "Lưu số văn bản & In báo cáo" (Loại văn bản = Thông báo phân công TP) → Lưu văn bản → Trình ký.
   */
  async taoThongBaoPhanCong(maDon: string, nguoiDuyet: string, nguoiKy: string) {
    const { page } = this;
    // Chạy lại sau khi đã lưu nháp (lần trước lỗi ở bước trình) → trình bản nháp có sẵn, không tạo trùng
    if (await this.coBanNhap(maDon, 'Thông báo phân công')) {
      return { ketQua: 'vua-trinh' as const, idYeuCau: await this.trinhKyBanNhap(maDon, 'Thông báo phân công', nguoiDuyet, nguoiKy) };
    }
    // Đã trình từ lần chạy trước → không tạo lại
    for (const tab of [/^Chờ duyệt/, /^Chờ ký/]) {
      await page.getByRole('tab', { name: tab }).click();
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      if (await hienTrong(page.locator('.ant-table-row').filter({ hasText: 'Thông báo phân công' }).first(), 8_000)) {
        return { ketQua: 'da-trinh-truoc' as const };
      }
    }
    await moMenu(page, ['Quản lý đơn', 'Danh sách văn bản']);
    await page.getByRole('tab', { name: /^Đã ban hành/ }).click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    await this.locMaDon(maDon);

    const dong = page.locator('.ant-table-row').filter({ hasText: 'Tờ trình phân công' }).first();
    await expect(dong, `Không thấy Tờ trình phân công đã ban hành của đơn ${maDon}`).toBeVisible({ timeout: 60_000 });
    await dong.locator('button').filter({ has: page.locator('[aria-label="notification"]') }).first().click();
    const kq = await this.luuVaTrinhKy(nguoiDuyet, nguoiKy);
    const idYeuCau =
      kq.ketQua === 'nhap' ? await this.trinhKyBanNhap(maDon, 'Thông báo phân công', nguoiDuyet, nguoiKy) : kq.idYeuCau;
    return { ketQua: 'vua-trinh' as const, idYeuCau };
  }

  private async chonNeuTrong(o: Locator, tuKhoa: string) {
    const khung = o.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
    if ((await khung.count()) === 0) return; // ẩn (vd. tự điền người duyệt)
    const daChon = await khung.locator('.ant-select-selection-item').first().innerText().catch(() => '');
    if (daChon.includes(tuKhoa)) return;
    if (await khung.evaluate(e => e.classList.contains('ant-select-disabled'))) return;
    // Không gõ tìm: FE (LuuSoVanBanComponents_V2) lấy nhãn đã tô sáng từ khoá (React element) làm tenNguoiKy
    // → API luu-van-ban-chua-cap-so trả 400 "Cannot deserialize ... String from Object"
    await chonSelect(this.page, o, tuKhoa, { goDeLoc: false });
  }
}
