#!/usr/bin/env node
/**
 * Đối soát nhánh kháng cáo + phúc thẩm của luồng hành chính với DB.
 *
 * Log của Playwright không đủ tin: có bước ghi dữ liệu thành công nhưng test fail ở câu kiểm chứng
 * ngay sau đó, nên sổ cái thiếu bước dù DB đã có. Script này lấy trạng thái THẬT từ DB.
 *
 *   1) node tools/doi-soat-phuc-tham-hanh-chinh.js sql   → in SELECT, chạy trên STG
 *   2) node tools/doi-soat-phuc-tham-hanh-chinh.js ap <tệp kết quả>
 *
 * Bước 2 chỉ ĐÁNH DẤU bước đã xong và bù id/mã/số bản án phúc thẩm; không xoá bước nào.
 */
const fs = require('fs');
const path = require('path');

const MOI_TRUONG = process.env.QLA_ENV || 'stg';
const FILE_SO_CAI = path.resolve(__dirname, `../seed-output/hanh-chinh-so-tham.${MOI_TRUONG}.json`);

const docSoCai = () => JSON.parse(fs.readFileSync(FILE_SO_CAI, 'utf8'));

function inSql() {
  const dsMa = Object.values(docSoCai())
    .map(d => d.maVuAn)
    .filter(Boolean)
    .map(m => `'${m}'`)
    .join(',');
  console.log(`select vaGoc.MA_VUAN as MA_ST,
       nvl((select count(*) from DON_KHANGCAO kc where kc.ID_VUAN = vaGoc.ID and kc.DANH_DAU_XOA = 0), 0) as CO_KHANG_CAO,
       nvl((select count(*) from DON_KHANGCAO kc join VANBAN vb on vb.ID = kc.ID_VAN_BAN_THONG_BAO
              where kc.ID_VUAN = vaGoc.ID and kc.DANH_DAU_XOA = 0 and vb.DANH_DAU_XOA = 0), 0) as CO_TB_32HC,
       nvl(vc.TRANG_THAI, 'x') as TT_CHUYEN,
       nvl(vaPt.MA_VUAN, '') as MA_PT,
       nvl(vc.ID_VUAN, '') as ID_PT,
       nvl(vaPt.SO_THULY, '') as SO_THULY_PT,
       nvl((select count(*) from VANBAN vb where vb.ID_VUAN = vaPt.ID and vb.MA_BIEUMAU = '186HC'
              and vb.TRANG_THAI_CAP_SO = 4 and vb.DANH_DAU_XOA = 0), 0) as CO_186HC,
       nvl((select count(*) from VANBAN vb where vb.ID_VUAN = vaPt.ID and vb.MA_BIEUMAU = '36HC'
              and vb.TRANG_THAI_CAP_SO = 4 and vb.DANH_DAU_XOA = 0), 0) as CO_36HC,
       nvl((select max(ba.SO_BAN_AN) from BAN_AN ba where ba.ID_VUAN = vaPt.ID and ba.GIAI_DOAN = 1
              and (ba.DANH_DAU_XOA = 0 or ba.DANH_DAU_XOA is null)), '') as SO_BAN_AN_PT,
       nvl((select to_char(max(ba.NGAY_BAN_AN), 'DD/MM/YYYY') from BAN_AN ba where ba.ID_VUAN = vaPt.ID
              and ba.GIAI_DOAN = 1 and (ba.DANH_DAU_XOA = 0 or ba.DANH_DAU_XOA is null)), '') as NGAY_BAN_AN_PT,
       nvl((select max(ba.TEN_DONVI_RA_BANAN) from BAN_AN ba where ba.ID_VUAN = vaPt.ID and ba.GIAI_DOAN = 1
              and (ba.DANH_DAU_XOA = 0 or ba.DANH_DAU_XOA is null)), '') as TOA_RA_BAN_AN_PT,
       nvl((select max(ba.SO_BAN_AN) from BAN_AN ba where ba.ID_VUAN = vaGoc.ID and ba.GIAI_DOAN = 0
              and (ba.DANH_DAU_XOA = 0 or ba.DANH_DAU_XOA is null)), '') as SO_BAN_AN_ST,
       nvl((select to_char(max(ba.NGAY_BAN_AN), 'DD/MM/YYYY') from BAN_AN ba where ba.ID_VUAN = vaGoc.ID
              and ba.GIAI_DOAN = 0 and (ba.DANH_DAU_XOA = 0 or ba.DANH_DAU_XOA is null)), '') as NGAY_BAN_AN_ST,
       nvl((select max(ba.TEN_DONVI_RA_BANAN) from BAN_AN ba where ba.ID_VUAN = vaGoc.ID and ba.GIAI_DOAN = 0
              and (ba.DANH_DAU_XOA = 0 or ba.DANH_DAU_XOA is null)), '') as TOA_RA_BAN_AN_ST
from VUAN vaGoc
left join VU_CHUYEN vc on vc.ID_VUAN_GOC = vaGoc.ID and vc.DANH_DAU_XOA = 0
                      and vc.LOAI_VU_CHUYEN = '001' and vc.MA_LY_DO_CHUYEN = 'PHUC_THAM'
left join VUAN vaPt on vaPt.ID = vc.ID_VUAN and vaPt.DANH_DAU_XOA = 0
where vaGoc.MA_VUAN in (${dsMa})
order by vaGoc.MA_VUAN`);
}

