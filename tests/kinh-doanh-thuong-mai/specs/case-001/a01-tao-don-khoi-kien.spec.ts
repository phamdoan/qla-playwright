/**
 * KDTM_CASE_001 · STEP A01 — Tạo đơn khởi kiện Kinh doanh, thương mại.
 *
 * Nguồn: `docs/StepData_KinhDoanhThuongMai_VuAn.txt` b1–b10.
 * ⚠ TẠO DỮ LIỆU THẬT. Chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1.
 *
 * INPUT      : dữ liệu gieo tất định ở `../../data/case-001.ts` (không Excel, không random)
 * OUTPUT     : `idDon`, `soTiepNhan` — ghi vào CaseState cho A02 dùng
 * VERIFY     : UI (sang được màn chi tiết đơn) + id đơn đọc từ URL
 * CHECKPOINT : chỉ ghi PASSED khi có `idDon`
 */
import { expect, test } from '@playwright/test';
import { choPhepGhiTKM } from '../../../../account';
import { choHetSpin, chonNgay, chonSelect, go, nghi } from '../../../../common/antd';
import { ddmmyyyy } from '../../../../common/du-lieu';
import { chonDanhMucThongKe, khungSelectCua, themNguoiThamGia } from '../../../../common/don-khoi-kien';
import { moTrangVaiCauHinh } from '../../../../common/luong-tkm';
import { moCase } from '../../../../khung/case-state';
import { CASE_001, CASE_ID, MODULE, PHU_THUOC, ROOT_CASE_KEY } from '../../data/case-001';

const MA_BUOC = 'A01-tao-don-khoi-kien';
const state = moCase(MODULE, CASE_ID, ROOT_CASE_KEY, PHU_THUOC);

test.describe.configure({ mode: 'serial' });

test.describe(`${CASE_ID} · ${MA_BUOC}`, () => {
  test('A01 · Tạo đơn khởi kiện Kinh doanh, thương mại', async ({ browser }, testInfo) => {
    test.skip(!choPhepGhiTKM(), 'Môi trường không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)');
    test.skip(state.daXong(MA_BUOC), `Đã tạo đơn ở lượt trước: id ${state.doc().duLieu.idDon}`);
    testInfo.setTimeout(10 * 60_000);

    const ghi = (type: string, mo: string) => {
      testInfo.annotations.push({ type, description: mo });
      console.log(`    · ${type}: ${mo}`);
    };
    const { page, context } = await moTrangVaiCauHinh(browser, testInfo, CASE_001.vaiNhapDon);

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
      await chonSelect(page, page.locator('#hinhThucNhanDon'), CASE_001.hinhThucNhanDon, { goDeLoc: false });
      await chonNgay(page.locator('#ngayLamDon'), homNay);
      await chonNgay(page.locator('#ngayNhanDon'), homNay);
      // "Số tiếp nhận" hệ thống tự cấp và khoá → chỉ đọc lại làm bằng chứng
      soTiepNhan = (await page.locator('#soTiepNhan').inputValue().catch(() => '')).trim();
      ghi('số tiếp nhận (hệ thống cấp)', soTiepNhan || '(trống)');
      // "Người nhận đơn" là danh mục CÁN BỘ CỦA ĐƠN VỊ đang đăng nhập. StepData b4.5 ghi
      // "Nguyễn Mậu Trường" nhưng chạy bằng tài khoản TANDTC thì danh mục là cán bộ TANDTC
      // (đo 30/09/2026: Ngô Tiến Hùng | Đỗ Mạnh Tăng | Nguyễn Hữu Tuyến | …) → không có tên đó.
      // Không có tên khai trong dữ liệu thì lấy mục đầu và GHI LẠI ai được chọn, không để hỏng bước.
      const oNhanDon = page.locator('#canBoNhanDon');
      let nguoiNhan = '';
      try {
        nguoiNhan = await chonSelect(page, oNhanDon, CASE_001.nguoiNhanDon);
      } catch {
        nguoiNhan = await chonSelect(page, oNhanDon);
        ghi('người nhận đơn', `danh mục không có "${CASE_001.nguoiNhanDon}" → lấy mục đầu: ${nguoiNhan}`);
      }
      ghi('người nhận đơn (đã chọn)', nguoiNhan);

      // Khác luồng dân sự: loại đơn PHẢI là "Kinh doanh, thương mại", không giữ gợi ý của hệ thống
      await chonSelect(page, page.locator('#loaiDon'), CASE_001.loaiDon);
      await chonSelect(page, page.locator('#phanLoai'), CASE_001.phanLoaiDon);

      let qhpl = '';
      for (const tk of CASE_001.tuKhoaQhpl) {
        try {
          const { qhplDaChon, soMuc } = await chonDanhMucThongKe(page, page.locator('#qhplThongKe'), tk);
          qhpl = qhplDaChon;
          ghi('quan hệ pháp luật', `${qhplDaChon} (từ khoá "${tk}", ${soMuc} mục)`);
          break;
        } catch {
          ghi('quan hệ pháp luật', `từ khoá "${tk}" không ra mục nào → thử từ khoá tiếp theo`);
        }
      }
      if (!qhpl) throw new Error(`Không chọn được Quan hệ pháp luật với mọi từ khoá: ${CASE_001.tuKhoaQhpl.join(' | ')}`);
      await go(page.locator('#noiDungQuanHePhapLuat'), CASE_001.quanHePhapLuatChiTiet);
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
    await test.step(`b6.2 · Người khởi kiện: ${CASE_001.nguyenDon.hoTen}`, () =>
      themNguoiThamGia(page, 'Người khởi kiện', CASE_001.nguyenDon as never, 'Lưu & Thêm mới'));
    await test.step(`b6.3 · Người bị kiện: ${CASE_001.biDon.hoTen}`, () =>
      themNguoiThamGia(page, 'Người bị kiện', CASE_001.biDon as never, 'Lưu'));

    for (const ten of [CASE_001.nguyenDon.hoTen, CASE_001.biDon.hoTen]) {
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
      await go(oNoiDung, CASE_001.noiDungYeuCau);

      const oQhplYc = page.locator('#maQuanHePhapLuat');
      if (!(await khungSelectCua(oQhplYc).locator('.ant-select-selection-item').count())) {
        await khungSelectCua(oQhplYc).click();
        const cay = page.locator('.ant-select-dropdown:visible .ant-select-tree-node-content-wrapper').first();
        await expect(cay, 'Cây quan hệ pháp luật ở bước Yêu cầu không nạp được').toBeVisible({ timeout: 30_000 });
        await cay.click();
        await nghi(page, 600, 1000);
      }
      await chonSelect(page, page.locator('#idNguoiYeuCau'), CASE_001.nguyenDon.hoTen);

      const oGiaTri = page.locator('#giaTriYeuCauKeKhai');
      if (await oGiaTri.isVisible().catch(() => false)) await go(oGiaTri, CASE_001.giaTriYeuCau);

      await page.getByRole('button', { name: /Thêm mới$/ }).first().click();
      await choHetSpin(page);
      await expect(
        page.getByText(CASE_001.noiDungYeuCau, { exact: false }).first(),
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

    // CHECKPOINT — chỉ ghi PASSED khi có bằng chứng do hệ thống cấp
    state.xongBuoc(MA_BUOC, { idDon, soTiepNhan });
    await context.close();
  });
});
