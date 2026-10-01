import { Locator, Page, expect } from '@playwright/test';

/** Tốc độ gõ phím (ms/ký tự), chỉnh qua QLA_GO_PHIM_MS; 0 = điền ngay */
let TOC_DO_GO = Number(process.env.QLA_GO_PHIM_MS ?? 40);
/**
 * Hệ số thời gian nghỉ giữa các thao tác (1 = như người; chế độ điền nhanh rút còn 0.3).
 * QLA_GO_PHIM_MS=0 (chạy seed) tự bật luôn chế độ nhanh — trước đây phải gọi datTocDoGo() mới rút nghỉ,
 * nên đợt seed 27–28/09 chạy ở tốc độ "như người": ~69 chỗ nghỉ cố định, tốn 10–25s mỗi bước.
 */
let HE_SO_NGHI = TOC_DO_GO === 0 ? 0.3 : 1;
/** Đổi tốc độ gõ trong phiên chạy (vd. script seed dùng 0 = điền ngay, vẫn thao tác qua UI) */
export const datTocDoGo = (ms: number) => {
  TOC_DO_GO = ms;
  HE_SO_NGHI = ms === 0 ? 0.3 : 1;
};

/** Nghỉ ngắn ngẫu nhiên giữa các thao tác, giống người đang đọc/di chuột */
export const nghi = (page: Page, min = 150, max = 450) =>
  page.waitForTimeout(Math.round((min + Math.floor(Math.random() * (max - min))) * HE_SO_NGHI));

/**
 * Chờ lớp loading antd tan. Overlay .ant-spin-spinning phủ kín vùng đang tải và nuốt sự kiện chuột
 * ("subtree intercepts pointer events") nên click vào ô bên dưới bị treo tới hết actionTimeout.
 */
export async function choHetSpin(page: Page, timeout = 30_000) {
  await expect(page.locator('.ant-spin-spinning:visible')).toHaveCount(0, { timeout }).catch(() => {});
}

/**
 * Chọn radio antd theo nhãn, có kiểm chứng. Bấm ngay khi trang/tab vừa đổi thì React chưa gắn
 * handler nên click "không đổi trạng thái" → chờ hết loading rồi bấm cả ô bọc (.ant-radio-wrapper).
 */
export async function chonRadio(page: Page, nhan: string | RegExp) {
  const o = page.getByRole('radio', { name: nhan });
  const boc = o.locator('xpath=ancestor::label[contains(concat(" ", normalize-space(@class), " "), " ant-radio-wrapper ")][1]');
  await choHetSpin(page);
  await expect(o.first()).toBeVisible({ timeout: 30_000 });
  for (let lan = 0; lan < 4; lan++) {
    if (await o.first().isChecked().catch(() => false)) return;
    await (lan % 2 === 0 ? boc.first() : o.first()).click({ force: true }).catch(() => {});
    await nghi(page, 600, 1000);
  }
  await expect(o.first(), `Không chọn được radio "${nhan}"`).toBeChecked({ timeout: 10_000 });
}

/** Gõ vào ô input/textarea như người: click, xoá nội dung cũ, gõ từng ký tự */
export async function go(o: Locator, text: string) {
  await choHetSpin(o.page());
  await o.scrollIntoViewIfNeeded();
  // Ô sát mép trên bị thanh breadcrumb dính (app-page-container-breadcrumb-affix) che → đưa ra giữa màn
  await o.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => {});
  // Ô bị khoá/readonly thì báo lỗi rõ ràng thay vì treo
  await expect(o, "Ô nhập đang bị khoá, không thể nhập").toBeEditable({ timeout: 15_000 });
  const toiDa = Number(await o.getAttribute('maxlength'));
  if (toiDa && text.length > toiDa) {
    throw new Error(`Ô #${await o.getAttribute('id')} tối đa ${toiDa} ký tự, giá trị dài ${text.length}: "${text}"`);
  }
  for (let lan = 0; lan < 3; lan++) {
    await o.click();
    await o.fill('');
    // Chuỗi dài (vd. nội dung đơn ~500 ký tự) gõ lâu hơn actionTimeout 30s → timeout theo độ dài chuỗi
    if (TOC_DO_GO > 0 && lan === 0) await o.pressSequentially(text, { delay: TOC_DO_GO, timeout: 30_000 + text.length * TOC_DO_GO * 3 });
    else await o.fill(text);
    await nghi(o.page());
    // Form render lại / mask nhập liệu có thể làm mất ký tự → kiểm tra, sai thì nhập lại
    if ((await o.inputValue()) === text) return;
  }
  await expect(o, 'Giá trị sau khi nhập không đúng').toHaveValue(text);
}

/** Gõ ngày DD/MM/YYYY vào DatePicker antd (DatePickerNumericInput), Enter để chốt */
export async function chonNgay(o: Locator, ngay: string) {
  await go(o, ngay);
  await o.press('Enter');
  await expect(o).toHaveValue(ngay);
}

/**
 * Chờ tối đa `ms` xem phần tử có hiện không (true/false, không ném lỗi).
 * Lưu ý: locator.isVisible({ timeout }) KHÔNG chờ (Playwright bỏ qua timeout) → dùng hàm này.
 */
export const hienTrong = (o: Locator, ms: number) =>
  o.waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);

/** Popup dropdown đang mở (antd render ra body) */
const dropdownDangMo = (page: Page) => page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();

/** Khung .ant-select bao ngoài ô input có id/selector cho trước */
/** Khung .ant-select bao ngoài ô input (đi ngược lên từ input, dùng được cả khi input nằm trong modal/drawer) */
const khungSelect = (_page: Page, input: Locator) =>
  input.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');

/**
 * Dropdown của đúng ô Select: antd gắn aria-controls="<id>_list" lên input và render #<id>_list trong dropdown.
 * Không lấy "dropdown cuối cùng" vì có thể trúng dropdown khác (vd. AutoComplete tra cứu người ở ô Họ và tên).
 */
async function dropdownCua(page: Page, input: Locator) {
  const ma = await input.getAttribute('aria-controls').catch(() => null);
  return ma
    ? page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').filter({ has: page.locator(`[id="${ma}"]`) })
    : dropdownDangMo(page);
}

/**
 * Chờ một BẢNG antd tải xong: hết spin, và đã có dòng dữ liệu HOẶC đã hiện "không có dữ liệu".
 *
 * Dùng trước khi kết luận "không thấy dòng nào": đo trên 526 lần chạy bước của đợt 27–28/09/2026,
 * 324 lần có vụ hỏng chiếm 24,1 trên 31,5 giờ. Phần lớn là chờ `toBeVisible({ timeout: 60_000 })`
 * một dòng KHÔNG BAO GIỜ xuất hiện. Bảng đã tải xong mà 0 dòng khớp thì báo lỗi ngay, đừng chờ.
 */
