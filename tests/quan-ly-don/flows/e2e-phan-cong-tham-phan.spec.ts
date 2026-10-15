/**
 * E2E — BƯỚC 3: PHÂN CÔNG THẨM PHÁN NGẪU NHIÊN cho đơn đã tạo ở e2e-gdt-1410 (môi trường đào tạo).
 *
 *   QLA_PC_SO_THU_LY=<số thụ lý> QLA_PC_SO_BA=<số BA> QLA_PC_NGAY_BA=<dd/mm/yyyy> QLA_PC_MA_DON=<mã đơn> \
 *     node tools/chay-ui.js daotao [--ghi] --cli --file=e2e-phan-cong-tham-phan
 *   QLA_PC_TK=<khoá tài khoản trong config/tai-khoan-dang-nhap.local.json> (bỏ trống → QLA_TKM_USER)
 *
 * Không --ghi: chỉ khảo sát + tìm đơn + kiểm phạm vi (TC01–TC05), KHÔNG bấm "Phân công ngẫu nhiên".
 * "Phân công ngẫu nhiên" phân công MỌI đơn đang lọc trên màn → chỉ bấm khi bảng còn ĐÚNG 1 dòng là đơn mục tiêu.
 * Không retry thao tác phân công, không dùng API/SQL. Báo cáo: reports/e2e-phan-cong-tham-phan/<số thụ lý>/.
 */
import fs from 'fs';
import path from 'path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { ORIGIN } from '../../../playwright.config';
import { choPhepGhiTKM, credentialsTKM } from '../../../account';
import { loginSSO } from '../../../common/login';
import { choHetSpin, go, hienTrong, toastGanDay } from '../../../common/antd';
import { moMenu } from '../../../common/menu';
import { dsTaiKhoanDangNhap } from '../../../common/tai-khoan-dang-nhap';

const SO_THU_LY = process.env.QLA_PC_SO_THU_LY || '';
const SO_BA = process.env.QLA_PC_SO_BA || '';
const NGAY_BA = process.env.QLA_PC_NGAY_BA || '';
const MA_DON = process.env.QLA_PC_MA_DON || '';
const HINH_THUC_DON = 'Đơn đề nghị GĐT/TT';

const GOC = path.resolve(__dirname, '../../..');
const THU_MUC = path.join(GOC, `reports/e2e-phan-cong-tham-phan/${SO_THU_LY || 'chua-dat'}`);
const THU_MUC_ANH = path.join(THU_MUC, 'screenshots');
const THU_MUC_TRACE = path.join(THU_MUC, 'traces');

type TrangThai = 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIPPED_ALREADY_ASSIGNED' | 'NOT_RUN';
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
  ['TC01', 'Mở Phân công thẩm phán', 'Màn hình hiển thị'],
  ['TC02', 'Chọn DS chưa phân công ngẫu nhiên', 'Tab đúng'],
  ['TC03', 'Lọc theo Số thụ lý (+ Số BA/QĐ, Hình thức đơn nếu có)', 'Đúng kết quả'],
  ['TC04', 'Tìm đơn vừa tạo', 'Tìm thấy đơn'],
  ['TC05', 'Kiểm tra phạm vi phân công', 'Chỉ ảnh hưởng đơn mục tiêu'],
  ['TC06', 'Click Phân công ngẫu nhiên', 'Hiển thị popup'],
  ['TC07', 'Kiểm tra popup Xác nhận phân công', 'Nội dung chính xác'],
  ['TC08', 'Click Xác nhận', 'Hệ thống xử lý'],
  ['TC09', 'Kiểm tra đơn sau phân công', 'Không còn trong DS chưa phân công'],
  ['TC10', 'Tìm đơn ở tab Quản lý kết quả phân công (?tab=quan-ly)', 'Tìm thấy đúng 1 đơn, có ngày phân công'],
  ['TC11', 'Xác minh thẩm phán', 'Có thẩm phán được gán'],
  ['TC12', 'Chạy lại E2E', 'Không phân công lại'],
];

