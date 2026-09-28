/**
 * Đọc file .xlsx bằng zlib có sẵn của Node (xlsx là file zip chứa XML) — không thêm phụ thuộc mới.
 * Chỉ đọc giá trị ô dạng chuỗi/số, đủ cho các file dữ liệu test (Số bản án, Ngày bản án, Tòa án…).
 */
import fs from 'fs';
import zlib from 'zlib';

/** Giải nén zip: trả nội dung từng entry theo tên */
function giaiNenZip(buf: Buffer): Record<string, Buffer> {
  const tep: Record<string, Buffer> = {};
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('File không phải .xlsx (không thấy cấu trúc zip)');
  const soTep = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < soTep; i++) {
    const nlen = buf.readUInt16LE(off + 28);
    const elen = buf.readUInt16LE(off + 30);
    const clen = buf.readUInt16LE(off + 32);
    const ten = buf.toString('utf8', off + 46, off + 46 + nlen);
    const lho = buf.readUInt32LE(off + 42);
    const nenKieu = buf.readUInt16LE(off + 10);
    const cSize = buf.readUInt32LE(off + 20);
    const dauDuLieu = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const data = buf.subarray(dauDuLieu, dauDuLieu + cSize);
    tep[ten] = nenKieu === 0 ? data : zlib.inflateRawSync(data);
    off += 46 + nlen + elen + clen;
  }
  return tep;
}

const giaiMaXml = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&');

/** "B12" → 2 (số thứ tự cột, bắt đầu từ 1) */
const soCot = (ref: string) => {
  let c = 0;
  for (const ch of ref.replace(/\d+/g, '')) c = c * 26 + (ch.charCodeAt(0) - 64);
  return c;
};

/** Đọc toàn bộ workbook: { <tên sheet>: string[][] } */
export function docXlsx(duongDan: string): Record<string, string[][]> {
  const tep = giaiNenZip(fs.readFileSync(duongDan));
  const sst: string[] = [];
  const xmlChuoi = tep['xl/sharedStrings.xml']?.toString('utf8');
  if (xmlChuoi) {
    for (const si of xmlChuoi.match(/<si>[\s\S]*?<\/si>/g) || []) {
      sst.push(giaiMaXml((si.match(/<t[^>]*>[\s\S]*?<\/t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('')));
    }
  }
  // Tên sheet gắn với file worksheet qua r:id trong xl/_rels/workbook.xml.rels — KHÔNG suy theo thứ
  // tự tên file: sort() cho "sheet1, sheet10, sheet11, …, sheet2" nên file trên 9 sheet sẽ lệch tên.
  const relsXml = tep['xl/_rels/workbook.xml.rels']?.toString('utf8') || '';
  const duongDanTheoRid: Record<string, string> = {};
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = (m[0].match(/Id="([^"]+)"/) || [])[1];
    const target = (m[0].match(/Target="([^"]+)"/) || [])[1];
    if (id && target) duongDanTheoRid[id] = `xl/${target.replace(/^\/?xl\//, '').replace(/^\//, '')}`;
  }
  const sheets = [...tep['xl/workbook.xml'].toString('utf8').matchAll(/<sheet\b[^>]*>/g)].map(m => ({
    ten: giaiMaXml((m[0].match(/name="([^"]*)"/) || [])[1] || ''),
    duongDan: duongDanTheoRid[(m[0].match(/r:id="([^"]+)"/) || [])[1] || ''] || '',
  }));
  const conLai = Object.keys(tep)
    .filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')));
  const ketQua: Record<string, string[][]> = {};
  sheets
    .map((s, i) => ({ ten: s.ten, duongDan: tep[s.duongDan] ? s.duongDan : conLai[i] }))
    .filter(s => s.duongDan && tep[s.duongDan])
    .forEach(({ ten, duongDan }) => {
      const xml = tep[duongDan].toString('utf8');
      const bang: string[][] = [];
      for (const r of xml.match(/<row[^>]*>[\s\S]*?<\/row>|<row[^>]*\/>/g) || []) {
        const hang: string[] = [];
        for (const c of r.match(/<c[^>]*\/>|<c[^>]*>[\s\S]*?<\/c>/g) || []) {
          const ref = (c.match(/r="([A-Z]+\d+)"/) || [])[1] || '';
          const kieu = (c.match(/ t="([^"]+)"/) || [])[1];
          const v = (c.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
          const inline = (c.match(/<is>[\s\S]*?<\/is>/) || [])[0];
          let giaTri = '';
          if (kieu === 's' && v !== undefined) giaTri = sst[Number(v)] ?? '';
          else if (inline) giaTri = giaiMaXml(inline.replace(/<[^>]+>/g, ''));
          else if (v !== undefined) giaTri = giaiMaXml(v);
          if (ref) hang[soCot(ref) - 1] = giaTri;
        }
        bang.push(hang);
      }
      ketQua[ten || duongDan] = bang;
    });
  return ketQua;
}

/** Sheet đầu tiên của file (các file dữ liệu test chỉ có một sheet) */
export const docSheetDau = (duongDan: string): string[][] => Object.values(docXlsx(duongDan))[0] || [];
