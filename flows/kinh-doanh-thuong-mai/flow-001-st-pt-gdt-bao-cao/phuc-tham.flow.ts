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
import { choHetSpin, chonSelect, chonSelectTheoThuTu, dienOTheoNhan, go, hienTrong, moTaForm, nghi, nguyenNhanLoi, oTheoNhan, toastGanDay } from '../../../common/antd';
import { bieuMauDangMo, dongBieuMau, laySoVaKyLogic, luuBieuMau, moTab, themBieuMauTuDanhSach } from '../../../common/bieu-mau';
import { ddmmyyyy } from '../../../common/du-lieu';
import { soTatDinh } from '../../../khung/so-tat-dinh';
import { TEN_BI_DON, TEN_NGUYEN_DON } from '../../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';
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

  const tabCho = page.getByRole('tab', { name: /Chờ tiếp nhận/i }).first();
  if ((await tabCho.getAttribute('aria-selected')) !== 'true') {
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
    const nutThuLy = page.getByRole('button', { name: /Thụ lý/i }).first();
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
    const nutThuLy = page.getByRole('button', { name: /Thụ lý/i }).first();
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
      [/Nguyên đơn đại diện/, TEN_NGUYEN_DON],
      [/Bị đơn đại diện/, TEN_BI_DON],
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
          const nguoi = await chonSelectTheoThuTu(page, oNguoi, 0, daChon);
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
    /**
     * StepData 3.1 chỉ định 83-DS, nhưng mẫu đó HỎNG trên STG: mở ra chỉ có header và
     * "Lưu | Đóng", thân biểu mẫu trống vì máy chủ trả **400** (người dùng xác nhận 01/10/2026).
     * Dùng mẫu tương đương trong cùng danh mục — "Thông báo về việc nộp tiền tạm ứng án phí
     * (05-TB-DS)". Danh mục đầy đủ: 82-DS · 83-DS · 29-DS · 05-TB-DS · 06-TB-DS.
     */
    maTim: '05-TB-DS',
    ma: /nộp tiền tạm ứng án phí/i,
    ten: '05-TB-DS (tạm ứng án phí phúc thẩm — thay 83-DS lỗi 400)',
    // Ba ô bắt buộc riêng của mẫu này (hệ thống nêu đích danh khi chặn lưu, đo 01/10/2026)
    oThem: [
      [/Ngày thông báo/i, ddmmyyyy(new Date())],
      [/phải nộp/i, TEN_BI_DON],
      [/Cơ quan thi hành án thu tiền/i, undefined],
      [/Địa chỉ cơ quan thi hành án/i, input.diaChiCoQuanThiHanhAn],
    ],
    nguoiKy: input.nguoiKyPhucTham,
  }).then(dong => ({ soThongBao83DS: dong }));
}

// ═════════ BƯỚC 20 · Quyết định đưa vụ án ra xét xử phúc thẩm (66-DS) ═════════
/** Nguồn: StepData · Phúc thẩm Step3.2–3.4 */
export async function phucThamDuaRaXetXu(page: Page, input: DuLieuVao, ghi: GhiChu) {
  const dong = await lapBieuMauPT(page, ghi, {
    tab: 'Chuẩn bị xét xử',
    tieuDeKhoi: /Danh sách quyết định|Quyết định/i,
    tenNut: /Thêm mới quyết định/i,
    maTim: '66-DS',
    ma: /đưa vụ án ra xét xử phúc thẩm/i,
    ten: '66DS (đưa vụ án ra xét xử phúc thẩm)',
    nguoiKy: input.nguoiKyPhucTham,
  });
  return { soQuyetDinh66DS: dong, ngayMoPhienToaPhucTham: ddmmyyyy(new Date()) };
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

  const bm = soCombo ? await themBieuMauTuDanhSach(page, khoi, opt.maTim, opt.tenNut) : bieuMauDangMo(page);
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

  await luuBieuMau(page, bm, opt.ten, ghi);
  await laySoVaKyLogic(page, bm, ghi, opt.ten);
  await dongBieuMau(page, bm);
  await choHetSpin(page);
  await moTab(page, opt.tab);

  const dong = (
    await khoiPT(page, opt.tieuDeKhoi, opt.tenNut)
      .locator('.ant-table-row')
      .filter({ hasText: opt.ma })
      .first()
      .innerText()
      .catch(() => '')
  )
    .replace(/\s+/g, ' ')
    .trim();
  if (!dong) {
    const ds = (await page.locator('.ant-table-row').allInnerTexts())
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    throw new Error(
      `Lập ${opt.ten} xong nhưng không thấy dòng khớp ${opt.ma}. ` +
        `Lưới ${ds.length} dòng: ${ds.slice(0, 4).join(' // ') || '(rỗng)'}`,
    );
  }
  ghi(opt.ten, dong);
  return dong;
}
