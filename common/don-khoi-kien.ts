/**
 * Thao tác dùng chung của màn "Thêm mới đơn khởi kiện và yêu cầu".
 *
 * Tách ra từ tests/don-khoi-kien-dan-su-26-09-2026.spec.ts (30/09/2026) để luồng Kinh doanh thương
 * mại dùng lại, không chép code. Không thêm logic mới ở đây.
 */
import { Locator, Page, expect } from '@playwright/test';
import { chonNgay, chonSelect, chonSelectTheoThuTu, choHetSpin, go, hienTrong, nghi, xacNhanLuu } from './antd';
import { giaTri } from './cau-hinh-luong';
import { dienFormNguoi } from './form-nguoi';

export const khungSelectCua = (o: import('@playwright/test').Locator) =>
  o.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');

/**
 * Chọn "Quan hệ pháp luật (Thống kê)" bằng TÊN ĐÚNG TRONG DANH MỤC — không dò từ khoá.
 *
 * Đối chiếu FE 30/09/2026:
 *   · ô là `<TreeSelect showSearch treeNodeFilterProp="title">`
 *     (`QuanLyDon/DonKhoiKienYeuCau/ThemMoi/steps/Step1ThongTinDon/ThongTinTiepNhanSection.tsx:212`)
 *     → gõ chữ chỉ LỌC THEO TITLE **trên các nút ĐÃ NẠP**, không gọi máy chủ tìm kiếm.
 *   · cây nạp lười theo `maGoc = tinhMaQhplThongKeGoc(loaiDon, phanLoai)`; với KDTM + Đơn khởi kiện
 *     thì `maGoc = QHPL_TC_KDTM` và 29 mục con đều là LÁ, nạp hết ngay từ đầu
 *     (`qla/db-structure/ddl-qhpl.sql`) → gõ đúng tên là ra.
 *   · `handleSelect` từ chối nút còn cấp con ("Nhóm danh mục này còn cấp con") → phải chọn đúng lá.
 *
 * Vì thế dò từ khoá kiểu "thử lần lượt tới khi ra mục" vừa chậm vừa sai: tên trong danh mục ghi
 * "Mua bán hàng hoá" (hoá) chứ không phải "mua bán hàng hóa" (hóa), và không có mục nào tên
 * "Tranh chấp hợp đồng mua bán hàng hóa". Lệch một dấu là danh sách rỗng, treo ở đây cả phút.
 */
