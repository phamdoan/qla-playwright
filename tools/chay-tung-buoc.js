/**
 * Chạy luồng GĐT/TT THEO TỪNG BƯỚC: mỗi bước gọi Playwright một lần riêng.
 *
 * Vì sao: các bước của một vụ nằm trong describe `mode: 'serial'` — một bước hỏng là toàn bộ bước
 * sau của vụ đó bị "did not run". Chạy tách từng bước thì bước hỏng chỉ mất đúng bước đó, các bước
 * sau vẫn được thử (nhiều bước đã xong từ trước sẽ tự bỏ qua trong vài giây).
 *
 *   node tools/chay-tung-buoc.js --file=27-09-2026 --ma=VG01,VG12 --so-cai=b --tu=B14 --den=B23
 *   node tools/chay-tung-buoc.js --file=28-09-2026 --ma=K01 --so-cai=f --tu=B1-B2 --den=B10
 *
 * Tuỳ chọn: --nhanh (mặc định bật), --cham (tắt chế độ nhanh), --ghi=0 (không cho tạo dữ liệu thật).
 * Kết quả từng bước in ra màn hình và ghi vào seed-output/<file>.<so-cai>.tung-buoc.log
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const lay = ten => (args.find(a => a.startsWith(`--${ten}=`)) || '').split('=')[1];

/** Thứ tự bước đúng như luồng chạy (common/luong-gdt-tt.ts) */
const BUOC = [
  'B1-B2', 'B3', 'B4', 'B7a', 'B9', 'B5', 'B7b', 'B10', 'B10b', 'B11', 'B12a', 'B12b', 'B13', 'B13b',
  'B14', 'B15', 'B16', 'B17', 'B18', 'B19', 'B20', 'B21', 'B22', 'B23',
];

const loc = lay('file') || '';
const ma = lay('ma') || '';
const soCai = lay('so-cai') || '';
const tu = lay('tu') || BUOC[0];
const den = lay('den') || BUOC[BUOC.length - 1];
const i = BUOC.indexOf(tu);
const j = BUOC.indexOf(den);
if (i < 0 || j < 0) throw new Error(`--tu/--den phải nằm trong: ${BUOC.join(' ')}`);
const danhSach = BUOC.slice(Math.min(i, j), Math.max(i, j) + 1);

const env = { ...process.env, QLA_HO_SO_ENV: 'staging' };
if (lay('ghi') !== '0') env.QLA_TKM_CHO_PHEP_GHI = '1';
if (!args.includes('--cham')) env.QLA_GO_PHIM_MS = '0';
if (ma) env.QLA_GDT_MA = ma;
if (soCai) env.QLA_SO_CAI_HAU_TO = soCai;

const nhatKy = path.resolve(__dirname, '..', 'seed-output', `${loc || 'gdt'}.${soCai || 'x'}.tung-buoc.log`);
const ghi = d => {
  console.log(d);
  try {
    fs.appendFileSync(nhatKy, d + '\n');
  } catch {
    /* không ghi được nhật ký thì thôi */
  }
};

ghi(`\n===== ${new Date().toLocaleString('vi-VN')} | spec ${loc} | vụ ${ma || '(tất cả)'} | sổ cái ${soCai} =====`);
ghi(`Chạy ${danhSach.length} bước: ${danhSach.join(' ')}`);

const tong = { dat: 0, hong: 0, boQua: 0 };
for (const b of danhSach) {
  const bd = Date.now();
  const kq = spawnSync(
    'npx',
    [
      'playwright', 'test',
      '--project=tai-khoan-moi',
      '--no-deps',
      // Thư mục kết quả RIÊNG cho từng bước: Playwright dọn sạch --output mỗi lần chạy, nên dùng
      // chung một thư mục thì bước sau xoá mất ảnh chụp trang (error-context.md) của bước trước —
      // đúng lúc cần nó nhất để biết vì sao bước trước hỏng (gặp 30/09/2026 khi điều tra B15).
      `--output=test-results-${soCai || 'x'}-${b}`,
      '-g', JSON.stringify(`${b.replace(/-/g, '.')} ·`),
      '--reporter=line',
      ...(loc ? [loc] : []),
    ],
    { env, shell: true, encoding: 'utf8' },
  );
  const ra = `${kq.stdout || ''}${kq.stderr || ''}`;
  const dat = (/(\d+) passed/.exec(ra) || [])[1] || '0';
  const hong = (/(\d+) failed/.exec(ra) || [])[1] || '0';
  const boQua = (/(\d+) skipped/.exec(ra) || [])[1] || '0';
  tong.dat += +dat;
  tong.hong += +hong;
  tong.boQua += +boQua;
  const giay = ((Date.now() - bd) / 1000).toFixed(0);
  ghi(`  ${b.padEnd(6)} ${dat} đạt / ${hong} hỏng / ${boQua} bỏ qua  (${giay}s)`);
  // Lỗi đầu tiên của bước, để sáng mai đọc nhật ký là biết vướng gì
  // Cắt dài hơn 180 ký tự: thông báo lỗi có kèm danh sách dòng đang hiện trên màn, phần quan trọng
  // nhất để chẩn đoán lại nằm ở cuối câu.
  for (const d of ra.split(/\r?\n/).filter(x => /^\s+(Error|TimeoutError):/.test(x)).slice(0, 3)) {
    ghi(`         ${d.trim().slice(0, 700)}`);
  }
  // Giữ toàn văn kết xuất của bước để tra lại chi tiết (ghi đè mỗi lần chạy lại chính bước đó)
  try {
    fs.writeFileSync(nhatKy.replace(/\.log$/, `.${b}.out`), ra, 'utf8');
  } catch {
    /* không ghi được thì thôi */
  }
}
ghi(`TỔNG: ${tong.dat} đạt / ${tong.hong} hỏng / ${tong.boQua} bỏ qua`);
