#!/usr/bin/env node
/**
 * TIẾN TRÌNH LUỒNG — xem MỘT MÀN toàn bộ 46 bước của từng case, đọc từ sổ cái (state).
 *
 * Không chạy test, không mở trình duyệt: chỉ đọc file sổ cái nên bật song song với lượt chạy nào cũng
 * được. Dùng khi không muốn dò từng dòng log.
 *
 *   node tools/tien-trinh.js                       tất cả case của flow-001, môi trường stg
 *   node tools/tien-trinh.js --theo-doi            in lại mỗi 15 giây (Ctrl+C để dừng)
 *   node tools/tien-trinh.js --theo-doi=5          in lại mỗi 5 giây
 *   node tools/tien-trinh.js --case=case-002       một case
 *   node tools/tien-trinh.js --so-cai=a            chỉ sổ cái hậu tố a
 *   node tools/tien-trinh.js --loi                 kèm thông báo lỗi của bước FAILED
 *
 * Trạng thái mỗi bước: [v] xong · [x] lỗi · [ ] chưa chạy.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const lay = ten => {
  const a = args.find(x => x === `--${ten}` || x.startsWith(`--${ten}=`));
  if (!a) return undefined;
  const v = a.split('=')[1];
  return v === undefined ? '' : v;
};
/**
 * Thư mục gốc để đọc sổ cái: ưu tiên --goc=, rồi THƯ MỤC ĐANG ĐỨNG (để xem tiến trình của bản sao
 * toa-an-chay-rieng-*), cuối cùng là repo chứa chính script này.
 */
const GOC = lay('goc') || (fs.existsSync(path.join(process.cwd(), 'state')) ? process.cwd() : path.resolve(__dirname, '..'));
const FLOW = lay('flow') || 'flow-001-st-pt-gdt-bao-cao';
const PHAN_HE = lay('phan-he') || 'kinh-doanh-thuong-mai';
const MOI_TRUONG = lay('moi-truong') || 'stg';
const hienLoi = lay('loi') !== undefined;

/** Danh sách bước THEO THỨ TỰ, đọc trực tiếp từ flow.ts (không biên dịch TS) */
function danhSachBuoc() {
  const f = path.join(GOC, 'flows', PHAN_HE, FLOW, 'flow.ts');
  const chu = fs.readFileSync(f, 'utf8');
  const ds = [];
  for (const m of chu.matchAll(/\bma:\s*'([^']+)'/g)) if (/^\d{2}-/.test(m[1])) ds.push(m[1]);
  return ds;
}

/** Các file sổ cái của flow: <case>.<moiTruong>[.<soCai>].state.json */
function dsSoCai() {
  const d = path.join(GOC, 'state', PHAN_HE, FLOW);
  if (!fs.existsSync(d)) return [];
  const loc = { caseId: lay('case'), soCai: lay('so-cai') };
  return fs
    .readdirSync(d)
    .filter(t => t.endsWith('.state.json') && !t.includes('.bak'))
    .map(t => {
      const m = t.match(/^(case-[^.]+)\.([^.]+)(?:\.([^.]+))?\.state\.json$/);
      return m ? { tep: path.join(d, t), caseId: m[1], moiTruong: m[2], soCai: m[3] || '(mặc định)' } : null;
    })
    .filter(Boolean)
    .filter(x => x.moiTruong === MOI_TRUONG)
    .filter(x => !loc.caseId || x.caseId === loc.caseId)
    .filter(x => !loc.soCai || x.soCai === loc.soCai)
    .sort((a, b) => a.caseId.localeCompare(b.caseId) || a.soCai.localeCompare(b.soCai));
}

const DAU = { xong: '[v]', loi: '[x]', chua: '[ ]' };

function inMotSoCai(sc, dsBuoc) {
  let j;
  try {
    j = JSON.parse(fs.readFileSync(sc.tep, 'utf8'));
  } catch (e) {
    console.log(`\n${sc.caseId} · sổ cái ${sc.soCai}: KHÔNG đọc được (${e.message})`);
    return;
  }
  const b = j.xongBuoc || j.buoc || {};
  const ds = dsBuoc.length ? dsBuoc : Object.keys(b).sort();
  const xong = ds.filter(m => b[m]?.status === 'PASSED').length;
  const loi = ds.filter(m => b[m]?.status === 'FAILED');
  const la = Object.keys(b).filter(m => !ds.includes(m));
  console.log(
    `\n══ ${sc.caseId} · sổ cái ${sc.soCai} · ${MOI_TRUONG.toUpperCase()} ── ${xong}/${ds.length} bước xong` +
      `${loi.length ? ` · ${loi.length} lỗi` : ''}`,
  );
  for (const ma of ds) {
    const t = b[ma];
    const dau = t?.status === 'PASSED' ? DAU.xong : t?.status === 'FAILED' ? DAU.loi : DAU.chua;
    const luc = t?.luc ? new Date(t.luc).toLocaleString('vi-VN') : '';
    console.log(`  ${dau} ${ma}${luc ? `   ${luc}` : ''}`);
    if (hienLoi && t?.status === 'FAILED' && t.loi) {
      console.log(`        ↳ ${String(t.loi).replace(/\u001b\[\d+m/g, '').replace(/\s+/g, ' ').trim().slice(0, 300)}`);
    }
  }
  if (la.length) console.log(`  (bước có trong sổ cái nhưng không có trong flow.ts: ${la.join(', ')})`);
  const dl = j.duLieu || {};
  const moc = Object.entries(dl).filter(([k]) => /ban[Aa]n|VuAn|Don|ChuongTrinh|VuXetXu|ThuLy/.test(k));
  if (moc.length) {
    console.log('  Mốc dữ liệu hệ thống cấp:');
    for (const [k, v] of moc.slice(0, 14)) console.log(`    · ${k} = ${String(v).slice(0, 90)}`);
  }
}

function inTatCa() {
  const dsBuoc = danhSachBuoc();
  const ds = dsSoCai();
  console.log(`TIẾN TRÌNH ${FLOW} · ${new Date().toLocaleString('vi-VN')} · ${dsBuoc.length} bước khai trong flow.ts`);
  if (!ds.length) {
    console.log(`\nChưa có sổ cái nào ở state/${PHAN_HE}/${FLOW} cho môi trường ${MOI_TRUONG}.`);
    console.log('(Chạy ở thư mục nào thì sổ cái nằm ở thư mục đó — bản sao toa-an-chay-rieng-* có sổ cái riêng.)');
    return;
  }
  for (const sc of ds) inMotSoCai(sc, dsBuoc);
}

const chuKy = lay('theo-doi');
if (chuKy === undefined) {
  inTatCa();
} else {
  const giay = Math.max(2, Number(chuKy) || 15);
  const ve = () => {
    process.stdout.write('\u001b[2J\u001b[H'); // xoá màn, về góc trên
    inTatCa();
    console.log(`\n(làm mới mỗi ${giay}s — Ctrl+C để dừng)`);
  };
  ve();
  setInterval(ve, giay * 1000);
}
