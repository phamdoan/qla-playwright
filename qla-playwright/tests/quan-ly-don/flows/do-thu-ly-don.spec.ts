/**
 * DÒ (CHỈ ĐỌC): đơn đã tạo nhưng CHƯA CÓ SỐ THỤ LÝ — thụ lý nằm ở đâu?
 *
 *   QLA_MA_DON=9227 npm run don:do-thu-ly
 *
 * Vì sao cần: trên pre-prod, bước 24 tạo đơn xong (có id + mã đơn) nhưng ô "Ngày thụ lý" bị khoá và
 * sau khi lưu KHÔNG có số thụ lý, dù khối "Xử lý đơn" đã chọn "Thụ lý mới". Trên STG thì có. Không
 * có số thụ lý thì bước 25 (phân công thẩm phán) và 26 (tờ trình) KHÔNG THẤY ĐƠN.
 *
 * Hai khả năng, phải đo chứ không đoán:
 *   a) ô "Thụ lý đơn" ở màn này có bộ lựa chọn khác → "Thụ lý mới" không phải giá trị cấp số;
 *   b) thụ lý là HÀNH ĐỘNG RIÊNG sau khi lưu (nút trên dòng Danh sách đơn hoặc trên màn chi tiết).
 *
 * Spec in ra: giá trị + lựa chọn của khối "Xử lý đơn" trên màn chi tiết đơn, toàn bộ nút của màn, và
 * các nút trên dòng của đơn đó ở Danh sách đơn. KHÔNG bấm gì.
 */
import { test } from '@playwright/test';
import { choHetSpin, hienTrong, nghi } from '../../../common/antd';
import { moTrangVaiCauHinh } from '../../../common/luong-tkm';

const CAT = (s: unknown, n = 90) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/** Ô của khối "Xử lý đơn" cần soi */
const O_XU_LY = {
  'Thụ lý đơn': 'thongTinChuyenDonVO_trangThaiThuLyDon',
  'Ngày thụ lý': 'thongTinChuyenDonVO_ngayThuLy',
  'Số thụ lý': 'thongTinChuyenDonVO_soThuLy',
  'Đơn vị chuyển đến': 'thongTinChuyenDonVO_maDonViChuyenDenNoiBo',
  'Nơi chuyển đến': 'thongTinChuyenDonVO_noiChuyenDen',
};

