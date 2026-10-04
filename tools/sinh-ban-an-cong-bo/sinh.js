/**
 * Sinh lại `data/vu-an-thuc/ban-an-cong-bo.ts`.
 *
 *   node tools/sinh-ban-an-cong-bo/sinh.js
 *
 * Hai nguồn vào, cả hai đều nằm cạnh file này và ĐƯỢC COMMIT:
 *   · `thu-thap.json`      — bản ghi thu từ cổng công bố bản án (số/ngày/tòa/trích yếu/phân loại/URL
 *                            + mã lá QHPL đã gán). Thêm bản án mới thì thêm phần tử vào đây.
 *   · `danh-muc-qhpl.tsv`  — ảnh chụp danh mục LÁ CHỌN ĐƯỢC của QTDM.DANHMUC (MA, TEN, CAP_DO,
 *                            TEN_CHA). Làm mới bằng `doc-danh-muc.md` trong cùng thư mục.
 *
 * Tên lá và tên nhánh cha KHÔNG gõ tay — lấy từ ảnh chụp danh mục, nên không lệch dấu với máy chủ.
 * Mã nào không phải lá chọn được thì DỪNG kèm danh sách lỗi, không âm thầm bỏ bản ghi.
 */
const fs = require('fs');
const path = require('path');

const TU = __dirname;
const DICH = path.join(TU, '..', '..', 'data', 'vu-an-thuc', 'ban-an-cong-bo.ts');

const la = new Map();
for (const dong of fs.readFileSync(path.join(TU, 'danh-muc-qhpl.tsv'), 'utf8').split(/\r?\n/)) {
  if (!dong.trim()) continue;
  const [ma, ten, cap, tenCha] = dong.split('\t');
  la.set(ma, { ten, cap: Number(cap), tenCha: tenCha || '' });
}

/** Gốc danh mục → nhãn ô "Loại đơn" (danh mục LOAI_DON của hệ thống, đọc từ CSDL 04/10/2026) */
const NHAN_LOAI_DON = {
  QHPL_TC_DS: 'Dân sự',
  QHPL_TC_HNGD: 'Hôn nhân và gia đình',
  QHPL_TC_KDTM: 'Kinh doanh, thương mại',
  QHPL_TC_LD: 'Lao động',
};

/**
 * Chuỗi LỌC gõ vào ô TreeSelect. Cây ảo hoá chỉ lọc trên nút đã nạp nên chuỗi dài hay ra rỗng:
 * lá cấp 2 thì cắt bớt tiền tố "Tranh chấp hợp đồng…", lá cấp 1 đã nạp sẵn nên dùng trọn tên.
 */
