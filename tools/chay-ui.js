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

/**
 * Môi trường = tham số vị trí đầu tiên. Tên → hồ sơ `.env.<hồ sơ>` mà playwright.config.ts nạp.
 *
 * ⚠ TRƯỚC 04/10/2026 chỗ này là `args.includes('dev') ? 'dev' : args.includes('uat') ? 'uat' : 'stg'`
 * — nghĩa là gõ `preprod` (hay gõ sai tên) thì **ÂM THẦM CHẠY STAGING** mà vẫn in "Môi trường: STG",
 * nên người chạy tưởng đang ở pre-prod. Giờ tên lạ là DỪNG.
 */
const HO_SO_THEO_MOI_TRUONG = { stg: 'staging', staging: 'staging', dev: 'dev', uat: 'uat', preprod: 'preprod', daotao: 'daotao' };
const tenMoiTruong = args.find(a => !a.startsWith('--')) || 'stg';
if (!HO_SO_THEO_MOI_TRUONG[tenMoiTruong]) {
  console.error(
    `Môi trường "${tenMoiTruong}" không có. Chọn một trong: ${Object.keys(HO_SO_THEO_MOI_TRUONG).join(' | ')}.\n` +
      'Gõ sai tên trước đây bị rơi về STAGING mà không báo gì — nên giờ dừng hẳn.',
  );
  process.exit(1);
}
const moiTruong = tenMoiTruong === 'staging' ? 'stg' : tenMoiTruong;
const choPhepGhi = args.includes('--ghi');
const lay = ten => (args.find(a => a.startsWith(`--${ten}=`)) || '').split('=')[1];

const env = {
  ...process.env,
  // Báo cho playwright.config.ts biết nạp .env.dev / .env.staging / .env.uat / .env.preprod.
  // Không dùng npm_lifecycle_event vì npx ghi đè biến này → config sẽ nạp nhầm .env mặc định.
  QLA_HO_SO_ENV: HO_SO_THEO_MOI_TRUONG[tenMoiTruong],
};
/**
 * --tiep: BỎ QUA các bước ĐÃ XONG ở lượt trước (đọc CaseState) thay vì làm lại.
 *
 * Vì sao cần: chạy `npm run preprod` sau khi đã có bước 24 PASSED thì nó LÀM LẠI bước 24 và tạo
 * THÊM MỘT ĐƠN TRÙNG — đo 04/10/2026: lượt đầu cấp số thụ lý 395, lượt sau 396 cho cùng một case.
 * Dữ liệu rác, và với bản án đã có đơn thì đơn thứ hai còn thành ĐƠN PHỤ đi sai nhánh.
 */
if (args.includes('--tiep')) env.QLA_BO_QUA_DA_XONG = '1';

if (choPhepGhi) {
  env.QLA_TKM_CHO_PHEP_GHI = '1';
  /**
   * Cờ THỨ HAI, không có trong tệp .env nào, nên dotenv không xoá được.
   *
   * playwright.config.ts nạp tệp env với `override: true`, nên dòng `QLA_TKM_CHO_PHEP_GHI=`
   * (trống) trong .env.preprod GHI ĐÈ cờ vừa đặt ở trên → --ghi mất tác dụng, và dòng log bên dưới
   * in "ghi dữ liệu: CÓ" trước khi bị ghi đè nên nói sai hoàn toàn. Đo 04/10/2026: cả 6 test của
   * luồng đơn trên pre-prod bị BỎ QUA với lý do "Môi trường không cho ghi dữ liệu".
   * Xem `account.ts · choPhepGhiTKM`.
   */
  env.QLA_GHI_CLI = '1';
}
if (lay('dong')) env.QLA_TKM_DONG = lay('dong');
if (lay('so-dong')) env.QLA_TKM_SO_DONG = lay('so-dong');
if (lay('ma-don')) env.QLA_TKM_MA_DON = lay('ma-don');
if (lay('so-thu-ly')) env.QLA_TKM_SO_THU_LY = lay('so-thu-ly');
// Luồng GĐT/TT
if (lay('ma')) env.QLA_GDT_MA = lay('ma');
if (lay('so-cai')) env.QLA_SO_CAI_HAU_TO = lay('so-cai');
// Khung FLOW/CASE/STEP: chọn case chạy qua luồng (cả luồng nằm trong một file spec)
if (lay('case')) env.QLA_CASE = lay('case');
if (lay('so-case')) env.QLA_SO_CASE = lay('so-case');
/**
 * --vu-an-thuc=<mã>: HẸP bộ case sinh từ 111 bản án thật (`data/vu-an-thuc/`) còn vài mã.
 *
 * KHÔNG còn là cổng bật/tắt. Từ 05/10/2026 toàn bộ 111 case LUÔN có trong danh sách (xem
 * `data/vu-an-thuc/sinh-case.ts`), nên `--case=case-bacb-022` tự chạy được, không cần khai thêm gì.
 * Trước đó thiếu cờ thì Playwright báo "Total: 0 tests in 0 files" — không lỗi, không cảnh báo,
 * chỉ là không có gì chạy.
 */
