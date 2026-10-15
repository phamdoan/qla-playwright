/**
 * E2E — Nhóm 5: Hồ sơ kháng nghị ĐẾN (môi trường đào tạo).
 * Thư ký Vụ nhập HSKN đến bằng "Thêm mới HSKN" (Quản lý hồ sơ giao nhận → Kháng nghị → Đến) theo một bản án có thật,
 * tra cứu bản án để điền đương sự, lưu; rồi tìm lại ở danh sách "Hồ sơ kháng nghị đến" theo Số BA/QĐ.
 * Không sinh đơn/vụ án (POST /ho-so-khang-nghi/den/tao-moi chỉ tạo HOSO_KHANGNGHI_DEN, trạng thái Đã tiếp nhận).
 *
 *   QLA_HSKN_CCCD=<cccd> QLA_HSKN_SO_BA=.. QLA_HSKN_NGAY_BA=dd/mm/yyyy QLA_HSKN_TOA="Tòa án nhân dân .." \
 *   QLA_HSKN_LOAI_AN="Hình sự" QLA_HSKN_SO_KN="12/2026/KN-HS" node tools/chay-ui.js daotao --ghi --cli --file=e2e-hskn-den
 * Báo cáo: reports/e2e-hskn-den/<số BA>-<ngày>/.
 */
import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import { ORIGIN } from '../../../playwright.config';
import { loginSSO } from '../../../common/login';
import { choPhepGhiTKM } from '../../../account';
import { choHetSpin, chonNgay, chonSelect, go } from '../../../common/antd';

const e = process.env;
const CCCD = e.QLA_HSKN_CCCD || '';
const TEN_TK = e.QLA_HSKN_TEN || CCCD;
const SO_BA = e.QLA_HSKN_SO_BA || '';
const NGAY_BA = e.QLA_HSKN_NGAY_BA || '';
const TOA = e.QLA_HSKN_TOA || '';
const LOAI_AN = e.QLA_HSKN_LOAI_AN || 'Hình sự';
const SO_KN = e.QLA_HSKN_SO_KN || '';
const CAP = e.QLA_HSKN_CAP || '';
const GHI = choPhepGhiTKM();

const h = new Date();
const HOM_NAY = `${String(h.getDate()).padStart(2, '0')}/${String(h.getMonth() + 1).padStart(2, '0')}/${h.getFullYear()}`;
const THU_MUC = path.resolve(__dirname, '../../../reports/e2e-hskn-den', `${SO_BA.replace(/[^\w-]+/g, '_')}-${NGAY_BA.replace(/\//g, '')}`);
const THU_MUC_ANH = path.join(THU_MUC, 'screenshots');

type TrangThai = 'PASS' | 'FAIL' | 'NOT_RUN';
interface Tc { ma: string; ten: string; check: string; trangThai: TrangThai; id: string; chiTiet: string[]; anh: string[] }
const DS_TC: [string, string, string][] = [
  ['TC01', `Đăng nhập ${TEN_TK}`, 'Đăng nhập SSO thành công'],
  ['TC02', 'Mở Hồ sơ kháng nghị đến → "Thêm mới HSKN"', 'Có nút, vào form Thêm mới'],
  ['TC03', `Nhập bản án ${SO_BA} ngày ${NGAY_BA} + tra cứu`, 'Loại án, Số/Ngày/Tòa ra bản án; tra cứu bản án cũ'],
  ['TC04', `Nhập QĐKN ${SO_KN} ngày ${HOM_NAY}`, 'Số/Ngày QĐKN, Người kháng nghị, nội dung'],
  ['TC05', 'Lưu thông tin', 'Thông báo thành công'],
  ['TC06', 'Tìm lại ở "Hồ sơ kháng nghị đến"', `Đúng 1 dòng có Số BA ${SO_BA} và số KN ${SO_KN}`],
];

test.use({ storageState: { cookies: [], origins: [] } });

