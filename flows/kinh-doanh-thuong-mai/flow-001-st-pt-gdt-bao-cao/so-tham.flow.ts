/**
 * FLOW-001 · nghiệp vụ bước 07–08 — Vụ án sơ thẩm KDTM.
 *
 * Route vụ án KDTM (ĐO THẬT 30/09/2026, không suy từ routes.ts):
 *   vu-an/kinh-doanh-thuong-mai/so-tham/chi-tiet?id=<idVuAnSoTham>&tab=<key>
 *
 * Nguồn nghiệp vụ : StepData KDTM · Sơ thẩm Step3–Step4
 * Nguồn cài đặt   : `don-hanh-chinh-so-tham.spec.ts` · S6 (đã chạy được, nay ở backup)
 */
import { Locator, Page, expect, test } from '@playwright/test';
import { choHetSpin, chonNgay, chonSelect, chonSelectTheoThuTu, go, nghi, oTheoNhan } from '../../../common/antd';
import { ddmmyyyy } from '../../../common/du-lieu';
import { soTatDinh } from '../../../khung/so-tat-dinh';
import { bieuMauDangMo, dongBieuMau, laySoVaKyLogic, luuBieuMau, moTab } from '../../../common/bieu-mau';
import type { INPUT } from '../../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (nhan: string, mo: string) => void;

// ═════════ BƯỚC 07 · tab Thụ lý: đọc số/ngày thụ lý hệ thống đã cấp ═════════
/**
 * Bước 06 đã ký 30-DS rồi, nên ở đây chỉ ĐỌC LẠI bằng chứng để bàn giao cho các bước sau.
 *
 * Đo 30/09/2026: bảng "Thông tin thụ lý" hiện một dòng dạng
 *   "1 Sơ thẩm Số thụ lý: 1234568446 Ngày thụ lý: 30/09/2026 Thụ lý mới Nguyên Đơn: … Bị Đơn: …"
 * Dòng này KHÔNG có nút thao tác — bản cũ đi tìm nút con mắt để ký nên click treo 30s.
 */
export async function soThamThuLy(page: Page, _input: DuLieuVao, ghi: GhiChu) {
  /**
   * PHẢI mở tab theo TÊN. Route của khung luôn mở `?tab=thong-tin-chung`; bản trước đọc thẳng
   * `body.innerText()` nên chỉ vớ được chữ "Số thụ lý" ở màn tóm tắt — đổi vụ là hụt ngay
   * (đo 30/09/2026: vụ VA26-004947 báo 'Tab Thụ lý không có "Số thụ lý"').
   */
  await moTab(page, 'Thụ lý');
  await choHetSpin(page);
  // CHỜ ĐÚNG ĐIỀU KIỆN thay vì ngủ một khoảng: bảng "Thông tin thụ lý" nạp sau khi tab mở, ngủ
  // 800ms (còn 250ms ở chế độ nhanh) thì đọc phải trang rỗng.
  await expect(
    page.getByText(/Số thụ lý/i).first(),
    'Tab Thụ lý không nạp được bảng "Thông tin thụ lý"',
  ).toBeVisible({ timeout: 60_000 });

  /**
   * Màn ghi GỘP số và ngày vào một chuỗi:
   *   "Số thụ lý  65501315/2026/TLST-KDTM ngày 30/09/2026"
   * Không có nhãn "Ngày thụ lý" riêng như bản ghi chú cũ tưởng. Giữ SỐ Ở DẠNG ĐẦY ĐỦ
   * (`<số>/<năm>/TLST-<loại án>`), không cắt lấy phần số trần.
   */
  const chu = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const gop = chu.match(/Số thụ lý:?\s*([0-9]+\/\d{4}\/[A-ZĐ-]+)\s*ngày\s*(\d{2}\/\d{2}\/\d{4})/i);
  const soThuLySoTham = gop?.[1] || (chu.match(/Số thụ lý:?\s*([0-9][0-9/-]*)/i) || [])[1] || '';
  const ngayThuLySoTham =
    gop?.[2] || (chu.match(/Ngày thụ lý:?\s*(\d{2}\/\d{2}\/\d{4})/i) || [])[1] || '';
  ghi('thông tin thụ lý', `số ${soThuLySoTham || '(trống)'} · ngày ${ngayThuLySoTham || '(trống)'}`);

  expect(soThuLySoTham, 'Tab Thụ lý không có "Số thụ lý"').not.toBe('');
  expect(ngayThuLySoTham, 'Tab Thụ lý không có "Ngày thụ lý"').not.toBe('');
  return { soThuLySoTham, ngayThuLySoTham };
}

