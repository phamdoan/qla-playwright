/**
 * Khảo sát file Excel dữ liệu test.
 *   npx tsx tools/xem-sheet.ts <file.xlsx>                  → các sheet + vài dòng đầu (SO_DONG, mặc định 3)
 *   SHEET="GĐT 2C" npx tsx tools/xem-sheet.ts <file.xlsx>   → toàn bộ dòng có dữ liệu của một sheet
 *   TIM="dân sự" npx tsx tools/xem-sheet.ts <file.xlsx>     → các ô chứa chuỗi (kèm sheet/dòng/cột)
 *   DAY_DU=1 → không cắt ngắn nội dung ô (mặc định cắt 45 ký tự cho dễ đọc)
 */
import { docXlsx } from '../common/xlsx';

const soDong = Number(process.env.SO_DONG || 3);
const chiSheet = process.env.SHEET;
const tim = (process.env.TIM || '').toLowerCase();
const doDai = process.env.DAY_DU ? Infinity : 45;
const gon = (r: string[]) => r.map(x => (x || '').replace(/\s+/g, ' ').slice(0, doDai)).join(' | ').replace(/( \| )+$/, '');

for (const f of process.argv.slice(2)) {
  const wb = docXlsx(f);
  console.log('#### ' + f.split(/[\\/]/).pop());
  for (const [ten, sh] of Object.entries(wb) as [string, string[][]][]) {
    if (tim) {
      sh.forEach((r, i) =>
        r.forEach((o, j) => {
          if ((o || '').toLowerCase().includes(tim)) console.log(`${ten} [dòng ${i + 1}, cột ${j + 1}]: ${gon(r.slice(Math.max(0, j - 4), j + 5))}`);
        }),
      );
      continue;
    }
    if (chiSheet && ten !== chiSheet) continue;
    console.log(`== ${ten} (${sh.length} dòng)`);
    const ds = chiSheet ? sh.filter(r => r.some(x => (x || '').trim())) : sh.slice(0, soDong);
    for (const r of ds) console.log('   ' + (process.env.DAY_DU ? gon(r) : gon(r).slice(0, 600)));
  }
}
