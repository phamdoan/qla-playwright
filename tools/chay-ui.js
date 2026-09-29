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
 *
 * Luồng GĐT/TT (spec luong-gdt-tt-*):
 *   npm run ui:stg:ghi -- --file=28-09-2026 --ma=K01,K02        chỉ chạy các vụ theo mã trong bộ dữ liệu
 *   npm run ui:stg:ghi -- --file=27-09-2026 --buoc=B15..B23     chỉ chạy từ B15 tới B23
 *   npm run ui:stg:ghi -- --so-cai=a                            sổ cái riêng cho cửa sổ này (a|b|c|d|e)
 *   npm run ui:stg:ghi -- --nhanh                               gõ tức thì, rút thời gian nghỉ (nhanh ~2x)
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
// Luồng GĐT/TT
if (lay('ma')) env.QLA_GDT_MA = lay('ma');
if (lay('so-cai')) env.QLA_SO_CAI_HAU_TO = lay('so-cai');
if (args.includes('--nhanh')) env.QLA_GO_PHIM_MS = '0';

/** --buoc=B15..B23 hoặc --buoc=B15,B16,B19 → biểu thức -g khớp tiêu đề test */
const danhSachBuoc = [
  'B1-B2', 'B3', 'B4', 'B7a', 'B9', 'B5', 'B7b', 'B10', 'B10b', 'B11', 'B12a', 'B12b', 'B13', 'B13b',
  'B14', 'B15', 'B16', 'B17', 'B18', 'B19', 'B20', 'B21', 'B22', 'B23',
];
const buoc = lay('buoc');
let locBuoc = [];
if (buoc && buoc.includes('..')) {
  const [dau, cuoi] = buoc.split('..');
  const i = danhSachBuoc.indexOf(dau);
  const j = danhSachBuoc.indexOf(cuoi);
  if (i < 0 || j < 0) throw new Error(`--buoc=${buoc}: bước không có trong danh sách ${danhSachBuoc.join(' ')}`);
  locBuoc = danhSachBuoc.slice(Math.min(i, j), Math.max(i, j) + 1);
} else if (buoc) {
  locBuoc = buoc.split(',').map(x => x.trim()).filter(Boolean);
}

// --kiem-tra: chỉ liệt kê test để xem cấu hình có đúng không, không mở giao diện
const cheDo = args.includes('--kiem-tra') ? ['--list'] : args.includes('--cli') ? ['--reporter=list,html'] : ['--ui'];
// --file=<chuỗi>: chỉ nạp spec có tên khớp (vd. --file=24-09-2026 để chạy riêng đợt đó)
const loc = lay('file');
// Hai cửa sổ Playwright chạy trong CÙNG một thư mục sẽ xoá test-results của nhau lúc khởi động
// → lỗi "ENOENT … traces\…recording.stacks" và trace hỏng giữa chừng. Mỗi cửa sổ một thư mục kết quả
// riêng theo --so-cai (mặc định test-results như cũ).
const thuMucKq = lay('so-cai') ? ['--output=test-results-' + lay('so-cai')] : [];
const lenh = [
  'playwright',
  'test',
  ...cheDo,
  '--project=tai-khoan-moi',
  ...thuMucKq,
  ...(locBuoc.length ? ['-g', JSON.stringify(locBuoc.map(b => b.replace(/-/g, '.')).join('|'))] : []),
  ...(loc ? [loc] : []),
];

console.log(`Môi trường: ${moiTruong.toUpperCase()} | ghi dữ liệu: ${choPhepGhi ? 'CÓ (tạo đơn thật)' : 'KHÔNG'}`);
if (env.QLA_TKM_DONG) console.log(`Dòng Excel: ${env.QLA_TKM_DONG}`);
if (env.QLA_TKM_SO_DONG) console.log(`Số dòng Excel: ${env.QLA_TKM_SO_DONG}`);
if (loc) console.log(`Chỉ chạy spec khớp: ${loc}`);
if (env.QLA_GDT_MA) console.log(`Vụ GĐT/TT: ${env.QLA_GDT_MA}`);
if (locBuoc.length) console.log(`Bước: ${locBuoc.join(' ')}`);
if (env.QLA_SO_CAI_HAU_TO) console.log(`Sổ cái hậu tố: ${env.QLA_SO_CAI_HAU_TO}`);
if (env.QLA_GO_PHIM_MS === '0') console.log('Chế độ nhanh: gõ tức thì, rút thời gian nghỉ');
if (env.QLA_TKM_MA_DON) console.log(`Đơn có sẵn: mã ${env.QLA_TKM_MA_DON}${env.QLA_TKM_SO_THU_LY ? ` – số thụ lý ${env.QLA_TKM_SO_THU_LY}` : ''}`);
console.log(`→ npx ${lenh.join(' ')}\n`);

spawn('npx', lenh, { env, stdio: 'inherit', shell: true }).on('exit', c => process.exit(c ?? 0));