// ═════════ BƯỚC 08 · tab Phân công: 3 quyết định phân công (PC-001, PC-002, PC-004) ═════════
/**
 * ĐO THẬT 30/09/2026 bằng ĐÚNG VAI của tài liệu (`chanhAnDanSu`, Tòa án nhân dân khu vực 9 - Hà Nội):
 * nút "Phân công" mở một MENU ba mục, đúng như StepData Step4:
 *   · Quyết định phân công Thẩm phán giải quyết vụ án dân sự   (PC-001)
 *   · Quyết định phân công Thư ký Tòa án tiến hành tố tụng      (PC-002) — khoá tới khi có PC-001
 *   · Quyết định phân công Hội thẩm nhân dân                    (PC-004) — khoá tới khi có PC-001
 *
 * ĐÍNH CHÍNH: ghi chú cũ ở đây khẳng định "KHÁC TÀI LIỆU — nút Phân công mở thẳng MỘT modal
 * 10-VDS duy nhất". Sai. Phép đo đó chạy bằng vai `chanhAn` (Chánh án TANDTC) chứ không phải
 * tài khoản Tòa sơ thẩm mà tài liệu chỉ định; màn của hai vai khác nhau.
 */
async function lapQuyetDinhPhanCong(
  page: Page,
  ghi: GhiChu,
  bm0: { rootCaseKey: string; khoa: string },
  tenMuc: RegExp,
  ten: string,
  vaiTro: string,
  soNguoi: number,
  daChon: string[],
  /** Tên mong muốn cho người ĐẦU TIÊN của vai trò này; không có trong danh mục thì lùi về mục đầu */
  uuTien?: string,
): Promise<{ so: string; daThem: number }> {
  const nut = page.getByRole('button', { name: /Phân công$/ }).first();
  await expect(nut, 'Tab Phân công không có nút "Phân công"').toBeVisible({ timeout: 30_000 });
  await nut.scrollIntoViewIfNeeded();
  await nut.click();

  const muc = page.getByRole('menuitem', { name: tenMuc }).first();
  await expect(muc, `Menu "Phân công" không có mục ${tenMuc}`).toBeVisible({ timeout: 15_000 });
  if (await muc.getAttribute('aria-disabled').then(v => v === 'true').catch(() => false)) {
    await page.keyboard.press('Escape');
    throw new Error(
      `Mục "${ten}" đang KHOÁ — hệ thống chỉ mở sau khi đã có quyết định phân công Thẩm phán.`,
    );
  }
  await muc.click();
  await choHetSpin(page);

  const bm = bieuMauDangMo(page);
  const oVaiTro = oTheoNhan(page, bm, /^Vai trò$/);
  await expect(oVaiTro, `Không mở được modal "${ten}"`).toBeVisible({ timeout: 60_000 });

  await test.step(`Số và ngày quyết định · ${ten}`, async () => {
    const oSo = oTheoNhan(page, bm, /^Số quyết định$/);
    if ((await oSo.isEditable().catch(() => false)) && !(await oSo.inputValue().catch(() => ''))) {
      const so = soTatDinh(bm0.rootCaseKey, bm0.khoa, 6);
      await go(oSo, so);
      ghi(`số quyết định ${ten} (tự nhập)`, so);
    }
    const oNgay = oTheoNhan(page, bm, /^Ngày quyết định$/);
    if ((await oNgay.isEditable().catch(() => false)) && !(await oNgay.inputValue().catch(() => ''))) {
      await chonNgay(oNgay, ddmmyyyy(new Date()));
    }
  });

  // Thêm từng người: Vai trò → Tên người được phân công → nút mũi tên xuống
  const oNguoi = oTheoNhan(page, bm, /Tên người được phân công/);
  const nutThem = bm.locator('button:has(.anticon-arrow-down)').first();
  let daThem = 0;
  for (let i = 0; i < soNguoi; i++) {
    /**
     * Danh mục có thể KHÔNG đủ người cho vai trò này (đo 30/09/2026: TANDTC chỉ có 01 Hội thẩm
     * nhân dân trong khi StepData yêu cầu 02). Hết người thì ghi nhận và đi tiếp — quyết định vẫn
     * lưu được với số người có thật; thiếu HĐXX là chuyện DỮ LIỆU MÔI TRƯỜNG, không phải lỗi code.
     */
    let hetNguoi = false;
    await test.step(`Thêm ${vaiTro} (${i + 1}/${soNguoi})`, async () => {
      await chonSelect(page, oVaiTro, vaiTro);
      await choHetSpin(page);
      // LUÔN lấy mục đầu theo thứ tự chữ cái, trừ những người đã chọn: người đã phân công bị loại
      // khỏi danh sách nên "mục đầu" của lần sau đã là người khác.
      let nguoi = '';
      if (i === 0 && uuTien) {
        nguoi = await chonSelect(page, oNguoi, uuTien)
          .then(() => uuTien)
          .catch(() => '');
        if (!nguoi) ghi(`phân công ${vaiTro}`, `danh mục không có "${uuTien}" → lấy mục đầu bảng chữ cái`);
      }
      try {
        if (!nguoi) nguoi = await chonSelectTheoThuTu(page, oNguoi, 0, daChon);
      } catch (e) {
        if (!/chỉ còn các mục đã dùng/.test(String(e))) throw e;
        ghi(`phân công ${vaiTro}`, `danh mục hết người chưa dùng → chỉ phân công được ${i} người (cần ${soNguoi})`);
        hetNguoi = true;
        return;
      }
      daChon.push(nguoi);
      const truoc = await bm.locator('.ant-table-row').count();
      await nutThem.click();
      await expect
        .poll(() => bm.locator('.ant-table-row').count(), {
          message: `Bấm thêm nhưng ${vaiTro} (${nguoi}) không vào bảng`,
          timeout: 30_000,
        })
        .toBeGreaterThan(truoc);
      daThem++;
      ghi(`${ten} · người ${daThem}`, `${vaiTro} — ${nguoi}`);
    });
    if (hetNguoi) break;
  }

  await luuBieuMau(page, bm, ten);
  await laySoVaKyLogic(page, bm, ghi, ten);
  const so = (await oTheoNhan(page, bm, /^Số quyết định$/).inputValue().catch(() => '')).trim();
  await dongBieuMau(page, bm);
  await choHetSpin(page);
  await moTab(page, 'Phân công');
  return { so, daThem };
}