export async function chonQhplThongKe(
  page: import('@playwright/test').Page,
  o: import('@playwright/test').Locator,
  /** TÊN LÁ ĐẦY ĐỦ — dùng để KHỚP chính xác, vd. "Tranh chấp hợp đồng vay tài sản" */
  ten: string,
  /**
   * CHUỖI LỌC gõ vào ô — mặc định bằng chính `ten`.
   *
   * Cây danh mục ẢO HOÁ và chỉ lọc trên các nút ĐÃ NẠP: gõ trọn tên một lá nằm sâu hai cấp
   * (QHPL_TC_DS → .003 → .003.005) thì cây trả về RỖNG, còn gõ vài chữ ("vay tài sản") lại ra.
   * Lá của KDTM nằm ngay cấp 1 nên gõ trọn tên vẫn ra — bẫy này tới luồng dân sự mới lộ (03/10/2026).
   */
  loc = ten,
  /**
   * TÊN NHÁNH CHA của lá (nếu lá nằm sâu hơn cấp 1).
   *
   * Cây chỉ lọc trên NÚT ĐÃ NẠP, mà lúc mở ra mới có cấp 1 → lá cấp 2 thì gõ gì cũng rỗng. Lá của
   * KDTM nằm ngay cấp 1 nên trước giờ không lộ; lá dân sự "Tranh chấp hợp đồng vay tài sản" nằm dưới
   * "Tranh chấp về giao dịch dân sự, hợp đồng dân sự" (đo 03/10/2026). Có tên cha thì MỞ NHÁNH rồi
   * bấm lá, không lọc.
   */
  cha?: string,
): Promise<string> {
  const khung = khungSelectCua(o);
  const daChon = async () =>
    (await khung.locator('.ant-select-selection-item').first().innerText().catch(() => '')).trim();
  const thoat = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (let lan = 0; lan < 3; lan++) {
    if ((await daChon()) === ten) return ten;

    await khung.click();
    if (cha) {
      // Mở nhánh cha: bấm mũi tên (switcher) của đúng nút có tên cha, rồi chờ lá hiện ra
      const nutCha = page
        .locator('.ant-select-dropdown:visible .ant-select-tree-treenode')
        .filter({ has: page.locator('.ant-select-tree-title', { hasText: cha }) })
        .first();
      if (await hienTrong(nutCha, 8_000)) {
        const switcher = nutCha.locator('.ant-select-tree-switcher').first();
        const daMo = /ant-select-tree-switcher_open/.test((await switcher.getAttribute('class')) || '');
        if (!daMo) {
          await switcher.click().catch(() => undefined);
          await nghi(page, 800, 1200);
        }
      }
    } else {
      await o.fill(loc);
      await nghi(page, 600, 1000);
    }

    const muc = page
      .locator('.ant-select-dropdown:visible .ant-select-tree-title')
      .filter({ hasText: new RegExp(`^${thoat(ten)}$`) })
      .first();

    if (await hienTrong(muc, 8_000)) {
      await muc.click();
      await nghi(page, 500, 900);
      if ((await daChon()) === ten) return ten;
      continue;
    }

    // Không thấy: liệt kê đúng những gì danh mục đang có để sửa dữ liệu gieo, không dò mò tiếp
    const dsHien = await page
      .locator('.ant-select-dropdown:visible .ant-select-tree-title')
      .allInnerTexts()
      .catch(() => [] as string[]);
    await page.keyboard.press('Escape');
    if (lan === 2) {
      throw new Error(
        `Danh mục "Quan hệ pháp luật (Thống kê)" không có mục tên đúng "${ten}". ` +
          `(lọc bằng "${loc}") Đang hiện: ${dsHien.length ? dsHien.slice(0, 10).join(' | ') : '(rỗng)'}. ` +
          `Rỗng thường là do CHUỖI LỌC quá dài — cây ảo hoá chỉ lọc trên nút đã nạp, hãy gieo ` +
          `"quanHePhapLuatThongKe" ngắn hơn (vd. "vay tài sản"). ` +
          `Tra tên đúng trong qla/db-structure/ddl-qhpl.sql theo mã gốc của loại đơn ` +
          `(KDTM + Đơn khởi kiện → QHPL_TC_KDTM).`,
      );
    }
  }
  throw new Error(`Không chọn được "Quan hệ pháp luật (Thống kê)" = "${ten}"`);
}

async function chonTuCachThamGia(
  page: import('@playwright/test').Page,
  form: import('@playwright/test').Locator,
  tuCach: string,
) {
  const o = form
    .locator('.ant-form-item')
    .filter({ has: page.locator('label', { hasText: 'Tư cách tham gia tố tụng' }) })
    .first()
    .locator('[role="combobox"]')
    .first();
  await expect(o, 'Không thấy ô "Tư cách tham gia tố tụng"').toBeVisible({ timeout: 30_000 });

  for (let lan = 0; lan < 3; lan++) {
    if ((await o.getAttribute('aria-expanded')) !== 'true') await o.click();
    const bang = form.locator('[role="listbox"]').first();
    await expect(bang, 'Bấm ô tư cách nhưng danh sách không mở').toBeVisible({ timeout: 10_000 });
    const muc = bang.getByText(tuCach, { exact: true }).first();
    if (await hienTrong(muc, 10_000)) {
      await muc.click();
      await nghi(page, 600, 1000);
      // Danh sách cho chọn nhiều nên vẫn mở sau khi chọn → đóng lại để không che các ô phía dưới
      if ((await o.getAttribute('aria-expanded')) === 'true') await o.click();
      await expect(o.getByText(tuCach, { exact: true }).first(), `Chọn tư cách "${tuCach}" không ăn`).toBeVisible({
        timeout: 10_000,
      });
      return;
    }
    await page.keyboard.press('Escape');
    await nghi(page, 500, 800);
  }
  throw new Error(`Không thấy tư cách "${tuCach}" trong danh sách`);
}