export async function luoiDaTai(page: Page, timeout = 30_000) {
  await choHetSpin(page, timeout);
  await expect(page.locator('.ant-table-row:visible, .ant-empty, .ant-table-placeholder').first())
    .toBeVisible({ timeout })
    .catch(() => {});
}

/**
 * Chờ danh sách option NGỪNG ĐỔI rồi mới đọc.
 *
 * Vì sao cần: ô chọn của hệ thống là ProFormSelectCustom
 * (qla-webapp/src/components/ProFormSelectCustom/index.tsx:236-239) đặt
 *   filterOption: showSearch ? false : …        → KHÔNG lọc phía trình duyệt
 *   onSearch: debounce(v => setTuKhoaTimKiem(v), 400)  → gọi LẠI API danh mục
 * nên mỗi lần từ khoá đổi là một vòng: chờ 400ms → gọi API → options thay → rc-virtual-list vẽ lại.
 * Đọc options ngay sau khi gõ là đọc danh sách CŨ → click nhầm mục → chạy lại cả vòng thử lại.
 * Đó là nguồn của hiện tượng danh sách "giật giật" và phần lớn thời gian chết khi chọn.
 */
async function choDanhSachOnDinh(dd: Locator, toiDaMs = 4_000) {
  const doc = () =>
    dd.locator('.ant-select-item-option').evaluateAll(es => es.map(e => e.getAttribute('title') || e.textContent || '').join('\u0001'));
  const page = dd.page();
  let truoc = await doc().catch(() => '');
  const hetHan = Date.now() + toiDaMs;
  while (Date.now() < hetHan) {
    await page.waitForTimeout(150);
    const sau = await doc().catch(() => '');
    // Đang loading (Spin trong notFoundContent) thì chưa tính là ổn định
    if (sau === truoc && sau !== '' && !(await dd.locator('.ant-spin').count())) return;
    truoc = sau;
  }
}

/**
 * Chọn option trong antd Select.
 * - `chon` là chuỗi: điền từ khoá để lọc (nếu Select có search) rồi chọn option có title trùng/chứa chuỗi đó
 * - `chon` bỏ trống: chọn option đầu tiên
 * Form render lại có thể đóng dropdown giữa chừng → thử lại tối đa 3 lần. Trả về nhãn đã chọn.
 */
export async function chonSelect(
  page: Page,
  input: Locator,
  chon?: string | RegExp,
  /** false: không gõ để lọc, chỉ mở danh sách và bấm (tránh lỗi FE lấy nhãn tô sáng từ khoá làm giá trị) */
  { goDeLoc = true }: { goDeLoc?: boolean } = {},
): Promise<string> {
  const khung = khungSelect(page, input);
  await choHetSpin(page);
  // QLA_DO_THOI_GIAN=1: in thời gian mỗi lần chọn để đo chỗ tốn thời gian, không đổi hành vi
  const batDau = process.env.QLA_DO_THOI_GIAN === '1' ? Date.now() : 0;
  const doXong = (nhan: string, lan: number) => {
    if (batDau) console.log(`    ⏱ chọn "${nhan}" ${((Date.now() - batDau) / 1000).toFixed(1)}s (lần thử ${lan + 1})`);
  };
  let loiCuoi: unknown;
  for (let lan = 0; lan < 3; lan++) {
    try {
      // Trong vòng thử lại: form render lại có thể thay phần tử ("not attached to the DOM")
      // Cuộn ô ra giữa màn: ô sát đáy thì dropdown mở xuống bị thanh nút cố định (Tải file / Lưu thông tin) che mất
      await khung.evaluate(e => e.scrollIntoView({ block: 'center' }));
      await expect(khung, 'Ô chọn đang bị khoá').not.toHaveClass(/ant-select-disabled/, { timeout: 30_000 });
      const dd = await dropdownCua(page, input);
      if (!(await dd.isVisible())) await khung.click();
      await expect(dd).toBeVisible({ timeout: 10_000 });
      // Lần 1 gõ theo tốc độ đang đặt; lần 2 gõ chậm (form nặng render lại có thể nuốt ký tự khi gõ nhanh);
      // lần 3 không gõ, cuộn danh sách tìm mục
      const goLoc = goDeLoc && lan < 2;
      // Xoá từ khoá gõ dở của lần trước (ô không cho tìm kiếm thì fill lỗi → bỏ qua)
      if (lan > 0 && (await input.inputValue().catch(() => ''))) await input.fill('', { timeout: 2_000 }).catch(() => {});
      let daGoLoc = false;
      if (goLoc && typeof chon === 'string' && (await input.isEditable().catch(() => false)) && !(await input.inputValue())) {
        // ĐIỀN MỘT LẦT thay vì gõ từng ký tự: onSearch của ProFormSelectCustom debounce 400ms rồi gọi
        // lại API danh mục, nên gõ 20 ký tự × 40ms là 20 lần đổi từ khoá → nhiều vòng gọi API và vẽ lại
        // danh sách (giật, chọn nhầm). fill() phát đúng MỘT sự kiện input → đúng MỘT vòng.
        // Danh sách lớn (vd. Nghề nghiệp ~1000 mục) lọc chậm → chỉ lấy 20 ký tự đầu làm từ khoá.
        await input.fill(chon.slice(0, 20));
        daGoLoc = true;
      }
      await expect(dd.locator('.ant-select-item-option').first()).toBeVisible({ timeout: 30_000 });
      // Sau khi đổi từ khoá phải chờ hết debounce 400ms + API danh mục trả về rồi mới đọc options
      if (daGoLoc) {
        await page.waitForTimeout(450);
        await choDanhSachOnDinh(dd);
      }
      // Ưu tiên option trùng khớp title (tránh "Nguyên đơn" khớp nhầm "…của nguyên đơn"), không có thì khớp chuỗi con
      const trungKhop = typeof chon === 'string' ? dd.locator(`.ant-select-item-option[title="${chon}"]`) : undefined;
      // Chưa thấy mục trùng khớp nguyên văn (danh sách ảo chỉ render phần đang hiện) → cuộn tìm
      if (chon && (!goLoc || (trungKhop && !(await trungKhop.count())))) {
        // Không gõ lọc: danh sách ảo chỉ render vài mục → cuộn dần như người dùng tới khi thấy mục cần chọn
        const khop = () => (trungKhop ? trungKhop.or(dd.locator('.ant-select-item-option').filter({ hasText: chon })) : dd.locator('.ant-select-item-option').filter({ hasText: chon }));
        const cuon = dd.locator('.rc-virtual-list-holder').first();
        // Danh mục gọi API với size=100 (ProFormSelectCustom.queryParams) nên cuộn quá 100 mục là vô ích:
        // 60 vòng × 80% chiều cao khung đã phủ hết danh sách. Trước để 250 vòng × 80ms = tới 20s chết.
        for (let i = 0; i < 60 && !(await khop().count()); i++) {
          const het = await cuon.evaluate(h => {
            const truoc = h.scrollTop;
            h.scrollTop += h.clientHeight * 0.8;
            return h.scrollTop === truoc;
          }).catch(() => true);
          if (het) break;
          await page.waitForTimeout(80);
        }
      }
      const option = !chon
        ? dd.locator('.ant-select-item-option:not(.ant-select-item-option-disabled)').first()
        : trungKhop && (await trungKhop.count()) > 0
          ? trungKhop.first()
          : dd.locator('.ant-select-item-option').filter({ hasText: chon }).first();
      // Mục cần chọn không có trong danh mục → BÁO NGAY kèm các mục đang có, thay vì để getAttribute
      // chờ hết 30s rồi chỉ báo "Timeout" (không biết vì sao). Thường là do tên khai trong config
      // không thuộc đơn vị của tài khoản đang đăng nhập.
      if (chon && !(await option.count())) {
        const dsMuc = (
          await dd.locator('.ant-select-item-option').evaluateAll(es =>
            es.map(e => (e.getAttribute('title') || e.textContent || '').trim()),
          )
        ).filter(Boolean);
        throw new Error(
          `Danh mục không có mục "${typeof chon === 'string' ? chon : chon.source}". ` +
            `Đang có: ${dsMuc.slice(0, 15).join(' | ') || '(trống)'}${dsMuc.length > 15 ? ' …' : ''}`,
        );
      }
      const nhan = ((await option.getAttribute('title')) || (await option.innerText())).trim();
      // Bỏ chỗ nghỉ TRƯỚC khi bấm: danh sách đã được chờ ổn định ở trên nên không cần nghỉ thêm
      await option.click({ timeout: 5_000 });
      await nghi(page);
      // Xác nhận ô đã hiển thị giá trị vừa chọn (form render lại có thể làm mất lựa chọn)
      await expect(khung.locator('.ant-select-selection-item').first()).toBeVisible({ timeout: 5_000 });
      doXong(nhan, lan);
      return nhan;
    } catch (e) {
      loiCuoi = e;
      // Chỉ Escape khi dropdown còn mở: dropdown đã đóng thì Escape sẽ đóng luôn Drawer/Modal chứa ô chọn
      if (await dropdownDangMo(page).isVisible().catch(() => false)) await page.keyboard.press('Escape').catch(() => {});
      await nghi(page, 500, 800);
    }
  }
  throw loiCuoi;
}

