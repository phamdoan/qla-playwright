/**
 * MỘT báo cáo duy nhất cho đợt GĐT/Tái thẩm 27-09-2026: mỗi vụ một dòng, gộp
 *   · nhận dạng vụ (mã Excel, mã vụ án sơ thẩm, bị cáo, số/ngày bản án, tòa)
 *   · dữ liệu thật trên STG (mã đơn, vụ GĐ3, vụ xét xử GĐ2, số thụ lý xét xử, kết quả xét xử)
 *   · tiến độ 23 bước theo sổ cái (mỗi bước một cột, x = đã xong)
 *   · kết luận + bước cần chạy tiếp + link
 *
 * Chạy:  node tools/bao-cao-gdt-tt.js
 * Ra:    seed-output/<tên bộ>.<env>.bao-cao.<yyyy-mm-dd>.csv   (ghi đè, mỗi ngày đúng một file)
 *
 * Các cột DB lấy từ kết xuất SELECT trên STG (chỉ đọc), đặt ở %TEMP%/kq-db6.txt hoặc đường dẫn khai
 * bằng QLA_DB_DUMP. Mỗi dòng một bản ghi, ngăn bằng "|":
 *   DON|<mã đơn>|<id vụ GĐ3>
 *   GD2|<id vụ GĐ3>|<mã vụ GĐ2>|<id vụ GĐ2>|<số thụ lý>|<trạng thái>
 *   KQ|<id vụ GĐ2>|<nguyên nhân>|<người ký>
 * Không có kết xuất thì các cột DB để trống, phần tiến độ theo sổ cái vẫn đủ dùng.
 */
const fs = require('fs');
const path = require('path');

const E2E = path.resolve(__dirname, '..');
const TEN_BO = 'gdt-tai-tham-phap-nhan-27-09-2026';
const ENV = process.env.QLA_ENV || 'stg';
const GOC =
  { stg: 'https://qla-stg.toaan.gov.vn', dev: 'https://qla-dev.toaan.gov.vn', uat: 'https://qla-uat.toaan.gov.vn' }[ENV] ||
  ENV;
const DUMP = process.env.QLA_DB_DUMP || path.join(process.env.TEMP || '/tmp', 'kq-db6.txt');

/** 23 bước theo tài liệu "Playwright nhập data GDT-TT-báo cáo thống kê.txt" ↔ khoá bước trong sổ cái */
const BUOC = [
  ['B1-B2', 'nhapDon'],
  ['B3', 'phanCong'],
  ['B4', 'toTrinh'],
  ['B7a', 'kyToTrinh'],
  ['B9', 'duyetToTrinh'],
  ['B5', 'thongBao'],
  ['B7b', 'kyThongBao'],
  ['B10b', 'giaoTieuHoSo'],
  ['B11', 'phanCongTTV'],
  ['B12a', 'duThaoKetQua'],
  ['B12b', 'trinhDuThao'],
  ['B13', 'duyetDuThao'],
  ['B13b', 'kyDuThao'],
  ['B14', 'hoSoKhangNghi'],
  ['B15', 'thuLyXetXu'],
  ['B16', 'phanCongTPTC'],
  ['B17', 'duyetPhanCongTPTC'],
  ['B18', 'phanCongTTVHoSo'],
  ['B19', 'danhSachXetXu'],
  ['B20', 'duyetChuongTrinh'],
  ['B21', 'bieuMauHoiDong'],
  ['B22', 'kyBieuMauHoiDong'],
  ['B23', '#ketQua'],
];

/** Đọc bộ dữ liệu thẳng từ file TS bằng regex (không biên dịch TS) */
function docBoDuLieu() {
  const src = fs.readFileSync(path.join(E2E, 'data', TEN_BO + '.ts'), 'utf8');
  const TOA = /const TOA = '([^']+)'/.exec(src)?.[1] || '';
  const TOA_HN = /const TOA_HN = '([^']+)'/.exec(src)?.[1] || '';
  const re = /vu\(\s*'([^']+)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']+)'\s*(?:,\s*\{([\s\S]*?)\n\s*\})?\s*\)/g;
  const ds = [];
  let m;
  while ((m = re.exec(src))) {
    const than = m[6] || '';
    ds.push({
      maSheet: m[1],
      maVuAn: m[2],
      soBanAn: m[3],
      ngayBanAn: m[4],
      thuTuc: m[5],
      toaAn: /toaAn:\s*TOA_HN/.test(than) ? TOA_HN : TOA,
      biCao: /biCao:\s*'([^']*)'/.exec(than)?.[1] || '',
      nguoiKhangNghi: /nguoiKhangNghi:\s*'([^']*)'/.exec(than)?.[1] || '',
    });
  }
  return ds;
}

/** Gộp mọi file sổ cái của bộ này ở cả các thư mục chạy song song (toa-an + toa-an-chay-rieng-*) */
function docSoCai() {
  const goc = path.resolve(E2E, '..', '..');
  const thuMuc = [path.join(E2E, 'seed-output')];
  for (const t of fs.readdirSync(goc).filter(t => /^toa-an-chay-rieng-/.test(t))) {
    thuMuc.push(path.join(goc, t, 'e2e', 'seed-output'));
  }
  const gop = {};
  for (const tm of thuMuc) {
    if (!fs.existsSync(tm)) continue;
    const dau = TEN_BO + '.' + ENV + '.ledger';
    for (const t of fs.readdirSync(tm).filter(t => t.startsWith(dau) && t.endsWith('.json'))) {
      let j;
      try {
        j = JSON.parse(fs.readFileSync(path.join(tm, t), 'utf8'));
      } catch {
        continue;
      }
      for (const [k, v] of Object.entries(j)) {
        const cu = gop[k] || { daXong: [] };
        gop[k] = { ...cu, ...v, daXong: [...new Set([...(cu.daXong || []), ...(v.daXong || [])])] };
      }
    }
  }
  return gop;
}

