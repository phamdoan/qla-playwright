/**
 * E2E — BƯỚC 10: THƯ KÝ VỤ kiểm tra vụ án ở "Nhận đơn và Thụ lý vụ án" → tab "Đã có vụ án" (môi trường đào tạo).
 * Chỉ ĐỌC: tìm kiếm có kết quả thì dừng; không tìm được là lỗi.
 *
 *   QLA_NV_CCCD=<CCCD thư ký Vụ> QLA_NV_MA_DON=<mã đơn> QLA_NV_SO_BA=<số BA> QLA_NV_NGAY_BA=<dd/mm/yyyy> \
 *     node tools/chay-ui.js daotao --cli --file=e2e-nhan-don-tl-vu-an
 * Báo cáo: reports/e2e-nhan-don-tl-vu-an/<mã đơn>/.
 */
import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import { ORIGIN } from '../../../playwright.config';
import { loginSSO } from '../../../common/login';
import { choHetSpin, go } from '../../../common/antd';
import { moMenu } from '../../../common/menu';

const CCCD = process.env.QLA_NV_CCCD || '';
const PASS = process.env.QLA_NV_PASS || `Ta@${CCCD}`;
const TEN_TK = process.env.QLA_NV_TEN || CCCD;
const MA_DON = process.env.QLA_NV_MA_DON || '';
const SO_BA = process.env.QLA_NV_SO_BA || '';
const NGAY_BA = process.env.QLA_NV_NGAY_BA || '';

const GOC = path.resolve(__dirname, '../../..');
const THU_MUC = path.join(GOC, `reports/e2e-nhan-don-tl-vu-an/${MA_DON || 'chua-dat'}`);
const THU_MUC_ANH = path.join(THU_MUC, 'screenshots');

type TrangThai = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_RUN';
interface Tc {
  ma: string;
  ten: string;
  check: string;
  mongDoi: string;
  trangThai: TrangThai;
  id: string;
  chiTiet: string[];
  anh: string[];
}
const DS_TC: [string, string, string, string][] = [
  ['TC01', `Đăng nhập ${TEN_TK}`, 'Đăng nhập SSO thành công', 'Vào được hệ thống'],
  ['TC02', 'Menu Quản lý án GĐT/TT → Nhận đơn và Thụ lý vụ án', 'Đi qua menu; URL /vu-an/gdt-tt/nhan-don-tl-vu-an/danh-sach', 'Màn hiển thị'],
  ['TC03', 'Chọn tab "Đã có vụ án"', 'Tab aria-selected', 'Tab đúng'],
  ['TC04', `Tìm Số BA/QĐ ${SO_BA}`, `Lọc Số BA/QĐ; dòng chứa "Mã đơn: ${MA_DON}"${NGAY_BA ? ` và ngày ${NGAY_BA}` : ''}`, 'Tìm thấy đúng 1 vụ án của đơn'],
];

class Dung extends Error {
  constructor(readonly trangThai: Exclude<TrangThai, 'PASS' | 'NOT_RUN'>, message: string) {
    super(message);
  }
}

test.use({ storageState: { cookies: [], origins: [] } });