export async function soThamPhanCong(page: Page, input: DuLieuVao, ghi: GhiChu, rootCaseKey: string) {
  // Route của khung luôn mở `?tab=thong-tin-chung` → phải mở tab theo TÊN, như bước 07.
  await moTab(page, 'Phân công');
  await choHetSpin(page);

  const bangTienHanh = page.locator('.ant-table-row');
  const daCo = await bangTienHanh.filter({ hasText: /Thẩm phán|Thư ký|Hội thẩm/i }).count();
  if (daCo) {
    const ds = (await bangTienHanh.allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
    ghi('phân công', `đã có ${daCo} dòng ở lượt trước: ${ds.slice(0, 4).join(' / ')}`);
    return { soQdPhanCongThamPhanSoTham: `${daCo} dòng`, soQdPhanCongThuKySoTham: '-', soQdPhanCongHoiTham: '-' };
  }

  const daChon: string[] = [];
  const pc001 = await lapQuyetDinhPhanCong(
    page, ghi, { rootCaseKey, khoa: 'soQdPhanCongThamPhan' },
    /Quyết định phân công Thẩm phán/i, 'PC-001 (phân công Thẩm phán)',
    input.vaiTroThamPhanChuToa, 1, daChon, input.tenThamPhanChuToa,
  );
  const pc002 = await lapQuyetDinhPhanCong(
    page, ghi, { rootCaseKey, khoa: 'soQdPhanCongThuKy' },
    /Quyết định phân công Thư ký/i, 'PC-002 (phân công Thư ký)',
    input.vaiTroThuKy, 1, daChon,
  );
  const pc004 = await lapQuyetDinhPhanCong(
    page, ghi, { rootCaseKey, khoa: 'soQdPhanCongHoiTham' },
    /Quyết định phân công Hội thẩm/i, 'PC-004 (phân công Hội thẩm nhân dân)',
    input.vaiTroHoiTham, input.soHoiThamNhanDan, daChon,
  );

  const tong = pc001.daThem + pc002.daThem + pc004.daThem;
  expect(tong, 'Không thêm được người tiến hành tố tụng nào').toBeGreaterThan(0);
  return {
    soQdPhanCongThamPhanSoTham: pc001.so || `${pc001.daThem} dòng`,
    soQdPhanCongThuKySoTham: pc002.so || `${pc002.daThem} dòng`,
    soQdPhanCongHoiTham:
      pc004.daThem === input.soHoiThamNhanDan
        ? pc004.so || `${pc004.daThem} hội thẩm`
        : `${pc004.so || pc004.daThem} — chỉ phân công được ${pc004.daThem}/${input.soHoiThamNhanDan} hội thẩm (danh mục đơn vị không đủ người)`,
  };
}
