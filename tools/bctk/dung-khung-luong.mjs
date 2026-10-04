/**
 * DỰNG KHUNG THƯ MỤC cho các luồng chưa làm, theo `bctk/ban-do-luong.ts`.
 *
 *   npm run bctk:dung-khung           xem sẽ tạo gì (không ghi)
 *   npm run bctk:dung-khung -- --ghi  ghi thật
 *
 * Mỗi luồng chưa làm được một thư mục `flows/<phân hệ>/<flow>/` kèm `README.md` ghi: đặc tả nguồn,
 * khuôn để sao, biểu mẫu BCTK nó nuôi, và chốt "Kết quả giải quyết" phải đạt. KHÔNG sinh mã rỗng —
 * tệp `.ts` giả làm spec tưởng là đã có luồng.
 *
 * Thư mục đã tồn tại thì BỎ QUA, không ghi đè.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DS_LUONG_BCTK } from '../../bctk/ban-do-luong.ts';
import { baoCao } from '../../bctk/danh-muc-80-bao-cao.ts';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ghi = process.argv.includes('--ghi');

/** Khuôn → luồng đã có để sao bước; null = khuôn riêng, phải viết mới */
const KHUON_MAU = {
  'vu-an': 'flows/dan-su/flow-001-st-pt (đang dùng lại nguyên bộ bước 01→23 của luồng KDTM)',
  'vu-viec': null,
  'hinh-su': 'flows/hinh-su/flow-001-so-tham',
  'pha-san': null,
  bpxlhc: null,
  'gdt-tt': 'flows/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao (bước 24→45)',
};

let tao = 0;
let boQua = 0;

for (const l of DS_LUONG_BCTK) {
  const thuMuc = path.join(GOC, 'flows', l.phanHe, l.flow);
  const tep = path.join(thuMuc, 'README.md');
  if (fs.existsSync(tep)) {
    boQua++;
    continue;
  }
  if (l.daTao) {
    console.log(`·  ${l.phanHe}/${l.flow} — đã có mã, không chen README vào`);
    boQua++;
    continue;
  }

  const mau = KHUON_MAU[l.khuon];
  const noiDung = `# ${l.phanHe} · ${l.flow}

**CHƯA LÀM.** Thư mục này đang trống để giữ chỗ và địa chỉ; chưa có mã nào.

| | |
|---|---|
| Đặc tả nguồn | \`docs/stepdata/${l.dacTa}\` |
| Khuôn bước | \`${l.khuon}\` |
| Sao từ | ${mau ? `\`${mau}\`` : '**khuôn riêng — phải viết mới**, không sao được từ luồng nào đang có'} |
| Nuôi biểu mẫu BCTK | ${l.bieuMau.map(m => `**${m}** ${baoCao(m).ten}`).join('<br>')} |

## Chốt phải đạt

Luồng này chỉ được tính là **xong** khi có case chạy xanh tới bước làm vụ lên **"Kết quả giải
quyết"**. Chạy xanh hết bước mà vụ chưa lên kết quả thì báo cáo thống kê **không đếm được**: vụ chỉ
nằm ở nhóm "Phải giải quyết", không vào "Đã giải quyết" và không có ô nào trong nhóm "Kết quả xét
xử".

Khi đạt, cập nhật \`bctk/ban-do-luong.ts\`: \`trangThai: 'xong'\` + \`chotKetQua: '<mã bước>'\`.
Công cụ \`npm run bctk:do-phu -- --cong\` **thoát mã 1** nếu khai \`xong\` mà thiếu \`chotKetQua\`.

## Cần tạo thêm

- \`data/${l.phanHe}/${l.flow}/cases.ts\` + \`case-001/input.ts\`
- \`tests/${l.phanHe}/flows/${l.flow}.spec.ts\` (một spec cho cả luồng, case là dữ liệu)
${
  l.ghiChu
    ? `
## Ghi chú

${l.ghiChu}
`
    : ''
}`;

  console.log(`+  ${path.relative(GOC, tep)}`);
  if (ghi) {
    fs.mkdirSync(thuMuc, { recursive: true });
    fs.writeFileSync(tep, noiDung, 'utf8');
  }
  tao++;
}

console.log(
  `\n${ghi ? 'Đã tạo' : 'Sẽ tạo'} ${tao} thư mục luồng · bỏ qua ${boQua}.` +
    (ghi ? '' : '  (thêm `-- --ghi` để ghi thật)'),
);
