/**
 * Bổ sung Số bản án / Ngày bản án / Tòa ra bản án vào seed-output/toan-bo-data-stg.csv
 * từ kết quả truy vấn DB STG (đầu ra của tools/tao-query-ban-an.js chạy qua SqlEnv).
 *
 *   node tools/bo-sung-ban-an-csv.js <file-ket-qua.txt>
 *
 * Giá trị lấy từ DB được coi là nguồn đúng: ghi đè cả những ô đang có sẵn lấy từ Excel
 * (cột "Tòa ra bản án" trước đây lấy theo file dữ liệu, không khớp đơn vị thật trên hệ thống).
 */
const fs = require('fs');
const path = require('path');

const fileKq = process.argv[2];
if (!fileKq) {
  console.error('Thiếu file kết quả truy vấn. Vd: node tools/bo-sung-ban-an-csv.js kq-banan.txt');
  process.exit(1);
}

/** Dòng kết quả dạng "MA_VUAN | SO_BAN_AN | NGAY_BA | TEN_DONVI | GIAI_DOAN | TRANG_THAI |" */
const theoMa = {};
for (const d of fs.readFileSync(fileKq, 'utf8').split('\n')) {
  const c = d.split('|').map(x => x.trim());
  if (!/^VA26-\d+$/.test(c[0] || '')) continue;
  theoMa[c[0]] = { so: c[1] === 'NULL' ? '' : c[1], ngay: c[2] === 'NULL' ? '' : c[2], toa: c[3] === 'NULL' ? '' : c[3] };
}

const fileCsv = path.resolve(__dirname, '../seed-output/toan-bo-data-stg.csv');
const dong = fs.readFileSync(fileCsv, 'utf8').replace(/^﻿/, '').split('\n');
const o = x => `"${String(x ?? '').replace(/"/g, '""')}"`;

let boSung = 0;
let doiKhac = 0;
const ra = [dong[0]];
for (const d of dong.slice(1)) {
  if (!d.trim()) continue;
  const c = d.split('","').map(x => x.replace(/^"|"$/g, ''));
  const ba = theoMa[c[1]];
  if (ba && (ba.so || ba.ngay || ba.toa)) {
    if (!c[3] && ba.so) boSung++;
    else if (c[3] && (c[3] !== ba.so || c[5] !== ba.toa)) doiKhac++;
    c[3] = ba.so;
    c[4] = ba.ngay;
    c[5] = ba.toa;
  }
  ra.push(c.map(o).join(','));
}

fs.writeFileSync(fileCsv, '﻿' + ra.join('\n'));
const coBanAn = ra.slice(1).filter(d => d.split('","')[3]).length;
console.log(`Đã cập nhật ${path.basename(fileCsv)}: ${ra.length - 1} dòng, ${coBanAn} dòng có bản án.`);
console.log(`  bổ sung mới ${boSung} dòng, sửa lại ${doiKhac} dòng đang khác DB.`);
