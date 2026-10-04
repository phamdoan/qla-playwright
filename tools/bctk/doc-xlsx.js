/** Đọc xlsx bằng unzip + parse XML thô (máy không có thư viện xlsx). node doc-xlsx.js <tep> [soDong] */
const { execFileSync } = require('child_process');
const tep = process.argv[2];
const gioiHan = Number(process.argv[3] || 60);

const doc = n => {
  try {
    return execFileSync('unzip', ['-p', tep, n], { maxBuffer: 1 << 28 }).toString('utf8');
  } catch {
    return '';
  }
};

const huy = s =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&amp;/g, '&');

// sharedStrings: mỗi <si> có thể gồm nhiều <t> (rich text) → nối lại
const ss = [];
for (const si of doc('xl/sharedStrings.xml').split('<si>').slice(1)) {
  ss.push(huy([...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]).join('')));
}

const dsSheet = [...doc('xl/workbook.xml').matchAll(/<sheet[^>]*name="([^"]*)"[^>]*r:id="rId(\d+)"/g)].map(m => ({
  ten: huy(m[1]),
  rid: m[2],
}));
console.log(`SHEET: ${dsSheet.map(s => s.ten).join(' | ') || '(không đọc được tên)'}\n`);

for (let i = 1; i <= Math.max(1, dsSheet.length); i++) {
  const xml = doc(`xl/worksheets/sheet${i}.xml`);
  if (!xml) continue;
  console.log(`───── sheet${i} · ${dsSheet[i - 1]?.ten ?? ''} ─────`);
  let n = 0;
  for (const row of xml.split('<row ').slice(1)) {
    const o = [];
    for (const m of row.matchAll(/<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g)) {
      const cot = m[1];
      const laSS = /t="s"/.test(m[2]);
      const laIS = /t="inlineStr"/.test(m[2]);
      let v = (m[3].match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      if (laIS) v = [...m[3].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join('');
      if (v === undefined) continue;
      o.push(`${cot}=${(laSS ? ss[+v] : laIS ? huy(v) : v).replace(/\s+/g, ' ').trim().slice(0, 90)}`);
    }
    if (!o.length) continue;
    console.log('  ' + o.join(' │ '));
    if (++n >= gioiHan) {
      console.log('  … (cắt)');
      break;
    }
  }
  console.log();
}