/**
 * Mở ô chọn, đọc các mục đang có trong danh mục hệ thống, chọn mục đầu tiên chứa một trong các từ khoá
 * (theo thứ tự ưu tiên); không mục nào khớp thì chọn mục đầu tiên. Trả về nhãn đã chọn.
 */
export async function chonTheoTuKhoa(page: Page, input: Locator, tuKhoa: string[]): Promise<string> {
  const khung = khungSelect(page, input);
  await khung.evaluate(e => e.scrollIntoView({ block: 'center' }));
  const dd = await dropdownCua(page, input);
  if (!(await dd.isVisible())) await khung.click();
  await expect(dd.locator('.ant-select-item-option').first()).toBeVisible({ timeout: 30_000 });
  const nhan = (await dd.locator('.ant-select-item-option').evaluateAll(es => es.map(e => e.getAttribute('title') || e.textContent || ''))).map(t => t.trim());
  const chon = tuKhoa.map(k => nhan.find(t => t.toLowerCase().includes(k.toLowerCase()))).find(Boolean) ?? nhan[0];
  return chonSelect(page, input, chon, { goDeLoc: false });
}

/**
 * Chọn NGẪU NHIÊN một mục có sẵn trong danh mục: mở danh sách, cuộn tới vị trí theo `u` (0..1) rồi chọn một mục
 * đang hiện — như người dùng lướt danh sách và chọn. Giá trị vẫn là giá trị thật của hệ thống.
 * Dùng cho các ô không ràng buộc nghiệp vụ (dân tộc, tôn giáo, nghề nghiệp, trình độ...).
 */
export async function chonNgauNhien(page: Page, input: Locator, u: number): Promise<string> {
  const khung = khungSelect(page, input);
  let loiCuoi: unknown;
  for (let lan = 0; lan < 3; lan++) {
    try {
      await khung.evaluate(e => e.scrollIntoView({ block: 'center' }));
      await expect(khung, 'Ô chọn đang bị khoá').not.toHaveClass(/ant-select-disabled/, { timeout: 30_000 });
      const dd = await dropdownCua(page, input);
      if (!(await dd.isVisible())) await khung.click();
      await expect(dd.locator('.ant-select-item-option').first()).toBeVisible({ timeout: 30_000 });
      await dd
        .locator('.rc-virtual-list-holder')
        .first()
        .evaluate((h, u) => {
          h.scrollTop = Math.floor((h.scrollHeight - h.clientHeight) * u);
        }, u)
        .catch(() => {});
      await nghi(page, 120, 250);
      const ds = dd.locator('.ant-select-item-option:not(.ant-select-item-option-disabled)');
      const soMuc = await ds.count();
      if (!soMuc) throw new Error('Danh sách không có mục nào để chọn');
      const option = ds.nth(Math.min(soMuc - 1, Math.floor(u * soMuc)));
      const nhan = ((await option.getAttribute('title')) || (await option.innerText())).trim();
      await option.click({ timeout: 5_000 });
      await nghi(page);
      await expect(khung.locator('.ant-select-selection-item').first()).toBeVisible({ timeout: 5_000 });
      return nhan;
    } catch (e) {
      loiCuoi = e;
      if (await dropdownDangMo(page).isVisible().catch(() => false)) await page.keyboard.press('Escape').catch(() => {});
      await nghi(page, 400, 700);
    }
  }
  throw loiCuoi;
}

/**
 * Như chonSelect nhưng KHÔNG ném lỗi khi danh sách không có lựa chọn cần tìm (trả về false).
 * Dùng cho các bộ lọc mà danh sách chỉ liệt kê giá trị đang có dữ liệu (vd. "Mã đơn" ở Danh sách văn bản).
 */
