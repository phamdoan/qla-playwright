/**
 * FLOW-001 · nghiệp vụ bước 13–14 — Vụ án sơ thẩm, tab "Quản lý án".
 *
 * Nguồn nghiệp vụ: StepData_KinhDoanhThuongMai_VuAn · Step7.1–7.7.
 *
 * ĐO 30/09/2026 (vai `chanhAnDanSu`): tab "Quản lý án" có
 *   · "Danh sách kháng cáo"                    — nút "Thêm mới đơn kháng cáo"
 *   · "Danh sách kháng nghị"                   — nút "Tiếp nhận quyết định kháng nghị" (nhánh phụ)
 *   · "Danh sách thông báo kháng cáo, kháng nghị" — nút "Thêm mới thông báo", danh mục 7 mẫu:
 *     56-DS · 57-DS · 58-DS · 61-DS · 62-DS · 63-DS · 64-DS
 */
import { Locator, Page, expect } from '@playwright/test';
import { choHetSpin, dienOTheoNhan, hienTrong, moTaForm, nghi, nguyenNhanLoi } from '../../../common/antd';
import {
  bieuMauDangMo,
  dongBieuMau,
  laySoVaKyLogic,
  luuBieuMau,
  moTab,
  themBieuMauTuDanhSach,
} from '../../../common/bieu-mau';
import type { INPUT } from '../../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (khoa: string, giaTri: string) => void;

/** Khối của tab "Quản lý án" — neo theo TIÊU ĐỀ + NÚT vì không phải khối nào cũng là ant-card */
function khoiTheoTieuDeVaNut(page: Page, tieuDe: RegExp, tenNut: RegExp): Locator {
  return page
    .locator('div')
    .filter({ hasText: tieuDe })
    .filter({ has: page.getByRole('button', { name: tenNut }) })
    .last();
}

// ═════════ BƯỚC 13 · Đơn kháng cáo → Giấy xác nhận đã nhận đơn kháng cáo (55-DS) ═════════
/**
 * @param soBanAnSoTham số bản án bước 12 sinh — dùng để CHỌN ĐÚNG bản án bị kháng cáo,
 *        không gõ lại từ dữ liệu gieo.
 * @param ngayBanAn dd/mm/yyyy — ngày tuyên án; kháng cáo phải trong 15 ngày kể từ ngày này.
 */
