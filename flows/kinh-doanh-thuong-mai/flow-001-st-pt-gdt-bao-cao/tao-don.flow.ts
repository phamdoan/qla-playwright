/**
 * FLOW-001 · nghiệp vụ bước 01 — tạo đơn khởi kiện Kinh doanh, thương mại (StepData b2–b10).
 *
 * Đây là lớp FLOW: một mốc nghiệp vụ, đi qua NHIỀU màn hình (danh sách đơn → wizard 5 bước →
 * chi tiết đơn). Không ép "1 flow = 1 page"; thao tác UI từng ô nằm ở `common/` và `pages/`.
 *
 * VÀO : `page` đã đăng nhập đúng vai + `INPUT` của case
 * RA  : `{ idDon, soTiepNhan }` — bằng chứng do hệ thống cấp, để CHECKPOINT ghi vào CaseState
 */
import { Page, expect, test } from '@playwright/test';
import { choHetSpin, chonNgay, chonSelect, chonSelectTheoThuTu, go, nghi } from '../../../common/antd';
import { ddmmyyyy } from '../../../common/du-lieu';
import { chonQhplThongKe, khungSelectCua, themNguoiThamGia } from '../../../common/don-khoi-kien';
import type { INPUT } from '../../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (nhan: string, mo: string) => void;

