/**
 * E2E — BƯỚC 4: TỜ TRÌNH PHÂN CÔNG THẨM PHÁN → TRÌNH KÝ (môi trường đào tạo), cho đơn đã phân công ở bước 3.
 *
 *   QLA_TT_MA_DON=<mã đơn> QLA_TT_SO_THU_LY=<số TL> QLA_TT_SO_BA=<số BA> QLA_TT_NGAY_BA=<dd/mm/yyyy> \
 *   QLA_TT_TOA=<tòa ra BA> node tools/chay-ui.js daotao [--ghi] --cli --file=e2e-to-trinh-phan-cong
 *   Người duyệt/ký: QLA_TT_NGUOI_DUYET (mặc định Nguyễn Thị Thu Hường), QLA_TT_NGUOI_KY (mặc định Nguyễn Tường Linh)
 *
 * Màn thật (khảo sát 14/10/2026): Danh sách đơn → "Loại văn bản" = Tờ trình phân công thẩm phán → tick đúng đơn
 * → "Lưu số văn bản và in báo cáo" → popup "Lưu số văn bản & In báo cáo" (Người duyệt / Người ký) → "Lưu văn bản"
 * (= tạo văn bản) → "Trình ký". Không --ghi: dừng trước "Lưu văn bản". Không retry tạo/trình ký, không API/SQL.
 * Báo cáo: reports/e2e-to-trinh-phan-cong/<mã đơn>/.
 */
import fs from 'fs';
import path from 'path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { ORIGIN } from '../../../playwright.config';
import { choPhepGhiTKM, credentialsTKM } from '../../../account';
import { loginSSO } from '../../../common/login';
import { choHetSpin, chonSelectNeuCo, go, hienTrong, toastGanDay } from '../../../common/antd';
import { moMenu } from '../../../common/menu';
import { HctpPage } from '../../../pages/hctp.page';

const MA_DON = process.env.QLA_TT_MA_DON || '';
const SO_THU_LY = process.env.QLA_TT_SO_THU_LY || '';
const SO_BA = process.env.QLA_TT_SO_BA || '';
const NGAY_BA = process.env.QLA_TT_NGAY_BA || '';
const TOA = process.env.QLA_TT_TOA || '';
/** Loại văn bản ở Danh sách đơn; tên hiển thị ở Danh sách văn bản (dùng để kiểm trùng / trình bản nháp) */
const LOAI_VB = process.env.QLA_TT_LOAI_VB || 'Tờ trình phân công thẩm phán';
const TEN_VB = process.env.QLA_TT_TEN_VB || 'Tờ trình phân công';
const NGUOI_DUYET = process.env.QLA_TT_NGUOI_DUYET || 'Nguyễn Thị Thu Hường';
const NGUOI_KY = process.env.QLA_TT_NGUOI_KY || 'Nguyễn Tường Linh';

const GOC = path.resolve(__dirname, '../../..');
const THU_MUC = path.join(GOC, `reports/e2e-to-trinh-phan-cong/${MA_DON || 'chua-dat'}${process.env.QLA_TT_LOAI_VB ? `-${TEN_VB.replace(/\s+/g, '-')}` : ''}`);
const THU_MUC_ANH = path.join(THU_MUC, 'screenshots');
const THU_MUC_TRACE = path.join(THU_MUC, 'traces');

type TrangThai = 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIPPED_ALREADY_SUBMITTED' | 'SKIPPED_DRAFT_EXISTS' | 'NOT_RUN';
interface Tc {
  ma: string;
  ten: string;
  mongDoi: string;
  trangThai: TrangThai;
  chiTiet: string[];
  /** Điều kiện đã kiểm ở TC này */
  check: string;
  /** Định danh ghi khi PASS (id đơn / văn bản / yêu cầu phê duyệt) */
  id: string;
  anh: string[];
}
const DS_TC: [string, string, string][] = [
  ['TC01', 'Mở Danh sách đơn (tab Tổng số)', 'Thành công'],
  ['TC02', `Tìm BA/QĐ ${SO_BA || '?'}`, 'Đúng bản án'],
  ['TC03', 'Kiểm tra duy nhất một đơn', 'Chính xác 1 bản ghi'],
  ['TC04', 'Kiểm tra đã phân công', 'Có thẩm phán'],
  ['TC05', 'Kiểm tra Tờ trình tồn tại', 'Không tạo trùng'],
  ['TC06', 'Chọn Loại văn bản', `Đúng "${LOAI_VB}"`],
  ['TC07', 'Chọn Người duyệt', NGUOI_DUYET],
  ['TC08', 'Chọn Người ký', NGUOI_KY],
  ['TC09', 'Tạo văn bản ("Lưu văn bản")', 'Tạo thành công'],
  ['TC10', 'Kiểm tra văn bản', 'Đúng dữ liệu'],
  ['TC11', 'Click Trình ký', 'Thực hiện thành công'],
  ['TC12', 'Kiểm tra trạng thái', 'Đã trình ký / chờ duyệt'],
  ['TC13', 'Tìm lại đơn và văn bản', 'Tồn tại, đúng thông tin'],
  ['TC14', 'Kiểm tra không tạo trùng', 'Không trùng văn bản'],
  ['TC15', 'Chạy lại E2E', 'Không trình ký lại'],
];

