/**
 * FLOW-001 · nghiệp vụ bước 03–06 — Chi tiết đơn · tab "Kết quả xử lý".
 *
 * Bốn mốc nghiệp vụ trên CÙNG một màn, tách thành bốn bước vì mỗi mốc có đầu ra riêng và chạy lại
 * được độc lập:
 *   03 · Thông báo yêu cầu sửa đổi, bổ sung đơn (26-DS)
 *   04 · Xác nhận chế độ thủ tục → Xác định nghĩa vụ → Thông báo tạm ứng án phí (29-DS)
 *   05 · Ghi nhận nộp phí → Xác minh biên lai
 *   06 · Thụ lý vụ (30-DS) → sinh mã vụ án sơ thẩm
 *
 * Nguồn nghiệp vụ : StepData KDTM · Xử lý "Chi tiết đơn" mục 3.1–3.23
 * Nguồn cài đặt   : `don-hanh-chinh-so-tham.spec.ts` · S3 (đã chạy được, nay ở backup). Luồng hành
 *                   chính dùng 04-HC, KDTM dùng 29-DS — cùng khối màn hình, chỉ khác tên biểu mẫu.
 *
 * Mọi số phải nhập tay (biên lai, số thụ lý) sinh TẤT ĐỊNH từ `rootCaseKey` — xem khung/so-tat-dinh.ts.
 */
import path from 'path';
import { Locator, Page, expect, test } from '@playwright/test';
import { choHetSpin, chonNgay, chonSelect, chonSelectTheoThuTu, go, hienTrong, nghi } from '../../../common/antd';
import { bieuMauDangMo, dongBieuMau, laySoVaKyLogic, luuBieuMau, xacNhanHopThoai } from '../../../common/bieu-mau';
import { khungSelectCua } from '../../../common/don-khoi-kien';
import { ddmmyyyy } from '../../../common/du-lieu';
import { soTatDinh } from '../../../khung/so-tat-dinh';
import type { INPUT } from '../../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (nhan: string, mo: string) => void;

/** Ngày nhận đơn đọc trên thanh tiêu đề: "65500264 • Ngày nhận: 25/09/2026 • …" */
async function ngayNhanDonTrenMan(page: Page): Promise<string> {
  const dong = await page.getByText(/Ngày nhận:\s*\d{2}\/\d{2}\/\d{4}/).first().innerText();
  const ngay = (dong.match(/\d{2}\/\d{2}\/\d{4}/) || [])[0] || '';
  expect(ngay, 'Không đọc được "Ngày nhận đơn" trên thanh tiêu đề').toBeTruthy();
  return ngay;
}

/**
 * Khối (antd Collapse Panel) theo ĐÚNG TIÊU ĐỀ của nó.
 *
 * Không lọc `.ant-collapse-item` theo hasText: panel "Thông tin chung của đơn" có nút
 * "Thông báo xác định loại vụ việc" nên khớp cả /Thông báo/ → bắt nhầm panel, chờ 30s rồi hỏng.
 * Tiêu đề panel nằm ở `.ant-collapse-header` (FE: KetQuaXuLyTab/index.tsx · panelDieuKienThuLy).
 */
function khoiTheoTieuDe(page: Page, tieuDe: RegExp): Locator {
  return page
    .locator('.ant-collapse-item')
    .filter({ has: page.locator('.ant-collapse-header').filter({ hasText: tieuDe }) })
    .last();
}