export async function themNguoiThamGia(
  page: import('@playwright/test').Page,
  tuCach: string,
  nguoi: import('../common/du-lieu-dan-su').NguoiDanSu,
  nutKetThuc: 'Lưu & Thêm mới' | 'Lưu',
  /** Ghi sổ cái — không bắt buộc, chỉ để nói rõ đã chọn tỉnh/phường nào */
  ghi?: (khoa: string, giaTri: string) => void,
) {
  // "Lưu & Thêm mới" giữ nguyên drawer và tự xoá trắng form → người thứ hai trở đi không bấm lại
  // nút "Thêm người tham gia" (nút nằm dưới lớp phủ của drawer, bấm sẽ bị chặn).
  const form = page.locator('.ant-drawer-content').filter({ hasText: 'Thêm mới thành phần tham gia tố tụng' }).last();
  if (!(await hienTrong(form, 3_000))) {
    await page.getByRole('button', { name: /Thêm người tham gia/ }).first().click();
    await expect(form, 'Không mở được form Thêm mới thành phần tham gia tố tụng').toBeVisible({ timeout: 30_000 });
  }
  await expect(form.locator('#conNguoi_hoTen'), 'Form đương sự chưa render xong').toBeVisible({ timeout: 30_000 });
  await nghi(page, 1200, 2000);

  await chonTuCachThamGia(page, form, tuCach);

  // Thông tin chung
  await go(form.locator('#conNguoi_hoTen'), nguoi.hoTen);
  await chonSelect(page, form.locator('#conNguoi_maGioiTinh'), undefined, { goDeLoc: false });
  // Ô ngày sinh là input chữ, nhận "dd/mm/yyyy hoặc yyyy" → Excel chỉ cho tuổi nên nhập năm sinh.
  // Nhiều dòng Excel không ghi tuổi (vd "Nguyễn Du") trong khi form bắt buộc ngày sinh → dùng tuổi
  // mặc định khai trong config (nghiepVu.tuoiMacDinhDuongSu) để giá trị vẫn là một năm sinh hợp lý.
  const namSinh = nguoi.namSinh ?? new Date().getFullYear() - Number(giaTri('tuoiMacDinhDuongSu'));
  await go(form.locator('#conNguoi_ngaySinh'), String(namSinh));
  await form.locator('#conNguoi_ngaySinh').blur();
  // b6.4 — "Số định danh cá nhân": tick ô "Chưa xác định" (dữ liệu Excel không có số định danh)
  // Ô tick nằm trong addonBefore của ô "Số định danh cá nhân" (div.cccd-addon-checkbox), không có nhãn chữ
  const khungChuaXacDinh = form.locator('.cccd-addon-checkbox').first();
  const oChuaXacDinh = khungChuaXacDinh.locator('input[type="checkbox"]').first();
  // Input thật của antd bị che nên click thẳng vào nó không đổi trạng thái → click vào khung bọc
  if (!(await oChuaXacDinh.isChecked())) await khungChuaXacDinh.click();
  await expect(oChuaXacDinh, 'Không tick được "Chưa xác định" của Số định danh cá nhân').toBeChecked({ timeout: 10_000 });
  await nghi(page, 500, 900);

  // ───────── Thông tin địa chỉ ─────────
  // Đối chiếu FE 30/09/2026 (`components/FormDuongSu/sections/ThongTinDiaChiSection.tsx`, QLN-12466):
  //   · Nhóm KHỞI KIỆN bắt buộc "Nơi thường trú" (LoaiDiaChi.NOI_DANG_KI_HKTT = 2) và
  //     "Nơi ở hiện tại" (NOI_O_HIEN_TAI = 4).
  //   · Nhóm BỊ KIỆN bắt buộc "Nơi ở hiện tại"; trên ĐƠN còn bắt buộc cả "Nơi thường trú"
  //     (`TableDuongSu/index.tsx:1249` truyền batBuocThuongTruNhomBiKien={nguonDuLieu === 'don'}).
  //   · Dòng bắt buộc thì FE ẨN ô "Không có thông tin" và effect còn TỰ BỎ TICK nếu đã tick
  //     → cách cũ (tick hết "Không có thông tin") không bao giờ qua được, form báo
  //     "Vui lòng nhập nơi thường trú" rồi treo ở bước chờ toast.
  //   · Chỉ ô "Địa chỉ chi tiết" (soNha) có rule required; Phường/Xã, Quận/Huyện, Tỉnh/TP, Quốc gia
  //     KHÔNG bắt buộc → chỉ cần gõ text, không phải mở dropdown địa giới (nhanh và tất định).
  const diaChi = (nguoi as { diaChi?: string }).diaChi || 'Số 1, đường Trần Phú';
  for (const loai of [2, 4]) {
    const o = form.locator(`#diaChi_${loai}_soNha`);
    if (!(await hienTrong(o, 5_000))) continue;
    await go(o, diaChi);

    /**
     * ĐÍNH CHÍNH 30/09/2026: ghi chú ở trên nói Tỉnh/TP và Phường/Xã KHÔNG bắt buộc — nay form
     * chặn lưu bằng "Vui lòng chọn Tỉnh/Thành phố | Vui lòng chọn Phường/xã" (chỉ hai cấp, không
     * còn Quận/Huyện). Điền lần lượt MỌI ô chọn của chính dòng địa chỉ đó theo thứ tự DOM —
     * tỉnh trước, phường sau — vì danh mục phường nạp theo tỉnh vừa chọn.
     */
    const cb = form.locator(`[role="combobox"][id^="diaChi_${loai}_"]`);
    const soCb = await cb.count();
    for (let i = 0; i < soCb; i++) {
      const oChon = cb.nth(i);
      const id = await oChon.getAttribute('id');
      if (!id) continue;
      const khung = form.locator('.ant-select').filter({ has: page.locator(`#${id}`) }).first();
      if (await khung.locator('.ant-select-selection-item').count()) continue; // đã có giá trị
      const gt = await chonSelectTheoThuTu(page, oChon, 0).catch(() => '');
      if (gt) ghi?.(`địa chỉ ${loai}`, `${id} = ${gt}`);
      await choHetSpin(page);
    }
  }
  // Dòng KHÔNG bắt buộc (tạm trú, địa chỉ liên lạc) vẫn còn ô "Không có thông tin" → tick cho gọn
  const oKhongCo = form.locator('input[type="checkbox"][id^="khongCoDiaChiTheoLoai"]');
  const soO = await oKhongCo.count();
  for (let i = 0; i < soO; i++) await oKhongCo.nth(i).check({ force: true }).catch(() => {});
  await nghi(page, 600, 1000);

  await form.getByRole('button', { name: nutKetThuc === 'Lưu' ? /^Lưu$/ : /^Lưu & Thêm mới$/ }).last().click();

  // Hỏng nhanh, nói rõ lý do: xem `xacNhanLuu` ở common/antd.ts
  await xacNhanLuu(page, form, /Đã lưu đương sự|thành công/i, {
    viec: `lưu đương sự "${nguoi.hoTen}"`,
  });
  await nghi(page, 1200, 2000);
}
