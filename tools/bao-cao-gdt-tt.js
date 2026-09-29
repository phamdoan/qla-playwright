/**
 * MỘT báo cáo duy nhất cho CẢ HAI đợt GĐT/Tái thẩm đang seed trên STG:
 *   · Đợt 27/09/2026 — 30 vụ hình sự pháp nhân (data/gdt-tai-tham-phap-nhan-27-09-2026.ts)
 *   · Đợt 28/09/2026 — 20 vụ KDTM + dân sự     (data/gdt-kdtm-dan-su-28-09-2026.ts)
 *
 * Mỗi vụ một dòng, gộp:
 *   · nhận dạng vụ (đợt, mã dòng dữ liệu, mã vụ án sơ thẩm, bị cáo/nguyên đơn, số/ngày bản án, tòa)
 *   · dữ liệu thật trên STG (mã đơn, vụ GĐ3, vụ xét xử GĐ2, số thụ lý xét xử, kết quả xét xử)
 *   · tiến độ 23 bước theo sổ cái (mỗi bước một cột, x = đã xong)
 *   · kết luận + bước cần chạy tiếp + link
 *
 * Chạy:  node tools/bao-cao-gdt-tt.js
 * Ra:    seed-output/bao-cao-gdt-tt-27-09-va-28-09.<env>.<yyyy-mm-dd>.csv  (ghi đè, mỗi ngày một file)
 *
 * Sổ cái được gộp từ repo gốc + mọi bản sao toa-an-chay-rieng-* (mỗi luồng ghi sổ cái trong thư mục
 * của nó). Các cột DB lấy từ kết xuất SELECT chỉ đọc trên STG, đặt ở %TEMP%/kq-db6.txt hoặc đường dẫn
 * khai bằng QLA_DB_DUMP. Mỗi dòng một bản ghi, ngăn bằng "|":
 *   DON|<mã đơn>|<id vụ GĐ3>
 *   GD2|<id vụ GĐ3>|<mã vụ GĐ2>|<id vụ GĐ2>|<số thụ lý>|<trạng thái>
 *   KQ|<id vụ GĐ2>|<nguyên nhân>|<người ký>
 * Không có kết xuất thì các cột DB để trống, phần tiến độ theo sổ cái vẫn đủ dùng.
 */
const fs = require('fs');
const path = require('path');

const E2E = path.resolve(__dirname, '..');
const ENV = process.env.QLA_ENV || 'stg';
const GOC_WEB =
  { stg: 'https://qla-stg.toaan.gov.vn', dev: 'https://qla-dev.toaan.gov.vn', uat: 'https://qla-uat.toaan.gov.vn' }[
    ENV
  ] || ENV;
const DUMP =
  process.env.QLA_DB_DUMP ||
  [path.join(E2E, 'seed-output', 'db-stg-gdt.dump.txt'), path.join(process.env.TEMP || '/tmp', 'kq-db6.txt')].find(f =>
    fs.existsSync(f),
  ) ||
  '';

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

/** Đợt 27/09: vu('VG01', 'VA26-…', '515', '09/09/2024', 'Giám đốc thẩm', { biCao: …, toaAn: TOA_HN }) */
function docDot2709(tenBo) {
  const src = fs.readFileSync(path.join(E2E, 'data', tenBo + '.ts'), 'utf8');
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
      loaiAn: 'Hình sự (pháp nhân)',
      toaAn: /toaAn:\s*TOA_HN/.test(than) ? TOA_HN : TOA,
      duongSu: /biCao:\s*'([^']*)'/.exec(than)?.[1] || '',
      nguoiKhangNghi: /nguoiKhangNghi:\s*'([^']*)'/.exec(than)?.[1] || '',
    });
  }
  return ds;
}

/** Đợt 28/09: vu('K01', 'VA26-…', '3', '24/09/2026', 'Kinh doanh thương mại', 'Tòa án…', { nguyenDon: … }) */
function docDot2809(tenBo) {
  const src = fs.readFileSync(path.join(E2E, 'data', tenBo + '.ts'), 'utf8');
  const re =
    /vu\(\s*'([^']+)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']+)',\s*'([^']+)'\s*(?:,\s*\{([\s\S]*?)\n\s*\})?\s*\)/g;
  const ds = [];
  let m;
  while ((m = re.exec(src))) {
    const than = m[7] || '';
    ds.push({
      maSheet: m[1],
      maVuAn: m[2],
      soBanAn: m[3],
      ngayBanAn: m[4],
      loaiAn: m[5],
      toaAn: m[6],
      thuTuc: 'Giám đốc thẩm',
      duongSu: /nguyenDon:\s*'([^']*)'/.exec(than)?.[1] || '',
      nguoiKhangNghi: /nguoiKhangNghi:\s*'([^']*)'/.exec(than)?.[1] || '',
    });
  }
  return ds;
}