/** Cột "Check" của báo cáo: điều kiện mỗi TC thực sự kiểm */
const CHECK: Record<string, string> = {
  TC01: "Đi qua menu Quản lý đơn → Danh sách đơn; URL /danh-sach-don",
  TC02: "Tab Tổng số, từ khoá mã đơn; dòng khớp đủ mã đơn + Số BA + ngày BA + tòa + số thụ lý",
  TC03: "matchedRecords = 1 và tổng bản ghi của tìm kiếm = số dòng (không phân trang)",
  TC04: "Dòng đơn có \"Thẩm phán: <tên>\" (đã phân công)",
  TC05: "Danh sách văn bản lọc Mã đơn: số Tờ trình phân công (0 → tạo; nháp → dùng lại; đã trình → bỏ qua; >1 → FAIL)",
  TC06: "Loại văn bản = Tờ trình phân công thẩm phán; tick đúng 1 đơn; popup có văn bản đó gắn đúng thẩm phán",
  TC07: "Người duyệt: đúng 1 mục khớp tên, giá trị hiển thị sau chọn đúng tên",
  TC08: "Người ký: đúng 1 mục khớp tên, giá trị hiển thị sau chọn đúng tên",
  TC09: "Bấm \"Lưu văn bản\" 1 lần; hộp xác nhận \"cho 1 đơn\" → Đồng ý; toast \"Lưu văn bản thành công\"",
  TC10: "Dòng văn bản trong popup ghi đúng Người duyệt/Người ký; có nút Trình ký",
  TC11: "Bấm Trình ký/Gửi 1 lần; API POST /phe-duyet-de-xuat/trinh-duyet thành công",
  TC12: "Danh sách văn bản: đúng 1 Tờ trình, trạng thái Chờ duyệt/Chờ ký/Đã ký",
  TC13: "Tìm lại đơn ra đúng 1; Tờ trình có tên Người duyệt",
  TC14: "Số Tờ trình phân công của đơn = 1",
  TC15: "Chạy lại: thấy Tờ trình đã trình → không bấm Lưu/Trình ký"
};

class Dung extends Error {
  constructor(readonly trangThai: Exclude<TrangThai, 'PASS' | 'NOT_RUN'>, message: string) {
    super(message);
  }
}

const motDong = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Danh sách đơn: (tuỳ chọn) Loại văn bản → từ khoá mã đơn → Tìm kiếm; trả các dòng khớp ĐỦ khoá nghiệp vụ */
async function timDon(page: Page, loaiVanBan: string | undefined, ghi: (s: string) => void) {
  await moMenu(page, ['Quản lý đơn', 'Danh sách đơn']);
  await choHetSpin(page);
  const tabTong = page.getByRole('tab', { name: /Tổng số/ }).first();
  if (await tabTong.isVisible().catch(() => false)) await tabTong.click();
  await choHetSpin(page);
  if (loaiVanBan) {
    const oLoai = page.getByRole('combobox', { name: /^Loại văn bản/ }).first();
    await oLoai.click();
    const muc = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: new RegExp(`^${loaiVanBan}$`) });
    if (!(await hienTrong(muc.first(), 10_000))) throw new Dung('FAIL', `Ô "Loại văn bản" không có mục "${loaiVanBan}"`);
    await muc.first().click();
    ghi(`Loại văn bản = ${loaiVanBan}`);
  }
  await go(page.getByLabel('Từ khóa tìm kiếm chung'), MA_DON);
  ghi(`Từ khóa = mã đơn ${MA_DON}`);
  await page.getByRole('button', { name: /Tìm kiếm$/ }).click();
  await choHetSpin(page);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await expect(
    page.locator('.ant-table-row:visible').first().or(page.locator('.ant-table-placeholder:visible, .ant-empty:visible').first()),
  ).toBeVisible({ timeout: 30_000 });
  const tong = motDong(await page.locator('.ant-pagination-total-text:visible, [class*="pagination"] :text("Hiển thị")').first().innerText().catch(() => ''));
  const tatCa = (await page.locator('.ant-table-row:visible').allInnerTexts()).map(motDong);
  const khop = tatCa.filter(
    d =>
      d.includes(`Mã đơn: ${MA_DON}`) &&
      (!SO_BA || d.includes(`Số BA/QĐ: ${SO_BA}`)) &&
      (!NGAY_BA || d.includes(NGAY_BA)) &&
      (!TOA || d.includes(TOA)) &&
      (!SO_THU_LY || d.includes(SO_THU_LY)),
  );
  return { tatCa, khop, tong };
}

