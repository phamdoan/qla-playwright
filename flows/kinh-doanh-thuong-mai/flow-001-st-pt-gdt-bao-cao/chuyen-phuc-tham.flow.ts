/**
 * FLOW-001 · nghiệp vụ bước 15 — chuyển hồ sơ sơ thẩm lên Tòa phúc thẩm.
 *
 * Nguồn nghiệp vụ: StepData_KinhDoanhThuongMai_VuAn · Step8.1–8.4
 *   8.1 menu "Hồ sơ chuyển đi phúc thẩm" (/qla/quan-ly-so-tham/dan-su/chuyen-di-phuc-tham)
 *   8.2 tab "Chưa chuyển", tìm theo mã vụ án
 *   8.3 tick checkbox dòng vụ án → "Chuyển vụ án"
 *   8.4 chờ "Đã chuyển vụ án thành công", vụ sang tab "Chờ tiếp nhận"
 *
 * Màn này KHÔNG mở bằng route của khung (flow.ts để `route: ''`) mà đi bằng ĐƯỜNG DẪN TRỰC TIẾP,
 * có dự phòng bấm theo MENU TRÁI nếu đường dẫn đổi.
 */
import { Page, expect } from '@playwright/test';
import { choHetSpin, go, hienTrong, nghi, toastGanDay } from '../../../common/antd';
import { xacNhanHopThoai } from '../../../common/bieu-mau';
import type { INPUT } from '../../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (khoa: string, giaTri: string) => void;

/** Đường dẫn StepData 8.1 ghi — KHÔNG tồn tại trên STG, giữ lại để đối chiếu tài liệu */
const DUONG_DAN_TAI_LIEU = 'quan-ly-so-tham/dan-su/chuyen-di-phuc-tham';
/** Đường dẫn thật, đo ngày 30/09/2026 */
const DUONG_DAN_THAT = 'vu-an/dan-su/so-tham/ho-so-chuyen-di';
void DUONG_DAN_TAI_LIEU;

