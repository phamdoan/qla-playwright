/**
 * MỞ TAY · PHÂN CÔNG THẨM PHÁN TANDTC — không phải bước của flow.
 *
 * Trả lời một câu: **chỉ định đích danh một Thẩm phán TANDTC cho hồ sơ kháng nghị thì bấm ở đâu?**
 *
 * Vì sao cần: Chương trình làm việc HĐXX khoá người ký (cũng là người duyệt) theo CHỦ TOẠ, mà chủ toạ
 * do bước này quyết định. Tài liệu B16 nói "phân công ngẫu nhiên — hệ thống tự chọn", và ngẫu nhiên rơi
 * vào thẩm phán không có tài khoản trong bộ là tắc bước phê duyệt (đo 02/10/2026).
 *
 * Kịch bản đã thử và KHÔNG được: tab "DS chưa phân công chỉ định" → tick dòng → dòng KHÔNG có ô chọn
 * thẩm phán; bấm nút "Phân công chỉ định (1 hồ sơ)" thì không mở hộp thoại nào, dòng vẫn "Chưa phân công".
 *
 *   npm run gdt:mo-tay-tptc
 *
 * Biến môi trường: QLA_MO_TAY=1 (npm script đặt sẵn) · QLA_VAI=<vai, mặc định vuTruongDanSu>
 */
import { test } from '@playwright/test';
import { choHetSpin, nghi } from '../../common/antd';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';
import { moMenu } from '../../common/menu';

test('mo-tay TPTC · mở màn phân công thẩm phán rồi dừng cho người dùng bấm', async ({ browser }, testInfo) => {
  test.skip(process.env.QLA_MO_TAY !== '1', 'Chỉ chạy khi QLA_MO_TAY=1');
  testInfo.setTimeout(60 * 60_000);

  const vai = process.env.QLA_VAI || 'vuTruongDanSu';
  const { page } = await moTrangVaiCauHinh(browser, testInfo, vai);
  await moMenu(page, ['Quản lý án GĐT/TT', 'Phân công thẩm phán']);
  await choHetSpin(page);
  await nghi(page, 1500, 2200);

  console.log(`\n→ Vai: ${vai}`);
  console.log(`   ${page.url()}`);
  console.log('\nTAB:');
  for (const t of await page.getByRole('tab').allInnerTexts().catch(() => [])) {
    console.log(`   · ${t.replace(/\s+/g, ' ').trim()}`);
  }
  console.log('\nNÚT TRÊN MÀN:');
  console.log(
    '   ' +
      [
        ...new Set(
          (await page.locator('main').getByRole('button').allInnerTexts().catch(() => []))
            .map(s => s.replace(/\s+/g, ' ').trim())
            .filter(Boolean),
        ),
      ].join(' | '),
  );
  console.log(
    '\nCẦN KIỂM: vụ xét xử của case-002 (Số TLXX 1234568658 · bản án 13 ngày 16/10/2026 · ' +
      'Tòa án nhân dân thành phố Hà Nội) — chỉ định Thẩm phán "Nguyễn Hải Trâm" bằng cách nào?\n',
  );
  await page.pause();
});