export async function chonSelectNeuCo(page: Page, input: Locator, chon: string): Promise<boolean> {
  const khung = khungSelect(page, input);
  let loiCuoi: unknown;
  for (let lan = 0; lan < 3; lan++) {
    try {
      await khung.scrollIntoViewIfNeeded();
      await khung.click();
      const dd = await dropdownCua(page, input);
      await expect(dd).toBeVisible({ timeout: 15_000 });
      // fill() thay pressSequentially: một sự kiện input → một vòng debounce 400ms + một lần gọi API
      // danh mục, thay vì mỗi ký tự một vòng (xem choDanhSachOnDinh)
      if (await input.isEditable().catch(() => false)) {
        await input.fill(chon);
        await page.waitForTimeout(450);
        await choDanhSachOnDinh(dd);
      }
      const option = dd.locator(".ant-select-item-option").filter({ hasText: chon }).first();
      if (!(await hienTrong(option, 10_000))) {
        await page.keyboard.press("Escape");
        return false;
      }
      await nghi(page);
      await option.click({ timeout: 5_000 });
      await nghi(page);
      return true;
    } catch (err) {
      loiCuoi = err;
      await page.keyboard.press("Escape").catch(() => {});
      await nghi(page, 500, 800);
    }
  }
  throw loiCuoi;
}

/** Node thật của cây: bỏ node disabled và node aria-hidden antd dùng để đo danh sách ảo */
const NODE_CAY = '.ant-select-tree-treenode:not(.ant-select-tree-treenode-disabled):not([aria-hidden="true"])';

/**
 * Chọn node lá trong antd TreeSelect (vd. Tòa án): gõ từ khoá, chọn lá đầu tiên khớp.
 * Không có lá nào khớp từ khoá → xoá từ khoá, chọn lá đầu tiên của cây.
 */
export async function chonTreeSelect(page: Page, input: Locator, tuKhoa?: string): Promise<string> {
  const khung = khungSelect(page, input);
  await khung.scrollIntoViewIfNeeded();
  await khung.click();
  // TreeSelect không render #<id>_list → lấy dropdown đang mở có chứa cây
  const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').filter({ has: page.locator('.ant-select-tree') }).last();
  await expect(dd).toBeVisible();

  const la = dd.locator(NODE_CAY).filter({
    has: page.locator('.ant-select-tree-switcher-noop'),
  });
  if (tuKhoa) {
    await input.fill(tuKhoa);
    await page.waitForTimeout(500);
    if ((await la.count()) === 0) await input.fill('');
  }
  const nodeBatKy = dd.locator(NODE_CAY);
  await expect(nodeBatKy.first()).toBeVisible({ timeout: 30_000 });
  // Cây không mở sẵn (treeDefaultExpandAll=false) thì chưa thấy lá → chọn node đầu tiên
  const node = (await la.count()) > 0 ? la.first() : nodeBatKy.first();
  const title = node.locator('.ant-select-tree-title');
  const nhan = (await title.innerText()).trim();
  await nghi(page);
  await title.click();
  await nghi(page);
  return nhan;
}

/**
 * Ghi lại mọi toast antd (message) từng xuất hiện vào window.__toasts.
 * Toast chỉ hiện ~3s, có thể tắt trước khi Playwright chờ xong trang load → chờ bằng toastDaHien().
 * Gọi một lần trước lần điều hướng đầu tiên (gọi lại trên cùng page thì bỏ qua, tránh chồng nhiều init script).
 */
const daGhiNhanToast = new WeakSet<Page>();
export async function ghiNhanToast(page: Page) {
  if (daGhiNhanToast.has(page)) return;
  daGhiNhanToast.add(page);
  await page.addInitScript(() => {
    const w = window as unknown as { __toasts: { t: string; luc: number }[] };
    w.__toasts = [];
    // Ghi theo (phần tử, nội dung): toast "loading" có key được cập nhật tại chỗ
    // (vd. OCR "Đang xếp hàng…" → "Nhận dạng và bóc tách dữ liệu đơn thành công") → mỗi nội dung mới là một bản ghi
    const noiDungCu = new WeakMap<Element, string>();
    const quet = () =>
      document.querySelectorAll('.ant-message-notice, .ant-notification-notice').forEach(n => {
        const t = (n.textContent || '').trim();
        if (!t || noiDungCu.get(n) === t) return;
        noiDungCu.set(n, t);
        w.__toasts.push({ t, luc: Date.now() });
      });
    new MutationObserver(quet).observe(document, { childList: true, subtree: true, characterData: true });
  });
}

/**
 * Chờ tới khi có toast khớp `text` (kể cả đã tắt), chỉ xét toast xuất hiện từ `truocMs` trước lúc gọi trở đi
 * (toast của thao tác trước không làm sai kết quả). Có toast khớp `loi` thì ném lỗi ngay thay vì chờ hết timeout.
 */
export async function toastDaHien(page: Page, text: string | RegExp, timeout: number, loi?: RegExp, truocMs = 5_000) {
  const tu = (await page.evaluate(() => Date.now())) - truocMs;
  const mau = typeof text === 'string' ? { s: text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), f: '' } : { s: text.source, f: text.flags };
  const kq = await page.waitForFunction(
    ([m, l, t0]) => {
      const ds: { t: string; luc: number }[] = ((window as any).__toasts || []).filter((x: any) => x.luc >= (t0 as number));
      const x = l ? ds.find(y => new RegExp(l as string, 'i').test(y.t)) : undefined;
      if (x) return { ok: false, x: x.t };
      const mm = m as { s: string; f: string };
      if (ds.some(y => new RegExp(mm.s, mm.f).test(y.t))) return { ok: true };
      return false;
    },
    [mau, loi?.source, tu] as const,
    { timeout },
  );
  const v = (await kq.jsonValue()) as { ok: boolean; x?: string };
  if (!v.ok) throw new Error(`Chờ "${text}" nhưng gặp lỗi: ${v.x}`);
}

/** Chờ toast antd message chứa nội dung */
export const toast = (page: Page, text: string | RegExp) =>
  page.locator('.ant-message-notice').filter({ hasText: text }).first();

/**
 * Nội dung các toast đã hiện trong `trongMs` gần đây (kể cả toast đã tự tắt).
 * Dùng để nêu đúng nguyên nhân khi một bước thất bại, thay vì chỉ báo "không thấy phần tử".
 */
export async function toastGanDay(page: Page, trongMs = 30_000): Promise<string[]> {
  return page
    .evaluate(t0 => {
      const ds: { t: string; luc: number }[] = (window as unknown as { __toasts?: { t: string; luc: number }[] }).__toasts || [];
      return ds.filter(x => x.luc >= Date.now() - t0).map(x => x.t);
    }, trongMs)
    .catch(() => [] as string[]);
}

/** Các lỗi validate đang hiện trong một form/drawer/modal (ant-form-item-explain-error). */
export async function loiForm(khung: Locator): Promise<string[]> {
  return khung
    .locator('.ant-form-item-explain-error')
    .allInnerTexts()
    .then(ds => [...new Set(ds.map(s => s.trim()).filter(Boolean))])
    .catch(() => [] as string[]);
}

/**
 * Chụp nhanh TOÀN BỘ ô của một form: nhãn · giá trị đang hiển thị · lỗi của riêng ô đó.
 *
 * Vì sao cần: có ô "hiện mà chưa vào state" — màn hình in ra giá trị nhưng antd Form vẫn báo
 * "không được để trống" (đo 30/09/2026 ở ô giờ của lịch xét xử). Lúc đó phải thấy được cả form
 * mới biết lỗi thuộc ô nào, chứ đọc riêng câu lỗi thì hai ô trùng nhãn không phân biệt được.
 */
