/**
 * Đọc sheet "Danh sách tài khoản đã phân quyền…" trong file Data Test: mỗi tòa là một khối 8 cột xếp
 * cạnh nhau (Tòa | STT | Tài khoản | Pass | Họ tên | Chức vụ | Chức danh | Ghi chú), khối sau cách 1 cột.
 *   npx tsx tools/xem-tai-khoan.ts <file.xlsx> [lọc chức vụ/đơn vị]
 */
import { docXlsx } from '../common/xlsx';

const [file, loc = ''] = process.argv.slice(2);
const wb = docXlsx(file);
const ten = Object.keys(wb).find(t => t.startsWith('Danh sách tài khoản'));
if (!ten) throw new Error('Không thấy sheet "Danh sách tài khoản…"');
const sh = wb[ten] as string[][];
console.log(`sheet: ${ten} (${sh.length} dòng, ${Math.max(...sh.map(r => r.length))} cột)`);

for (let r = 0; r < sh.length; r++) {
  const hang = sh[r] || [];
  for (let c = 0; c < hang.length; c++) {
    // Ô tên tòa đứng đầu mỗi khối; các dòng dưới cùng khối có Tài khoản ở cột c+2
    const tk = (hang[c + 2] || '').trim();
    const stt = (hang[c + 1] || '').trim();
    if (!/^\d+(\.0)?$/.test(stt) || !tk) continue;
    // tìm tên tòa của khối: đi ngược lên ở cột c tới ô có chữ
    let toa = '';
    for (let k = r; k >= 0; k--) {
      const o = (sh[k]?.[c] || '').trim();
      if (o && !/^\d/.test(o)) {
        toa = o;
        break;
      }
    }
    const dong = [toa, tk, hang[c + 3], hang[c + 4], hang[c + 5], hang[c + 6], hang[c + 7]].map(x => (x || '').trim());
    const chuoi = dong.join(' | ');
    if (!loc || chuoi.toLowerCase().includes(loc.toLowerCase())) console.log(`dòng ${r + 1}, cột ${c + 1}: ${chuoi}`);
  }
}
