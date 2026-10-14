/**
 * ĐỘ PHỦ UT BÁO CÁO THỐNG KÊ: mỗi ô của biểu mẫu kiểm được bằng cách nào, đã kiểm trên màn chưa.
 *
 *   npm run bctk:ut-do-phu              bảng cho người đọc
 *   npm run bctk:ut-do-phu -- --md      bảng Markdown để dán vào tài liệu
 *   npm run bctk:ut-do-phu -- --cong    chỉ kiểm bộ UT, thoát mã 1 nếu khai sai → dùng trong cổng kiểm thử
 *   npm run bctk:ut-do-phu -- --thieu   chỉ in những thứ màn hình ĐANG THIẾU (mã biểu mẫu, danh mục…)
 *
 * Kết quả chạy đọc từ `state/bao-cao-thong-ke/ut-mapping/<env>.ndjson` (spec
 * `tests/bao-cao-thong-ke/ut-mapping-man-hinh.spec.ts` ghi ra, mỗi lượt chạy nối thêm dòng; lấy
 * dòng MỚI NHẤT của mỗi thứ). Chưa chạy spec thì cột "trên màn" là "chưa kiểm".
 */
import fs from 'node:fs';
import path from 'node:path';
import { BO_UT, DS_UT, THEO_COT_DB, THEO_MA_BIEU_MAU, THEO_NHOM_DANH_MUC } from '../../bctk/ut/chi-muc.ts';
import { TEN_LOAI_UT } from '../../bctk/ut/loai.ts';
import { NEO_COT_DB, NHAN_NHOM_DANH_MUC } from '../../bctk/ut/neo.ts';

const args = process.argv.slice(2);
const raMd = args.includes('--md');
const chiKiem = args.includes('--cong');
const chiThieu = args.includes('--thieu');
const moiTruong = process.env.QLA_ENV || 'stg';

// ── 1 · cổng kiểm bộ UT: bắt khai sai NGAY trong dữ liệu, không cần chạy trình duyệt ──────────────
const loi = [];
for (const u of DS_UT) {
  const dau = `${u.bieuMau} cột ${u.soCot}`;
  if (u.loai === 'BIEU_MAU' && !u.maBieuMauCanCo.length) loi.push(`${dau}: loai=BIEU_MAU mà không có mã nào`);
  if (u.loai === 'DANH_MUC' && !u.nhomDanhMucCanCo.length) loi.push(`${dau}: loai=DANH_MUC mà không có nhóm nào`);
  if (u.loai === 'TRUONG' && !u.cotDbCanCo.length) loi.push(`${dau}: loai=TRUONG mà không có cột DB nào`);
  if (u.loai === 'CONG_THUC' && !u.congThuc && !u.manHinh.includes('CONG_THUC')) {
    loi.push(`${dau}: loai=CONG_THUC mà không có công thức lẫn ghi chú màn "công thức"`);
  }
  if (u.loai === 'CHUA_RO' && !u.lyDoChuaRo) loi.push(`${dau}: loai=CHUA_RO mà không ghi lý do`);
}
if (loi.length) {
  console.error('BỘ UT KHAI SAI (sinh lại: node tools/bctk/sinh-ut.js):\n  ' + loi.join('\n  '));
  process.exit(1);
}
if (chiKiem) {
  console.log(`Bộ UT hợp lệ: ${DS_UT.length} ô của ${Object.keys(BO_UT).length} biểu mẫu.`);
  process.exit(0);
}

// ── 2 · kết quả chạy trên màn ────────────────────────────────────────────────────────────────────
const tepKq = path.resolve(import.meta.dirname, `../../state/bao-cao-thong-ke/ut-mapping/${moiTruong}.ndjson`);
/** `<nhom>|<thu>` → dòng kết quả mới nhất */
const ketQua = new Map();
if (fs.existsSync(tepKq)) {
  for (const dong of fs.readFileSync(tepKq, 'utf8').split('\n')) {
    if (!dong.trim()) continue;
    try {
      const d = JSON.parse(dong);
      ketQua.set(`${d.nhom}|${d.thu}`, d);
    } catch {
      /* dòng hỏng: bỏ */
    }
  }
}
const tra = (nhom, thu) => ketQua.get(`${nhom}|${thu}`);
const NHAN_TT = { CO: 'có trên màn', KHONG_CO: 'KHÔNG CÓ', CHUA_KIEM: 'chưa kiểm được' };
const nhanTt = d => (d ? NHAN_TT[d.trangThai] || d.trangThai : 'chưa chạy');

// ── 3 · bảng theo biểu mẫu ───────────────────────────────────────────────────────────────────────
const hangBieuMau = Object.entries(BO_UT).map(([ma, b]) => {
  const dem = {};
  for (const u of b.cot) dem[u.loai] = (dem[u.loai] || 0) + 1;
  return { ma, tong: b.cot.length, dem, boLocChung: b.boLocChung };
});