export async function moTaForm(khung: Locator): Promise<string[]> {
  return khung
    .locator('.ant-form-item')
    .evaluateAll(ds =>
      ds.map(el => {
        const nhan = el.querySelector('label')?.textContent?.trim() || '(không nhãn)';
        const chon = [...el.querySelectorAll('.ant-select-selection-item')]
          .map(x => x.textContent?.trim() || '')
          .filter(Boolean)
          .join(', ');
        const o = [...el.querySelectorAll('input, textarea')]
          .map(x => (x as HTMLInputElement).value?.trim() || '')
          .filter(Boolean)
          .join(' → ');
        const loi = el.querySelector('.ant-form-item-explain-error')?.textContent?.trim() || '';
        return `${nhan} = ${chon || o || '(trống)'}${loi ? ` ⚠ ${loi}` : ''}`;
      }),
    )
    .catch(() => [] as string[]);
}

/** Gộp lỗi validate trên form và toast gần đây thành một câu để đưa vào thông báo lỗi của test. */
export async function nguyenNhanLoi(page: Page, khung?: Locator, trongMs = 180_000): Promise<string> {
  // Hộp xác nhận đang mở cũng là lý do thao tác dừng lại (vd. "Lịch xét xử đang trùng phòng…")
  const hopHoi = await page
    .locator('.ant-modal-confirm-title')
    .allInnerTexts()
    .then(ds => ds.map(s => `đang chờ xác nhận: ${s.trim()}`).filter(s => s.length > 22))
    .catch(() => [] as string[]);
  // Cửa sổ đọc toast phải PHỦ HẾT thời gian vừa chờ: chờ 120s mà chỉ đọc 30s gần nhất thì toast
  // báo lỗi (hiện ngay lúc bấm) đã rơi ra ngoài → lỗi trơ ra "(không đọc được thông báo nào)".
  const ds = [...(khung ? await loiForm(khung) : []), ...hopHoi, ...(await toastGanDay(page, trongMs))];
  return ds.length ? ds.join(' | ') : '(không đọc được thông báo lỗi nào trên màn hình)';
}

/**
 * Xác nhận một thao tác LƯU đã thành công — hỏng nhanh, nói rõ lý do.
 *
 * Vì sao cần: chờ mù toast thành công là cái bẫy tốn thời gian nhất của bộ này. Form hỏng validate
 * thì toast KHÔNG BAO GIỜ đến, Playwright chờ hết `timeout` rồi ném `TimeoutError` trống rỗng —
 * trong khi antd đã hiện lý do ngay trên form từ giây đầu (`.ant-form-item-explain-error`).
 * Đo 30/09/2026: bước lưu đương sự treo đúng 60s chỉ vì thiếu ô "Địa chỉ chi tiết".
 *
 * Thứ tự kiểm: lỗi validate trên form (ngay) → toast thành công (chờ) → nêu mọi thứ đang hiện.
 */
export async function xacNhanLuu(
  page: Page,
  khung: Locator,
  mauThanhCong: string | RegExp,
  tuyChon: { viec?: string; timeout?: number; mauLoi?: RegExp; choValidateMs?: number } = {},
) {
  const {
    viec = 'lưu',
    timeout = 30_000,
    mauLoi = /Không thể|thất bại|Vui lòng|không hợp lệ/i,
    choValidateMs = 1_200,
  } = tuyChon;

  // antd gắn thông báo lỗi ngay khi submit hỏng → chờ một nhịp ngắn là đủ, không cần chờ hết timeout
  await page.waitForTimeout(choValidateMs);
  const loi = await loiForm(khung);
  if (loi.length) throw new Error(`Không ${viec} được, form còn lỗi: ${loi.join(' | ')}`);

  try {
    await toastDaHien(page, mauThanhCong, timeout, mauLoi);
  } catch (e) {
    throw new Error(`Không ${viec} được (không thấy báo thành công). Màn hình đang báo: ${await nguyenNhanLoi(page, khung)}`, {
      cause: e,
    });
  }
}

/**
 * Chọn một mục trong danh sách theo THỨ TỰ CHỮ CÁI — dùng khi dữ liệu gieo không chỉ đích danh được
 * (danh mục phụ thuộc đơn vị đăng nhập, mỗi môi trường một bộ).
 *
 * Vì sao không "lấy mục đầu danh sách": thứ tự máy chủ trả về KHÔNG ổn định. Đo 30/09/2026 trên STG,
 * ô "Người nhận đơn" của cùng một tài khoản: lượt 1 ra "Lê Tiến", lượt 2 ra "Ngô Tiến Hùng" → hai
 * lượt chạy cùng một case sinh dữ liệu khác nhau, không đối chiếu được.
 * Sắp xếp rồi lấy mục đầu thì chạy bao nhiêu lần cũng ra một giá trị.
 */
export async function chonSelectTheoThuTu(
  page: Page,
  input: Locator,
  viTri = 0,
  /** Bỏ qua các mục đã dùng — danh mục người tiến hành tố tụng KHÔNG tự loại người đã phân công,
   *  nên lần chọn thứ hai sẽ trúng lại đúng người đó và hệ thống từ chối thêm dòng trùng. */
  tru: string[] = [],
): Promise<string> {
  const khung = khungSelect(page, input);
  await khung.scrollIntoViewIfNeeded();
  await khung.click();
  const dd = await dropdownCua(page, input);
  await expect(dd).toBeVisible({ timeout: 15_000 });
  await choDanhSachOnDinh(dd);

  const ds = (await dd.locator('.ant-select-item-option').allInnerTexts())
    .map(s => s.trim())
    .filter(Boolean);
  if (!ds.length) throw new Error('Danh sách rỗng, không chọn được mục nào');

  const conLai = ds.filter(x => !tru.includes(x));
  if (!conLai.length) {
    await page.keyboard.press('Escape');
    throw new Error(`Danh sách chỉ còn các mục đã dùng: ${tru.join(' | ')}`);
  }
  const daSap = [...conLai].sort((a, b) => a.localeCompare(b, 'vi'));
  const nhan = daSap[Math.min(viTri, daSap.length - 1)];
  await dd.locator('.ant-select-item-option').filter({ hasText: nhan }).first().click();
  await nghi(page);
  return nhan;
}

/**
 * Ô nhập của một `.ant-form-item` theo NHÃN của nó.
 *
 * Vì sao cần: antd Select KHÔNG đặt thuộc tính `placeholder` lên input — chữ mờ là
 * `<span class="ant-select-selection-placeholder">`. Nên `getByPlaceholder('Vai trò')` không khớp
 * dù nhìn trên màn thấy đúng chữ đó (đo 30/09/2026 ở modal 10-VDS). Bám theo `<label>` là cách
 * ổn định cho cả Select, DatePicker và Input.
 */
