/**
 * FLOW-001 · nghiệp vụ bước 16 — Tòa phúc thẩm tiếp nhận hồ sơ sơ thẩm chuyển đến.
 *
 * Nguồn nghiệp vụ: StepData_KinhDoanhThuongMai_VuAn · Phúc thẩm b2–b5
 *   b2 menu "Quản lý phúc thẩm" › "Hồ sơ chuyển đến"
 *   b3 tab "Chờ tiếp nhận", tìm theo mã vụ án sơ thẩm
 *   b4 dòng vụ án → "Tiếp nhận" → popup "Tiếp nhận vụ chuyển đến"
 *      (Ngày tiếp nhận ≥ ngày chuyển · Cán bộ tiếp nhận · Số tiếp nhận) → "Tiếp nhận"
 *   b5 dòng vụ án → "Thụ lý" → mở chi tiết vụ án phúc thẩm
 *
 * Bước này chạy bằng vai `chanhAnPhucThamHanhChinh` (ông Nguyễn Xuân Kỳ) — khai ở `input.vaiPhucTham`.
 *
 * Đường dẫn: màn sơ thẩm tương ứng là `vu-an/dan-su/so-tham/ho-so-chuyen-di` (đo 30/09/2026), nên
 * thử `…/phuc-tham/ho-so-chuyen-den` trước rồi mới tới các biến thể khác. KHÔNG đi bằng menu:
 * thẻ submenu chứa cả chữ của mục con nên khớp nhãn hay trượt.
 */
import { Locator, Page, expect, test } from '@playwright/test';
import { batLoiApi, choHetSpin, chonNgay, chonSelect, chonSelectTheoThuTu, dienOTheoNhan, go, hienTrong, moTaForm, nghi, nguyenNhanLoi, oTheoNhan, toastGanDay } from '../../../common/antd';
import {
  bieuMauDangMo,
  dongBieuMau,
  laySoVaKyLogic,
  luuBieuMau,
  moKhoi,
  moLaiVaKy,
  moTab,
  nutTheoChu,
  themBieuMauTuDanhSach,
  xacNhanHopThoai,
} from '../../../common/bieu-mau';
import { ddmmyyyy } from '../../../common/du-lieu';
import { taoLichXetXu } from './chuan-bi-xet-xu.flow';
/**
 * Dùng lại hàm của sơ thẩm: khối "Quyết định của Hội đồng xét xử" ở tab Xét xử phúc thẩm cùng tên,
 * cùng nút "Thêm mới quyết định", và hàm đó đã mang sẵn các bài học (nhận ra dòng đã có, mở lại ký
 * nốt khi dòng còn "Chưa có hiệu lực").
 */
import { bangBanAn, lapQuyetDinhHdxx, taiBanScanNeuCan } from './xet-xu.flow';
import { soTatDinh } from '../../../khung/so-tat-dinh';
import { banAnCuaVuAn, layToken } from '../../../common/api-don';
import type { INPUT } from '../../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

type DuLieuVao = typeof INPUT;
type GhiChu = (khoa: string, giaTri: string) => void;

const DUONG_DAN = [
  'vu-an/dan-su/phuc-tham/ho-so-chuyen-den',
  'quan-ly-phuc-tham/dan-su/ho-so-chuyen-den',
  'vu-an/kinh-doanh-thuong-mai/phuc-tham/ho-so-chuyen-den',
];

/** Dòng của vụ trên lưới, tìm theo MÃ VỤ ÁN SƠ THẨM */
function dongVu(page: Page, ma: string): Locator {
  return page.locator('.ant-table-row').filter({ hasText: ma }).first();
}

/**
 * @param maVuAnSoTham mã vụ bước 06 sinh (vd. VA26-004979)
 * @param ngayChuyen   dd/mm/yyyy — ngày bước 15 chuyển hồ sơ; ngày tiếp nhận phải ≥ ngày này
 */
export async function phucThamTiepNhanHoSo(
  page: Page,
  _input: DuLieuVao,
  ghi: GhiChu,
  maVuAnSoTham: string,
  ngayChuyen: string,
) {
  let daMo = false;
  for (const dd of DUONG_DAN) {
    const tv = await page.goto(dd, { waitUntil: 'domcontentloaded' });
    await choHetSpin(page);
    const co = await hienTrong(page.getByRole('tab', { name: /Chờ tiếp nhận/i }).first(), 8_000);
    ghi('màn hồ sơ chuyển đến', `${dd} → HTTP ${tv?.status() ?? '?'} · tab "Chờ tiếp nhận": ${co ? 'có' : 'không'}`);
    if (co) {
      daMo = true;
      break;
    }
  }
  if (!daMo) {
    throw new Error(
      `Không mở được màn "Hồ sơ sơ thẩm chuyển đến" — đã thử: ${DUONG_DAN.join(' , ')}. ` +
        'Cần đo lại đường dẫn thật (menu "Quản lý phúc thẩm" › "Hồ sơ chuyển đến").',
    );
  }

  // Đã tiếp nhận ở lượt trước thì vụ nằm ở tab "Đã tiếp nhận" — nhận ra để chạy lại không hỏng
  const tabDa = page.getByRole('tab', { name: /Đã (được )?tiếp nhận/i }).first();
  if (await hienTrong(tabDa, 8_000)) {
    await tabDa.click();
    await choHetSpin(page);
    await nghi(page, 1200, 1800);
    if (await hienTrong(dongVu(page, maVuAnSoTham), 6_000)) {
      const dong = (await dongVu(page, maVuAnSoTham).innerText()).replace(/\s+/g, ' ').trim();
      ghi('tiếp nhận hồ sơ', `đã tiếp nhận ở lượt trước: ${dong}`);
      return await moChiTietPhucTham(page, ghi, maVuAnSoTham, dong);
    }
  }

  /**
   * MÀN NÀY CÓ HAI HÀNG TAB — phải chọn đúng cả hai.
   *
   * Hàng trên là LOẠI HỒ SƠ ("Tất cả · Vụ án dân sự · Việc dân sự"), hàng dưới mới là trạng thái
   * ("Chờ tiếp nhận · Đã tiếp nhận · Đã thụ lý"). Hàng trên đang ở "Việc dân sự" thì lưới không có vụ
   * án nào, và kịch bản báo "Tab Chờ tiếp nhận không có vụ …" dù hồ sơ đã sang (đo 03/10/2026,
   * case-ds-004: bước 15 ghi rõ vụ đang ở "Chờ tiếp nhận" mà bước 16 không thấy).
   */
  const tabVuAn = page.getByRole('tab', { name: /^Vụ án/ }).first();
  if ((await hienTrong(tabVuAn, 3_000)) && (await tabVuAn.getAttribute('aria-selected')) !== 'true') {
    await tabVuAn.click();
    await choHetSpin(page);
    await nghi(page, 1000, 1500);
  }
  /**
   * BẰNG CHỨNG của hàng tab loại hồ sơ: NHÃN NÚT TIẾP NHẬN đổi theo loại đang chọn —
   * "Tiếp nhận hồ sơ VỤ ÁN đã chọn" hay "… hồ sơ VIỆC DÂN SỰ đã chọn". Chỉ dựa vào `aria-selected`
   * là trượt: đo 03/10/2026 log ghi đã bấm "Vụ án" mà nút vẫn là "việc dân sự", lưới vì thế không có
   * vụ án nào.
   */
  const nhanNutTiepNhan = await page
    .getByRole('button', { name: /Tiếp nhận hồ sơ .* đã chọn/ })
    .first()
    .innerText()
    .catch(() => '');
  ghi('tiếp nhận hồ sơ', `loại hồ sơ đang chọn: ${nhanNutTiepNhan.replace(/\s+/g, ' ').trim() || '(không đọc được)'}`);
  if (/việc dân sự/i.test(nhanNutTiepNhan)) {
    for (const ten of [/^Vụ án dân sự$/, /^Vụ án/, /^Tất cả$/]) {
      const t = page.getByRole('tab', { name: ten }).first();
      if (!(await hienTrong(t, 1_500))) continue;
      await t.click().catch(() => undefined);
      await choHetSpin(page);
      await nghi(page, 900, 1400);
      const lai = await page
        .getByRole('button', { name: /Tiếp nhận hồ sơ .* đã chọn/ })
        .first()
        .innerText()
        .catch(() => '');
      if (!/việc dân sự/i.test(lai)) {
        ghi('tiếp nhận hồ sơ', `đã chuyển loại hồ sơ sang: ${lai.replace(/\s+/g, ' ').trim()}`);
        break;
      }
    }
  }

  /**
   * GỠ THẺ LỌC "Tìm kiếm theo: <mã> ×" — TẢI LẠI TRANG KHÔNG XOÁ ĐƯỢC NÓ.
   *
   * Màn này giữ từ khoá thành một THẺ riêng dưới ô tìm, và app NHỚ bộ lọc qua lần tải lại (đo
   * 03/10/2026, case-ds-004: reload xong thẻ vẫn còn, lưới ghi "Không có dữ liệu"). Xoá chữ trong ô
   * tìm cũng không gỡ thẻ. Kết quả: lưới 0 dòng và kịch bản kết luận nhầm "vụ chưa sang tòa phúc
   * thẩm" — mất ba lượt chạy vì tôi đoán thay vì mở ảnh chụp ra đọc.
   *
   * Gỡ ĐÚNG thẻ: tìm phần tử có chữ là CHÍNH mã vụ án, rồi bấm icon đóng NẰM TRONG nó. Bắt bằng
   * `getByRole('img', {name:/Đóng|close/})` chung chung thì trúng icon khác trên màn.
   */
  for (let i = 0; i < 3; i++) {
    const chuThe = page.getByText(maVuAnSoTham, { exact: true }).first();
    if (!(await hienTrong(chuThe, 2_000))) break;
    const nutXoa = chuThe
      .locator('xpath=.|following-sibling::*|..')
      .getByRole('img', { name: /Đóng|close/i })
      .first();
    if (!(await hienTrong(nutXoa, 2_000))) break;
    await nutXoa.click().catch(() => undefined);
    await choHetSpin(page);
    await nghi(page, 1000, 1500);
    ghi('tiếp nhận hồ sơ', `đã gỡ thẻ lọc "${maVuAnSoTham}" (lần ${i + 1})`);
  }

  const tabCho = page.getByRole('tab', { name: /Chờ tiếp nhận/i }).first();
  if ((await hienTrong(tabCho, 15_000)) && (await tabCho.getAttribute('aria-selected')) !== 'true') {
    await tabCho.click();
    await choHetSpin(page);
    await nghi(page, 1200, 1800);
  }

  /**
   * ĐỌC LƯỚI TRƯỚC, TÌM SAU.
   *
   * Nhãn tab ghi "Tất cả (92)" mà lưới 0 dòng ngay cả sau khi xoá ô tìm và bấm qua lại giữa các
   * tab (đo 30/09/2026) — lưới không tự nạp. Tải lại trang là ra. Gõ tìm kiếm khi lưới đang rỗng
   * chỉ làm lỗi trỏ sai chỗ, nên chỉ tìm khi đã chắc lưới có dữ liệu.
   */
  for (let lan = 0; lan < 2 && !(await page.locator('.ant-table-row').count()); lan++) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await choHetSpin(page);
    await nghi(page, 1800, 2500);
    const lai = page.getByRole('tab', { name: /Chờ tiếp nhận/i }).first();
    if ((await hienTrong(lai, 10_000)) && (await lai.getAttribute('aria-selected')) !== 'true') {
      await lai.click();
      await choHetSpin(page);
      await nghi(page, 1500, 2200);
    }
  }
  const dsCho = (await page.locator('.ant-table-row').allInnerTexts())
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  ghi('màn hồ sơ chuyển đến', `tab "Chờ tiếp nhận": ${dsCho.length} dòng`);
  // In ra để biết các vụ đang chờ thuộc tòa nào — cần khi vụ của mình không có ở đây
  for (const [i, d] of dsCho.slice(0, 5).entries()) ghi(`chờ tiếp nhận [${i + 1}]`, d.slice(0, 200));

  /**
   * KHÔNG GÕ Ô TÌM KIẾM.
   *
   * Đo 30/09/2026: gõ mã vụ án ("VA26-004979") vào ô tìm thì lưới về 0 dòng — kể cả tab
   * "Tất cả (92)" — trong khi chính vụ đó ĐANG NẰM Ở DÒNG ĐẦU khi không tìm. Ô này không khớp
   * theo mã vụ. Chính nó làm tôi kết luận nhầm liên tiếp: "vụ chưa tới tòa này", "sai tòa",
   * "lỗi nạp lưới". Lưới ít dòng nên đọc thẳng là đủ; chỉ tìm khi không thấy vụ.
   */
  const oTim = page.getByRole('searchbox').or(page.getByPlaceholder(/Tìm|Nhập/i)).first();
  if (!(await hienTrong(dongVu(page, maVuAnSoTham), 3_000)) && (await hienTrong(oTim, 5_000))) {
    await go(oTim, maVuAnSoTham);
    await oTim.press('Enter');
    await choHetSpin(page);
    await nghi(page, 1200, 1800);
  }

  const dong = dongVu(page, maVuAnSoTham);
  if (!(await hienTrong(dong, 15_000))) {
    /**
     * Xoá ô tìm rồi nhìn TỪNG TAB: cần phân biệt "gõ sai kiểu chuỗi", "vụ chưa tới" và
     * "tài khoản này thuộc tòa khác nên không thấy". Nhãn tab có sẵn số lượng nên đối chiếu được.
     */
    if (await hienTrong(oTim, 3_000)) {
      await oTim.fill('');
      await oTim.press('Enter');
      await choHetSpin(page);
      await nghi(page, 1200, 1800);
    }
    /**
     * `fill('') + Enter` KHÔNG phải lúc nào cũng gọi lại API: nhãn tab vẫn ghi "Chờ tiếp nhận (3)"
     * trong khi lưới giữ kết quả rỗng của lần tìm trước (đo 30/09/2026, giống hệt màn chuyển đi
     * ở bước 15). Bấm sang tab khác rồi quay lại để ép nạp lại.
     */
    if (!(await page.locator('.ant-table-row').count())) {
      await page.getByRole('tab', { name: /Tất cả/i }).first().click().catch(() => {});
      await choHetSpin(page);
      await nghi(page, 1200, 1800);
      await tabCho.click().catch(() => {});
      await choHetSpin(page);
      await nghi(page, 1500, 2200);
    }
    if (!(await hienTrong(dong, 8_000))) {
      const nhanTab = (await page.getByRole('tab').allInnerTexts())
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      const ds = (await page.locator('.ant-table-row').allInnerTexts())
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean);

      /**
       * Tra sang tab "Tất cả": phân định "tab Chờ tiếp nhận rỗng thật" với "lưới không nạp".
       * Nếu "Tất cả" có dòng mà vụ mình không nằm trong đó thì vụ chưa tới tòa này.
       */
      let oTatCa = '';
      const tabTatCa = page.getByRole('tab', { name: /Tất cả/i }).first();
      if (await hienTrong(tabTatCa, 5_000)) {
        await tabTatCa.click();
        await choHetSpin(page);
        await nghi(page, 1500, 2200);
        const dsTatCa = (await page.locator('.ant-table-row').allInnerTexts())
          .map(s => s.replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        const coVu = dsTatCa.some(x => x.includes(maVuAnSoTham));
        oTatCa =
          `${dsTatCa.length} dòng, ${coVu ? 'CÓ' : 'KHÔNG có'} vụ ${maVuAnSoTham}` +
          (dsTatCa.length ? ` — vd. ${dsTatCa[0].slice(0, 120)}` : '');
      }
      throw new Error(
        `Tab "Chờ tiếp nhận" không có vụ ${maVuAnSoTham} (đã xoá ô tìm). ` +
          `Tab đang có: ${nhanTab.join(' · ') || '(không đọc được)'}. ` +
          `Lưới ${ds.length} dòng: ${ds.slice(0, 4).join(' // ') || '(rỗng)'}. ` +
          `Tra ở tab "Tất cả": ${oTatCa || '(không mở được)'}. ` +
          'Bước 15 ghi đơn vị nhận là "Tòa án nhân dân thành phố Hà Nội".',
      );
    }
  }

  const nut = dong.getByRole('button', { name: /Tiếp nhận/i }).first();
  await expect(nut, `Dòng vụ ${maVuAnSoTham} không có nút "Tiếp nhận"`).toBeVisible({ timeout: 15_000 });
  await nut.click();
  await choHetSpin(page);

  /**
   * "Tiếp nhận" trên DÒNG chỉ ĐIỀU HƯỚNG sang màn chi tiết hồ sơ chuyển đến
   * (`…/ho-so-chuyen-den/chi-tiet/<id hồ sơ>`), popup nằm ở nút "Tiếp nhận" CỦA MÀN ĐÓ
   * (đo 30/09/2026). Bấm tiếp một nấc nữa.
   */
  let hop = bieuMauDangMo(page);
  if (!(await hienTrong(hop, 6_000))) {
    /**
     * Màn chi tiết hồ sơ chuyển đến có các nút (đo 30/09/2026):
     *   Văn bản trả lại · **Lập biên bản giao nhận và tiếp nhận** · Đủ / Thiếu · Đã tống đạt / Chưa
     * StepData b4 viết gọn là "click Tiếp nhận" — thực tế phải xác nhận TÌNH TRẠNG HỒ SƠ
     * (Đủ, Đã tống đạt) rồi mới lập biên bản giao nhận.
     */
    for (const ten of [/^Đủ$/, /^Đã tống đạt$/]) {
      const o = page.getByRole('button', { name: ten }).first();
      if (await hienTrong(o, 4_000)) {
        await o.click().catch(() => {});
        await choHetSpin(page);
        ghi('tiếp nhận', `đánh dấu tình trạng hồ sơ: ${String(ten)}`);
      }
    }
    const nutBienBan = page.getByRole('button', { name: /Lập biên bản giao nhận và tiếp nhận|Mở Biên bản 01-DS/i }).first();
    if (await hienTrong(nutBienBan, 10_000)) {
      ghi('tiếp nhận', 'bấm "Lập biên bản giao nhận và tiếp nhận"');
      await nutBienBan.click();
      await choHetSpin(page);
      hop = bieuMauDangMo(page);
    }
  }
  if (!(await hienTrong(hop, 15_000))) {
    /**
     * Không thấy lớp nào: có thể nút trên dòng mở lớp khác kiểu, hoặc cú bấm trúng Ô CHỮ
     * "Tiếp nhận" (cột Trạng thái cũng ghi đúng chữ đó) chứ không phải nút. Liệt kê để biết.
     */
    const lop = page.locator('.ant-modal-content:visible, .ant-drawer-content:visible');
    const mo: string[] = [];
    for (let i = 0; i < (await lop.count()); i++) {
      mo.push((await lop.nth(i).innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200));
    }
    const nutDong = (await dongVu(page, maVuAnSoTham).getByRole('button').allInnerTexts().catch(() => []))
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const nutTrang = [
      ...new Set(
        (await page.getByRole('button').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean),
      ),
    ];
    throw new Error(
      'Bấm "Tiếp nhận" nhưng không mở được popup "Tiếp nhận vụ chuyển đến". ' +
        `Nút trên dòng: ${nutDong.join(' | ') || '(không có nút nào)'}. ` +
        `Nút trên màn: ${nutTrang.slice(0, 20).join(' | ') || '(không có)'}. ` +
        `Lớp đang mở: ${mo.join(' ;; ') || '(không có)'}. URL: ${page.url()}`,
    );
  }
  for (const d of await moTaForm(hop)) ghi('tiếp nhận · ô', d);

  /**
   * ĐO 30/09/2026 — popup thật là BIÊN BẢN GIAO NHẬN, không phải "Tiếp nhận vụ chuyển đến" như
   * StepData b4.1–b4.2 mô tả. Hệ thống tự điền: Vào hồi · Ngày giao nhận · Tại (địa điểm) ·
   * Cơ quan được yêu cầu · Người nhận tài liệu. Ba ô tài liệu nhắc ("Ngày tiếp nhận",
   * "Cán bộ tiếp nhận", "Số tiếp nhận") KHÔNG tồn tại.
   *
   * Còn trống 4 ô, điền từ dữ liệu gieo; `undefined` = lấy mục đầu theo thứ tự chữ cái.
   */
  const soTiepNhanPhucTham = soTatDinh(maVuAnSoTham, 'soTiepNhanPhucTham', 6);
  void ngayChuyen;
  for (const [nhan, giaTri] of [
    [/^Họ tên người đại diện$/, _input.tenNguoiGiaoHoSo],
    [/^Chức vụ của người đại diện$/, _input.chucVuNguoiGiaoHoSo],
    [/^Tư cách$/, undefined],
    [/^Số bút lục$/, soTiepNhanPhucTham],
  ] as [RegExp, string | undefined][]) {
    const gt = await dienOTheoNhan(page, hop, nhan, giaTri).catch(async (e: Error) => {
      await page.keyboard.press('Escape').catch(() => {});
      ghi('tiếp nhận', `không điền được ${String(nhan)}: ${e.message.slice(0, 110)}`);
      return '';
    });
    if (gt) ghi('tiếp nhận', `${String(nhan)} = ${gt}`);
    await choHetSpin(page);
  }

  /**
   * Nút chốt của biên bản giao nhận chưa biết tên chắc chắn — thử các tên hay gặp, không thấy thì
   * liệt kê nút đang có để lượt sau khỏi đoán.
   */
  const nutChot = hop
    .getByRole('button', { name: /^(Tiếp nhận|Lưu|Xác nhận|Đồng ý|Hoàn thành)$/i })
    .first();
  /**
   * Biên bản ĐÃ KÝ ở lượt trước thì mở lại chỉ còn "In biểu mẫu | Lịch sử | Đóng" — không còn nút
   * lưu. Đó là trạng thái HỢP LỆ, không phải lỗi: đóng lại rồi đi tiếp tới bước chốt tiếp nhận.
   */
  if (!(await hienTrong(nutChot, 8_000))) {
    const ds = (await hop.getByRole('button').allInnerTexts())
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    ghi('tiếp nhận', `biên bản giao nhận đã ký từ lượt trước (nút: ${ds.join(' | ') || 'không có'})`);
    await dongBieuMau(page, hop);
    await choHetSpin(page);
  } else {
    ghi('tiếp nhận', `bấm nút chốt "${(await nutChot.innerText()).replace(/\s+/g, ' ').trim()}"`);
    await nutChot.click();
    await choHetSpin(page);
  }

  /**
   * LƯU THÔI CHƯA ĐỦ: lưu xong màn đổi nút thành "Mở Biên bản 01-DS" + "Sửa" mà vụ VẪN ở tab
   * "Chờ tiếp nhận" (đo 30/09/2026). Biên bản giao nhận phải được KÝ thì việc tiếp nhận mới
   * hoàn tất — cùng luật với mọi biểu mẫu khác của hệ thống.
   */
  if (await hienTrong(hop, 5_000)) {
    await laySoVaKyLogic(page, hop, ghi, 'biên bản giao nhận 01-DS');
    await dongBieuMau(page, hop);
    await choHetSpin(page);
    await nghi(page, 1200, 1800);
  }

  /**
   * Ký biên bản xong vụ VẪN chưa sang "Đã tiếp nhận" (đo 30/09/2026) — màn chi tiết mở thêm nút
   * chốt việc tiếp nhận sau khi biên bản có hiệu lực. Bấm nốt, và ghi lại những nút đang có để
   * lần sau đọc sổ cái là biết trình tự thật.
   */
  const nutCuoi = page.getByRole('button', { name: /Tiếp nhận hồ sơ|Hoàn tất tiếp nhận|^Tiếp nhận$/i }).first();
  if (await hienTrong(nutCuoi, 8_000)) {
    ghi('tiếp nhận', `bấm nút chốt tiếp nhận: "${(await nutCuoi.innerText()).replace(/\s+/g, ' ').trim()}"`);
    await nutCuoi.click();
    await choHetSpin(page);
    await nghi(page, 1200, 1800);

    /**
     * StepData b5 nói bấm "Thụ lý" trên DÒNG ở tab "Đã tiếp nhận" — thực tế dòng đó chỉ có
     * "Chi tiết" (đo 30/09/2026). Nút "Thụ lý" nằm ngay trên MÀN CHI TIẾT HỒ SƠ sau khi tiếp
     * nhận xong, nên thử luôn ở đây.
     */
    /**
     * NHẮM ĐÚNG NÚT, TRÁNH THANH ĐIỀU HƯỚNG.
     *
     * Tìm toàn trang theo /Thụ lý/i thì trúng mục menu trên cùng "Đơn - HCTP Tiếp nhận, THỤ LÝ và
     * văn thư 27" → bấm xong vẫn đứng nguyên màn hồ sơ chuyển đến (đo 03/10/2026, case-ds-004).
     * Nút thật của màn tên là "Mở vụ án phúc thẩm để thụ lý"; bản khác đặt tên ngắn thì tìm trong
     * vùng nội dung chính, không tìm cả trang.
     */
    const nutThuLy = page
      .getByRole('button', { name: /Mở vụ án phúc thẩm để thụ lý/i })
      .or(page.locator('main, .ant-layout-content').getByRole('button', { name: /^Thụ lý/i }))
      .first();
    if (await hienTrong(nutThuLy, 8_000)) {
      ghi('tiếp nhận', `bấm "${(await nutThuLy.innerText()).replace(/\s+/g, ' ').trim()}" trên màn chi tiết hồ sơ`);
      await nutThuLy.click();
      await choHetSpin(page);
      await nghi(page, 1500, 2200);
    } else {
      const ds = [
        ...new Set(
          (await page.getByRole('button').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean),
        ),
      ];
      ghi('tiếp nhận', `sau khi tiếp nhận, màn có nút: ${ds.slice(0, 15).join(' | ') || '(không có)'}`);
    }
  } else {
    const ds = [
      ...new Set(
        (await page.getByRole('button').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean),
      ),
    ];
    ghi('tiếp nhận', `sau khi ký biên bản, màn có nút: ${ds.slice(0, 15).join(' | ') || '(không có)'}`);
  }
  await choHetSpin(page);
  await nghi(page, 1500, 2500);

  // Bằng chứng do hệ thống cấp: toast, hoặc vụ đã sang tab "Đã tiếp nhận"
  const toast = (await toastGanDay(page, 60_000)).find(t => /tiếp nhận/i.test(t));
  if (toast) ghi('tiếp nhận hồ sơ', toast);

  /**
   * PHẢI QUAY LẠI DANH SÁCH rồi mới kiểm: sau khi lưu biên bản ta vẫn đứng ở màn chi tiết hồ sơ,
   * nơi KHÔNG có tab "Đã tiếp nhận" — kiểm tại chỗ thì luôn trượt dù biên bản đã lưu xong
   * (đo 30/09/2026: toast "Lưu quyết định thành công" mà bước vẫn báo hỏng).
   */
  await page.goto(DUONG_DAN[0], { waitUntil: 'domcontentloaded' });
  await choHetSpin(page);
  await nghi(page, 1500, 2200);
  const tabDaSau = page.getByRole('tab', { name: /Đã (được )?tiếp nhận/i }).first();
  if (await hienTrong(tabDaSau, 15_000)) {
    await tabDaSau.click();
    await choHetSpin(page);
    await nghi(page, 1500, 2200);
  }
  if (!(await hienTrong(dongVu(page, maVuAnSoTham), 15_000))) {
    const nhanTab = (await page.getByRole('tab').allInnerTexts())
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const ds = (await page.locator('.ant-table-row').allInnerTexts())
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    throw new Error(
      `Lưu biên bản giao nhận xong nhưng vụ ${maVuAnSoTham} không sang tab "Đã tiếp nhận". ` +
        `Tab: ${nhanTab.join(' · ')}. Lưới ${ds.length} dòng: ${ds.slice(0, 3).join(' // ') || '(rỗng)'}. ` +
        `Thông báo: ${(await toastGanDay(page, 120_000)).join(' | ') || '(không có)'}`,
    );
  }
  const dongDa = (await dongVu(page, maVuAnSoTham).innerText()).replace(/\s+/g, ' ').trim();
  ghi('tiếp nhận hồ sơ', dongDa);
  return await moChiTietPhucTham(page, ghi, maVuAnSoTham, dongDa, soTiepNhanPhucTham);
}

