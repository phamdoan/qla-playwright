/**
 * Chạy test ĐĂNG NHẬP (tests/dang-nhap/dang-nhap.spec.ts) trên một môi trường.
 *
 *   node tools/chay-dang-nhap.js preprod                        tất cả tài khoản trên e-qlta-uat
 *   npm run dang-nhap preprod
 *   npm run dang-nhap stg                                       trên STG
 *   npm run dang-nhap preprod -- --tai-khoan=cvpTuongLinh       một (hoặc vài, phân cách bằng dấu phẩy)
 *   npm run dang-nhap preprod -- --workers=1 --hien             chạy tuần tự, mở trình duyệt thật
 *   npm run dang-nhap preprod -- --liet-ke                     chỉ in danh sách test, không mở trình duyệt
 *
 * Phải đặt QLA_HO_SO_ENV ở đây: npx ghi đè npm_lifecycle_event nên playwright.config.ts không
 * suy ra được hồ sơ .env từ tên script (xem tools/chay-ui.js).
 */
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const lay = (ten) => (args.find((a) => a.startsWith(`--${ten}=`)) || '').split('=')[1];

const HO_SO = { preprod: 'preprod', uat: 'uat', dev: 'dev', stg: 'staging', staging: 'staging' };
const moiTruong = args.find((a) => !a.startsWith('-'));
if (!moiTruong || !HO_SO[moiTruong]) {
  throw new Error(
    `Phải nêu môi trường: ${Object.keys(HO_SO).join(' | ')}` +
      `${moiTruong ? ` (nhận được "${moiTruong}")` : ''}. Vd: npm run dang-nhap preprod`,
  );
}

const env = { ...process.env, QLA_HO_SO_ENV: HO_SO[moiTruong] };

const lenh = ['playwright', 'test', '--project=dang-nhap', `--workers=${lay('workers') || 4}`];
if (args.includes('--hien')) lenh.push('--headed');
// --liet-ke: chỉ in danh sách test, KHÔNG mở trình duyệt (kiểm tra cấu hình/danh sách tài khoản)
if (args.includes('--liet-ke')) lenh.push('--list');
// Lọc tài khoản theo khoá trong config/tai-khoan-dang-nhap.*.json (tên test mở đầu bằng khoá)
const taiKhoan = lay('tai-khoan');
if (taiKhoan) lenh.push('-g', taiKhoan.split(',').map((x) => x.trim()).filter(Boolean).join('|'));

console.log(`[dang-nhap] ${moiTruong} (.env.${HO_SO[moiTruong]}): npx ${lenh.join(' ')}`);
const con = spawn('npx', lenh, { env, stdio: 'inherit', shell: true });
con.on('exit', (ma) => process.exit(ma ?? 1));