export function oTheoNhan(page: Page, khung: Locator, nhan: string | RegExp): Locator {
  return khung
    .locator('.ant-form-item')
    .filter({ has: page.locator('label').filter({ hasText: nhan }) })
    .first()
    .locator('input, textarea, [role="combobox"]')
    .first();
}

/**
 * Ô antd Select theo CHỮ GỢI Ý của nó (placeholder hiển thị bằng span, không phải thuộc tính).
 * Dùng khi trong một khối có nhiều select và nhãn không nằm trong `.ant-form-item`
 * (đo 30/09/2026: tab Kết quả sơ thẩm — lấy `.ant-select-selection-item` cuối khối thì trúng
 * select "Bộ luật" chứ không phải "Người ký").
 */
export function oSelectTheoGoiY(khung: Locator, goiY: string | RegExp): Locator {
  return khung.locator('.ant-select').filter({ hasText: goiY }).locator('[role="combobox"]').first();
}

/**
 * Chọn một mục của antd Select bằng VAI TRÒ ARIA — bám đúng thứ màn hình phơi ra, không đoán CSS.
 *
 * `getByRole('combobox', { name })` dùng tên trợ năng thật (vd. "* Người ký" — CÓ dấu sao của ô bắt
 * buộc), rồi `getByRole('option')` lấy danh sách đang mở. Cách này không phụ thuộc cấu trúc
 * `.ant-select-dropdown`/`aria-controls` vốn hay đổi theo phiên bản và từng render trượt ở
 * tab Kết quả sơ thẩm (đo 30/09/2026: dropdown mở, `[expanded] [active]`, mà click mục vẫn hết giờ).
 *
 * Vẫn TẤT ĐỊNH: sắp theo chữ cái rồi lấy mục đầu chưa dùng.
 */
