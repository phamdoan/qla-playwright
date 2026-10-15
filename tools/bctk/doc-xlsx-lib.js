/**
 * Đọc xlsx không cần thư viện ngoài (máy không có `xlsx`): unzip + parse XML thô.
 *
 * Khác `doc-xlsx.js` (bộ in nhanh để xem mắt thường) ở MỘT điểm quyết định:
 * `doc-xlsx.js` dùng regex `<c r="..."...>(...)</c>` nên **ô rỗng tự đóng** (`<c r="C3" s="18"/>`)
 * không khớp, regex nhảy sang ô kế tiếp và mọi nhãn cột phía sau bị trượt — đó là lý do bản in ra
 * có những giá trị số vô nghĩa (`C=15`, `C=59`): đó là chỉ số sharedString của ô KHÁC bị gán sai cột.
 * Bóc mapping thì sai cột = sai hết, nên ở đây tách từng `<c …>` một cách tuần tự.
 */
const { execFileSync } = require('child_process');

/** Đọc một entry trong xlsx; trả '' nếu không có. */
function docEntry(tep, ten) {
  try {
    return execFileSync('unzip', ['-p', tep, ten], { maxBuffer: 1 << 28 }).toString('utf8');
  } catch {
    return '';
  }
}

function huyXml(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&amp;/g, '&');
}

function gonTrang(s) {
  return s.replace(/\s+/g, ' ').trim();
}

/** sharedStrings: mỗi <si> có thể gồm nhiều <t> (rich text) → nối lại. */
function docSharedStrings(tep) {
  const xml = docEntry(tep, 'xl/sharedStrings.xml');
  const ds = [];
  for (const si of xml.split('<si>').slice(1)) {
    ds.push(huyXml([...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]).join('')));
  }
  return ds;
}

/** Tên sheet → đường dẫn entry, giải đúng qua workbook.xml.rels (không đoán theo thứ tự sheetN). */
function dsSheet(tep) {
  const wb = docEntry(tep, 'xl/workbook.xml');
  const rels = docEntry(tep, 'xl/_rels/workbook.xml.rels');
  const banDoRel = new Map();
  for (const m of rels.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    banDoRel.set(m[1], m[2].replace(/^\/?xl\//, '').replace(/^\.\.\//, ''));
  }
  // Target có thể đứng trước Id trong một số bộ sinh tệp
  for (const m of rels.matchAll(/<Relationship[^>]*Target="([^"]+)"[^>]*Id="([^"]+)"/g)) {
    if (!banDoRel.has(m[2])) banDoRel.set(m[2], m[1].replace(/^\/?xl\//, '').replace(/^\.\.\//, ''));
  }

  const ds = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const the = m[0];
    const ten = huyXml((the.match(/name="([^"]*)"/) || [])[1] || '');
    const rid = (the.match(/r:id="([^"]+)"/) || [])[1];
    const dich = rid && banDoRel.get(rid);
    if (ten && dich) ds.push({ ten, entry: `xl/${dich}` });
  }
  return ds;
}

const SO_COT = cot => [...cot].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0);

/**
 * Đọc một sheet thành lưới: `luoi[dong][cot]` = chuỗi đã gọn khoảng trắng.
 * `dong` là số dòng thật của Excel (1-based), `cot` là chữ cái cột ('A', 'AB'…).
 */
function docSheet(tep, entry, ss) {
  const xml = docEntry(tep, entry);
  const luoi = new Map();
  for (const mRow of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const dong = +((mRow[1].match(/\br="(\d+)"/) || [])[1] || 0);
    if (!dong) continue;
    const hang = new Map();
    // Tách từng ô: dạng đầy đủ `<c …>…</c>` HOẶC rỗng tự đóng `<c …/>`
    for (const mC of mRow[2].matchAll(/<c\b([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g)) {
      const thuocTinh = mC[1];
      const noiDung = mC[3] || '';
      const cot = ((thuocTinh.match(/\br="([A-Z]+)\d+"/) || [])[1] || '').trim();
      if (!cot) continue;
      const kieu = (thuocTinh.match(/\bt="([^"]+)"/) || [])[1] || 'n';
      let gt;
      if (kieu === 'inlineStr') {
        gt = huyXml([...noiDung.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join(''));
      } else {
        const v = (noiDung.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        if (v === undefined) continue;
        gt = kieu === 's' ? (ss[+v] ?? '') : huyXml(v);
      }
      gt = gonTrang(gt);
      if (gt !== '') hang.set(cot, gt);
    }
    if (hang.size) luoi.set(dong, hang);
  }
  return luoi;
}

/** Đọc cả tệp: trả [{ten, luoi}] theo đúng thứ tự trong workbook. */
function docWorkbook(tep) {
  const ss = docSharedStrings(tep);
  return dsSheet(tep).map(s => ({ ten: s.ten, entry: s.entry, luoi: docSheet(tep, s.entry, ss) }));
}

module.exports = { docWorkbook, docSheet, dsSheet, docSharedStrings, docEntry, SO_COT, gonTrang };
