import { BrowserContext, Page, Response, expect, test } from '@playwright/test';
import { loginSSO } from '../../common/login';
import { khungMenu } from '../../common/menu';
import { dsTaiKhoanDangNhap, lyDoThieuTaiKhoanDangNhap } from '../../common/tai-khoan-dang-nhap';
import { ORIGIN } from '../../playwright.config';

/**
 * BẤM HẾT THAO TÁC GĐT/TT — mỗi tài khoản vào từng màn GĐT/TT, bấm MỌI nút/tab/link, không được 403.
 *
 * Phạm vi một màn:
 *   · mọi tab của màn danh sách, mọi nút trên thanh công cụ và trên DÒNG ĐẦU của lưới (kể cả mục
 *     trong menu thả "…"), mọi link trên dòng;
 *   · thao tác nào mở trang chi tiết thì quét tiếp trang chi tiết đó (một lần mỗi màn): mọi tab, và
 *     mọi nút trong từng tab.
 * Sau mỗi cú bấm: vào lại trang gốc (không dựa vào "Quay lại"), nên các cú bấm độc lập với nhau.
 *
 * KHÔNG GHI DỮ LIỆU — đây là pre-prod có dữ liệu thật:
 *   1. Mọi request ghi (PUT/PATCH/DELETE, và POST không phải tìm kiếm/xuất) bị HUỶ ở tầng mạng của
 *      trình duyệt (`context.route`) trước khi tới máy chủ, và được ghi lại là "chặn ghi".
 *   2. Hộp xác nhận / form mở ra thì KHÔNG bấm Lưu/Đồng ý — chỉ ghi nhận rồi bỏ (vào lại trang gốc).
 *   3. Hộp thoại trình duyệt (confirm/alert) luôn bị từ chối.
 * Vì (1), thao tác "bấm là ghi ngay" sẽ báo lỗi mạng trên UI — đúng ý đồ, không tính là lỗi quyền.
 *
 * Tính là LỖI: response 401/403, trang 403 của FE (pages/exception/403), hoặc thông báo có chữ
 * "quyền"/"403"/"từ chối truy cập". Chi tiết từng cú bấm ở tệp đính kèm `thao-tac.json`.
 *
 *   QLA_HO_SO_ENV=preprod npx playwright test --project=dang-nhap thao-tac-gdt-tt --workers=4
 *   … thêm `-g "vanThuHongAnh.*Quản lý vụ án"` để chạy một tài khoản / một màn.
 */
const BO = 'tai-khoan-quyen-gdt-tt';
const ds = dsTaiKhoanDangNhap(BO);

/** 17 màn GĐT/TT trên menu pre-prod (đo 11/10/2026, tests/dang-nhap/quyen-gdt-tt.spec.ts) */
const MAN: { nhan: string; duong: string }[] = [
  { nhan: 'Nhận đơn và thụ lý vụ án', duong: 'vu-an/gdt-tt/nhan-don-tl-vu-an/danh-sach' },
  { nhan: 'Hồ sơ kháng nghị', duong: 'vu-an/gdt-tt/ho-so-khang-nghi/danh-sach' },
  { nhan: 'Quản lý vụ án', duong: 'vu-an/gdt-tt/quan-ly-an/danh-sach' },
  { nhan: 'Quản lý hồ sơ giao nhận', duong: 'vu-an/gdt-tt/quan-ly-ho-so-giao-nhan/danh-sach' },
  { nhan: 'Phân công thẩm phán', duong: 'vu-an/gdt-tt/phan-cong-vu-an/danh-sach' },
  { nhan: 'Phân công thẩm tra viên', duong: 'vu-an/gdt-tt/danh-sach-phan-cong-TTV/danh-sach' },
  { nhan: 'Phân công Hội đồng xét xử', duong: 'vu-an/gdt-tt/phan-cong-hoi-dong-xet-xu/danh-sach' },
  { nhan: 'Vụ án phân công TPTC', duong: 'vu-an/gdt-tt/danh-sach-de-xuat-khang-nghi' },
  { nhan: 'Quản lý xét xử GĐT', duong: 'vu-an/gdt-tt/quan-ly-vu-xet-xu/danh-sach' },
  { nhan: 'Quản lý khiếu nại', duong: 'vu-an/gdt-tt/quan-ly-khieu-nai/danh-sach' },
  { nhan: 'Án quốc hội', duong: 'vu-an/gdt-tt/danh-sach-an-quoc-hoi' },
  { nhan: 'Án thời hiệu', duong: 'vu-an/gdt-tt/danh-sach-an-thoi-hieu' },
  { nhan: 'Đơn ân giảm', duong: 'vu-an/gdt-tt/an-tu-hinh/don-an-giam/danh-sach' },
  { nhan: 'Hồ sơ tử hình', duong: 'vu-an/gdt-tt/an-tu-hinh/ho-so-an/danh-sach' },
  { nhan: 'Công văn trao đổi', duong: 'vu-an/gdt-tt/cong-van-trao-doi/danh-sach' },
  { nhan: 'Cấu hình thẩm tra viên báo cáo', duong: 'vu-an/gdt-tt/cau-hinh-ttv' },
  { nhan: 'Cấu hình phân công Thẩm phán', duong: 'vu-an/gdt-tt/vu-an/gdt-tt/cau-hinh-phan-cong-tham-phan' },
];