export async function chonComboboxTheoTen(
  page: Page,
  ten: string | RegExp,
  tru: string[] = [],
): Promise<string> {
  const o = page.getByRole('combobox', { name: ten }).first();
  await expect(o, `Không thấy ô chọn "${ten}"`).toBeVisible({ timeout: 30_000 });
  await o.scrollIntoViewIfNeeded();

  // TÌM ô bằng vai trò ARIA (tên trợ năng ổn định), nhưng ĐỌC danh sách bằng CSS của lớp dropdown
  // đang mở: antd gắn aria-hidden cho lớp đó trong lúc animate nên `getByRole('option')` không thấy
  // mục nào (đo 30/09/2026 ở ô "* Người ký": dropdown mở, combobox [expanded], mà role=option rỗng).
  const muc = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
  for (let lan = 0; lan < 3 && !(await muc.count()); lan++) {
    // force: thanh tiêu đề dính (sticky) của màn chi tiết che mép trên ô sau khi cuộn → click
    // thường bị "intercepts pointer events" rồi chờ hết 30s (đo 30/09/2026 ở ô "* Người ký").
    await o.click({ force: true, timeout: 10_000 }).catch(() => {});
    await nghi(page, 400, 700);
  }
  await expect(muc.first(), `Bấm ô "${ten}" nhưng danh sách không mở`).toBeVisible({ timeout: 15_000 });

  const ds = (await muc.allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const conLai = ds.filter(x => !tru.includes(x));
  if (!conLai.length) throw new Error(`Ô "${ten}" chỉ còn các mục đã dùng: ${tru.join(' | ')}`);

  const chon = [...conLai].sort((a, b) => a.localeCompare(b, 'vi'))[0];

  // CHỌN BẰNG BÀN PHÍM, không click: ở ô "* Người ký" của tab Kết quả sơ thẩm, click vào mục bị
  // chặn kể cả `force` (đo 30/09/2026 — hết 15s). antd Select luôn sáng mục đầu khi mở, nên
  // ArrowDown đúng `viTri` lần rồi Enter là chọn được, và vẫn TẤT ĐỊNH vì `viTri` tính từ danh sách.
  const viTri = ds.indexOf(chon);
  for (let i = 0; i < viTri; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await nghi(page);

  // Kiểm chứng đã ăn: ô hết chữ gợi ý và có một giá trị được chọn.
  // (Không so khớp chuỗi: nhãn trong danh sách dài hơn nhãn hiển thị lại trong ô — danh sách ghi
  //  "Điều Văn Hằng - 10/12/1970 Thẩm phán", ô chỉ hiện "Điều Văn Hằng".)
  const khungO = page.locator('.ant-select').filter({ has: page.getByRole('combobox', { name: ten }) }).first();
  await expect(
    khungO.locator('.ant-select-selection-item'),
    `Chọn "${chon}" ở ô "${ten}" nhưng giá trị không vào ô`,
  ).toHaveCount(1, { timeout: 15_000 });
  return chon;
}

/**
 * Điền một ô theo NHÃN, giá trị lấy từ DỮ LIỆU GIEO.
 *
 * Vì sao: để code tự "chọn mục đầu" thì mỗi môi trường ra một giá trị khác, và khi locator trượt
 * thì kẹt không biết điền gì. Khai sẵn trong `input.ts` thì biết rõ phải điền gì, sai thì thông báo
 * liệt kê đúng những mục đang có.
 *
 * Bấm vào `.ant-select-selector` (vùng bấm thật của antd) chứ không bấm input bên trong: input bị
 * phủ nên `scrollIntoViewIfNeeded` treo 30s (đo 30/09/2026 ở ô "Lý do/căn cứ cụ thể" của 32DS).
 */
export async function dienOTheoNhan(
  page: Page,
  khung: Locator,
  nhan: string | RegExp,
  giaTri?: string,
  /** Ghi đè cả khi ô ĐÃ CÓ giá trị — cần cho các ô "Người ký ban hành" được nạp sẵn */
  ghiDe = false,
): Promise<string> {
  // Nhãn có thể là <label> (ô bắt buộc) hoặc chỉ là text thường (ô không bắt buộc) → thử cả hai
  const theoLabel = khung
    .locator('.ant-form-item')
    .filter({ has: page.locator('label').filter({ hasText: nhan }) })
    .first();
  const oForm = (await theoLabel.count())
    ? theoLabel
    : khung.locator('.ant-form-item').filter({ hasText: nhan }).last();
  await expect(oForm, `Không thấy ô "${nhan}"`).toBeVisible({ timeout: 30_000 });
  return dienTrongO(page, oForm, nhan, giaTri, ghiDe);
}

/**
 * Điền một ô ĐÃ ĐỊNH VỊ SẴN — cùng toàn bộ phần thân của `dienOTheoNhan`, chỉ khác là nhận thẳng
 * `.ant-form-item` thay vì đi tìm theo nhãn.
 *
 * Vì sao cần: có màn dùng CÙNG MỘT NHÃN nhiều lần. Drawer bị can hình sự có 5 nhóm địa chỉ
 * (Nơi sinh / Quê quán / HKTT / Nơi tạm trú / Nơi ở hiện tại), nhóm nào cũng có "Phường/Xã" và
 * "Tỉnh/Thành phố" → tìm theo nhãn thì luôn trúng nhóm đầu hoặc nhóm cuối. Gọi hàm này với
 * `.nth(i)` của đúng nhóm cần điền (đo 01/10/2026).
 */
export async function dienTrongO(
  page: Page,
  oForm: Locator,
  nhan: string | RegExp,
  giaTri?: string,
  ghiDe = false,
): Promise<string> {
  // Nhánh DANH SÁCH CHECKBOX: "Lý do/căn cứ cụ thể" của 32DS là các checkbox chứ không phải Select
  // (đo 30/09/2026 trên cây trợ năng) — đọc được chữ trong dropdown không có nghĩa là đã tick.
  const ds0 = oForm.locator('input[type="checkbox"]');
  if (await ds0.count()) {
    const nhanO = oForm.locator('.ant-checkbox-wrapper');
    const ten = (await nhanO.allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
    const i = giaTri ? ten.findIndex(x => x.toLowerCase().includes(giaTri.toLowerCase())) : 0;
    if (i < 0) throw new Error(`Ô "${nhan}" không có lựa chọn khớp "${giaTri}". Đang có: ${ten.join(' | ')}`);
    if (!(await ds0.nth(i).isChecked())) await nhanO.nth(i).click({ force: true });
    await expect(ds0.nth(i), `Tick "${ten[i]}" không ăn`).toBeChecked({ timeout: 10_000 });
    return ten[i];
  }

  const select = oForm.locator('.ant-select-selector').first();
  if (await select.count()) {
    /**
     * Ô đã có giá trị thì mặc định GIỮ NGUYÊN — trừ khi gọi với `ghiDe`.
     *
     * Vì sao cần `ghiDe`: các ô "Người ký ban hành" luôn được nạp sẵn một người (thường là Phó
     * Chánh án). Giữ nguyên thì văn bản chỉ "Chờ ký" chứ không ban hành, và bước sau tắc mà không
     * nói vì sao — đúng chuyện đã xảy ra với 62-DS (chặn bước 15) và 65-DS (đo 01/10/2026).
     */
    const dangCo = (await oForm.locator('.ant-select-selection-item').first().innerText().catch(() => '')).trim();
    /**
     * `ghiDe` chỉ có nghĩa khi giá trị đang khác thứ mình muốn. Ghi đè vô điều kiện thì mở lại
     * dropdown của một ô VỐN ĐÃ ĐÚNG và có thể chọn trượt sang người khác — đo 01/10/2026 ở
     * 84-DS: ô "Người ký/người phân công" sẵn là "Nguyễn Xuân Kỳ", ghi đè xong hoá "Vũ Minh Tuấn"
     * và quyết định treo "Chờ ký".
     */
    const daDung = !!dangCo && !!giaTri && dangCo.toLowerCase().includes(giaTri.toLowerCase());
    if (dangCo && (!ghiDe || daDung)) return dangCo;
    // `force` bỏ qua kiểm tra che chắn nhưng KHÔNG tự cuộn: ô nằm dưới màn hình vẫn báo
    // "Element is outside of the viewport" (đo 30/09/2026 ở form kháng cáo, ô "Tên người kháng cáo").
    await select.scrollIntoViewIfNeeded().catch(() => {});
    await select.click({ force: true });
    /**
     * ĐỌC DANH SÁCH NEO THEO CHÍNH Ô ĐÓ, không lấy "dropdown nào đang mở".
     *
     * rc-select gắn `aria-controls`/`aria-owns` của combobox trỏ tới đúng listbox của nó. Lấy
     * chung chung thì khi dropdown của ô TRƯỚC còn mở, ô này đọc trúng danh sách cũ và cả form
     * lệch đi một nấc — đo 30/09/2026 ở form kháng cáo: "Loại người kháng cáo" báo danh mục đang
     * có "297 — ngày 30/09/2026 — Bản án dân sự sơ thẩm", rồi "Tên người kháng cáo" lại ra
     * "Nguyên đơn | Bị đơn" (là danh mục của ô trước nữa).
     */
    const oCb = oForm.locator('[role="combobox"]').first();
    const maList =
      (await oCb.getAttribute('aria-controls').catch(() => null)) ||
      (await oCb.getAttribute('aria-owns').catch(() => null));
    const muc = maList
      ? page.locator(`#${maList}`).locator('xpath=ancestor::div[contains(@class,"ant-select-dropdown")][1]')
          .locator('.ant-select-item-option')
      : page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
    await expect(muc.first(), `Bấm ô "${nhan}" nhưng danh sách không mở`).toBeVisible({ timeout: 15_000 });

    /**
     * DANH SÁCH DÀI: GÕ ĐỂ LỌC rồi mới đọc.
     *
     * antd ảo hoá danh sách nên `allInnerTexts()` chỉ trả về phần ĐANG RENDER. Danh mục dài thì
     * mục cần tìm không bao giờ xuất hiện và ta kết luận sai là "danh mục không có giá trị này" —
     * đo 01/10/2026 ở ô "Dân tộc" của bị can: khai "Kinh", báo lỗi "không có mục khớp", danh sách
     * in ra chỉ tới "Ba-na | Bố Y | Brâu | Bru-Vân Kiều | Chăm | Cơ-ho".
     *
     * Lọc ra rỗng (ô không bật tìm kiếm, hoặc chữ lọc khác cách viết trong danh mục) thì BỎ LỌC để
     * quay về lối cũ, không để việc gõ làm hỏng những ô vốn đang chạy được.
     */
    const oLoc = oForm.locator('input.ant-select-selection-search-input').first();
    if (giaTri && (await oLoc.isEditable().catch(() => false))) {
      await oLoc.fill(giaTri).catch(() => {});
      await nghi(page, 500, 800);
      if (!(await muc.count())) {
        await oLoc.fill('').catch(() => {});
        await nghi(page, 400, 700);
      }
    }

    const ds = (await muc.allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);

    const chon = giaTri
      ? ds.find(x => x.toLowerCase().includes(giaTri.toLowerCase()))
      : [...ds].sort((a, b) => a.localeCompare(b, 'vi'))[0];
    if (!chon) {
      await page.keyboard.press('Escape');
      throw new Error(`Ô "${nhan}" không có mục khớp "${giaTri}". Đang có: ${ds.join(' | ') || '(rỗng)'}`);
    }
    /**
     * Chọn rồi PHẢI ĐỌC LẠI ô. Đi bằng ArrowDown theo chỉ số của danh sách vừa đọc là không chắc:
     * antd ảo hoá danh sách nên `allInnerTexts()` chỉ thấy phần đang render, còn ArrowDown chạy
     * trên danh sách đầy đủ → dừng ở mục khác. Trả về chuỗi mong muốn mà không đối chiếu thì báo
     * một đằng form nhận một nẻo: khai "Phòng xét xử 102 (PXX102)" mà lịch lưu thành
     * "Phòng xử lưu động" (đo 30/09/2026 ở ô "Địa điểm xét xử" của lịch xét xử).
     */
    const daChon = oForm.locator('.ant-select-selection-item').first();
    const dangChon = async () => (await daChon.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    const trung = (x: string) =>
      !!x && (!giaTri || x.toLowerCase().includes(giaTri.toLowerCase()) || chon.toLowerCase().includes(x.toLowerCase()));

    const viTri = ds.indexOf(chon);
    for (let i = 0; i < viTri; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await nghi(page);
    if (trung(await dangChon())) return dangChon();

    // Không trúng thì bấm THẲNG vào mục có đúng chữ đó.
    await select.click({ force: true });
    await muc.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    await page
      .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
      .filter({ hasText: chon })
      .first()
      .click({ force: true, timeout: 10_000 })
      .catch(() => {});
    await nghi(page);

    const thuc = await dangChon();
    if (giaTri && !trung(thuc)) {
      throw new Error(`Ô "${nhan}": chọn "${chon}" nhưng ô đang là "${thuc || '(trống)'}"`);
    }
    return thuc || chon;
  }

  // Không phải Select: ô gõ (input/textarea/DatePicker/TimePicker)
  const o = oForm.locator('input, textarea').first();
  if (!(await o.isEditable().catch(() => false))) return '';
  if (await o.inputValue().catch(() => '')) return (await o.inputValue()).trim();
  if (giaTri === undefined) return '';
  await go(o, giaTri);

  /**
   * PHẢI ĐÓNG PANEL của DatePicker/TimePicker sau khi gõ.
   *
   * Gõ xong mà không Enter thì antd giữ panel mở và giá trị CHƯA commit; cú click kế tiếp (vd. nút
   * "Lưu") chỉ để ĐÓNG PANEL chứ không tới được nút → biểu mẫu không lưu, không toast, không lỗi.
   * Đo 30/09/2026 với ô "Giờ mở phiên họp" của 32DS: bấm tay thì lưu được và hiện thêm
   * "Lấy số / Trình ký", còn kịch bản thì im lặng.
   */
  const coPanel = await page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)').count();
  if (coPanel) {
    await o.press('Enter');
    await expect(
      page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)'),
      `Gõ "${giaTri}" vào ô "${nhan}" nhưng panel chọn ngày/giờ không đóng`,
    ).toHaveCount(0, { timeout: 10_000 });
  }
  return (await o.inputValue().catch(() => giaTri)).trim() || giaTri;
}

/**
 * Điền một CẶP Ô trong cùng `.ant-form-item` — vd. "Ngày xét xử (từ → đến)" hay "Giờ xét xử"
 * có hai ô bắt đầu/kết thúc.
 *
 * Gõ xong PHẢI Enter để đóng panel picker: không Enter thì giá trị chưa commit và panel còn mở sẽ
 * nuốt cú click kế tiếp (đo 30/09/2026 — chính là thứ làm biểu mẫu 32DS không lưu được).
 */
export async function dienCapO(
  page: Page,
  khung: Locator,
  nhan: string | RegExp,
  giaTri: string[],
  /**
   * Ghi đè cả khi ô đã có giá trị. Cần cho "Giờ xét xử": form mở ra đã sẵn `00:00 → 00:00`, giữ
   * nguyên thì hệ thống báo "Thời gian kết thúc phải lớn hơn thời gian bắt đầu" (đo 30/09/2026).
   */
  ghiDe = false,
): Promise<string[]> {
  const theoLabel = khung
    .locator('.ant-form-item')
    .filter({ has: page.locator('label').filter({ hasText: nhan }) })
    .first();
  const oForm = (await theoLabel.count())
    ? theoLabel
    : khung.locator('.ant-form-item').filter({ hasText: nhan }).first();
  if (!(await oForm.count())) return [];

  const o = oForm.locator('input:not([type="checkbox"])');
  const ra: string[] = [];
  for (let i = 0; i < Math.min(await o.count(), giaTri.length); i++) {
    const ô = o.nth(i);
    if (!(await ô.isEditable().catch(() => false))) continue;
    if (!ghiDe && (await ô.inputValue().catch(() => ''))) {
      ra.push((await ô.inputValue()).trim());
      continue;
    }
    // Ô picker KHÔNG nhận `fill` khi đã có giá trị (antd giữ giá trị cũ rồi format lại) → mở ô,
    // bôi đen, gõ, Enter.
    await ô.click();
    await ô.press('ControlOrMeta+a');
    await ô.pressSequentially(giaTri[i], { delay: 20 });
    await ô.press('Enter');
    ra.push((await ô.inputValue().catch(() => giaTri[i])).trim() || giaTri[i]);
  }

  /**
   * Chỉ kiểm panel SAU KHI điền hết cả cặp.
   *
   * Với RangePicker, Enter ở ô đầu chuyển focus sang ô cuối và GIỮ PANEL MỞ — đó là hành vi đúng,
   * nên kiểm "panel đã đóng" ngay sau ô thứ nhất là sai và làm bước hỏng oan (đo 30/09/2026 ở
   * "Giờ xét xử"). Panel còn mở sau khi xong cả cặp thì đóng bằng Escape, vì để mở sẽ nuốt cú
   * click kế tiếp.
   */
  const panel = page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)');
  if (await panel.count()) {
    // KHÔNG dùng Escape: nó đóng luôn cả modal đang chứa form (đo 30/09/2026 — form "Thêm lịch
    // xét xử" biến mất, các ô phía dưới và nút "Tạo mới" không còn). Rời ô bằng Tab là đủ.
    await page.keyboard.press('Tab');
    if (await panel.count()) await khung.click({ position: { x: 5, y: 5 }, force: true }).catch(() => {});
    await expect(panel, `Điền xong "${nhan}" nhưng panel chọn ngày/giờ không đóng`).toHaveCount(0, {
      timeout: 10_000,
    });
  }

  // Đọc lại giá trị THẬT của cả cặp: ô thứ hai có thể bị ô thứ nhất ghi đè khi focus tự nhảy
  const thuc: string[] = [];
  for (let i = 0; i < Math.min(await o.count(), giaTri.length); i++) {
    thuc.push((await o.nth(i).inputValue().catch(() => '')).trim());
  }
  return thuc.some(Boolean) ? thuc : ra;
}