function chuoiLoc(ten, coCha) {
  if (!coCha) return ten;
  let s = ten
    .replace(/^Tranh chấp hợp đồng\s+/i, '')
    .replace(/^Tranh chấp về\s+/i, '')
    .replace(/^Tranh chấp\s+/i, '')
    .replace(/^Đòi\s+/i, '')
    .replace(/^Về\s+/i, '');
  s = s.split(/[,;(]/)[0].trim();
  if (s.length > 34) s = s.split(/\s+/).slice(0, 4).join(' ');
  return s;
}

const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const thu = JSON.parse(fs.readFileSync(path.join(TU, 'thu-thap.json'), 'utf8'));
const loi = [];
const banGhi = thu.map((r, i) => {
  const l = la.get(r.maQhpl);
  if (!l) {
    loi.push(`${r.maQhpl} (bản án ${r.soBanAn}) KHÔNG phải lá chọn được trong danh-muc-qhpl.tsv`);
    return null;
  }
  const goc = r.maQhpl.split('.')[0];
  const loaiDon = NHAN_LOAI_DON[goc];
  if (!loaiDon) loi.push(`${r.maQhpl}: không biết nhãn "Loại đơn" cho gốc ${goc}`);
  if (l.cap === 2 && !l.tenCha) loi.push(`${r.maQhpl}: lá cấp 2 nhưng thiếu tên nhánh cha`);
  return {
    id: `bacb-${String(i + 1).padStart(3, '0')}`,
    ...r,
    loaiDon,
    tenQhpl: l.ten,
    qhplCha: l.cap === 2 ? l.tenCha : '',
    locQhpl: chuoiLoc(l.ten, l.cap === 2),
  };
});
if (loi.length) {
  console.error('DỪNG — dữ liệu không khớp danh mục máy chủ:\n  ' + loi.join('\n  '));
  process.exit(1);
}

const theoLoai = {};
for (const b of banGhi) theoLoai[b.loaiDon] = (theoLoai[b.loaiDon] || 0) + 1;
const soQhpl = new Set(banGhi.map(b => b.maQhpl)).size;

const dong = b =>
  '  {\n' +
  `    id: '${b.id}',\n` +
  `    soBanAn: '${esc(b.soBanAn)}',\n` +
  `    ngay: '${esc(b.ngay)}',\n` +
  `    toaAn: '${esc(b.toaAn)}',\n` +
  `    trichYeu: '${esc(b.trichYeu)}',\n` +
  `    qhplCongBo: '${esc(b.qhplCongBo)}',\n` +
  `    nguon: '${esc(b.nguon)}',\n` +
  `    loaiDon: '${esc(b.loaiDon)}',\n` +
  `    maQhpl: '${esc(b.maQhpl)}',\n` +
  `    tenQhpl: '${esc(b.tenQhpl)}',\n` +
  (b.qhplCha ? `    qhplCha: '${esc(b.qhplCha)}',\n` : '') +
  `    locQhpl: '${esc(b.locQhpl)}',\n` +
  (b.ghiChu ? `    ghiChu: '${esc(b.ghiChu)}',\n` : '') +
  '  },';

const dauFile = `/**
 * ${banGhi.length} BẢN ÁN THẬT, lấy từ CỔNG CÔNG BỐ BẢN ÁN của TAND tối cao
 * (https://congbobanan.toaan.gov.vn) — không bản ghi nào do kịch bản tự nghĩ ra.
 *
 * TỆP NÀY SINH TỰ ĐỘNG, đừng sửa tay: \`node tools/sinh-ban-an-cong-bo/sinh.js\`.
 *
 * Dùng để làm gì: mỗi bản ghi là một HẠT GIỐNG cho một case của luồng sơ thẩm → phúc thẩm, nhằm
 * sinh ra NHIỀU BẢN ÁN thuộc NHIỀU QUAN HỆ PHÁP LUẬT khác nhau trên môi trường kiểm thử, thay vì
 * lặp lại một loại tranh chấp duy nhất.
 *
 * ĐỌC KỸ TRƯỚC KHI DÙNG — ba giới hạn có thật:
 *
 *  1. TÊN ĐƯƠNG SỰ KHÔNG PHẢI DỮ LIỆU THẬT và cũng không thể là dữ liệu thật: cổng công bố ĐÃ
 *     CHE tên các bên (chỉ còn "bà Lưu Thị H", "Công ty TNHH U."). Vì vậy \`trichYeu\` giữ đúng
 *     nguyên văn tiêu đề cổng công bố, còn tên nguyên đơn/bị đơn khi chạy vẫn do \`tenDuongSu()\`
 *     sinh tất định từ mã case — không trộn tên người thật vào dữ liệu kiểm thử.
 *
 *  2. \`soBanAn\` / \`ngay\` là SỐ VÀ NGÀY CỦA BẢN ÁN GỐC trên cổng, chỉ để tra lại nguồn.
 *     Số bản án mà hệ thống cấp khi chạy là OUTPUT, do máy chủ sinh — tuyệt đối không gieo lại
 *     số này vào ô "Số bản án" (xem bẫy \`SO_DC_CAP_DA_TON_TAI\` ở luồng phúc thẩm).
 *
 *  3. \`maQhpl\` / \`tenQhpl\` / \`qhplCha\` đọc TRỰC TIẾP từ \`QTDM.DANHMUC\` trên STG
 *     (ngày 04/10/2026), chỉ lấy LÁ CHỌN ĐƯỢC: cấp 1 hoặc 2, và không còn cấp con — FE từ chối
 *     nhóm còn cấp con ("Nhóm danh mục này còn cấp con"), còn \`chonQhplThongKe\` chỉ mở được MỘT
 *     cấp cha nên lá cấp 3 không chọn nổi. Khi phân loại của cổng rơi vào một nhóm như vậy,
 *     \`ghiChu\` nói rõ đã hạ về lá nào và vì sao.
 *
 * Số bản ghi theo loại đơn: ${Object.entries(theoLoai).map(([k, v]) => `${k} ${v}`).join(' · ')}.
 * Số quan hệ pháp luật khác nhau: ${soQhpl}.
 */

/** Một bản án đã công bố + chỗ nó khớp vào danh mục quan hệ pháp luật của hệ thống */
export type BanAnCongBo = {
  /** Mã nội bộ của bộ dữ liệu, dùng làm hậu tố cho mã case */
  id: string;
  /** Số bản án NGUYÊN VĂN trên cổng công bố (tham chiếu, KHÔNG gieo vào ô "Số bản án") */
  soBanAn: string;
  /** Ngày bản án nguyên văn trên cổng công bố (dd/MM/yyyy) */
  ngay: string;
  /** Tòa án đã xét xử, nguyên văn trên cổng */
  toaAn: string;
  /** Trích yếu nguyên văn trên cổng (tên các bên đã được cổng che) */
  trichYeu: string;
  /** Dòng phân loại quan hệ tranh chấp do CHÍNH CỔNG gắn; rỗng nếu tiêu đề không nêu */
  qhplCongBo: string;
  /** URL bản án trên cổng công bố */
  nguon: string;
  /** Nhãn ô "Loại đơn" trên màn tạo đơn (danh mục LOAI_DON của hệ thống) */
  loaiDon: string;
  /** Mã lá trong QTDM.DANHMUC (MA_LOAI_DANHMUC = QHPL_TC_<loại>) */
  maQhpl: string;
  /** Tên lá ĐÚNG TỪNG DẤU như máy chủ trả về — \`chonQhplThongKe\` khớp \`^tên$\` */
  tenQhpl: string;
  /** Tên nhánh cha, CÓ khi lá nằm ở cấp 2: cây nạp lười nên phải mở nhánh rồi mới bấm lá */
  qhplCha?: string;
  /** Chuỗi gõ vào ô để lọc (cây ảo hoá chỉ lọc trên nút đã nạp → chuỗi dài hay ra rỗng) */
  locQhpl: string;
  /** Vì sao mã lá lệch khỏi phân loại của cổng, nếu có lệch */
  ghiChu?: string;
};

export const DS_BAN_AN_CONG_BO: BanAnCongBo[] = [
`;

fs.mkdirSync(path.dirname(DICH), { recursive: true });
fs.writeFileSync(
  DICH,
  dauFile +
    banGhi.map(dong).join('\n') +
    '\n];\n\n' +
    `/** Lọc theo nhãn ô "Loại đơn" — vd. \`banAnTheoLoaiDon('Dân sự')\` */\n` +
    'export function banAnTheoLoaiDon(loaiDon: string): BanAnCongBo[] {\n' +
    '  return DS_BAN_AN_CONG_BO.filter(b => b.loaiDon === loaiDon);\n' +
    '}\n\n' +
    '/** Tra một bản ghi theo mã nội bộ; ném lỗi nếu không có, để sai mã lộ ngay khi nạp case */\n' +
    'export function banAnTheoId(id: string): BanAnCongBo {\n' +
    '  const b = DS_BAN_AN_CONG_BO.find(x => x.id === id);\n' +
    '  if (!b) throw new Error(`Không có bản án công bố id="${id}" trong DS_BAN_AN_CONG_BO`);\n' +
    '  return b;\n' +
    '}\n',
  'utf8',
);
console.log(`Đã ghi ${path.relative(process.cwd(), DICH)}: ${banGhi.length} bản ghi, ${soQhpl} quan hệ pháp luật.`);
console.log('Theo loại đơn:', theoLoai);
