/**
 * Gộp các file sổ cái của một bộ dữ liệu khi chạy song song nhiều tiến trình.
 *
 * Mỗi tiến trình đặt QLA_SO_CAI_HAU_TO=<a|b|c…> nên ghi ra file riêng
 * (seed-output/<bộ>.<env>.ledger.a.json). Chạy xong gộp về file gốc:
 *
 *   node tools/gop-so-cai.js luong-gdt-tt-26-09-2026 [stg]
 *
 * Hai file cùng có một bản án thì lấy bản ghi mới hơn theo trường `luc`, và hợp nhất `daXong`
 * để không mất bước nào tiến trình khác đã làm.
 */
const fs = require('fs');
const path = require('path');

const tenBo = process.argv[2];
const env = process.argv[3] || process.env.QLA_ENV || 'stg';
if (!tenBo) {
  console.error('Thiếu tên bộ. Vd: node tools/gop-so-cai.js luong-gdt-tt-26-09-2026 stg');
  process.exit(1);
}

const thuMuc = path.resolve(__dirname, '../seed-output');
const dau = `${tenBo}.${env}.ledger`;
const fileGoc = path.join(thuMuc, `${dau}.json`);
const dsFile = fs
  .readdirSync(thuMuc)
  .filter(t => t.startsWith(`${dau}.`) && t.endsWith('.json'))
  .map(t => path.join(thuMuc, t))
  .filter(f => f !== fileGoc);

if (!dsFile.length) {
  console.log(`Không có file sổ cái hậu tố nào của "${dau}" để gộp.`);
  process.exit(0);
}

const doc = f => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return {};
  }
};

const ketQua = fs.existsSync(fileGoc) ? doc(fileGoc) : {};
let themMoi = 0;
let gopThem = 0;
for (const f of dsFile) {
  for (const [khoa, dong] of Object.entries(doc(f))) {
    const cu = ketQua[khoa];
    if (!cu) {
      ketQua[khoa] = dong;
      themMoi++;
      continue;
    }
    const daXong = [...new Set([...(cu.daXong || []), ...(dong.daXong || [])])];
    const moiHon = new Date(dong.luc || 0) > new Date(cu.luc || 0) ? dong : cu;
    ketQua[khoa] = { ...cu, ...moiHon, daXong };
    gopThem++;
  }
}

fs.writeFileSync(fileGoc, JSON.stringify(ketQua, null, 2));
console.log(`Đã gộp ${dsFile.length} file vào ${path.basename(fileGoc)}: thêm mới ${themMoi}, hợp nhất ${gopThem}, tổng ${Object.keys(ketQua).length} bản án.`);
console.log('Các file đã gộp (xoá tay nếu không cần nữa):');
for (const f of dsFile) console.log('  ', path.basename(f));