/** @param maVuAnSoTham mã vụ án bước 06 sinh (vd. VA26-004950) */
export async function chuyenHoSoLenPhucTham(
  page: Page,
  _input: DuLieuVao,
  ghi: GhiChu,
  maVuAnSoTham: string,
) {
  /**
   * ĐI THẲNG BẰNG ĐƯỜNG DẪN — chốt bằng đo thật ngày 30/09/2026:
   *   · tài liệu ghi `quan-ly-so-tham/dan-su/chuyen-di-phuc-tham` → "Không tìm thấy trang"
   *   · đường thật: `vu-an/dan-su/so-tham/ho-so-chuyen-di`
   *   · nhánh "Kinh doanh và thương mại" KHÔNG có mục "Hồ sơ vụ án chuyển đi", nên vụ KDTM dùng
   *     chung màn của nhánh Dân sự — giống màn chi tiết vụ KDTM cũng ở `vu-an/dan-su/...`
   *
   * Không đi bằng menu nữa: thẻ submenu chứa cả chữ của các mục con nên khớp nhãn rất dễ trượt,
   * và khi trượt thì lỗi lại đổ cho menu thay vì nói đúng chuyện đang cần biết.
   */
  const tv = await page.goto(DUONG_DAN_THAT, { waitUntil: 'domcontentloaded' });
  await choHetSpin(page);
  ghi('màn hồ sơ chuyển đi', `${DUONG_DAN_THAT} → HTTP ${tv?.status() ?? '?'}`);

  /**
   * CHẠY LẠI: vụ đã chuyển rồi thì nó nằm ở tab "Chờ tiếp nhận", còn ở tab "Chưa chuyển" thì
   * không có (hoặc có mà ô tick bị khoá) — không nhận ra sẽ báo nhầm là "chưa tick được".
   */
  const tabCho = page.getByRole('tab', { name: /Chờ tiếp nhận/i }).first();
  if (await hienTrong(tabCho, 10_000)) {
    await tabCho.click();
    await choHetSpin(page);
    await nghi(page, 1200, 1800);
    const daChuyen = page.locator('.ant-table-row').filter({ hasText: maVuAnSoTham }).first();
    if (await hienTrong(daChuyen, 6_000)) {
      const dongCho = (await daChuyen.innerText()).replace(/\s+/g, ' ').trim();
      ghi('chuyển hồ sơ phúc thẩm', `đã chuyển ở lượt trước — đang ở tab "Chờ tiếp nhận": ${dongCho}`);
      return { ngayChuyenHoSoPhucTham: new Date().toLocaleDateString('vi-VN') };
    }
  }

  const tab = page.getByRole('tab', { name: /Chưa chuyển/i }).first();
  await expect(tab, 'Màn "Hồ sơ chuyển đi phúc thẩm" không có tab "Chưa chuyển"').toBeVisible({
    timeout: 30_000,
  });
  if ((await tab.getAttribute('aria-selected')) !== 'true') {
    await tab.click();
    await choHetSpin(page);
  }

  // Tìm theo MÃ VỤ ÁN — lưới có thể nhiều trang, không dựa vào việc vụ nằm ở trang đầu
  const oTim = page.getByRole('searchbox').or(page.getByPlaceholder(/Tìm|Nhập/i)).first();
  if (await hienTrong(oTim, 5_000)) {
    await go(oTim, maVuAnSoTham);
    await oTim.press('Enter');
    await choHetSpin(page);
    await nghi(page, 1200, 1800);
  }

  const dong = page.locator('.ant-table-row').filter({ hasText: maVuAnSoTham }).first();
  if (!(await hienTrong(dong, 15_000))) {
    /**
     * Tìm không ra thì XOÁ Ô TÌM rồi liệt kê cả tab: cần phân biệt "ô tìm không khớp kiểu chuỗi
     * mình gõ" với "vụ chưa đủ điều kiện nên không nằm trong tab này". Nhãn tab có sẵn số lượng
     * (vd. "Chưa chuyển (4)") nên đối chiếu được ngay.
     */
    /**
     * XOÁ LỌC CHO CHẮC: `fill('') + Enter` không phải lúc nào cũng gọi lại API, nên lưới vẫn giữ
     * kết quả rỗng của lần tìm trước trong khi nhãn tab vẫn ghi "Chưa chuyển (4)" — nhìn vào
     * tưởng vụ không nằm trong tab (đo 30/09/2026). Xoá xong bấm lại chính tab đó để nạp lại.
     */
    if (await hienTrong(oTim, 3_000)) {
      await oTim.fill('');
      await oTim.press('Enter');
      await choHetSpin(page);
      await nghi(page, 1200, 1800);
    }
    if (!(await page.locator('.ant-table-row').count())) {
      await page.getByRole('tab', { name: /Tất cả/i }).first().click().catch(() => {});
      await choHetSpin(page);
      await tab.click().catch(() => {});
      await choHetSpin(page);
      await nghi(page, 1500, 2200);
    }
    if (!(await hienTrong(dong, 10_000))) {
      const tenTab = (await tab.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      const ds = (await page.locator('.ant-table-row').allInnerTexts())
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean);

      /**
       * Tra tiếp ở tab "Tất cả" để phân định: vụ CHƯA ĐỦ ĐIỀU KIỆN chuyển (nằm ở tab khác, cột
       * "Trạng thái" nói lý do) hay MÀN NÀY KHÔNG CHỨA vụ. Không có bước này thì lỗi chỉ nói
       * "lưới rỗng" — đúng mà vô dụng.
       */
      let oTatCa = '';
      const tabTatCa = page.getByRole('tab', { name: /Tất cả/i }).first();
      if (await hienTrong(tabTatCa, 5_000)) {
        await tabTatCa.click();
        await choHetSpin(page);
        if (await hienTrong(oTim, 3_000)) {
          await go(oTim, maVuAnSoTham);
          await oTim.press('Enter');
          await choHetSpin(page);
          await nghi(page, 1500, 2200);
        }
        oTatCa =
          (await page.locator('.ant-table-row').allInnerTexts())
            .map(s => s.replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            .join(' // ') || '(không thấy ở cả tab "Tất cả")';
      }
      throw new Error(
        `Tab "${tenTab}" không có vụ ${maVuAnSoTham} (đã xoá ô tìm; lưới ${ds.length} dòng). ` +
          `Tra ở tab "Tất cả": ${oTatCa}`,
      );
    }
  }

  const tick = dong.locator('input[type="checkbox"]').first();
  await expect(tick, `Dòng vụ ${maVuAnSoTham} không có ô tick`).toBeVisible({ timeout: 15_000 });
  if (!(await tick.isChecked().catch(() => false))) await tick.click({ force: true });

  const nut = page.getByRole('button', { name: /Chuyển vụ án/i }).first();
  await expect(nut, 'Màn không có nút "Chuyển vụ án"').toBeVisible({ timeout: 15_000 });

  /**
   * NÚT PHẢI BẬT TRƯỚC KHI BẤM. Tên nút mang số dòng đang chọn — "Chuyển vụ án (0)" là chưa tick
   * được và nút đang khoá; bấm vào đó thì không có gì xảy ra, không toast, không hộp xác nhận,
   * và lỗi cuối lại nói "vụ vẫn nằm ở tab Chưa chuyển" (đo 30/09/2026).
   */
  const tenNut = async () => (await nut.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  if (!(await nut.isEnabled().catch(() => false)) || /\(0\)/.test(await tenNut())) {
    const daTick = await tick.isChecked().catch(() => false);
    throw new Error(
      `Nút "${await tenNut()}" đang khoá — ô tick của dòng ${maVuAnSoTham} ` +
        `${daTick ? 'đã tick nhưng màn không nhận' : 'CHƯA tick được'}.`,
    );
  }
  ghi('chuyển hồ sơ phúc thẩm', `bấm nút "${await tenNut()}"`);
  await nut.click();
  /**
   * Hệ thống hỏi xác nhận trước khi chuyển; không bấm đồng ý thì KHÔNG chuyển mà cũng KHÔNG có
   * toast nào — nhìn ra ngoài chỉ thấy "vụ vẫn nằm ở tab Chưa chuyển" (đo 30/09/2026).
   * Xác nhận lặp vì có thể hỏi nhiều lần, như lúc lưu lịch xét xử ở bước 10.
   */
  /**
   * Hộp xác nhận ở đây là MODAL THƯỜNG, không phải `.ant-modal-confirm`:
   *   "Chuyển vụ án — Xác nhận chuyển 1 vụ án tới tòa án nhận?" · nút [Hủy] [Chuyển]
   * nên `xacNhanHopThoai` (tìm OK/Đồng ý/Xác nhận) không bắt được. Không bấm "Chuyển" thì vụ
   * đứng yên, không toast, không lỗi (đo 30/09/2026).
   */
  for (let lan = 0; lan < 3; lan++) {
    const hop = page
      .locator('.ant-modal-content:visible, .ant-drawer-content:visible')
      .filter({ hasText: /Xác nhận chuyển .* vụ án/i })
      .first();
    if (!(await hienTrong(hop, lan === 0 ? 10_000 : 2_000))) break;
    const cauHoi = (await hop.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 120);
    // Modal đang đóng dở vẫn "visible" một nhịp → bấm vào là treo đủ 30s. Bấm hụt thì thôi.
    const daBam = await hop
      .getByRole('button', { name: /^(Chuyển|Đồng ý|Xác nhận|OK)$/i })
      .first()
      .click({ timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    await choHetSpin(page);
    if (!daBam) break;
    ghi('chuyển hồ sơ phúc thẩm', `đã xác nhận: ${cauHoi}`);
    await nghi(page, 800, 1200);
  }
  await xacNhanHopThoai(page);
  await choHetSpin(page);
  await nghi(page, 1500, 2500);

  /**
   * Bằng chứng phải do HỆ THỐNG cấp: hoặc toast "Đã chuyển vụ án thành công", hoặc vụ đã rời
   * tab "Chưa chuyển". Không suy ra từ việc "đã bấm nút".
   */
  const toast = (await toastGanDay(page, 60_000)).find(t => /chuyển vụ án thành công/i.test(t));
  const conO = await page.locator('.ant-table-row').filter({ hasText: maVuAnSoTham }).count();
  if (!toast && conO) {
    const ds = await toastGanDay(page, 60_000);
    /**
     * Có thể nút mở một LỚP NHẬP THÔNG TIN (chọn đơn vị nhận, nội dung chuyển…) chứ không phải
     * hộp xác nhận đơn giản — `.ant-modal-confirm-title` không bắt được lớp đó. Liệt kê mọi lớp
     * đang mở kèm nút của nó để lần sau biết phải điền gì, thay vì chỉ nói "vụ vẫn ở tab cũ".
     */
    const lop = page.locator('.ant-modal-content:visible, .ant-drawer-content:visible');
    const mo: string[] = [];
    for (let i = 0; i < (await lop.count()); i++) {
      const chu = (await lop.nth(i).innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300);
      const nutLop = (await lop.nth(i).getByRole('button').allInnerTexts().catch(() => []))
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      mo.push(`[lớp ${i}] nút: ${nutLop.join(' | ') || '(không)'} · chữ: ${chu}`);
    }
    throw new Error(
      `Bấm "Chuyển vụ án" nhưng vụ ${maVuAnSoTham} vẫn nằm ở tab "Chưa chuyển". ` +
        `Thông báo: ${ds.join(' | ') || '(không có)'}. ` +
        `Lớp đang mở: ${mo.join(' ;; ') || '(không có lớp nào)'}`,
    );
  }
  ghi('chuyển hồ sơ phúc thẩm', toast || `vụ ${maVuAnSoTham} đã rời tab "Chưa chuyển"`);

  const ngayChuyenHoSoPhucTham = new Date().toLocaleDateString('vi-VN');
  return { ngayChuyenHoSoPhucTham };
}
