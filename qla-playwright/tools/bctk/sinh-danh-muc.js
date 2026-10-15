/**
 * Sinh `bctk/danh-muc-80-bao-cao.ts` từ `80-bao-cao.tsv`.
 *
 *   node tools/bctk/sinh-danh-muc.js
 *
 * `80-bao-cao.tsv` là ảnh chụp sheet "Báo cáo tổng hợp" của tệp nguồn của BA:
 *   Downloads/Báo cáo thống kê…/SRS/Mapping Data/80 báo cáo.xlsx
 * 4 cột cách nhau bằng TAB: Nhóm, Mã, Giai đoạn, Tên báo cáo. Chụp ngày 04/10/2026.
 *
 * Chụp lại khi BA phát hành bản mới (máy không có thư viện xlsx — `doc-xlsx.js` cạnh tệp này đọc
 * xlsx bằng unzip + parse XML thô):
 *
 *   node tools/bctk/doc-xlsx.js "<đường dẫn>/80 báo cáo.xlsx" 200
 *
 * rồi lấy sheet "Báo cáo tổng hợp", cột B (Nhóm, chỉ điền ở dòng đầu mỗi nhóm nên phải kéo xuống),
 * C (Mã), E (Giai đoạn), D (Tên).
 */
const fs = require('fs');
const path = require('path');

const TU = __dirname;
const DICH = path.join(TU, '..', '..', 'bctk', 'danh-muc-80-bao-cao.ts');

const dong = fs
  .readFileSync(path.join(TU, '80-bao-cao.tsv'), 'utf8')
  .split(/\r?\n/)
  .filter(d => d.trim())
  .map(d => {
    const [nhom, ma, giaiDoan, ten] = d.split('\t');
    return { nhom, ma, giaiDoan, ten };
  });

const loi = [];
const thay = new Set();
for (const b of dong) {
  if (!b.ma || !b.ten) loi.push(`dòng thiếu mã hoặc tên: ${JSON.stringify(b)}`);
  if (thay.has(b.ma)) loi.push(`mã trùng: ${b.ma}`);
  thay.add(b.ma);
}
if (loi.length) {
  console.error('DỪNG:\n  ' + loi.join('\n  '));
  process.exit(1);
}

const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const theoNhom = {};
for (const b of dong) (theoNhom[b.nhom] ||= []).push(b.ma);

const dau = `/**
 * ${dong.length} BIỂU MẪU BÁO CÁO THỐNG KÊ — danh mục chính thức.
 *
 * TỆP NÀY SINH TỰ ĐỘNG, đừng sửa tay: \`node tools/bctk/sinh-danh-muc.js\`.
 * Nguồn: sheet "Báo cáo tổng hợp" của \`80 báo cáo.xlsx\` (tài liệu của BA), chụp 04/10/2026.
 *
 * Dùng để làm gì: đây là TRỤC để đo độ phủ dữ liệu. Một luồng Playwright chạy xanh chỉ có nghĩa
 * khi số liệu nó sinh ra rơi vào một ô của một trong các biểu mẫu này — xem \`bctk/ban-do-luong.ts\`.
 *
 * Số biểu mẫu theo nhóm:
${Object.entries(theoNhom)
  .map(([n, ds]) => ` *   ${n}: ${ds.length} (${ds.join(', ')})`)
  .join('\n')}
 */

export type MaBaoCao = ${dong.map(b => `'${esc(b.ma)}'`).join(' | ')};

/** Giai đoạn tố tụng mà biểu mẫu thống kê; "Chung" = không chia theo giai đoạn */
export type GiaiDoanBaoCao = ${[...new Set(dong.map(b => b.giaiDoan))].map(g => `'${esc(g)}'`).join(' | ')};

export type BaoCaoThongKe = {
  /** Nhóm biểu mẫu (loại án / lĩnh vực) */
  nhom: string;
  ma: MaBaoCao;
  giaiDoan: GiaiDoanBaoCao;
  ten: string;
};

export const DS_BAO_CAO: BaoCaoThongKe[] = [
`;

fs.mkdirSync(path.dirname(DICH), { recursive: true });
fs.writeFileSync(
  DICH,
  dau +
    dong
      .map(
        b =>
          `  { nhom: '${esc(b.nhom)}', ma: '${esc(b.ma)}', giaiDoan: '${esc(b.giaiDoan)}', ten: '${esc(b.ten)}' },`,
      )
      .join('\n') +
    '\n];\n\n' +
    '/** Tra một biểu mẫu theo mã; ném lỗi nếu không có để sai mã lộ ngay khi nạp */\n' +
    'export function baoCao(ma: MaBaoCao): BaoCaoThongKe {\n' +
    '  const b = DS_BAO_CAO.find(x => x.ma === ma);\n' +
    '  if (!b) throw new Error(`Không có biểu mẫu báo cáo thống kê mã "${ma}"`);\n' +
    '  return b;\n' +
    '}\n',
  'utf8',
);
console.log(`Đã ghi ${path.relative(process.cwd(), DICH)}: ${dong.length} biểu mẫu, ${Object.keys(theoNhom).length} nhóm.`);