test(`e2e-nhan-don-tl-vu-an · đơn ${MA_DON || '?'} · BA ${SO_BA || '?'}`, async ({ page }) => {
  test.setTimeout(10 * 60_000);
  test.skip(!CCCD || !MA_DON || !SO_BA, 'Thiếu QLA_NV_CCCD / QLA_NV_MA_DON / QLA_NV_SO_BA');
  test.skip(new URL(ORIGIN).host !== 'e-qlta-daotao.toaan.gov.vn', `Chỉ chạy trên môi trường đào tạo, đang ở ${ORIGIN}`);
  fs.mkdirSync(THU_MUC_ANH, { recursive: true });
  const batDau = new Date();
  const ds: Tc[] = DS_TC.map(([ma, ten, check, mongDoi]) => ({ ma, ten, check, mongDoi, trangThai: 'NOT_RUN', id: '', chiTiet: [], anh: [] }));
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
      } catch (e) {
        t.trangThai = e instanceof Dung ? e.trangThai : 'FAIL';
        t.chiTiet.push(e instanceof Error ? e.message.split('\n')[0] : String(e));
        t.anh.push(await chup(`${ma}-loi`));
        throw e;
      }
    });
  };

  let loiCuoi: unknown;
  try {
    await chay('TC01', async t => {
      await loginSSO(page, CCCD, { pass: PASS });
      t.chiTiet.push(`Đăng nhập SSO: ${TEN_TK}`);
      t.id = CCCD;
    });
    await chay('TC02', async t => {
      try {
        await moMenu(page, ['Quản lý án GĐT/TT', 'Nhận đơn và TL vụ án']);
      } catch (loiMenu) {
        // Menu trái có lúc không tải (đo 15/10/2026, đơn 22190) → mở thẳng đường dẫn màn, ghi lại lý do
        t.chiTiet.push(`Menu không mở được (${loiMenu instanceof Error ? loiMenu.message.split('\n')[0] : loiMenu}) → mở thẳng URL`);
        await page.goto(`${ORIGIN}/qla/vu-an/gdt-tt/nhan-don-tl-vu-an/danh-sach`);
      }
      await expect(page).toHaveURL(/\/vu-an\/gdt-tt\/nhan-don-tl-vu-an/, { timeout: 30_000 });
      await choHetSpin(page);
      t.chiTiet.push(`URL: ${page.url()}`);
      t.chiTiet.push(`Tab: ${(await page.getByRole('tab').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).join(' | ')}`);
      t.anh.push(await chup('02-man-nhan-don'));
    });
    await chay('TC03', async t => {
      const tab = page.getByRole('tab', { name: /^Đã có vụ án/ }).first();
      await expect(tab, 'Không thấy tab "Đã có vụ án" — kiểm tra quyền tài khoản').toBeVisible({ timeout: 30_000 });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 15_000 });
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      t.chiTiet.push(`Tab đang chọn: ${(await tab.innerText()).replace(/\s+/g, ' ').trim()}`);
      t.anh.push(await chup('03-tab-da-co-vu-an'));
    });
    await chay('TC04', async t => {
      await go(page.locator('#soBanAnQd'), SO_BA);
      await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
      await choHetSpin(page);
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await expect(
        page.locator('.ant-table-row:visible').first().or(page.locator('.ant-table-placeholder:visible, .ant-empty:visible').first()),
      ).toBeVisible({ timeout: 30_000 });
      const docDong = async () => (await page.locator('.ant-table-row:visible').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
      const coMaDon = (d: string) => d.replace(/\s+/g, '').includes(`Mãđơn:${MA_DON}`);
      // Đọc sớm thì còn là trang đầu CHƯA lọc (đo 15/10/2026, đơn 22164/22174: "10 dòng", không dòng nào có số BA)
      // → chờ tới khi MỌI dòng đều chứa số BA đã lọc (hoặc bảng rỗng)
      await expect
        .poll(async () => {
          const d = await docDong();
          return d.length === 0 || d.every(x => x.includes(SO_BA));
        }, { timeout: 45_000, intervals: [1_000] })
        .toBe(true)
        .catch(() => t.chiTiet.push('Sau 45s bảng vẫn có dòng không chứa số BA đã lọc'));
      let tatCa = await docDong();
      // Số BA/QĐ lọc theo CHUỖI CON ("4640" khớp cả 14640, 46401…) → trang đầu 10 dòng có thể không chứa đơn
      // (đo 15/10/2026, đơn 22164) → chưa thấy mà còn trang sau thì đổi cỡ trang 100 rồi đọc lại
      if (!tatCa.some(coMaDon) && (await page.locator('.ant-pagination-next:not(.ant-pagination-disabled)').count())) {
        const coTrang = page.locator('.ant-pagination-options .ant-select').first();
        if (await coTrang.isVisible().catch(() => false)) {
          await coTrang.click();
          await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^100/ }).first().click();
          await choHetSpin(page);
          await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
          tatCa = await docDong();
          t.chiTiet.push(`Trang đầu chưa có đơn → đổi cỡ trang 100: ${tatCa.length} dòng`);
        }
      }
      const khop = tatCa.filter(d => /Mã đơn:\s*/.test(d) && d.replace(/\s+/g, '').includes(`Mãđơn:${MA_DON}`) && (!NGAY_BA || d.includes(NGAY_BA)));
      t.chiTiet.push(`Lọc Số BA/QĐ = ${SO_BA}: ${tatCa.length} dòng; khớp mã đơn ${MA_DON}${NGAY_BA ? ` + ngày ${NGAY_BA}` : ''}: ${khop.length}`);
      t.anh.push(await chup('04-ket-qua-tim-kiem'));
      if (!khop.length) throw new Dung('FAIL', `Không tìm thấy vụ án của đơn ${MA_DON} ở tab "Đã có vụ án" (lỗi)`);
      if (khop.length > 1) throw new Dung('FAIL', `Có ${khop.length} dòng khớp đơn ${MA_DON} — nghi trùng`);
      t.chiTiet.push(`Dòng: ${khop[0].slice(0, 400)}`);
      const maVu = khop[0].match(/(VA\d{2}-\d+|GDT[\w.-]*\d)/);
      t.id = `đơn ${MA_DON}${maVu ? ` · vụ án ${maVu[1]}` : ''}`;
    });
  } catch (e) {
    loiCuoi = e;
  }

  const dem = (s: TrangThai) => ds.filter(t => t.trangThai === s).length;
  const md = [
    `# Báo cáo E2E — Nhận đơn và Thụ lý vụ án (Đã có vụ án) · đơn ${MA_DON}`,
    '',
    `- Môi trường: ${ORIGIN} · CHỈ ĐỌC · tài khoản ${TEN_TK}`,
    `- Thời gian: ${batDau.toLocaleString('vi-VN')} → ${new Date().toLocaleString('vi-VN')}`,
    `- Đơn ${MA_DON} · BA ${SO_BA}${NGAY_BA ? ` ngày ${NGAY_BA}` : ''}`,
    `- Thống kê: PASS ${dem('PASS')} · FAIL ${dem('FAIL')} · BLOCKED ${dem('BLOCKED')} · NOT_RUN ${dem('NOT_RUN')}`,
    '',
    '| TC | Test case | Check | Mong đợi | Trạng thái | ID (khi PASS) | Bằng chứng | Chi tiết |',
    '|---|---|---|---|---|---|---|---|',
    ...ds.map(
      t =>
        `| ${t.ma} | ${t.ten} | ${t.check} | ${t.mongDoi} | **${t.trangThai}** | ${t.trangThai === 'PASS' ? t.id || '—' : '—'} | ${t.anh.map(a => `[${path.basename(a)}](${a})`).join('<br>') || '—'} | ${t.chiTiet.join('<br>').replace(/\|/g, '/') || '—'} |`,
    ),
  ];
  fs.writeFileSync(path.join(THU_MUC, 'report.md'), md.join('\n'));
  fs.writeFileSync(path.join(THU_MUC, 'test-results.json'), JSON.stringify({ ORIGIN, tk: TEN_TK, maDon: MA_DON, soBa: SO_BA, ngayBa: NGAY_BA, ketQua: ds }, null, 2));
  for (const t of ds) console.log(`    · ${t.ma} ${t.trangThai} — ${t.chiTiet.slice(-2).join(' · ').slice(0, 450)}${t.trangThai === 'PASS' && t.id ? ` [ID: ${t.id}]` : ''}`);
  const loi = ds.find(t => t.trangThai === 'FAIL');
  if (loi) throw new Error(`${loi.ma}: ${loi.chiTiet.at(-1)}`);
  if (loiCuoi && !(loiCuoi instanceof Dung)) throw loiCuoi;
});