const COT = [
  'MA_ST',
  'CO_KHANG_CAO',
  'CO_TB_32HC',
  'TT_CHUYEN',
  'MA_PT',
  'ID_PT',
  'SO_THULY_PT',
  'CO_186HC',
  'CO_36HC',
  'SO_BAN_AN_PT',
  'NGAY_BAN_AN_PT',
  'TOA_RA_BAN_AN_PT',
  'SO_BAN_AN_ST',
  'NGAY_BAN_AN_ST',
  'TOA_RA_BAN_AN_ST',
];

function apDung(tep) {
  const soCai = docSoCai();
  const theoMa = new Map(
    Object.entries(soCai)
      .filter(([, d]) => d.maVuAn)
      .map(([khoa, d]) => [d.maVuAn, khoa]),
  );

  const dong = fs
    .readFileSync(tep, 'utf8')
    .split(/\r?\n/)
    // Trình chạy SQL in null thành chuỗi "NULL"; nvl(...,'') trong Oracle vẫn ra NULL vì '' là NULL
    // → phải coi "NULL" là rỗng, nếu không sẽ ghi chuỗi "NULL" vào sổ cái.
    .map(l => l.split('|').map(o => (o.trim() === 'NULL' ? '' : o.trim())))
    .filter(o => /^VA\d\d-\d+$/.test(o[0] || ''));

  let doi = 0;
  for (const o of dong) {
    const r = Object.fromEntries(COT.map((c, i) => [c, o[i] ?? '']));
    const khoa = theoMa.get(r.MA_ST);
    if (!khoa) continue;
    const v = soCai[khoa];
    v.daXong = v.daXong || [];
    const them = [];
    const danhDau = (buoc, dieuKien) => {
      if (dieuKien && !v.daXong.includes(buoc)) {
        v.daXong.push(buoc);
        them.push(buoc);
      }
    };
    const dat = (truong, giaTri) => {
      if (giaTri && !v[truong]) {
        v[truong] = giaTri;
        them.push(truong);
      }
    };

    danhDau('khangCao', Number(r.CO_KHANG_CAO) > 0);
    danhDau('giayXacNhanKhangCao', Number(r.CO_KHANG_CAO) > 0);
    danhDau('thongBaoKhangCao', Number(r.CO_TB_32HC) > 0);
    // TRANG_THAI: 999 chưa chuyển · 000 chờ tiếp nhận (đã chuyển) · 001 đã tiếp nhận
    danhDau('chuyenPhucTham', r.TT_CHUYEN === '000' || r.TT_CHUYEN === '001');
    danhDau('tiepNhanPhucTham', r.TT_CHUYEN === '001');
    dat('idVuAnPt', r.ID_PT);
    dat('maVuAnPt', r.MA_PT);
    danhDau('thuLyPhucTham', !!r.SO_THULY_PT);
    danhDau('phanCongPhucTham', Number(r.CO_186HC) > 0);
    danhDau('kyQuyetDinhXetXuPhucTham', Number(r.CO_36HC) > 0);
    // Biên bản phúc thẩm không áp dụng cho hướng "Bản án" → coi như xong khi đã ký 36-HC
    danhDau('bienBanPhucTham', Number(r.CO_36HC) > 0);
    danhDau('banAnPhucTham', !!r.SO_BAN_AN_PT);
    dat('soBanAnPt', r.SO_BAN_AN_PT);
    dat('ngayBanAnPt', r.NGAY_BAN_AN_PT);
    dat('toaRaBanAnPt', r.TOA_RA_BAN_AN_PT);
    // Bộ ba số + ngày + tòa ra bản án là khoá tìm đơn ở luồng GĐT/TT (xem so-cai-tkm.ts#khoaBanAn),
    // nên lấy đúng theo DB thay vì để số đã ghép hậu tố "/năm" mà lần chạy trước đọc từ form.
    dat('soBanAnDb', r.SO_BAN_AN_ST);
    dat('ngayBanAnDb', r.NGAY_BAN_AN_ST);
    dat('toaRaBanAn', r.TOA_RA_BAN_AN_ST);

    if (them.length) {
      v.luc = new Date().toISOString();
      doi++;
      console.log(`  ${khoa} ${r.MA_ST}: + ${them.join(', ')}`);
    }
  }
  if (doi) fs.writeFileSync(FILE_SO_CAI, JSON.stringify(soCai, null, 2));
  console.log(`\n${doi} dòng được bổ sung theo DB`);
}

const [che, tep] = process.argv.slice(2);
if (che === 'sql') inSql();
else if (che === 'ap' && tep) apDung(tep);
else {
  console.error('Dùng: node tools/doi-soat-phuc-tham-hanh-chinh.js sql');
  console.error('      node tools/doi-soat-phuc-tham-hanh-chinh.js ap <tệp kết quả>');
  process.exit(1);
}
