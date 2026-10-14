/**
 * Sinh bộ UT từ bản bóc mapping: `tools/bctk/mapping/<mã>.json` → `bctk/ut/<mã>.ts` + `chi-muc.ts`.
 *
 *   node tools/bctk/sinh-ut.js 2A 2B 4A 4B 4C 4D
 *
 * Chạy lại được nhiều lần (tệp sinh ra bị ghi đè). Muốn đổi dữ liệu UT thì sửa mapping rồi bóc lại:
 *
 *   node tools/bctk/boc-mapping.js "<thư mục Mapping Data>" 2A 2B 4A 4B 4C 4D
 *   node tools/bctk/sinh-ut.js 2A 2B 4A 4B 4C 4D
 */
const fs = require('fs');
const path = require('path');
const { phanLoaiCot } = require('./phan-loai-ut');

const THU_MUC_MAPPING = path.join(__dirname, 'mapping');
const THU_MUC_UT = path.join(__dirname, '..', '..', 'bctk', 'ut');

const S = v => JSON.stringify(v ?? '');
const DS = a => `[${(a || []).map(S).join(', ')}]`;

function sinhMotBieuMau(ma) {
  const d = JSON.parse(fs.readFileSync(path.join(THU_MUC_MAPPING, `${ma}.json`), 'utf8'));
  const dong = [];
  for (const c of d.cot) {
    const p = phanLoaiCot(c);
    dong.push(
      '  {\n' +
        `    bieuMau: ${S(ma)},\n` +
        `    soCot: ${c.soCot},\n` +
        `    tenCot: ${S(c.tenCot)},\n` +
        `    manHinhMapping: ${S(c.manHinh)},\n` +
        `    manHinh: ${DS(p.manHinh)},\n` +
        `    loai: ${S(p.loai)},\n` +
        `    maBieuMauCanCo: ${DS(p.maBieuMau)},\n` +
        `    nhomDanhMucCanCo: ${DS(p.maLoaiDanhMuc)},\n` +
        `    cotDbCanCo: ${DS(p.cotDb)},\n` +
        `    congThuc: ${S(c.congThuc)},\n` +
        `    trangThaiBa: ${S(c.trangThai)},\n` +
        `    coTaiLieu: ${S(c.coTaiLieu)},\n` +
        `    coDb: ${S(c.coDb)},\n` +
        `    coHeThong: ${S(c.coHeThong)},\n` +
        `    lyDoChuaRo: ${S(p.lyDoChuaRo)},\n` +
        `    dongExcel: ${c.dongExcel},\n` +
        '  },',
    );
  }

  const ten = `UT_${ma}`;
  const noi =
    `/**\n` +
    ` * UT biểu mẫu báo cáo ${ma} — ${d.cot.length} cột.\n` +
    ` *\n` +
    ` * TỆP NÀY SINH TỰ ĐỘNG, đừng sửa tay:\n` +
    ` *   node tools/bctk/boc-mapping.js "<thư mục Mapping Data>" ${ma}\n` +
    ` *   node tools/bctk/sinh-ut.js ${ma}\n` +
    ` *\n` +
    ` * Nguồn: ${d.tepNguon} · sheet "${d.sheetMapping}" (tệp gốc KHÔNG nằm trong repo — repo public).\n` +
    ` */\n` +
    // Quy ước của `bctk/`: import kèm đuôi .ts để `node --experimental-strip-types` nạp được
    `import type { BoUt } from './loai.ts';\n\n` +
    `export const ${ten}: BoUt = {\n` +
    `  ma: ${S(ma)},\n` +
    `  tepNguon: ${S(d.tepNguon)},\n` +
    `  boLocChung: ${S(d.boLocChung)},\n` +
    `  cot: [\n${dong.join('\n')}\n  ],\n` +
    `};\n`;

  fs.mkdirSync(THU_MUC_UT, { recursive: true });
  fs.writeFileSync(path.join(THU_MUC_UT, `${ma}.ts`), noi, 'utf8');
  return { ma, ten, so: d.cot.length };
}

function sinhChiMuc(ds) {
  const noi =
    `/**\n` +
    ` * Gom các bộ UT biểu mẫu báo cáo + các bảng tra dùng chung cho spec UT.\n` +
    ` *\n` +
    ` * TỆP NÀY SINH TỰ ĐỘNG: node tools/bctk/sinh-ut.js ${ds.map(x => x.ma).join(' ')}\n` +
    ` */\n` +
    ds.map(x => `import { ${x.ten} } from './${x.ma}.ts';`).join('\n') +
    `\nimport type { BoUt, UtCot } from './loai.ts';\n\n` +
    `export const BO_UT: Record<string, BoUt> = {\n` +
    ds.map(x => `  ${S(x.ma)}: ${x.ten},`).join('\n') +
    `\n};\n\n` +
    `export const DS_BIEU_MAU_BAO_CAO = Object.keys(BO_UT);\n\n` +
    `/** Mọi UT của mọi biểu mẫu, phẳng. */\n` +
    `export const DS_UT: UtCot[] = Object.values(BO_UT).flatMap(b => b.cot);\n\n` +
    `/** Gom theo thứ phải tìm trên màn: mã biểu mẫu → những ô báo cáo phụ thuộc nó. */\n` +
    `function gom(chon: (u: UtCot) => string[]): Map<string, UtCot[]> {\n` +
    `  const m = new Map<string, UtCot[]>();\n` +
    `  for (const u of DS_UT) {\n` +
    `    for (const k of chon(u)) {\n` +
    `      if (!m.has(k)) m.set(k, []);\n` +
    `      m.get(k)!.push(u);\n` +
    `    }\n` +
    `  }\n` +
    `  return new Map([...m].sort((a, b) => a[0].localeCompare(b[0])));\n` +
    `}\n\n` +
    `export const THEO_MA_BIEU_MAU = gom(u => u.maBieuMauCanCo);\n` +
    `export const THEO_NHOM_DANH_MUC = gom(u => u.nhomDanhMucCanCo);\n` +
    `export const THEO_COT_DB = gom(u => u.cotDbCanCo);\n`;
  fs.writeFileSync(path.join(THU_MUC_UT, 'chi-muc.ts'), noi, 'utf8');
}

function main() {
  let ds = process.argv.slice(2);
  if (!ds.length) {
    ds = fs
      .readdirSync(THU_MUC_MAPPING)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace(/\.json$/, ''));
  }
  const ra = ds.map(sinhMotBieuMau);
  sinhChiMuc(ra);
  for (const r of ra) console.log(`bctk/ut/${r.ma}.ts · ${r.so} UT`);
  console.log(`bctk/ut/chi-muc.ts · ${ra.reduce((s, r) => s + r.so, 0)} UT tổng`);
}

if (require.main === module) main();