export async function taoDonKhoiKien(page: Page, input: DuLieuVao, ghi: GhiChu) {
  // ───────── b2–b3 · mở màn Thêm mới đơn ─────────
  await test.step('b2–b3 · Danh sách đơn → button "Thêm mới đơn"', async () => {
    await page.goto('quan-ly-don/don-khoi-kien-va-yeu-cau/danh-sach?tab=ALL');
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await page.getByRole('button', { name: /Thêm mới đơn$/ }).first().click();
    await expect(page.getByText(/Thêm mới đơn khởi kiện và yêu cầu/i).first()).toBeVisible({ timeout: 60_000 });
    await choHetSpin(page);
    await nghi(page, 1200, 2000);
  });

  // ───────── b4 · Thông tin đơn ─────────
  let soTiepNhan = '';
  await test.step('b4 · Thông tin đơn (loại đơn = Kinh doanh, thương mại)', async () => {
    const homNay = ddmmyyyy(new Date());
    await chonSelect(page, page.locator('#hinhThucNhanDon'), input.hinhThucNhanDon, { goDeLoc: false });
    await chonNgay(page.locator('#ngayLamDon'), homNay);
    await chonNgay(page.locator('#ngayNhanDon'), homNay);
    // "Số tiếp nhận" hệ thống tự cấp và khoá → chỉ đọc lại làm bằng chứng
    soTiepNhan = (await page.locator('#soTiepNhan').inputValue().catch(() => '')).trim();
    ghi('số tiếp nhận (hệ thống cấp)', soTiepNhan || '(trống)');

    // "Người nhận đơn" là danh mục CÁN BỘ CỦA ĐƠN VỊ đang đăng nhập. StepData b4.5 ghi
    // "Nguyễn Mậu Trường" nhưng chạy bằng tài khoản TANDTC thì danh mục là cán bộ TANDTC
    // (đo 30/09/2026: Ngô Tiến Hùng | Đỗ Mạnh Tăng | Nguyễn Hữu Tuyến | …) → không có tên đó.
    // Không có tên khai trong dữ liệu thì lấy mục đầu và GHI LẠI ai được chọn, không để hỏng bước.
    // "Người nhận đơn" là danh mục CÁN BỘ CỦA ĐƠN VỊ đang đăng nhập. StepData b4.5 ghi
    // "Nguyễn Mậu Trường" nhưng chạy bằng tài khoản TANDTC thì danh mục là cán bộ TANDTC nên không
    // có tên đó. Không có tên khai trong dữ liệu thì lấy mục ĐẦU THEO THỨ TỰ CHỮ CÁI — KHÔNG lấy
    // "mục đầu danh sách": đo 30/09/2026 thứ tự máy chủ trả về đổi giữa hai lượt chạy
    // (lượt 1 "Lê Tiến", lượt 2 "Ngô Tiến Hùng") → cùng một case ra dữ liệu khác nhau.
    const oNhanDon = page.locator('#canBoNhanDon');
    let nguoiNhan = '';
    try {
      nguoiNhan = await chonSelect(page, oNhanDon, input.nguoiNhanDon);
    } catch {
      nguoiNhan = await chonSelectTheoThuTu(page, oNhanDon);
      ghi('người nhận đơn', `danh mục không có "${input.nguoiNhanDon}" → lấy mục đầu theo thứ tự chữ cái`);
    }
    ghi('người nhận đơn (đã chọn)', nguoiNhan);

    // Khác luồng dân sự: loại đơn PHẢI là "Kinh doanh, thương mại", không giữ gợi ý của hệ thống
    await chonSelect(page, page.locator('#loaiDon'), input.loaiDon);
    await chonSelect(page, page.locator('#phanLoai'), input.phanLoaiDon);

    // Chọn đúng TÊN LÁ trong danh mục, không dò từ khoá. Tên lá đổi theo máy chủ: QHPL_TC_KDTM.001
    // nay là "Tranh chấp hợp đồng mua bán hàng hóa" và nằm ở cấp 2 (đo 04/10/2026, danh mục KDTM
    // bị tái cấu trúc 03/10) — nên phải gieo cả `qhplChaThongKe`.
    const qhpl = await chonQhplThongKe(
      page,
      page.locator('#qhplThongKe'),
      input.tenQhplThongKe,
      // Cây ảo hoá: gieo chuỗi lọc NGẮN ở `quanHePhapLuatThongKe`, tên đầy đủ vẫn là thứ dùng để khớp
      input.quanHePhapLuatThongKe || input.tenQhplThongKe,
      // Lá nằm sâu hơn cấp 1 thì phải gieo tên nhánh cha (xem chonQhplThongKe)
      (input as { qhplChaThongKe?: string }).qhplChaThongKe,
    );
    ghi('quan hệ pháp luật', `${qhpl} (${input.maQhplThongKe})`);
    await go(page.locator('#noiDungQuanHePhapLuat'), input.quanHePhapLuatChiTiet);
  });

  // ───────── b5 ─────────
  await page.getByRole('button', { name: /^Tiếp theo$/ }).first().click();
  await choHetSpin(page);
  await expect(
    page.getByRole('button', { name: /Thêm người tham gia/ }).first(),
    'Bấm "Tiếp theo" nhưng không sang được bước "Đương sự"',
  ).toBeVisible({ timeout: 60_000 });
  await nghi(page, 1000, 1800);

  // ───────── b6 · Đương sự ─────────
  await test.step(`b6.2 · Người khởi kiện: ${input.nguyenDon.hoTen}`, () =>
    themNguoiThamGia(page, 'Người khởi kiện', input.nguyenDon as never, 'Lưu & Thêm mới'));
  await test.step(`b6.3 · Người bị kiện: ${input.biDon.hoTen}`, () =>
    themNguoiThamGia(page, 'Người bị kiện', input.biDon as never, 'Lưu'));

  for (const ten of [input.nguyenDon.hoTen, input.biDon.hoTen]) {
    await expect(
      page.getByText(ten, { exact: false }).first(),
      `Không thấy đương sự "${ten}" sau khi lưu`,
    ).toBeVisible({ timeout: 30_000 });
  }

  await page.getByRole('button', { name: /^Tiếp theo$/ }).first().click();
  await choHetSpin(page);
  await nghi(page, 1000, 1800);

  // ───────── b7 · Yêu cầu ─────────
  await test.step('b7 · Yêu cầu khởi kiện', async () => {
    const oNoiDung = page.locator('#yeuCau');
    await expect(oNoiDung, 'Không sang được bước "Yêu cầu"').toBeVisible({ timeout: 60_000 });
    await choHetSpin(page);
    await go(oNoiDung, input.noiDungYeuCau);

    const oQhplYc = page.locator('#maQuanHePhapLuat');
    if (!(await khungSelectCua(oQhplYc).locator('.ant-select-selection-item').count())) {
      await khungSelectCua(oQhplYc).click();
      const cay = page.locator('.ant-select-dropdown:visible .ant-select-tree-node-content-wrapper').first();
      await expect(cay, 'Cây quan hệ pháp luật ở bước Yêu cầu không nạp được').toBeVisible({ timeout: 30_000 });
      await cay.click();
      await nghi(page, 600, 1000);
    }
    await chonSelect(page, page.locator('#idNguoiYeuCau'), input.nguyenDon.hoTen);

    const oGiaTri = page.locator('#giaTriYeuCauKeKhai');
    if (await oGiaTri.isVisible().catch(() => false)) await go(oGiaTri, input.giaTriYeuCau);

    await page.getByRole('button', { name: /Thêm mới$/ }).first().click();
    await choHetSpin(page);
    await expect(
      page.getByText(input.noiDungYeuCau, { exact: false }).first(),
      'Bấm "Thêm mới" nhưng yêu cầu không vào danh sách',
    ).toBeVisible({ timeout: 30_000 });
    await nghi(page, 800, 1400);
    await page.getByRole('button', { name: /^Tiếp theo$/ }).first().click();
    await choHetSpin(page);
    await expect(oNoiDung, 'Bấm "Tiếp theo" nhưng vẫn ở bước Yêu cầu').toBeHidden({ timeout: 60_000 });
  });

  // ───────── b8 · Tài liệu đính kèm (không bắt buộc) ─────────
  await expect(
    page.getByRole('button', { name: /Thêm tài liệu mới$/ }).first(),
    'Không sang được bước "Tài liệu đính kèm"',
  ).toBeVisible({ timeout: 60_000 });
  await choHetSpin(page);
  await page.getByRole('button', { name: /^Tiếp theo$/ }).first().click();
  await choHetSpin(page);

  // ───────── b9–b10 · Hoàn thành → Xử lý đơn ─────────
  const nutXuLy = page.getByRole('button', { name: /^Xử lý đơn$/ }).first();
  await expect(nutXuLy, 'Không sang được bước "Hoàn thành"').toBeVisible({ timeout: 60_000 });
  await nghi(page, 1000, 1800);
  await nutXuLy.click();
  await page.waitForURL(/don-khoi-kien-va-yeu-cau\/chi-tiet\?/, { timeout: 120_000 });
  await choHetSpin(page);

  const idDon = new URL(page.url()).searchParams.get('id') || '';
  expect(idDon, 'Không lấy được id đơn sau khi "Xử lý đơn"').not.toBe('');
  ghi('id đơn', idDon);
  ghi('link chi tiết đơn', page.url());

  return { idDon, soTiepNhan };
}
