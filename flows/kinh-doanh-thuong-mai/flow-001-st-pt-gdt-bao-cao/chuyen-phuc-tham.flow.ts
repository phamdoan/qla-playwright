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
import { API, layToken } from '../../../common/api-don';
import type { INPUT } from '../../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (khoa: string, giaTri: string) => void;

/** Đường dẫn StepData 8.1 ghi — KHÔNG tồn tại trên STG, giữ lại để đối chiếu tài liệu */
const DUONG_DAN_TAI_LIEU = 'quan-ly-so-tham/dan-su/chuyen-di-phuc-tham';
/** Đường dẫn thật, đo ngày 30/09/2026 */
const DUONG_DAN_THAT = 'vu-an/dan-su/so-tham/ho-so-chuyen-di';
void DUONG_DAN_TAI_LIEU;

/** @param maVuAnSoTham mã vụ án bước 06 sinh (vd. VA26-004950) */
/**
 * Trạng thái bản ghi CHUYỂN ĐI của một vụ, hỏi thẳng máy chủ.
 *
 * Trả về dạng "<mã> = <nghĩa>" để ghi sổ cho người đọc: 999 Chưa chuyển · 000 Chờ tiếp nhận ·
 * 001 Đã tiếp nhận · 002 Từ chối tiếp nhận (qla-webapp types/vu-chuyen.ts).
 */