/** Mở một biểu mẫu từ nút "Thêm thông báo" của một khối; không có mục thì liệt kê menu đang có */
async function themThongBao(page: Page, khoi: Locator, tenBieuMau: RegExp): Promise<Locator> {
  const nut = khoi.getByRole('button', { name: /Thêm thông báo/ }).last();
  await expect(nut, 'Khối không có nút "Thêm thông báo"').toBeVisible({ timeout: 30_000 });
  await nut.scrollIntoViewIfNeeded();
  await nut.click();

  const muc = page.locator('.ant-dropdown:visible .ant-dropdown-menu-item');
  await expect(muc.first(), 'Bấm "Thêm thông báo" nhưng menu không mở').toBeVisible({ timeout: 15_000 });
  const chon = muc.filter({ hasText: tenBieuMau }).first();
  if (!(await hienTrong(chon, 5_000))) {
    const ds = (await muc.allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
    await page.keyboard.press('Escape');
    throw new Error(`Menu "Thêm thông báo" không có mục khớp ${tenBieuMau}. Đang có: ${ds.join(' | ') || '(rỗng)'}`);
  }
  await chon.click();
  await choHetSpin(page);
  return bieuMauDangMo(page);
}

// ═════════ BƯỚC 03 · Yêu cầu sửa đổi, bổ sung đơn khởi kiện (26-DS) ═════════
export async function thongBaoSuaDoiBoSung(page: Page, input: DuLieuVao, ghi: GhiChu, rootCaseKey: string) {
  await choHetSpin(page);
  await nghi(page, 2000, 3000);

  // Biểu mẫu 26-DS nằm ở khối "Chưa đủ điều kiện" (đổi tên thành "Đủ điều kiện thụ lý" khi đã có
  // văn bản thụ lý) — FE: KetQuaXuLyTab/index.tsx · panelDieuKienThuLy
  const khoi = khoiTheoTieuDe(page, /Chưa đủ điều kiện|Đủ điều kiện thụ lý/);
  const bm = await themThongBao(page, khoi, /26-DS/i);

  const oNguoiKy = bm.locator('[id$="_noiDung_MA_NGUOI_KY"]').first();
  await expect(oNguoiKy, 'Không mở được biểu mẫu 26-DS').toBeVisible({ timeout: 60_000 });
  await nghi(page, 1200, 2000);
  if (!(await khungSelectCua(oNguoiKy).locator('.ant-select-selection-item').count())) {
    await chonSelectTheoThuTu(page, oNguoiKy);
  }

  // Bốn ô BẮT BUỘC của 26-DS, lấy đúng tên field từ FE
  // (`BieuMau/phan-loai-bm/BieuMauMS_26-DS/index.tsx`): MA_LY_DO, NOI_DUNG_YEU_CAU_SUA_DOI,
  // CAN_CU_DIEU, NGAY_SUA_DOI_BO_SUNG. Dùng selector theo HẬU TỐ id vì tiền tố là khoá biểu mẫu.
  await test.step('Điền 4 ô bắt buộc của 26-DS', async () => {
    const oLyDo = bm.locator('[id$="_noiDung_MA_LY_DO"]').first();
    await expect(oLyDo, 'Không thấy ô "Lý do xử lý" của 26-DS').toBeVisible({ timeout: 30_000 });
    try {
      await chonSelect(page, oLyDo, input.lyDoXuLyDon);
    } catch {
      const ten = await chonSelectTheoThuTu(page, oLyDo);
      ghi('lý do xử lý', `danh mục không có "${input.lyDoXuLyDon}" → chọn ${ten}`);
    }

    await go(bm.locator('[id$="_noiDung_NOI_DUNG_YEU_CAU_SUA_DOI"]').first(), input.noiDungYeuCauSuaDoi);
    await go(bm.locator('[id$="_noiDung_CAN_CU_DIEU"]').first(), input.canCuPhapLySuaDoi);
    // Hạn sửa đổi: ngày nhận đơn + 30 ngày, tính từ hôm nay nên tất định theo lượt chạy
    await chonNgay(bm.locator('[id$="_noiDung_NGAY_SUA_DOI_BO_SUNG"]').first(), ddmmyyyy(new Date(Date.now() + 30 * 86400_000)));
  });

  // 26-DS KHÔNG cấp số tự động: BE trả laySoTuDong=false nên chân biểu mẫu không có nút "Lấy số"
  // (FE: BieuMau/components/FooterBieuMau.tsx:311 — hideLaySo = !laySoTuDong || isBieuMauKhongCanCapSo,
  // và 26-DS không nằm trong LIST_BM_DISABLE_KHI_CO_NGAY_QD). Không tự nhập số thì "Ký logic" báo
  // "Văn bản chưa cấp số, cần lấy số trước khi ký số" rồi chờ hết giờ.
  await test.step('Nhập số và ngày ban hành (biểu mẫu không cấp số tự động)', async () => {
    const oSo = bm.locator('[id$="_so"]').first();
    if ((await oSo.isEditable().catch(() => false)) && !(await oSo.inputValue().catch(() => ''))) {
      const so = soTatDinh(rootCaseKey, 'so26DS', 6);
      await go(oSo, so);
      ghi('số 26-DS (tự nhập)', so);
    }
    const oNgay = bm.locator('[id$="_ngayQuyetDinh"]').first();
    if ((await hienTrong(oNgay, 3_000)) && !(await oNgay.inputValue().catch(() => ''))) {
      await chonNgay(oNgay, ddmmyyyy(new Date()));
    }
  });

  await luuBieuMau(page, bm, '26-DS');
  await laySoVaKyLogic(page, bm, ghi, '26-DS');
  const soThongBao26DS = (await bm.locator('[id$="_so"]').first().inputValue().catch(() => '')).trim();
  await dongBieuMau(page, bm);

  expect(soThongBao26DS, 'Không đọc được số thông báo 26-DS sau khi Lấy số').not.toBe('');
  return { soThongBao26DS };
}

// ═════════ BƯỚC 04 · Chế độ thủ tục → nghĩa vụ → Thông báo tạm ứng án phí (29-DS) ═════════
export async function tamUngAnPhi(page: Page, input: DuLieuVao, ghi: GhiChu) {
  await choHetSpin(page);
  await nghi(page, 2000, 3000);
  const ngayNhanDon = await ngayNhanDonTrenMan(page);
  ghi('ngày nhận đơn', ngayNhanDon);

  // 3.8–3.9 · Xác nhận chế độ thủ tục (phải làm TRƯỚC khi xác định nghĩa vụ)
  await test.step('Xác nhận chế độ thủ tục', async () => {
    const daXacNhan = page.getByText(/Đã xác nhận Thủ tục/i).first();
    if (!(await hienTrong(daXacNhan, 5_000))) {
      const oThuTuc = page.locator('[id$="thuTucDuKien"], [id*="thuTuc"]').first();
      if (await hienTrong(oThuTuc, 3_000)) await chonSelect(page, oThuTuc, input.thuTucDuKien).catch(() => {});
      await page.getByRole('button', { name: /Xác nhận chế độ thủ tục$/ }).first().click();
      await xacNhanHopThoai(page);
      await choHetSpin(page);
      await expect(daXacNhan, 'Xác nhận chế độ thủ tục không ăn').toBeVisible({ timeout: 60_000 });
      await nghi(page, 1200, 2000);
    }
    ghi('chế độ thủ tục', (await daXacNhan.innerText()).replace(/\s+/g, ' ').trim());
  });

  // 3.10–3.12 · Xác định nghĩa vụ → "Xác nhận tất cả"
  await test.step('Xác định nghĩa vụ tạm ứng', async () => {
    const daXacDinh = page.getByText(/đã được xác định/i).first();
    if (await hienTrong(daXacDinh, 5_000)) {
      ghi('nghĩa vụ tạm ứng', 'đã xác định ở lượt trước');
      return;
    }
    await page.getByRole('button', { name: /Xác định nghĩa vụ$/ }).first().click();
    await choHetSpin(page);
    const hop = bieuMauDangMo(page);
    await expect(hop, 'Không mở được "Xác định nghĩa vụ tạm ứng án phí"').toBeVisible({ timeout: 60_000 });
    await nghi(page, 1500, 2500);
    await hop.getByRole('button', { name: /Xác nhận tất cả$/ }).first().click();
    await choHetSpin(page);
    await nghi(page, 1500, 2500);
    await dongBieuMau(page, hop);
    await expect(daXacDinh, 'Xác định nghĩa vụ tạm ứng không ăn').toBeVisible({ timeout: 60_000 });
    ghi('nghĩa vụ tạm ứng', 'đã xác định cho toàn bộ nguồn phát sinh');
  });

  // 3.13–3.17 · Thông báo nộp tiền tạm ứng án phí (29-DS)
  const khoiTb = khoiTheoTieuDe(page, /Thông báo tạm ứng án phí và chi phí tố tụng/);
  const dongTb = khoiTb.locator('.ant-table-row').filter({ hasText: /Thông báo nộp/ });

  if (!(await dongTb.count())) {
    const bm = await themThongBao(page, khoiTb, /29-DS/i);
    const oNguoiKy = bm.locator('[id$="_noiDung_MA_NGUOI_KY"]').first();
    await expect(oNguoiKy, 'Không mở được biểu mẫu thông báo tạm ứng án phí (29-DS)').toBeVisible({ timeout: 60_000 });
    await nghi(page, 1500, 2500);
    if (!(await khungSelectCua(oNguoiKy).locator('.ant-select-selection-item').count())) {
      await chonSelectTheoThuTu(page, oNguoiKy);
    }

    // Ô "Ngày quyết định" của 29-DS bị KHOÁ tới khi văn bản được cấp số (đo 30/09/2026:
    // <input disabled id="bieuMau29DS_ngayQuyetDinh">) → chỉ điền khi ô mở, không thì để hệ thống tự đặt.
    const oNgayTb = bm.locator('[id$="_ngayQuyetDinh"]').first();
    if ((await hienTrong(oNgayTb, 3_000)) && (await oNgayTb.isEditable().catch(() => false))) {
      await chonNgay(oNgayTb, ngayNhanDon);
    }

    // Người phải nộp + số tiền (án phí KDTM không có giá ngạch = 3.000.000 — StepData 3.15)
    const oNguoiNop = bm.locator('[id$="_noiDung_nguoiPhaiNop"], [id*="nguoiPhaiNop"]').first();
    if ((await hienTrong(oNguoiNop, 3_000)) && (await oNguoiNop.isEditable().catch(() => false))) {
      await chonSelectTheoThuTu(page, oNguoiNop).catch(() => {});
    }
    // Số tiền tạm ứng thường do hệ thống tự tính → ô KHOÁ. Chỉ nhập khi ô cho nhập, nếu không
    // `go()` sẽ hỏng với "Ô nhập đang bị khoá". Đọc lại giá trị để ghi vào báo cáo.
    const oSoTien = bm.locator('[id$="_noiDung_soTien"], [id*="soTien"]').first();
    if (await hienTrong(oSoTien, 3_000)) {
      if (await oSoTien.isEditable().catch(() => false)) {
        await go(oSoTien, input.soTienTamUng);
        ghi('số tiền tạm ứng', `${input.soTienTamUng} (tự nhập)`);
      } else {
        ghi('số tiền tạm ứng', `${(await oSoTien.inputValue().catch(() => '')) || '(trống)'} (hệ thống tự tính, ô khoá)`);
      }
    }

    const oCqTha = bm.locator('[id$="_CO_QUAN_THI_HANH_AN_STR"]').first();
    if (await hienTrong(oCqTha, 5_000)) {
      await chonSelect(page, oCqTha, undefined, { goDeLoc: false });
      await nghi(page, 800, 1400);
      ghi('cơ quan thi hành án', await khungSelectCua(oCqTha).locator('.ant-select-selection-item').first().innerText());
    }
    // Địa chỉ cơ quan THA tự điền theo cơ quan đã chọn → có thể khoá
    const oDiaChiTha = bm.locator('[id$="_DIA_CHI_CO_QUAN_THA_STR"]').first();
    if ((await hienTrong(oDiaChiTha, 3_000)) && (await oDiaChiTha.isEditable().catch(() => false))) {
      if (!(await oDiaChiTha.inputValue().catch(() => ''))) await go(oDiaChiTha, 'HN');
    }

    await luuBieuMau(page, bm, '29-DS');
    await laySoVaKyLogic(page, bm, ghi, '29-DS');
    await dongBieuMau(page, bm);
    await nghi(page, 1500, 2500);
  } else {
    ghi('29-DS', `đã có ${await dongTb.count()} thông báo tạm ứng — không lập thêm`);
  }

  const soThongBao29DS = (await dongTb.first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  expect(soThongBao29DS, 'Không thấy dòng thông báo tạm ứng án phí sau khi lập').not.toBe('');
  ghi('trạng thái 29-DS', soThongBao29DS);
  return { soThongBao29DS };
}

// ═════════ BƯỚC 05 · Ghi nhận nộp phí → Xác minh biên lai ═════════
export async function xacMinhBienLai(page: Page, _input: DuLieuVao, ghi: GhiChu, rootCaseKey: string) {
  await choHetSpin(page);
  await nghi(page, 2000, 3000);

  const nutThuLy = page.getByRole('button', { name: /Thụ lý vụ$/ }).first();
  const nutVuAn = page.getByRole('button', { name: /VA\d/ }).first();
  const soBienLai = soTatDinh(rootCaseKey, 'soBienLai', 8);

  if ((await hienTrong(nutVuAn, 5_000)) || !(await nutThuLy.isDisabled().catch(() => true))) {
    ghi('nộp phí', 'nghĩa vụ tạm ứng đã đủ / đơn đã thụ lý từ lượt trước');
    return { soBienLai };
  }

  const nutXacMinh = page.getByRole('button', { name: /Xác minh$/ }).first();
  await nutXacMinh.scrollIntoViewIfNeeded();
  await nutXacMinh.click();
  const hop = bieuMauDangMo(page);
  await expect(hop.locator('#soBienLai'), 'Không mở được popup "Xác minh biên lai"').toBeVisible({ timeout: 60_000 });
  await nghi(page, 1500, 2500);

  await go(hop.locator('#soBienLai'), soBienLai);
  ghi('số biên lai', soBienLai);
  await hop
    .locator('input[type="file"]')
    .first()
    .setInputFiles(path.resolve(__dirname, '../../../data/bien-lai-tam-ung-an-phi.pdf'));
  await nghi(page, 1200, 2000);
  await hop.getByRole('button', { name: /Xác minh biên lai$/ }).first().click();
  await choHetSpin(page);
  await nghi(page, 1500, 2500);
  ghi('nộp phí', 'đã xác minh biên lai');
  return { soBienLai };
}

// ═════════ BƯỚC 06 · Thụ lý vụ (30-DS) → sinh mã vụ án ═════════
export async function thuLyVuAn(page: Page, _input: DuLieuVao, ghi: GhiChu, rootCaseKey: string) {
  await choHetSpin(page);
  await nghi(page, 2000, 3000);

  const nutVuAn = page.getByRole('button', { name: /VA\d/ }).first();
  const daThuLy = await hienTrong(nutVuAn, 5_000);

  if (!daThuLy) {
    const ngayNhanDon = await ngayNhanDonTrenMan(page);
    await page.getByRole('button', { name: /Thụ lý vụ$/ }).first().click();
    await choHetSpin(page);
    const bm = bieuMauDangMo(page);
    const oNgayThuLy = bm.locator('[id$="_noiDung_ngayThuLy"]').first();
    await expect(oNgayThuLy, 'Không mở được biểu mẫu thụ lý (30-DS)').toBeVisible({ timeout: 60_000 });
    await nghi(page, 1500, 2500);

    const oNguoiKy = bm.locator('[id$="_noiDung_MA_NGUOI_KY"]').first();
    if ((await oNguoiKy.count()) && !(await khungSelectCua(oNguoiKy).locator('.ant-select-selection-item').count())) {
      await chonSelectTheoThuTu(page, oNguoiKy);
    }
    const oSo = bm.locator('[id$="DS_so"], [id$="_so"]').first();
    if (await oSo.isEditable().catch(() => false)) {
      const so = soTatDinh(rootCaseKey, 'soThuLy', 8);
      await go(oSo, so);
      ghi('số thụ lý nhập', so);
    }
    await chonNgay(oNgayThuLy, ngayNhanDon);

    await luuBieuMau(page, bm, '30-DS');
    await laySoVaKyLogic(page, bm, ghi, 'quyết định thụ lý (30-DS)');
    await dongBieuMau(page, bm);
    await nghi(page, 2000, 3000);
  } else {
    ghi('thụ lý', 'đơn đã thụ lý từ lượt trước — bỏ qua');
  }

  await expect(nutVuAn, 'Thụ lý xong nhưng không thấy mã vụ án ở cuối trang').toBeVisible({ timeout: 60_000 });
  const maVuAnSoTham = (await nutVuAn.innerText()).trim();
  await nutVuAn.click();
  await page.waitForURL(/chi-tiet/, { timeout: 120_000 });
  await choHetSpin(page);
  const idVuAnSoTham = new URL(page.url()).searchParams.get('id') || '';
  ghi('vụ án sơ thẩm', `${maVuAnSoTham} · id ${idVuAnSoTham}`);
  ghi('link chi tiết vụ án', page.url());

  expect(idVuAnSoTham, 'Không lấy được id vụ án sơ thẩm từ URL').not.toBe('');
  return { maVuAnSoTham, idVuAnSoTham, soThongBao30DS: maVuAnSoTham };
}