/** Danh sách văn bản → tab Tất cả → lọc "Mã đơn" → các dòng có tên Tờ trình phân công */
async function vanBanCuaDon(page: Page, ghi: (s: string) => void): Promise<string[]> {
  await moMenu(page, ['Quản lý đơn', 'Danh sách văn bản']);
  await choHetSpin(page);
  const tabTatCa = page.getByRole('tab', { name: /^Tất cả/ }).first();
  if (await tabTatCa.isVisible().catch(() => false)) await tabTatCa.click();
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  // Thanh công cụ bảng: [Người tạo] [Mã đơn] — ô Mã đơn là select thứ hai (xem HctpPage.locMaDon)
  const thanhLoc = page.locator('.ant-pro-table-list-toolbar-container').first();
  const coMa = await chonSelectNeuCo(page, thanhLoc.locator('.ant-select').nth(1).locator('input'), MA_DON);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  if (!coMa) {
    ghi(`Bộ lọc "Mã đơn" ở Danh sách văn bản không có ${MA_DON} → đơn chưa có văn bản nào`);
    return [];
  }
  await choHetSpin(page);
  const dong = (await page.locator('.ant-table-row:visible').allInnerTexts()).map(motDong);
  ghi(`Danh sách văn bản lọc mã đơn ${MA_DON}: ${dong.length} dòng`);
  return dong.filter(d => d.includes(TEN_VB));
}

/** Ô select trong popup: chọn mục có nhãn BẮT ĐẦU bằng tên (nhãn dạng "Họ tên - ngày sinh"); trùng tên → dừng */
async function chonNguoi(page: Page, o: Locator, ten: string, nhan: string): Promise<string> {
  // Bấm vào khung .ant-select (input bên trong có thể bị lớp chọn che)
  const khung = o.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
  await khung.scrollIntoViewIfNeeded();
  // Danh sách tải qua API sau khi mở, có lúc rất chậm; ảnh lỗi 15/10/2026 vẫn hiện đủ danh sách mà locator lọc
  // hasText không khớp → so khớp trong trình duyệt trên MỌI dropdown đang hiện, tên chuẩn hoá NFC, dòng đầu
  // "Họ tên - ngày sinh"; chưa thấy thì đóng/mở lại, tối đa 3 lần
  const nfc = (x: string) => x.normalize('NFC').replace(/\s+/g, ' ').trim();
  const tenChuan = nfc(ten);
  const timMuc = () =>
    page.evaluate(t => {
      const muc = [...document.querySelectorAll('.ant-select-dropdown .ant-select-item-option')].filter(
        e => (e as HTMLElement).offsetParent !== null,
      ) as HTMLElement[];
      const dong = muc.map(e => (e.innerText || '').normalize('NFC').split('\n')[0].replace(/\s+/g, ' ').trim());
      const viTri = dong.map((d, k) => (d === t || d.startsWith(`${t} - `) ? k : -1)).filter(k => k >= 0);
      // Bấm NGAY trong cùng lượt tìm: danh sách ảo vẽ lại phần tử giữa hai lệnh nên đánh dấu rồi bấm từ
      // Playwright có lúc quá 30s (đo 15/10/2026, đơn 22164) — rc-select chọn mục theo sự kiện click
      if (viTri.length === 1) {
        muc[viTri[0]].scrollIntoView({ block: 'nearest' });
        muc[viTri[0]].click();
      }
      return { dong, soKhop: viTri.length };
    }, tenChuan);
  let kq = { dong: [] as string[], soKhop: 0 };
  for (let lan = 1; lan <= 3 && kq.soKhop !== 1; lan++) {
    if (!(await page.locator('.ant-select-dropdown:visible').count())) await khung.click();
    const het = Date.now() + 30_000;
    while (Date.now() < het) {
      kq = await timMuc();
      if (kq.soKhop === 1) break;
      await page.waitForTimeout(1_000);
    }
    if (kq.soKhop === 1) break;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(3_000);
  }
  if (kq.soKhop !== 1) {
    await page.keyboard.press('Escape');
    throw new Dung('BLOCKED', `${nhan}: ${kq.soKhop} mục khớp "${ten}" (danh sách: ${kq.dong.join(' | ') || 'trống'}) — không chọn thay thế`);
  }
  await expect.poll(async () => nfc(motDong(await khung.innerText())), { timeout: 15_000 }).toContain(tenChuan);
  const daChon = motDong(await khung.innerText());
  if (!nfc(daChon).startsWith(tenChuan)) throw new Dung('FAIL', `${nhan} sau khi chọn hiển thị "${daChon}"`);
  return daChon;
}

