/**
 * DÒ (chỉ mở form, KHÔNG lưu): ô "Quan hệ pháp luật (Thống kê)" nạp danh mục nào theo
 * (loại đơn × phân loại đơn)?
 *
 * Vì sao cần: mapping chốt 6 ô báo cáo bằng NHÓM danh mục (`QHPL_TC_DS`, `QHPL_YC_DS`,
 * `QHPL_TC_KDTM`, `QHPL_YC_KDTM`), còn màn chỉ hiện TÊN nhánh. Muốn UT kiểm "nhóm này đã có trên
 * màn chưa" thì phải biết tổ hợp nào mở ra nhóm nào, và tên nhánh cấp 1 thật là gì — tên do máy chủ
 * cấp và đã đổi một lần (danh mục KDTM tái cấu trúc 03/10/2026).
 *
 *   QLA_HO_SO_ENV=staging npx playwright test tests/bao-cao-thong-ke/ut-do-nhom-danh-muc.spec.ts
 *   QLA_VAI=chanhAnDanSu   # đổi vai (mặc định chanhAn)
 *
 * Spec này KHÔNG bấm Lưu: chỉ mở wizard, chọn loại đơn/phân loại, mở cây danh mục rồi đọc.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { choHetSpin, chonSelect, hienTrong, nghi } from '../../common/antd';
import { khungSelectCua } from '../../common/don-khoi-kien';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';
import { MAN_QHPL_THONG_KE } from '../../bctk/ut/neo';

const VAI = process.env.QLA_VAI || 'chanhAn';

test('dò danh mục của ô "Quan hệ pháp luật (Thống kê)" theo loại đơn × phân loại', async ({ browser }, testInfo) => {
  testInfo.setTimeout(20 * 60_000);
  const { page, context } = await moTrangVaiCauHinh(browser, testInfo, VAI);
  const ghi: string[] = [];
  try {
    await page.goto(MAN_QHPL_THONG_KE.route, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    await choHetSpin(page);
    await page.getByRole('button', { name: MAN_QHPL_THONG_KE.nutThemMoi }).first().click();
    await expect(page.getByText(MAN_QHPL_THONG_KE.tieuDeWizard).first()).toBeVisible({ timeout: 60_000 });
    await choHetSpin(page);
    await nghi(page, 1200, 2000);

    /**
     * NHÃN ↔ ID của mọi ô trên wizard. Đo 14/10/2026: đọc `#loaiDon` ra 0 mục còn `#phanLoai` lại ra
     * danh sách LOẠI ÁN — tức id/nhãn không như `tao-don.flow.ts` giả định, nên phải dò thật trước
     * khi kết luận gì về danh mục.
     */
    const banDoO = await page.evaluate(() => {
      const ra: string[] = [];
      for (const item of Array.from(document.querySelectorAll('.ant-form-item'))) {
        const lb = item.querySelector('label');
        const ctl = item.querySelector('input[id], textarea[id], [role=combobox][id]');
        const nhan = (lb?.textContent || '').replace(/\s+/g, ' ').trim();
        const id = ctl?.getAttribute('id') || '';
        if (nhan || id) ra.push(`${nhan || '(không nhãn)'} → #${id || '(không id)'}`);
      }
      return ra;
    });
    ghi.push('── nhãn ↔ id trên wizard ──\n   ' + banDoO.join('\n   '));

    /** Đọc danh sách mục của một ô Select (mở ra rồi đóng lại bằng Escape). */
    const docOption = async (id: string) => {
      const khung = khungSelectCua(page.locator(id));
      if (!(await hienTrong(khung, 10_000))) return ['(không thấy ô ' + id + ')'];
      await khung.click();
      const muc = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
      // chờ có mục thật: lần đo đầu đọc ngay nên ra 0 mục rồi kết luận sai
      for (let i = 0; i < 20 && (await muc.count()) === 0; i++) await nghi(page, 250, 400);
      const ds = (await muc.allInnerTexts()).map(s => s.trim()).filter(Boolean);
      await page.keyboard.press('Escape');
      return ds;
    };

    const dsLoaiDon = await docOption(MAN_QHPL_THONG_KE.oLoaiDon);
    const dsPhanLoai = await docOption(MAN_QHPL_THONG_KE.oPhanLoai);
    ghi.push(`\n${MAN_QHPL_THONG_KE.oLoaiDon} (${dsLoaiDon.length}): ${dsLoaiDon.join(' | ')}`);
    ghi.push(`${MAN_QHPL_THONG_KE.oPhanLoai} (${dsPhanLoai.length}): ${dsPhanLoai.join(' | ')}`);

    const loaiCanDo = dsLoaiDon.filter(x => /^D[âa]n s[ựu]$|kinh doanh/i.test(x));
    const phanLoaiCanDo = dsPhanLoai.filter(x => /kh[ởo]i ki[ệe]n|y[êe]u c[ầa]u/i.test(x));
    ghi.push(`\nsẽ dò ${loaiCanDo.length} loại đơn × ${phanLoaiCanDo.length} phân loại`);

    for (const loai of loaiCanDo) {
      for (const phan of phanLoaiCanDo) {
        await chonSelect(page, page.locator(MAN_QHPL_THONG_KE.oLoaiDon), loai).catch(() => {});
        await chonSelect(page, page.locator(MAN_QHPL_THONG_KE.oPhanLoai), phan).catch(() => {});
        await choHetSpin(page);
        await nghi(page, 600, 1200);

        const khung = khungSelectCua(page.locator(MAN_QHPL_THONG_KE.o));
        if (!(await hienTrong(khung, 10_000))) {
          ghi.push(`\n[${loai} × ${phan}] KHÔNG thấy ô ${MAN_QHPL_THONG_KE.o}`);
          continue;
        }
        /**
         * Mở dropdown chắc tay: Escape cho sạch overlay → click → chờ dropdown của chính ô này.
         * Lượt dò đầu (14/10/2026) click ngay sau `chonSelect` nên dropdown chưa mở, đọc ra 0 nhánh
         * cho "Kinh doanh, thương mại × Đơn yêu cầu" và suýt thành kết luận "nhóm chưa có" — chạy
         * lại đúng cách thì có 5 nhánh.
         */
        const dropdown = page.locator('.ant-select-dropdown:visible').last();
        let moDuoc = false;
        for (let lan = 0; lan < 3 && !moDuoc; lan++) {
          await page.keyboard.press('Escape');
          await nghi(page, 300, 600);
          await khung.click();
          moDuoc = await hienTrong(dropdown, 10_000);
        }
        if (!moDuoc) {
          ghi.push(`\n[${loai} × ${phan}] KHÔNG mở được dropdown sau 3 lần bấm → chưa kiểm được`);
          continue;
        }
        const title = dropdown.locator('.ant-select-tree-title');
        await hienTrong(title.first(), 15_000);
        const ds = (await title.allInnerTexts()).map(s => s.trim()).filter(Boolean);
        await page.keyboard.press('Escape');
        ghi.push(`\n[${loai} × ${phan}] ${ds.length} nhánh cấp 1:\n   ${ds.join('\n   ') || '(cây rỗng)'}`);
      }
    }
  } finally {
    const tep = path.resolve(
      __dirname,
      `../../state/bao-cao-thong-ke/ut-mapping/nhom-danh-muc-qhpl.${process.env.QLA_ENV || 'stg'}.txt`,
    );
    fs.mkdirSync(path.dirname(tep), { recursive: true });
    fs.writeFileSync(tep, ghi.join('\n') + '\n', 'utf8');
    console.log('\n' + ghi.join('\n') + `\n\nđã lưu: ${tep}`);
    await context.close();
  }
});
