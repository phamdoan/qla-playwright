/**
 * MỞ TAY · VỤ ÁN GĐT — không phải bước của flow.
 *
 * Dựng để trả lời đúng một câu: **vì sao tab "Tờ trình" của vụ án GĐT bị khoá?**
 * FE khoá tab đó khi `vuAn.danhSachPhanCong` chưa có ĐỦ Thẩm tra viên + Lãnh đạo vụ
 * (`qla-webapp/src/pages/VuAn/GdtTt/QuanLyAn/ChiTietVuAnGDT/index.tsx:262-286`), trong khi phân công
 * theo ĐƠN đã có cả hai người (kiểm được trên dòng đơn ở màn "Phân công thẩm tra viên").
 *
 * Spec này mở sẵn chi tiết vụ, IN RA trạng thái từng thẻ tab + nội dung tab "Phân công", rồi DỪNG
 * (`page.pause()`) để bạn tự bấm.
 *
 *   npm run gdt:mo-tay                       mở bằng vai Thẩm tra viên (người bị chặn ở bước 34)
 *   QLA_VAI=vuTruongDanSu npm run gdt:mo-tay mở bằng vai Vụ trưởng (người đi phân công)
 *   QLA_VAI=thuKyVuDanSu  npm run gdt:mo-tay mở bằng vai Thư ký Vụ
 *
 * Biến môi trường:
 *   QLA_MO_TAY=1           bắt buộc (npm script đã đặt sẵn)
 *   QLA_MO_TAY_ID=<id>     id vụ án GĐT (mặc định: vụ của case-001 trên STG)
 *   QLA_MO_TAY_TAB=<khoá>  khoá tab mở đầu: phan-cong | to-trinh | danh-sach-don | thong-tin-vu-an
 *   QLA_VAI=<khoá tài khoản trong config/luong-gdt.json>
 */
import { test } from '@playwright/test';
import { choHetSpin, nghi } from '../../common/antd';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';

/** Vụ án GĐT của case-001 trên STG — sinh từ đơn 10889 (số thụ lý 1234568633, bản án PT số 12) */
const ID_MAC_DINH = 'ca68d0a0-e0a5-498c-905c-009c76da0dfc';

test('mo-tay GĐT · mở sẵn chi tiết vụ án rồi dừng cho người dùng bấm', async ({ browser }, testInfo) => {
  test.skip(process.env.QLA_MO_TAY !== '1', 'Chỉ chạy khi QLA_MO_TAY=1');
  testInfo.setTimeout(60 * 60_000); // một giờ để thao tác tay

  const id = process.env.QLA_MO_TAY_ID || ID_MAC_DINH;
  const khoaTab = process.env.QLA_MO_TAY_TAB || 'phan-cong';
  const vai = process.env.QLA_VAI || 'thamTraVienDanSu';
  const { page } = await moTrangVaiCauHinh(browser, testInfo, vai);

  /**
   * ĐI BẰNG URL `?tab=`, không bấm thẻ tab: ở màn này cú click vào thẻ tab KHÔNG đổi tab (đo
   * 02/10/2026, thử cả helper dùng chung lẫn click force), còn `?tab=` thì FE đọc đúng.
   */
  await page.goto(`vu-an/gdt-tt/quan-ly-an/chi-tiet?id=${id}&tab=${khoaTab}`, {
    waitUntil: 'domcontentloaded',
  });
  await choHetSpin(page);
  await nghi(page, 2000, 2500);

  console.log(`\n→ Vai đăng nhập: ${vai}`);
  console.log(`→ Vụ án GĐT: ${id}`);
  console.log(`   ${page.url()}\n`);

  // Trạng thái từng thẻ tab: thẻ nào đang chọn, thẻ nào BỊ KHOÁ
  const tab = await page
    .locator('[role="tab"]')
    .evaluateAll(ds =>
      ds.map(e => {
        const chu = (e.textContent || '').replace(/\s+/g, ' ').trim();
        const khoa =
          e.getAttribute('aria-disabled') === 'true' || /ant-tabs-tab-disabled/.test(e.className || '');
        return `${chu || '(không chữ)'}${e.getAttribute('aria-selected') === 'true' ? ' «đang chọn»' : ''}${
          khoa ? ' [BỊ KHOÁ]' : ''
        }`;
      }),
    )
    .catch(() => [] as string[]);
  console.log('THẺ TAB:');
  for (const t of tab) console.log(`   · ${t}`);

  console.log('\nNÚT TRÊN MÀN:');
  const nut = [
    ...new Set(
      (await page.locator('main').getByRole('button').allInnerTexts().catch(() => []))
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    ),
  ];
  console.log(`   ${nut.join(' | ') || '(không có nút nào)'}`);

  console.log('\nDÒNG TRONG BẢNG:');
  const dong = (await page.locator('main .ant-table-row:visible').allInnerTexts().catch(() => []))
    .slice(0, 8)
    .map(s => s.replace(/\s+/g, ' ').trim().slice(0, 160));
  if (!dong.length) console.log('   (bảng rỗng)');
  for (const d of dong) console.log(`   · ${d}`);

  console.log(
    '\nCẦN KIỂM: tab "Tờ trình" có bị khoá không, và ở đâu phân công được Thẩm tra viên + Lãnh đạo vụ' +
      ' cho CHÍNH VỤ này (không phải cho đơn).\n',
  );
  await page.pause();
});
