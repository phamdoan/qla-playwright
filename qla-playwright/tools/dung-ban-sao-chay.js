/**
 * DỰNG / ĐỒNG BỘ một BẢN SAO CHẠY RIÊNG của bộ e2e.
 *
 *   node tools/dung-ban-sao-chay.js don                 → D:\gtel\toa-an-chay-rieng-don\e2e
 *   node tools/dung-ban-sao-chay.js preprod --moi-truong=preprod
 *   node tools/dung-ban-sao-chay.js a --kiem            chỉ kiểm, không ghi
 *
 * Vì sao cần công cụ này thay vì `git archive | tar -x`: `git archive` CHỈ có tệp ĐƯỢC THEO DÕI.
 * Mà bộ e2e cần một số tệp **bị gitignore** mới chạy nổi:
 *
 *   data/*.pdf                 tài liệu đính kèm (BanAn_A, bien-ban-da-ky, bien-lai-tam-ung-an-phi…)
 *   .env.<hồ sơ>               URL môi trường
 *   config/*.local.json        CCCD từng vai
 *
 * Thiếu `data/bien-ban-da-ky.pdf` thì bước 11 (Biên bản phiên tòa sơ thẩm) chết với
 * `ENOENT ... bien-ban-da-ky.pdf` — đo 04/10/2026: ba case cùng đỏ ở đúng bước đó sau khi tôi dựng
 * bản sao bằng `git archive`, và trông y như một hồi quy của mã luồng. Không phải: chỉ thiếu tệp.
 *
 * KHÔNG chép: `node_modules` (tạo junction), `state/` và `test-results/` (của riêng từng bản sao,
 * chép sang là lẫn trạng thái giữa các lượt chạy song song).
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ten = args.find(a => !a.startsWith('--'));
const chiKiem = args.includes('--kiem');
const moiTruong = (args.find(a => a.startsWith('--moi-truong=')) || '').split('=')[1];

if (!ten) {
  console.error('Thiếu tên bản sao. Ví dụ: node tools/dung-ban-sao-chay.js don --moi-truong=preprod');
  process.exit(1);
}

const GOC = path.resolve(__dirname, '..');
const DICH = path.resolve(GOC, '..', '..', `toa-an-chay-rieng-${ten}`, 'e2e');

/** Hồ sơ môi trường cần mang sang; không khai thì mang hết để bản sao chạy được mọi môi trường */
const HO_SO = moiTruong ? [`.env.${moiTruong}`] : fs.readdirSync(GOC).filter(f => /^\.env\./.test(f) && !/example/.test(f));

const biBoQua = f => {
  try {
    execFileSync('git', ['check-ignore', '-q', f], { cwd: GOC });
    return true;
  } catch {
    return false;
  }
};

/** Tệp trong data/ bị gitignore — `git archive` không có, phải chép tay */
const tepDuLieu = fs
  .readdirSync(path.join(GOC, 'data'))
  .map(f => path.join('data', f))
  .filter(f => fs.statSync(path.join(GOC, f)).isFile() && biBoQua(f));

/**
 * Tài khoản: khai `--moi-truong=X` thì CHỈ mang `tai-khoan.X.local.json` (+ tệp tài khoản đăng
 * nhập, dùng chung mọi môi trường). KHÔNG mang `tai-khoan.local.json` của STG.
 *
 * Vì sao: cấu hình xếp lớp, lớp STG nằm DƯỚI lớp môi trường. Vai nào có ở lớp STG mà thiếu ở lớp
 * môi trường sẽ lặng lẽ dùng CCCD của STG rồi hỏng ở SSO với "đăng nhập thất bại" — thay vì báo
 * thẳng "Thiếu tài khoản cho vai …". Bản sao của một môi trường chỉ nên có tài khoản của chính nó,
 * để lỗi chỉ đúng chỗ.
 */
const tepTaiKhoan = fs
  .readdirSync(path.join(GOC, 'config'))
  .filter(f => /\.local\.json$/.test(f))
  .filter(f => !moiTruong || f === 'tai-khoan-dang-nhap.local.json' || f.includes(`.${moiTruong}.`))
  .map(f => path.join('config', f));

const canCo = [...tepDuLieu, ...HO_SO, ...tepTaiKhoan];

if (chiKiem) {
  if (!fs.existsSync(DICH)) {
    console.log(`${DICH} — CHƯA CÓ`);
    process.exit(1);
  }
  /**
   * Hai mức khác nhau, đừng gộp:
   *   · tệp data/*.pdf là BẮT BUỘC — thiếu là bước nào cần nó sẽ chết với ENOENT;
   *   · .env.* và config/*.local.json là THEO Ý ĐỊNH của từng bản sao — bản `preprod` CỐ TÌNH
   *     không có .env.staging và không có tài khoản STG, để không thể chạy lẫn môi trường.
   * Chỉ thiếu nhóm đầu mới là lỗi.
   */
  const batBuoc = tepDuLieu.filter(f => !fs.existsSync(path.join(DICH, f)));
  const tuyMoiTruong = canCo
    .filter(f => !tepDuLieu.includes(f))
    .filter(f => !fs.existsSync(path.join(DICH, f)));
  console.log(`${DICH}`);
  console.log(`  node_modules      : ${fs.existsSync(path.join(DICH, 'node_modules')) ? 'CÓ' : 'MẤT'}`);
  console.log(`  THIẾU BẮT BUỘC    : ${batBuoc.length ? batBuoc.join(', ') : '(không thiếu gì)'}`);
  console.log(`  không có (có thể cố ý): ${tuyMoiTruong.join(', ') || '(không)'}`);
  process.exit(batBuoc.length ? 1 : 0);
}

fs.mkdirSync(DICH, { recursive: true });

// 1. Mã nguồn: lấy đúng bản ĐÃ COMMIT, để bản sao không mang theo thay đổi đang dở
execFileSync('bash', ['-c', `git archive HEAD | tar -x -C "${DICH.replace(/\\/g, '/')}"`], { cwd: GOC, stdio: 'inherit' });

// 2. Tệp bị gitignore mà vẫn cần
let daChep = 0;
for (const f of canCo) {
  const tu = path.join(GOC, f);
  if (!fs.existsSync(tu)) continue;
  const den = path.join(DICH, f);
  fs.mkdirSync(path.dirname(den), { recursive: true });
  fs.copyFileSync(tu, den);
  daChep++;
}

// 3. node_modules: junction (không nhân đôi vài trăm MB); không được thì chép
if (!fs.existsSync(path.join(DICH, 'node_modules'))) {
  try {
    execFileSync('cmd', ['/c', 'mklink', '/J', path.join(DICH, 'node_modules'), path.join(GOC, 'node_modules')], {
      stdio: 'ignore',
    });
  } catch {
    execFileSync('bash', ['-c', `cp -r "${GOC.replace(/\\/g, '/')}/node_modules" "${DICH.replace(/\\/g, '/')}/node_modules"`]);
  }
}

console.log(`\nĐã dựng ${DICH}`);
console.log(`  mã nguồn     : bản đã commit (git archive HEAD)`);
console.log(`  tệp bổ sung  : ${daChep} (${canCo.length} cần, tệp không có ở gốc thì bỏ qua)`);
console.log(`  node_modules : ${fs.existsSync(path.join(DICH, 'node_modules')) ? 'CÓ' : 'MẤT'}`);
console.log(`  state        : giữ nguyên của bản sao (không chép từ gốc)`);
console.log(`\nKiểm lại: node tools/dung-ban-sao-chay.js ${ten} --kiem`);