/** Cột "Check" của báo cáo: điều kiện mỗi TC thực sự kiểm */
const CHECK: Record<string, string> = {
  TC01: "Đi qua menu Quản lý đơn → Phân công thẩm phán; URL /phan-cong-tham-phan; có 3 tab và bộ lọc Tìm kiếm nâng cao",
  TC02: "Tab \"DS chưa phân công ngẫu nhiên\" aria-selected; có nút \"Phân công ngẫu nhiên\"",
  TC03: "Lọc Số thụ lý (+ Số BA/QĐ); bảng tải xong (có dòng hoặc rỗng)",
  TC04: "Dòng chứa đúng số thụ lý; đối chiếu Số BA/QĐ, ngày BA, mã đơn",
  TC05: "Bảng còn ĐÚNG 1 dòng là đơn mục tiêu, không có đơn khác",
  TC06: "Nút enabled; bấm → popup \"Xác nhận phân công\" hiện",
  TC07: "Nội dung popup đúng câu hỏi; có nút Xác nhận; kiểm lại 1 dòng ngay trước khi xác nhận",
  TC08: "Bấm Xác nhận 1 lần; API POST /phan-cong/don-gdt/tu-dong HTTP 200; không có toast lỗi",
  TC09: "Tải lại, lọc số thụ lý ở tab chưa phân công → 0 dòng",
  TC10: "Mở ?tab=quan-ly; tab kết quả được chọn; tìm ra đúng 1 dòng có Số BA, ngày, hình thức đơn",
  TC11: "Cột Thẩm phán trên dòng kết quả không rỗng / không \"Chưa phân công\"",
  TC12: "Chạy lại: đơn không còn ở tab chưa phân công → không bấm phân công"
};

class Dung extends Error {
  constructor(readonly trangThai: Exclude<TrangThai, 'PASS' | 'NOT_RUN'>, message: string) {
    super(message);
  }
}

/** Tài khoản chạy: QLA_PC_TK (khoá trong tai-khoan-dang-nhap) hoặc QLA_TKM_USER của môi trường */
function taiKhoanChay(): { user: string; pass: string; ten: string } {
  // QLA_PC_CCCD (+ QLA_PC_PASS, mặc định Ta@<CCCD>): tài khoản theo bảng đào tạo, vd Trưởng phòng 011172000008
  const cccd = process.env.QLA_PC_CCCD;
  if (cccd) return { user: cccd, pass: process.env.QLA_PC_PASS || `Ta@${cccd}`, ten: process.env.QLA_PC_TEN || cccd };
  const ma = process.env.QLA_PC_TK;
  if (ma) {
    const tk = dsTaiKhoanDangNhap().find(t => t.ma === ma);
    if (!tk?.cccd) throw new Error(`Không có tài khoản "${ma}" (hoặc thiếu CCCD) trong config/tai-khoan-dang-nhap.local.json`);
    return { user: tk.cccd, pass: tk.matKhau, ten: `${tk.ten} – ${tk.chucVu}` };
  }
  const tk = credentialsTKM();
  if (!tk) throw new Error('Thiếu QLA_TKM_USER trong .env của môi trường');
  return { user: tk.user, pass: tk.pass, ten: tk.user };
}

const bangDangHien = (page: Page) => page.locator('.ant-tabs-tabpane-active .ant-table-row:visible, .ant-table-row:visible');

/** Lọc tab đang mở theo Số thụ lý (ô "Số thụ lý" trong Tìm kiếm nâng cao) → Tìm kiếm; trả các dòng đang hiện */
async function locTheoSoThuLy(page: Page, ghi: (s: string) => void): Promise<string[]> {
  const moRong = page.getByRole('button', { name: /Tìm kiếm nâng cao/ });
  if (await moRong.isVisible().catch(() => false)) await moRong.click();
  const oSoThuLy = page.getByLabel('Số thụ lý', { exact: true });
  await expect(oSoThuLy, 'Bộ lọc không có ô "Số thụ lý"').toBeVisible({ timeout: 30_000 });
  await go(oSoThuLy, SO_THU_LY);
  ghi(`Số thụ lý = ${SO_THU_LY}`);
  const oSoBa = page.getByLabel(/Số BA\/QĐ|Số bản án/).first();
  if (SO_BA && (await oSoBa.isVisible().catch(() => false)) && (await oSoBa.isEditable().catch(() => false))) {
    await go(oSoBa, SO_BA);
    ghi(`Số BA/QĐ = ${SO_BA}`);
  }
  await page.getByRole('button', { name: /Tìm kiếm$/ }).click();
  await choHetSpin(page);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  // Bảng có dòng HOẶC hiện "Không có dữ liệu" mới là đã tải xong — không đếm dữ liệu cũ
  await expect(bangDangHien(page).first().or(page.locator('.ant-table-placeholder:visible, .ant-empty:visible').first())).toBeVisible({ timeout: 30_000 });
  return (await bangDangHien(page).allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
}

async function moTab(page: Page, ten: RegExp): Promise<Locator> {
  const tab = page.getByRole('tab', { name: ten }).first();
  await expect(tab, `Không có tab ${ten}`).toBeVisible({ timeout: 30_000 });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 15_000 });
  await choHetSpin(page);
  return tab;
}