/**
 * StepData b5: bấm "Thụ lý" trên dòng để mở CHI TIẾT VỤ ÁN PHÚC THẨM — id của vụ phúc thẩm chỉ
 * lấy được từ URL sau khi mở, không suy ra từ vụ sơ thẩm.
 */
async function moChiTietPhucTham(
  page: Page,
  ghi: GhiChu,
  maVuAnSoTham: string,
  dong: string,
  soTiepNhan = '',
) {
  /**
   * StepData b5: bấm "Thụ lý" trên dòng để mở màn vụ án phúc thẩm. Ưu tiên đúng nút đó; "Chi tiết"
   * chỉ mở lại màn HỒ SƠ CHUYỂN ĐẾN, không phải vụ án — id lấy từ đó là id hồ sơ, dùng cho bước
   * 17–23 sẽ sai (đo 30/09/2026).
   */
  for (const ten of [/Thụ lý/i, /Chi tiết|Xem/i]) {
    const nut = dongVu(page, maVuAnSoTham).getByRole('button', { name: ten }).first();
    if (!(await hienTrong(nut, 6_000))) continue;
    ghi('vụ án phúc thẩm', `bấm "${(await nut.innerText()).replace(/\s+/g, ' ').trim()}" trên dòng vụ`);
    await nut.click();
    await choHetSpin(page);
    await nghi(page, 1500, 2200);
    if (!/ho-so-chuyen-den/.test(page.url())) break;

    /**
     * Bấm "Chi tiết" chỉ mở lại MÀN HỒ SƠ CHUYỂN ĐẾN. Nút "Thụ lý" — thứ mở màn VỤ ÁN phúc thẩm —
     * nằm trên chính màn đó (StepData b5 ghi nhầm là nút trên dòng danh sách).
     */
    /**
     * NHẮM ĐÚNG NÚT, TRÁNH THANH ĐIỀU HƯỚNG.
     *
     * Tìm toàn trang theo /Thụ lý/i thì trúng mục menu trên cùng "Đơn - HCTP Tiếp nhận, THỤ LÝ và
     * văn thư 27" → bấm xong vẫn đứng nguyên màn hồ sơ chuyển đến (đo 03/10/2026, case-ds-004).
     * Nút thật của màn tên là "Mở vụ án phúc thẩm để thụ lý"; bản khác đặt tên ngắn thì tìm trong
     * vùng nội dung chính, không tìm cả trang.
     */
    const nutThuLy = page
      .getByRole('button', { name: /Mở vụ án phúc thẩm để thụ lý/i })
      .or(page.locator('main, .ant-layout-content').getByRole('button', { name: /^Thụ lý/i }))
      .first();
    if (await hienTrong(nutThuLy, 8_000)) {
      ghi('vụ án phúc thẩm', `bấm "${(await nutThuLy.innerText()).replace(/\s+/g, ' ').trim()}" trên màn hồ sơ`);
      await nutThuLy.click();
      await choHetSpin(page);
      await nghi(page, 1500, 2200);
      if (!/ho-so-chuyen-den/.test(page.url())) break;
    } else {
      const ds = [
        ...new Set(
          (await page.getByRole('button').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean),
        ),
      ];
      ghi('vụ án phúc thẩm', `màn hồ sơ đang có nút: ${ds.slice(0, 15).join(' | ') || '(không có)'}`);
    }
  }

  /**
   * id nằm ở HAI DẠNG tuỳ màn: `?id=<uuid>` (màn chi tiết vụ án) hoặc đoạn cuối đường dẫn
   * (`…/ho-so-chuyen-den/chi-tiet/<uuid>`). Lấy cả hai, và PHẢI là màn vụ án phúc thẩm —
   * id của hồ sơ chuyển đến không dùng cho các bước 17–23.
   */
  const u = new URL(page.url());
  const id =
    u.searchParams.get('id') ||
    (u.pathname.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) || [''])[0];
  if (/ho-so-chuyen-den/.test(u.pathname)) {
    throw new Error(
      'Sau khi tiếp nhận vẫn đang ở màn HỒ SƠ CHUYỂN ĐẾN, chưa mở được màn vụ án phúc thẩm. ' +
        `URL: ${page.url()}. StepData b5: bấm "Thụ lý" trên dòng vụ ở tab "Đã tiếp nhận".`,
    );
  }
  if (!id) {
    throw new Error(
      `Không lấy được id vụ án phúc thẩm — URL sau khi bấm mở chi tiết: ${page.url()}. ` +
        `Dòng vụ: ${dong.slice(0, 160)}`,
    );
  }
  ghi('vụ án phúc thẩm', `id ${id} · ${page.url()}`);
  return {
    idVuAnPhucTham: id,
    soTiepNhanPhucTham: soTiepNhan || (dong.match(/\d{4,}/) || [''])[0] || dong.slice(0, 60),
  };
}

// ═════════ BƯỚC 17 · Thụ lý phúc thẩm → Thông báo thụ lý phúc thẩm (65-DS) ═════════
/**
 * Nguồn nghiệp vụ: StepData · Phúc thẩm Step1.1–1.9
 *   1.1 tab "Thụ lý" → nút "Thụ lý" → popup "Thụ lý vụ án dân sự"
 *   1.2 "Trường hợp thụ lý" = "Thụ lý phúc thẩm theo kháng cáo"
 *   1.4 "Ngày thụ lý" ≥ ngày tiếp nhận · 1.5 "Số thụ lý" hệ thống tự sinh
 *   1.6 "Nguyên đơn đại diện" / "Bị đơn đại diện" chọn theo đương sự sơ thẩm
 *   1.8 section "Thông báo thụ lý" → "Lập thông báo" (65-DS) → Lưu → Lấy số → Ký logic → Đóng
 */
