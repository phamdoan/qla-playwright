/**
 * Gộp sổ cái của một bộ dữ liệu TRÊN NHIỀU THƯ MỤC CHẠY SONG SONG rồi phát lại cho từng thư mục.
 *
 * Mỗi luồng chạy ở một bản sao repo riêng (toa-an-chay-rieng-a…g) nên sổ cái chỉ nằm trong thư mục
 * đó: luồng b không biết luồng a đã làm tới bước nào → chạy lại từ đầu hoặc báo "chưa có số thụ lý".
 * Tool này đọc mọi file <bộ>.<env>.ledger*.json ở repo gốc + các bản sao, gộp lại (hợp nhất daXong,
 * ưu tiên giá trị mới hơn theo `luc`) rồi ghi bản gộp vào <bộ>.<env>.ledger.json của TỪNG thư mục.
 *
 *   node tools/dong-bo-so-cai-cac-luong.js gdt-kdtm-dan-su-28-09-2026 [stg]
 *
 * File hậu tố (.a.json…) KHÔNG bị xoá — luồng đang chạy vẫn ghi vào đó, lần sau gộp tiếp.
 */
const fs = require('fs');
const path = require('path');

const tenBo = process.argv[2];
const env = process.argv[3] || process.env.QLA_ENV || 'stg';
if (!tenBo) {
  console.error('Thiếu tên bộ. Vd: node tools/dong-bo-so-cai-cac-luong.js gdt-kdtm-dan-su-28-09-2026');
  process.exit(1);
}

const E2E = path.resolve(__dirname, '..');
const GOC = path.resolve(E2E, '..', '..');
const dau = `${tenBo}.${env}.ledger`;

const dsThuMuc = [path.join(E2E, 'seed-output')];
for (const t of fs.readdirSync(GOC).filter(t => /^toa-an-chay-rieng-/.test(t))) {
  const tm = path.join(GOC, t, 'e2e', 'seed-output');
  if (fs.existsSync(tm)) dsThuMuc.push(tm);
}

const moi = (a, b) => {
  const ta = Date.parse(a?.luc || '') || 0;
  const tb = Date.parse(b?.luc || '') || 0;
  return tb >= ta ? { ...a, ...b } : { ...b, ...a };
};

const gop = {};
let soFile = 0;
for (const tm of dsThuMuc) {
  for (const t of fs.readdirSync(tm).filter(t => t.startsWith(dau) && t.endsWith('.json'))) {
    let j;
    try {
      j = JSON.parse(fs.readFileSync(path.join(tm, t), 'utf8'));
    } catch {
      continue;
    }
    soFile++;
    for (const [k, v] of Object.entries(j)) {
      const cu = gop[k];
      const moiNhat = cu ? moi(cu, v) : { ...v };
      moiNhat.daXong = [...new Set([...(cu?.daXong || []), ...(v.daXong || [])])];
      gop[k] = moiNhat;
    }
  }
}

const noiDung = JSON.stringify(gop, null, 2);
for (const tm of dsThuMuc) fs.writeFileSync(path.join(tm, `${dau}.json`), noiDung, 'utf8');

console.log(`Gộp ${soFile} file sổ cái ở ${dsThuMuc.length} thư mục → ${Object.keys(gop).length} vụ.`);
for (const [k, v] of Object.entries(gop)) {
  console.log(`  ${k}  ${(v.daXong || []).length} bước  ${v.maDon ? 'đơn ' + v.maDon : ''}`);
}