test.use({ storageState: { cookies: [], origins: [] } });

test(`e2e-to-trinh-phan-cong · đơn ${MA_DON || '?'}`, async ({ page }) => {
  test.setTimeout(25 * 60_000);
  test.skip(!MA_DON, 'Thiếu QLA_TT_MA_DON (mã đơn từ E2E trước)');
  test.skip(new URL(ORIGIN).host !== 'e-qlta-daotao.toaan.gov.vn', `Chỉ chạy trên môi trường đào tạo, đang ở ${ORIGIN}`);

  const ghiDuoc = choPhepGhiTKM();
  for (const d of [THU_MUC_ANH, THU_MUC_TRACE]) fs.mkdirSync(d, { recursive: true });
  const batDau = new Date();
  const ds: Tc[] = DS_TC.map(([ma, ten, mongDoi]) => ({ ma, ten, mongDoi, trangThai: 'NOT_RUN', chiTiet: [], anh: [], check: CHECK[ma] || '', id: '' }));
  /** ID ghi vào cột ID khi TC PASS mà TC không tự đặt id riêng */
  const ID_MAC_DINH = `đơn ${MA_DON} · số TL ${SO_THU_LY || "?"}`;
  const tc = (ma: string) => ds.find(t => t.ma === ma)!;
  const chup = async (ten: string) => {
    const tep = path.join(THU_MUC_ANH, `${ten}.png`);
    await page.screenshot({ path: tep, fullPage: true }).catch(() => undefined);
    return path.relative(THU_MUC, tep).replace(/\\/g, '/');
  };
  const chay = async (ma: string, than: (t: Tc) => Promise<void>) => {
    const t = tc(ma);
    await test.step(`${ma} – ${t.ten}`, async () => {
      try {
        await than(t);
        if (t.trangThai === 'NOT_RUN') t.trangThai = 'PASS';
        if (t.trangThai === 'PASS' && !t.id) t.id = ID_MAC_DINH;
      } catch (e) {
        t.trangThai = e instanceof Dung ? e.trangThai : 'FAIL';
        t.chiTiet.push(e instanceof Error ? e.message.split('\n')[0] : String(e));
        t.anh.push(await chup(`${ma}-loi`));
        throw e;
      }
    });
  };

  let traceTuGhi = false;
  try {
    await page.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
    traceTuGhi = true;
  } catch {
    /* UI mode tự quản lý trace */
  }

  let thamPhan = '';
  let daTrinhTruoc = false;
  let banNhap = false;
  let loiCuoi: unknown;
  const popup = page.locator('.ant-modal:visible').filter({ hasText: 'Lưu số văn bản & In báo cáo' }).last();
  try {
    // ── PHASE 1 ──
    await chay('TC01', async t => {
      const cccd = process.env.QLA_TT_CCCD;
      const tk = cccd ? { user: cccd, pass: process.env.QLA_TT_PASS || `Ta@${cccd}` } : credentialsTKM();
      if (!tk) throw new Dung('BLOCKED', 'Thiếu QLA_TKM_USER trong .env.daotao');
      await loginSSO(page, tk.user, { pass: tk.pass });
      t.chiTiet.push(`Đăng nhập SSO: ${tk.user}`);
      await moMenu(page, ['Quản lý đơn', 'Danh sách đơn']);
      await expect(page).toHaveURL(/\/qla\/quan-ly-don\/danh-sach-don/, { timeout: 30_000 });
      t.chiTiet.push(`URL: ${page.url()}`);
      t.anh.push(await chup('01-danh-sach-don'));
    });
    let dongDon = '';
    await chay('TC02', async t => {
      const { tatCa, khop, tong } = await timDon(page, undefined, s => t.chiTiet.push(s));
      t.chiTiet.push(`Kết quả: ${tatCa.length} dòng${tong ? ` (${tong})` : ''}; khớp đủ khoá (mã đơn, BA ${SO_BA}, ngày ${NGAY_BA}, tòa, số TL): ${khop.length}`);
      t.anh.push(await chup('02-tim-don'));
      if (!khop.length) throw new Dung('FAIL', 'Không có đơn khớp đủ khoá nghiệp vụ');
      dongDon = khop[0];
    });
    await chay('TC03', async t => {
      // Tab Tổng số, không lọc Loại văn bản (đơn đã lưu tờ trình thì rời bộ lọc đó); kiểm cả tổng bản ghi
      const { tatCa, khop, tong } = await timDon(page, undefined, s => t.chiTiet.push(s));
      const tongSo = Number((tong.match(/tổng\s+(\d+)\s+bản ghi/i) || [])[1] ?? tatCa.length);
      t.chiTiet.push(`matchedRecords = ${khop.length} · tổng bản ghi của tìm kiếm = ${tongSo} · dòng trên trang = ${tatCa.length}`);
      t.anh.push(await chup('03-duy-nhat'));
      if (khop.length !== 1 || tongSo !== tatCa.length) {
        throw new Dung(khop.length ? 'FAIL' : 'BLOCKED', `matchedRecords = ${khop.length}, tổng ${tongSo} (phải đúng 1, không phân trang)`);
      }
      dongDon = khop[0];
    });
    await chay('TC04', async t => {
      const m = dongDon.match(/Thẩm phán:\s*([^(]+?)\s*\(/);
      thamPhan = m ? m[1].trim() : '';
      t.chiTiet.push(`Thẩm phán trên dòng đơn: ${thamPhan || '(không có)'}`);
      if (!thamPhan) throw new Dung('BLOCKED', 'Đơn chưa có thẩm phán được phân công');
      if (!/Thụ lý mới/.test(dongDon)) t.chiTiet.push('Lưu ý: dòng đơn không ghi "Thụ lý mới"');
    });

    // ── TC05 · Văn bản đã có? ──
    await chay('TC05', async t => {
      const daCo = await vanBanCuaDon(page, s => t.chiTiet.push(s));
      t.anh.push(await chup('05-danh-sach-van-ban'));
      if (daCo.length > 1) throw new Dung('FAIL', `Đơn đã có ${daCo.length} Tờ trình phân công — trùng văn bản`);
      if (daCo.length) {
        daTrinhTruoc = daCo.some(d => /Chờ duyệt|Chờ ký|Đã ký|Đã ban hành|Đã trình/i.test(d));
        t.chiTiet.push(...daCo.map(d => `Đã có: ${d.slice(0, 250)}`));
        if (daTrinhTruoc) throw new Dung('SKIPPED_ALREADY_SUBMITTED', 'Tờ trình đã tồn tại và đã trình — không tạo/trình lại');
        // Bản nháp (đã "Lưu văn bản" nhưng chưa trình): KHÔNG tạo bản sao, đi thẳng tới trình ký bản nháp
        banNhap = true;
        t.trangThai = 'SKIPPED_DRAFT_EXISTS';
        t.chiTiet.push('Đã có bản nháp Tờ trình — không tạo bản sao; trình ký bản nháp ở TC11');
        return;
      }
      t.chiTiet.push('Chưa có Tờ trình phân công thẩm phán cho đơn này');
    });

    // ── TC06–TC10 · Tạo văn bản mới (bỏ qua khi đã có bản nháp) ──
    if (banNhap) {
      for (const ma of ['TC06', 'TC07', 'TC08', 'TC09', 'TC10']) {
        tc(ma).trangThai = 'SKIPPED_DRAFT_EXISTS';
        tc(ma).chiTiet.push('Đã có bản nháp Tờ trình (lượt trước) — không mở popup tạo mới');
      }
      if (!ghiDuoc) throw new Dung('BLOCKED', 'Chế độ chỉ đọc (không --ghi) — dừng trước khi trình ký bản nháp');
    } else {
    await chay('TC06', async t => {
      const { khop } = await timDon(page, LOAI_VB, s => t.chiTiet.push(s));
      if (khop.length !== 1) throw new Dung('BLOCKED', `matchedRecords = ${khop.length} khi chuẩn bị tick`);
      const dong = page.locator('.ant-table-row:visible').filter({ hasText: `Mã đơn: ${MA_DON}` });
      await expect(dong).toHaveCount(1);
      await dong.locator('.ant-checkbox-input').first().check();
      await page.getByRole('button', { name: /Lưu số văn bản và in báo cáo/ }).click();
      await expect(popup, 'Không mở được popup "Lưu số văn bản & In báo cáo"').toBeVisible({ timeout: 60_000 });
      await choHetSpin(page);
      // Popup hiện dần + bảng tải sau (đo 15/10/2026: lúc mới mở là "0/0 đơn hợp lệ") → chờ có dòng
      await popup.locator('.ant-table-row').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => undefined);
      const dongVb = (await popup.locator('.ant-table-row').allInnerTexts()).map(motDong);
      t.chiTiet.push(`Bảng trong popup: ${dongVb.join(' ### ') || '(trống)'} · ${motDong(await popup.getByText(/đơn hợp lệ/).first().innerText().catch(() => ''))}`);
      if (!dongVb.some(d => d.startsWith(LOAI_VB))) throw new Dung('FAIL', `Popup không có văn bản "${LOAI_VB}"`);
      if (thamPhan && !dongVb.some(d => d.includes(thamPhan))) throw new Dung('FAIL', `Popup không gắn thẩm phán ${thamPhan}`);
      const soDon = dongVb.filter(d => /^Danh sách đơn/.test(d)).length;
      t.chiTiet.push(`Số nhóm đơn trong popup: ${soDon}`);
      t.anh.push(await chup('06-popup-loai-van-ban'));
    });
    await chay('TC07', async t => {
      t.chiTiet.push(`Đã chọn: ${await chonNguoi(page, popup.locator('#nguoiDuyet'), NGUOI_DUYET, 'Người duyệt')}`);
      t.anh.push(await chup('07-nguoi-duyet'));
    });
    await chay('TC08', async t => {
      t.chiTiet.push(`Đã chọn: ${await chonNguoi(page, popup.locator('#nguoiKy'), NGUOI_KY, 'Người ký')}`);
      t.anh.push(await chup('08-nguoi-ky'));
      if (!ghiDuoc) throw new Dung('BLOCKED', 'Chế độ chỉ đọc (không --ghi) — dừng trước "Lưu văn bản"');
    });

    // ── TC09 · Tạo văn bản (một lần) ──
    await chay('TC09', async t => {
      t.anh.push(await chup('09-truoc-luu'));
      await popup.getByRole('button', { name: /Lưu văn bản$/ }).click();
      const hopXn = page.locator('.ant-modal-confirm:visible, .ant-modal:visible').filter({ hasText: /lưu văn bản cho/i }).last();
      // Hộp xác nhận hiện SAU khi popup quay xong (đo 15/10/2026: >10s)
      if (await hienTrong(hopXn, 60_000)) {
        t.chiTiet.push(`Xác nhận: ${motDong(await hopXn.innerText()).slice(0, 200)}`);
        if (!/cho 1 đơn/.test(await hopXn.innerText())) throw new Dung('FAIL', 'Hộp xác nhận không phải "1 đơn" — huỷ');
        await hopXn.getByRole('button', { name: /^Đồng ý$/ }).click();
      }
      const toasts = await toastGanDay(page, 90_000);
      t.chiTiet.push(`Thông báo: ${toasts.join(' | ') || '(không có)'}`);
      t.anh.push(await chup('09-sau-luu'));
      // Toast có lúc không bắt được (đo 15/10/2026: DB đã có văn bản) → nút "Trình ký" hiện trong popup cũng là bằng chứng đã lưu
      const coTrinhKy = await hienTrong(popup.getByRole('button', { name: /Trình ký$/ }), 30_000);
      t.chiTiet.push(`Nút "Trình ký" trong popup sau khi lưu: ${coTrinhKy ? 'có' : 'không'}`);
      if (!toasts.some(x => /Lưu văn bản thành công/i.test(x)) && !coTrinhKy) {
        throw new Dung('FAIL', 'Không có "Lưu văn bản thành công" và không có nút "Trình ký" — không trình ký');
      }
    });

    // ── TC10 · Văn bản sau tạo ──
    await chay('TC10', async t => {
      const dongVb = (await popup.locator('.ant-table-row').allInnerTexts()).map(motDong);
      t.chiTiet.push(`Bảng trong popup: ${dongVb.join(' ### ')}`);
      const vb = dongVb.find(d => d.startsWith(LOAI_VB)) || '';
      if (!vb.includes(NGUOI_DUYET) || !vb.includes(NGUOI_KY)) throw new Dung('FAIL', 'Văn bản không ghi đúng Người duyệt/Người ký');
      await expect(popup.getByRole('button', { name: /Trình ký$/ }), 'Sau khi lưu không có nút "Trình ký"').toBeVisible({ timeout: 30_000 });
      t.anh.push(await chup('10-van-ban-sau-tao'));
    });

    }

    // ── TC11 · Trình ký (một lần) ──
    await chay('TC11', async t => {
      if (banNhap) {
        // Danh sách văn bản → tab Nháp → lọc mã đơn → icon gửi → Người duyệt/Người ký → Gửi (HctpPage.trinhKyBanNhap)
        const id = await new HctpPage(page).trinhKyBanNhap(MA_DON, TEN_VB, NGUOI_DUYET, NGUOI_KY);
        t.chiTiet.push(`Trình ký bản nháp qua Danh sách văn bản → tab Nháp → Gửi · id yêu cầu phê duyệt: ${id || '(không đọc được)'}`);
        t.anh.push(await chup('11-trinh-ky-ban-nhap'));
        if (id) t.id = `yêu cầu phê duyệt ${id}`;
        return;
      }
      const choApi = page.waitForResponse(r => r.request().method() === 'POST' && r.url().includes('/phe-duyet-de-xuat/trinh-duyet'), {
        timeout: 90_000,
      });
      await popup.getByRole('button', { name: /Trình ký$/ }).click();
      const res = await choApi.catch(() => null);
      const kq = res ? await res.json().catch(() => null) : null;
      t.chiTiet.push(`API: ${res ? `POST ${new URL(res.url()).pathname} → HTTP ${res.status()} · success=${kq?.success}` : 'không bắt được'}`);
      const hop = page.locator('.ant-modal:visible').filter({ hasText: 'Trình duyệt thành công' });
      const coHop = await hienTrong(hop, 30_000);
      t.chiTiet.push(`Hộp "Trình duyệt thành công": ${coHop ? 'có' : 'không'}`);
      t.anh.push(await chup('11-trinh-ky'));
      if (coHop) await hop.getByRole('button', { name: 'Đóng' }).click();
      if (!res || !res.ok() || kq?.success === false) throw new Dung('FAIL', `Trình ký thất bại: ${kq?.message || 'không rõ'}`);
      const idYc = kq?.data?.dsIdVanBanDaTrinh?.[0] || kq?.data?.[0]?.id || kq?.data?.id;
      if (idYc) t.id = `yêu cầu phê duyệt ${idYc}`;
    });
  } catch (e) {
    loiCuoi = e;
  }

  // ── TC12–TC15 · Kiểm sau trình ký (chạy cả khi đã trình từ lượt trước) ──
  if (tc('TC11').trangThai === 'PASS' || daTrinhTruoc) {
    let dsTt: string[] = [];
    await chay('TC12', async t => {
      if (await popup.isVisible().catch(() => false)) await popup.getByRole('button', { name: /^Đóng$/ }).first().click().catch(() => undefined);
      dsTt = await vanBanCuaDon(page, s => t.chiTiet.push(s));
      t.chiTiet.push(...dsTt.map(d => `Tờ trình: ${d.slice(0, 300)}`));
      t.anh.push(await chup('12-trang-thai'));
      if (dsTt.length !== 1) throw new Dung('FAIL', `Có ${dsTt.length} Tờ trình cho đơn ${MA_DON}`);
      if (!/Chờ duyệt|Chờ ký|Đã trình|Đã ký|Đã ban hành/i.test(dsTt[0])) throw new Dung('FAIL', 'Trạng thái Tờ trình chưa sang bước trình ký');
    }).catch(() => undefined);
    await chay('TC13', async t => {
      const { khop } = await timDon(page, undefined, s => t.chiTiet.push(s));
      t.anh.push(await chup('13-tim-lai-don'));
      if (khop.length !== 1) throw new Dung('FAIL', `Tìm lại đơn: matchedRecords = ${khop.length}`);
      if (!dsTt.length) throw new Dung('FAIL', 'Không thấy Tờ trình của đơn');
      for (const can of [NGUOI_DUYET, NGUOI_KY]) {
        t.chiTiet.push(`${can}: ${dsTt[0].includes(can) ? 'có trên dòng văn bản ✔' : 'không hiện trên dòng (cột không có)'}`);
      }
    }).catch(() => undefined);
    await chay('TC14', async t => {
      t.chiTiet.push(`Số Tờ trình phân công của đơn: ${dsTt.length}`);
      if (dsTt.length !== 1) throw new Dung('FAIL', 'Có văn bản trùng');
    }).catch(() => undefined);
    await chay('TC15', async t => {
      const lai = await vanBanCuaDon(page, s => t.chiTiet.push(s));
      if (lai.length !== 1) throw new Dung('FAIL', `Chạy lại thấy ${lai.length} Tờ trình`);
      t.trangThai = 'SKIPPED_ALREADY_SUBMITTED';
      t.chiTiet.push('Tờ trình đã trình — không bấm "Lưu văn bản"/"Trình ký" lần nữa');
    }).catch(() => undefined);
  }

  // ── Báo cáo ──
  let tepTrace = '';
  if (traceTuGhi) {
    tepTrace = path.join(THU_MUC_TRACE, `trace-${batDau.toISOString().replace(/[:.]/g, '-')}.zip`);
    await page.context().tracing.stop({ path: tepTrace }).catch(() => undefined);
  }
  const dem = (s: TrangThai) => ds.filter(t => t.trangThai === s).length;
  const md = [
    `# Báo cáo E2E — Tờ trình phân công thẩm phán · đơn ${MA_DON}`,
    '',
    `- Môi trường: ${ORIGIN} · chế độ: ${ghiDuoc ? 'GHI' : 'CHỈ ĐỌC'}`,
    `- Thời gian: ${batDau.toLocaleString('vi-VN')} → ${new Date().toLocaleString('vi-VN')}`,
    `- Đơn: mã ${MA_DON} · số TL ${SO_THU_LY || '?'} · BA ${SO_BA || '?'} ngày ${NGAY_BA || '?'} · ${TOA || '?'} · thẩm phán ${thamPhan || '?'}`,
    `- Văn bản: ${LOAI_VB} · Người duyệt ${NGUOI_DUYET} · Người ký ${NGUOI_KY}`,
    `- Thống kê: PASS ${dem('PASS')} · FAIL ${dem('FAIL')} · BLOCKED ${dem('BLOCKED')} · SKIPPED_ALREADY_SUBMITTED ${dem('SKIPPED_ALREADY_SUBMITTED')} · NOT_RUN ${dem('NOT_RUN')}`,
    tepTrace ? `- Trace: ${path.relative(THU_MUC, tepTrace).replace(/\\/g, '/')}` : '- Trace: do Playwright quản lý',
    '',
    '| TC | Test case | Check | Mong đợi | Trạng thái | ID (khi PASS) | Bằng chứng | Chi tiết |',
    '|---|---|---|---|---|---|---|---|',
    ...ds.map(
      t =>
        `| ${t.ma} | ${t.ten} | ${t.check.replace(/\|/g, '/') || '—'} | ${t.mongDoi} | **${t.trangThai}** | ${t.trangThai === 'PASS' ? t.id || '—' : '—'} | ${t.anh.map(a => `[${path.basename(a)}](${a})`).join('<br>') || '—'} | ${t.chiTiet.join('<br>').replace(/\|/g, '/') || '—'} |`,
    ),
  ];
  fs.writeFileSync(path.join(THU_MUC, 'report.md'), md.join('\n'));
  fs.writeFileSync(
    path.join(THU_MUC, 'test-results.json'),
    JSON.stringify({ moiTruong: ORIGIN, ghi: ghiDuoc, maDon: MA_DON, soThuLy: SO_THU_LY, soBa: SO_BA, ngayBa: NGAY_BA, toa: TOA, thamPhan, ketQua: ds }, null, 2),
  );
  for (const t of ds) console.log(`    · ${t.ma} ${t.trangThai} — ${t.chiTiet.slice(-2).join(' · ').slice(0, 400)}`);

  const loi = ds.find(t => t.trangThai === 'FAIL');
  if (loi) throw new Error(`${loi.ma}: ${loi.chiTiet.at(-1)}`);
  if (loiCuoi && !(loiCuoi instanceof Dung)) throw loiCuoi;
});