export async function phucThamThuLy(page: Page, input: DuLieuVao, ghi: GhiChu) {
  await moTab(page, 'Thụ lý');
  await choHetSpin(page);
  let soTuForm = '';
  let ngayTuForm = '';

  // Tên trợ năng có icon phía trước → neo đầu chuỗi là trượt; neo CUỐI để không trúng
  // "Thông tin thụ lý phúc thẩm".
  /**
   * ĐÃ THỤ LÝ RỒI THÌ KHÔNG MỞ POPUP.
   *
   * Nút "Thụ lý" vẫn còn kể cả khi vụ đã thụ lý; mở ra bấm "Lưu" lần hai thì hệ thống TỪ CHỐI
   * IM LẶNG — popup không đóng, không toast, không lỗi validate (đo 01/10/2026, sau khi người
   * dùng thụ lý bằng tay). Vì vậy đọc số thụ lý trên màn trước: có rồi thì bỏ qua bước lập.
   */
  const chuTruoc = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  const daThuLy = /Số thụ lý:?\s*[0-9]/i.test(chuTruoc);
  if (daThuLy) ghi('thụ lý PT', 'vụ đã thụ lý từ trước — bỏ qua popup, đi thẳng tới 65-DS');

  const nut = page.getByRole('button', { name: /Thụ lý$/i }).first();
  if (!daThuLy && (await hienTrong(nut, 10_000))) {
    await nut.click();
    await choHetSpin(page);

    /**
     * NEO POPUP THEO TIÊU ĐỀ, không dùng `bieuMauDangMo` ("lớp đang mở ngoài cùng"): popup đóng
     * rồi thì locator đó trỏ sang lớp khác và phép kiểm "đã đóng chưa" báo oan là chưa đóng —
     * đúng cái bẫy đã gặp ở modal lịch xét xử (bước 10) và lớp soạn thảo bản án (bước 12).
     * Người dùng xác nhận 01/10/2026: bấm "Lưu" bằng tay thì ăn và vụ chuyển sang tab "Phân công".
     */
    const hop = page
      .locator('.ant-modal-content:visible, .ant-drawer-content:visible')
      .filter({ hasText: /Thụ lý vụ án dân sự/i })
      .first();
    await expect(hop, 'Bấm "Thụ lý" nhưng không mở được popup "Thụ lý vụ án dân sự"').toBeVisible({
      timeout: 30_000,
    });
    for (const d of await moTaForm(hop)) ghi('thụ lý PT · ô', d);

    /**
     * NHÃN CÓ DẤU SAO của ô bắt buộc ("* Trường hợp thụ lý") nên neo đầu chuỗi là trượt — neo CUỐI.
     * Hệ thống đã tự điền sẵn cả 6 ô (kể cả Số thụ lý và hai đương sự đại diện); `dienOTheoNhan`
     * thấy ô đã có giá trị thì trả về chính giá trị đó, nên vòng này chủ yếu để ĐỌC và ghi sổ.
     */
    for (const [nhan, giaTri] of [
      [/Trường hợp thụ lý/, input.truongHopThuLyPhucTham],
      [/Ngày thụ lý/, ddmmyyyy(new Date())],
      [/Nguyên đơn đại diện/, input.nguyenDon.hoTen],
      [/Bị đơn đại diện/, input.biDon.hoTen],
    ] as [RegExp, string | undefined][]) {
      const gt = await dienOTheoNhan(page, hop, nhan, giaTri).catch(async (e: Error) => {
        await page.keyboard.press('Escape').catch(() => {});
        ghi('thụ lý PT', `không điền được ${String(nhan)}: ${e.message.slice(0, 110)}`);
        return '';
      });
      if (gt) ghi('thụ lý PT', `${String(nhan)} = ${gt}`);
      await choHetSpin(page);
    }

    // Số/ngày thụ lý do HỆ THỐNG cấp sẵn trong popup — đọc ngay tại đây, chắc hơn đọc lại từ màn
    // Ô "Số thụ lý" BỊ KHOÁ (hệ thống tự cấp) — dienOTheoNhan trả rỗng cho ô không sửa được,
    // nên đọc thẳng giá trị của ô.
    soTuForm = (await oTheoNhan(page, hop, /Số thụ lý/).inputValue().catch(() => '')).trim();
    ngayTuForm = await dienOTheoNhan(page, hop, /Ngày thụ lý/).catch(() => '');

    /**
     * Popup thụ lý KHÔNG chắc có nút tên "Lưu" — `luuBieuMau` mặc định tìm `^Lưu$` và nếu không
     * thấy thì THOÁT IM LẶNG (trả false, không log). Hậu quả: thụ lý không được lưu, rồi 65-DS
     * báo "Vụ án phải ở trạng thái đã thụ lý" — lỗi hiện ở bước sau, rất khó lần ngược
     * (đo 01/10/2026). Liệt kê nút rồi nới tên nút lưu.
     */
    const nutHop = (await hop.getByRole('button').allInnerTexts().catch(() => []))
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    ghi('thụ lý PT', `nút trên popup: ${nutHop.join(' | ') || '(không có)'}`);
    await luuBieuMau(page, hop, 'thụ lý phúc thẩm', ghi, /^(Lưu|Thụ lý|Xác nhận|Đồng ý)$/i);

    /**
     * Lưu được thì popup ĐÓNG. Còn mở nghĩa là chưa lưu — và hậu quả chỉ lộ ra ở bước sau
     * ("Vụ án phải ở trạng thái đã thụ lý" khi lập 65-DS). Chặn ngay tại đây, kèm lý do.
     */
    if (await hienTrong(hop, 3_000)) {
      for (const d of await moTaForm(hop)) ghi('thụ lý PT · sau khi lưu', d);
      const lop = page.locator('.ant-modal-content:visible, .ant-drawer-content:visible');
      const mo: string[] = [];
      for (let i = 0; i < (await lop.count()); i++) {
        mo.push((await lop.nth(i).innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160));
      }
      throw new Error(
        `Bấm "Lưu" nhưng popup thụ lý phúc thẩm không đóng — ${await nguyenNhanLoi(page, hop)}. ` +
          `Lớp đang mở: ${mo.join(' ;; ') || '(không có)'}`,
      );
    }
    await dongBieuMau(page, hop);
    await choHetSpin(page);
    await moTab(page, 'Thụ lý');
  } else {
    const ds = [
      ...new Set(
        (await page.getByRole('button').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean),
      ),
    ];
    ghi('thụ lý PT', `không thấy nút "Thụ lý". Nút trên tab: ${ds.slice(0, 18).join(' | ') || '(không có)'}`);
  }

  /**
   * Số/ngày thụ lý do HỆ THỐNG cấp — đọc lại từ màn, không gieo. Màn sơ thẩm ghi gộp
   * "Số thụ lý  <số>/<năm>/TLST-… ngày dd/mm/yyyy"; màn phúc thẩm dùng ký hiệu TLPT.
   */
  const chu = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const gop = chu.match(/Số thụ lý:?\s*([0-9]+\/\d{4}\/[A-ZĐ-]+)\s*ngày\s*(\d{2}\/\d{2}\/\d{4})/i);
  const soThuLyPhucTham = soTuForm || gop?.[1] || (chu.match(/Số thụ lý:?\s*([0-9][0-9/-]*)/i) || [])[1] || '';
  const ngayThuLyPhucTham = ngayTuForm || gop?.[2] || (chu.match(/Ngày thụ lý:?\s*(\d{2}\/\d{2}\/\d{4})/i) || [])[1] || '';
  ghi('thụ lý PT', `số ${soThuLyPhucTham || '(trống)'} · ngày ${ngayThuLyPhucTham || '(trống)'}`);
  expect(soThuLyPhucTham, 'Tab Thụ lý phúc thẩm không có "Số thụ lý"').not.toBe('');

  // ── 1.8–1.9: thông báo thụ lý phúc thẩm (65-DS) ──
  const khoi = page
    .locator('div')
    .filter({ hasText: /Thông báo thụ lý/i })
    .filter({ has: page.getByRole('button', { name: /Lập thông báo|Thêm mới thông báo/i }) })
    .last();
  let soThongBao65DS = '(chưa lập)';
  if (await hienTrong(khoi, 8_000)) {
    const daCo = khoi.locator('.ant-table-row').first();
    if (await hienTrong(daCo, 3_000)) {
      soThongBao65DS = (await daCo.innerText()).replace(/\s+/g, ' ').trim();
      ghi('65DS', `đã có ở lượt trước: ${soThongBao65DS}`);
    } else {
      await khoi.getByRole('button', { name: /Lập thông báo|Thêm mới thông báo/i }).first().click();
      await choHetSpin(page);
      const bm = bieuMauDangMo(page);
      await expect(bm, 'Không mở được biểu mẫu 65-DS').toBeVisible({ timeout: 60_000 });
      for (const d of await moTaForm(bm)) ghi('65DS · ô', d);

      /**
       * Ô bắt buộc: "ngày ban hành thông báo" và "nội dung/vấn đề cần giải quyết".
       * "Người ký ban hành" mặc định rơi vào Phó Chánh án — ĐẶT LẠI thành tài khoản đang chạy,
       * nếu không thông báo chỉ "Chờ ký" chứ không ban hành (bài học từ 62-DS ở bước 14).
       */
      for (const [nhan, giaTri] of [
        [/Ngày ban hành thông báo/i, ddmmyyyy(new Date())],
        [/Người ký ban hành/i, input.nguoiKyPhucTham],
        [/vấn đề cần giải quyết|Nội dung/i, input.noiDungThongBao65DS],
      ] as [RegExp, string | undefined][]) {
        const gt = await dienOTheoNhan(page, bm, nhan, giaTri, /Người ký/i.test(String(nhan))).catch(async (e: Error) => {
          await page.keyboard.press('Escape').catch(() => {});
          ghi('65DS', `không điền được ${String(nhan)}: ${e.message.slice(0, 110)}`);
          return '';
        });
        if (gt) ghi('65DS', `${String(nhan)} = ${gt}`);
        await choHetSpin(page);
      }

      await luuBieuMau(page, bm, '65DS (thông báo thụ lý phúc thẩm)', ghi);
      /**
       * Lưu xong mà biểu mẫu vẫn chỉ có "Lưu | Đóng" (không hiện "Lấy số"/"Ký logic") thì bản ghi
       * CHƯA được tạo — soi lại toàn bộ ô và thông báo để biết vì sao, thay vì đi tiếp rồi báo
       * xanh với bằng chứng rỗng (đo 01/10/2026).
       */
      const nutSauLuu = (await bm.getByRole('button').allInnerTexts().catch(() => []))
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      if (!nutSauLuu.some(x => /Lấy số|Ký logic|Trình ký|Xác nhận đã ký/i.test(x))) {
        for (const d of await moTaForm(bm)) ghi('65DS · sau khi lưu', d);
        ghi('65DS · sau khi lưu', `nút: ${nutSauLuu.join(' | ')} · ${await nguyenNhanLoi(page, bm)}`);
      }
      await laySoVaKyLogic(page, bm, ghi, '65DS (thông báo thụ lý phúc thẩm)');
      await dongBieuMau(page, bm);
      await choHetSpin(page);
      await moTab(page, 'Thụ lý');
      /**
       * BẰNG CHỨNG PHẢI LÀ DÒNG THẬT trong bảng. Bản trước trả chuỗi
       * "(lập xong nhưng không đọc lại được dòng)" rồi vẫn báo xanh — trong khi 65-DS mới chỉ ở
       * trạng thái Dự thảo (biểu mẫu chỉ có nút "Lưu | Đóng", chưa Lấy số, chưa Ký).
       * Quét CẢ TAB chứ không chỉ trong khối, vì nút của khối đổi tên sau khi đã có thông báo.
       */
      soThongBao65DS = (
        await page
          .locator('.ant-table-row')
          .filter({ hasText: /65-DS|thụ lý/i })
          .first()
          .innerText()
          .catch(() => '')
      )
        .replace(/\s+/g, ' ')
        .trim();
      if (!soThongBao65DS) {
        const ds = (await page.locator('.ant-table-row').allInnerTexts())
          .map(s => s.replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        throw new Error(
          'Lập 65-DS xong nhưng không thấy dòng thông báo thụ lý nào trên tab. ' +
            `Lưới ${ds.length} dòng: ${ds.slice(0, 4).join(' // ') || '(rỗng)'}`,
        );
      }
      ghi('65DS', soThongBao65DS);
    }
  } else {
    ghi('65DS', 'không thấy khối "Thông báo thụ lý" trên tab Thụ lý');
  }

  return { soThuLyPhucTham, ngayThuLyPhucTham, soThongBao65DS };
}

// ═════════ BƯỚC 18 · Phân công HĐXX phúc thẩm (84-DS) ═════════
/**
 * Nguồn nghiệp vụ: StepData · Phúc thẩm Step2.1–2.6
 *   2.1 section "Phân công người tiến hành tố tụng" → "Thêm phân công"
 *   2.2 chọn "Quyết định phân công … (phúc thẩm) (84-DS)"
 *   2.3 "Ngày quyết định"; "Người ký/người phân công" = tài khoản đang chạy
 *   2.4 HĐXX 03 Thẩm phán: 01 chủ tọa + 02 thành viên, và 01 Thư ký
 *   2.5 Lưu → Lấy số → Ký logic → Đóng
 *
 * Khớp tên nút/nhãn theo kiểu LỎNG ngay từ đầu: suốt luồng này tên trợ năng hay có icon phía
 * trước, nhãn ô bắt buộc có dấu sao và khoảng trắng thừa — neo hai đầu là trượt.
 */
export async function phucThamPhanCong(page: Page, input: DuLieuVao, ghi: GhiChu) {
  await moTab(page, 'Phân công');
  await choHetSpin(page);

  const bang = page.locator('.ant-table-row');
  const daCo = await bang.filter({ hasText: /Thẩm phán|Thư ký|Hội thẩm/i }).count();
  if (daCo) {
    const ds = (await bang.allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
    ghi('phân công PT', `đã có ${daCo} dòng ở lượt trước: ${ds.slice(0, 3).join(' / ')}`);
    return { soQuyetDinh84DS: ds[0] || `${daCo} dòng` };
  }

  /**
   * DÙNG TÊN CHÍNH XÁC. Header của khối cũng là một `button` và tên trợ năng của nó GỘP cả chữ
   * của các nút con: "Phân công người tiến hành tố tụng Thêm phân công Thay đổi phân công".
   * Khớp lỏng + `.first()` thì trúng header, bấm vào chỉ đóng/mở khối chứ không mở biểu mẫu
   * (đo 01/10/2026). Đây là mặt trái của bài học "khớp lỏng" — lỏng quá thì trúng thẻ cha.
   */
  const nutThem = page.getByRole('button', { name: 'Thêm phân công', exact: true }).first();
  if (!(await hienTrong(nutThem, 10_000))) {
    const nut = [
      ...new Set(
        (await page.getByRole('button').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean),
      ),
    ];
    throw new Error(`Tab "Phân công" không có nút thêm phân công. Nút đang có: ${nut.slice(0, 18).join(' | ')}`);
  }
  await nutThem.click();
  await choHetSpin(page);

  // Có thể là menu chọn loại quyết định (như PC-001/002/004 ở sơ thẩm) — chọn đúng 84-DS
  const muc = page.getByRole('menuitem', { name: /84-DS|phúc thẩm/i }).first();
  if (await hienTrong(muc, 5_000)) {
    ghi('phân công PT', `chọn mục "${(await muc.innerText()).replace(/\s+/g, ' ').trim()}"`);
    await muc.click();
    await choHetSpin(page);
  }

  const bm = bieuMauDangMo(page);
  if (!(await hienTrong(bm, 20_000))) {
    const mucMenu = [
      ...new Set(
        (await page.getByRole('menuitem').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean),
      ),
    ];
    const nut = [
      ...new Set(
        (await page.getByRole('button').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean),
      ),
    ];
    throw new Error(
      'Bấm thêm phân công nhưng không mở được biểu mẫu 84-DS. ' +
        `Menu đang có: ${mucMenu.slice(-12).join(' | ') || '(không có)'}. ` +
        `Nút trên màn: ${nut.slice(0, 18).join(' | ') || '(không có)'}. URL: ${page.url()}`,
    );
  }
  for (const d of await moTaForm(bm)) ghi('84DS · ô', d);

  for (const [nhan, giaTri] of [
    [/Ngày quyết định/i, ddmmyyyy(new Date())],
    [/Người ký|người phân công/i, input.nguoiKyPhucTham],
  ] as [RegExp, string | undefined][]) {
    const gt = await dienOTheoNhan(page, bm, nhan, giaTri, /Người ký/i.test(String(nhan))).catch(
      async (e: Error) => {
        await page.keyboard.press('Escape').catch(() => {});
        ghi('84DS', `không điền được ${String(nhan)}: ${e.message.slice(0, 110)}`);
        return '';
      },
    );
    if (gt) ghi('84DS', `${String(nhan)} = ${gt}`);
    await choHetSpin(page);
  }

  // HĐXX phúc thẩm: 01 chủ tọa + 02 thành viên + 01 thư ký (StepData 2.4)
  const oVaiTro = oTheoNhan(page, bm, /Vai trò/i);
  const oNguoi = oTheoNhan(page, bm, /Tên người được phân công|Họ và tên/i);
  const nutThemDong = bm.locator('button:has(.anticon-arrow-down)').first();
  const daChon: string[] = [];
  let daThem = 0;
  for (const [vaiTro, soNguoi] of [
    [input.vaiTroThamPhanChuToaPhucTham, 1],
    [input.vaiTroThamPhanThanhVien, 2],
    [input.vaiTroThuKy, 1],
  ] as [string, number][]) {
    for (let i = 0; i < soNguoi; i++) {
      const xong = await test
        .step(`Thêm ${vaiTro} (${i + 1}/${soNguoi})`, async () => {
          await chonSelect(page, oVaiTro, vaiTro);
          await choHetSpin(page);
          /**
           * ⚠ CHỦ TỌA PHẢI LÀ TÀI KHOẢN ĐANG CHẠY, không lấy người đầu danh mục.
           *
           * Bản án phúc thẩm 75-DS khoá cứng "Người ký" = thẩm phán chủ tọa của HĐXX: ô là
           * `ProFormText ... disabled` và giá trị do `layDanhSachHoiDongXetXu` nạp vào
           * (`BanAnPhucThamForm.tsx:595-609, 987-989`). Nút ký thì chỉ hiện "Ký logic" cho CHÍNH
           * người ký (`VanBanCapSoActions` → `laNguoiKyHienTai`). Chủ tọa khác tài khoản đang chạy
           * thì bản án chỉ "Trình ký" được và đứng mãi ở "Dự thảo — chưa ký số" — bước 22 không thể
           * xanh (đo 02/10/2026: chủ tọa là người đầu danh mục nên bước 22 tắc).
           */
          const nguoi =
            vaiTro === input.vaiTroThamPhanChuToaPhucTham
              ? await chonSelect(page, oNguoi, input.nguoiKyPhucTham)
              : await chonSelectTheoThuTu(page, oNguoi, 0, daChon);
          daChon.push(nguoi);
          const truoc = await bm.locator('.ant-table-row').count();
          await nutThemDong.click();
          await expect
            .poll(() => bm.locator('.ant-table-row').count(), {
              message: `Bấm thêm nhưng ${vaiTro} (${nguoi}) không vào bảng`,
              timeout: 30_000,
            })
            .toBeGreaterThan(truoc);
          daThem++;
          ghi(`84DS · người ${daThem}`, `${vaiTro} — ${nguoi}`);
          return true;
        })
        .catch((e: Error) => {
          ghi('84DS', `không thêm được ${vaiTro}: ${e.message.slice(0, 110)}`);
          return false;
        });
      if (!xong) break;
    }
  }

  await luuBieuMau(page, bm, '84DS (phân công HĐXX phúc thẩm)', ghi);
  await laySoVaKyLogic(page, bm, ghi, '84DS (phân công HĐXX phúc thẩm)');
  await dongBieuMau(page, bm);
  await choHetSpin(page);
  await moTab(page, 'Phân công');

  const dong = (await page.locator('.ant-table-row').first().innerText().catch(() => ''))
    .replace(/\s+/g, ' ')
    .trim();
  if (!dong) throw new Error('Lập 84-DS xong nhưng tab "Phân công" vẫn không có dòng nào');
  ghi('84DS', dong);
  expect(daThem, 'Không thêm được người tiến hành tố tụng nào').toBeGreaterThan(0);
  return { soQuyetDinh84DS: dong };
}

/** Khối của tab, neo theo TIÊU ĐỀ + NÚT (nhiều khối không phải ant-card) */
function khoiPT(page: Page, tieuDe: RegExp, tenNut: RegExp): Locator {
  return page
    .locator('div')
    .filter({ hasText: tieuDe })
    .filter({ has: page.getByRole('button', { name: tenNut }) })
    .last();
}

// ═════════ BƯỚC 19 · Thông báo nộp tiền tạm ứng án phí phúc thẩm (83-DS) ═════════
/** Nguồn: StepData · Phúc thẩm Step3.1 */
export async function phucThamTamUngAnPhi(page: Page, input: DuLieuVao, ghi: GhiChu) {
  return lapBieuMauPT(page, ghi, {
    tab: 'Chuẩn bị xét xử',
    tieuDeKhoi: /Danh sách thông báo|Thông báo/i,
    tenNut: /Thêm mới thông báo/i,
    maTim: '83-DS',
    ma: /nộp tiền tạm ứng án phí/i,
    ten: '83DS (tạm ứng án phí phúc thẩm)',
    oThem: [
      [/Ngày thông báo/i, ddmmyyyy(new Date())],
      [/Cơ quan thi hành án thu tiền/i, undefined],
      [/Địa chỉ cơ quan thi hành án/i, input.diaChiCoQuanThiHanhAn],
    ],
    nguoiKy: input.nguoiKyPhucTham,
  })
    .then(dong => ({ soThongBao83DS: dong }))
    .catch((e: Error) => {
      /**
       * NGOẠI LỆ MÔI TRƯỜNG — ghi đúng sự thật rồi cho luồng đi tiếp.
       *
       * Đo 01/10/2026 trên STG, người dùng xác nhận bằng tay:
       *   · 83-DS (mẫu ĐÚNG của phúc thẩm, StepData 3.1): máy chủ trả **400**, biểu mẫu mở ra chỉ
       *     có header và "Lưu | Đóng", không ô nào.
       *   · 29-DS và 05-TB-DS: là mẫu của SƠ THẨM — mở ở phúc thẩm thì báo
       *     "Không tìm thấy đơn khởi kiện/yêu cầu" nên không nạp được danh sách người phải nộp.
       * Tức không có mẫu nào lập được thông báo tạm ứng án phí phúc thẩm trên môi trường này.
       *
       * Không dựng số giả: bằng chứng ghi thẳng lý do để người đọc sổ cái biết hồ sơ vụ án thiếu
       * đúng văn bản nào và vì sao.
       */
      const lyDo =
        'KHÔNG lập được — 83-DS lỗi 400 (lỗi hệ thống); 29-DS/05-TB-DS là mẫu sơ thẩm, ở phúc thẩm ' +
        `báo "Không tìm thấy đơn khởi kiện/yêu cầu". Chi tiết: ${e.message.slice(0, 120)}`;
      ghi('83DS', lyDo);
      return { soThongBao83DS: lyDo };
    });
}

// ═════════ BƯỚC 20 · Quyết định đưa vụ án ra xét xử phúc thẩm (66-DS) ═════════
/** Nguồn: StepData · Phúc thẩm Step3.2–3.4 */
/**
 * HAI NHỊP (đo 01/10/2026, người dùng xác nhận):
 *   nhịp 1 — mở 66-DS → "Chọn lịch xét xử" → click ngày → TẠO lịch. Lưu lịch xong hệ thống ĐÓNG
 *            LUÔN biểu mẫu 66-DS mà không lưu nó, nên bảng quyết định vẫn rỗng.
 *   nhịp 2 — mở lại 66-DS → "Chọn lịch xét xử" → click đúng ngày đó → lần này chỉ CHỌN lịch sẵn
 *            có (không mở form tạo) → Lưu → Lấy số → Ký.
 */
/**
 * BƯỚC 20 · Quyết định đưa vụ án ra xét xử phúc thẩm (66-DS).
 *
 * ĐỔI CÁCH so với bản trước. Bản trước gọi `taoLichXetXu` (nút "Chọn lịch xét xử" → lịch tháng →
 * tạo lịch mới) và chạy hai nhịp vì lưu lịch làm đóng mất biểu mẫu — kẹt suốt 01/10/2026.
 *
 * Spec dân sự (StepData_DanSu_VuAn.txt, Phúc thẩm Step3.2–3.4) nói khác: với 66-DS chỉ cần
 *   "Ngày quyết định — Random; nhập thời gian, địa điểm mở phiên tòa — Random"
 * tức ĐIỀN THẲNG trong biểu mẫu, không qua chọn lịch. Nên thử đường đó trước; chỉ khi biểu mẫu
 * không có ô thời gian/địa điểm thì mới lùi về "Chọn lịch xét xử".
 */
export async function phucThamDuaRaXetXu(page: Page, input: DuLieuVao, ghi: GhiChu) {
  /** Ngày tất định: hôm nay + 14, đẩy sang thứ Hai nếu rơi Chủ nhật (phiên tòa là ngày làm việc) */
  const ngaySau = (n: number) => ddmmyyyy(new Date(Date.now() + n * 86400_000));
  let ngayPhienToa = ngaySau(14);
  const [d, m, y] = ngayPhienToa.split('/').map(Number);
  if (new Date(y, m - 1, d).getDay() === 0) ngayPhienToa = ngaySau(15);

  const dong = await lapBieuMauPT(page, ghi, {
    tab: 'Chuẩn bị xét xử',
    tieuDeKhoi: /Danh sách quyết định|Quyết định/i,
    tenNut: /Thêm mới quyết định/i,
    maTim: '66-DS',
    // Dòng trong bảng và tiêu đề biểu mẫu chỉ ghi "Quyết định đưa vụ án ra xét xử" — KHÔNG có
    // chữ "phúc thẩm" (đo 01/10/2026). Đòi có chữ đó thì vừa hụt dòng vừa hụt cả biểu mẫu.
    ma: /đưa vụ án ra xét xử/i,
    ten: '66DS (đưa vụ án ra xét xử phúc thẩm)',
    nguoiKy: input.nguoiKyPhucTham,
    truocKhiLuu: async bm => {
      // In cả form TRƯỚC khi thao tác: 66-DS có ~27 ô, không nhìn đủ thì lại đoán tên nhãn
      for (const x of await moTaForm(bm)) ghi('66DS · ô', x);

      /**
       * PHẢI KIỂM Ô CÓ THẬT THEO `<label>` TRƯỚC KHI ĐIỀN.
       *
       * `dienOTheoNhan` có nhánh lùi `.ant-form-item` `.last()` khi không khớp label — với 66-DS nó
       * trả về "Công khai" (giá trị của một cột trong bảng lịch xét xử). Chuỗi không rỗng nên bản
       * trước tưởng ĐÃ điền thời gian, bỏ qua việc chọn lịch, rồi lưu thiếu lịch → lưới 0 dòng
       * (đo 02/10/2026). Biểu mẫu này không có ô "Ngày mở phiên tòa" rời; thời gian nằm trong BẢNG.
       */
      const coO = async (nhan: RegExp) =>
        (await bm
          .locator('.ant-form-item')
          .filter({ has: page.locator('label').filter({ hasText: nhan }) })
          .count()) > 0;

      let daDienThoiGian = false;
      for (const [nhan, giaTri] of [
        [/Ngày mở phiên t/i, ngayPhienToa],
        [/Giờ mở phiên t/i, input.gioBatDauXetXu],
        [/Địa điểm/i, input.diaDiemXetXu],
      ] as [RegExp, string | undefined][]) {
        if (!(await coO(nhan))) {
          ghi('66DS', `biểu mẫu không có ô có nhãn ${String(nhan)}`);
          continue;
        }
        const gt = await dienOTheoNhan(page, bm, nhan, giaTri).catch(async (e: Error) => {
          await page.keyboard.press('Escape').catch(() => {});
          ghi('66DS', `không điền được ${String(nhan)}: ${e.message.slice(0, 110)}`);
          return '';
        });
        if (gt) {
          ghi('66DS', `${String(nhan)} = ${gt}`);
          if (/Ngày mở phiên/i.test(String(nhan))) daDienThoiGian = true;
        }
        await choHetSpin(page);
      }

      /**
       * Không có ô "Ngày mở phiên tòa" trong biểu mẫu → biểu mẫu này đòi CHỌN LỊCH như 47DS sơ
       * thẩm. Lúc đó mới dùng lối cũ, và ghi rõ để biết đã rẽ nhánh nào.
       */
      if (!daDienThoiGian) {
        ghi('66DS', 'biểu mẫu không có ô thời gian → lùi về "Chọn lịch xét xử"');
        ngayPhienToa = await taoLichXetXu(page, bm, ghi, ngayPhienToa, input, '66DS · lịch');
      }
    },
  });

  return { soQuyetDinh66DS: dong, ngayMoPhienToaPhucTham: ngayPhienToa };
}
interface ThamSoBieuMauPT {
  tab: string;
  tieuDeKhoi: RegExp;
  tenNut: RegExp;
  /** Chuỗi gõ vào ô chọn loại biểu mẫu */
  maTim: string;
  /** Khớp DÒNG trong bảng — cột tên hiện tên đầy đủ, không có mã */
  ma: RegExp;
  ten: string;
  nguoiKy?: string;
  /** Ô bắt buộc riêng của từng biểu mẫu */
  oThem?: [RegExp, string | undefined][];
  /** Việc riêng phải làm trước khi Lưu, vd. 66-DS phải chọn lịch xét xử */
  truocKhiLuu?: (bm: Locator) => Promise<void>;
}

/**
 * Lập một biểu mẫu của giai đoạn phúc thẩm: chọn loại → thêm → điền ô bắt buộc → Lưu → Lấy số →
 * Ký → Đóng → kiểm dòng trong bảng.
 *
 * Gộp chung vì 83-DS và 66-DS đi cùng một mạch; mọi bài học của luồng đã nằm sẵn ở đây:
 * khớp nhãn LỎNG (nhãn có dấu sao + khoảng trắng thừa), nút dùng tên CHÍNH XÁC khi biết
 * (tên trợ năng của header khối gộp cả chữ của nút con), và bằng chứng là DÒNG THẬT trong bảng.
 */
async function lapBieuMauPT(page: Page, ghi: GhiChu, opt: ThamSoBieuMauPT): Promise<string> {
  // Lưới 0 dòng mà màn không báo gì → chỉ API nói được vì sao (vd. ngày mở phiên tòa trong quá khứ)
  const loiApi = batLoiApi(page);
  await moTab(page, opt.tab);
  await choHetSpin(page);

  const khoi = khoiPT(page, opt.tieuDeKhoi, opt.tenNut);
  if (!(await hienTrong(khoi, 15_000))) {
    const nut = [
      ...new Set(
        (await page.getByRole('button').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean),
      ),
    ];
    throw new Error(
      `Tab "${opt.tab}" không có khối khớp ${opt.tieuDeKhoi} kèm nút ${opt.tenNut}. ` +
        `Nút trên màn: ${nut.slice(0, 18).join(' | ')}`,
    );
  }

  const daCo = khoi.locator('.ant-table-row').filter({ hasText: opt.ma }).first();
  if (await hienTrong(daCo, 3_000)) {
    const cu = (await daCo.innerText()).replace(/\s+/g, ' ').trim();
    ghi(opt.ten, `đã có ở lượt trước: ${cu}`);
    return cu;
  }

  /**
   * Khối có thể KHÔNG có ô "Chọn loại biểu mẫu" (màn phúc thẩm có nơi dùng MENU sau khi bấm nút).
   * Ghi lại số ô chọn và nút của khối trước khi thử, để lỗi nói đúng chuyện.
   */
  const soCombo = await khoi.locator('[role="combobox"]').count();
  const nutKhoi = (await khoi.getByRole('button').allInnerTexts().catch(() => []))
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  ghi(`${opt.ten} · khối`, `ô chọn: ${soCombo} · nút: ${nutKhoi.slice(0, 10).join(' | ') || '(không có)'}`);

  if (!soCombo) {
    // Không có ô chọn → bấm nút rồi chọn trong MENU, như nút "Phân công" ở sơ thẩm
    await khoi.getByRole('button', { name: opt.tenNut }).first().click();
    await choHetSpin(page);
    // Luôn ghi lại danh mục để biết có những mẫu nào — cần khi một mẫu hỏng và phải thay mẫu khác
    const dsMenu = (await page.getByRole('menuitem').allInnerTexts())
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    ghi(`${opt.ten} · danh mục`, dsMenu.slice(-12).join(' | ') || '(không có)');

    const muc = page.getByRole('menuitem', { name: new RegExp(opt.maTim.replace('-', '[- ]?'), 'i') }).first();
    if (!(await hienTrong(muc, 8_000))) {
      const ds = (await page.getByRole('menuitem').allInnerTexts())
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      throw new Error(
        `Khối của ${opt.ten} không có ô chọn loại biểu mẫu, bấm "${opt.tenNut}" cũng không ra menu ` +
          `chứa "${opt.maTim}". Menu đang có: ${ds.slice(-12).join(' | ') || '(không có)'}`,
      );
    }
    ghi(opt.ten, `chọn trong menu: "${(await muc.innerText()).replace(/\s+/g, ' ').trim()}"`);
    await muc.click();
    await choHetSpin(page);
  }

  /**
   * NEO BIỂU MẪU THEO TIÊU ĐỀ, không giữ  ("lớp ngoài cùng"): 66-DS còn mở thêm
   * modal lịch xét xử, lịch đóng xong thì locator động trỏ đi chỗ khác và mọi nút biến mất
   * ("Nút đang có: (không nút nào)", đo 01/10/2026). Cùng bẫy đã gặp ở bước 10, 12 và 17.
   */
  if (soCombo) await themBieuMauTuDanhSach(page, khoi, opt.maTim, opt.tenNut);
  const bm = page
    .locator('.ant-modal-content:visible, .ant-drawer-content:visible')
    .filter({ hasText: opt.ma })
    .first();
  await expect(bm, `Không mở được biểu mẫu ${opt.ten}`).toBeVisible({ timeout: 60_000 });
  await choHetSpin(page);
  // Thân biểu mẫu render SAU header: đọc ngay thì dump rỗng và mọi ô đều "không thấy"
  await bm.locator('.ant-form-item').first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
  const oForm = await moTaForm(bm);
  for (const d of oForm) ghi(`${opt.ten} · ô`, d);
  if (!oForm.length) {
    // Lớp mở ra không có `.ant-form-item` nào → in chữ trong lớp để biết đó là cái gì
    ghi(
      `${opt.ten} · lớp`,
      (await bm.innerText().catch(() => '(không đọc được)')).replace(/\s+/g, ' ').slice(0, 300),
    );
  }

  for (const [nhan, giaTri] of [
    [/Ngày quyết định|Ngày ban hành/i, ddmmyyyy(new Date())],
    [/Người ký/i, opt.nguoiKy],
    ...(opt.oThem ?? []),
  ] as [RegExp, string | undefined][]) {
    const gt = await dienOTheoNhan(page, bm, nhan, giaTri, /Người ký/i.test(String(nhan))).catch(
      async (e: Error) => {
        await page.keyboard.press('Escape').catch(() => {});
        ghi(opt.ten, `không điền được ${String(nhan)}: ${e.message.slice(0, 110)}`);
        return '';
      },
    );
    if (gt) ghi(opt.ten, `${String(nhan)} = ${gt}`);
    await choHetSpin(page);
  }

  /**
   * Ô "người phải nộp" của các mẫu thông báo tạm ứng án phí KHÔNG tìm được theo nhãn: nó không
   * phải select/text mà `dienOTheoNhan` nhận ra, và nhãn còn trùng với "Số tiền tạm ứng phải nộp".
   * Bước 04 sơ thẩm đã giải bằng cách neo theo ID — dùng lại đúng cách đó (đo 01/10/2026).
   */
  const oNguoiNop = bm.locator('[id$="_noiDung_nguoiPhaiNop"], [id*="nguoiPhaiNop"]').first();
  if (await hienTrong(oNguoiNop, 3_000)) {
    const ten = await chonSelectTheoThuTu(page, oNguoiNop, 0).catch((e: Error) => {
      ghi(opt.ten, `không chọn được người phải nộp: ${e.message.slice(0, 100)}`);
      return '';
    });
    if (ten) ghi(opt.ten, `người phải nộp = ${ten}`);
    await choHetSpin(page);
  }

  /**
   * "Ngày quyết định" neo theo ID, không theo nhãn: tìm theo nhãn trả "Không thấy ô" dù dump cho
   * thấy ô tồn tại và đang TRỐNG — và ô trống này chính là thứ làm bấm "Lưu" không ăn, lặng lẽ
   * (đo 01/10/2026 ở 66-DS: bảng quyết định 0 dòng ở MỌI tab). Bước 04 sơ thẩm đã dùng đúng cách này.
   */
  const oNgayQD = bm.locator('[id$="_ngayQuyetDinh"], [id*="ngayQuyetDinh"]').first();
  if ((await hienTrong(oNgayQD, 3_000)) && (await oNgayQD.isEditable().catch(() => false))) {
    if (!(await oNgayQD.inputValue().catch(() => ''))) {
      await chonNgay(oNgayQD, ddmmyyyy(new Date()));
      ghi(opt.ten, `ngày quyết định = ${(await oNgayQD.inputValue().catch(() => '')).trim()}`);
      await choHetSpin(page);
    }
  }

  if (opt.truocKhiLuu) await opt.truocKhiLuu(bm);

  /**
   * BẤM "LƯU" LÀ POPUP ĐÓNG và hiện toast "Lưu quyết định thành công" (người dùng xác nhận
   * 01/10/2026). Đó là hành vi ĐÚNG, không phải mất form — nên đừng tìm "Lấy số"/"Ký logic" trên
   * biểu mẫu vừa đóng (bản trước báo "Nút đang có: (không nút nào)" rồi kết luận nhầm là 66-DS hỏng).
   * Trình tự đúng: Lưu → tìm dòng trong bảng → MỞ LẠI dòng đó để Lấy số + Ký.
   */
  await luuBieuMau(page, bm, opt.ten, ghi);
  if (await hienTrong(bm, 3_000)) {
    // Vẫn mở (biểu mẫu kiểu khác) thì ký luôn tại chỗ
    await laySoVaKyLogic(page, bm, ghi, opt.ten);
    await dongBieuMau(page, bm);
  }
  await choHetSpin(page);
  await moTab(page, opt.tab);

  /**
   * PHẢI MỞ KHỐI TRƯỚC KHI ĐẾM DÒNG. Khối antd thu gọn thì bảng bên trong KHÔNG render, nên lưới
   * đếm ra 0 dòng và ta kết luận "lưu không thành công" — trong khi API trả toàn 2xx. Đo 02/10/2026
   * ở 66-DS: lỗi báo "Lưới 0 dòng: (rỗng)" kèm "không có lỗi API nào".
   */
  await moKhoi(page, opt.tieuDeKhoi, ghi).catch(() => {});
  await choHetSpin(page);

  /** Tìm dòng trên CẢ TAB: nút của khối đổi tên sau khi đã có bản ghi nên neo theo khối hay trượt */
  const timDong = () => page.locator('.ant-table-row').filter({ hasText: opt.ma }).first();
  let dong = (await timDong().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();

  /**
   * Mới lưu thì bản ghi còn là dự thảo → mở lại để Lấy số + Ký logic.
   *
   * ⚠ "Chưa có hiệu lực" CHỨA "có hiệu lực". Regex cũ `/Đã ban hành|Hoàn thành|Có hiệu lực/i` khớp
   * đúng dòng dự thảo nên kịch bản tưởng đã ban hành, bỏ luôn bước ký — bước vẫn báo xanh với một
   * quyết định chưa số, chưa ký (đo 02/10/2026 ở 66-DS: dòng "— — … Chưa có hiệu lực").
   */
  const daBanHanh = (x: string) => !/\bChưa\b/i.test(x) && /Đã ban hành|Hoàn thành|Có hiệu lực/i.test(x);
  if (dong && !daBanHanh(dong)) {
    await moLaiVaKy(page, timDong(), ghi, opt.ten).catch((e: Error) =>
      ghi(opt.ten, `không mở lại được để ký: ${e.message.slice(0, 110)}`),
    );
    await moTab(page, opt.tab);
    dong = (await timDong().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  }
  if (!dong) {
    const ds = (await page.locator('.ant-table-row').allInnerTexts())
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    throw new Error(
      `Lập ${opt.ten} xong nhưng không thấy dòng khớp ${opt.ma}. ` +
        `Lưới ${ds.length} dòng: ${ds.slice(0, 4).join(' // ') || '(rỗng)'}\n  ${loiApi()}`,
    );
  }
  ghi(opt.ten, dong);

  /**
   * BẰNG CHỨNG LÀ SỐ QUYẾT ĐỊNH, không phải cả dòng bảng.
   *
   * Trả về cả dòng thì sổ cái ghi `soQuyetDinh66DS = "1 Quyết định đưa vụ án ra xét xử phúc thẩm
   * — — Nguyễn Xuân Kỳ … Chưa có hiệu lực"` — nhìn như có bằng chứng, nhưng chính dòng đó nói
   * quyết định CHƯA có số và CHƯA ký (đo 02/10/2026). Không có số thì bước chưa xong.
   */
  const so = /(\d+\/\d{4}\/[\w-]+|\b\d{4,}\b)/.exec(dong)?.[1] || '';
  if (!so) {
    throw new Error(
      `${opt.ten}: có dòng trong bảng nhưng CHƯA CÓ SỐ quyết định (chưa lấy số hoặc chưa ký).\n  ` +
        `Dòng: ${dong}\n  ${loiApi()}`,
    );
  }
  return so;
}

// ═════════ BƯỚC 21 · Biên bản phiên tòa phúc thẩm (73-DS) + Biên bản nghị án (51-DS) ═════════
/**
 * Spec dân sự Phúc thẩm Step4.1–4.3: tab "Xét xử" → khối "Quyết định của Hội đồng xét xử" →
 * chọn 73-DS → "Thêm mới quyết định" → nhập nội dung → Lưu → Ký → Đóng; rồi 51-DS với
 * "Kết quả phúc thẩm" = "Không chấp nhận kháng cáo/kháng nghị" (= giữ nguyên bản án sơ thẩm).
 *
 * Dùng lại `lapQuyetDinhHdxx` của sơ thẩm: khối cùng tên, cùng nút "Thêm mới quyết định", và hàm
 * đó đã mang sẵn mọi bài học (nhận ra dòng đã có, mở lại ký nốt khi "Chưa có hiệu lực").
 *
 * @param ngayMoPhienToa dd/mm/yyyy — ngày mở phiên tòa phúc thẩm do bước 20 sinh; nghị án cùng ngày
 */
export async function phucThamBienBanPhienToa(
  page: Page,
  input: DuLieuVao,
  ghi: GhiChu,
  ngayMoPhienToa: string,
) {
  await moTab(page, 'Xét xử');
  await choHetSpin(page);

  /**
   * Tab Xét xử PHÚC THẨM không có khối "Quyết định của Hội đồng xét xử" như sơ thẩm. Nó có khối
   * "Kết quả xét xử" với HAI THẺ CHỌN (đo 02/10/2026):
   *   · "Bản án — Tòa xét xử xong nội dung vụ án và ban hành một bản án phúc thẩm."
   *   · "Quyết định — Vụ án kết thúc bằng một hoặc nhiều quyết định của Hội đồng xét xử phúc thẩm."
   * Biên bản phiên tòa và biên bản nghị án nằm sau thẻ "Quyết định", nên phải bấm thẻ đó trước —
   * không bấm thì khối/bảng chưa render và mọi locator đều trượt.
   */
  await moKhoi(page, /Kết quả xét xử/, ghi).catch(() => {});
  const the = page
    .getByRole('button', { name: /Quyết định.*Hội đồng xét xử phúc thẩm|^Quyết định$/i })
    .first();
  if (await hienTrong(the, 10_000)) {
    await the.click();
    await choHetSpin(page);
    await nghi(page, 1200, 1800);
    ghi('21 xét xử PT', 'đã chọn thẻ "Quyết định" trong khối Kết quả xét xử');
  } else {
    ghi('21 xét xử PT', 'không thấy thẻ "Quyết định" — thử lập biểu mẫu trực tiếp');
  }

  // In các khối đang có để nếu locator trượt thì biết ngay màn đang là gì
  const dsKhoi = (await page.locator('.ant-collapse-header, .ant-card-head').allInnerTexts().catch(() => []))
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  ghi('21 xét xử PT · khối', [...new Set(dsKhoi)].slice(0, 12).join(' | ') || '(không có)');

  const soBienBan73DS = await lapQuyetDinhHdxx(page, ghi, {
    ma: /Biên bản phiên tòa phúc thẩm/i,
    maTim: '73-DS',
    ten: '73DS (biên bản phiên tòa phúc thẩm)',
    noiDung: input.noiDungBienBanPhienToaPhucTham,
    // Ba ô bắt buộc nữa — form liệt kê đúng tên khi thiếu (đo 02/10/2026)
    oBatBuoc: [
      [/Nội dung tranh tụng/i, input.noiDungTranhTung],
      [/Phát biểu của Kiểm sát viên/i, input.phatBieuKiemSatVien],
      [/Kết thúc phiên tòa/i, input.ketThucPhienToa],
    ],
    /**
     * Ô GIỜ BẮT BUỘC của bản FE mới: "Phiên tòa kết thúc vào hồi" (đo 02/10/2026 ở case-002 — case-001
     * chạy hôm 01/10 chưa có ô này). Giờ phải CHỌN TRONG PANEL rồi OK, gõ tay không commit.
     */
    oGio: [[/Phiên tòa kết thúc vào hồi/i, input.gioKetThucPhienToaPhucTham]],
  });

  /**
   * 51-DS ở phúc thẩm còn phải khai KẾT QUẢ — chính ô này quyết định "Kết quả giải quyết" của vụ
   * (spec: 51-DS chọn "Không chấp nhận kháng cáo/kháng nghị" ⇒ "Giữ nguyên bản án sơ thẩm", và
   * bước 23 kiểm đúng chữ đó). Nếu chọn "Hủy để xét xử lại" thì hệ thống sinh khối chuyển hồ sơ về
   * sơ thẩm — khác luồng, nên giá trị này phải là dữ liệu gieo, không để code tự chọn.
   */
  /**
   * 51-DS Ở PHÚC THẨM KHÔNG CÙNG BỘ Ô VỚI SƠ THẨM. Đo 02/10/2026: không có "Ngày bắt đầu/kết thúc
   * nghị án", "Căn cứ nghị án", "Ý kiến thảo luận", cũng không có ô "Kết quả phúc thẩm" như spec
   * mô tả; chỉ có "Địa điểm nghị án" và ô nội dung. Nên chỉ khai những ô ĐÃ THẤY, còn ô giờ để
   * rỗng — đòi ô không tồn tại thì `oGio` ném lỗi và cả bước hỏng oan.
   *
   * Kết quả phúc thẩm vì vậy sẽ phải khai ở BẢN ÁN 75-DS (bước 22), nơi spec nói "Kết quả tổng thể
   * — kiểm tra hiển thị Giữ nguyên bản án sơ thẩm (lấy từ 51-DS, không sửa)".
   */
  const soBienBan51DS = await lapQuyetDinhHdxx(page, ghi, {
    ma: /Biên bản nghị án/i,
    maTim: '51-DS',
    ten: '51DS (biên bản nghị án phúc thẩm)',
    noiDung: input.noiDungBienBanNghiAn,
    /**
     * "Thời gian nghị án" là MỘT ô DATETIME nhận gõ (placeholder "VD: 31/08/2026 10:30"), không phải ô
     * giờ thuần — phúc thẩm gộp lại, sơ thẩm thì tách ngày + hai ô giờ. Hai điều đo 02/10/2026:
     *   · phải kèm NGÀY MỞ PHIÊN TÒA, không thì biểu mẫu chặn "Ngày Biên bản nghị án (02/10) không
     *     được trước Ngày mở phiên tòa (16/10)" — toast hiện mà bảng vẫn rỗng;
     *   · KHÔNG đi qua `datGioTrongPanel`: hàm đó đọc `inputValue()` và ở ô này báo "không đọc được".
     *     Dùng ô bắt buộc thường (`dienOTheoNhan` → gõ + Enter) là ăn.
     */
    oBatBuoc: [
      [/Kết quả (phúc thẩm|giải quyết)/i, input.ketQuaPhucTham],
      [/Địa điểm nghị án/i, input.diaDiemNghiAn],
      [/Thời gian nghị án/i, `${ngayMoPhienToa} ${input.gioBatDauNghiAn}`],
    ],
    /**
     * KẾT QUẢ KHAI TRONG BẢNG, không phải ô rời. 51-DS phúc thẩm có bảng "phạm vi kháng cáo,
     * kháng nghị"; mỗi dòng một dropdown kết quả xử lý. Thiếu thì form báo
     * "Vui lòng chọn kết quả xử lý cho tất cả các phạm vi kháng cáo, kháng nghị" (đo 02/10/2026) —
     * và đó cũng là chỗ quyết định "Kết quả giải quyết" của vụ mà bước 23 sẽ kiểm.
     */
    truocKhiLuu: async bm => {
      const dong = bm.locator('tr.ant-table-row');
      const soDong = await dong.count();
      ghi('51DS · phạm vi kháng cáo', `${soDong} dòng`);
      for (let i = 0; i < soDong; i++) {
        const o = dong.nth(i).locator('[role="combobox"]').first();
        if (!(await hienTrong(o, 5_000))) continue;
        const gt = await chonSelect(page, o, input.ketQuaPhucTham).catch(async (e: Error) => {
          await page.keyboard.press('Escape').catch(() => {});
          ghi('51DS · phạm vi kháng cáo', `dòng ${i + 1}: ${e.message.slice(0, 120)}`);
          return '';
        });
        ghi('51DS · phạm vi kháng cáo', `dòng ${i + 1} = ${gt || '(không chọn được)'}`);
        await choHetSpin(page);
      }
    },
  });

  return { soBienBan73DS, soBienBan51DS };
}

// ═════════ BƯỚC 22 · Bản án phúc thẩm (75-DS) ═════════
/**
 * Spec dân sự Phúc thẩm Step4.4–4.7: khối kết quả → "Tạo bản án phúc thẩm (75-DS)" (nút chỉ mở khi
 * đã có 73-DS và 51-DS) → nhập Ngày bản án = ngày mở phiên tòa ở 66-DS, nội dung/nhận định/quyết
 * định → "Lưu" → "Lấy số" → "Ký logic" → "Đóng". "Kết quả tổng thể" LẤY TỪ 51-DS, không sửa.
 *
 * Dùng lại các helper của bản án sơ thẩm: `soanThaoTheoNut` cho ô soạn thảo (contenteditable — không
 * phải input, `dienOTheoNhan` treo 30 s ở đó), `taiBanScanNeuCan` cho biểu mẫu ký giấy,
 * `bangBanAn` neo theo cột "Số bản án" (neo theo nút "Tạo bản án" thì lập xong là mất bảng).
 *
 * @param ngayMoPhienToa dd/mm/yyyy — do bước 20 sinh
 */
export async function phucThamBanAn(
  page: Page,
  input: DuLieuVao,
  ghi: GhiChu,
  ngayMoPhienToa: string,
  idVuAnPhucTham: string,
) {
  /**
   * SỬA VỤ ĐANG KẸT — chỉ chạy khi gọi tay với `QLA_SUA_CHU_TOA=1`.
   *
   * Vụ lập trước 02/10/2026 có chủ tọa là người đầu danh mục nên bản án không ai ký được (xem khối
   * chú thích ở bước 18). Hai thao tác này phân công lại chủ tọa thành tài khoản đang chạy rồi XOÁ
   * bản án nháp để lập lại — xoá dữ liệu nên PHẢI do người dùng chủ động bật, không bao giờ tự chạy.
   */
  if (process.env.QLA_SUA_CHU_TOA === '1') {
    await doiChuToaPhucTham(page, input, ghi);
    await xoaBanAnNhapPT(page, ghi);
  }

  await moTab(page, 'Xét xử');
  await choHetSpin(page);
  await moKhoi(page, /Kết quả xét xử/, ghi).catch(() => {});

  // Thẻ "Bản án" của khối Kết quả xét xử (bước 21 dùng thẻ "Quyết định")
  const theBanAn = page.getByRole('button', { name: /Bản án.*bản án phúc thẩm|^Bản án$/i }).first();
  if (await hienTrong(theBanAn, 10_000)) {
    await theBanAn.click();
    await choHetSpin(page);
    await nghi(page, 1200, 1800);
    ghi('22 bản án PT', 'đã chọn thẻ "Bản án"');
  }

  /**
   * Đã có dòng ở lượt trước: chỉ đi tiếp khi dòng ĐÃ BAN HÀNH. Còn "Dự thảo — chưa ký số" thì MỞ LẠI
   * KÝ NỐT, tuyệt đối không lập bản án thứ hai (lượt 02/10/2026 lập xong mà dòng vẫn là nháp, lần
   * chạy sau sẽ sinh thêm một bản án nữa nếu cứ rơi vào nhánh "tạo mới").
   */
  const dongCu = bangBanAn(page).locator('.ant-table-row').first();
  if (await hienTrong(dongCu, 3_000)) {
    const dong = (await dongCu.innerText()).replace(/\s+/g, ' ').trim();
    ghi('22 bản án PT', `đã có ở lượt trước: ${dong}`);
    if (daBanHanhBanAnPT(dong)) {
      const tt = await docToaRaTuBanAn(page, dongCu, ghi);
      return docBangChungBanAnPT(ghi, dong, ngayMoPhienToa, tt.toa, tt.so, await banAnTuApi(page, idVuAnPhucTham, ghi));
    }
    const ttCu = await moLaiBanAnPTVaKy(page, dongCu, input, ghi);
    await moTab(page, 'Xét xử');
    await moKhoi(page, /Kết quả xét xử/, ghi).catch(() => {});
    const sau = (await bangBanAn(page).locator('.ant-table-row').first().innerText().catch(() => ''))
      .replace(/\s+/g, ' ')
      .trim();
    return docBangChungBanAnPT(ghi, sau, ngayMoPhienToa, ttCu.toa, ttCu.so, await banAnTuApi(page, idVuAnPhucTham, ghi));
  }

  /**
   * ĐÓNG BIỂU MẪU CÒN SÓT TRƯỚC KHI TÌM NÚT.
   *
   * Bước 21 (73-DS/51-DS) có lúc để lại một biểu mẫu đang mở; nó phủ lên tab nên danh sách nút chỉ
   * còn "Lưu | Ký số | Ký logic | In biểu mẫu | Đóng" và kịch bản báo "không thấy nút Tạo bản án"
   * trong khi màn không hỏng gì (đo 03/10/2026, luồng dân sự case-ds-003).
   */
  const bmConMo = page.locator('.ant-drawer-open, .ant-modal:visible').filter({
    // Tên trợ năng có TIỀN TỐ TÊN ICON (vd. "close Đóng") → KHÔNG neo hai đầu
    has: page.getByRole('button', { name: /Đóng/ }),
  });
  if (await hienTrong(bmConMo.first(), 3_000)) {
    ghi('22 bản án PT', 'còn biểu mẫu mở đè lên tab → đóng lại trước khi tìm nút "Tạo bản án"');
    await bmConMo.first().getByRole('button', { name: /Đóng/ }).first().click().catch(() => undefined);
    await choHetSpin(page);
    await nghi(page, 800, 1200);
    await moTab(page, 'Xét xử').catch(() => undefined);
    await moKhoi(page, /Kết quả xét xử/, ghi).catch(() => undefined);
  }

  const nutTao = page.getByRole('button', { name: /Tạo bản án/i }).first();
  /**
   * LOẠI KẾT QUẢ PHẢI LÀ "BẢN ÁN" THÌ NÚT "TẠO BẢN ÁN" MỚI HIỆN.
   *
   * Khối "Kết quả xét xử" có ô chọn Loại kết quả = **Bản án | Quyết định**
   * (qla-webapp .../ChiTietVuAn/tabs/xet-xu/ChonLoaiKetQua.tsx: DANH_SACH_LOAI_KET_QUA). Chọn rồi thì
   * chỗ đó chỉ còn nút "Đổi loại kết quả", và nếu loại đang là "Quyết định" thì KHÔNG có "Tạo bản án"
   * — kịch bản báo "không thấy nút" trong khi màn vẫn bình thường (đo 03/10/2026, KDTM bước 22).
   * Gặp vậy thì bấm "Đổi loại kết quả" rồi chọn lại "Bản án".
   */
  if (!(await hienTrong(nutTao, 5_000))) {
    // Nút thật là "rollback Đổi loại kết quả" (tên icon đứng trước) → không neo hai đầu
    const nutDoi = page.getByRole('button', { name: /Đổi loại kết quả/i }).first();
    if (await hienTrong(nutDoi, 3_000)) {
      ghi('22 bản án PT', 'loại kết quả đang KHÔNG phải "Bản án" → bấm "Đổi loại kết quả" để chọn lại');
      await nutDoi.click().catch(() => undefined);
      await choHetSpin(page);
      await nghi(page, 800, 1200);
      const theBanAn = page
        .getByRole('button', { name: /Bản án/ })
        .or(page.locator('[role="radio"], .ant-card').filter({ hasText: /^Bản án/ }))
        .first();
      if (await hienTrong(theBanAn, 5_000)) {
        await theBanAn.click().catch(() => undefined);
        await choHetSpin(page);
        await nghi(page, 800, 1200);
        ghi('22 bản án PT', 'đã chọn lại loại kết quả = "Bản án"');
      }
    }
  }
  if (!(await hienTrong(nutTao, 15_000))) {
    throw new Error(
      `Không thấy nút "Tạo bản án" ở tab Xét xử phúc thẩm. Nút đang có: ${[
        ...new Set(
          (await page.getByRole('button').allInnerTexts().catch(() => []))
            .map(s => s.replace(/\s+/g, ' ').trim())
            .filter(Boolean),
        ),
      ]
        .slice(0, 20)
        .join(' | ')}`,
    );
  }
  if (!(await nutTao.isEnabled().catch(() => false))) {
    await nutTao.hover().catch(() => {});
    await nghi(page, 800, 1200);
    const tip = (await page.locator('.ant-tooltip-inner:visible').first().innerText().catch(() => '')).trim();
    throw new Error(
      `Nút "Tạo bản án" đang khoá — spec nói chỉ mở khi đã có 73-DS và 51-DS.\n  Tooltip: ${tip || '(không có)'}`,
    );
  }
  /**
   * `force` sau khi cuộn: bảng người tiến hành tố tụng nằm đè lên nút nên click thường bị
   * "<td class=ant-table-cell>…</td> intercepts pointer events" rồi hết 30 s (đo 02/10/2026).
   */
  await nutTao.scrollIntoViewIfNeeded().catch(() => {});
  await nutTao.click({ force: true });
  await choHetSpin(page);

  const bm = bieuMauDangMo(page);
  await expect(bm, 'Bấm "Tạo bản án" nhưng không mở được popup soạn thảo bản án phúc thẩm').toBeVisible({
    timeout: 60_000,
  });
  for (const d of await moTaForm(bm)) ghi('22 bản án PT · ô', d);
  ghi(
    '22 bản án PT · nút',
    [
      ...new Set(
        (await bm.getByRole('button').allInnerTexts().catch(() => []))
          .map(s => s.replace(/\s+/g, ' ').trim())
          .filter(Boolean),
      ),
    ]
      .slice(0, 25)
      .join(' | ') || '(không có)',
  );

  /**
   * Ô soạn thảo (contenteditable, mở qua nút "… — bấm để soạn thảo") — `dienOTheoNhan` đi tìm
   * `input, textarea` nên treo 30 s ở đó. Bốn ô này đều BẮT BUỘC: form liệt kê đúng tên khi thiếu
   * ("Nội dung vụ án | Nhận định của Tòa án | Nội dung quyết định | Viện kiểm sát nhận không được
   * bỏ trống" — đo 02/10/2026).
   */
  /**
   * ⚠ Neo theo NHÃN THẬT của ô, không theo chữ trên nút. Nút mở lớp soạn thảo mang chữ MÔ TẢ
   * ("Tóm tắt yêu cầu khởi kiện… — bấm để soạn thảo"), và `dienOChuDai` khi không khớp được nhãn
   * sẽ lùi về `div` chứa chữ đó — lối lùi này soạn xong mà form vẫn kêu ô trống (đo 02/10/2026).
   * Nhãn thật đọc từ cây form cùng ngày:
   *   · "Nội dung vụ án (tóm tắt nội dung, quyết định sơ thẩm, nội dung KC/KN)"
   *   · "Nhận định của Tòa án (đánh số [1] [2] [3]... phân tích KC/KN, căn cứ pháp luật/án lệ)"
   *   · "Nội dung quyết định (các quyết định về từng vấn đề phải giải quyết)"
   */
  await soanThaoBanAn(page, bm, ghi, [
    ['NOI_DUNG_VU_AN', /^Nội dung vụ án/i, input.noiDungBanAnPhucTham],
    ['NHAN_DINH', /^Nhận định của Tòa án/i, input.nhanDinhToaAnPhucTham],
    ['QUYET_DINH', /^Nội dung quyết định/i, input.noiDungQuyetDinhPhucTham],
  ]);
  await choHetSpin(page);

  /** Nhãn THẬT dài hơn spec: "Ngày bản án (tuyên án)", "Tóm tắt nội dung bản án (trích yếu công bố)" */
  /**
   * "Số bản án" BẮT BUỘC và form KHÔNG có nút "Lấy số" (nút chỉ có "Thêm mới bản án" / "Soạn thảo
   * bản án") — khác 52-DS sơ thẩm nơi để trống rồi Lấy số. Nên nhập số tất định; cấp số thật sẽ ghi
   * đè khi hệ thống ban hành.
   */
  for (const [nhan, giaTri] of [
    [/^Số bản án/i, input.soBanAnPhucThamNhapTay],
    [/Ngày bản án \(tuyên án\)/i, ngayMoPhienToa],
    [/Người ký \(Thẩm phán chủ tọa\)/i, input.nguoiKyPhucTham],
    [/Tóm tắt nội dung bản án/i, input.tomTatBanAnPhucTham],
    [/Người kháng cáo/i, input.tenNguoiKhangCao],
    [/Viện kiểm sát nhận/i, input.vienKiemSatNhan],
  ] as [RegExp, string | undefined][]) {
    /**
     * "Người ký" PHẢI GHI ĐÈ thành tài khoản đang chạy. Biểu mẫu nạp sẵn thẩm phán chủ tọa
     * (Đàm Văn Thuận) — khác người đang đăng nhập thì hệ thống chỉ cho "Trình ký", bản án đứng ở
     * "Dự thảo — chưa ký số" và bước 23 không có gì để đọc (đo 02/10/2026). Cùng cái bẫy đã gặp ở
     * 62-DS/65-DS.
     */
    const gt = await dienOTheoNhan(page, bm, nhan, giaTri, /Người ký/i.test(String(nhan))).catch((e: Error) => {
      ghi('22 bản án PT', `không điền được ${String(nhan)}: ${e.message.slice(0, 90)}`);
      return '';
    });
    if (gt) ghi('22 bản án PT', `${String(nhan)} = ${gt}`);
    await choHetSpin(page);
  }

  /**
   * ⚠ Ô BẮT BUỘC KHÔNG PHẢI FORM-ITEM: khối `role=radiogroup` "Quyết định đối với bản án sơ thẩm"
   * (`KhoiQuyetDinhTheoYeuCauMoi.tsx:647`) — ba thẻ `role=radio` Giữ nguyên / Sửa / Hủy. Bỏ qua thì
   * `validateFields` KHÔNG kêu ô nào trống, chỉ có một toast "Không thể lưu bản án" và không request
   * nào được gửi. Chọn xong, hệ thống TỰ suy quyết định cho từng nhóm đơn (`sinhQuyetDinhTheoDon`).
   */
  /**
   * ⚠ HAI khối dùng CHUNG một `aria-label` cứng "Quyết định đối với bản án sơ thẩm"
   * (`KhoiQuyetDinhTheoYeuCauMoi.tsx:647` — nhãn không đổi theo prop `tieuDe`): một khối là quyết
   * định của Tòa, một khối là "Ý kiến của Viện kiểm sát". Lấy `.first()` thì trúng khối Viện kiểm
   * sát ("Ý kiến của Viện kiểm sát đối với bản án sơ thẩm"; khối của Tòa mang tiêu đề "Quyết định
   * của Hội đồng xét xử phúc thẩm đối với bản án sơ thẩm"), thẻ vẫn tích `aria-checked=true` mà ô ẩn QUYET_DINH_KET_QUA vẫn rỗng và biểu mẫu vẫn tự
   * ghi cảnh báo "Chưa chọn quyết định đối với bản án sơ thẩm ở mục «Quyết định»" (đo 02/10/2026).
   * → phân biệt bằng TIÊU ĐỀ của khối bao ngoài.
   */
  const dsNhomChon = bm.locator('[role="radiogroup"][aria-label*="bản án sơ thẩm"]');
  await expect(dsNhomChon.first(), 'Biểu mẫu 75-DS không có khối chọn quyết định').toBeVisible({
    timeout: 20_000,
  });
  const moKhoiChon = async (g: Locator) =>
    (await g.locator('xpath=ancestor::div[2]').first().innerText().catch(() => ''))
      .replace(/\s+/g, ' ')
      .trim();

  for (const [tieuDe, giaTri] of [
    [/^Quyết định của Hội đồng xét xử/i, input.quyetDinhVoiBanAnSoTham],
    [/^Ý kiến của Viện kiểm sát/i, input.yKienVksVoiBanAnSoTham],
  ] as [RegExp, string][]) {
    let nhom: Locator | undefined;
    const dsMo: string[] = [];
    for (let i = 0; i < (await dsNhomChon.count()); i++) {
      const chu = await moKhoiChon(dsNhomChon.nth(i));
      dsMo.push(`#${i}: ${chu.slice(0, 50)}`);
      if (tieuDe.test(chu)) {
        nhom = dsNhomChon.nth(i);
        break;
      }
    }
    if (!nhom) throw new Error(`Không thấy khối "${tieuDe}". Các khối đang có: ${dsMo.join(' | ')}`);

    const the = nhom.locator('[role="radio"]').filter({ hasText: new RegExp(giaTri, 'i') }).first();
    if (!(await hienTrong(the, 10_000))) {
      const ds = (await nhom.locator('[role="radio"]').allInnerTexts()).map(s =>
        s.replace(/\s+/g, ' ').trim().slice(0, 40),
      );
      throw new Error(`Khối "${tieuDe}" không có thẻ "${giaTri}". Đang có: ${ds.join(' | ') || '(rỗng)'}`);
    }
    await the.scrollIntoViewIfNeeded().catch(() => {});
    await the.click({ force: true });
    await expect(the, `Bấm "${giaTri}" ở khối "${tieuDe}" mà thẻ không được tích`).toHaveAttribute(
      'aria-checked',
      'true',
      { timeout: 10_000 },
    );
    ghi('22 bản án PT', `${String(tieuDe)} = ${giaTri}`);
    await choHetSpin(page);
  }

  /**
   * BẰNG CHỨNG của cú chọn: ô ẩn QUYET_DINH_KET_QUA phải có giá trị. Nó do biểu mẫu tự suy ra từ
   * quyết định theo từng nhóm đơn; còn rỗng là chưa chọn đúng khối, đừng bấm lưu cho mất lượt.
   */
  const oAnKetQua = await bm
    .locator('input[id$="QUYET_DINH_KET_QUA"]')
    .first()
    .inputValue()
    .catch(() => '');
  ghi('22 bản án PT · ô ẩn QUYET_DINH_KET_QUA', oAnKetQua || '(rỗng)');
  if (!oAnKetQua) {
    const dsCanhBao = (await bm.locator('.ant-alert').allInnerTexts().catch(() => []))
      .map(s => s.replace(/\s+/g, ' ').trim().slice(0, 160))
      .filter(Boolean);
    throw new Error(
      `Đã bấm thẻ "${input.quyetDinhVoiBanAnSoTham}" mà ô ẩn QUYET_DINH_KET_QUA vẫn rỗng — biểu mẫu ` +
        `chưa nhận quyết định đối với bản án sơ thẩm.\n  Cảnh báo trên biểu mẫu: ${dsCanhBao.join(' | ') || '(không có)'}`,
    );
  }

  const loiApi = batLoiApi(page);
  /**
   * Nhật ký MỌI request ghi (không phải GET): cú "Thêm mới bản án" từng im lặng không tạo bản ghi
   * mà cũng không có lỗi API nào ≥ 400 — không có nhật ký này thì chỉ biết "bảng 0 dòng".
   */
  const dsGhi: string[] = [];
  page.on('response', async r => {
    if (r.request().method() === 'GET' || dsGhi.length >= 8) return;
    const than = (await r.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 180);
    dsGhi.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')} :: ${than}`);
  });

  await luuBieuMau(page, bm, 'bản án phúc thẩm (75-DS)', ghi, /Thêm mới bản án|^Lưu$/);
  /**
   * SỐ BẢN ÁN TRÙNG → nhường số, đừng chết.
   *
   * Form 75-DS không có nút "Lấy số" nên số phải nhập tay; hạt giống là số CỐ ĐỊNH, chạy lượt thứ hai
   * trên cùng môi trường là máy chủ trả
   *   400 POST /ban-an/dan-su/so-tham :: SO_DC_CAP_DA_TON_TAI "Số được cấp đã tồn tại…"
   * và bản ghi KHÔNG được tạo (đo 03/10/2026, số 13 đã dùng ở lượt 02/10).
   *
   * HAI CÁI BẪY (đo 03/10/2026, bản đầu của vòng này tự rơi vào cả hai):
   *  1. NHẮM NHẦM Ô: biểu mẫu có nhiều nhãn bắt đầu bằng "Số bản án" (của vụ sơ thẩm bị kháng cáo),
   *     nên regex /^Số bản án/ + .first() trúng ô KHÁC — vòng lặp đã sửa số "14/2026/KDTM-ST" của ô
   *     sơ thẩm. Phải khớp nhãn KHÍT (chỉ đúng chữ "Số bản án", cho phép dấu * của ô bắt buộc).
   *  2. LẶP VÔ ÍCH: `batLoiApi` tích luỹ lỗi, lần lưu sau thành công vẫn thấy lỗi cũ → lặp tới hết
   *     số vòng. Phải so với ảnh chụp lỗi TRƯỚC lần lưu, chỉ đi tiếp khi có lỗi MỚI.
   */
  const laTrungSo = (truoc: string, sau: string) =>
    sau.length > truoc.length && /SO_DC_CAP_DA_TON_TAI|Số được cấp đã tồn tại/i.test(sau.slice(truoc.length));
  const oSoBanAnPT = bm
    .locator('.ant-form-item')
    .filter({ has: page.locator('label').filter({ hasText: /^\s*\*?\s*Số bản án\s*$/ }) })
    .first()
    .locator('input')
    .first();
  let loiTruoc = '';
  for (let lan = 0; lan < 20; lan++) {
    const loiSau = loiApi();
    if (!laTrungSo(loiTruoc, loiSau)) break;
    if (!(await oSoBanAnPT.isVisible().catch(() => false))) {
      ghi('22 bản án PT', 'số trùng nhưng KHÔNG thấy ô "Số bản án" để nhường số');
      break;
    }
    const hienTai = (await oSoBanAnPT.inputValue().catch(() => '')) || input.soBanAnPhucThamNhapTay || '';
    const m = hienTai.match(/^(\d+)(.*)$/);
    if (!m) {
      ghi('22 bản án PT', `số trùng nhưng không tách được phần số từ "${hienTai}"`);
      break;
    }
    const soMoi = `${Number(m[1]) + 1}${m[2]}`;
    ghi('22 bản án PT', `số "${hienTai}" đã tồn tại → thử số "${soMoi}"`);
    await oSoBanAnPT.fill('');
    await oSoBanAnPT.fill(soMoi);
    await choHetSpin(page);
    loiTruoc = loiSau;
    await luuBieuMau(page, bm, `bản án phúc thẩm (75-DS) · số ${soMoi}`, ghi, /Thêm mới bản án|^Lưu$/);
  }
  for (const d of dsGhi) ghi('22 bản án PT · request ghi', d);
  const toastLuu = await toastGanDay(page, 40_000).catch(() => [] as string[]);
  if (toastLuu.length) ghi('22 bản án PT · toast', toastLuu.join(' | ').slice(0, 300));
  /**
   * "Không thể lưu bản án" là thông báo của `BanAnFooter.handleLuuBanAn` khi `validateFields` hỏng —
   * không request nào được gửi. Dừng ngay tại đây, kèm cảnh báo trên biểu mẫu: lỗi hay nằm ở khối
   * đơn kháng cáo/kháng nghị không tải được, chứ không phải ô nào trống.
   */
  if (/Không thể lưu bản án/i.test(toastLuu.join(' '))) {
    const dsCanhBao = (await bm.locator('.ant-alert').allInnerTexts().catch(() => []))
      .map(s => s.replace(/\s+/g, ' ').trim().slice(0, 160))
      .filter(Boolean);
    const quanhKhoi = (
      await nhomQuyetDinh
        .locator('xpath=ancestor::div[2]')
        .first()
        .innerText()
        .catch(() => '')
    )
      .replace(/\s+/g, ' ')
      .trim();
    throw new Error(
      `Không lưu được bản án phúc thẩm (75-DS): ${toastLuu.join(' | ').slice(0, 200)}\n` +
        `  Cảnh báo trên biểu mẫu: ${dsCanhBao.join(' | ') || '(không có)'}\n` +
        `  Quanh khối quyết định: ${quanhKhoi.slice(0, 400) || '(không đọc được)'}\n  ${loiApi()}`,
    );
  }
  await taiBanScanNeuCan(page, bm, ghi, 'bản án phúc thẩm (75-DS)');
  await laySoVaKyLogic(page, bm, ghi, 'bản án phúc thẩm (75-DS)');
  const soThatKhiTao = await docSoBanAnTrenBieuMau(bm, ghi);
  const toaRa = await docToaRaBanAnPT(bm, ghi);
  await dongBieuMau(page, bm);
  await choHetSpin(page);

  await moTab(page, 'Xét xử');
  await moKhoi(page, /Kết quả xét xử/, ghi).catch(() => {});
  const dong = await bangBanAn(page)
    .locator('.ant-table-row')
    .first()
    .innerText()
    .then(s => s.replace(/\s+/g, ' ').trim())
    .catch(() => '');
  if (!dong) {
    throw new Error(
      `Lập bản án phúc thẩm xong nhưng bảng "Bản án phúc thẩm" vẫn không có dòng nào.\n  ${loiApi()}`,
    );
  }
  // Tạo xong mà dòng còn là nháp thì mở lại ký nốt ngay trong lượt này rồi đọc lại
  if (!daBanHanhBanAnPT(dong)) {
    ghi('22 bản án PT', `dòng mới còn là nháp → mở lại ký nốt: ${dong}`);
    const ttLai = await moLaiBanAnPTVaKy(page, bangBanAn(page).locator('.ant-table-row').first(), input, ghi);
    await moTab(page, 'Xét xử');
    await moKhoi(page, /Kết quả xét xử/, ghi).catch(() => {});
    const lai = (await bangBanAn(page).locator('.ant-table-row').first().innerText().catch(() => ''))
      .replace(/\s+/g, ' ')
      .trim();
    return docBangChungBanAnPT(
      ghi,
      lai,
      ngayMoPhienToa,
      ttLai.toa || toaRa,
      ttLai.so || soThatKhiTao,
      await banAnTuApi(page, idVuAnPhucTham, ghi),
    );
  }
  return docBangChungBanAnPT(ghi, dong, ngayMoPhienToa, toaRa, soThatKhiTao, await banAnTuApi(page, idVuAnPhucTham, ghi));
}


/**
 * Soạn NỘI DUNG BẢN ÁN qua màn "Soạn thảo bản án" — mở MỘT LẦN cho cả ba phần.
 *
 * ⚠ Cơ chế thật, đọc từ mã nguồn FE `components/SoanThaoBanAn` ngày 02/10/2026 (không đoán theo
 * giao diện):
 *   · Màn soạn thảo là MỘT trang Word duy nhất (`contenteditable` = `.qla-stba-word-page`) dựng từ
 *     template, trong đó ba phần nội dung nằm trong ba thẻ `[data-ba-section="NOI_DUNG_VU_AN" |
 *     "NHAN_DINH" | "QUYET_DINH"]` (`BanAnEditor.tsx:73`).
 *   · Bấm "Lưu bản soạn thảo" → `tachPhanNoiDung` CHỈ đọc nội dung bên trong ba thẻ đó
 *     (`BanAnEditor.tsx:98`) rồi `form.setFieldValue` cho từng ô của biểu mẫu
 *     (`KhoiNoiDungBanAn.tsx` → `apDung`).
 *   · Ba ô trên biểu mẫu KHÔNG có input nào, chúng chỉ là khung xem trước (`XemTruocNoiDung`).
 *
 * Vì thế `Ctrl+A` + `Delete` rồi gõ — cách dùng cho mọi ô soạn thảo khác — XOÁ luôn ba thẻ
 * `data-ba-section`, `tachPhanNoiDung` không còn gì để tách nên không ô nào được ghi: toast vẫn báo
 * "nội dung mới được đưa vào màn bản án" mà biểu mẫu vẫn kêu "Nội dung vụ án không được bỏ trống"
 * (đo 02/10/2026, mất ba lượt chạy). Ở đây chọn ĐÚNG NỘI DUNG TRONG TỪNG THẺ rồi mới gõ.
 */
async function soanThaoBanAn(
  page: Page,
  bm: Locator,
  ghi: GhiChu,
  dsPhan: [khoa: string, nhanO: RegExp, chu: string][],
) {
  const nutMo = bm
    .getByRole('button', { name: /^Soạn thảo bản án$|bấm để soạn thảo/i })
    .first();
  await expect(nutMo, 'Biểu mẫu bản án không có nút mở màn soạn thảo').toBeVisible({ timeout: 20_000 });
  await nutMo.scrollIntoViewIfNeeded().catch(() => {});
  await nutMo.click({ force: true });
  await choHetSpin(page);

  // Neo màn soạn thảo theo NÚT RIÊNG của nó; "lớp đang mở ngoài cùng" trỏ về biểu mẫu bên dưới
  const lopSoan = page
    .locator('.ant-drawer-content:visible, .ant-modal-content:visible')
    .filter({ has: page.getByRole('button', { name: /Khôi phục template|Lưu bản soạn thảo/i }) });
  const lop = lopSoan.last();
  await expect(lop, 'Bấm soạn thảo nhưng không mở được màn soạn thảo bản án').toBeVisible({
    timeout: 30_000,
  });

  for (const [khoa, , chu] of dsPhan) {
    const khoi = lop.locator(`[data-ba-section="${khoa}"]`).first();
    await expect(khoi, `Trang soạn thảo không có phần "${khoa}"`).toBeVisible({ timeout: 20_000 });
    await khoi.scrollIntoViewIfNeeded().catch(() => {});
    await khoi.click();
    // Chọn ĐÚNG nội dung bên trong thẻ phần → cú gõ thay nội dung cũ mà THẺ VẪN CÒN
    await khoi.evaluate(el => {
      const r = document.createRange();
      r.selectNodeContents(el);
      const vung = window.getSelection();
      vung?.removeAllRanges();
      vung?.addRange(r);
    });
    await page.keyboard.insertText(chu);
    await nghi(page, 300, 500);
    const trong = (await khoi.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    if (!trong.includes(chu.replace(/\s+/g, ' ').trim().slice(0, 25))) {
      throw new Error(`Gõ vào phần "${khoa}" của trang soạn thảo không ăn — đang là: ${trong.slice(0, 120)}`);
    }
    ghi('22 soạn thảo', `${khoa} = ${trong.slice(0, 50)}…`);
  }

  const nutLuu = lop.getByRole('button', { name: /Lưu bản soạn thảo/i }).first();
  await expect(nutLuu, 'Màn soạn thảo không có nút "Lưu bản soạn thảo"').toBeVisible({ timeout: 10_000 });
  await nutLuu.click();
  await choHetSpin(page);
  const toast = await toastGanDay(page, 20_000).catch(() => [] as string[]);
  if (toast.length) ghi('22 soạn thảo', `toast: ${toast.join(' | ').slice(0, 140)}`);

  /**
   * Đóng bằng nút icon `title="Đóng"`. Lưu xong thì `daThayDoiRef = false` nên nó đóng thẳng; còn
   * sót thay đổi thì FE hỏi "Đóng màn soạn thảo" — xác nhận luôn, nội dung đã lưu rồi.
   */
  await lop.locator('button[title="Đóng"]').first().click({ timeout: 10_000 }).catch(() => {});
  await xacNhanHopThoai(page).catch(() => {});
  await choHetSpin(page);
  await expect(lopSoan, 'Lưu xong nhưng màn soạn thảo bản án không đóng').toHaveCount(0, {
    timeout: 20_000,
  });
  await nghi(page, 600, 1000);

  /**
   * BẰNG CHỨNG: ba ô trên biểu mẫu phải HIỆN chữ. `apDung` gọi `form.setFieldValue` nên khung xem
   * trước render ngay — ô còn trơ chữ gợi ý nghĩa là nội dung chưa vào form, đừng bấm Lưu.
   */
  for (const [khoa, nhanO, chu] of dsPhan) {
    const oForm = bm
      .locator('.ant-form-item')
      .filter({ has: page.locator('label').filter({ hasText: nhanO }) })
      .first();
    const sau = (await oForm.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    if (!sau.includes(chu.replace(/\s+/g, ' ').trim().slice(0, 25))) {
      throw new Error(
        `Lưu bản soạn thảo xong mà ô "${khoa}" trên biểu mẫu vẫn chưa có nội dung.\n` +
          `  Ô đang là: ${sau.slice(0, 160) || '(trống)'}`,
      );
    }
    ghi('22 bản án PT', `${khoa} = ${chu.slice(0, 50)}… (đã hiện trên biểu mẫu)`);
  }
}

/** Bằng chứng bước 22: SỐ bản án do hệ thống cấp, không phải cả dòng bảng */
/**
 * Tòa ra bản án phúc thẩm — ĐỌC TỪ BIỂU MẪU, không gieo tay.
 *
 * Bước 24 (đơn GĐT) tra bản án theo đúng tên Tòa, nên khoá này phải là tên Tòa mà hệ thống ghi vào
 * bản án: ô ẩn `TEN_TOA_AN` (`BanAnPhucThamForm.tsx:536` lấy `vuAn.tenToaAn || tenDonViThuLy`).
 */
async function docToaRaBanAnPT(bm: Locator, ghi: GhiChu): Promise<string> {
  const toa = (await bm.locator('input[id$="TEN_TOA_AN"]').first().inputValue().catch(() => '')).trim();
  if (toa) {
    ghi('22 bản án PT', `tòa ra bản án = ${toa}`);
    return toa;
  }
  /**
   * `<Form.Item name=… hidden />` KHÔNG có control con nên antd không render input nào — không có ô
   * ẩn để đọc (`BanAnPhucThamForm.tsx:1159`). Lùi về quét chữ trên chính biểu mẫu.
   */
  const chu = (await bm.innerText().catch(() => '')).replace(/\s+/g, ' ');
  const quet = /Tòa án nhân dân [^,;|]{3,60}?(?=\s{2,}|\s[·|]|,|$)/.exec(chu)?.[0]?.trim() || '';
  if (quet) {
    ghi('22 bản án PT', `tòa ra bản án = ${quet} (quét trên biểu mẫu)`);
    return quet;
  }
  /**
   * Cuối cùng: MỞ MÀN SOẠN THẢO để đọc đầu bản án. Template dựng dòng đầu từ `thongTin.tenToaAn`
   * viết hoa (`BanAnEditor.tsx:66`) — đó là chỗ duy nhất tên Tòa hiện ra, vì phần đầu biểu mẫu chỉ
   * có mã vụ/tên vụ/số thụ lý. Bản án đã ký thì màn này ở chế độ CHỈ XEM nên không chạm vào dữ liệu.
   */
  const nutXem = bm.getByRole('button', { name: /Xem nội dung bản án|^Soạn thảo bản án$/i }).first();
  if (!(await hienTrong(nutXem, 4_000))) {
    ghi('22 bản án PT', `tòa ra bản án = (không đọc được; biểu mẫu mở đầu: ${chu.slice(0, 160)})`);
    return '';
  }
  await nutXem.click({ force: true });
  await choHetSpin(trangCua(bm));
  const trang = trangCua(bm).locator('.qla-stba-word-page').first();
  let toaTrongTrang = '';
  if (await hienTrong(trang, 20_000)) {
    const dau = (await trang.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    toaTrongTrang = /TÒA ÁN NHÂN DÂN [^,;|]{3,60}?(?=\s{2,}|\sSố:|,|$)/i.exec(dau)?.[0]?.trim() || '';
    ghi('22 bản án PT', `tòa ra bản án = ${toaTrongTrang || `(đầu bản án: ${dau.slice(0, 120)})`}`);
  }
  const lopSoan = trangCua(bm)
    .locator('.ant-drawer-content:visible, .ant-modal-content:visible')
    .filter({ has: trangCua(bm).locator('.qla-stba-word-page') });
  await lopSoan.first().locator('button[title="Đóng"]').first().click({ timeout: 8_000 }).catch(() => {});
  await xacNhanHopThoai(trangCua(bm)).catch(() => {});
  await choHetSpin(trangCua(bm));
  return toaTrongTrang;
}

/** `Page` của một locator — để hàm đọc chỉ cần nhận biểu mẫu, không phải truyền thêm tham số */
const trangCua = (l: Locator): Page => l.page();

/**
 * Bản án đã ký ở lượt trước: MỞ XEM rồi đọc ô ẩn `TEN_TOA_AN`.
 *
 * Không quét chữ trên màn: tên Tòa không nằm ở phần đầu tab Xét xử (quét `main` trả về rỗng — đo
 * 02/10/2026). Mở xem là thao tác chỉ đọc, không chạm vào bản án đã ban hành.
 */
async function docToaRaTuBanAn(page: Page, dong: Locator, ghi: GhiChu): Promise<{ toa: string; so: string }> {
  const mat = dong.getByRole('img', { name: 'eye' }).first();
  if (!(await hienTrong(mat, 5_000))) {
    ghi('22 bản án PT', 'không mở xem được bản án để đọc tên Tòa');
    return { toa: '', so: '' };
  }
  await mat.scrollIntoViewIfNeeded().catch(() => {});
  await mat.click({ force: true });
  await choHetSpin(page);
  const bm = bieuMauDangMo(page);
  if (!(await hienTrong(bm, 20_000))) return { toa: '', so: '' };
  const so = await docSoBanAnTrenBieuMau(bm, ghi);
  const toa = await docToaRaBanAnPT(bm, ghi);
  await dongBieuMau(page, bm);
  await choHetSpin(page);
  return { toa, so };
}

/**
 * SỐ BẢN ÁN THẬT (giá trị lưu ở `BAN_AN.SO_BAN_AN`) — đọc từ ô "Số bản án" trên biểu mẫu.
 *
 * ⚠ KHÔNG dùng số đọc từ dòng bảng: dòng hiện số GHÉP `số + hậu tố` (`getSoQuyetDinh` của
 * `BanAnFooter.tsx`), vd. lưới hiện `12/2026/KDTM-ST` trong khi bản ghi chỉ có `12/2026`. Bước 24 tra
 * cứu bản án bằng `findBySoBanAnAndNgayBanAnAndMaDonVi` (`DonServiceImpl.resolveBanAnCu`) nên tra
 * bằng số ghép thì hệ thống báo "Không tìm thấy bản án trong hệ thống" (đo 02/10/2026).
 */
async function docSoBanAnTrenBieuMau(bm: Locator, ghi: GhiChu): Promise<string> {
  const o = bm.locator('input[id$="SO_BAN_AN"], input[id$="_so"]').first();
  const so = (await o.inputValue().catch(() => '')).trim();
  ghi('22 bản án PT', `số bản án trên biểu mẫu (giá trị lưu) = ${so || '(không đọc được)'}`);
  return so;
}

/**
 * Bản ghi bản án của vụ phúc thẩm, đọc qua API (CHỈ ĐỌC) — nguồn đáng tin duy nhất cho ba khoá bàn
 * giao sang giai đoạn GĐT.
 *
 * Vì sao không tin chữ trên màn: lưới và biểu mẫu hiện số GHÉP `<số>/<năm>/<ký hiệu>`
 * ("12/2026/KDTM-ST") còn `BAN_AN.SO_BAN_AN` chỉ là "12"; tên Tòa đọc từ đầu bản án thì VIẾT HOA
 * trong khi danh mục đơn vị lưu dạng chuẩn. Bước 24 tra cứu bản án bằng đúng ba cột
 * (số, ngày, mã đơn vị) + giai đoạn, nên lệch một chữ là "Không tìm thấy bản án trong hệ thống"
 * (mất 4 lượt chạy ngày 02/10/2026 mới ra).
 *
 * ⚠ `layToken` điều hướng về dashboard → chỉ gọi hàm này SAU KHI xong mọi việc trên màn.
 */
async function banAnTuApi(page: Page, idVuAnPhucTham: string, ghi: GhiChu): Promise<Record<string, unknown> | null> {
  if (!idVuAnPhucTham) return null;
  const token = await layToken(page).catch(() => '');
  if (!token) {
    ghi('22 bản án PT', 'không lấy được token → không đọc được bản ghi bản án qua API');
    return null;
  }
  const ba = await banAnCuaVuAn(page.request, token, idVuAnPhucTham);
  if (!Object.keys(ba).length) {
    ghi('22 bản án PT', 'API không trả bản ghi bản án nào cho vụ phúc thẩm');
    return null;
  }
  ghi(
    '22 bản án PT · bản ghi',
    `số "${ba.soBanAn}", ngày "${ba.ngayBanAn}", đơn vị "${ba.maDonVi}" (${ba.tenDonViRaBanAn}), ` +
      `giai đoạn "${ba.giaiDoan}", trạng thái cấp số "${ba.trangThaiCapSo}"`,
  );
  return ba;
}

function docBangChungBanAnPT(
  ghi: GhiChu,
  dong: string,
  ngayMoPhienToa: string,
  toaRaBanAnPhucTham: string,
  soTrenBieuMau = '',
  banGhi: Record<string, unknown> | null = null,
) {
  ghi('22 bản án PT · dòng', dong);
  /**
   * BẰNG CHỨNG LÀ SỐ LƯU TRONG BẢN GHI, không phải số ghép trên lưới. Lưới hiện `số + hậu tố`
   * (12/2026/KDTM-ST) còn `BAN_AN.SO_BAN_AN` chỉ có 12/2026 — bước 24 tra cứu bản án theo đúng cột
   * đó nên dùng số ghép là "không tìm thấy bản án trong hệ thống" (đo 02/10/2026).
   */
  const soTrenLuoi = /(\d+\/\d{4}\/[\w-]+|\b\d+\/\d{4}\b)/.exec(dong)?.[1] || '';
  const soTuApi = banGhi?.soBanAn ? String(banGhi.soBanAn).trim() : '';
  const soBanAnPhucTham = soTuApi || soTrenBieuMau || soTrenLuoi;
  if (soTuApi && soTuApi !== soTrenLuoi) {
    ghi('22 bản án PT', `số LƯU trong bản ghi "${soTuApi}" khác số hiện trên màn "${soTrenLuoi}" (màn ghép năm + ký hiệu)`);
  }
  if (!soBanAnPhucTham) {
    throw new Error(
      `Có dòng bản án phúc thẩm nhưng CHƯA CÓ SỐ (chưa lấy số hoặc chưa ký).\n  Dòng: ${dong}`,
    );
  }
  /**
   * CÓ SỐ KHÔNG CÓ NGHĨA LÀ XONG: lượt 02/10/2026 bước này báo xanh với dòng
   * "… 12/2026/KDTM-ST 16/10/2026 Đàm Văn Thuận - Dự thảo — chưa ký số" — số do hệ thống cấp ngay
   * lúc tạo (nút đổi thành "Hủy cấp số"), còn bản án thì vẫn là nháp. Bước 23 đọc "Kết quả giải
   * quyết" nên nhận bản án nháp là thừa nhận một cái xanh giả.
   */
  if (!daBanHanhBanAnPT(dong)) {
    throw new Error(
      `Bản án phúc thẩm đã có số ${soBanAnPhucTham} nhưng CHƯA BAN HÀNH (vẫn là nháp/chưa ký).\n  Dòng: ${dong}`,
    );
  }
  /** Ngày và Tòa cũng lấy theo bản ghi khi có: tra cứu khớp đúng giá trị hệ thống lưu */
  return {
    soBanAnPhucTham,
    ngayBanAnPhucTham: (banGhi?.ngayBanAn ? String(banGhi.ngayBanAn) : '') || ngayMoPhienToa,
    toaRaBanAnPhucTham: (banGhi?.tenDonViRaBanAn ? String(banGhi.tenDonViRaBanAn) : '') || toaRaBanAnPhucTham,
  };
}

/**
 * SỬA TAY (cổng `QLA_SUA_CHU_TOA=1`): phân công lại HĐXX phúc thẩm để CHỦ TỌA là tài khoản đang
 * chạy, bằng nút "Thay đổi phân công" của tab Phân công.
 *
 * Cần cho những vụ lập trước 02/10/2026 — chủ tọa khi ấy lấy người đầu danh mục nên bản án phúc thẩm
 * (75-DS) khoá người ký vào người đó và không tài khoản nào trong bộ chạy được "Ký logic".
 */
async function doiChuToaPhucTham(page: Page, input: DuLieuVao, ghi: GhiChu) {
  await moTab(page, 'Phân công');
  await choHetSpin(page);

  const nutDoi = page.getByRole('button', { name: 'Thay đổi phân công', exact: true }).first();
  if (!(await hienTrong(nutDoi, 10_000))) {
    const nut = [
      ...new Set(
        (await page.getByRole('button').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean),
      ),
    ];
    throw new Error(`Tab "Phân công" không có nút "Thay đổi phân công". Nút đang có: ${nut.slice(0, 20).join(' | ')}`);
  }
  await nutDoi.click();
  await choHetSpin(page);

  const muc = page.getByRole('menuitem', { name: /84-DS|phúc thẩm|thay đổi/i }).first();
  if (await hienTrong(muc, 4_000)) {
    ghi('đổi chủ tọa', `chọn mục "${(await muc.innerText()).replace(/\s+/g, ' ').trim()}"`);
    await muc.click();
    await choHetSpin(page);
  }

  const bm = bieuMauDangMo(page);
  await expect(bm, 'Bấm "Thay đổi phân công" nhưng không mở được biểu mẫu').toBeVisible({ timeout: 30_000 });
  for (const d of await moTaForm(bm)) ghi('đổi chủ tọa · ô', d);
  ghi(
    'đổi chủ tọa · dòng bảng',
    (await bm.locator('.ant-table-row').allInnerTexts().catch(() => []))
      .map(s => s.replace(/\s+/g, ' ').trim().slice(0, 70))
      .join(' / ') || '(bảng rỗng)',
  );
  ghi(
    'đổi chủ tọa · nút',
    [
      ...new Set(
        (await bm.getByRole('button').allInnerTexts().catch(() => []))
          .map(s => s.replace(/\s+/g, ' ').trim())
          .filter(Boolean),
      ),
    ]
      .slice(0, 20)
      .join(' | ') || '(không có)',
  );

  /**
   * ⚠ "Thay đổi phân công" KHÔNG mở lại 84-DS mà mở **85-DS** — quyết định THAY THẾ người tiến hành
   * tố tụng. Ô của nó khác hẳn 84-DS (đo 02/10/2026): "Quyết định phân công" (chọn quyết định cũ),
   * "Người đang được phân công", "Vai trò hiện tại" (chỉ xem), "Người được phân công thay thế",
   * "Lý do thay đổi"; nút là "Thêm | Lưu | Đóng" và bảng bên dưới ban đầu RỖNG.
   */
  const gtNgay = await dienOTheoNhan(page, bm, /Ngày quyết định/i, ddmmyyyy(new Date())).catch(() => '');
  if (gtNgay) ghi('đổi chủ tọa', `Ngày quyết định = ${gtNgay}`);
  const gtKy = await dienOTheoNhan(page, bm, /Người ký\/người phân công/i, input.nguoiKyPhucTham, true).catch(
    (e: Error) => {
      ghi('đổi chủ tọa', `không đặt được Người ký: ${e.message.slice(0, 100)}`);
      return '';
    },
  );
  if (gtKy) ghi('đổi chủ tọa', `Người ký = ${gtKy}`);
  await choHetSpin(page);

  const qdCu = await dienOTheoNhan(page, bm, /^Quyết định phân công/i).catch((e: Error) => {
    ghi('đổi chủ tọa', `không chọn được "Quyết định phân công": ${e.message.slice(0, 100)}`);
    return '';
  });
  ghi('đổi chủ tọa', `quyết định phân công cũ = ${qdCu || '(không chọn được)'}`);
  await choHetSpin(page);

  /**
   * Tìm người đang giữ vai CHỦ TỌA bằng cách thử lần lượt từng người trong danh mục rồi ĐỌC ô
   * "Vai trò hiện tại" — không đoán theo tên, vì chủ tọa do lượt chạy trước chọn (ai cũng có thể).
   */
  const oNguoiCu = oTheoNhan(page, bm, /Người đang được phân công/i);
  const oVaiTroHienTai = bm
    .locator('.ant-form-item')
    .filter({ has: page.locator('label').filter({ hasText: /Vai trò hiện tại/i }) })
    .first();
  const docVaiTro = async () =>
    (
      (await oVaiTroHienTai.locator('.ant-select-selection-item').first().innerText().catch(() => '')) ||
      (await oVaiTroHienTai.locator('input').first().inputValue().catch(() => ''))
    )
      .replace(/\s+/g, ' ')
      .trim();

  let nguoiCu = '';
  const daThu: string[] = [];
  for (let i = 0; i < 8; i++) {
    const ten = await chonSelectTheoThuTu(page, oNguoiCu, i).catch(() => '');
    if (!ten || daThu.includes(ten)) break;
    daThu.push(ten);
    await choHetSpin(page);
    const vai = await docVaiTro();
    ghi('đổi chủ tọa', `thử "${ten}" → vai trò hiện tại: ${vai || '(trống)'}`);
    if (/chủ tọa/i.test(vai)) {
      nguoiCu = ten;
      break;
    }
  }
  if (!nguoiCu) {
    throw new Error(`Không tìm được người đang giữ vai chủ tọa trong danh mục. Đã thử: ${daThu.join(' | ')}`);
  }

  const nguoiMoi = await chonSelect(page, oTheoNhan(page, bm, /Người được phân công thay thế/i), input.nguoiKyPhucTham);
  ghi('đổi chủ tọa', `${nguoiCu} → ${nguoiMoi}`);
  const lyDo = await dienOTheoNhan(page, bm, /Lý do thay đổi/i, input.lyDoDoiChuToaPhucTham).catch(() => '');
  if (lyDo) ghi('đổi chủ tọa', `lý do = ${lyDo}`);
  await choHetSpin(page);

  // "Thêm" đưa cặp (người cũ → người thay thế) vào bảng; không bấm thì "Lưu" không có gì để lưu
  const truoc = await bm.locator('.ant-table-row').count();
  await nutTheoChu(bm, /^Thêm$/).click({ force: true });
  await expect
    .poll(() => bm.locator('.ant-table-row').count(), {
      message: `Bấm "Thêm" nhưng cặp thay thế (${nguoiCu} → ${nguoiMoi}) không vào bảng`,
      timeout: 30_000,
    })
    .toBeGreaterThan(truoc);
  ghi(
    'đổi chủ tọa · dòng bảng sau khi thêm',
    (await bm.locator('.ant-table-row').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim().slice(0, 80)).join(' / '),
  );

  await luuBieuMau(page, bm, '85-DS (thay đổi chủ tọa phúc thẩm)', ghi);
  await laySoVaKyLogic(page, bm, ghi, '85-DS (thay đổi chủ tọa phúc thẩm)');
  await dongBieuMau(page, bm);
  await choHetSpin(page);

  // Bằng chứng: tab Phân công phải thấy chủ tọa mới
  await moTab(page, 'Phân công');
  await choHetSpin(page);
  const dsDong = (await page.locator('.ant-table-row').allInnerTexts().catch(() => []))
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  ghi('đổi chủ tọa · tab Phân công', dsDong.slice(0, 6).join(' / ').slice(0, 400) || '(bảng rỗng)');
  if (!dsDong.some(d => d.includes(input.nguoiKyPhucTham))) {
    throw new Error(
      `Lập 85-DS xong mà tab "Phân công" không thấy ${input.nguoiKyPhucTham}.\n  Đang có: ${dsDong.slice(0, 6).join(' / ')}`,
    );
  }
}

/**
 * SỬA TAY (cổng `QLA_SUA_CHU_TOA=1`): XOÁ bản án phúc thẩm còn là NHÁP để lập lại.
 *
 * Chỉ xoá dòng CHƯA BAN HÀNH; dòng đã ký thì dừng ngay, không bao giờ xoá văn bản đã có hiệu lực.
 */
async function xoaBanAnNhapPT(page: Page, ghi: GhiChu) {
  await moTab(page, 'Xét xử');
  await choHetSpin(page);
  await moKhoi(page, /Kết quả xét xử/, ghi).catch(() => {});

  const dong = bangBanAn(page).locator('.ant-table-row').first();
  if (!(await hienTrong(dong, 5_000))) {
    ghi('xoá bản án nháp', 'bảng bản án phúc thẩm đang rỗng — không có gì để xoá');
    return;
  }
  const chu = (await dong.innerText()).replace(/\s+/g, ' ').trim();
  if (daBanHanhBanAnPT(chu)) {
    throw new Error(`Bản án phúc thẩm đã ban hành — KHÔNG xoá. Dòng: ${chu}`);
  }
  ghi('xoá bản án nháp', `sẽ xoá: ${chu}`);

  const mat = dong.getByRole('img', { name: 'eye' }).first();
  await expect(mat, 'Dòng bản án nháp không có icon "eye" để mở').toBeVisible({ timeout: 10_000 });
  await mat.scrollIntoViewIfNeeded().catch(() => {});
  await mat.click({ force: true });
  await choHetSpin(page);

  const bm = bieuMauDangMo(page);
  await expect(bm, 'Không mở được bản án nháp để xoá').toBeVisible({ timeout: 30_000 });

  // Đang chờ ký thì phải thu hồi trước, không thì nút xoá bị khoá
  const nutThuHoi = nutTheoChu(bm, /^Thu hồi$/i);
  if (await hienTrong(nutThuHoi, 4_000)) {
    await nutThuHoi.click({ force: true });
    await xacNhanHopThoai(page);
    await choHetSpin(page);
    await nghi(page, 1200, 1800);
    ghi('xoá bản án nháp', `đã thu hồi trình ký — toast: ${(await toastGanDay(page, 20_000)).join(' | ').slice(0, 120)}`);
  }
  // Cấp số rồi thì huỷ cấp số trước khi xoá
  const nutHuySo = nutTheoChu(bm, /^Hủy cấp số$/i);
  if (await hienTrong(nutHuySo, 4_000)) {
    await nutHuySo.click({ force: true });
    await xacNhanHopThoai(page);
    await choHetSpin(page);
    await nghi(page, 1200, 1800);
    ghi('xoá bản án nháp', `đã hủy cấp số — toast: ${(await toastGanDay(page, 20_000)).join(' | ').slice(0, 120)}`);
  }

  const nutXoa = nutTheoChu(bm, /^Xóa|^Xoá/i);
  if (!(await hienTrong(nutXoa, 5_000))) {
    throw new Error(`Bản án nháp không có nút "Xóa". Nút đang có: ${await dsNutBm(bm)}`);
  }
  await nutXoa.click({ force: true });
  await xacNhanHopThoai(page);
  await choHetSpin(page);
  ghi('xoá bản án nháp', `toast: ${(await toastGanDay(page, 30_000)).join(' | ').slice(0, 160) || '(không có)'}`);
  await dongBieuMau(page, bm);
  await choHetSpin(page);

  await moTab(page, 'Xét xử');
  await moKhoi(page, /Kết quả xét xử/, ghi).catch(() => {});
  const conLai = await bangBanAn(page).locator('.ant-table-row').count();
  if (conLai) {
    const sau = (await bangBanAn(page).locator('.ant-table-row').first().innerText()).replace(/\s+/g, ' ').trim();
    throw new Error(`Bấm xoá nhưng bảng bản án phúc thẩm vẫn còn ${conLai} dòng. Dòng đầu: ${sau}`);
  }
  ghi('xoá bản án nháp', 'bảng bản án phúc thẩm đã rỗng — lập lại được');
}

/** Liệt kê nút của biểu mẫu để thông báo lỗi nói được vì sao */
async function dsNutBm(bm: Locator): Promise<string> {
  const ds = [
    ...new Set(
      (await bm.getByRole('button').allInnerTexts().catch(() => []))
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    ),
  ];
  return ds.slice(-12).join(' | ') || '(không nút nào)';
}

/**
 * Mở lại bản án phúc thẩm còn là NHÁP rồi ký nốt — không lập thêm bản án thứ hai.
 *
 * Khác `moLaiVaKy` dùng chung ở chỗ: PHẢI đặt lại "Người ký" thành tài khoản đang chạy trước khi
 * lưu. Bản nháp sinh ra ở lượt trước mang người ký là thẩm phán chủ tọa, nên biểu mẫu chỉ có
 * "Trình ký" (lượt sau mở ra thấy nút đã thành "Đã trình ký") và không bao giờ ký được.
 */
async function moLaiBanAnPTVaKy(
  page: Page,
  dong: Locator,
  input: DuLieuVao,
  ghi: GhiChu,
): Promise<{ toa: string; so: string }> {
  const mat = dong.getByRole('img', { name: 'eye' }).first();
  await expect(mat, 'Dòng bản án phúc thẩm không có icon "eye" để mở lại').toBeVisible({ timeout: 10_000 });
  await mat.scrollIntoViewIfNeeded().catch(() => {});
  await mat.click({ force: true });
  await choHetSpin(page);

  const bm = bieuMauDangMo(page);
  await expect(bm, 'Bấm icon xem mà không mở lại được bản án phúc thẩm').toBeVisible({ timeout: 30_000 });
  ghi(
    '22 bản án PT · mở lại · nút',
    [
      ...new Set(
        (await bm.getByRole('button').allInnerTexts().catch(() => []))
          .map(s => s.replace(/\s+/g, ' ').trim())
          .filter(Boolean),
      ),
    ]
      .slice(-8)
      .join(' | ') || '(không có)',
  );

  /**
   * Bản nháp đã "Đã trình ký" thì phải THU HỒI trước, không thì không bao giờ có nút ký: biểu mẫu
   * chỉ còn "Đã trình ký" (khoá) + "Thu hồi" (đo 02/10/2026).
   */
  const nutThuHoi = bm.getByRole('button', { name: /^Thu hồi$/i }).first();
  if (await hienTrong(nutThuHoi, 3_000)) {
    await nutThuHoi.click({ force: true });
    await xacNhanHopThoai(page);
    await choHetSpin(page);
    await nghi(page, 1200, 1800);
    ghi('22 bản án PT · mở lại', `đã thu hồi trình ký — toast: ${(await toastGanDay(page, 20_000)).join(' | ').slice(0, 120)}`);
  }

  const nguoiKy = await dienOTheoNhan(page, bm, /Người ký \(Thẩm phán chủ tọa\)/i, input.nguoiKyPhucTham, true).catch(
    (e: Error) => {
      ghi('22 bản án PT · mở lại', `không đặt lại được Người ký: ${e.message.slice(0, 110)}`);
      return '';
    },
  );
  if (nguoiKy) ghi('22 bản án PT · mở lại', `Người ký = ${nguoiKy}`);
  await choHetSpin(page);

  // Mở lại bản nháp thì "Viện kiểm sát nhận" rỗng trở lại (không được lưu) mà vẫn bắt buộc
  const vks = await dienOTheoNhan(page, bm, /Viện kiểm sát nhận/i, input.vienKiemSatNhan).catch((e: Error) => {
    ghi('22 bản án PT · mở lại', `không điền được Viện kiểm sát nhận: ${e.message.slice(0, 110)}`);
    return '';
  });
  if (vks) ghi('22 bản án PT · mở lại', `Viện kiểm sát nhận = ${vks}`);
  await choHetSpin(page);

  await luuBieuMau(page, bm, 'bản án phúc thẩm (75-DS) · cập nhật', ghi, /Cập nhật bản án|Thêm mới bản án|^Lưu$/);
  await laySoVaKyLogic(page, bm, ghi, 'bản án phúc thẩm (75-DS)');
  const soThat = await docSoBanAnTrenBieuMau(bm, ghi);
  const toaRa = await docToaRaBanAnPT(bm, ghi);
  await dongBieuMau(page, bm);
  await choHetSpin(page);
  return { toa: toaRa, so: soThat };
}

/** Dòng bản án phúc thẩm đã ban hành? "Dự thảo", "chưa ký số", "Chưa có hiệu lực" đều là CHƯA. */
function daBanHanhBanAnPT(dong: string): boolean {
  if (!dong) return false;
  if (/Dự thảo|chưa ký|Chưa có hiệu lực|\bChưa\b/i.test(dong)) return false;
  return /Đã ký|Hoàn thành|Đã ban hành|Có hiệu lực/i.test(dong);
}

// ═════════ BƯỚC 23 · VERIFY kết quả phúc thẩm ═════════
/**
 * Nguồn nghiệp vụ: StepData KDTM · Phúc thẩm Step4.7 — sau khi ban hành bản án, "Kết quả giải quyết"
 * của vụ phải là **Giữ nguyên bản án sơ thẩm** (khớp quyết định đã chốt ở 51-DS và 75-DS).
 *
 * Bước này KHÔNG tạo dữ liệu: nó chỉ ĐỌC để xác nhận chuỗi 20 → 21 → 22 đã khớp nhau. Vì thế bằng
 * chứng phải là CHỮ ĐỌC ĐƯỢC TRÊN MÀN, không phải giá trị gieo.
 */
export async function phucThamKiemKetQua(page: Page, ghi: GhiChu, soBanAnPhucTham: string) {
  await moTab(page, /Kết quả phúc thẩm|Kết quả giải quyết/);
  await choHetSpin(page);
  await nghi(page, 1200, 1800);

  /**
   * Nội dung tab nằm NGOÀI `[role=tabpanel]` ở màn này (bài học của `moTabVaCho`), nên đọc cả vùng
   * `main` rồi tìm chữ — chắc ăn hơn là đoán khối.
   */
  const chu = (await page.locator('main').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  if (!chu) throw new Error('Tab "Kết quả phúc thẩm" không đọc được nội dung nào');

  /**
   * NEO THEO NHÃN, không tìm chữ "Giữ nguyên" trần: tab còn một khối "Hiệu lực theo từng yêu cầu"
   * cũng chứa chữ đó, cắt tự do thì bằng chứng ra "Giữ nguyên Hiệu lực theo từng yêu cầu của bản án
   * s…" — đúng nghĩa nhưng là rác (đo 02/10/2026).
   */
  const ketQuaPhucTham = /Quyết định đối với bản án sơ thẩm\s*(Giữ nguyên|Sửa|Hủy)/i.exec(chu)?.[1]?.trim() || '';
  if (!ketQuaPhucTham) {
    throw new Error(
      `Tab "Kết quả phúc thẩm" không có nhãn "Quyết định đối với bản án sơ thẩm" kèm kết quả.\n` +
        `  Màn đang hiện: ${chu.slice(0, 500)}`,
    );
  }
  if (!/Giữ nguyên/i.test(ketQuaPhucTham)) {
    throw new Error(
      `Kết quả phúc thẩm là "${ketQuaPhucTham}", không phải "Giữ nguyên" như 51-DS và 75-DS đã chốt.`,
    );
  }

  // Bản án đã ban hành thì tab phải ghi "Đã có hiệu lực" (Điều 313 BLTTDS — hiệu lực ngay khi tuyên)
  const hieuLuc = /Trạng thái\s*([^|]{3,40}?)(?=\s*Quyết định|\s{2,}|$)/i.exec(chu)?.[1]?.trim() || '';
  ghi('23 kết quả PT', `trạng thái = ${hieuLuc || '(không đọc được)'} · kết quả = ${ketQuaPhucTham}`);
  if (!/Đã có hiệu lực|Có hiệu lực/i.test(hieuLuc)) {
    throw new Error(
      `Tab "Kết quả phúc thẩm" báo trạng thái "${hieuLuc || '(không đọc được)'}" — bản án ${soBanAnPhucTham} ` +
        `chưa có hiệu lực.\n  Màn đang hiện: ${chu.slice(0, 400)}`,
    );
  }
  return { ketQuaPhucTham };
}