/** POST chỉ đọc được cho qua (tìm kiếm, lọc, đếm, xuất). Còn lại mọi request ghi đều bị huỷ. */
const POST_CHI_DOC = new RegExp(
  [
    /(search|tim-?kiem|filter|\/loc|danh-?sach|\/list|\/page|thong-?ke|export|xuat|count|\/dem|preview|xem-?truoc|tra-?cuu|query)/i.source,
    // POST tìm kiếm tên không lộ ra là đọc — đã đọc controller (đo 11/10/2026: chặn nhầm thì lưới trống, báo "Không thể kết nối máy chủ")
    /\/ho-so-khang-nghi\/(di|den)$/.source, // HoSoKhangNghiController.java:52,87 — "Tìm kiếm danh sách hồ sơ kháng nghị đi/đến"
    /\/don\/thong-bao-don$/.source, // DonController.java:429 — "Danh sách thông báo trả lời đơn"
  ].join('|'),
  'i',
);
/** Giữ phiên sống: làm mới token thì cho qua; đăng xuất thì luôn chặn */
const PHIEN = /(refresh|token|session\/current)/i;
/** Thông báo trên UI cho thấy bị chặn quyền */
const TB_QUYEN = /quyền|403|forbidden|từ chối truy cập|không được phép/i;
/** Không bấm: đăng xuất, và các nút chrome của MenuV3 (đổi kiểu menu, ghim, tài khoản) — không thuộc màn GĐT */
const BO_QUA = /đăng xuất|^Sổ tay$|^Dải \+ cột|^Danh sách đầy đủ$|^Thanh dock|^Bàn khởi động|^Ghim$|^GTINX$/i;
/** Trần số cú bấm cho một trạng thái trang — chặn bùng nổ ở màn có lưới nhiều cột thao tác */
const TRAN = 40;

/** Một bước để dựng lại trạng thái trước cú bấm: chọn tab, bấm phần tử đã đánh dấu, chọn mục menu thả */
type Buoc = { loai: 'tab'; nhan: string } | { loai: 'nut'; khoa: string } | { loai: 'menu'; nhan: string };

interface KetQuaBam {
  duong: string;
  ketQua: string;
  chanGhi: string[];
  loi: string[];
}

if (!ds.length) {
  test.describe('(chưa khai tài khoản kiểm quyền GĐT/TT)', () => {
    test.skip('bỏ qua', () => test.skip(true, lyDoThieuTaiKhoanDangNhap(BO)));
  });
}

async function choTai(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
  await page.locator('.ant-spin-spinning').first().waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
}

async function laTrang403(page: Page): Promise<boolean> {
  if (/\/exception\/403/.test(page.url())) return true;
  return (await page.locator('svg title').filter({ hasText: /^403$/ }).count().catch(() => 0)) > 0;
}

