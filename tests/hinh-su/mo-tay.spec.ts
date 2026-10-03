/**
 * MỞ TAY · HÌNH SỰ — không phải bước của flow.
 *
 * Mở sẵn vụ án hình sự bằng phiên đã đăng nhập, IN RA những thứ đang nghi ngờ, rồi DỪNG LẠI
 * (`page.pause()`) để bạn tự bấm và quan sát.
 *
 * Dựng để trả lời đúng một câu: **lập "Quyết định đưa vụ án ra xét xử sơ thẩm" (020) ở đâu?**
 * Kịch bản đã thử 4 đường, cả STG và UAT đều tắc (xem `docs/man-hinh-su-so-tham.md` mục 4).
 *
 *   npm run hs:mo-tay              mở vụ trên STG, tab Xét xử
 *   npm run hs:mo-tay:uat          mở vụ trên UAT
 *
 * Biến môi trường:
 *   QLA_MO_TAY=1          bắt buộc (npm script đã đặt sẵn), để không chạy lẫn trong lượt chạy flow
 *   QLA_MO_TAY_ID=<id>    id vụ án; mặc định lấy theo môi trường
 *   QLA_MO_TAY_TAB=<tên>  tab cần mở (mặc định "Xét xử")
 */
import { test } from '@playwright/test';
import { choHetSpin, nghi } from '../../common/antd';
import { moKhoi, moTabVaCho } from '../../common/bieu-mau';
import { moTrangVaiCauHinh } from '../../common/luong-tkm';
import { INPUT } from '../../data/hinh-su/flow-001-so-tham/case-001/input';

/** Vụ án đã chạy tới bước 04 (thụ lý + 3 quyết định phân công đã ký) trên từng môi trường */
const ID_THEO_MOI_TRUONG: Record<string, string> = {
  stg: '22583e11-a3b3-4513-aab0-d41165e269da',
  uat: 'cfa8eff6-2480-4261-9654-7fc17312454e', // VA26-002448, số thụ lý 54357
};

test('mo-tay hình sự · mở sẵn vụ án rồi dừng cho người dùng bấm', async ({ browser }, testInfo) => {
  test.skip(process.env.QLA_MO_TAY !== '1', 'Chỉ chạy khi QLA_MO_TAY=1');
  testInfo.setTimeout(60 * 60_000); // một giờ để thao tác tay

  const env = process.env.QLA_ENV || 'stg';
  const id = process.env.QLA_MO_TAY_ID || ID_THEO_MOI_TRUONG[env] || ID_THEO_MOI_TRUONG.stg;
  const tenTab = process.env.QLA_MO_TAY_TAB || 'Xét xử';
  const { page } = await moTrangVaiCauHinh(browser, testInfo, process.env.QLA_VAI || INPUT.vaiToaKhuVuc);

  await page.goto(`vu-an/so-tham/chi-tiet?id=${id}&tab=thong-tin-chung`, {
    waitUntil: 'domcontentloaded',
  });
  await choHetSpin(page);
  console.log(`\n→ Môi trường ${env.toUpperCase()} · vụ án ${id}`);
  console.log(`   ${page.url()}`);

  const header = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  console.log(`   ${/Mã vụ án:.{0,160}/.exec(header)?.[0] || '(không đọc được header)'}`);

  await moTabVaCho(page, tenTab, undefined, /./);
  await nghi(page, 1200, 1600);

  /**
   * Mở HẾT khối thu gọn rồi in nút của từng khối. Khối antd đóng thì KHÔNG render nội dung — đó là
   * lý do ba lần "không thấy nút" của kịch bản, nên ở đây mở sẵn để bạn nhìn thấy mọi thứ.
   */
  const khoi = page.locator('.ant-collapse-item, .ant-card');
  console.log(`\n── KHỐI TRONG TAB "${tenTab}" (${await khoi.count()}) ──`);
  for (let i = 0; i < (await khoi.count()); i++) {
    const k = khoi.nth(i);
    const tieuDe = (
      await k.locator('.ant-collapse-header, .ant-card-head').first().innerText().catch(() => '')
    )
      .replace(/\s+/g, ' ')
      .trim();
    if (tieuDe) await moKhoi(page, new RegExp(tieuDe.slice(0, 28).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).catch(() => {});
    const nut = [
      ...new Set(
        (await k.getByRole('button').allInnerTexts().catch(() => []))
          .map(s => s.replace(/\s+/g, ' ').trim())
          .filter(Boolean),
      ),
    ];
    console.log(`   [${i}] ${tieuDe || '(không tiêu đề)'}`);
    if (nut.length) console.log(`        nút: ${nut.slice(0, 12).join(' | ')}`);
  }

  /**
   * In danh sách của MỌI nút "Thêm biểu mẫu" trên tab — đây chính là chỗ thiếu mẫu 020. Mở từng
   * dropdown, đọc, rồi Escape để không chắn màn khi bạn nhận quyền điều khiển.
   */
  const nutThem = page.getByRole('button', { name: /Thêm biểu mẫu|Thêm mới quyết định/i });
  console.log(`\n── DANH SÁCH BIỂU MẪU (${await nutThem.count()} nút "Thêm biểu mẫu") ──`);
  for (let i = 0; i < (await nutThem.count()); i++) {
    await nutThem.nth(i).click().catch(() => {});
    await nghi(page, 900, 1300);
    const muc = (
      await page
        .locator('.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item')
        .allInnerTexts()
    )
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    console.log(`   [${i}] ${muc.length} mẫu:`);
    for (const m of muc) console.log(`        · ${m}`);
    await page.keyboard.press('Escape');
    await nghi(page, 400, 700);
  }

  // Nút bị vô hiệu + tooltip của nó: đúng chỗ mâu thuẫn giữa hai câu hướng dẫn của hệ thống
  const nutMo = page.getByRole('button', { name: /^Mở phiên tòa$|Đăng ký lịch xét xử mới/i }).first();
  if (await nutMo.count()) {
    const tat = await nutMo.isDisabled().catch(() => false);
    console.log(`\n── NÚT "Mở phiên tòa" ── ${tat ? 'BỊ VÔ HIỆU' : 'dùng được'}`);
    if (tat) {
      await nutMo.hover().catch(() => {});
      await nghi(page, 900, 1300);
      const tip = (await page.locator('.ant-tooltip-inner:visible').first().innerText().catch(() => '')).trim();
      console.log(`   tooltip: ${tip || '(không có)'}`);
    }
  }

  console.log(
    '\n→ CÂU CẦN TRẢ LỜI: lập "Quyết định đưa vụ án ra xét xử sơ thẩm" (020) ở đâu trên màn này?',
  );
  console.log('   Playwright Inspector sẽ mở. Bấm Resume (▶) khi xong để đóng trình duyệt.\n');
  await page.pause();
});
