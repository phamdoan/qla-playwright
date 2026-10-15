/**
 * E2E — LÃNH ĐẠO DUYỆT / KÝ văn bản của đơn (Công tác lãnh đạo → Phê duyệt đề xuất → Chờ duyệt), môi trường đào tạo.
 *
 *   QLA_LD_CCCD=<CCCD lãnh đạo> QLA_LD_ID=<id yêu cầu phê duyệt hoặc id văn bản> QLA_LD_HANH_DONG=<hành động> \
 *   QLA_LD_MA_DON=<mã đơn> QLA_LD_TEN_VB="Tờ trình phân công" node tools/chay-ui.js daotao [--ghi] --cli --file=e2e-lanh-dao-duyet
 *
 *   QLA_LD_HANH_DONG:
 *     ky-trinh-tiep  Chánh/Phó VP: Cấp trình tiếp (QLA_LD_CAP_TRINH) + Người đề xuất trình (QLA_LD_NGUOI_TRINH) → "Lưu và ký logic"
 *     phe-duyet      Chánh/Phó Chánh án: ý kiến → "Phê duyệt"
 *     ky-logic       văn bản (vd Thông báo phân công): ý kiến → "Ký logic"
 *
 * Không --ghi: chỉ tìm và mở đúng yêu cầu ở "Chờ duyệt", không bấm. Không bấm lại khi yêu cầu đã duyệt xong.
 * Báo cáo: reports/e2e-lanh-dao-duyet/<mã đơn>-<hành động>/.
 */
import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import { ORIGIN } from '../../../playwright.config';
import { choPhepGhiTKM } from '../../../account';
import { loginSSO } from '../../../common/login';
import { choHetSpin } from '../../../common/antd';
import { PheDuyetPage } from '../../../pages/phe-duyet.page';

const CCCD = process.env.QLA_LD_CCCD || '';
const PASS = process.env.QLA_LD_PASS || `Ta@${CCCD}`;
const TEN_TK = process.env.QLA_LD_TEN || CCCD;
const ID = process.env.QLA_LD_ID || '';
const HANH_DONG = process.env.QLA_LD_HANH_DONG || '';
const MA_DON = process.env.QLA_LD_MA_DON || '';
const TEN_VB = process.env.QLA_LD_TEN_VB || 'Tờ trình phân công';
const CAP_TRINH = process.env.QLA_LD_CAP_TRINH || 'Phó chánh án';
const NGUOI_TRINH = process.env.QLA_LD_NGUOI_TRINH || 'Nguyễn Hải Trâm';
const Y_KIEN = process.env.QLA_LD_Y_KIEN || 'Đồng ý với đề xuất.';

const GOC = path.resolve(__dirname, '../../..');
const THU_MUC = path.join(GOC, `reports/e2e-lanh-dao-duyet/${MA_DON || 'chua-dat'}-${HANH_DONG || 'chua-dat'}`);
const THU_MUC_ANH = path.join(THU_MUC, 'screenshots');

type TrangThai = 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIPPED_ALREADY_DONE' | 'NOT_RUN';
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
  ['TC01', `Đăng nhập ${TEN_TK}, mở Công tác lãnh đạo → Phê duyệt đề xuất`, 'Đăng nhập SSO; màn danh sách phê duyệt có tab "Chờ duyệt"', 'Thành công'],
  ['TC02', `Tìm ${TEN_VB} của đơn ${MA_DON}`, 'Bản ghi API phê duyệt khớp id yêu cầu / id văn bản; còn ở Chờ duyệt (chưa duyệt xong)', 'Đúng 1 yêu cầu chờ duyệt'],
  ['TC03', 'Mở màn Lãnh đạo phê duyệt ý kiến', 'Mở đúng yêu cầu theo id; màn có nút thao tác đúng hành động', 'Màn hiển thị'],
  ['TC04', `Thực hiện: ${HANH_DONG}`, 'Bấm nút đúng 1 lần; API ký/duyệt trả thành công', 'Thành công'],
  ['TC05', 'Kiểm tra sau thao tác', 'Yêu cầu không còn ở Chờ duyệt của tài khoản này', 'Đã rời Chờ duyệt'],
];

