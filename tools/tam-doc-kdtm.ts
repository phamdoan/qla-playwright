/** Tạm: đọc Data_GĐT.xlsx, đổi ngày kiểu số Excel về dd/mm/yyyy, ghi ra JSON để dựng bộ dữ liệu. */
import fs from 'fs';
import { docXlsx } from '../common/xlsx';

const F = process.env.FILE || 'C:/Users/GTEL ICT/Downloads/Data_GĐT.xlsx';
const wb = docXlsx(F) as unknown as Record<string, string[][]>;
const sh = wb['GĐT'];

/** Excel lưu ngày dạng số (46032) — quy đổi từ mốc 30/12/1899 */
const ngay = (v: string) => {
  const t = (v || '').trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(t)) return t;
  const n = Number(t);
  if (!n) return '';
  const d = new Date(Date.UTC(1899, 11, 30) + n * 86_400_000);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
};

const ds = sh
  .slice(1)
  .filter(r => (r[0] || '').trim().startsWith('VA'))
  .map(r => ({
    maVuAn: (r[0] || '').trim(),
    ngayBanAn: ngay(r[1]),
    toaAn: (r[2] || '').trim(),
    soBanAn: (r[3] || '').trim(),
    loaiAn: (r[4] || '').trim(),
  }));

console.log(`${ds.length} dòng dùng được`);
for (const v of ds) console.log(' ', v.maVuAn, '|', v.soBanAn, '|', v.ngayBanAn, '|', v.toaAn, '|', v.loaiAn);
fs.writeFileSync(`${process.env.TEMP}/kdtm.json`, JSON.stringify(ds, null, 1));
