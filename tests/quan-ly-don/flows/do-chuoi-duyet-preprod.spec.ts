/**
 * DÒ (CHỈ ĐỌC, KHÔNG LƯU): trên pre-prod, VAI NÀO lập được tờ trình có CHUỖI DUYỆT tới Phó Chánh án.
 *
 *   QLA_MA_DON=9272 npm run don:do-chuoi-duyet
 *   QLA_MA_DON=9272 QLA_VAI=vuTruong,thamTraVienDanSu npm run don:do-chuoi-duyet
 *
 * VÌ SAO CẦN — bước 27 của luồng GĐT trên pre-prod dừng với:
 *     "màn ký KHÔNG có ô Đề xuất trình tiếp → chỉ ký, KHÔNG chuyển cho ai"
 * và bước 28 không tìm thấy tờ trình trong hộp phê duyệt của Phó Chánh án.
 *
 * Tôi đã đo một lần với vai `canBo` (Đồng Khánh Ly — VĂN PHÒNG) và kết luận "môi trường này không
 * có chuỗi duyệt tới PCA". Kết luận đó dựa trên MỘT vai, trong khi bộ tài khoản pre-prod chia quyền
 * theo ĐƠN VỊ:
 *     · Văn phòng                              — Hạnh (CVP), Vân Trang (PCVP), Khánh Ly, Thị Loan
 *     · Phòng Giám đốc, kiểm tra, thanh tra     — Ngô Xuân Ninh (TP), Hồng Nhung (PTP)
 *     · TAND tỉnh Bắc Ninh                      — Trọng Trường (PCA), Lệ Hường (CA)
 * Đơn GĐT do Phòng Giám đốc kiểm tra xử lý, nên rất có thể danh mục "Loại văn bản" và ô "Người ký"
 * của vai Phòng GĐKT khác hẳn của Văn phòng — đó là điều PHẢI ĐO, không được đoán tiếp.
 *
 * Spec in cho TỪNG VAI: danh mục Loại văn bản · các ô trong popup "Lưu số văn bản" · lựa chọn của
 * Người duyệt / Người ký / Cấp trình / Người trình. KHÔNG bấm "Lưu văn bản".
 */
import { test } from '@playwright/test';
import { choHetSpin, hienTrong, nghi } from '../../../common/antd';
import { moTrangVaiCauHinh } from '../../../common/luong-tkm';
import { moMenu } from '../../../common/menu';

const CAT = (s: unknown, n = 70) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/** Vai mặc định: hai đầu của giả thuyết — Văn phòng (đã đo) và Phòng Giám đốc kiểm tra (chưa đo) */
const VAI = (process.env.QLA_VAI || 'canBo,vuTruong,thamTraVienDanSu,chanhVanPhong')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

/** Liệt kê lựa chọn của một select antd rồi ĐÓNG lại, không chọn gì */
async function dsLuaChon(page: import('@playwright/test').Page, o: import('@playwright/test').Locator) {
  const khung = o.locator(
    'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]',
  );
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

for (const vai of VAI) {
  test(`dò · chuỗi duyệt văn bản với vai "${vai}"`, async ({ browser }, testInfo) => {
    testInfo.setTimeout(15 * 60_000);
    const maDon = (process.env.QLA_MA_DON || '').trim();
    const { page } = await moTrangVaiCauHinh(browser, testInfo, vai);

    await moMenu(page, ['Quản lý đơn', 'Danh sách đơn']);
    await choHetSpin(page);
    await nghi(page, 1500, 2200);
    console.log(`\n${'═'.repeat(78)}\n═ VAI ${vai}\n${'═'.repeat(78)}\n→ ${page.url()}`);

    const oLoai = page.getByRole('combobox', { name: /^Loại văn bản/ }).first();
    if (!(await hienTrong(oLoai, 15_000))) {
      console.log('⚠ Màn Danh sách đơn không có ô "Loại văn bản" cho vai này — vai không lập văn bản ở đây.');
      return;
    }
    const dsLoai = await dsLuaChon(page, oLoai);
    console.log(`\nLOẠI VĂN BẢN (${dsLoai.length} mục):`);
    for (const m of dsLoai) console.log(`   · ${CAT(m)}`);

    /**
     * Ưu tiên đúng loại văn bản mà bước 26 CẦN; không có thì lùi dần. Bước 26 trên pre-prod đã phải
     * lùi về "Tờ trình khác" vì danh mục không có "Tờ trình phân công thẩm phán" — nếu vai Phòng
     * GĐKT có loại đúng thì chính vai mới là chỗ sai, không phải môi trường thiếu tính năng.
     */
    const uuTien = ['Tờ trình phân công thẩm phán', 'Thông báo phân công TP', 'Tờ trình khác'];
    const loaiDung = uuTien.find(t => dsLoai.some(m => m === t));
    console.log(`\n→ loại văn bản dùng để mở popup: ${loaiDung || '(không có loại nào trong danh sách ưu tiên)'}`);
    if (!loaiDung) return;

    await oLoai.click();
    const muc = page
      .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content')
      .filter({ hasText: new RegExp(`^${loaiDung.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })
      .first();
    if (!(await hienTrong(muc, 8_000))) {
      console.log('⚠ không chọn được loại văn bản vừa tìm ra — dừng.');
      return;
    }
    await muc.click();
    await choHetSpin(page);
    await nghi(page, 1200, 1800);

    const dong = maDon
      ? page.locator('.ant-table-row').filter({ hasText: maDon }).first()
      : page.locator('.ant-table-row').first();
    if (!(await hienTrong(dong, 20_000))) {
      console.log(`⚠ Không thấy dòng đơn ${maDon || '(dòng đầu)'} sau khi lọc loại văn bản — dừng.`);
      return;
    }
    await dong.locator('.ant-checkbox-input').first().check();
    await page.getByRole('button', { name: /Lưu số văn bản và in báo cáo/ }).click();
    await choHetSpin(page);
    await nghi(page, 2000, 3000);

    const modal = page.locator('.ant-modal:visible, .ant-drawer:visible').last();
    const nhan = await modal.locator('.ant-form-item-label label').allInnerTexts().catch(() => []);
    console.log(`\nPOPUP có ${nhan.length} ô: ${nhan.map(s => CAT(s, 26)).join(' | ')}`);

    for (const ten of [/Người duyệt/i, /Người ký/i, /Cấp trình/i, /Người trình/i]) {
      const o = modal
        .locator('.ant-form-item')
        .filter({ has: page.locator('label').filter({ hasText: ten }) })
        .locator('.ant-select-selection-search-input, input')
        .first();
      if (!(await o.count())) {
        console.log(`\n── ${ten.source}: KHÔNG có ô này`);
        continue;
      }
      const ds = await dsLuaChon(page, o);
      const coPca = ds.some(m => /Trọng Trường|Phó Chánh án/i.test(m));
      console.log(`\n── ${ten.source} — ${ds.length} mục${coPca ? '  ★ CÓ Phó Chánh án' : ''}:`);
      for (const m of ds) console.log(`   · ${CAT(m)}`);
    }

    console.log(
      '\nCÁCH ĐỌC: vai nào có ô "Người duyệt" HOẶC có Phó Chánh án trong "Người ký" thì chuỗi\n' +
        'CVP → PCA đặt được ở bước 26 bằng vai đó. Không vai nào có → khác biệt nghiệp vụ thật.\n' +
        '⚠ Spec này KHÔNG bấm "Lưu văn bản".\n',
    );
  });
}