/**
 * Đánh dấu `data-e2e-tt` lên mọi phần tử bấm được trong VÙNG NỘI DUNG và trả về khoá của chúng.
 * Khoá = vùng + nhãn + thứ tự trùng nhãn → ổn định giữa các lần vào lại trang (id thì không).
 * Bỏ: menu trái, thanh trên (top < 72px), phân trang, đầu bảng, ô nhập/chọn, các dòng ngoài dòng
 * đầu, và mọi thứ nằm trong hộp thoại/menu thả đang mở.
 */
async function danhDau(page: Page): Promise<{ khoa: string; nhan: string }[]> {
  return page.evaluate(() => {
    document.querySelectorAll('[data-e2e-tt]').forEach((e) => e.removeAttribute('data-e2e-tt'));
    const BO_VUNG =
      'aside, .ant-pagination, .ant-tabs-nav, thead, .ant-select, .ant-picker, .ant-modal-root, .ant-drawer, ' +
      '.ant-dropdown, .ant-popover, .ant-table-filter-trigger, .ant-input-affix-wrapper, .ant-checkbox-wrapper, ' +
      '.ant-radio-wrapper, .ant-switch, .ant-collapse-header, .ant-message, .ant-notification';
    const dongDau = document.querySelector('.ant-table-tbody tr.ant-table-row');
    const dem: Record<string, number> = {};
    const kq: { khoa: string; nhan: string }[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('button, a[href], [role="button"]'))) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.top < 72) continue;
      if (getComputedStyle(el).visibility === 'hidden') continue;
      if (el.closest(BO_VUNG) || (el as HTMLButtonElement).disabled) continue;
      if (el.parentElement?.closest('button, a[href], [role="button"]')) continue;
      const tr = el.closest('tbody tr');
      if (tr && tr !== dongDau) continue;
      const nhan = (
        (el.textContent || '').replace(/\s+/g, ' ').trim() ||
        el.getAttribute('aria-label') ||
        el.getAttribute('title') ||
        el.querySelector('[aria-label]')?.getAttribute('aria-label') ||
        el.querySelector('[data-icon]')?.getAttribute('data-icon') ||
        '(không nhãn)'
      ).slice(0, 60);
      const goc = `${tr ? 'dòng' : el.closest('.ant-tabs-tabpane') ? 'tab' : 'màn'}:${nhan}`;
      dem[goc] = (dem[goc] || 0) + 1;
      const khoa = `${goc}#${dem[goc]}`;
      el.setAttribute('data-e2e-tt', khoa);
      kq.push({ khoa, nhan });
    }
    return kq;
  });
}

/** Tab cấp ngoài cùng đang hiện trong vùng nội dung (không tính tab trong hộp thoại) */
async function dsTab(page: Page): Promise<string[]> {
  const nhan = await page
    .locator('.ant-tabs-tab:visible')
    .filter({ hasNot: page.locator('.ant-tabs-tab-disabled') })
    .allInnerTexts()
    .catch(() => [] as string[]);
  return [...new Set(nhan.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean))];
}