if (lay('vu-an-thuc')) env.QLA_VU_AN_THUC = lay('vu-an-thuc');
if (args.includes('--bo-qua-da-xong')) env.QLA_BO_QUA_DA_XONG = '1';
// --bo-qua-ocr (spec e2e-gdt-1410): môi trường không có màn OCR thì ghi BLOCKED và đi tiếp thay vì FAIL dừng
if (args.includes('--bo-qua-ocr')) env.QLA_1410_BO_QUA_OCR = '1';
// --hien: mở trình duyệt thật để thao tác/quan sát (dùng với spec mo-tay có page.pause())
if (args.includes('--hien')) env.QLA_MO_TAY = '1';
// --anh: chụp .png cỡ thật 1920×1080 SAU MỖI BƯỚC, đặt tên theo mã bước (xem khung/luong.ts)
if (args.includes('--anh')) env.QLA_ANH = '1';
// --anh-tat-ca: chụp THEO NHỊP suốt mỗi bước (ảnh .jpg) để dựng video; --anh-nhip=<ms> đổi nhịp
if (args.includes('--anh-tat-ca')) { env.QLA_ANH = '1'; env.QLA_ANH_TAT_CA = '1'; }
if (lay('anh-nhip')) env.QLA_ANH_NHIP = lay('anh-nhip');
// Mặc định CHẠY NHANH (gõ tức thì, thời gian nghỉ x0.3). Cần quan sát thì thêm --cham.
if (!args.includes('--cham')) env.QLA_GO_PHIM_MS = '0';

/** --buoc=B15..B23 hoặc --buoc=B15,B16,B19 → biểu thức -g khớp tiêu đề test */
const danhSachBuoc = [
  'B1-B2', 'B3', 'B4', 'B7a', 'B9', 'B5', 'B7b', 'B10', 'B10b', 'B11', 'B12a', 'B12b', 'B13', 'B13b',
  'B14', 'B15', 'B16', 'B17', 'B18', 'B19', 'B20', 'B21', 'B22', 'B23',
];
const buoc = lay('buoc');
let locBuoc = [];
/** Mã bước hai chữ số (01, 02…) là khung FLOW/CASE/STEP mới; B1–B23 là luồng GĐT/TT cũ */
const laBuocSo = /^\d{2}([.,]|$)/.test(buoc || '');
if (laBuocSo) {
  /* xử lý ở khối "Khung FLOW/CASE/STEP" bên dưới */
} else if (buoc && buoc.includes('..')) {
  const [dau, cuoi] = buoc.split('..');
  const i = danhSachBuoc.indexOf(dau);
  const j = danhSachBuoc.indexOf(cuoi);
  if (i < 0 || j < 0) throw new Error(`--buoc=${buoc}: bước không có trong danh sách ${danhSachBuoc.join(' ')}`);
  locBuoc = danhSachBuoc.slice(Math.min(i, j), Math.max(i, j) + 1);
} else if (buoc) {
  locBuoc = buoc.split(',').map(x => x.trim()).filter(Boolean);
}

/**
 * Khung FLOW/CASE/STEP: --buoc=01..05 hoặc --buoc=01,03 (mã bước hai chữ số).
 *
 * Cả luồng nằm trong MỘT file spec nên lọc bằng `-g` trên tên test: mỗi test mở đầu bằng mã bước
 * ("01-tao-don-khoi-kien · …") nên biểu thức "(01|02|03)-" khớp đúng các bước cần chạy.
 */
let gBuocSo = '';
if (laBuocSo) {
  let ds = [];
  if (buoc.includes('..')) {
    const [dau, cuoi] = buoc.split('..').map(Number);
    for (let i = Math.min(dau, cuoi); i <= Math.max(dau, cuoi); i++) ds.push(String(i).padStart(2, '0'));
  } else {
    ds = buoc.split(',').map(x => x.trim().padStart(2, '0')).filter(Boolean);
  }
  // Tiền tố "buoc " là bắt buộc: tên flow/case có chứa "01-" nên "(01)-" trần sẽ khớp mọi bước
  gBuocSo = `buoc (${ds.join('|')})-`;
  locBuoc = []; // danh sách B1–B23 của luồng cũ không dùng tới
}