test('dò · đơn chưa có số thụ lý: thụ lý nằm ở đâu', async ({ browser }, testInfo) => {
  testInfo.setTimeout(20 * 60_000);
  const maDon = process.env.QLA_MA_DON || '';
  const { page } = await moTrangVaiCauHinh(browser, testInfo, process.env.QLA_VAI || 'canBo');

  await page.goto('quan-ly-don/danh-sach-don', { waitUntil: 'domcontentloaded' });
  await choHetSpin(page);
  await nghi(page, 2000, 3000);
  console.log(`\n→ ${page.url()}\n   mã đơn cần soi: ${maDon || '(không khai — chỉ soi dòng đầu)'}\n`);

  // ── Dòng của đơn trên Danh sách đơn: có nút gì? ──
  const dong = maDon
    ? page.locator('.ant-table-row').filter({ hasText: maDon }).first()
    : page.locator('.ant-table-row').first();
  if (await hienTrong(dong, 15_000)) {
    console.log(`DÒNG ĐƠN: ${CAT(await dong.innerText().catch(() => ''), 180)}`);
    const nut = await dong.getByRole('button').allInnerTexts().catch(() => []);
    const icon = await dong.locator('button[aria-label], .anticon').evaluateAll(
      es => es.map(e => e.getAttribute('aria-label') || e.className).filter(Boolean).slice(0, 12),
    ).catch(() => []);
    console.log(`   nút trên dòng : ${nut.map(s => CAT(s, 30)).filter(Boolean).join(' | ') || '(không có nhãn chữ)'}`);
    console.log(`   icon trên dòng: ${icon.join(' | ') || '(không đọc được)'}`);
  } else {
    console.log('DÒNG ĐƠN: không thấy trên trang đầu của Danh sách đơn');
  }

  /**
   * MENU "⋯" TRÊN DÒNG — đo 04/10/2026: dòng đơn KHÔNG có nút chữ nào, chỉ hai icon
   * `clock-circle` và `more`; bấm vào dòng cũng KHÔNG mở chi tiết (URL giữ nguyên danh-sach-don).
   * Nên mọi hành động với đơn (kể cả thụ lý) phải nằm trong menu này.
   */
  if (await hienTrong(dong, 3_000)) {
    const nutMore = dong.locator('button:has(.anticon-more), .anticon-more').last();
    if (await hienTrong(nutMore, 5_000)) {
      await nutMore.click();
      await nghi(page, 700, 1100);
      const muc = await page
        .locator('.ant-dropdown:not(.ant-dropdown-hidden) li, .ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item')
        .allInnerTexts()
        .catch(() => [] as string[]);
      console.log(`\nMENU "⋯" CỦA DÒNG ĐƠN (${muc.length} mục):`);
      for (const m of muc) console.log(`   · ${CAT(m, 60)}`);
      if (!muc.length) console.log('   (không mở được dropdown)');
      await page.keyboard.press('Escape');
      await nghi(page, 300, 500);
    } else {
      console.log('\nMENU "⋯": không thấy icon more trên dòng');
    }
  }

  // ── Nút của chính màn Danh sách đơn (thụ lý có thể là hành động hàng loạt) ──
  const nutMan = [
    ...new Set(
      (await page.locator('main').getByRole('button').allInnerTexts().catch(() => []))
        .map(s => CAT(s, 36))
        .filter(Boolean),
    ),
  ];
  console.log(`\nNÚT CỦA MÀN DANH SÁCH ĐƠN (${nutMan.length}):\n   ${nutMan.join(' | ')}`);

  // ── Mở chi tiết đơn rồi soi khối "Xử lý đơn" ──
  if (await hienTrong(dong, 3_000)) {
    await dong.click();
    await choHetSpin(page);
    await nghi(page, 2500, 3500);
    console.log(`\n→ chi tiết đơn: ${page.url()}\n`);
    console.log('KHỐI "XỬ LÝ ĐƠN":');
    for (const [nhan, id] of Object.entries(O_XU_LY)) {
      const o = page.locator(`#${id}`);
      if (!(await o.count())) {
        console.log(`   ${nhan.padEnd(20)} (không có ô này trên màn)`);
        continue;
      }
      const hien = await o.isVisible().catch(() => false);
      const suaDuoc = await o.isEditable().catch(() => false);
      let gt = await o.inputValue().catch(() => '');
      if (!gt) {
        gt = CAT(
          await o
            .locator('xpath=ancestor::div[contains(@class,"ant-select")][1]//span[contains(@class,"selection-item")]')
            .innerText()
            .catch(() => ''),
          40,
        );
      }
      console.log(
        `   ${nhan.padEnd(20)} hiện=${hien ? 'có' : 'KHÔNG'} · sửa được=${suaDuoc ? 'có' : 'KHÔNG'} · giá trị="${gt || '(trống)'}"`,
      );
    }
    const nutChiTiet = [
      ...new Set(
        (await page.locator('main').getByRole('button').allInnerTexts().catch(() => []))
          .map(s => CAT(s, 36))
          .filter(Boolean),
      ),
    ];
    console.log(`\nNÚT CỦA MÀN CHI TIẾT ĐƠN (${nutChiTiet.length}):\n   ${nutChiTiet.join(' | ')}`);
  }

  console.log(
    '\nCÁCH ĐỌC: nếu "Thụ lý đơn" sửa được mà "Số thụ lý" trống → giá trị đang chọn không phải giá trị\n' +
      'cấp số. Nếu có nút tên kiểu "Thụ lý" ở dòng hoặc ở màn chi tiết → thụ lý là hành động riêng,\n' +
      'phải thêm một bước, không phải một ô.\n⚠ Spec này KHÔNG bấm gì.\n',
  );
});