for (const tk of ds) {
  test.describe(`${tk.ma} · ${tk.ten}`, () => {
    // Mỗi màn một test, chạy tuần tự trong một worker; màn hỏng KHÔNG làm bỏ qua các màn sau
    test.describe.configure({ mode: 'default' });

    let ctx: BrowserContext;
    let page: Page;
    let bi403: string[] = [];
    let chanGhi: string[] = [];

    const dangNhap = async () => {
      await loginSSO(page, tk.cccd, { pass: tk.matKhau });
    };

    test.beforeAll(async ({ browser }) => {
      ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, ignoreHTTPSErrors: true });
      await chanRequestGhi(ctx, (x) => chanGhi.push(x));
      ctx.on('response', (r: Response) => {
        const s = r.status();
        if ((s === 403 || s === 401) && r.url().startsWith(ORIGIN)) {
          const dong = `${s} ${r.request().method()} ${r.url().replace(ORIGIN, '')}`;
          r.text()
            .then((t) => bi403.push(`${dong} → ${t.replace(/\s+/g, ' ').slice(0, 160)}`))
            .catch(() => bi403.push(dong));
        }
      });
      ctx.on('page', (p) => p.on('dialog', (d) => d.dismiss().catch(() => {})));
      page = await ctx.newPage();
      await dangNhap();
    });

    test.afterAll(async () => {
      await ctx?.close().catch(() => {});
    });

    /** Vào trang gốc rồi đi lại các bước; phiên rơi thì đăng nhập lại. Trả về lỗi nếu không dựng lại được. */
    async function diDen(goc: string, duong: Buoc[]): Promise<string | null> {
      for (const p of ctx.pages()) if (p !== page) await p.close().catch(() => {});
      await page.goto(goc, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await choTai(page);
      if (/\/sso\/|\/qla\/login|authenticationendpoint/.test(page.url())) {
        await dangNhap();
        await page.goto(goc, { waitUntil: 'domcontentloaded' });
        await choTai(page);
      }
      for (const b of duong) {
        if (b.loai === 'tab') {
          const tab = page.locator('.ant-tabs-tab:visible').filter({ hasText: b.nhan }).first();
          if (!(await tab.count())) return `không thấy tab "${b.nhan}"`;
          await tab.click({ timeout: 5_000 }).catch(() => {});
        } else if (b.loai === 'nut') {
          await danhDau(page);
          const el = page.locator(`[data-e2e-tt="${b.khoa.replace(/"/g, '\\"')}"]`);
          if (!(await el.count())) return `không thấy "${b.khoa}"`;
          await el.click({ timeout: 5_000 }).catch(() => {});
        } else {
          const muc = page.locator('.ant-dropdown:visible .ant-dropdown-menu-item').filter({ hasText: b.nhan }).first();
          if (!(await muc.count())) return `không thấy mục "${b.nhan}"`;
          await muc.click({ timeout: 5_000 }).catch(() => {});
        }
        await choTai(page);
      }
      return null;
    }

    /** Bấm bước cuối của `duong` (các bước trước đã dựng lại) và ghi nhận chuyện gì xảy ra */
    async function bam(goc: string, duong: Buoc[], nhan: string): Promise<KetQuaBam & { url?: string; menu?: string[] }> {
      const kq: KetQuaBam & { url?: string; menu?: string[] } = { duong: nhan, ketQua: '', chanGhi: [], loi: [] };
      const loiDung = await diDen(goc, duong.slice(0, -1));
      if (loiDung) {
        kq.ketQua = `bỏ qua: ${loiDung}`;
        return kq;
      }
      bi403 = [];
      chanGhi = [];
      const urlTruoc = page.url();
      const tabMoi = ctx.waitForEvent('page', { timeout: 4_000 }).catch(() => null);
      const taiVe = page.waitForEvent('download', { timeout: 4_000 }).catch(() => null);
      const cuoi = duong[duong.length - 1];
      let bamDuoc = true;
      try {
        if (cuoi.loai === 'tab') {
          await page.locator('.ant-tabs-tab:visible').filter({ hasText: cuoi.nhan }).first().click({ timeout: 5_000 });
        } else if (cuoi.loai === 'nut') {
          await danhDau(page);
          await page.locator(`[data-e2e-tt="${cuoi.khoa.replace(/"/g, '\\"')}"]`).click({ timeout: 5_000 });
        } else {
          await page.locator('.ant-dropdown:visible .ant-dropdown-menu-item').filter({ hasText: cuoi.nhan }).first().click({ timeout: 5_000 });
        }
      } catch (e) {
        bamDuoc = false;
        kq.ketQua = `không bấm được: ${String(e).split('\n')[0].slice(0, 120)}`;
      }
      const popup = await tabMoi;
      const file = await taiVe;
      const trang = popup || page;
      await choTai(trang);
      await page.waitForTimeout(800);

      if (bamDuoc) {
        const moTa: string[] = [];
        if (popup) moTa.push(`tab mới ${popup.url().replace(ORIGIN, '')}`);
        else if (page.url() !== urlTruoc) {
          moTa.push(`→ ${page.url().replace(ORIGIN, '')}`);
          kq.url = page.url();
        }
        if (file) moTa.push(`tải ${file.suggestedFilename()}`);
        const hop = await page.locator('.ant-modal-wrap:visible .ant-modal-title, .ant-drawer-open .ant-drawer-title').allInnerTexts().catch(() => []);
        if (hop.length) {
          // Nội dung hộp thoại: "Thông báo" có thể là chính lời từ chối quyền
          const than = (await page.locator('.ant-modal-wrap:visible .ant-modal-body').allInnerTexts().catch(() => [] as string[]))
            .join(' | ')
            .replace(/s+/g, ' ')
            .trim();
          moTa.push(`mở hộp "${hop.join(' | ').slice(0, 80)}"${than && than.length < 200 ? `: ${than}` : ''}`);
          if (TB_QUYEN.test(than.slice(0, 300))) kq.loi.push(`hộp thoại báo quyền: ${than.slice(0, 160)}`);
        }
        if (await page.locator('.ant-popover:visible .ant-popconfirm, .ant-popconfirm:visible').count().catch(() => 0)) {
          moTa.push('hiện hộp xác nhận (không đồng ý)');
        }
        const menu = await page
          .locator('.ant-dropdown:visible .ant-dropdown-menu-item:not(.ant-dropdown-menu-item-disabled)')
          .allInnerTexts()
          .catch(() => [] as string[]);
        if (menu.length) {
          kq.menu = [...new Set(menu.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean))];
          moTa.push(`menu thả: ${kq.menu.join(', ')}`);
        }
        const thongBao = await page
          .locator('.ant-message-notice:visible, .ant-notification-notice:visible')
          .allInnerTexts()
          .catch(() => [] as string[]);
        const tb = thongBao.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
        if (tb.length) moTa.push(`thông báo: ${tb.join(' | ').slice(0, 120)}`);
        if (tb.some((s) => TB_QUYEN.test(s))) kq.loi.push(`thông báo quyền: ${tb.join(' | ').slice(0, 160)}`);
        kq.ketQua = moTa.join('; ') || 'không thấy thay đổi';
      }
      if (await laTrang403(trang)) kq.loi.push('hiện trang 403');
      kq.loi.push(...bi403);
      kq.chanGhi = [...chanGhi];
      if (popup) await popup.close().catch(() => {});
      return kq;
    }

    /**
     * Quét một trạng thái trang: mọi phần tử bấm được (+ mục trong menu thả của chúng).
     * Thao tác nào mở trang mới thì trả URL đầu tiên về cho người gọi quét tiếp.
     */
    async function quet(
      goc: string,
      tienTo: Buoc[],
      nhanTienTo: string,
      ketQua: KetQuaBam[],
      chiTrongTab = false,
    ): Promise<string | undefined> {
      let urlChiTiet: string | undefined;
      const loiDung = await diDen(goc, tienTo);
      if (loiDung) {
        ketQua.push({ duong: nhanTienTo || '(trang)', ketQua: `bỏ qua: ${loiDung}`, chanGhi: [], loi: [] });
        return;
      }
      // Sau khi chọn tab chỉ bấm nút TRONG nội dung tab (+ dòng lưới): nút thanh công cụ đã bấm ở lượt gốc
      const nut = (await danhDau(page)).filter((n) => !BO_QUA.test(n.nhan) && (!chiTrongTab || !n.khoa.startsWith('màn:')));
      if (nut.length > TRAN) {
        ketQua.push({ duong: `${nhanTienTo}…`, ketQua: `có ${nut.length} nút, chỉ bấm ${TRAN} nút đầu`, chanGhi: [], loi: [] });
      }
      for (const n of nut.slice(0, TRAN)) {
        const duong: Buoc[] = [...tienTo, { loai: 'nut', khoa: n.khoa }];
        const nhan = `${nhanTienTo}${n.khoa.replace(/#1$/, '')}`;
        const kq = await bam(goc, duong, nhan);
        ketQua.push(kq);
        if (kq.url && !urlChiTiet && new URL(kq.url).pathname !== new URL(goc).pathname) urlChiTiet = kq.url;
        for (const muc of (kq.menu || []).filter((m) => !BO_QUA.test(m))) {
          ketQua.push(await bam(goc, [...duong, { loai: 'menu', nhan: muc }], `${nhan} › ${muc}`));
        }
      }
      return urlChiTiet;
    }

    /** Quét cả trang: không tab + từng tab (bấm tab, rồi bấm mọi nút trong tab đó) */
    async function quetTrang(goc: string, nhanTrang: string, ketQua: KetQuaBam[]): Promise<string | undefined> {
      await diDen(goc, []);
      const kqTrang: KetQuaBam = { duong: `${nhanTrang} (mở trang)`, ketQua: page.url().replace(ORIGIN, ''), chanGhi: [...chanGhi], loi: [] };
      if (await laTrang403(page)) kqTrang.loi.push('hiện trang 403');
      kqTrang.loi.push(...bi403);
      ketQua.push(kqTrang);

      const tabs = await dsTab(page);
      // Tab đang mở sẵn đã được quét ở lượt gốc
      const dangMo = ((await page.locator('.ant-tabs-tab-active:visible').first().innerText().catch(() => '')) || '').replace(/s+/g, ' ').trim();
      let urlChiTiet = await quet(goc, [], `${nhanTrang} › `, ketQua);
      for (const tab of tabs.filter((t) => t !== dangMo)) {
        const kqTab = await bam(goc, [{ loai: 'tab', nhan: tab }], `${nhanTrang} › [tab] ${tab}`);
        ketQua.push(kqTab);
        const u = await quet(goc, [{ loai: 'tab', nhan: tab }], `${nhanTrang} › [tab] ${tab} › `, ketQua, true);
        urlChiTiet ??= u;
      }
      return urlChiTiet;
    }

    for (const man of MAN) {
      test(man.nhan, async ({}, testInfo) => {
        test.setTimeout(60 * 60_000);
        const goc = `${ORIGIN}/qla/${man.duong}`;
        const ketQua: KetQuaBam[] = [];

        // Màn phải có trên menu của tài khoản (menu lấy từ quyền QTUD)
        await diDen(`${ORIGIN}/qla/home`, []);
        const coTrenMenu = await khungMenu(page).locator(`a[href*="${man.duong}"]`).count().catch(() => 0);
        expect(coTrenMenu, `${tk.ten}: màn "${man.nhan}" không có trên menu`).toBeGreaterThan(0);

        const urlChiTiet = await quetTrang(goc, 'Danh sách', ketQua);
        if (urlChiTiet) await quetTrang(urlChiTiet, 'Chi tiết', ketQua);

        await testInfo.attach('thao-tac.json', {
          body: JSON.stringify({ taiKhoan: tk.ma, man: man.nhan, moiTruong: ORIGIN, ketQua }, null, 2),
          contentType: 'application/json',
        });
        const soChan = ketQua.reduce((s, k) => s + k.chanGhi.length, 0);
        testInfo.annotations.push({
          type: 'tổng',
          description: `${ketQua.length} thao tác · ${soChan} request ghi đã chặn · ${urlChiTiet ? 'có' : 'không'} trang chi tiết`,
        });
        for (const k of ketQua) {
          testInfo.annotations.push({
            type: k.loi.length ? `❌ ${k.duong}` : `✅ ${k.duong}`,
            description: `${k.ketQua}${k.chanGhi.length ? ` · chặn ghi: ${k.chanGhi.join(', ')}` : ''}${k.loi.length ? ` · ${k.loi.join('; ')}` : ''}`,
          });
        }
        const hong = ketQua.filter((k) => k.loi.length);
        expect(hong.map((k) => `${k.duong}: ${k.loi.join('; ')}`), `${tk.ten} · ${man.nhan}: ${hong.length} thao tác bị 403`).toEqual([]);
      });
    }
  });
}

/** Huỷ mọi request ghi ở tầng mạng của trình duyệt — pre-prod có dữ liệu thật */
async function chanRequestGhi(ctx: BrowserContext, ghi: (x: string) => void) {
  await ctx.route('**/*', (route) => {
    const req = route.request();
    const m = req.method();
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return route.continue();
    const u = new URL(req.url());
    // Đăng nhập SSO (WSO2 POST form) phải qua được; đăng xuất thì không
    const laDangNhap = /authenticationendpoint|commonauth|oauth2|\/sso\/(login|auth)/i.test(u.href) && !/logout/i.test(u.href);
    if (laDangNhap || (PHIEN.test(u.pathname) && !/logout/i.test(u.pathname))) return route.continue();
    if (m === 'POST' && POST_CHI_DOC.test(u.pathname)) return route.continue();
    ghi(`${m} ${u.pathname.replace(/^\/qla\/api\/v1/, '')}`);
    return route.abort('blockedbyclient');
  });
}

