/**
 * DÒ (CHỈ ĐỌC, KHÔNG LƯU): popup "Lưu số văn bản và in báo cáo" có những ô nào, và ô Người duyệt /
 * Người ký mở ra ai.
 *
 *   QLA_MA_DON=9263 npm run don:do-lap-van-ban
 *
 * Vì sao cần: bước 27 ký tờ trình rồi DỪNG — màn ký không có ô "Đề xuất trình tiếp", nên văn bản
 * không vào hộp phê duyệt của Phó Chánh án. Giả thuyết: CHUỖI DUYỆT được định ở BƯỚC 26, lúc tạo văn
 * bản, qua hai ô Người duyệt / Người ký — chứ không phải ở màn ký.
 *
 * Trước giờ tôi chỉ đo được ô **Người ký** (6 mục, không có Phó Chánh án) vì lỗi báo về đúng ô đó.
 * Chưa đo ô **Người duyệt**. Nếu Phó Chánh án có trong ô Người duyệt thì chuỗi CVP → PCA đặt được
 * ngay ở bước 26; nếu không có ở cả hai ô thì trên môi trường này văn bản này KHÔNG đi tới PCA, và
 * đó là khác biệt NGHIỆP VỤ, không phải lỗi kịch bản.
 *
 * Spec KHÔNG bấm "Lưu văn bản" — chỉ mở popup, liệt kê, rồi đóng.
 */
import { test } from '@playwright/test';
import { choHetSpin, hienTrong, nghi } from '../../../common/antd';
import { moTrangVaiCauHinh } from '../../../common/luong-tkm';
import { moMenu } from '../../../common/menu';

const CAT = (s: unknown, n = 70) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/** Liệt kê lựa chọn của một select antd rồi ĐÓNG lại, không chọn gì */
async function dsLuaChon(page: import('@playwright/test').Page, o: import('@playwright/test').Locator) {
  const khung = o.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
  if (!(await hienTrong(khung, 4_000))) return ['(ô không hiện)'];
  await khung.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => {});
  await khung.click();
  const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  if (!(await hienTrong(dd, 8_000))) return ['(dropdown không mở)'];
  await nghi(page, 500, 800);
  const ds = await dd.locator('.ant-select-item-option-content').allInnerTexts().catch(() => [] as string[]);
  await page.keyboard.press('Escape');
  await nghi(page, 250, 400);
  return ds.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

test('dò · popup Lưu số văn bản: ô Người duyệt / Người ký mở ra ai', async ({ browser }, testInfo) => {
  testInfo.setTimeout(20 * 60_000);
  const maDon = (process.env.QLA_MA_DON || '').trim();
  const loaiVb = process.env.QLA_LOAI_VB || 'Tờ trình khác';
  const { page } = await moTrangVaiCauHinh(browser, testInfo, process.env.QLA_VAI || 'canBo');

  await moMenu(page, ['Quản lý đơn', 'Danh sách đơn']);
  await choHetSpin(page);
  await nghi(page, 1500, 2200);
  console.log(`\n→ ${page.url()}\n   mã đơn: ${maDon || '(không khai — lấy dòng đầu)'} · loại văn bản: ${loaiVb}\n`);

  // Chọn loại văn bản rồi tick đơn — hai việc bắt buộc để popup mở được
  const oLoai = page.getByRole('combobox', { name: /^Loại văn bản/ }).first();
  const dsLoai = await dsLuaChon(page, oLoai);
  console.log(`LOẠI VĂN BẢN (${dsLoai.length} mục):`);
  for (const m of dsLoai) console.log(`   · ${CAT(m)}`);

  await oLoai.click();
  const muc = page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content')
    .filter({ hasText: new RegExp(`^${loaiVb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })
    .first();
  if (!(await hienTrong(muc, 8_000))) {
    console.log(`\n⚠ Không có loại văn bản "${loaiVb}" — dừng, không mở popup.`);
    return;
  }
  await muc.click();
  await choHetSpin(page);
  await nghi(page, 1200, 1800);

  const dong = maDon
    ? page.locator('.ant-table-row').filter({ hasText: maDon }).first()
    : page.locator('.ant-table-row').first();
  if (!(await hienTrong(dong, 20_000))) {
    console.log(`\n⚠ Không thấy dòng đơn ${maDon} sau khi lọc loại văn bản — dừng.`);
    return;
  }
  await dong.locator('.ant-checkbox-input').first().check();
  await page.getByRole('button', { name: /Lưu số văn bản và in báo cáo/ }).click();
  await choHetSpin(page);
  await nghi(page, 2000, 3000);

  const modal = page.locator('.ant-modal:visible, .ant-drawer:visible').last();
  console.log(`\nPOPUP: ${CAT(await modal.locator('.ant-modal-title, .ant-drawer-title').innerText().catch(() => '(không đọc được tiêu đề)'), 60)}`);

  // Mọi select trong popup: nhãn + lựa chọn
  const nhan = await modal.locator('.ant-form-item-label label').allInnerTexts().catch(() => []);
  console.log(`\nÔ TRONG POPUP (${nhan.length}): ${nhan.map(s => CAT(s, 28)).join(' | ')}`);

  for (const ten of [/Người duyệt/i, /Người ký/i, /Cấp trình/i, /Người trình/i]) {
    const o = modal
      .locator('.ant-form-item')
      .filter({ has: page.locator('label').filter({ hasText: ten }) })
      .locator('.ant-select-selection-search-input, input')
      .first();
    if (!(await o.count())) {
      console.log(`\n── ${ten.source}: KHÔNG có ô này trong popup`);
      continue;
    }
    const ds = await dsLuaChon(page, o);
    console.log(`\n── ${ten.source} — ${ds.length} mục:`);
    for (const m of ds) console.log(`   · ${CAT(m)}`);
  }

  const nut = [
    ...new Set((await modal.getByRole('button').allInnerTexts().catch(() => [])).map(s => CAT(s, 30)).filter(Boolean)),
  ];
  console.log(`\nNÚT TRONG POPUP: ${nut.join(' | ')}`);

  console.log(
    '\nCÁCH ĐỌC: Phó Chánh án CÓ trong ô Người duyệt → chuỗi CVP → PCA đặt được ngay ở bước 26.\n' +
      'KHÔNG có ở cả Người duyệt lẫn Người ký → văn bản này không đi tới PCA trên môi trường này,\n' +
      'tức khác biệt NGHIỆP VỤ chứ không phải lỗi kịch bản.\n⚠ Spec này KHÔNG bấm "Lưu văn bản".\n',
  );
});