async function trangThaiChuyenDi(page: Page, maVuAn: string): Promise<string> {
  const token = await layToken(page);
  const r = await page.request.get(
    `${API}/vu-chuyen/dan-su/so-tham/chuyen-di/danh-sach?maVuAn=${encodeURIComponent(maVuAn)}&current=1&pageSize=20`,
    { headers: { authorization: token, accept: 'application/json' } },
  );
  const j: any = await r.json().catch(() => null);
  const ds: any[] = j?.data?.data || j?.data?.content || j?.data || [];
  const dong = ds.find(x => String(x.maVuAn || x.ma || '').includes(maVuAn));
  if (!dong) return `(API không có bản ghi chuyển đi của ${maVuAn})`;
  const ten: Record<string, string> = {
    '999': 'Chưa chuyển',
    '000': 'Chờ tiếp nhận',
    '001': 'Đã tiếp nhận',
    '002': 'Từ chối tiếp nhận',
  };
  const ma = String(dong.trangThai ?? '');
  return `${ma} = ${ten[ma] || '(không rõ)'}`;
}

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
      /**
       * ĐỌC TRẠNG THÁI TRÊN DÒNG, KHÔNG TIN TAB ĐANG MỞ.
       *
       * Lưới màn này KHÔNG tự nạp lại khi đổi tab (đã ghi ở bước 16): bấm "Chờ tiếp nhận" xong lưới
       * vẫn là kết quả của tab trước, nên thấy dòng ở đó KHÔNG có nghĩa là hồ sơ đã chuyển.
       *
       * Hậu quả thật (03/10/2026, case-ds-004): bước 15 báo "đã chuyển ở lượt trước" rồi trả PASSED,
       * trong khi bản ghi vẫn ở trạng thái `999 = Chưa chuyển` — API `/vu-chuyen/dan-su/so-tham/
       * chuyen-di/danh-sach` xác nhận; vụ sang được của case-ds-003 có trạng thái `001 = Đã tiếp
       * nhận`. Xanh giả ở đây làm bước 16 chết oan và tốn bốn lượt chạy đi tìm nhầm chỗ.
       *
       * Nay chỉ coi là đã chuyển khi CHÍNH DÒNG ghi trạng thái đã chuyển; còn ghi "Chưa chuyển" thì
       * đi tiếp xuống phần thực hiện chuyển bên dưới.
       */
      if (/Chờ tiếp nhận|Đã tiếp nhận|Đã thụ lý/i.test(dongCho) && !/Chưa chuyển/i.test(dongCho)) {
        ghi('chuyển hồ sơ phúc thẩm', `đã chuyển ở lượt trước — trạng thái trên dòng: ${dongCho}`);
        return { ngayChuyenHoSoPhucTham: new Date().toLocaleDateString('vi-VN') };
      }
      ghi(
        'chuyển hồ sơ phúc thẩm',
        `dòng có ở tab "Chờ tiếp nhận" nhưng trạng thái CHƯA chuyển → vẫn thực hiện chuyển: ${dongCho.slice(0, 160)}`,
      );
    }
  }

  /**
   * TÊN TAB ĐỔI Ở BẢN FE MỚI (đo 02/10/2026): màn giờ có "Tất cả / Đã ký QĐ, chưa gửi / Đã gửi, chờ
   * tiếp nhận / Đã được tiếp nhận / Bị từ chối tiếp nhận" — không còn "Chưa chuyển". Vụ chờ gửi nằm ở
   * "Đã ký QĐ, chưa gửi". Nhận cả hai tên để chạy được trên môi trường chưa cập nhật.
   */
  const tab = page.getByRole('tab', { name: /Đã ký QĐ, chưa gửi|Chưa chuyển/i }).first();
  if (!(await hienTrong(tab, 20_000))) {
    const dsTab = (await page.getByRole('tab').allInnerTexts().catch(() => []))
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    throw new Error(
      'Màn "Hồ sơ chuyển đi phúc thẩm" không có tab chờ gửi ("Đã ký QĐ, chưa gửi" / "Chưa chuyển").\n' +
        `  Tab đang có: ${dsTab.join(' | ') || '(không đọc được)'}`,
    );
  }
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

  /**
   * TÊN NÚT ĐỔI Ở BẢN FE MỚI (đo 02/10/2026): "Chuyển vụ án (n)" → "Gửi hồ sơ đã chọn" (nút gộp, KHÔNG
   * mang số dòng), kèm nút "Gửi" trên từng dòng. Nhận cả hai tên; nút mới không có "(n)" nên chỉ kiểm
   * trạng thái bật/tắt.
   */
  const nut = page.getByRole('button', { name: /Gửi hồ sơ đã chọn|Chuyển vụ án/i }).first();
  if (!(await hienTrong(nut, 15_000))) {
    const dsNut = [
      ...new Set(
        (await page.locator('main').getByRole('button').allInnerTexts().catch(() => []))
          .map(s => s.replace(/\s+/g, ' ').trim())
          .filter(Boolean),
      ),
    ];
    throw new Error(
      'Màn không có nút gửi hồ sơ ("Gửi hồ sơ đã chọn" / "Chuyển vụ án").\n' +
        `  Nút đang có: ${dsNut.slice(0, 14).join(' | ') || '(không đọc được)'}`,
    );
  }

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
   *   bản cũ: "Chuyển vụ án — Xác nhận chuyển 1 vụ án tới tòa án nhận?" · nút [Hủy] [Chuyển]
   *   bản 02/10/2026: "Gửi hồ sơ chuyển đi — Xác nhận gửi 1 hồ sơ tới Tòa án nhận?" · nút [Hủy] [Gửi]
   * nên `xacNhanHopThoai` (tìm OK/Đồng ý/Xác nhận) không bắt được. Không bấm "Chuyển" thì vụ
   * đứng yên, không toast, không lỗi (đo 30/09/2026).
   */
  for (let lan = 0; lan < 3; lan++) {
    const hop = page
      .locator('.ant-modal-content:visible, .ant-drawer-content:visible')
      .filter({ hasText: /Xác nhận (chuyển .* vụ án|gửi .* hồ sơ)/i })
      .first();
    if (!(await hienTrong(hop, lan === 0 ? 10_000 : 2_000))) break;
    const cauHoi = (await hop.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 120);
    // Modal đang đóng dở vẫn "visible" một nhịp → bấm vào là treo đủ 30s. Bấm hụt thì thôi.
    const daBam = await hop
      .getByRole("button", { name: /^(Gửi|Chuyển|Đồng ý|Xác nhận|OK)$/i })
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

  /**
   * BẰNG CHỨNG CUỐI LẤY TỪ MÁY CHỦ, KHÔNG LẤY TỪ LƯỚI.
   *
   * "Vụ đã rời tab Chưa chuyển" là dấu hiệu yếu: lưới màn này không tự nạp lại khi đổi tab, nên nó
   * từng cho PASSED trong khi hồ sơ CHƯA hề chuyển (03/10/2026, case-ds-004 — bước 16 vì thế chết
   * oan, tốn bốn lượt chạy đi tìm nhầm chỗ).
   *
   * API danh sách chuyển đi trả `trangThai`: 999 = Chưa chuyển · 000 = Chờ tiếp nhận · 001 = Đã tiếp
   * nhận (qla-webapp types/vu-chuyen.ts · TrangThaiVuChuyen). Còn 999 là HỎNG, phải báo ngay.
   */
  const trangThai = await trangThaiChuyenDi(page, maVuAnSoTham).catch((e: Error) => `(không tra được: ${e.message})`);
  ghi('chuyển hồ sơ phúc thẩm', `trạng thái máy chủ: ${trangThai}`);
  if (/^999/.test(trangThai)) {
    throw new Error(
      `Bấm chuyển xong nhưng máy chủ vẫn ghi vụ ${maVuAnSoTham} ở trạng thái "999 = Chưa chuyển" ` +
        `(API /vu-chuyen/dan-su/so-tham/chuyen-di/danh-sach). Hồ sơ CHƯA sang tòa phúc thẩm.`,
    );
  }

  const ngayChuyenHoSoPhucTham = new Date().toLocaleDateString('vi-VN');
  return { ngayChuyenHoSoPhucTham, trangThaiChuyenHoSo: trangThai };
}
