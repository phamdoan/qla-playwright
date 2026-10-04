/**
 * DÒ (CHỈ ĐỌC, KHÔNG LƯU): màn Thêm mới đơn `/qla/quan-ly-don/them-moi` mở thật sự những lựa chọn
 * nào, và chọn "Loại QĐ/BA" khác nhau thì ô nào hiện / ô nào thành bắt buộc.
 *
 *   node tools/chay-ui.js stg --cli --file=do-loai-qd-ba
 *
 * Vì sao cần dò trước khi viết case: CSDL (`QTDM.DANHMUC`, `MA_LOAI_DANHMUC='LOAI_QUYET_DINH_BAN_AN'`,
 * đo 04/10/2026) có 6 giá trị — Bản án/Quyết định · Quyết định kháng nghị · Bản án · Quyết định ·
 * Công văn · Thông báo — nhưng FE có thể LỌC bớt theo màn, và mỗi giá trị có thể đổi bộ ô bắt buộc
 * (vd. "Công văn" thì "Số bản án"/"Ngày bản án" có còn bắt buộc không?). Gieo 6 case theo danh mục
 * mà không đo trước là sinh ra case chết.
 *
 * KHÔNG BẤM LƯU. Chỉ tải file đơn (bắt buộc để vào được form), bỏ qua OCR, rồi đọc màn.
 */
import { test } from '@playwright/test';
import { choHetSpin, hienTrong, nghi } from '../../../common/antd';
import { moTrangVaiCauHinh } from '../../../common/luong-tkm';
import { ThemMoiDonPage } from '../../../pages/them-moi-don.page';

/** Các select cần liệt kê lựa chọn: nhãn → id trên form */
const SELECT_CAN_DO: Record<string, string> = {
  'Loại QĐ/BA': 'thongTinBanAn_loaiQdBa',
  'Cấp xét xử': 'thongTinBanAn_capXetXu',
  'Thủ tục giải quyết': 'thongTinBanAn_thuTucGiaiQuyet',
  'Hình thức nhận': 'thongTinChiTietDon_hinhThucNhan',
  'Loại án': 'thongTinChuyenDonVO_loaiVuAn',
  'Tỉnh/Thành phố': 'thongTinChiTietDon_diaChiLienLac_maTinh',
};

/** Ô trong khối "Thông tin bản án đề nghị" cần xem hiện/ẩn và bắt buộc/không theo Loại QĐ/BA */
const O_KHOI_BAN_AN: Record<string, string> = {
  'Số bản án': 'thongTinBanAn_soBanAnQd',
  'Ngày bản án': 'thongTinBanAn_ngayBanAnQd',
  'Tòa án ra bản án': 'thongTinBanAn_maToaXetXu',
  'Cấp xét xử': 'thongTinBanAn_capXetXu',
  'Thủ tục giải quyết': 'thongTinBanAn_thuTucGiaiQuyet',
};

/** Liệt kê nhãn các lựa chọn của một select antd rồi ĐÓNG dropdown, không chọn gì */
async function dsLuaChon(page: import('@playwright/test').Page, id: string): Promise<string[]> {
  const input = page.locator(`#${id}`);
  if (!(await hienTrong(input, 5_000))) return ['(ô không hiện)'];
  const khung = input.locator(
    'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]',
  );
  await khung.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => {});
  await khung.click();
  const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
  if (!(await hienTrong(dd, 8_000))) return ['(dropdown không mở)'];
  await nghi(page, 400, 700);
  const ds = await dd
    .locator('.ant-select-item-option-content, .ant-select-tree-title')
    .allInnerTexts()
    .catch(() => [] as string[]);
  await page.keyboard.press('Escape');
  await nghi(page, 200, 400);
  return ds.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** Ô có dấu sao bắt buộc không (antd đặt class trên .ant-form-item-label > label) */
async function laBatBuoc(page: import('@playwright/test').Page, id: string): Promise<boolean | null> {
  const o = page.locator(`#${id}`);
  if (!(await o.count())) return null;
  const nhan = o.locator('xpath=ancestor::div[contains(@class,"ant-form-item")][1]//label').first();
  if (!(await nhan.count())) return null;
  return /ant-form-item-required/.test((await nhan.getAttribute('class')) || '');
}

test('dò · màn Thêm mới đơn: lựa chọn thật và ô bắt buộc theo Loại QĐ/BA', async ({ browser }, testInfo) => {
  testInfo.setTimeout(30 * 60_000);
  const { page } = await moTrangVaiCauHinh(browser, testInfo, process.env.QLA_VAI || 'canBo');
  const trang = new ThemMoiDonPage(page);

  await trang.moTuDanhSachDon({ quaMenu: true });
  await trang.taiLenFileDon();
  await trang.boQuaOcr();
  await choHetSpin(page);
  await nghi(page, 1500, 2200);
  console.log(`\n→ ${page.url()}\n`);

  console.log('════════ LỰA CHỌN THẬT CỦA TỪNG SELECT ════════');
  const luaChon: Record<string, string[]> = {};
  for (const [nhan, id] of Object.entries(SELECT_CAN_DO)) {
    const ds = await dsLuaChon(page, id);
    luaChon[nhan] = ds;
    const batBuoc = await laBatBuoc(page, id);
    console.log(
      `\n${nhan} (#${id})${batBuoc === null ? '' : batBuoc ? '  [BẮT BUỘC]' : '  [không bắt buộc]'} — ${ds.length} mục:`,
    );
    for (const m of ds.slice(0, 40)) console.log(`   · ${m}`);
    if (ds.length > 40) console.log(`   … còn ${ds.length - 40} mục`);
  }

  console.log('\n\n════════ ĐỔI "Loại QĐ/BA" → KHỐI BẢN ÁN THAY ĐỔI THẾ NÀO ════════');
  const dsLoai = (luaChon['Loại QĐ/BA'] || []).filter(s => !s.startsWith('('));
  for (const loai of dsLoai) {
    const input = page.locator('#thongTinBanAn_loaiQdBa');
    const khung = input.locator(
      'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]',
    );
    await khung.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => {});
    await khung.click();
    const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
    await hienTrong(dd, 8_000);
    const muc = dd.locator('.ant-select-item-option-content').filter({ hasText: new RegExp(`^${loai.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first();
    if (!(await hienTrong(muc, 5_000))) {
      console.log(`\n── ${loai}: KHÔNG bấm được mục này`);
      await page.keyboard.press('Escape');
      continue;
    }
    await muc.click();
    await choHetSpin(page);
    await nghi(page, 900, 1400);

    const mo: string[] = [];
    for (const [nhan, id] of Object.entries(O_KHOI_BAN_AN)) {
      const o = page.locator(`#${id}`);
      const hien = (await o.count()) > 0 && (await o.isVisible().catch(() => false));
      const bb = hien ? await laBatBuoc(page, id) : null;
      mo.push(`${nhan}=${hien ? (bb ? 'hiện/BẮT BUỘC' : 'hiện') : 'ẨN'}`);
    }
    console.log(`\n── ${loai}\n   ${mo.join(' · ')}`);
  }

  console.log(
    '\n\nKẾT LUẬN CẦN RÚT: danh sách "Loại QĐ/BA" ở trên là bộ giá trị gieo được; dòng dưới mỗi giá trị ' +
      'cho biết case của giá trị đó phải điền ô nào.\n⚠ Spec này KHÔNG lưu — không có đơn nào được tạo.\n',
  );
});