// ── 4 · bảng theo THỨ phải tìm trên màn ──────────────────────────────────────────────────────────
const hangThu = [
  ...[...THEO_MA_BIEU_MAU].map(([thu, ds]) => ({ nhom: 'BIEU_MAU', thu, ds, daKhaiNeo: true })),
  ...[...THEO_NHOM_DANH_MUC].map(([thu, ds]) => ({
    nhom: 'DANH_MUC',
    thu,
    ds,
    daKhaiNeo: !!NHAN_NHOM_DANH_MUC[thu],
  })),
  ...[...THEO_COT_DB].map(([thu, ds]) => ({ nhom: 'TRUONG', thu, ds, daKhaiNeo: !!NEO_COT_DB[thu] })),
].map(h => {
  const d = tra(h.nhom, h.thu);
  return { ...h, kq: d, trangThai: h.daKhaiNeo ? nhanTt(d) : 'chưa khai neo' };
});

const thieu = hangThu.filter(h => h.kq?.trangThai === 'KHONG_CO');

if (chiThieu) {
  if (!thieu.length) {
    console.log(
      ketQua.size
        ? `Không có thứ nào thiếu trên màn (${moiTruong}).`
        : `Chưa có kết quả chạy cho môi trường "${moiTruong}" — chạy spec UT trước.`,
    );
    process.exit(0);
  }
  console.log(`THIẾU TRÊN MÀN (${moiTruong}) — ${thieu.length} thứ:`);
  for (const h of thieu) {
    const o = h.ds.map(u => `${u.bieuMau}#${u.soCot}`).join(' ');
    console.log(`  ${h.nhom.padEnd(9)} ${h.thu.padEnd(22)} → hỏng ${h.ds.length} ô: ${o}`);
  }
  process.exit(0);
}

if (raMd) {
  console.log(`## UT mapping ↔ màn hình · môi trường ${moiTruong}\n`);
  console.log('| Biểu mẫu | Tổng ô | ' + Object.values(TEN_LOAI_UT).join(' | ') + ' |');
  console.log('|---|---:|' + Object.keys(TEN_LOAI_UT).map(() => '---:|').join(''));
  for (const h of hangBieuMau) {
    const o = Object.keys(TEN_LOAI_UT).map(k => h.dem[k] || 0);
    console.log(`| ${h.ma} | ${h.tong} | ${o.join(' | ')} |`);
  }
  console.log('\n| Nhóm | Thứ phải có trên màn | Số ô phụ thuộc | Tình trạng |');
  console.log('|---|---|---:|---|');
  for (const h of hangThu) console.log(`| ${h.nhom} | ${h.thu} | ${h.ds.length} | ${h.trangThai} |`);
  process.exit(0);
}

console.log(`UT mapping ↔ màn hình · môi trường ${moiTruong} · ${DS_UT.length} ô báo cáo\n`);
console.log('biểu mẫu   tổng   ' + Object.values(TEN_LOAI_UT).map(t => t.padStart(18)).join(''));
for (const h of hangBieuMau) {
  console.log(
    `  ${h.ma.padEnd(9)}${String(h.tong).padStart(4)}   ` +
      Object.keys(TEN_LOAI_UT)
        .map(k => String(h.dem[k] || 0).padStart(18))
        .join(''),
  );
}

const theoNhom = {};
for (const h of hangThu) {
  theoNhom[h.nhom] ??= {};
  theoNhom[h.nhom][h.trangThai] = (theoNhom[h.nhom][h.trangThai] || 0) + 1;
}
console.log('\nthứ phải tìm trên màn:');
for (const [nhom, dem] of Object.entries(theoNhom)) {
  const chiTiet = Object.entries(dem)
    .map(([tt, n]) => `${n} ${tt}`)
    .join(' · ');
  console.log(`  ${nhom.padEnd(10)} ${Object.values(dem).reduce((a, b) => a + b, 0)} thứ → ${chiTiet}`);
}

if (thieu.length) {
  console.log(`\nTHIẾU TRÊN MÀN (${thieu.length}) — xem chi tiết: npm run bctk:ut-do-phu -- --thieu`);
  for (const h of thieu.slice(0, 10)) console.log(`  ${h.nhom} ${h.thu} → hỏng ${h.ds.length} ô báo cáo`);
}
if (!ketQua.size) {
  console.log(
    `\nChưa có kết quả chạy cho "${moiTruong}". Chạy:\n` +
      '  QLA_HO_SO_ENV=staging npx playwright test tests/bao-cao-thong-ke/ut-mapping-man-hinh.spec.ts',
  );
}
