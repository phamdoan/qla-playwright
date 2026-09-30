/**
 * In bản đồ data lineage của một FLOW và KIỂM tính hợp lệ:
 * mọi khoá một bước ĐỌC phải do một bước TRƯỚC nó SINH RA.
 *
 * Bắt đúng lỗi "hard-code lại dữ liệu bước trước đã tạo" ngay lúc khai báo, không cần chạy thật.
 *
 *   npm run flow:lineage                                   flow mặc định (KDTM flow-001)
 *   node --experimental-strip-types tools/lineage.js       (cách gọi trực tiếp)
 *   node tools/lineage.js kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao
 *   node tools/lineage.js --md                              xuất bảng Markdown để dán vào docs
 *
 * Thoát mã 1 khi lineage sai → dùng được trong cổng kiểm thử.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const raMd = args.includes('--md');
const duongDanFlow = args.find(a => !a.startsWith('--')) || 'kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao';

function napFlow() {
  const p = path.resolve(__dirname, '..', 'flows', duongDanFlow, 'flow.ts');
  const mod = require(p);
  const flow = mod.FLOW_001 || Object.values(mod).find(v => v && v.buoc);
  if (!flow) throw new Error(`Không tìm thấy định nghĩa flow trong ${p}`);
  return flow;
}

const flow = napFlow();

/**
 * Bước nào đã cài đặt: ĐỌC TEXT của `cai-dat.ts` thay vì require.
 * Node --experimental-strip-types đòi import có đuôi ".ts", còn repo viết import không đuôi theo
 * lối Playwright → require sẽ hỏng. Đọc khoá của bảng bằng regex là đủ và không phụ thuộc bundler.
 */
function napCaiDat() {
  try {
    const src = fs.readFileSync(path.resolve(__dirname, '..', 'flows', duongDanFlow, 'cai-dat.ts'), 'utf8');
    const than = src.slice(src.indexOf('CAI_DAT'));
    return new Set([...than.matchAll(/'([0-9]{2}-[a-z0-9-]+)'s*:/g)].map(m => m[1]));
  } catch {
    return new Set();
  }
}
const daCaiDat = napCaiDat();
const { kiemLineage } = require(path.resolve(__dirname, '../khung/flow.ts'));

const loi = kiemLineage(flow);

if (raMd) {
  console.log(`# Lineage — ${flow.ten}\n`);
  console.log('| # | Bước | Màn hình | Vai | Đọc từ state | Sinh ra | Xác minh | Cài đặt |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const b of flow.buoc) {
    const cot = [
      b.ma.slice(0, 2),
      b.ma.slice(3),
      b.manHinh,
      b.vai,
      b.vao.length ? '`' + b.vao.join('`, `') + '`' : '—',
      b.ra.length ? '`' + b.ra.join('`, `') + '`' : '—',
      b.xacMinh,
      daCaiDat.has(b.ma) ? 'có' : '—',
    ];
    console.log('| ' + cot.map(c => String(c).replace(/\|/g, '\\|')).join(' | ') + ' |');
  }
} else {
  console.log(`FLOW ${flow.phanHe}/${flow.flow} — ${flow.buoc.length} bước\n`);
  const sinhBoi = new Map();
  for (const b of flow.buoc) {
    const doc = b.vao.map(k => `${k} ← ${sinhBoi.get(k) || '???'}`);
    console.log(`${b.ma}  [${b.xacMinh}]  vai=${b.vai}  ${daCaiDat.has(b.ma) ? 'ĐÃ CÀI ĐẶT' : 'chưa cài đặt (fixme)'}`);
    console.log(`   màn hình : ${b.manHinh}`);
    if (b.route) console.log(`   route    : ${b.route}`);
    if (doc.length) console.log(`   đọc      : ${doc.join(' | ')}`);
    if (b.ra.length) console.log(`   sinh ra  : ${b.ra.join(', ')}`);
    for (const k of b.ra) sinhBoi.set(k, b.ma);
    console.log('');
  }
  const theoMuc = flow.buoc.reduce((a, b) => ((a[b.xacMinh] = (a[b.xacMinh] || 0) + 1), a), {});
  console.log('Mức xác minh:', Object.entries(theoMuc).map(([k, v]) => `${k}=${v}`).join('  '));
  console.log(`Cài đặt: ${daCaiDat.size}/${flow.buoc.length} bước`);
  const la = flow.buoc.map(b => b.ma);
  const khongKhai = [...daCaiDat].filter(m => !la.includes(m));
  if (khongKhai.length) console.log('⚠ cai-dat.ts có mã bước KHÔNG khai trong flow.ts:', khongKhai.join(', '));
}

if (loi.length) {
  console.error(`\n✗ LINEAGE SAI (${loi.length}):`);
  for (const l of loi) console.error('  · ' + l);
  process.exit(1);
}
console.error('\n✓ Lineage hợp lệ: mọi khoá đều do một bước trước sinh ra.');