function docDb() {
  if (!fs.existsSync(DUMP)) return { co: false, gd3: new Map(), gd2: new Map(), kq: new Map() };
  const noiDung = fs.readFileSync(DUMP, 'utf8').split(/\r?\n/);
  const dong = t =>
    noiDung.filter(l => l.startsWith(t + '|')).map(l => l.replace(/\s*\|\s*$/, '').split('|'));
  return {
    co: true,
    gd3: new Map(dong('DON').map(c => [c[1], c[2]])),
    gd2: new Map(dong('GD2').map(c => [c[1], { maVuAn: c[2], id: c[3], soTL: c[4], trangThai: c[5] }])),
    kq: new Map(dong('KQ').map(c => [c[1], { nguyenNhan: c[2], nguoiKy: c[3] }])),
  };
}

const o = t => '"' + String(t ?? '').replace(/"/g, '""') + '"';

function main() {
  const ds = docBoDuLieu();
  const soCai = docSoCai();
  const db = docDb();
  const cot = [
    'Mã Excel', 'Thủ tục', 'Bị cáo/Pháp nhân', 'Mã vụ án sơ thẩm', 'Số bản án', 'Ngày bản án', 'Tòa ra bản án',
    'Người kháng nghị', 'Mã đơn GĐT-TT', 'Số thụ lý đơn', 'Vụ giải quyết đơn (GĐ3)', 'Vụ xét xử GĐT (GĐ2)',
    'Số thụ lý xét xử', 'Nguyên nhân (DB)', 'Người ký kết quả (DB)', 'Trạng thái',
    ...BUOC.map(b => b[0]),
    'Số bước đã xong', 'Bước cần chạy tiếp', 'Các bước còn thiếu', 'Link vụ giải quyết đơn', 'Link vụ xét xử GĐT',
  ];
  const dong = [cot.map(o).join(',')];
  const dem = {};

  for (const v of ds) {
    const s = soCai[v.soBanAn + '|' + v.ngayBanAn + '|' + v.toaAn] || {};
    const idGd3 = s.maDon ? db.gd3.get(String(s.maDon)) : undefined;
    const gd2 = idGd3 ? db.gd2.get(idGd3) : undefined;
    const kq = gd2 ? db.kq.get(gd2.id) : undefined;
    const daXong = new Set(s.daXong || []);
    const xong = BUOC.map(b => (b[1] === '#ketQua' ? !!kq : daXong.has(b[1])));
    const thieu = BUOC.filter((_, i) => !xong[i]).map(b => b[0]);
    const trangThai = kq
      ? 'HOÀN THÀNH'
      : gd2
        ? 'Có vụ xét xử, chưa có kết quả'
        : s.maDon
          ? 'Chưa có vụ xét xử GĐT'
          : 'Chưa nhập đơn';
    dem[trangThai] = (dem[trangThai] || 0) + 1;
    dong.push(
      [
        v.maSheet, v.thuTuc, v.biCao, v.maVuAn, v.soBanAn, v.ngayBanAn, v.toaAn, v.nguoiKhangNghi,
        s.maDon || '', s.soThuLy || '', idGd3 ? 'có' : '', gd2?.maVuAn || '', gd2?.soTL || '',
        kq?.nguyenNhan || '', kq?.nguoiKy || '', trangThai,
        ...xong.map(x => (x ? 'x' : '')),
        xong.filter(Boolean).length,
        thieu[0] || '(xong)',
        thieu.join(' ') || '(không)',
        idGd3 ? GOC + '/qla/vu-an/gdt-tt/quan-ly-an/chi-tiet?id=' + idGd3 : '',
        gd2?.id ? GOC + '/qla/vu-an/gdt-tt/quan-ly-vu-xet-xu/chi-tiet?id=' + gd2.id + '&tab=ket-qua-xet-xu' : '',
      ].map(o).join(','),
    );
  }

  const ngay = new Date().toISOString().slice(0, 10);
  // Mọi luồng (toa-an-chay-rieng-a…e) cùng ghi về seed-output của repo gốc → chỉ một file báo cáo
  const goc = path.resolve(E2E, '..', '..', 'toa-an', 'e2e', 'seed-output');
  const thuMucRa = fs.existsSync(goc) ? goc : path.join(E2E, 'seed-output');
  const ra = path.join(thuMucRa, TEN_BO + '.' + ENV + '.bao-cao.' + ngay + '.csv');
  fs.writeFileSync(ra, '﻿' + dong.join('\r\n') + '\r\n', 'utf8');
  console.log('Đã ghi', ra);
  console.log(
    '  ' +
      Object.entries(dem)
        .sort((a, b) => b[1] - a[1])
        .map(x => x[0] + ': ' + x[1])
        .join(' | '),
  );
  if (!db.co) console.log('  (chưa có kết xuất DB ở ' + DUMP + ' → các cột DB để trống)');
}

if (require.main === module) main();
module.exports = { taoBaoCao: main };