const DOT = [
  { ten: '27/09/2026 · hình sự pháp nhân', bo: 'gdt-tai-tham-phap-nhan-27-09-2026', doc: docDot2709 },
  { ten: '28/09/2026 · KDTM + dân sự', bo: 'gdt-kdtm-dan-su-28-09-2026', doc: docDot2809 },
];

/** Gộp mọi file sổ cái của một bộ ở cả các thư mục chạy song song (toa-an + toa-an-chay-rieng-*) */
function docSoCai(tenBo) {
  const goc = path.resolve(E2E, '..', '..');
  const thuMuc = [path.join(E2E, 'seed-output')];
  for (const t of fs.readdirSync(goc).filter(t => /^toa-an-chay-rieng-/.test(t))) {
    thuMuc.push(path.join(goc, t, 'e2e', 'seed-output'));
  }
  const gop = {};
  for (const tm of thuMuc) {
    if (!fs.existsSync(tm)) continue;
    const dau = tenBo + '.' + ENV + '.ledger';
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
  const dong = t => noiDung.filter(l => l.startsWith(t + '|')).map(l => l.replace(/\s*\|\s*$/, '').split('|'));
  return {
    co: true,
    gd3: new Map(dong('DON').map(c => [c[1], c[2]])),
    gd2: new Map(dong('GD2').map(c => [c[1], { maVuAn: c[2], id: c[3], soTL: c[4], trangThai: c[5], ngayTao: c[6] }])),
    kq: new Map(dong('KQ').map(c => [c[1], { nguyenNhan: c[2], nguoiKy: c[3] }])),
  };
}

/**
 * Ghi chú chặn đường đã biết. B14 (chuyển hồ sơ kháng nghị) của án KINH DOANH THƯƠNG MẠI luôn hỏng ở
 * máy chủ: nhãn loại án dài 21 ký tự trong khi cột HOSO_KHANGNGHI_DEN.LOAI_AN chỉ VARCHAR2(20)
 * → ORA-12899 (đo trên STG 29/09/2026). Playwright không đi tiếp được cho tới khi sửa phía hệ thống.
 */
function ghiChu(v, gd2) {
  if (!gd2 && v.loaiAn === 'Kinh doanh thương mại') {
    return 'B14 hỏng do LỖI HỆ THỐNG: ORA-12899 — HOSO_KHANGNGHI_DEN.LOAI_AN là VARCHAR2(20) nhưng ghi nhãn ' +
      '"Kinh doanh thương mại" (21 ký tự). Cần nới cột hoặc lưu mã loại án.';
  }
  return '';
}

/**
 * Lệnh mở Playwright UI để kiểm tra/chạy lại đúng vụ và đúng bước còn thiếu (tools/chay-ui.js).
 * Vụ đã xong thì để trống.
 */
function lenhChayLai(dot, v, thieu) {
  if (!thieu.length) return '';
  const file = dot.bo.includes('27-09') ? '27-09-2026' : '28-09-2026';
  const tu = thieu[0];
  const den = thieu[thieu.length - 1];
  return 'npm run ui:stg:ghi -- --file=' + file + ' --ma=' + v.maSheet + ' --buoc=' + tu + '..' + den + ' --nhanh';
}

const o = t => '"' + String(t ?? '').replace(/"/g, '""') + '"';

function main() {
  const db = docDb();
  const cot = [
    'Đợt', 'Mã dòng dữ liệu', 'Loại án', 'Vụ GĐKT xử lý', 'Thủ tục', 'Bị cáo/Nguyên đơn', 'Mã vụ án sơ thẩm', 'Số bản án',
    'Ngày bản án', 'Tòa ra bản án', 'Người kháng nghị', 'Mã đơn GĐT-TT', 'Số thụ lý đơn',
    'Vụ giải quyết đơn (GĐ3)', 'Vụ xét xử GĐT (GĐ2)', 'Ngày tạo vụ xét xử', 'Số thụ lý xét xử', 'Nguyên nhân (DB)',
    'Người ký kết quả (DB)', 'Trạng thái',
    ...BUOC.map(b => b[0]),
    'Số bước đã xong', 'Bước cần chạy tiếp', 'Các bước còn thiếu', 'Ghi chú', 'Lệnh chạy lại (UI)', 'Link vụ giải quyết đơn', 'Link vụ xét xử GĐT',
  ];
  const dong = [cot.map(o).join(',')];
  const dem = {};

  for (const dot of DOT) {
    if (!fs.existsSync(path.join(E2E, 'data', dot.bo + '.ts'))) continue;
    const ds = dot.doc(dot.bo);
    const soCai = docSoCai(dot.bo);
    for (const v of ds) {
      const s = soCai[v.soBanAn + '|' + v.ngayBanAn + '|' + v.toaAn] || {};
      const idGd3 = s.maDon ? db.gd3.get(String(s.maDon)) : undefined;
      const gd2 = idGd3 ? db.gd2.get(idGd3) : undefined;
      const kq = gd2 ? db.kq.get(gd2.id) : undefined;
      const daXong = new Set(s.daXong || []);
      const xong = BUOC.map(b => (b[1] === '#ketQua' ? !!kq : daXong.has(b[1])));
      const thieu = BUOC.filter((_, i) => !xong[i]).map(b => b[0]);
      // Bước cần chạy tiếp = bước THIẾU ĐẦU TIÊN SAU bước xa nhất đã xong. Lấy bước thiếu đầu danh sách
      // là sai lệch: sổ cái của các lượt chạy cũ có thể trống vài bước đầu dù vụ đã đi rất xa (vd. D05
      // xong 21 bước nhưng B7a không được ghi).
      const xaNhat = xong.lastIndexOf(true);
      const conLai = BUOC.filter((_, i) => i > xaNhat && !xong[i]).map(b => b[0]);
      const buocTiep = conLai[0] || thieu[0] || '(xong)';
      const trangThai = kq
        ? 'HOÀN THÀNH'
        : gd2
          ? 'Có vụ xét xử, chưa có kết quả'
          : s.maDon
            ? 'Chưa có vụ xét xử GĐT'
            : 'Chưa nhập đơn';
      const khoaDem = dot.ten + ' — ' + trangThai;
      dem[khoaDem] = (dem[khoaDem] || 0) + 1;
      dong.push(
        [
          dot.ten, v.maSheet, v.loaiAn, v.loaiAn === 'Dân sự' ? 'Vụ GĐKT dân sự (D01.107)' : 'Vụ GĐKT hình sự (D01.106)', v.thuTuc, v.duongSu, v.maVuAn, v.soBanAn, v.ngayBanAn, v.toaAn,
          v.nguoiKhangNghi, s.maDon || '', s.soThuLy || '', idGd3 ? 'có' : '', gd2?.maVuAn || '', gd2?.ngayTao || '', gd2?.soTL || '',
          kq?.nguyenNhan || '', kq?.nguoiKy || '', trangThai,
          ...xong.map(x => (x ? 'x' : '')),
          xong.filter(Boolean).length,
          buocTiep,
          thieu.join(' ') || '(không)',
          ghiChu(v, gd2),
          lenhChayLai(dot, v, conLai.length ? conLai : thieu),
          idGd3 ? GOC_WEB + '/qla/vu-an/gdt-tt/quan-ly-an/chi-tiet?id=' + idGd3 : '',
          gd2?.id
            ? GOC_WEB + '/qla/vu-an/gdt-tt/quan-ly-vu-xet-xu/chi-tiet?id=' + gd2.id + '&tab=ket-qua-xet-xu'
            : '',
        ].map(o).join(','),
      );
    }
  }

  const ngay = new Date().toISOString().slice(0, 10);
  // Mọi luồng (toa-an-chay-rieng-a…g) cùng ghi về seed-output của repo gốc → chỉ một file báo cáo
  const gocRepo = path.resolve(E2E, '..', '..', 'toa-an', 'e2e', 'seed-output');
  const thuMucRa = fs.existsSync(gocRepo) ? gocRepo : path.join(E2E, 'seed-output');
  const ra = path.join(thuMucRa, 'bao-cao-gdt-tt-27-09-va-28-09.' + ENV + '.' + ngay + '.csv');
  fs.writeFileSync(ra, '﻿' + dong.join('\r\n') + '\r\n', 'utf8');
  console.log('Đã ghi', ra, '—', dong.length - 1, 'vụ');
  for (const [k, n] of Object.entries(dem).sort()) console.log('  ' + k + ': ' + n);
  if (!db.co) console.log('  (chưa có kết xuất DB ở ' + DUMP + ' → các cột DB để trống)');
}

if (require.main === module) main();
module.exports = { taoBaoCao: main };
