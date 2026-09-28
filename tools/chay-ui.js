/**
 * Mở Playwright UI cho luồng "tài khoản mới" trên đúng môi trường, kèm các biến cần thiết —
 * để khỏi phải nhớ cú pháp đặt biến môi trường (khác nhau giữa Git Bash và PowerShell).
 *
 *   npm run ui:stg              mở UI trên STAGING, KHÔNG ghi dữ liệu (test tạo đơn tự bỏ qua)
 *   npm run ui:uat:ghi          mở UI trên UAT, CHO PHÉP tạo đơn thật
 *   npm run ui:stg:ghi          mở UI trên STAGING, CHO PHÉP tạo đơn thật
 *   npm run ui:dev:ghi          mở UI trên DEV, cho phép tạo đơn thật
 *
 * Chọn dòng dữ liệu Excel muốn chạy (mặc định dòng đầu tiên):
 *   npm run ui:stg:ghi -- --dong=2,5,19
 *   npm run ui:stg:ghi -- --so-dong=5
 *
 * Chạy riêng một đợt dữ liệu (lọc theo tên file spec):
 *   npm run ui:stg:ghi -- --file=24-09-2026
 *
 * Chạy tiếp Bước 3–9 trên một đơn đã có:
 *   npm run ui:stg:ghi -- --ma-don=8654 --so-thu-ly=1212121436
 */
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const moiTruong = args.includes('dev') ? 'dev' : args.includes('uat') ? 'uat' : 'stg';
const choPhepGhi = args.includes('--ghi');
const lay = ten => (args.find(a => a.startsWith(`--${ten}=`)) || '').split('=')[1];

const env = {
  ...process.env,
  // Báo cho playwright.config.ts biết nạp .env.dev / .env.staging / .env.uat.
  // Không dùng npm_lifecycle_event vì npx ghi đè biến này → config sẽ nạp nhầm .env mặc định.
  QLA_HO_SO_ENV: moiTruong === 'dev' ? 'dev' : moiTruong === 'uat' ? 'uat' : 'staging',
};
if (choPhepGhi) env.QLA_TKM_CHO_PHEP_GHI = '1';
if (lay('dong')) env.QLA_TKM_DONG = lay('dong');
if (lay('so-dong')) env.QLA_TKM_SO_DONG = lay('so-dong');
if (lay('ma-don')) env.QLA_TKM_MA_DON = lay('ma-don');
if (lay('so-thu-ly')) env.QLA_TKM_SO_THU_LY = lay('so-thu-ly');

// --kiem-tra: chỉ liệt kê test để xem cấu hình có đúng không, không mở giao diện
const cheDo = args.includes('--kiem-tra') ? ['--list'] : args.includes('--cli') ? ['--reporter=list,html'] : ['--ui'];
// --file=<chuỗi>: chỉ nạp spec có tên khớp (vd. --file=24-09-2026 để chạy riêng đợt đó)
const loc = lay('file');
const lenh = ['playwright', 'test', ...cheDo, '--project=tai-khoan-moi', ...(loc ? [loc] : [])];

console.log(`Môi trường: ${moiTruong.toUpperCase()} | ghi dữ liệu: ${choPhepGhi ? 'CÓ (tạo đơn thật)' : 'KHÔNG'}`);
if (env.QLA_TKM_DONG) console.log(`Dòng Excel: ${env.QLA_TKM_DONG}`);
if (env.QLA_TKM_SO_DONG) console.log(`Số dòng Excel: ${env.QLA_TKM_SO_DONG}`);
if (loc) console.log(`Chỉ chạy spec khớp: ${loc}`);
if (env.QLA_TKM_MA_DON) console.log(`Đơn có sẵn: mã ${env.QLA_TKM_MA_DON}${env.QLA_TKM_SO_THU_LY ? ` – số thụ lý ${env.QLA_TKM_SO_THU_LY}` : ''}`);
console.log(`→ npx ${lenh.join(' ')}\n`);

spawn('npx', lenh, { env, stdio: 'inherit', shell: true }).on('exit', c => process.exit(c ?? 0));
