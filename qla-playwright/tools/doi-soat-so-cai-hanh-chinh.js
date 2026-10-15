#!/usr/bin/env node
/**
 * Đối soát sổ cái hành chính sơ thẩm với DB.
 *
 * Lần chạy bị ngắt giữa đường (hoặc chạy song song chưa gộp sổ) làm sổ cái thiếu bước dù DB đã có
 * dữ liệu thật → lần sau spec tưởng chưa làm và tạo trùng. Script này KHÔNG tự nối DB (máy này không
 * có driver JDBC trong Node); quy trình hai bước:
 *
 *   1) node tools/doi-soat-so-cai-hanh-chinh.js sql    → in câu SELECT, chạy trên STG bằng Navicat
 *   2) lưu kết quả thành TSV/CSV (MA_VUAN, CO_16HC, CO_20HC, CO_21HC, CO_22HC) rồi:
 *      node tools/doi-soat-so-cai-hanh-chinh.js ap <file>
 *
 * Bước 2 chỉ ĐÁNH DẤU bước đã xong, không bao giờ xoá bước hay sửa id/mã vụ án.
 */
const fs = require('fs');
const path = require('path');

const duongDanSoCai = () =>
  path.resolve(__dirname, `../seed-output/hanh-chinh-so-tham.${process.env.QLA_ENV || 'stg'}.json`);

/** Biểu mẫu chứng minh bước đã xong: 16HC = QĐ đưa ra xét xử đã ký, 22HC = bản án đã ký */
const BUOC_THEO_BIEU_MAU = {
  CO_16HC: ['quyetDinhXetXu', 'kyQuyetDinhXetXu'],
  CO_20HC: ['bienBanPhienToa'],
  CO_21HC: ['bienBanNghiAn'],
  CO_22HC: ['banAn'],
};

function inSql() {
  const soCai = JSON.parse(fs.readFileSync(duongDanSoCai(), 'utf8'));
  const dsMa = Object.values(soCai)
    .map(d => d.maVuAn)
    .filter(Boolean)
    .map(m => `'${m}'`)
    .join(',');
  console.log(`select va.MA_VUAN,
       max(case when vb.MA_BIEUMAU = '16HC' and vb.TRANG_THAI_CAP_SO = 4 then 1 else 0 end) as CO_16HC,
       max(case when vb.MA_BIEUMAU = '20HC' and vb.TRANG_THAI = 4 then 1 else 0 end) as CO_20HC,
       max(case when vb.MA_BIEUMAU = '21HC' and vb.TRANG_THAI = 4 then 1 else 0 end) as CO_21HC,
       max(case when vb.MA_BIEUMAU = '22HC' and vb.TRANG_THAI_CAP_SO = 4 then 1 else 0 end) as CO_22HC
from VUAN va
left join VANBAN vb on vb.ID_VUAN = va.ID and vb.DANH_DAU_XOA = 0
where va.MA_VUAN in (${dsMa})
group by va.MA_VUAN
order by va.MA_VUAN`);
}

function apDung(tepKetQua) {
  const soCai = JSON.parse(fs.readFileSync(duongDanSoCai(), 'utf8'));
  const theoMa = new Map(
    Object.entries(soCai)
      .filter(([, d]) => d.maVuAn)
      .map(([khoa, d]) => [d.maVuAn, khoa]),
  );

  const dong = fs
    .readFileSync(tepKetQua, 'utf8')
    .split(/\r?\n/)
    .map(d => d.split(/[\t|,;]/).map(o => o.trim().replace(/^"|"$/g, '')))
    .filter(o => /^VA\d\d-\d+$/.test(o[0] || ''));

  const cot = ['MA_VUAN', 'CO_16HC', 'CO_20HC', 'CO_21HC', 'CO_22HC'];
  let doi = 0;
  for (const o of dong) {
    const khoa = theoMa.get(o[0]);
    if (!khoa) {
      console.log(`  bỏ qua ${o[0]}: không có trong sổ cái`);
      continue;
    }
    const d = soCai[khoa];
    d.daXong = d.daXong || [];
    const them = [];
    for (let i = 1; i < cot.length; i++) {
      if (o[i] !== '1') continue;
      for (const buoc of BUOC_THEO_BIEU_MAU[cot[i]]) {
        if (!d.daXong.includes(buoc)) {
          d.daXong.push(buoc);
          them.push(buoc);
        }
      }
    }
    if (them.length) {
      d.luc = new Date().toISOString();
      doi++;
      console.log(`  ${khoa} ${o[0]}: + ${them.join(', ')}`);
    }
  }
  if (doi) fs.writeFileSync(duongDanSoCai(), JSON.stringify(soCai, null, 2));
  console.log(`\n${doi} dòng được bổ sung vào ${path.basename(duongDanSoCai())}`);
}

const [che, tep] = process.argv.slice(2);
if (che === 'sql') inSql();
else if (che === 'ap' && tep) apDung(tep);
else {
  console.error('Dùng: node tools/doi-soat-so-cai-hanh-chinh.js sql');
  console.error('      node tools/doi-soat-so-cai-hanh-chinh.js ap <tệp kết quả SELECT>');
  process.exit(1);
}
