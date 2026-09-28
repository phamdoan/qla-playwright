/**
 * Đối soát sổ cái luồng GĐT/TT với trạng thái THẬT trên DB, rồi sửa sổ cái cho khớp.
 *
 * Vì sao cần: mẻ chạy bị dừng giữa chừng để lại thao tác đã làm trên hệ thống mà sổ cái chưa kịp
 * ghi. Lần chạy sau tưởng chưa làm nên đi làm lại và vấp "đơn không còn ở danh sách chưa phân công".
 *
 * Chỉ ĐỌC dữ liệu nghiệp vụ, chỉ GHI file sổ cái của automation. Không sửa gì trong DB.
 *
 *   1) Sinh câu truy vấn:      node tools/doi-soat-so-cai-gdt.js sql <tên bộ> [env] > q.sql
 *   2) Chạy q.sql bằng SqlEnv, lưu kết quả ra kq.txt
 *   3) Áp kết quả vào sổ cái:  node tools/doi-soat-so-cai-gdt.js ap <tên bộ> kq.txt [env]
 *
 * Suy luận (chỉ đánh dấu những bước CHẮC CHẮN đã xong, không đoán thêm):
 *   - có dòng DON khớp số/ngày bản án            → nhapDon (kèm maDon, soThuLy, idDon)
 *   - DON.ID_VU_GIAIQUYET có giá trị             → vụ án GĐT đã lập, nghĩa là tờ trình phân công đã
 *                                                  được duyệt: phanCong, toTrinh, kyToTrinh, duyetToTrinh
 */
const fs = require('fs');
const path = require('path');

const [che, tenBo, ...conLai] = process.argv.slice(2);
if (!che || !tenBo) {
  console.error('Dùng: node tools/doi-soat-so-cai-gdt.js sql|ap <tên bộ> [file kết quả] [env]');
  process.exit(1);
}

const thuMuc = path.resolve(__dirname, '../seed-output');
const env = (che === 'ap' ? conLai[1] : conLai[0]) || process.env.QLA_ENV || 'stg';
const dau = `${tenBo}.${env}.ledger`;
const dsFile = fs.readdirSync(thuMuc).filter(t => t.startsWith(`${dau}.`) && t.endsWith('.json') && t !== `${dau}.json`);
const fileGoc = path.join(thuMuc, `${dau}.json`);

const docJson = f => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return {};
  }
};
/** Sổ cái gộp: file gốc + các file hậu tố của những tiến trình chạy song song */
const soCaiGop = () =>
  Object.assign({}, docJson(fileGoc), ...dsFile.map(t => docJson(path.join(thuMuc, t))));

if (che === 'sql') {
  const dong = Object.values(soCaiGop());
  const dk = dong
    .map(d => `(d.SO_BANAN_QD = '${String(d.soBanAn).replace(/'/g, "''")}' AND TO_CHAR(d.NGAY_BANAN_QD,'DD/MM/YYYY') = '${d.ngayBanAn}')`)
    .join(' OR ');
  process.stdout.write(
    `SELECT d.SO_BANAN_QD, TO_CHAR(d.NGAY_BANAN_QD,'DD/MM/YYYY') NGAY_BA, d.MA_DON, d.SO_HIEU_DON, d.ID, ` +
      `NVL(d.ID_VU_GIAIQUYET,'-') ID_VU FROM DON d WHERE d.DANH_DAU_XOA = 0 AND (${dk}) ORDER BY d.SO_BANAN_QD\n`,
  );
  process.exit(0);
}

// ───────────── chế độ "ap": đọc kết quả truy vấn và sửa sổ cái ─────────────
const fileKq = conLai[0];
if (!fileKq) {
  console.error('Thiếu file kết quả truy vấn.');
  process.exit(1);
}

/** Dòng kết quả: "SO_BANAN_QD | NGAY_BA | MA_DON | SO_HIEU_DON | ID | ID_VU |" */
const theoKhoa = {};
for (const d of fs.readFileSync(fileKq, 'utf8').split('\n')) {
  const c = d.split('|').map(x => x.trim());
  if (c.length < 6 || !c[1] || !/^\d{2}\/\d{2}\/\d{4}$/.test(c[1])) continue;
  theoKhoa[`${c[0]}|${c[1]}`] = { maDon: c[2], soThuLy: c[3], idDon: c[4], idVu: c[5] === '-' ? '' : c[5] };
}

const BUOC_KHI_CO_VU_AN = ['phanCong', 'toTrinh', 'kyToTrinh', 'duyetToTrinh'];
const soCai = soCaiGop();
let suaDon = 0;
let suaVuAn = 0;
const thieu = [];

for (const [khoa, d] of Object.entries(soCai)) {
  const db = theoKhoa[`${d.soBanAn}|${d.ngayBanAn}`];
  if (!db) {
    thieu.push(`${d.soBanAn} – ${d.ngayBanAn}`);
    continue;
  }
  const daXong = new Set(d.daXong || []);
  const truoc = daXong.size;

  if (db.maDon) {
    daXong.add('nhapDon');
    d.maDon = d.maDon || db.maDon;
    d.idDon = d.idDon || db.idDon;
    // KHÔNG lấy soThuLy từ DON.SO_HIEU_DON: đó là số khác (vd 4360) chứ không phải số thụ lý đơn
    // (vd 1212121547) mà các bước sau dùng để lọc. Thiếu số thụ lý thì để bước B1–B2 tự đọc lại.
    if (daXong.size !== truoc) suaDon++;
  }
  if (db.idVu) {
    const trc = daXong.size;
    for (const b of BUOC_KHI_CO_VU_AN) daXong.add(b);
    if (daXong.size !== trc) suaVuAn++;
  }
  d.daXong = [...daXong];
  soCai[khoa] = d;
}

fs.writeFileSync(fileGoc, JSON.stringify(soCai, null, 2));
for (const t of dsFile) fs.unlinkSync(path.join(thuMuc, t)); // đã gộp hết vào file gốc
console.log(`Đối soát xong ${Object.keys(soCai).length} bản án → ${path.basename(fileGoc)}`);
console.log(`  bổ sung "nhapDon" cho ${suaDon} bản án (đơn đã có trên hệ thống)`);
console.log(`  bổ sung ${BUOC_KHI_CO_VU_AN.join(', ')} cho ${suaVuAn} bản án (vụ án GĐT đã lập)`);
if (thieu.length) console.log(`  KHÔNG thấy đơn trên hệ thống cho ${thieu.length} bản án: ${thieu.join(' · ')}`);
if (dsFile.length) console.log(`  đã gộp và xoá ${dsFile.length} file sổ cái nhánh`);