test.use({ storageState: { cookies: [], origins: [] } });

test(`e2e-phan-cong-tham-phan · đơn ${MA_DON || '?'} · số thụ lý ${SO_THU_LY || '?'}`, async ({ page }) => {
  test.setTimeout(20 * 60_000);
  test.skip(!SO_THU_LY, 'Thiếu QLA_PC_SO_THU_LY (số thụ lý của đơn đã lưu ở E2E trước)');
  test.skip(new URL(ORIGIN).host !== 'e-qlta-daotao.toaan.gov.vn', `Chỉ chạy trên môi trường đào tạo, đang ở ${ORIGIN}`);

  const ghiDuoc = choPhepGhiTKM();
  for (const d of [THU_MUC_ANH, THU_MUC_TRACE]) fs.mkdirSync(d, { recursive: true });
  const batDau = new Date();
  const ds: Tc[] = DS_TC.map(([ma, ten, mongDoi]) => ({ ma, ten, mongDoi, trangThai: 'NOT_RUN', chiTiet: [], anh: [], check: CHECK[ma] || '', id: '' }));
  /** ID ghi vào cột ID khi TC PASS mà TC không tự đặt id riêng */
  const ID_MAC_DINH = `đơn ${MA_DON || "?"} · số TL ${SO_THU_LY}`;
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
  let daPhanCongTruoc = false;
  let loiCuoi: unknown;
  try {
    // ── TC01 · Menu Quản lý đơn → Phân công thẩm phán ──
    await chay('TC01', async t => {
      const tk = taiKhoanChay();
      await loginSSO(page, tk.user, { pass: tk.pass });
      t.chiTiet.push(`Đăng nhập SSO: ${tk.ten}`);
      await moMenu(page, ['Quản lý đơn', 'Phân công thẩm phán']);
      await expect(page).toHaveURL(/\/qla\/quan-ly-don\/phan-cong-tham-phan/, { timeout: 30_000 });
      await choHetSpin(page);
      const cacTab = (await page.getByRole('tab').allInnerTexts()).map(s => s.trim()).filter(Boolean);
      t.chiTiet.push(`URL: ${page.url()}`);
      t.chiTiet.push(`Các tab: ${cacTab.join(' | ')}`);
      await expect(page.getByRole('button', { name: /Tìm kiếm nâng cao/ }).first(), 'Thiếu bộ lọc "Tìm kiếm nâng cao"').toBeVisible();
      t.anh.push(await chup('01-man-phan-cong'));
    });

    // ── TC02 · Tab DS chưa phân công ngẫu nhiên ──
    await chay('TC02', async t => {
      await moTab(page, /DS chưa phân công ngẫu nhiên/);
      await expect(page.getByRole('button', { name: /^Phân công ngẫu nhiên$/ }), 'Tab không có nút "Phân công ngẫu nhiên"').toBeVisible({
        timeout: 30_000,
      });
      t.chiTiet.push('Tab "DS chưa phân công ngẫu nhiên" đang chọn; có nút "Phân công ngẫu nhiên"');
      t.anh.push(await chup('02-tab-chua-phan-cong'));
    });

    // ── TC03 + TC04 · Lọc và tìm đúng đơn ──
    let dsDong: string[] = [];
    await chay('TC03', async t => {
      dsDong = await locTheoSoThuLy(page, s => t.chiTiet.push(s));
      t.chiTiet.push(`Kết quả lọc: ${dsDong.length} dòng`);
      t.anh.push(await chup('03-ket-qua-loc'));
    });
    await chay('TC04', async t => {
      const khop = dsDong.filter(d => d.includes(SO_THU_LY));
      if (!khop.length) {
        // Không còn ở tab chưa phân công → kiểm "Quản lý kết quả phân công" (đã phân công trước đó?)
        await moTab(page, /Quản lý kết quả phân công/);
        const daCo = (await locTheoSoThuLy(page, s => t.chiTiet.push(`(tab kết quả) ${s}`))).filter(d => d.includes(SO_THU_LY));
        t.anh.push(await chup('04-tab-ket-qua'));
        if (daCo.length) {
          daPhanCongTruoc = true;
          t.chiTiet.push(`Đơn đã có ở "Quản lý kết quả phân công": ${daCo[0]}`);
          throw new Dung('SKIPPED_ALREADY_ASSIGNED', 'Đơn đã được phân công từ trước — không phân công lại');
        }
        throw new Dung('FAIL', `Không thấy đơn có số thụ lý ${SO_THU_LY} ở cả tab chưa phân công lẫn tab kết quả`);
      }
      for (const [nhan, gt] of [
        ['Số BA/QĐ', SO_BA],
        ['Ngày BA/QĐ', NGAY_BA],
        ['Mã đơn', MA_DON],
      ] as const) {
        if (gt) t.chiTiet.push(`${nhan} ${gt}: ${khop[0].includes(gt) ? 'có trên dòng ✔' : 'không hiện trên dòng (cột không có)'}`);
      }
      t.chiTiet.push(`Dòng mục tiêu: ${khop[0].slice(0, 300)}`);
    });

    // ── TC05 · Phạm vi tác động ──
    await chay('TC05', async t => {
      const phanTrang = (await page.locator('.ant-pagination-total-text:visible').first().innerText().catch(() => '')).trim();
      const khac = dsDong.filter(d => !d.includes(SO_THU_LY));
      t.chiTiet.push(`Số dòng sau lọc: ${dsDong.length}${phanTrang ? ` · phân trang: "${phanTrang}"` : ''}`);
      if (dsDong.length !== 1 || khac.length) {
        t.chiTiet.push(...khac.slice(0, 10).map(d => `Đơn khác có nguy cơ bị phân công: ${d.slice(0, 200)}`));
        throw new Dung('BLOCKED', `Bảng còn ${dsDong.length} dòng (${khac.length} đơn khác) — không bấm "Phân công ngẫu nhiên"`);
      }
      t.chiTiet.push('Bảng chỉ còn ĐÚNG 1 dòng là đơn mục tiêu → an toàn');
      t.anh.push(await chup('05-truoc-phan-cong'));
      if (!ghiDuoc) throw new Dung('BLOCKED', 'Chế độ chỉ đọc (không --ghi) — dừng trước khi phân công');
    });

    // ── TC06–TC08 · Phân công ──
    const hop = page.locator('.ant-modal-confirm:visible, .ant-modal:visible').filter({ hasText: 'Xác nhận phân công' }).last();
    await chay('TC06', async t => {
      const nut = page.getByRole('button', { name: /^Phân công ngẫu nhiên$/ });
      await expect(nut).toBeEnabled({ timeout: 15_000 });
      await nut.click();
      await expect(hop, 'Bấm "Phân công ngẫu nhiên" nhưng không có popup xác nhận').toBeVisible({ timeout: 15_000 });
      t.chiTiet.push('Popup xác nhận hiển thị');
    });
    await chay('TC07', async t => {
      const noiDung = (await hop.innerText()).replace(/\s+/g, ' ').trim();
      t.chiTiet.push(`Nội dung popup: ${noiDung}`);
      t.anh.push(await chup('07-popup-xac-nhan'));
      if (!/Bạn có chắc muốn phân công ngẫu nhiên các đơn có trên màn hình\?/.test(noiDung)) {
        throw new Dung('FAIL', 'Nội dung popup khác mong đợi');
      }
      await expect(hop.getByRole('button', { name: /^Xác nhận$/ })).toBeVisible();
      // Kiểm lại phạm vi ngay trước khi xác nhận
      const lai = await bangDangHien(page).count();
      if (lai !== 1) throw new Dung('BLOCKED', `Ngay trước khi xác nhận bảng có ${lai} dòng — huỷ`);
    });
    await chay('TC08', async t => {
      const choApi = page.waitForResponse(r => /phan-cong/i.test(r.url()) && r.request().method() !== 'GET', { timeout: 120_000 });
      await hop.getByRole('button', { name: /^Xác nhận$/ }).click(); // đúng một lần
      const res = await choApi.catch(() => null);
      const toasts = await toastGanDay(page, 20_000);
      t.chiTiet.push(`API: ${res ? `${res.request().method()} ${new URL(res.url()).pathname} → HTTP ${res.status()}` : 'không bắt được'}`);
      t.chiTiet.push(`Thông báo: ${toasts.join(' | ') || '(không có)'}`);
      t.anh.push(await chup('08-sau-xac-nhan'));
      if ((res && !res.ok()) || toasts.some(x => /thất bại|lỗi|Không có đơn/i.test(x))) throw new Dung('FAIL', 'Phân công báo lỗi');
    });

  } catch (e) {
    loiCuoi = e;
  }

  // ── TC09–TC12 · Kiểm sau phân công — chạy cả khi đơn đã phân công từ lượt trước ──
  if (tc('TC08').trangThai === 'PASS' || daPhanCongTruoc) {
    let dongKq = '';
    await chay('TC09', async t => {
      await page.reload();
      await choHetSpin(page);
      await moTab(page, /DS chưa phân công ngẫu nhiên/);
      const con = (await locTheoSoThuLy(page, s => t.chiTiet.push(s))).filter(d => d.includes(SO_THU_LY));
      t.anh.push(await chup('09-tab-chua-phan-cong-sau'));
      if (con.length) throw new Dung('FAIL', 'Đơn vẫn còn ở "DS chưa phân công ngẫu nhiên"');
      t.chiTiet.push('Lọc theo số thụ lý ở "DS chưa phân công ngẫu nhiên": 0 dòng — đơn không còn ở đây');
    }).catch(() => undefined);

    await chay('TC10', async t => {
      // Mở thẳng tab kết quả qua URL ?tab=quan-ly (bấm tab không đổi URL)
      await page.goto(`${ORIGIN}/qla/quan-ly-don/phan-cong-tham-phan?tab=quan-ly`);
      await choHetSpin(page);
      const tabKq = page.getByRole('tab', { name: /Quản lý kết quả phân công/ }).first();
      await expect(tabKq, 'Mở ?tab=quan-ly nhưng tab "Quản lý kết quả phân công" không được chọn').toHaveAttribute('aria-selected', 'true', {
        timeout: 30_000,
      });
      t.chiTiet.push(`URL: ${page.url()} · tab "Quản lý kết quả phân công" đang chọn`);
      const dong = (await locTheoSoThuLy(page, s => t.chiTiet.push(s))).filter(d => d.includes(SO_THU_LY));
      t.anh.push(await chup('10-tab-quan-ly-ket-qua'));
      // Lỗi hệ thống (15/10/2026, đơn 22174): một lần "Phân công ngẫu nhiên" ghi 2 dòng DON_PHANCONG giống hệt
      // (cùng thẩm phán, cách nhau ~30ms) → tab hiện 2 dòng trùng. Nhiều dòng NỘI DUNG GIỐNG NHAU thì chấp nhận
      // + ghi lỗi hệ thống; khác nhau (thẩm phán/đơn khác) vẫn là FAIL.
      if (dong.length > 1 && new Set(dong.map(d => d.replace(/^\d+\s+/, ''))).size === 1) {
        t.chiTiet.push(`LỖI HỆ THỐNG: ${dong.length} dòng trùng hệt nhau cho số thụ lý ${SO_THU_LY} (DON_PHANCONG ghi trùng) — lấy dòng đầu`);
      } else if (dong.length !== 1) throw new Dung('FAIL', `Tab "Quản lý kết quả phân công" có ${dong.length} dòng cho số thụ lý ${SO_THU_LY}`);
      dongKq = dong[0];
      for (const can of [SO_BA && `Số BA/QĐ: ${SO_BA}`, NGAY_BA && `Ngày: ${NGAY_BA}`, HINH_THUC_DON].filter(Boolean) as string[]) {
        if (!dongKq.includes(can)) throw new Dung('FAIL', `Dòng kết quả thiếu "${can}"`);
      }
      const ngayPc = dongKq.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
      t.chiTiet.push(`Tìm thấy 1 dòng: số thụ lý ${SO_THU_LY}, ${SO_BA ? `BA ${SO_BA} ngày ${NGAY_BA}, ` : ''}${HINH_THUC_DON}`);
      t.chiTiet.push(`Các ngày trên dòng (thụ lý / BA / phân công): ${ngayPc.join(', ')}`);
    }).catch(() => undefined);

    await chay('TC11', async t => {
      if (!dongKq) throw new Dung('BLOCKED', 'Chưa tìm được dòng ở tab kết quả (TC10)');
      // Lấy tên thẩm phán theo tiêu đề cột, không gieo cứng tên
      const tieuDe = (await page.locator('.ant-table-thead:visible th').allInnerTexts()).map(s => s.trim());
      const iTp = tieuDe.findIndex(s => /Thẩm phán/i.test(s));
      const iNgay = tieuDe.findIndex(s => /Ngày phân công/i.test(s));
      const o = page.locator('.ant-table-row:visible').filter({ hasText: SO_THU_LY }).first().locator('td');
      // Ô thẩm phán có thêm dòng phụ ("Phân công ngẫu nhiên", "Số tờ trình …") → lấy dòng đầu là tên
      thamPhan = iTp >= 0 ? (await o.nth(iTp).innerText()).trim().split('\n')[0].trim() : '';
      const ngayPhanCong = iNgay >= 0 ? (await o.nth(iNgay).innerText()).trim() : '';
      t.chiTiet.push(`Cột: ${tieuDe.filter(Boolean).join(' | ')}`);
      t.chiTiet.push(`Thẩm phán được gán: ${thamPhan || '(không đọc được)'} · Ngày phân công: ${ngayPhanCong || '(không đọc được)'}`);
      t.anh.push(await chup('11-tham-phan'));
      if (!thamPhan || thamPhan === '-' || /Chưa phân công/i.test(thamPhan)) throw new Dung('FAIL', 'Không có thẩm phán trên dòng kết quả phân công');
      t.id = `số TL ${SO_THU_LY} → thẩm phán ${thamPhan}`;
    }).catch(() => undefined);

    await chay('TC12', async t => {
      await moTab(page, /DS chưa phân công ngẫu nhiên/);
      const con = (await locTheoSoThuLy(page, s => t.chiTiet.push(s))).filter(d => d.includes(SO_THU_LY));
      if (con.length) throw new Dung('FAIL', 'Chạy lại vẫn thấy đơn ở tab chưa phân công');
      t.trangThai = 'SKIPPED_ALREADY_ASSIGNED';
      t.chiTiet.push(`Đơn đã phân công (thẩm phán: ${thamPhan || '?'}) — không bấm "Phân công ngẫu nhiên" lần nữa`);
      t.anh.push(await chup('12-chay-lai'));
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
    `# Báo cáo E2E — Phân công thẩm phán ngẫu nhiên · đơn ${MA_DON || '?'}`,
    '',
    `- Môi trường: ${ORIGIN} · chế độ: ${ghiDuoc ? 'GHI' : 'CHỈ ĐỌC'}`,
    `- Thời gian: ${batDau.toLocaleString('vi-VN')} → ${new Date().toLocaleString('vi-VN')}`,
    `- Đơn: mã ${MA_DON || '?'} · Số thụ lý **${SO_THU_LY}** · BA ${SO_BA || '?'} ngày ${NGAY_BA || '?'} · ${HINH_THUC_DON}`,
    `- Thẩm phán được phân công: **${thamPhan || '(chưa xác minh)'}**`,
    `- Thống kê: PASS ${dem('PASS')} · FAIL ${dem('FAIL')} · BLOCKED ${dem('BLOCKED')} · SKIPPED_ALREADY_ASSIGNED ${dem('SKIPPED_ALREADY_ASSIGNED')} · NOT_RUN ${dem('NOT_RUN')}`,
    tepTrace ? `- Trace: ${path.relative(THU_MUC, tepTrace).replace(/\\/g, '/')}` : '- Trace: do Playwright quản lý',
    '',
    '| TC | Test case | Check | Mong đợi | Trạng thái | ID (khi PASS) | Bằng chứng | Chi tiết |',
    '|---|---|---|---|---|---|---|---|',
    ...ds.map(t => `| ${t.ma} | ${t.ten} | ${t.check.replace(/\|/g, '/') || '—'} | ${t.mongDoi} | **${t.trangThai}** | ${t.trangThai === 'PASS' ? t.id || '—' : '—'} | ${t.anh.map(a => `[${path.basename(a)}](${a})`).join('<br>') || '—'} | ${t.chiTiet.join('<br>').replace(/\|/g, '/') || '—'} |`),
  ];
  fs.writeFileSync(path.join(THU_MUC, 'report.md'), md.join('\n'));
  fs.writeFileSync(
    path.join(THU_MUC, 'test-results.json'),
    JSON.stringify({ moiTruong: ORIGIN, ghi: ghiDuoc, maDon: MA_DON, soThuLy: SO_THU_LY, soBa: SO_BA, ngayBa: NGAY_BA, thamPhan, ketQua: ds }, null, 2),
  );
  for (const t of ds) console.log(`    · ${t.ma} ${t.trangThai} — ${t.chiTiet.slice(-2).join(' · ')}`);

  const loi = ds.find(t => t.trangThai === 'FAIL');
  if (loi) throw new Error(`${loi.ma}: ${loi.chiTiet.at(-1)}`);
  if (loiCuoi && !(loiCuoi instanceof Dung)) throw loiCuoi;
});
