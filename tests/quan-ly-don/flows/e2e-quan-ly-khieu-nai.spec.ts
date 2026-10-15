/**
 * E2E — Đơn khiếu nại tố cáo trong tố tụng: kiểm vụ khiếu nại xuất hiện ở "Quản lý khiếu nại" (môi trường đào tạo).
 * Chỉ ĐỌC: lọc Số BA/QĐ, tìm dòng có số thụ lý của đơn; không thấy là lỗi.
 * Danh sách đọc VU_AN (GIAI_DOAN=GIAI_QUYET_DON, LOAI_VU_GIAI_QUYET=VU_KHIEU_NAI) — vụ chỉ sinh khi Vụ đã nhận đơn.
 *
 *   QLA_KN_CCCD=<CCCD> QLA_KN_MA_DON=<mã đơn> QLA_KN_SO_BA=<số BA> QLA_KN_SO_THU_LY=<số TL> \
 *     node tools/chay-ui.js daotao --cli --file=e2e-quan-ly-khieu-nai
 * Báo cáo: reports/e2e-quan-ly-khieu-nai/<mã đơn>/.
 */
import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import { ORIGIN } from '../../../playwright.config';
import { loginSSO } from '../../../common/login';
import { choHetSpin, go } from '../../../common/antd';

const CCCD = process.env.QLA_KN_CCCD || '';
const PASS = process.env.QLA_KN_PASS || `Ta@${CCCD}`;
const TEN_TK = process.env.QLA_KN_TEN || CCCD;
const MA_DON = process.env.QLA_KN_MA_DON || '';
const SO_BA = process.env.QLA_KN_SO_BA || '';
const SO_THU_LY = process.env.QLA_KN_SO_THU_LY || '';
/** QLA_KN_MAN=don-an-giam: kiểm màn Đơn ân giảm (nhóm án tử hình) thay cho Quản lý khiếu nại */
const MAN = process.env.QLA_KN_MAN === 'don-an-giam'
  ? { ten: 'Đơn ân giảm', duongDan: '/vu-an/gdt-tt/an-tu-hinh/don-an-giam/danh-sach', oTim: '#soBanAnQd', thuMuc: 'e2e-don-an-giam' }
  : { ten: 'Quản lý khiếu nại', duongDan: '/vu-an/gdt-tt/quan-ly-khieu-nai/danh-sach?trangThai=TAT_CA', oTim: '#soBanAnQD', thuMuc: 'e2e-quan-ly-khieu-nai' };

const GOC = path.resolve(__dirname, '../../..');
const THU_MUC = path.join(GOC, `reports/${MAN.thuMuc}/${MA_DON || 'chua-dat'}`);
const THU_MUC_ANH = path.join(THU_MUC, 'screenshots');

type TrangThai = 'PASS' | 'FAIL' | 'NOT_RUN';
interface Tc {
  ma: string;
  ten: string;
  check: string;
  trangThai: TrangThai;
  id: string;
  chiTiet: string[];
  anh: string[];
}
const DS_TC: [string, string, string][] = [
  ['TC01', `Đăng nhập ${TEN_TK}`, 'Đăng nhập SSO thành công'],
  ['TC02', `Mở ${MAN.ten}`, `URL ${MAN.duongDan}`],
  ['TC03', `Tìm Số BA/QĐ ${SO_BA}`, `Có dòng chứa số thụ lý ${SO_THU_LY}`],
];

test.use({ storageState: { cookies: [], origins: [] } });

test(`e2e-quan-ly-khieu-nai · đơn ${MA_DON || '?'} · BA ${SO_BA || '?'}`, async ({ page }) => {
  test.setTimeout(10 * 60_000);
  test.skip(!CCCD || !MA_DON || !SO_BA || !SO_THU_LY, 'Thiếu QLA_KN_CCCD / QLA_KN_MA_DON / QLA_KN_SO_BA / QLA_KN_SO_THU_LY');
  test.skip(new URL(ORIGIN).host !== 'e-qlta-daotao.toaan.gov.vn', `Chỉ chạy trên môi trường đào tạo, đang ở ${ORIGIN}`);
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
      } catch (e) {
        t.trangThai = 'FAIL';
        t.chiTiet.push(e instanceof Error ? e.message.split('\n')[0] : String(e));
        t.anh.push(await chup(`${ma}-loi`));
        throw e;
      }
    });
  };

  try {
    await chay('TC01', async t => {
      await loginSSO(page, CCCD, { pass: PASS });
      t.id = CCCD;
    });
    await chay('TC02', async t => {
      await page.goto(`${ORIGIN}/qla${MAN.duongDan}`);
      await expect(page).toHaveURL(new RegExp(MAN.duongDan.split('?')[0]), { timeout: 30_000 });
      await choHetSpin(page);
      t.chiTiet.push(`Tab: ${(await page.getByRole('tab').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).join(' | ')}`);
      t.anh.push(await chup('02-man-danh-sach'));
    });
    await chay('TC03', async t => {
      await go(page.locator(MAN.oTim), SO_BA);
      await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
      await choHetSpin(page);
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      // Bảng có spinner riêng (Đơn ân giảm tải chậm): chờ hết quay rồi mới đọc
      await expect(page.locator('.ant-table-wrapper .ant-spin-spinning, .ant-pro-table .ant-spin-spinning')).toHaveCount(0, { timeout: 90_000 });
      await expect(
        page.locator('.ant-table-row:visible').first().or(page.locator('.ant-table-placeholder:visible, .ant-empty:visible').first()),
      ).toBeVisible({ timeout: 30_000 });
      const tatCa = (await page.locator('.ant-table-row:visible').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
      const khop = tatCa.filter(d => d.includes(SO_THU_LY) || d.replace(/\s+/g, '').includes(`Mãđơn:${MA_DON}`));
      t.chiTiet.push(`Lọc Số BA/QĐ = ${SO_BA}: ${tatCa.length} dòng; khớp số thụ lý ${SO_THU_LY}: ${khop.length}`);
      t.anh.push(await chup('03-ket-qua-tim-kiem'));
      if (khop.length !== 1) throw new Error(`${MAN.ten}: ${khop.length} dòng khớp số thụ lý ${SO_THU_LY} (cần đúng 1)`);
      t.chiTiet.push(`Dòng: ${khop[0].slice(0, 400)}`);
      t.id = `đơn ${MA_DON} · TL ${SO_THU_LY}`;
    });
  } catch {
    /* ghi báo cáo bên dưới */
  }

  fs.writeFileSync(path.join(THU_MUC, 'test-results.json'), JSON.stringify({ ORIGIN, tk: TEN_TK, maDon: MA_DON, soBa: SO_BA, soThuLy: SO_THU_LY, ketQua: ds }, null, 2));
  fs.writeFileSync(
    path.join(THU_MUC, 'report.md'),
    [
      `# ${MAN.ten} · đơn ${MA_DON} · BA ${SO_BA} · TL ${SO_THU_LY}`,
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
