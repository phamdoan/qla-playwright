/**
 * DÒ (chỉ đọc): đọc TOÀN BỘ mã biểu mẫu trên màn Quản lý biểu mẫu, rồi tìm mã GẦN GIỐNG tại chỗ.
 *
 * Vì sao cần: UT khớp ĐÚNG mã (`45DS` ≠ `45-DS`), nên "KHÔNG CÓ" có thể là **thiếu thật** hoặc chỉ
 * là **viết khác** — mã biểu mẫu GĐT đã đổi một đợt trong 2026. Hai kết luận dẫn tới hai việc khác
 * nhau (sửa mapping vs. đăng ký biểu mẫu) nên phải phân biệt trước khi báo (CLAUDE.md · R6).
 *
 * Vì sao KHÔNG dò bằng tiền tố: đo trên STG 14/10/2026, ô "Mã biểu mẫu" của Tìm kiếm nâng cao lọc
 * **KHỚP ĐÚNG**, không phải chuỗi con — gõ `DS1` trả 0 dòng trong khi `DS17` có thật. Nên muốn tìm
 * mã gần giống thì phải tải cả danh mục về rồi so bằng mã nguồn test.
 *
 *   QLA_HO_SO_ENV=staging npx playwright test tests/bao-cao-thong-ke/ut-do-ma-gan-giong.spec.ts
 *   QLA_TIM=20VDS,72DS,RKN   # mã muốn truy (mặc định: 5 mã UT báo thiếu)
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { choHetSpin, hienTrong, luoiDaTai } from '../../common/antd';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';
import { MAN_QUAN_LY_BIEU_MAU } from '../../bctk/ut/neo';

const CAN_TRUY = (process.env.QLA_TIM || '20VDS,36-GDTHS.TC01-2026,72DS,DS18,RKN').split(',').map(s => s.trim());

/** Bỏ dấu phân cách để so "gần giống": `20-VDS` ↔ `20VDS`, `DS 18` ↔ `DS18`. */
const gonMa = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

test('dò toàn bộ mã biểu mẫu trên màn Quản lý biểu mẫu', async ({ browser }, testInfo) => {
  testInfo.setTimeout(20 * 60_000);
  const { page, context } = await moTrangVaiCauHinh(browser, testInfo, process.env.QLA_VAI || 'chanhAn');
  try {
    await page.goto(MAN_QUAN_LY_BIEU_MAU.route, { waitUntil: 'domcontentloaded' });
    await choHetSpin(page);
    await luoiDaTai(page).catch(() => {});

    // cỡ trang lớn nhất để đỡ lật trang (mặc định 10 dòng làm trượt âm thầm — CLAUDE.md · R2)
    const oCoTrang = page.locator('.ant-pagination-options .ant-select').first();
    if (await hienTrong(oCoTrang, 5_000)) {
      await oCoTrang.click();
      const muc = page.locator('.ant-select-dropdown:visible .ant-select-item-option').last();
      if (await hienTrong(muc, 5_000)) await muc.click();
      await choHetSpin(page);
    }

    /**
     * Chỉ số cột phải tra theo TIÊU ĐỀ, không đếm tay. Khai báo trong
     * `qla-webapp/src/pages/QuanLyBieuMau/index.tsx:233-245` là Tên | Mã | Loại án | Người tạo |
     * Thao tác, nhưng lưới thật có thêm cột đứng trước nên `td[1]` là **Tên biểu mẫu**: lần chạy
     * 14/10/2026 đọc `td[1]` ra 997 "mã" mà thực chất là tên → kết luận "không có mã nào gần giống"
     * khi đó là vô giá trị.
     */
    const dsTieuDe = (await page.locator('thead th').allInnerTexts()).map(s => s.trim());
    const iMa = dsTieuDe.findIndex(t => /^M[ãa]\s*bi[ểe]u\s*m[ẫa]u$/i.test(t));
    console.log(`cột lưới: ${dsTieuDe.map((t, i) => `${i}:${t || '(trống)'}`).join(' | ')}`);
    expect(iMa, `không thấy cột "Mã biểu mẫu" trong tiêu đề lưới: ${dsTieuDe.join(' | ')}`).toBeGreaterThanOrEqual(0);

    const dsMa: string[] = [];
    for (let trang = 1; trang <= 50; trang++) {
      await luoiDaTai(page).catch(() => {});
      const dong = page.locator('tr.ant-table-row');
      const n = await dong.count();
      for (let i = 0; i < n; i++) {
        const v = ((await dong.nth(i).locator('td').nth(iMa).innerText().catch(() => '')) || '').trim();
        if (v) dsMa.push(v);
      }
      const sau = page.locator('.ant-pagination-next:not(.ant-pagination-disabled)').first();
      if (!(await hienTrong(sau, 3_000))) break;
      await sau.click();
      await choHetSpin(page);
    }

    const duyNhat = [...new Set(dsMa)].sort();
    console.log(`\nĐọc được ${dsMa.length} dòng · ${duyNhat.length} mã duy nhất trên màn.`);

    // Lưu danh mục để tra ứng viên thay thế mà không phải chạy lại (2 phút/lượt)
    const tep = path.resolve(
      __dirname,
      `../../state/bao-cao-thong-ke/ut-mapping/ma-bieu-mau-tren-man.${process.env.QLA_ENV || 'stg'}.txt`,
    );
    fs.mkdirSync(path.dirname(tep), { recursive: true });
    fs.writeFileSync(tep, duyNhat.join('\n') + '\n', 'utf8');
    console.log(`đã lưu danh mục: ${tep}`);

    console.log('\n── truy từng mã UT báo thiếu ──');
    for (const ma of CAN_TRUY) {
      const dung = duyNhat.filter(x => x === ma);
      const ganGiong = duyNhat.filter(x => x !== ma && gonMa(x) === gonMa(ma));
      const chua = duyNhat.filter(x => x !== ma && (gonMa(x).includes(gonMa(ma)) || gonMa(ma).includes(gonMa(x))));
      console.log(
        `${ma.padEnd(22)} khớp đúng: ${dung.length ? dung.join(',') : 'KHÔNG'} · ` +
          `gần giống (bỏ dấu): ${ganGiong.join(',') || '—'} · chứa/bị chứa: ${chua.join(',') || '—'}`,
      );
    }
    expect(duyNhat.length, 'không đọc được mã nào — lưới rỗng hoặc sai cột').toBeGreaterThan(0);
  } finally {
    await context.close();
  }
});
