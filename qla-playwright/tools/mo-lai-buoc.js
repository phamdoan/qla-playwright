/**
 * Mở lại (bỏ đánh dấu đã xong) một số bước trong SỔ CÁI để bước đó được chạy lại.
 *
 * Chỉ sửa file bookkeeping của Playwright (seed-output/*.ledger*.json), KHÔNG đụng vào dữ liệu trên
 * hệ thống. Dùng khi một bước được ghi "xong" nhưng thực tế làm trên vụ khác (vd. B11 phân công TTV
 * trúng vụ trùng số bản án) nên phải làm lại cho đúng vụ.
 *
 *   node tools/mo-lai-buoc.js gdt-tai-tham-phap-nhan-27-09-2026 "514|16/09/2024" phanCongTTV
 *   node tools/mo-lai-buoc.js <bộ> <phần đầu khoá vụ> <bước1> [bước2 …]
 *
 * Khoá vụ trong sổ cái là "<số bản án>|<ngày bản án>|<tòa>"; chỉ cần gõ phần đầu là đủ.
 * Sửa trên MỌI thư mục chạy song song (toa-an + toa-an-chay-rieng-*).
 */
const fs = require('fs');
const path = require('path');

const [tenBo, khoaDau, ...dsBuoc] = process.argv.slice(2);
if (!tenBo || !khoaDau || !dsBuoc.length) {
  console.error('Dùng: node tools/mo-lai-buoc.js <bộ> <phần đầu khoá vụ> <bước…>');
  process.exit(1);
}
const ENV = process.env.QLA_ENV || 'stg';
const E2E = path.resolve(__dirname, '..');
const GOC = path.resolve(E2E, '..', '..');

const thuMuc = [path.join(E2E, 'seed-output')];
for (const t of fs.readdirSync(GOC).filter(t => /^toa-an-chay-rieng-/.test(t))) {
  const tm = path.join(GOC, t, 'e2e', 'seed-output');
  if (fs.existsSync(tm)) thuMuc.push(tm);
}

let doi = 0;
for (const tm of thuMuc) {
  const dau = `${tenBo}.${ENV}.ledger`;
  for (const t of fs.readdirSync(tm).filter(t => t.startsWith(dau) && t.endsWith('.json'))) {
    const duong = path.join(tm, t);
    let j;
    try {
      j = JSON.parse(fs.readFileSync(duong, 'utf8'));
    } catch {
      continue;
    }
    let suaFile = false;
    for (const [khoa, v] of Object.entries(j)) {
      if (!khoa.startsWith(khoaDau) || !Array.isArray(v.daXong)) continue;
      const con = v.daXong.filter(b => !dsBuoc.includes(b));
      if (con.length === v.daXong.length) continue;
      v.daXong = con;
      suaFile = true;
      doi++;
      console.log(`  ${path.basename(tm)}/${t}: ${khoa} → bỏ ${dsBuoc.join(', ')}`);
    }
    if (suaFile) fs.writeFileSync(duong, JSON.stringify(j, null, 2), 'utf8');
  }
}
console.log(doi ? `Đã mở lại ${doi} bản ghi.` : 'Không có bản ghi nào khớp.');
