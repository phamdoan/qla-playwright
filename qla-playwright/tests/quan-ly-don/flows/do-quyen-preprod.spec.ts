/**
 * DÒ (CHỈ ĐỌC, KHÔNG GHI): tài khoản đăng nhập được mà MENU TRỐNG — thiếu quyền ở đâu?
 *
 *   QLA_HO_SO_ENV=preprod npx playwright test --file=do-quyen-preprod
 *   QLA_VAI=canBo (mặc định) · đổi vai để dò tài khoản khác
 *
 * Vì sao cần: trên pre-prod, CẢ 30 tài khoản đã thử (22 của TANDTC + 8 của TAND tỉnh Bắc Ninh) đều
 * đăng nhập SSO thành công, vào đúng dashboard, nhưng menu bên trái KHÔNG CÓ MỤC NÀO. Nói "menu
 * trống" thì chưa đủ để ai đó đi cấp quyền: cần biết CHÍNH XÁC API nào trả về rỗng.
 *
 * Spec này bắt mọi lời gọi mạng lúc vào dashboard, rồi in ra những lời gọi liên quan tới
 * menu/quyền/người dùng kèm mã HTTP và cỡ dữ liệu trả về — đủ để chuyển cho người quản trị QTUD.
 *
 * Mô hình phân quyền (để đọc kết quả): quyền CHỨC NĂNG nằm ở schema QTUD (gán qua USER_ROLE, role
 * 000 = Toàn quyền); quyền DỮ LIỆU suy từ CAN_BO.MA_CHUC_VU. Hai tầng ĐỘC LẬP — có chức vụ trong
 * CAN_BO mà không có dòng trong USER_ROLE thì vẫn đăng nhập được và vẫn trống menu.
 */
import { test } from '@playwright/test';
import { choHetSpin, nghi } from '../../../common/antd';
import { moTrangVaiCauHinh } from '../../../common/luong-tkm';
import { khungMenu } from '../../../common/menu';

const CAT = (s: unknown, n = 120) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const DANG_QUAN_TAM = /menu|quyen|quyền|permission|role|chuc-nang|chucNang|nguoi-dung|user|auth|me\b/i;

test('dò · tài khoản đăng nhập được nhưng menu trống: API nào trả rỗng', async ({ browser }, testInfo) => {
  testInfo.setTimeout(10 * 60_000);
  const vai = process.env.QLA_VAI || 'canBo';

  const goiMang: { url: string; status: number; co: string }[] = [];
  const { page } = await moTrangVaiCauHinh(browser, testInfo, vai);

  page.on('response', async r => {
    const u = r.url();
    if (!/\/api\//.test(u) || !DANG_QUAN_TAM.test(u)) return;
    let co = '';
    try {
      const t = await r.text();
      // Đếm phần tử nếu là mảng/đối tượng có data — con số này mới là bằng chứng "rỗng"
      const j = JSON.parse(t);
      const d = j?.data ?? j;
      co = Array.isArray(d) ? `mảng ${d.length} phần tử` : `${t.length} byte`;
    } catch {
      co = '(không đọc được thân)';
    }
    goiMang.push({ url: u, status: r.status(), co });
  });

  await page.goto('dashboard', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await choHetSpin(page);
  await nghi(page, 3000, 4000);

  console.log(`\n→ Vai: ${vai}\n   URL: ${page.url()}\n`);

  const menu = khungMenu(page);
  const soMuc = await menu.getByRole('menuitem').count().catch(() => 0);
  const soLink = await menu.locator('a[href]').count().catch(() => 0);
  console.log(`MENU: ${soMuc} mục (role=menuitem) · ${soLink} liên kết <a href>`);
  if (soMuc || soLink) {
    const ds = await menu.locator('a[href]').allInnerTexts().catch(() => []);
    for (const m of ds.slice(0, 30)) console.log(`   · ${CAT(m, 60)}`);
  } else {
    console.log('   (TRỐNG — không có mục nào)');
  }

  console.log(`\nLỜI GỌI API liên quan menu/quyền (${goiMang.length}):`);
  for (const g of goiMang) {
    console.log(`   [${g.status}] ${g.co.padEnd(22)} ${CAT(g.url.replace(/^https?:\/\/[^/]+/, ''), 110)}`);
  }
  if (!goiMang.length) console.log('   (không có lời gọi nào khớp — menu có thể dựng từ dữ liệu đã nhúng sẵn)');

  console.log(
    '\nCÁCH ĐỌC: lời gọi trả HTTP 200 mà "mảng 0 phần tử" chính là chỗ thiếu quyền — tài khoản chưa\n' +
      'có dòng trong USER_ROLE của schema QTUD. HTTP 401/403 thì là chuyện khác (token/scope).\n' +
      '⚠ Spec này KHÔNG ghi gì.\n',
  );
});