export async function soThamKhangCao(
  page: Page,
  input: DuLieuVao,
  ghi: GhiChu,
  soBanAnSoTham: string,
  ngayBanAn: string,
) {
  await moTab(page, 'Quản lý án');
  await choHetSpin(page);

  const khoi = khoiTheoTieuDeVaNut(page, /Danh sách kháng cáo/i, /Thêm mới đơn kháng cáo/i);
  await expect(khoi, 'Tab "Quản lý án" không có khối "Danh sách kháng cáo"').toBeVisible({
    timeout: 30_000,
  });

  const dongCu = khoi.locator('.ant-table-row').first();
  if (await hienTrong(dongCu, 3_000)) {
    const cu = (await dongCu.innerText()).replace(/\s+/g, ' ').trim();
    ghi('đơn kháng cáo', `đã có ở lượt trước: ${cu}`);
    return { idDonKhangCao: cu, soGiayXacNhan55DS: await lap55DS(page, ghi, input) };
  }

  await khoi.getByRole('button', { name: /Thêm mới đơn kháng cáo/i }).first().click();
  await choHetSpin(page);

  const bm = bieuMauDangMo(page);
  await expect(bm, 'Bấm "Thêm mới đơn kháng cáo" nhưng không mở được biểu mẫu').toBeVisible({
    timeout: 60_000,
  });
  // Soi cả form trước khi điền — ô nào bắt buộc lộ ra ngay, khỏi chờ mù rồi hết giờ
  for (const d of await moTaForm(bm)) ghi('kháng cáo · ô', d);

  /**
   * Nhãn phải NEO HAI ĐẦU: form này có cả "Bản án/quyết định bị kháng cáo", "Số bản án/quyết định"
   * và "Ngày bản án/quyết định"; khớp lỏng là trúng nhầm ô.
   *
   * Danh mục bản án hiện theo dạng "297 — ngày 30/09/2026 — …" chứ KHÔNG phải số đầy đủ
   * "297/2026/DS-ST", nên chỉ so bằng PHẦN SỐ đứng trước dấu "/" (đo 30/09/2026).
   */
  const soBanAnNgan = soBanAnSoTham.split('/')[0];
  for (const [nhan, giaTri] of [
    [/^Ngày tiếp nhận$/, ngayBanAn],
    [/^Ngày kháng cáo$/, ngayBanAn],
    [/^Hình thức tiếp nhận$/, input.hinhThucTiepNhanKhangCao],
    [/^Loại kháng cáo$/, input.loaiKhangCao],
    [/^Bản án\/quyết định bị kháng cáo$/, soBanAnNgan],
    [/^Phạm vi kháng cáo$/, input.phamViKhangCao],
    [/^Loại người kháng cáo$/, input.loaiNguoiKhangCao],
    [/^Tên người kháng cáo$/, input.tenNguoiKhangCao],
    [/^Yêu cầu kháng cáo$/, input.yeuCauKhangCao],
    [/^Nội dung kháng cáo$/, input.noiDungKhangCao],
  ] as [RegExp, string | undefined][]) {
    const gt = await dienOTheoNhan(page, bm, nhan, giaTri).catch(async (e: Error) => {
      /**
       * Chọn hỏng thì dropdown VẪN MỞ, và ô kế tiếp sẽ đọc đúng danh sách cũ đó rồi báo sai lệch
       * (đo 30/09/2026: "Loại người kháng cáo" báo danh mục đang có "297 — ngày 30/09/2026").
       * Đóng lại trước khi đi tiếp để thông báo lỗi nói đúng về ô của nó.
       */
      await page.keyboard.press('Escape').catch(() => {});
      ghi('kháng cáo', `không điền được ${String(nhan)}: ${e.message.slice(0, 110)}`);
      return '';
    });
    if (gt) ghi('kháng cáo', `${String(nhan)} = ${gt}`);
    await choHetSpin(page);
  }

  // StepData 7.4: nút lưu của biểu mẫu này tên "Lưu mới", không phải "Lưu"
  await luuBieuMau(page, bm, 'đơn kháng cáo', ghi, /^Lưu mới$|^Lưu$/);
  if (await bm.isVisible().catch(() => false)) {
    const loi = await nguyenNhanLoi(page, bm);
    if (!/không đọc được/.test(loi)) ghi('kháng cáo · sau khi lưu', loi);
  }
  await dongBieuMau(page, bm);
  await choHetSpin(page);
  await moTab(page, 'Quản lý án');

  const dong = await khoiTheoTieuDeVaNut(page, /Danh sách kháng cáo/i, /Thêm mới đơn kháng cáo/i)
    .locator('.ant-table-row')
    .first()
    .innerText()
    .then(s => s.replace(/\s+/g, ' ').trim())
    .catch(() => '');
  if (!dong) throw new Error('Lưu đơn kháng cáo xong nhưng "Danh sách kháng cáo" vẫn không có dòng nào');
  ghi('đơn kháng cáo', dong);

  return { idDonKhangCao: dong, soGiayXacNhan55DS: await lap55DS(page, ghi, input) };
}

/**
 * StepData 7.5: tại DÒNG đơn kháng cáo bấm "⋮" rồi chọn
 * "Giấy xác nhận đã nhận đơn kháng cáo (55-DS)".
 */
