/**
 * In link kiểm tra dữ liệu của một đơn theo TỪNG BƯỚC của "Luồng nhập data.txt" — chỉ đọc (GET),
 * không tạo/sửa gì.
 *
 *   node tools/link-du-lieu.js <stg|dev> <mã đơn>
 *   node tools/link-du-lieu.js stg 8654
 *
 * Phiên hết hạn thì đăng nhập lại:
 *   npm run staging -- --project=setup-tai-khoan-moi
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const MOI_TRUONG = { stg: 'https://qla-stg.toaan.gov.vn', dev: 'https://qla-dev.toaan.gov.vn', uat: 'https://qla-uat.toaan.gov.vn' };
const [env = 'stg', maDon] = process.argv.slice(2);
const origin = MOI_TRUONG[env] || env;
const QLA = `${origin}/qla`;

if (!maDon) {
  console.log('Cú pháp: node tools/link-du-lieu.js <stg|dev> <mã đơn>');
  process.exit(1);
}

const phien = () => {
  // lấy phiên mới nhất trong các file auth của luồng này (phiên cũ hay hết hạn)
  const ds = [`../playwright/.auth/tai-khoan-moi.${env}.json`, `../playwright/.auth/tai-khoan-moi-canbo.${env}.json`]
    .map(f => path.resolve(__dirname, f))
    .filter(p => fs.existsSync(p))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return ds[0] || null;
};

(async () => {
  const auth = phien();
  if (!auth) {
    console.log(`Chưa có phiên đăng nhập cho ${env} → npm run ${env === 'dev' ? 'dev' : 'staging'} -- --project=setup-tai-khoan-moi`);
    process.exit(1);
  }
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ storageState: auth, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  let token = null;
  page.on('request', r => {
    const a = r.headers()['authorization'];
    if (a && !token) token = a;
  });

  // 1. Tìm đơn theo mã (lấy id từ data-row-key của dòng bảng)
  // Route được dựng từ menu: phải vào dashboard trước, goto thẳng sẽ ra trang trống
  await page.goto(`${QLA}/dashboard`);
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(4_000);
  if (page.url().includes('/sso/')) {
    console.log(`Phiên ${env} đã hết hạn → npm run ${env === 'dev' ? 'dev' : 'staging'} -- --project=setup-tai-khoan-moi`);
    await browser.close();
    process.exit(1);
  }
  await page.goto(`${QLA}/quan-ly-don/danh-sach-don`);
  const o = page.getByPlaceholder('Nhập bất kỳ thông tin nào (người gửi, nội dung...)');
  await o.waitFor({ timeout: 60_000 });
  await o.fill(maDon);
  await page.getByRole('button', { name: /Tìm kiếm$/ }).click();
  await page.waitForTimeout(4_000);
  const row = page.locator('.ant-table-row').filter({ hasText: `Mã đơn: ${maDon}` }).first();
  if (!(await row.count())) {
    console.log(`Không thấy đơn ${maDon} trên ${env}`);
    await browser.close();
    process.exit(2);
  }
  const idDon = await row.getAttribute('data-row-key');
  const moTa = (await row.innerText()).replace(/\s+/g, ' ');
  const soThuLy = (moTa.match(/Số TL:\s*(\d+)/) || [])[1] || '';
  const thamPhan = (moTa.match(/Thẩm phán:\s*([^(]+)/) || [])[1]?.trim() || '';

  // 2. Văn bản của đơn (tờ trình, thông báo) qua API danh sách văn bản trình ký
  const H = () => ({ authorization: token, accept: 'application/json' });
  const api = `${QLA}/api/v1`;
  let vanBan = [];
  if (token) {
    const r = await ctx.request.get(`${api}/van-ban-trinh-ky/v2?idDon=${idDon}&page=0&size=100`, { headers: H() });
    const j = await r.json().catch(() => null);
    vanBan = j?.data?.content || j?.data?.data || j?.data || [];
    if (!Array.isArray(vanBan)) vanBan = [];
    // API trả cả văn bản của đơn khác nếu bộ lọc không được áp dụng → lọc lại theo đúng đơn
    vanBan = vanBan.filter(v => v.idDon === idDon || String(v.maDon || '') === String(maDon));
  }

  const in_ = (nhan, gt) => console.log(`   ${nhan.padEnd(22)}${gt}`);
  console.log(`\n════ ĐƠN ${maDon} — ${env.toUpperCase()} ════`);
  console.log(`   ${moTa.slice(0, 220)}`);
  console.log(`   id đơn: ${idDon}${soThuLy ? ` | số thụ lý: ${soThuLy}` : ''}${thamPhan ? ` | thẩm phán: ${thamPhan}` : ''}`);

  console.log(`\n■ Bước 1–2 · Nhập đơn`);
  in_('Xem chi tiết đơn', `${QLA}/quan-ly-don/chi-tiet/${idDon}`);
  in_('Hồ sơ đơn', `${QLA}/quan-ly-don/ho-so-don?id=${idDon}`);
  in_('Sửa (màn nhập liệu)', `${QLA}/quan-ly-don/them-moi/${idDon}`);

  console.log(`\n■ Bước 3 · Phân công thẩm phán`);
  in_('Màn phân công', `${QLA}/quan-ly-don/phan-cong-tham-phan`);
  console.log(`   → tab "Quản lý kết quả phân công" › Nâng cao › Số thụ lý = ${soThuLy || '(chưa thụ lý)'}`);

  console.log(`\n■ Bước 4–5 · Văn bản của đơn`);
  in_('Danh sách văn bản', `${QLA}/quan-ly-don/danh-sach-van-ban`);
  if (!vanBan.length) console.log(`   (không đọc được danh sách văn bản qua API — lọc tay theo mã đơn ${maDon})`);
  for (const v of vanBan) {
    const id = v.id || v.idVanBan;
    const ten = v.tenVanBan || v.tenBieuMau || v.maBieuMau || '';
    const so = v.soVanBan || v.soKyHieu || v.soHieu || '';
    console.log(`   • ${ten}${so ? ` — số ${so}` : ''} | trạng thái: ${v.trangThaiHienThi || v.trangThai || '?'}`);
    if (id) console.log(`     xem file: ${QLA}/file-viewer/${id}?mode=VIEW`);
  }

  console.log(`
■ Quản lý vụ án (Vụ GĐKT) — cần tài khoản của Vụ, HCTP/Văn phòng không vào được`);
  in_('Danh sách vụ án GĐT', `${QLA}/vu-an/gdt-tt/quan-ly-an/danh-sach`);
  in_('Đơn tại Vụ (chi tiết)', `${QLA}/vu-an/gdt-tt/quan-ly-an/chi-tiet-don/${idDon}`);
  console.log(`   → lọc Số thụ lý ${soThuLy || ''}; đơn chưa thụ lý thành vụ án thì dòng mang khoá "don-<id đơn>"`);
  console.log(`   Khi đã thụ lý thành vụ án GĐT: ${QLA}/vu-an/gdt-tt/quan-ly-an/chi-tiet?id=<id vụ án>`);

  console.log(`\n■ Bước 6–9 · Ký / phê duyệt`);
  in_('Công tác lãnh đạo', `${QLA}/lanh-dao/phe-duyet-de-xuat`);
  console.log(`   → tab "Chờ duyệt" (chưa xử lý) hoặc "Tất cả" (đã duyệt xong)`);
  console.log('');
  await browser.close();
})();