class Dung extends Error {
  constructor(readonly trangThai: Exclude<TrangThai, 'PASS' | 'NOT_RUN'>, message: string) {
    super(message);
  }
}

test.use({ storageState: { cookies: [], origins: [] } });

test(`e2e-lanh-dao-duyet · ${HANH_DONG || '?'} · đơn ${MA_DON || '?'} · ${TEN_TK}`, async ({ page }) => {
  test.setTimeout(20 * 60_000);
  test.skip(!CCCD || !ID || !HANH_DONG, 'Thiếu QLA_LD_CCCD / QLA_LD_ID / QLA_LD_HANH_DONG');
  test.skip(new URL(ORIGIN).host !== 'e-qlta-daotao.toaan.gov.vn', `Chỉ chạy trên môi trường đào tạo, đang ở ${ORIGIN}`);
  const ghiDuoc = choPhepGhiTKM();
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

  // Bản ghi phê duyệt từ API danh sách (để biết id yêu cầu + id văn bản + trạng thái)
  const banGhi: any[] = [];
  page.on('response', async r => {
    if (r.request().method() !== 'GET' || !/phe-duyet-de-xuat/.test(r.url()) || /thong-ke/.test(r.url())) return;
    const j: any = await r.json().catch(() => null);
    const d = j?.data?.content || j?.data?.items || j?.data?.data || j?.data?.records || j?.data;
    if (Array.isArray(d)) banGhi.push(...d);
  });
  const khop = (x: any) => x?.id === ID || x?.idDuLieu === ID;

  const pd = new PheDuyetPage(page);
  let loiCuoi: unknown;
  try {
    await chay('TC01', async t => {
      await loginSSO(page, CCCD, { pass: PASS });
      await pd.mo();
      await choHetSpin(page);
      await expect(page.getByRole('tab', { name: /^Chờ duyệt/ }).first()).toBeVisible({ timeout: 30_000 });
      t.chiTiet.push(`Đăng nhập SSO: ${TEN_TK} · ${page.url()}`);
      t.chiTiet.push(`Tab: ${(await page.getByRole('tab').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim()).join(' | ')}`);
      t.anh.push(await chup('01-phe-duyet'));
    });
    await chay('TC02', async t => {
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      const rec = banGhi.find(khop);
      if (!rec) throw new Dung('FAIL', `Không thấy yêu cầu ${ID} ở hộp phê duyệt của ${TEN_TK}`);
      t.chiTiet.push(`Yêu cầu: id ${rec.id} · văn bản ${rec.idDuLieu} · mẫu ${rec.maBieuMau} · trạng thái tổng hợp ${rec.trangThaiTongHop}`);
      t.id = `yêu cầu ${rec.id} · văn bản ${rec.idDuLieu}`;
      if (rec.trangThaiTongHop === '2') throw new Dung('SKIPPED_ALREADY_DONE', 'Yêu cầu đã duyệt xong từ trước — không thao tác lại');
    });
    await chay('TC03', async t => {
      const con = await pd.moChiTietTheoId(ID);
      if (!con) throw new Dung('SKIPPED_ALREADY_DONE', 'Yêu cầu đã duyệt xong từ trước — không thao tác lại');
      t.chiTiet.push(`URL: ${page.url()}`);
      t.chiTiet.push(`Nút trên màn: ${[...new Set((await page.getByRole('button').allInnerTexts()).map(s => s.trim()).filter(Boolean))].slice(0, 20).join(' | ')}`);
      t.anh.push(await chup('03-man-y-kien'));
      if (!ghiDuoc) throw new Dung('BLOCKED', 'Chế độ chỉ đọc (không --ghi) — dừng trước khi ký/duyệt');
    });
    await chay('TC04', async t => {
      if (HANH_DONG === 'ky-trinh-tiep') {
        const kq = await pd.ykienVaKyLogic(Y_KIEN, CAP_TRINH, NGUOI_TRINH);
        t.chiTiet.push(kq.moTa);
        if (!kq.daTrinhTiep) throw new Dung('FAIL', 'Màn không có ô "Cấp trình tiếp" — chỉ ký, không chuyển Phó Chánh án');
      } else if (HANH_DONG === 'phe-duyet') {
        await pd.ykienVaPheDuyet(Y_KIEN);
        t.chiTiet.push(`Ý kiến "${Y_KIEN}" → Phê duyệt`);
      } else if (HANH_DONG === 'ky-logic') {
        await pd.ykienVaKyLogicVanBan(Y_KIEN);
        t.chiTiet.push(`Ý kiến "${Y_KIEN}" → Ký logic`);
      } else {
        throw new Dung('BLOCKED', `QLA_LD_HANH_DONG không hợp lệ: ${HANH_DONG}`);
      }
      t.anh.push(await chup('04-sau-thao-tac'));
      t.id = tc('TC02').id;
    });
    await chay('TC05', async t => {
      banGhi.length = 0;
      await pd.mo();
      await page.getByRole('tab', { name: /^Chờ duyệt/ }).first().click();
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await choHetSpin(page);
      const con = banGhi.filter(khop).filter(x => x.trangThaiTongHop !== '2');
      const choDuyet = (await page.locator('.ant-table-row:visible').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').slice(0, 160));
      t.chiTiet.push(`Chờ duyệt còn ${choDuyet.length} dòng`);
      t.anh.push(await chup('05-sau'));
      if (con.length && choDuyet.some(d => d.includes(TEN_VB))) throw new Dung('FAIL', 'Yêu cầu vẫn ở Chờ duyệt');
      t.id = tc('TC02').id;
    });
  } catch (e) {
    loiCuoi = e;
  }

  const dem = (s: TrangThai) => ds.filter(t => t.trangThai === s).length;
  const md = [
    `# Báo cáo E2E — Lãnh đạo ${HANH_DONG} · ${TEN_VB} · đơn ${MA_DON}`,
    '',
    `- Môi trường: ${ORIGIN} · chế độ: ${ghiDuoc ? 'GHI' : 'CHỈ ĐỌC'} · tài khoản ${TEN_TK}`,
    `- Thời gian: ${batDau.toLocaleString('vi-VN')} → ${new Date().toLocaleString('vi-VN')}`,
    `- Yêu cầu/văn bản: ${ID}${HANH_DONG === 'ky-trinh-tiep' ? ` · trình tiếp ${CAP_TRINH} (${NGUOI_TRINH})` : ''}`,
    `- Thống kê: PASS ${dem('PASS')} · FAIL ${dem('FAIL')} · BLOCKED ${dem('BLOCKED')} · SKIPPED_ALREADY_DONE ${dem('SKIPPED_ALREADY_DONE')} · NOT_RUN ${dem('NOT_RUN')}`,
    '',
    '| TC | Test case | Check | Mong đợi | Trạng thái | ID (khi PASS) | Bằng chứng | Chi tiết |',
    '|---|---|---|---|---|---|---|---|',
    ...ds.map(
      t =>
        `| ${t.ma} | ${t.ten} | ${t.check} | ${t.mongDoi} | **${t.trangThai}** | ${t.trangThai === 'PASS' ? t.id || '—' : '—'} | ${t.anh.map(a => `[${path.basename(a)}](${a})`).join('<br>') || '—'} | ${t.chiTiet.join('<br>').replace(/\|/g, '/') || '—'} |`,
    ),
  ];
  fs.writeFileSync(path.join(THU_MUC, 'report.md'), md.join('\n'));
  fs.writeFileSync(path.join(THU_MUC, 'test-results.json'), JSON.stringify({ ORIGIN, ghiDuoc, tk: TEN_TK, id: ID, hanhDong: HANH_DONG, maDon: MA_DON, ketQua: ds }, null, 2));
  for (const t of ds) console.log(`    · ${t.ma} ${t.trangThai} — ${t.chiTiet.slice(-2).join(' · ').slice(0, 400)}${t.trangThai === 'PASS' && t.id ? ` [ID: ${t.id}]` : ''}`);
  const loi = ds.find(t => t.trangThai === 'FAIL');
  if (loi) throw new Error(`${loi.ma}: ${loi.chiTiet.at(-1)}`);
  if (loiCuoi && !(loiCuoi instanceof Dung)) throw loiCuoi;
});