async function lap55DS(page: Page, ghi: GhiChu, input?: DuLieuVao): Promise<string> {
  const khoi = khoiTheoTieuDeVaNut(page, /Danh sách kháng cáo/i, /Thêm mới đơn kháng cáo/i);
  const dong = khoi.locator('.ant-table-row').first();

  const nutMenu = dong.locator('button:has(.anticon-more), button:has(.anticon-ellipsis)').first();
  if (!(await hienTrong(nutMenu, 5_000))) {
    const icon = (await dong.getByRole('img').evaluateAll(ds => ds.map(e => e.getAttribute('aria-label')))).join(' | ');
    ghi('55DS', `dòng kháng cáo không có nút "⋮". Icon đang có: ${icon || '(không có)'}`);
    return '(chưa lập được — không thấy nút ⋮ trên dòng kháng cáo)';
  }
  await nutMenu.click();
  await nghi(page, 600, 1000);

  const muc = page.getByRole('menuitem', { name: /Giấy xác nhận đã nhận đơn kháng cáo/i }).first();
  if (!(await hienTrong(muc, 8_000))) {
    const ds = (await page.getByRole('menuitem').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
    await page.keyboard.press('Escape');
    ghi('55DS', `menu "⋮" không có mục 55-DS. Đang có: ${ds.slice(0, 10).join(' | ')}`);
    return '(chưa lập được — menu không có mục 55-DS)';
  }
  await muc.click();
  await choHetSpin(page);

  const bm = bieuMauDangMo(page);
  await expect(bm, 'Chọn 55-DS nhưng không mở được biểu mẫu').toBeVisible({ timeout: 60_000 });
  await choHetSpin(page);
  for (const d of await moTaForm(bm)) ghi('55DS · ô', d);

  // Ô bắt buộc riêng của 55-DS: "Vui lòng chọn phương thức nộp đơn" (đo 30/09/2026)
  const pt = await dienOTheoNhan(page, bm, /Phương thức nộp đơn/i, input?.phuongThucNopDon).catch(
    (e: Error) => {
      ghi('55DS', `không điền được "Phương thức nộp đơn": ${e.message.slice(0, 110)}`);
      return '';
    },
  );
  if (pt) ghi('55DS', `phương thức nộp đơn = ${pt}`);
  await choHetSpin(page);

  await luuBieuMau(page, bm, '55DS (giấy xác nhận đã nhận đơn kháng cáo)', ghi);
  await laySoVaKyLogic(page, bm, ghi, '55DS (giấy xác nhận đã nhận đơn kháng cáo)');
  await dongBieuMau(page, bm);
  await choHetSpin(page);
  await moTab(page, 'Quản lý án');

  const so = await khoiTheoTieuDeVaNut(page, /Danh sách kháng cáo/i, /Thêm mới đơn kháng cáo/i)
    .locator('.ant-table-row')
    .first()
    .innerText()
    .then(s => s.replace(/\s+/g, ' ').trim())
    .catch(() => '');
  ghi('55DS', so || '(không đọc lại được dòng kháng cáo)');
  return so || '(không đọc lại được dòng kháng cáo)';
}

// ═════════ BƯỚC 14 · Thông báo về việc kháng cáo (62-DS) ═════════
export async function soThamThongBaoKhangCao(page: Page, _input: DuLieuVao, ghi: GhiChu) {
  await moTab(page, 'Quản lý án');
  await choHetSpin(page);

  const khoi = khoiTheoTieuDeVaNut(page, /Danh sách thông báo kháng cáo, kháng nghị/i, /Thêm mới thông báo/i);
  await expect(khoi, 'Tab "Quản lý án" không có khối "Danh sách thông báo kháng cáo, kháng nghị"').toBeVisible({
    timeout: 30_000,
  });

  const daCo = khoi.locator('.ant-table-row').filter({ hasText: /về việc kháng cáo/i }).first();
  if (await hienTrong(daCo, 3_000)) {
    const cu = (await daCo.innerText()).replace(/\s+/g, ' ').trim();
    ghi('62DS', `đã có ở lượt trước: ${cu}`);
    return { soThongBao62DS: cu };
  }

  const bm = await themBieuMauTuDanhSach(page, khoi, '62-DS', /Thêm mới thông báo/i);
  await expect(bm, 'Không mở được biểu mẫu 62-DS').toBeVisible({ timeout: 60_000 });
  await choHetSpin(page);
  for (const d of await moTaForm(bm)) ghi('62DS · ô', d);

  /**
   * Bốn ô BẮT BUỘC (đo 30/09/2026): người ký ban hành · đơn kháng cáo · Viện kiểm sát cùng cấp ·
   * nội dung thông báo. Ba ô đầu là danh mục của chính vụ án nên để hệ thống tự liệt kê rồi lấy
   * mục đầu theo thứ tự chữ cái — vẫn tất định; riêng nội dung thì khai trong dữ liệu gieo.
   */
  for (const [nhan, giaTri] of [
    [/^Người ký ban hành$/, _input.nguoiKyBanHanh62DS],
    // Nhãn đổi theo trạng thái vụ: "Đơn kháng cáo" hoặc "Đơn kháng cáo / quyết định kháng nghị"
    [/^Đơn kháng cáo( [/] quyết định kháng nghị)?$/, undefined],
    [/^Viện kiểm sát cùng cấp$/, undefined],
    [/^Những vấn đề yêu cầu Tòa án cấp phúc thẩm giải quyết$/, _input.noiDungThongBao62DS],
  ] as [RegExp, string | undefined][]) {
    const gt = await dienOTheoNhan(page, bm, nhan, giaTri, /Người ký/i.test(String(nhan))).catch(async (e: Error) => {
      await page.keyboard.press('Escape').catch(() => {});
      ghi('62DS', `không điền được ${String(nhan)}: ${e.message.slice(0, 110)}`);
      return '';
    });
    if (gt) ghi('62DS', `${String(nhan)} = ${gt}`);
    await choHetSpin(page);
  }

  await luuBieuMau(page, bm, '62DS (thông báo về việc kháng cáo)', ghi);
  await laySoVaKyLogic(page, bm, ghi, '62DS (thông báo về việc kháng cáo)');
  await dongBieuMau(page, bm);
  await choHetSpin(page);
  await moTab(page, 'Quản lý án');

  const dong = await khoiTheoTieuDeVaNut(page, /Danh sách thông báo kháng cáo, kháng nghị/i, /Thêm mới thông báo/i)
    .locator('.ant-table-row')
    .filter({ hasText: /về việc kháng cáo/i })
    .first()
    .innerText()
    .then(s => s.replace(/\s+/g, ' ').trim())
    .catch(() => '');
  if (!dong) throw new Error('Lập 62-DS xong nhưng bảng thông báo kháng cáo vẫn không có dòng nào');
  ghi('62DS', dong);
  return { soThongBao62DS: dong };
}