// --kiem-tra: chỉ liệt kê test để xem cấu hình có đúng không, không mở giao diện
const cheDo = args.includes('--kiem-tra')
  ? ['--list']
  : args.includes('--cli')
    ? ['--reporter=list,html', ...(args.includes('--hien') ? ['--headed'] : [])]
    : ['--ui'];
// --file=<chuỗi>: chỉ nạp spec có tên khớp (vd. --file=24-09-2026 để chạy riêng đợt đó)
const loc = lay('file');
// Hai cửa sổ Playwright chạy trong CÙNG một thư mục sẽ xoá test-results của nhau lúc khởi động
// → lỗi "ENOENT … traces\…recording.stacks" và trace hỏng giữa chừng. Mỗi cửa sổ một thư mục kết quả
// riêng theo --so-cai (mặc định test-results như cũ).
const thuMucKq = lay('so-cai') ? ['--output=test-results-' + lay('so-cai')] : [];
// --song-song=N: chạy N case CÙNG LÚC. Mỗi case là một describe mode 'serial' nên các bước trong một
// case vẫn tuần tự, chỉ các case khác nhau mới chạy song song. Lưu ý: các case dùng CHUNG tài khoản
// (SSO) và chung bể lịch xét xử GĐT/TT — mỗi case phải có lịch riêng, nếu không bước 41 ghi đè nhau.
const songSong = lay('song-song');
const soWorker = songSong ? ['--workers=' + songSong] : [];
const lenh = [
  'playwright',
  'test',
  ...cheDo,
  '--project=tai-khoan-moi',
  ...thuMucKq,
  ...soWorker,
  // Bọc nháy: chuỗi có "|" mà không bọc thì cmd.exe hiểu là pipe rồi báo "'02' is not recognized"
  ...(gBuocSo
    ? ['-g', JSON.stringify(gBuocSo)]
    : locBuoc.length
      ? ['-g', JSON.stringify(locBuoc.map(b => b.replace(/-/g, '.')).join('|'))]
      : []),
  ...(loc ? [JSON.stringify(loc)] : []),
];

console.log(`Môi trường: ${moiTruong.toUpperCase()} | ghi dữ liệu: ${choPhepGhi ? 'CÓ (tạo đơn thật)' : 'KHÔNG'}`);
if (env.QLA_TKM_DONG) console.log(`Dòng Excel: ${env.QLA_TKM_DONG}`);
if (env.QLA_TKM_SO_DONG) console.log(`Số dòng Excel: ${env.QLA_TKM_SO_DONG}`);
if (loc) console.log(`Chỉ chạy spec khớp: ${loc}`);
if (env.QLA_ANH) console.log('Chụp ảnh: CÓ — mốc (.png) ở anh-buoc/<case>/<mã bước>*.png' + (env.QLA_ANH_TAT_CA ? ` · theo nhịp ${env.QLA_ANH_NHIP || 1000}ms (.jpg) ở <mã bước>-tien-trinh/` : ''));
if (songSong) console.log(`Chạy song song: ${songSong} case cùng lúc (mỗi case vẫn tuần tự từng bước)`);
if (env.QLA_GDT_MA) console.log(`Vụ GĐT/TT: ${env.QLA_GDT_MA}`);
if (env.QLA_CASE) console.log(`Case: ${env.QLA_CASE}`);
if (env.QLA_SO_CASE) console.log(`Số case đầu: ${env.QLA_SO_CASE}`);
if (env.QLA_BO_QUA_DA_XONG) console.log('Bỏ qua bước đã xong ở lượt trước: CÓ');
if (locBuoc.length) console.log(`Bước: ${locBuoc.join(' ')}`);
if (env.QLA_SO_CAI_HAU_TO) console.log(`Sổ cái hậu tố: ${env.QLA_SO_CAI_HAU_TO}`);
console.log(env.QLA_GO_PHIM_MS === '0' ? 'Tốc độ: NHANH (gõ tức thì, nghỉ x0.3)' : 'Tốc độ: chậm (--cham)');
if (env.QLA_MO_TAY) console.log('Chế độ MỞ TAY: trình duyệt hiện lên, kịch bản dừng lại cho bạn thao tác');
if (env.QLA_TKM_MA_DON) console.log(`Đơn có sẵn: mã ${env.QLA_TKM_MA_DON}${env.QLA_TKM_SO_THU_LY ? ` – số thụ lý ${env.QLA_TKM_SO_THU_LY}` : ''}`);
console.log(`→ npx ${lenh.join(' ')}\n`);

spawn('npx', lenh, { env, stdio: 'inherit', shell: true }).on('exit', c => process.exit(c ?? 0));
