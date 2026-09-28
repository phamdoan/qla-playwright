import { Locator, Page, expect } from '@playwright/test';

/** Tốc độ gõ phím (ms/ký tự), chỉnh qua QLA_GO_PHIM_MS; 0 = điền ngay */
let TOC_DO_GO = Number(process.env.QLA_GO_PHIM_MS ?? 40);
/** Hệ số thời gian nghỉ giữa các thao tác (1 = như người; chế độ điền nhanh rút còn 0.3) */
let HE_SO_NGHI = 1;
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
 * Chọn option trong antd Select.
 * - `chon` là chuỗi: gõ để lọc (nếu Select có search) rồi chọn option có title trùng/chứa chuỗi đó
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
      if (goLoc && typeof chon === 'string' && (await input.isEditable().catch(() => false)) && !(await input.inputValue())) {
        // Danh sách lớn (vd. Nghề nghiệp ~1000 mục) lọc chậm, gõ chuỗi dài dễ mất ký tự → gõ tối đa 20 ký tự đầu
        await input.pressSequentially(chon.slice(0, 20), { delay: lan === 0 ? TOC_DO_GO : Math.max(TOC_DO_GO, 30) });
      }
      await expect(dd.locator('.ant-select-item-option').first()).toBeVisible({ timeout: 30_000 });
      // Ưu tiên option trùng khớp title (tránh "Nguyên đơn" khớp nhầm "…của nguyên đơn"), không có thì khớp chuỗi con
      const trungKhop = typeof chon === 'string' ? dd.locator(`.ant-select-item-option[title="${chon}"]`) : undefined;
      // Chưa thấy mục trùng khớp nguyên văn (danh sách ảo chỉ render phần đang hiện) → cuộn tìm
      if (chon && (!goLoc || (trungKhop && !(await trungKhop.count())))) {
        // Không gõ lọc: danh sách ảo chỉ render vài mục → cuộn dần như người dùng tới khi thấy mục cần chọn
        const khop = () => (trungKhop ? trungKhop.or(dd.locator('.ant-select-item-option').filter({ hasText: chon })) : dd.locator('.ant-select-item-option').filter({ hasText: chon }));
        const cuon = dd.locator('.rc-virtual-list-holder').first();
        for (let i = 0; i < 250 && !(await khop().count()); i++) {
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
      const nhan = ((await option.getAttribute('title')) || (await option.innerText())).trim();
      await nghi(page);
      await option.click({ timeout: 5_000 });
      await nghi(page);
      // Xác nhận ô đã hiển thị giá trị vừa chọn (form render lại có thể làm mất lựa chọn)
      await expect(khung.locator('.ant-select-selection-item').first()).toBeVisible({ timeout: 5_000 });
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
      if (await input.isEditable().catch(() => false)) await input.pressSequentially(chon, { delay: TOC_DO_GO });
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
    await input.pressSequentially(tuKhoa, { delay: TOC_DO_GO });
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

/** Gộp lỗi validate trên form và toast gần đây thành một câu để đưa vào thông báo lỗi của test. */
export async function nguyenNhanLoi(page: Page, khung?: Locator): Promise<string> {
  // Hộp xác nhận đang mở cũng là lý do thao tác dừng lại (vd. "Lịch xét xử đang trùng phòng…")
  const hopHoi = await page
    .locator('.ant-modal-confirm-title')
    .allInnerTexts()
    .then(ds => ds.map(s => `đang chờ xác nhận: ${s.trim()}`).filter(s => s.length > 22))
    .catch(() => [] as string[]);
  const ds = [...(khung ? await loiForm(khung) : []), ...hopHoi, ...(await toastGanDay(page))];
  return ds.length ? ds.join(' | ') : '(không đọc được thông báo lỗi nào trên màn hình)';
}
