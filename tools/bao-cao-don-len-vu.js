/**
 * Thống kê + danh sách các đơn ĐÃ LÊN VỤ (môi trường đào tạo) — đơn do bộ chạy hàng loạt tạo, đã qua bước
 * "Đã có vụ án" (B11) — đối chiếu DB CHỈ ĐỌC: DON.ID_VU_GIAIQUYET → VUAN (mã vụ, giai đoạn, loại vụ, ngày tạo).
 * Kèm sheet Hồ sơ kháng nghị đến (nhóm 5, không sinh đơn) do tài khoản thư ký Vụ nhập.
 *
 *   QLA_DB_URL=.. QLA_DB_USER=.. QLA_DB_PASS=.. QLA_EXCELJS=<đường dẫn exceljs> node tools/bao-cao-don-len-vu.js
 * Ra: <ket-qua>/DS_DON_DA_LEN_VU.xlsx + .md
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const KET_QUA = process.env.QLA_HL_KET_QUA || path.resolve(__dirname, '..', '..', 'sql', 'tra-cuu-ban-an-cu', 'ket-qua');
const OJDBC = path.join(os.homedir(), '.m2/repository/com/oracle/database/jdbc/ojdbc10/19.20.0.0/ojdbc10-19.20.0.0.jar');
const THU_MUC_DB = path.join(__dirname, 'db-chi-doc');
const TK_HSKN = process.env.QLA_BC_TK_HSKN || '001303027120';
const TEN_NHOM = {
  'don-gdt': 'Đơn đề nghị GĐT/TT',
  tbvp: 'Thông báo phát hiện VPPL',
  cvcd: 'Công văn chuyển đơn',
  cvkn: 'CV kiến nghị GĐT/TT',
  kntc: 'Đơn KNTC trong tố tụng',
  'tu-hinh': 'Đơn xin ân giảm án tử hình',
};

function db(sql) {
  const r = spawnSync('java', ['-Dstdout.encoding=UTF-8', '-cp', `${OJDBC}${path.delimiter}${THU_MUC_DB}`, 'DbChiDoc', sql], {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 50 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`Truy vấn lỗi: ${(r.stderr || r.stdout).split('\n')[0]}`);
  return JSON.parse(r.stdout.trim() || '[]');
}
const q = s => String(s).replace(/'/g, "''");

// Gộp tiến độ mọi luồng/nhóm: trùng bản án thì giữ bản ghi đi xa hơn
const soPass = b => Object.values(b?.buoc || {}).filter(x => x.trangThai === 'PASS').length;
const gop = {};
for (const f of fs.readdirSync(KET_QUA).filter(f => /^tien-do-don-gdt.*\.json$/.test(f))) {
  const t = JSON.parse(fs.readFileSync(path.join(KET_QUA, f), 'utf8'));
  for (const [k, v] of Object.entries(t.banAn || {})) if (!gop[k] || soPass(v) > soPass(gop[k])) gop[k] = v;
}
const daLenVu = Object.values(gop).filter(b => b.maDon && b.buoc?.B11?.trangThai === 'PASS');

// Đối chiếu DB theo lô mã đơn
const theoMa = {};
for (let i = 0; i < daLenVu.length; i += 200) {
  const ma = daLenVu.slice(i, i + 200).map(b => `'${q(b.maDon)}'`).join(',');
  for (const r of db(
    `select d.ma_don, d.loai_don, c.so_thuly, to_char(c.ngay_thuly,'DD/MM/YYYY') ngay_thuly, v.ma_vuan, v.ten_vuan, v.giai_doan, v.loai_vu_giai_quyet,
            to_char(v.ngay_tao,'DD/MM/YYYY HH24:MI') ngay_tao_vu, v.ten_donvi_thuly
       from quanlyan.don d
       left join quanlyan.don_chuyen c on c.id_don = d.id
       left join quanlyan.vuan v on v.id = d.id_vu_giaiquyet and (v.danh_dau_xoa = 0 or v.danh_dau_xoa is null)
      where d.ma_don in (${ma}) and (d.danh_dau_xoa = 0 or d.danh_dau_xoa is null)`,
  ))
    theoMa[r.MA_DON] = r;
}

const dong = daLenVu
  .map(b => ({ b, d: theoMa[b.maDon] || {} }))
  // Ưu tiên cấp Phúc thẩm lên đầu, rồi theo mã đơn
  .sort((x, y) => (x.b.capXetXu === 'Phúc thẩm' ? 0 : 1) - (y.b.capXetXu === 'Phúc thẩm' ? 0 : 1) || Number(x.b.maDon) - Number(y.b.maDon))
  .map(({ b, d }, i) => ({
    STT: i + 1,
    'Nhóm': TEN_NHOM[b.nhom || 'don-gdt'] || b.nhom,
    'Hình thức đơn': b.hinhThuc || 'Đơn đề nghị GĐT/TT',
    'Loại án': b.loaiAn,
    'Cấp': b.capXetXu,
    'Số BA': b.soBa,
    'Ngày BA': b.ngayBa,
    'Tòa ra BA': b.tenToa,
    'Người đứng đơn': b.nguoiDungDon || '',
    'Mã đơn': b.maDon,
    'Số thụ lý': d.SO_THULY || b.soThuLy || '',
    'Ngày thụ lý': d.NGAY_THULY || '',
    'Vụ nhận': b.vuNhan || '',
    'Thẩm phán': b.thamPhan || '',
    'Mã vụ án (DB)': d.MA_VUAN || '',
    'Tên vụ án (DB)': d.TEN_VUAN || '',
    'Loại vụ (DB)': d.LOAI_VU_GIAI_QUYET || '',
    'Ngày tạo vụ (DB)': d.NGAY_TAO_VU || '',
    'Kiểm màn nhóm (B12)': b.buoc?.B12 ? b.buoc.B12.trangThai : '',
    'Đối chiếu DB': d.MA_VUAN ? 'Có vụ' : 'CHƯA CÓ VỤ trong DB',
    'Ghi chú': [b.loiHeThong ? `Lỗi hệ thống: ${b.loiHeThong}` : '', b.vuKhieuNai ? `DB nhóm: ${b.vuKhieuNai}` : ''].filter(Boolean).join(' | '),
    'EVD Đã có vụ án': b.evdTimKiem || '',
    'EVD màn nhóm': b.evdKhieuNai || '',
  }));

// Hồ sơ kháng nghị đến (nhóm 5) do tài khoản thư ký nhập
const hskn = db(
  `select so_khangnghi, to_char(ngay_khangnghi,'DD/MM/YYYY') ngay_kn, ten_nguoi_khangnghi, loai_an, so_banan_qd, to_char(ngay_banan_qd,'DD/MM/YYYY') ngay_ba,
          ten_toa_ra_banan, trang_thai, ten_nguoi_nhan, to_char(ngay_tao,'DD/MM/YYYY HH24:MI') ngay_tao, id
     from quanlyan.hoso_khangnghi_den where nguoi_tao = '${q(TK_HSKN)}' and (danh_dau_xoa = 0 or danh_dau_xoa is null) order by ngay_tao`,
);

// Tổng hợp theo nhóm × loại án
const dem = {};
for (const r of dong) {
  const k = `${r['Cấp']}|${r['Nhóm']}|${r['Loại án']}`;
  dem[k] = dem[k] || { cap: r['Cấp'], nhom: r['Nhóm'], loaiAn: r['Loại án'], tong: 0, coVu: 0 };
  dem[k].tong++;
  if (r['Mã vụ án (DB)']) dem[k].coVu++;
}
const thuTuCap = c => (c === 'Phúc thẩm' ? 0 : 1);
const tongHop = Object.values(dem).sort((a, b) => thuTuCap(a.cap) - thuTuCap(b.cap) || a.nhom.localeCompare(b.nhom) || a.loaiAn.localeCompare(b.loaiAn));
const demCap = c => dong.filter(r => r['Cấp'] === c).length;
const tongDangChay = Object.values(gop).length;

const md = [
  '# Danh sách đơn đã lên vụ (đào tạo)',
  '',
  `Cập nhật ${new Date().toLocaleString('vi-VN')} · ${dong.length} đơn đã lên vụ / ${tongDangChay} bản án đã chạy · đối chiếu DB: ${dong.filter(r => r['Mã vụ án (DB)']).length} có vụ · HSKN đến: ${hskn.length}`,
  '',
  `Theo cấp: **Phúc thẩm ${demCap('Phúc thẩm')}** · Sơ thẩm ${demCap('Sơ thẩm')}`,
  '',
  '| Cấp | Nhóm | Loại án | Số đơn lên vụ | Có vụ trong DB |',
  '|---|---|---|---|---|',
  ...tongHop.map(t => `| ${t.cap} | ${t.nhom} | ${t.loaiAn} | ${t.tong} | ${t.coVu} |`),
  `| **Tổng** | | | **${dong.length}** | **${dong.filter(r => r['Mã vụ án (DB)']).length}** |`,
  '',
  '| STT | Cấp | Nhóm | Loại án | Số BA | Ngày BA | Tòa | Mã đơn | Số TL | Mã vụ án | Thẩm phán |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  ...dong.map(r => `| ${r.STT} | ${r['Cấp']} | ${r['Nhóm']} | ${r['Loại án']} | ${r['Số BA']} | ${r['Ngày BA']} | ${r['Tòa ra BA']} | ${r['Mã đơn']} | ${r['Số thụ lý']} | ${r['Mã vụ án (DB)']} | ${r['Thẩm phán']} |`),
];
fs.writeFileSync(path.join(KET_QUA, 'DS_DON_DA_LEN_VU.md'), md.join('\n'));

(async () => {
  const ExcelJS = require(process.env.QLA_EXCELJS || 'exceljs');
  const wb = new ExcelJS.Workbook();
  const ghiSheet = (ten, cot, hang, rong = {}) => {
    const ws = wb.addWorksheet(ten);
    ws.addRow(cot);
    hang.forEach(h => ws.addRow(cot.map(c => h[c] ?? '')));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.columns.forEach((c, i) => (c.width = rong[cot[i]] || Math.min(45, Math.max(8, cot[i].length + 2, ...hang.map(h => String(h[cot[i]] ?? '').length + 2)))));
    return ws;
  };
  ghiSheet('Tong hop', ['Cấp', 'Nhóm', 'Loại án', 'Số đơn lên vụ', 'Có vụ trong DB'], [
    { 'Cấp': 'Phúc thẩm', 'Nhóm': '(tất cả)', 'Số đơn lên vụ': demCap('Phúc thẩm') },
    { 'Cấp': 'Sơ thẩm', 'Nhóm': '(tất cả)', 'Số đơn lên vụ': demCap('Sơ thẩm') },
    ...tongHop.map(t => ({ 'Cấp': t.cap, 'Nhóm': t.nhom, 'Loại án': t.loaiAn, 'Số đơn lên vụ': t.tong, 'Có vụ trong DB': t.coVu })),
    { 'Nhóm': 'TỔNG', 'Số đơn lên vụ': dong.length, 'Có vụ trong DB': dong.filter(r => r['Mã vụ án (DB)']).length },
    { 'Nhóm': 'Hồ sơ kháng nghị đến (nhóm 5)', 'Số đơn lên vụ': hskn.length },
  ]);
  const cot = Object.keys(dong[0] || { STT: '' });
  // Sheet riêng cấp Phúc thẩm (ưu tiên)
  ghiSheet('Phuc tham', cot, dong.filter(r => r['Cấp'] === 'Phúc thẩm').map((r, i) => ({ ...r, STT: i + 1 })));
  const ws = ghiSheet('Danh sach don len vu', cot, dong);
  dong.forEach((r, i) => {
    for (const c of ['EVD Đã có vụ án', 'EVD màn nhóm']) {
      const j = cot.indexOf(c);
      if (j >= 0 && r[c]) ws.getRow(i + 2).getCell(j + 1).value = { text: 'Xem ảnh', hyperlink: r[c] };
    }
    if (!r['Mã vụ án (DB)']) ws.getRow(i + 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
  });
  ghiSheet(
    'HSKN den',
    ['Số KN', 'Ngày KN', 'Người KN', 'Loại án', 'Số BA', 'Ngày BA', 'Tòa ra BA', 'Trạng thái', 'Người nhận', 'Ngày tạo', 'ID'],
    hskn.map(h => ({
      'Số KN': h.SO_KHANGNGHI, 'Ngày KN': h.NGAY_KN, 'Người KN': h.TEN_NGUOI_KHANGNGHI, 'Loại án': h.LOAI_AN, 'Số BA': h.SO_BANAN_QD,
      'Ngày BA': h.NGAY_BA, 'Tòa ra BA': h.TEN_TOA_RA_BANAN, 'Trạng thái': h.TRANG_THAI, 'Người nhận': h.TEN_NGUOI_NHAN, 'Ngày tạo': h.NGAY_TAO, ID: h.ID,
    })),
  );
  const tam = path.join(KET_QUA, `DS_DON_DA_LEN_VU.${process.pid}.tmp.xlsx`);
  await wb.xlsx.writeFile(tam);
  fs.renameSync(tam, path.join(KET_QUA, 'DS_DON_DA_LEN_VU.xlsx'));
  console.log(md.slice(0, 4 + tongHop.length + 6).join('\n'));
  console.log(`\nĐã ghi ${path.join(KET_QUA, 'DS_DON_DA_LEN_VU.xlsx')}`);
})();
