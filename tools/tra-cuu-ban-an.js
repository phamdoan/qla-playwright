/**
 * Tra cứu một bản án trên môi trường bất kỳ — CHỈ ĐỌC (HTTP GET), không tạo/sửa dữ liệu.
 * Dùng khi cần tự kiểm tra "bản án này có trong hệ thống không" mà không muốn mở màn Thêm mới đơn
 * (màn đó bắt buộc tải tài liệu lên, tức là đã ghi dữ liệu).
 *
 *   node tools/tra-cuu-ban-an.js <stg|dev> <số bản án> <dd/mm/yyyy> ["tên tòa"] [cấp xét xử]
 *
 * Ví dụ:
 *   node tools/tra-cuu-ban-an.js stg 23243 14/11/2024 "Tòa án nhân dân khu vực 9 - Hà Nội"
 *
 * Cần session của tài khoản luồng nhập đơn; hết hạn thì đăng nhập lại:
 *   npm run staging -- --project=setup-tai-khoan-moi      (hoặc npm run dev -- --project=setup-tai-khoan-moi)
 */
const path = require('path');
const { chromium } = require('@playwright/test');

const MOI_TRUONG = {
  stg: 'https://qla-stg.toaan.gov.vn',
  dev: 'https://qla-dev.toaan.gov.vn',
  uat: 'https://qla-uat.toaan.gov.vn',
};
const GIAI_DOAN = { 'Sơ thẩm': 'SO_THAM', 'Phúc thẩm': 'PHUC_THAM', 'Giám đốc thẩm': 'GIAM_DOC_THAM', 'Tái thẩm': 'GIAM_DOC_THAM' };

const [env = 'stg', soBanAn, ngay, tenToa = 'Tòa án nhân dân khu vực 9 - Hà Nội', capXetXu = 'Sơ thẩm'] = process.argv.slice(2);
const origin = MOI_TRUONG[env] || env;

if (!soBanAn || !ngay) {
  console.log('Cú pháp: node tools/tra-cuu-ban-an.js <stg|dev> <số bản án> <dd/mm/yyyy> ["tên tòa"] [cấp xét xử]');
  process.exit(1);
}

const ngayIso = (() => {
  const m = String(ngay).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ngay;
})();

(async () => {
  const auth = path.resolve(__dirname, `../playwright/.auth/tai-khoan-moi.${env}.json`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ storageState: auth, ignoreHTTPSErrors: true }).catch(() => null);
  if (!ctx) {
    console.log(`Chưa có phiên đăng nhập ${auth}\n→ chạy: npm run ${env === 'dev' ? 'dev' : 'staging'} -- --project=setup-tai-khoan-moi`);
    await browser.close();
    process.exit(1);
  }
  const page = await ctx.newPage();
  let token = null;
  page.on('request', r => {
    const a = r.headers()['authorization'];
    if (a && !token) token = a;
  });
  await page.goto(`${origin}/qla/dashboard`);
  await page.waitForTimeout(6000);
  if (!token) {
    console.log(`Phiên đã hết hạn → chạy lại: npm run ${env === 'dev' ? 'dev' : 'staging'} -- --project=setup-tai-khoan-moi`);
    await browser.close();
    process.exit(1);
  }
  const H = { authorization: token, accept: 'application/json' };
  const api = `${origin}/qla/api/v1`;

  // 1. Mã đơn vị của tòa theo tên (API trả mã ở trường "ma")
  const rDv = await ctx.request.get(`${api}/don-vi?tenDonVi=${encodeURIComponent(tenToa)}&page=0&size=50`, { headers: H });
  const dsDv = (await rDv.json().catch(() => ({})))?.data?.data || [];
  const donVi = dsDv.find(d => (d.tenDonVi || '').trim() === tenToa.trim()) || dsDv[0];
  if (!donVi) {
    console.log(`Danh mục đơn vị của ${env} không có tòa "${tenToa}"`);
    await browser.close();
    process.exit(2);
  }
  console.log(`Tòa: ${donVi.tenDonVi} (${donVi.ma})`);

  // 2. Tra cứu bản án (đúng API mà nút kính lúp trên màn Thêm mới đơn gọi)
  const qs = `soBanAn=${encodeURIComponent(soBanAn)}&ngayBanAn=${ngayIso}&maDonVi=${donVi.ma}&quyetDinhBanAn=BAN_AN&giaiDoan=${GIAI_DOAN[capXetXu] || 'SO_THAM'}`;
  const d = (await (await ctx.request.get(`${api}/don/tra-cuu-ban-an-cu?${qs}`, { headers: H })).json().catch(() => ({})))?.data;
  if (!d) {
    console.log(`KHÔNG có bản án số ${soBanAn} ngày ${ngay} (${capXetXu}) của tòa này trên ${env}`);
    await browser.close();
    process.exit(3);
  }
  console.log(`Bản án ${d.soBanAn} ngày ${d.ngayBanAn} → vụ án ${d.maVuAn} | ${d.tenVuAn} | trạng thái: ${d.trangThaiBanAn}`);

  // 3. Người trong vụ án (đúng danh sách ô "Chọn người từ bản án cũ" đổ ra)
  if (d.idVuAn) {
    const n = await (await ctx.request.get(`${api}/don/vu-an-cu/${d.idVuAn}/ds-nguoi?idBanAn=${d.idBanAn || ''}`, { headers: H })).json().catch(() => ({}));
    const ds = (n?.data || []).map(x => x.tenDoiTuongLienQuan || x.conNguoi?.conNguoi?.hoTen).filter(Boolean);
    console.log(`Người trong vụ án: ${ds.join(', ') || '(trống)'}`);
  }
  await browser.close();
})();