test(`e2e-hskn-den · BA ${SO_BA || '?'} · KN ${SO_KN || '?'}`, async ({ page }) => {
  test.setTimeout(15 * 60_000);
  test.skip(!CCCD || !SO_BA || !NGAY_BA || !TOA || !SO_KN, 'Thiếu QLA_HSKN_CCCD / SO_BA / NGAY_BA / TOA / SO_KN');
  test.skip(new URL(ORIGIN).host !== 'e-qlta-daotao.toaan.gov.vn', `Chỉ chạy trên đào tạo, đang ở ${ORIGIN}`);
  fs.mkdirSync(THU_MUC_ANH, { recursive: true });
  const ds: Tc[] = DS_TC.map(([ma, ten, check]) => ({ ma, ten, check, trangThai: 'NOT_RUN', id: '', chiTiet: [], anh: [] }));
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
        t.trangThai = 'PASS';
      } catch (err) {
        t.trangThai = 'FAIL';
        t.chiTiet.push(err instanceof Error ? err.message.split('\n')[0] : String(err));
        t.anh.push(await chup(`${ma}-loi`));
        throw err;
      }
    });
  };
  const DS_URL = `${ORIGIN}/qla/vu-an/gdt-tt/quan-ly-ho-so-giao-nhan/danh-sach?nhom=khangNghi&chieu=den`;

  try {
    await chay('TC01', async t => {
      await loginSSO(page, CCCD, { pass: e.QLA_HSKN_PASS || `Ta@${CCCD}` });
      t.id = CCCD;
    });
    await chay('TC02', async t => {
      await page.goto(DS_URL);
      await choHetSpin(page);
      const nut = page.getByRole('button', { name: /Thêm mới HSKN/ }).first();
      await expect(nut).toBeVisible({ timeout: 30_000 });
      await nut.click();
      await expect(page).toHaveURL(/ho-so-khang-nghi\/them-moi-den/, { timeout: 30_000 });
      await choHetSpin(page);
      await expect(page.getByRole('button', { name: /Lưu thông tin/ })).toBeVisible({ timeout: 30_000 });
      t.anh.push(await chup('02-form-them-moi'));
    });
    await chay('TC03', async t => {
      t.chiTiet.push(`Loại án = ${await chonSelect(page, page.locator('#loaiAn'), LOAI_AN)}`);
      await go(page.locator('#soBanAnQD'), SO_BA);
      await chonNgay(page.locator('#ngayBanAnQD'), NGAY_BA);
      // Tòa cấp tỉnh là NÚT CHA (dưới có tòa khu vực) — chonTreeSelect chỉ lấy lá nên chọn nhầm tòa khu vực
      // (đo 15/10/2026: "tỉnh Cà Mau" → "khu vực 1 - Cà Mau") → bấm đúng nút có tiêu đề trùng khớp
      const oToa = page.locator('#maToaRaBanAn');
      await oToa.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]').click();
      await oToa.fill(TOA);
      const nutToa = page
        .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-tree-title')
        .filter({ hasText: new RegExp(`^${TOA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })
        .first();
      await expect(nutToa, `Không có tòa "${TOA}" trong cây`).toBeVisible({ timeout: 30_000 });
      await nutToa.click();
      const daChonToa = (await page.locator('.ant-form-item').filter({ has: oToa }).locator('.ant-select-selection-item').first().innerText()).trim();
      if (daChonToa !== TOA) throw new Error(`Tòa sau khi chọn là "${daChonToa}", cần "${TOA}"`);
      t.chiTiet.push(`Tòa = ${daChonToa}`);
      const oCap = page.locator('#capXetXu');
      if (CAP && (await oCap.isVisible().catch(() => false))) t.chiTiet.push(`Cấp xét xử = ${await chonSelect(page, oCap, CAP)}`);
      const traCuu = page.locator('.qla-them-moi-hskn-search-btn-item button').first();
      if (await traCuu.isVisible().catch(() => false)) {
        const ketQua = page.waitForResponse(r => /tra-cuu-ban-an/.test(r.url()), { timeout: 60_000 }).catch(() => null);
        await traCuu.click();
        const r = await ketQua;
        await choHetSpin(page);
        t.chiTiet.push(`Tra cứu bản án: ${r ? `HTTP ${r.status()}` : 'không thấy phản hồi'}`);
      }
      t.anh.push(await chup('03-ban-an'));
    });
    await chay('TC04', async t => {
      await go(page.locator('#soKhangNghi'), SO_KN);
      await chonNgay(page.locator('#ngayKhangNghi'), HOM_NAY);
      // Người kháng nghị: ưu tiên Chánh án TANDTC (thẩm quyền KN GĐT với bản án tòa cấp tỉnh/khu vực)
      const oNguoi = page.locator('#maNguoiKhangNghi');
      let nguoi = '';
      try {
        nguoi = await chonSelect(page, oNguoi, /Chánh án Tòa án nhân dân tối cao/);
      } catch {
        nguoi = await chonSelect(page, oNguoi);
      }
      t.chiTiet.push(`Người kháng nghị = ${nguoi}`);
      const noiDung = page.locator('#noiDungDon');
      if (await noiDung.isVisible().catch(() => false)) {
        await go(
          noiDung,
          `Kháng nghị theo thủ tục giám đốc thẩm đối với Bản án số ${SO_BA} ngày ${NGAY_BA} của ${TOA}; đề nghị hủy bản án để xét xử lại theo quy định của pháp luật.`,
        );
      }
      t.anh.push(await chup('04-qdkn'));
    });
    await chay('TC05', async t => {
      if (!GHI) throw new Error('Chưa bật ghi (--ghi): không bấm Lưu');
      const phanHoi = page.waitForResponse(r => /ho-so-khang-nghi\/den\/tao-moi/.test(r.url()) && r.request().method() === 'POST', { timeout: 60_000 });
      await page.getByRole('button', { name: /Lưu thông tin/ }).click();
      const r = await phanHoi;
      const than = await r.text().catch(() => '');
      t.chiTiet.push(`POST tao-moi: HTTP ${r.status()} ${than.slice(0, 300)}`);
      if (!r.ok()) throw new Error(`Lưu HSKN lỗi HTTP ${r.status()}: ${than.slice(0, 300)}`);
      const id = /"id"\s*:\s*"([^"]+)"/.exec(than)?.[1] || '';
      t.id = id ? `HSKN ${id}` : `KN ${SO_KN}`;
      await choHetSpin(page);
      t.anh.push(await chup('05-sau-luu'));
    });
    await chay('TC06', async t => {
      await page.goto(DS_URL);
      await choHetSpin(page);
      const oSo = page.locator('#soBAQD');
      if (!(await oSo.isVisible().catch(() => false))) await page.getByText(/Nâng cao/).first().click().catch(() => {});
      await go(page.locator('#soBAQD'), SO_BA);
      await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
      await choHetSpin(page);
      await expect(page.locator('.ant-table-wrapper .ant-spin-spinning')).toHaveCount(0, { timeout: 90_000 });
      await expect(
        page.locator('.ant-table-row:visible').first().or(page.locator('.ant-table-placeholder:visible, .ant-empty:visible').first()),
      ).toBeVisible({ timeout: 30_000 });
      const dong = (await page.locator('.ant-table-row:visible').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
      const khop = dong.filter(d => d.includes(SO_KN));
      t.chiTiet.push(`Lọc Số BA/QĐ = ${SO_BA}: ${dong.length} dòng; có số KN ${SO_KN}: ${khop.length}`);
      t.anh.push(await chup('06-ket-qua-tim-kiem'));
      if (khop.length !== 1) throw new Error(`Hồ sơ kháng nghị đến: ${khop.length} dòng có số KN ${SO_KN} (cần đúng 1)`);
      t.chiTiet.push(`Dòng: ${khop[0].slice(0, 400)}`);
      t.id = `KN ${SO_KN}`;
    });
  } catch {
    /* ghi báo cáo bên dưới */
  }

  fs.writeFileSync(path.join(THU_MUC, 'test-results.json'), JSON.stringify({ ORIGIN, tk: TEN_TK, soBa: SO_BA, ngayBa: NGAY_BA, toa: TOA, soKn: SO_KN, ketQua: ds }, null, 2));
  fs.writeFileSync(
    path.join(THU_MUC, 'report.md'),
    [
      `# Hồ sơ kháng nghị đến · BA ${SO_BA} ngày ${NGAY_BA} · ${TOA} · KN ${SO_KN}`,
      '',
      '| TC | Test case | Check | Trạng thái | ID (khi PASS) | Bằng chứng | Chi tiết |',
      '|---|---|---|---|---|---|---|',
      ...ds.map(t => `| ${t.ma} | ${t.ten} | ${t.check} | **${t.trangThai}** | ${t.trangThai === 'PASS' ? t.id || '—' : '—'} | ${t.anh.map(a => `[${path.basename(a)}](${a})`).join('<br>') || '—'} | ${t.chiTiet.join('<br>').replace(/\|/g, '/') || '—'} |`),
    ].join('\n'),
  );
  for (const t of ds) console.log(`    · ${t.ma} ${t.trangThai} — ${t.chiTiet.slice(-2).join(' · ').slice(0, 450)}`);
  const loi = ds.find(t => t.trangThai === 'FAIL');
  if (loi) throw new Error(`${loi.ma}: ${loi.chiTiet.at(-1)}`);
});
