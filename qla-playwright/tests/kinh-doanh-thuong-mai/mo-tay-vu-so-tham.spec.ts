/**
 * MỞ TAY · CHI TIẾT VỤ ÁN SƠ THẨM — chỉ XEM, không bấm Lưu/Lấy số/Ký.
 *
 * Trả lời một câu: **thanh tab của vụ sơ thẩm đang có những tab nào, tên chính xác là gì?**
 *
 * Vì sao cần: bước 14 (Thông báo kháng cáo 62-DS) dừng ở `moTab(/^(Kết quả sơ thẩm|Quản lý án)$/)` —
 * sau 3 lần thử + 2 lần tải lại vẫn không thấy tab nào mang một trong hai tên đó. Hai khả năng: tab
 * ĐỔI TÊN lần nữa, hoặc vùng nội dung trống do máy chủ (lúc đó thanh tab cũng rỗng).
 *
 *   npm run gdt:mo-tay-so-tham
 *
 * Màn in ra:
 *  1. URL đang mở + id vụ sơ thẩm lấy từ SỔ CÁI của case (không phải gõ tay).
 *  2. TẤT CẢ tab trên màn: tên chính xác, kèm [BỊ KHOÁ] nếu disabled, và tab đang mở.
 *  3. Các khối có tiêu đề "Danh sách …" trong tab đang mở (để biết đã vào đúng tab chứa
 *     "Danh sách thông báo kháng cáo, kháng nghị" chưa).
 *  4. Dừng ở `page.pause()` — bạn bấm thử, xong bấm Resume.
 *
 * Biến môi trường: QLA_MO_TAY=1 (npm script đặt sẵn) · QLA_CASE=case-002 (mặc định)
 *   QLA_VAI=<vai, mặc định lấy vaiSoTham của case>  ·  QLA_TAB=<khoá tab muốn mở, vd. ket-qua-so-tham>
 *   QLA_ID_VU=<id vụ sơ thẩm, nếu muốn ép thay vì đọc sổ cái>
 */
import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { choHetSpin, nghi } from '../../common/antd';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';

const CAT = (s: string, n = 120) => s.replace(/\s+/g, ' ').trim().slice(0, n);

/** Đọc id vụ sơ thẩm từ sổ cái của case trong THƯ MỤC ĐANG CHẠY */
function idVuTuSoCai(caseId: string): { id?: string; tep?: string } {
  const d = path.resolve(__dirname, '../../state/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao');
  if (!fs.existsSync(d)) return {};
  const ds = fs
    .readdirSync(d)
    .filter(t => t.startsWith(`${caseId}.`) && t.endsWith('.state.json') && !t.includes('.bak'))
    .map(t => path.join(d, t))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  for (const tep of ds) {
    try {
      const j = JSON.parse(fs.readFileSync(tep, 'utf8'));
      const id = j?.duLieu?.idVuAnSoTham;
      if (id) return { id, tep };
    } catch {
      /* bỏ qua file hỏng */
    }
  }
  return {};
}

test('mo-tay sơ thẩm · liệt kê tab của vụ án sơ thẩm rồi dừng', async ({ browser }, testInfo) => {
  test.skip(process.env.QLA_MO_TAY !== '1', 'Chỉ chạy khi QLA_MO_TAY=1');
  testInfo.setTimeout(60 * 60_000);

  const caseId = process.env.QLA_CASE || 'case-002';
  const { id, tep } = process.env.QLA_ID_VU ? { id: process.env.QLA_ID_VU, tep: '(ép bằng QLA_ID_VU)' } : idVuTuSoCai(caseId);
  if (!id) {
    throw new Error(
      `Không đọc được "idVuAnSoTham" trong sổ cái của ${caseId} ở thư mục này. ` +
        `Chạy ở đúng thư mục đã chạy luồng, hoặc truyền QLA_ID_VU=<id vụ sơ thẩm>.`,
    );
  }
  const vai = process.env.QLA_VAI || 'chanhAnDanSu';
  const tab = process.env.QLA_TAB || 'thong-tin-chung';
  const { page } = await moTrangVaiCauHinh(browser, testInfo, vai);
  console.log(`\n→ Case ${caseId} · vai ${vai}\n   id vụ sơ thẩm: ${id}\n   sổ cái: ${tep}`);

  await page.goto(`vu-an/dan-su/so-tham/chi-tiet?id=${id}&tab=${tab}`);
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await choHetSpin(page);
  await nghi(page, 2000, 3000);
  console.log(`   URL: ${page.url()}`);

  const dsTab = page.getByRole('tab');
  const n = await dsTab.count();
  console.log(`\nTAB TRÊN MÀN (${n}):`);
  for (let i = 0; i < n; i++) {
    const t = dsTab.nth(i);
    const ten = CAT(await t.innerText().catch(() => ''), 60);
    const khoa = (await t.getAttribute('aria-disabled')) === 'true' || (await t.getAttribute('class'))?.includes('disabled');
    const dangMo = (await t.getAttribute('aria-selected')) === 'true';
    console.log(`   ${dangMo ? '▶' : ' '} "${ten}"${khoa ? '  [BỊ KHOÁ]' : ''}`);
  }
  if (!n) {
    console.log('   (KHÔNG có tab nào — vùng nội dung trống thì là lỗi tải trang của máy chủ)');
    console.log(`   chữ trên màn: ${CAT(await page.locator('main, body').first().innerText().catch(() => ''), 400)}`);
  }

  const khoi = page.locator('.ant-card-head-title, .ant-collapse-header, h3, h4').filter({ hasText: /Danh sách/i });
  const m = await khoi.count();
  console.log(`\nKHỐI "Danh sách …" trong tab đang mở (${m}):`);
  for (let i = 0; i < Math.min(m, 12); i++) console.log(`   · ${CAT(await khoi.nth(i).innerText().catch(() => ''), 90)}`);

  console.log(
    '\nCẦN KIỂM: tab chứa khối "Danh sách thông báo kháng cáo, kháng nghị" tên CHÍNH XÁC là gì? ' +
      '(bước 14 đang tìm "Kết quả sơ thẩm" hoặc "Quản lý án")\n' +
      '  ⚠ CHỈ XEM — đừng Lấy số/Ký ở đây.\n',
  );
  await page.pause();
});
