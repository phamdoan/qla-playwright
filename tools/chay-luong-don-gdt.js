/**
 * CHẠY HÀNG LOẠT luồng đơn GĐT/TT trên môi trường ĐÀO TẠO, mỗi bản án 11 bước (đúng vai tài khoản):
 *
 *   B01 tạo đơn + Thụ lý mới (Trưởng phòng TCD&XLĐ)      B07 PCA phê duyệt tờ trình
 *   B02 lấy số thụ lý (DB, chỉ đọc)                       B08 thông báo phân công (Trưởng phòng)
 *   B03 phân công thẩm phán ngẫu nhiên (Trưởng phòng)     B09 lấy id thông báo (DB)
 *   B04 tờ trình phân công + trình ký (Trưởng phòng)      B10 CVP ký logic thông báo
 *   B05 lấy id tờ trình (DB)                              B11 Thư ký Vụ: "Đã có vụ án" tìm thấy đơn
 *   B06 CVP "Lưu và ký logic" + trình Phó Chánh án
 *
 * Mỗi bước gọi spec có sẵn (tests/quan-ly-don/flows/*) qua tools/chay-ui.js; sau mỗi bước ghi tiến độ vào
 * <ket-qua>/tien-do-don-gdt.json + TIEN_DO_DON_GDT.xlsx/.csv/.md. Chạy lại thì bỏ qua bước đã xong (theo id bản án).
 *
 *   node tools/chay-luong-don-gdt.js --chon=HS:3,DS:2           chọn bản án đầu tiên đủ điều kiện theo loại
 *   node tools/chay-luong-don-gdt.js --id=<ID_BAN_AN>,<...>     chạy đúng các bản án này
 *   node tools/chay-luong-don-gdt.js --bao-cao                  chỉ xuất lại báo cáo từ tiến độ
 *
 * Biến môi trường bắt buộc (không ghi vào mã): QLA_DB_URL, QLA_DB_USER, QLA_DB_PASS (DB của daotao, chỉ đọc).
 * Tuỳ chọn: QLA_HL_THU_MUC_CHAY (thư mục e2e chạy spec, mặc định bản sao chạy riêng daotao),
 *           QLA_HL_KET_QUA (thư mục danh sách + báo cáo), QLA_HL_DANH_SACH (file JSON bản án đủ điều kiện).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const GOC = path.resolve(__dirname, '..');
const THU_MUC_CHAY = process.env.QLA_HL_THU_MUC_CHAY || path.resolve(GOC, '..', '..', 'toa-an-chay-rieng-daotao', 'e2e');
const KET_QUA = process.env.QLA_HL_KET_QUA || path.resolve(GOC, '..', 'sql', 'tra-cuu-ban-an-cu', 'ket-qua');
const DANH_SACH = process.env.QLA_HL_DANH_SACH || path.join(KET_QUA, 'DS_BAN_AN_DU_DIEU_KIEN_TAO_DON.json');
/** --luong=i/n: luồng i (1..n) chạy các bản án thứ i, i+n, … của ds-chay.json; mỗi luồng một file tiến độ */
const LUONG = (process.argv.find(a => a.startsWith('--luong=')) || '').split('=')[1] || '';
const [LUONG_I, LUONG_N] = LUONG ? LUONG.split('/').map(Number) : [1, 1];
/** QLA_HL_NHOM: tên nhóm dữ liệu (vd "tbvp") — danh sách + tiến độ riêng; QLA_HL_HINH_THUC: hình thức đơn của nhóm */
const NHOM = process.env.QLA_HL_NHOM || '';
const HINH_THUC = process.env.QLA_HL_HINH_THUC || 'Đơn đề nghị GĐT/TT';
const TEP_TIEN_DO = path.join(KET_QUA, `tien-do-don-gdt${NHOM ? `.${NHOM}` : ''}${LUONG ? `.l${LUONG_I}` : ''}.json`);
const TEP_DS_CHAY = path.join(KET_QUA, `ds-chay${NHOM ? `.${NHOM}` : ''}.json`);
const THU_MUC_LOG = path.join(KET_QUA, 'log-hang-loat');

/** Tài khoản theo bảng đào tạo (mật khẩu Ta@<CCCD>) */
const TK = {
  truongPhong: { cccd: '011172000008', ten: 'Nguyễn Thị Thu Hường – Trưởng phòng TCD&XLĐ' },
  cvp: { cccd: '026067000466', ten: 'Nguyễn Tường Linh – Chánh văn phòng' },
  pca: { cccd: '001175010767', ten: 'Nguyễn Hải Trâm – Phó Chánh án' },
};
/** Thư ký kiểm "Đã có vụ án" theo Vụ phụ trách; Vụ chưa có tài khoản → B11 BLOCKED */
const THU_KY_VU = {
  'D01.106': { cccd: '001303027120', ten: 'Trương Minh Trang – Thư ký Vụ hình sự' },
  'D01.107': { cccd: '034179003391', ten: 'Nguyễn Thị Hà – Vụ dân sự' },
};
const NGUOI_DUYET = 'Nguyễn Thị Thu Hường';
const NGUOI_KY = 'Nguyễn Tường Linh';
const VIET_TAT = { HS: 'Hình sự', DS: 'Dân sự', HNGD: 'Hôn nhân và gia đình', HC: 'Hành chính', KDTM: 'Kinh doanh, thương mại', LD: 'Lao động', PS: 'Phá sản' };

const args = process.argv.slice(2);
const lay = ten => (args.find(a => a.startsWith(`--${ten}=`)) || '').split('=').slice(1).join('=');

// ───────────── DB chỉ đọc ─────────────
const OJDBC = path.join(os.homedir(), '.m2/repository/com/oracle/database/jdbc/ojdbc10/19.20.0.0/ojdbc10-19.20.0.0.jar');
const THU_MUC_DB = path.join(__dirname, 'db-chi-doc');
function db(sql) {
  for (const b of ['QLA_DB_URL', 'QLA_DB_USER', 'QLA_DB_PASS']) if (!process.env[b]) throw new Error(`Thiếu biến môi trường ${b}`);
  if (!fs.existsSync(path.join(THU_MUC_DB, 'DbChiDoc.class'))) {
    const c = spawnSync('javac', ['-encoding', 'UTF-8', '-d', THU_MUC_DB, path.join(THU_MUC_DB, 'DbChiDoc.java')], { encoding: 'utf8' });
    if (c.status !== 0) throw new Error(`Biên dịch DbChiDoc lỗi: ${c.stderr}`);
  }
  const r = spawnSync('java', ['-Dstdout.encoding=UTF-8', '-cp', `${OJDBC}${path.delimiter}${THU_MUC_DB}`, 'DbChiDoc', sql], {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 50 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`Truy vấn lỗi: ${(r.stderr || r.stdout).split('\n')[0]}`);
  return JSON.parse(r.stdout.trim() || '[]');
}
const q = s => String(s).replace(/'/g, "''");

// ───────────── Chạy spec ─────────────
function chaySpec(tenFile, env, nhan, ghi = true) {
  fs.mkdirSync(THU_MUC_LOG, { recursive: true });
  const tepLog = path.join(THU_MUC_LOG, `${nhan}.log`);
  const thamSo = ['tools/chay-ui.js', 'daotao', ...(ghi ? ['--ghi'] : []), '--cli', `--file=${tenFile}`, ...(tenFile === 'e2e-gdt-1410' ? ['--bo-qua-ocr'] : [])];
  const r = spawnSync('node', thamSo, { cwd: THU_MUC_CHAY, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 45 * 60_000, maxBuffer: 100 * 1024 * 1024 });
  fs.writeFileSync(tepLog, `${r.stdout || ''}\n${r.stderr || ''}\nEXIT ${r.status}`);
  return { ma: r.status, log: tepLog };
}
const docJson = tep => (fs.existsSync(tep) ? JSON.parse(fs.readFileSync(tep, 'utf8')) : null);
const xoaThuMuc = d => fs.rmSync(d, { recursive: true, force: true });
const tc = (kq, ma) => (kq?.ketQua || []).find(t => t.ma === ma) || {};
const daXong = s => ['PASS', 'SKIPPED_ALREADY_ASSIGNED', 'SKIPPED_ALREADY_SUBMITTED', 'SKIPPED_ALREADY_DONE'].includes(s);
const slug = s => String(s).replace(/[^\w-]+/g, '_');

// ───────────── Tiến độ ─────────────
const tienDo = docJson(TEP_TIEN_DO) || { banAn: {} };
const soPass = b => Object.values(b?.buoc || {}).filter(x => x.trangThai === 'PASS').length;
/** Gộp tiến độ của MỌI luồng (tien-do-don-gdt*.json); trùng bản án thì giữ bản ghi đi xa hơn */
function tienDoGop() {
  const gop = {};
  const tep = fs.existsSync(KET_QUA) ? fs.readdirSync(KET_QUA).filter(f => /^tien-do-don-gdt.*\.json$/.test(f)) : [];
  for (const f of tep) {
    const t = f === path.basename(TEP_TIEN_DO) ? tienDo : docJson(path.join(KET_QUA, f)) || { banAn: {} };
    for (const [k, v] of Object.entries(t.banAn || {})) if (!gop[k] || soPass(v) > soPass(gop[k])) gop[k] = v;
  }
  for (const [k, v] of Object.entries(tienDo.banAn)) if (!gop[k] || soPass(v) >= soPass(gop[k])) gop[k] = v;
  return gop;
}
const luu = () => {
  fs.writeFileSync(TEP_TIEN_DO, JSON.stringify(tienDo, null, 2));
  xuatBaoCao();
};

const BUOC = [
  ['B01', 'Tạo đơn + Thụ lý mới'],
  ['B02', 'Số thụ lý'],
  ['B03', 'Phân công thẩm phán'],
  ['B04', 'Tờ trình + trình ký'],
  ['B05', 'Id tờ trình'],
  ['B06', 'CVP ký + trình PCA'],
  ['B07', 'PCA phê duyệt'],
  ['B08', 'Thông báo phân công'],
  ['B09', 'Id thông báo'],
  ['B10', 'CVP ký thông báo'],
  ['B11', 'Đã có vụ án'],
  ['B12', 'Quản lý khiếu nại (KNTC) / Đơn ân giảm (tử hình)'],
];

/** Chạy (hoặc bỏ qua nếu đã xong) một bước; ghi kết quả + lỗi vào bản ghi tiến độ */
function buoc(ba, ma, than) {
  ba.buoc = ba.buoc || {};
  if (ba.buoc[ma]?.trangThai === 'PASS') return true;
  const batDau = Date.now();
  console.log(`  ${ma} ${BUOC.find(b => b[0] === ma)[1]} …`);
  let kq;
  // SSO đào tạo chập chờn (15/10/2026): lỗi đăng nhập → nghỉ 2 phút rồi thử lại, tối đa 2 lần
  for (let lan = 0; lan < 3; lan++) {
    try {
      kq = than() || {};
    } catch (e) {
      kq = { trangThai: 'FAIL', loi: e.message.split('\n')[0] };
    }
    if (kq.trangThai !== 'FAIL' || !/Không vào được .*dashboard|TC01 FAIL — page\.waitForURL|STEP 01: .*(waitForURL|Không vào được)/.test(`${kq.loi} ${kq.log ? fs.readFileSync(kq.log, 'utf8').slice(0, 20000) : ''}`) || lan === 2) break;
    console.log(`  ${ma} lỗi đăng nhập SSO → nghỉ 120s rồi thử lại (${lan + 1}/2)`);
    spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},120000)']);
  }
  ba.buoc[ma] = { trangThai: kq.trangThai || 'PASS', loi: kq.loi || '', log: kq.log || '', giay: Math.round((Date.now() - batDau) / 1000) };
  ba.capNhat = new Date().toISOString();
  console.log(`  ${ma} → ${ba.buoc[ma].trangThai}${ba.buoc[ma].loi ? ` · ${ba.buoc[ma].loi}` : ''}`);
  luu();
  return ba.buoc[ma].trangThai === 'PASS';
}

/** Lỗi thật của B01: bước FAIL đầu tiên; cảnh báo OCR (môi trường tắt OCR, chạy --bo-qua-ocr) chỉ là ghi chú */
const loiB01 = j => {
  const b = (j?.buoc || []).find(x => x.trangThai === 'FAIL');
  const ocr = (j?.loiPhatHien || []).filter(s => !/^STEP 04:/.test(s));
  return (b && `STEP ${b.ma}: ${(b.chiTiet || []).slice(-1)[0] || ''}`) || ocr[0] || '';
};

function chayMotBanAn(r) {
  const khoa = r.ID_BAN_AN;
  // Bản án đã chạy ở luồng/tệp tiến độ khác → kế thừa trạng thái các bước (không chạy lại bước ký/duyệt đã xong)
  if (!tienDo.banAn[khoa] && tienDoGop()[khoa]) tienDo.banAn[khoa] = JSON.parse(JSON.stringify(tienDoGop()[khoa]));
  const ba = (tienDo.banAn[khoa] = tienDo.banAn[khoa] || {
    idBanAn: khoa,
    loaiAn: r.LOAI_AN,
    soBa: r.SO_BAN_AN,
    ngayBa: r.NGAY_BAN_AN,
    capXetXu: r.CAP_XET_XU,
    maToa: r.MA_TOA,
    tenToa: r.TEN_TOA,
    maVu: r.MA_VU,
    maVuAnGoc: r.MA_VUAN,
    hinhThuc: HINH_THUC,
    nhom: NHOM || 'don-gdt',
    batDau: new Date().toISOString(),
  });
  console.log(`\n=== ${ba.loaiAn} · ${ba.capXetXu} số ${ba.soBa} ngày ${ba.ngayBa} · ${ba.tenToa}`);
  const tt = nhan => `${slug(ba.soBa)}-${ba.ngayBa.replace(/\//g, '')}-${nhan}`;

  const ok =
    buoc(ba, 'B01', () => {
      // Người đứng đơn: bị cáo (HS) / bị đơn (DS…) trong vụ án gốc; không có thì người đầu tiên
      const nguoi = db(
        `select ho_ten, regexp_substr(ngay_sinh, '[0-9]{4}') nam_sinh, dia_chi, loai_con_nguoi from quanlyan.connguoi_vu where id_vuan='${q(r.ID_VUAN)}' and (danh_dau_xoa=0 or danh_dau_xoa is null) and ho_ten is not null`,
      );
      if (!nguoi.length) return { trangThai: 'BLOCKED', loi: 'Vụ án gốc không có người tham gia' };
      const uuTien = ['TGTTHS_07', 'TGTTDS_02', 'TGTTHC_02'];
      const n = nguoi.find(x => uuTien.includes(x.LOAI_CON_NGUOI)) || nguoi[0];
      const laHs = /Hình sự/.test(ba.loaiAn);
      ba.nguoiDungDon = n.HO_TEN;
      const env = {
        QLA_1410_SO: ba.soBa,
        QLA_1410_NGAY: ba.ngayBa,
        QLA_1410_TOA: ba.tenToa,
        QLA_1410_CAP: ba.capXetXu,
        QLA_1410_NGUOI: n.HO_TEN,
        QLA_1410_NAM_SINH: n.NAM_SINH || '',
        QLA_1410_DIA_CHI: (n.DIA_CHI || ba.tenToa.replace(/^Tòa án nhân dân /, '')).replace(/, Việt Nam$/, ''),
        QLA_1410_TU_CACH: laHs ? 'bị cáo trong vụ án hình sự' : `đương sự trong vụ án ${ba.loaiAn.toLowerCase()}`,
        QLA_1410_CCCD: TK.truongPhong.cccd,
        QLA_1410_HINH_THUC: ba.hinhThuc || HINH_THUC,
        QLA_1410_TU_HINH: ba.nhom === 'tu-hinh' ? '1' : '',
      };
      const pdf = spawnSync('node', ['tools/tao-pdf-don-gdt-1410.js'], { cwd: THU_MUC_CHAY, env: { ...process.env, ...env }, encoding: 'utf8' });
      if (pdf.status !== 0) return { trangThai: 'FAIL', loi: `Sinh PDF lỗi: ${pdf.stderr.split('\n')[0]}` };
      const thuMucBc = path.join(THU_MUC_CHAY, 'reports/e2e-gdt-1410', `${slug(ba.soBa)}-${ba.ngayBa.replace(/\//g, '')}`);
      xoaThuMuc(thuMucBc);
      const kq = chaySpec('e2e-gdt-1410', env, tt('B01'));
      const j = docJson(path.join(thuMucBc, 'test-results.json'));
      if (j?.maDon && j?.idDon) {
        ba.maDon = j.maDon;
        ba.idDon = j.idDon;
      }
      const khongTrung = (j?.buoc || []).find(b => b.ma === '02');
      if (!ba.idDon && khongTrung?.trangThai === 'SKIPPED_EXISTING') {
        // Lượt trước bị dừng ngay sau khi lưu: nhận lại đúng đơn do Trưởng phòng tạo cho bản án này
        const daCo = db(
          `select ma_don, id from quanlyan.don where so_banan_qd='${q(ba.soBa)}' and ngay_banan_qd=to_date('${ba.ngayBa}','DD/MM/YYYY') and don_vi_ra_banan_qd='${q(ba.maToa)}' and nguoi_tao='${TK.truongPhong.cccd}' and (danh_dau_xoa=0 or danh_dau_xoa is null)`,
        );
        if (daCo.length !== 1) return { trangThai: 'BLOCKED', loi: `Bản án đã có ${daCo.length} đơn không do luồng này tạo (chống trùng)`, log: kq.log };
        ba.maDon = daCo[0].MA_DON;
        ba.idDon = daCo[0].ID;
        return { log: kq.log };
      }
      // Đơn ĐÃ lưu, chỉ lệch trường khi đọc lại (STEP 10) → lỗi hệ thống: ghi nhận, không chặn luồng (không vá vòng)
      const buocLoi = (j?.buoc || []).filter(x => x.trangThai === 'FAIL');
      if (ba.idDon && buocLoi.length === 1 && buocLoi[0].ma === '10' && /trường lưu lệch/.test((buocLoi[0].chiTiet || []).join(' '))) {
        ba.loiHeThong = (buocLoi[0].chiTiet || []).filter(x => /^LỆCH/.test(x)).join('; ');
        return { log: kq.log };
      }
      if (!ba.idDon || (j?.thongKe?.FAIL || 0) > 0) return { trangThai: 'FAIL', loi: loiB01(j) || `spec thoát ${kq.ma}`, log: kq.log };
      return { log: kq.log };
    }) &&
    buoc(ba, 'B02', () => {
      const d = db(
        `select c.so_thuly, c.trang_thai_thu_ly_don, c.ma_don_vi_chuyen_den_noi_bo, c.don_vi_chuyen_den_noi_bo from quanlyan.don_chuyen c where c.id_don='${q(ba.idDon)}'`,
      )[0];
      if (!d?.SO_THULY) return { trangThai: 'FAIL', loi: `Đơn chưa có số thụ lý (thụ lý: ${d?.TRANG_THAI_THU_LY_DON || '?'})` };
      ba.soThuLy = d.SO_THULY;
      ba.vuNhan = d.DON_VI_CHUYEN_DEN_NOI_BO;
      ba.maVuNhan = d.MA_DON_VI_CHUYEN_DEN_NOI_BO;
      if (ba.maVu && ba.maVuNhan && ba.maVu !== ba.maVuNhan) return { trangThai: 'FAIL', loi: `Chuyển nhầm Vụ: ${ba.maVuNhan} (đúng: ${ba.maVu})` };
    }) &&
    buoc(ba, 'B03', () => {
      const env = {
        QLA_PC_CCCD: TK.truongPhong.cccd,
        QLA_PC_TEN: TK.truongPhong.ten,
        QLA_PC_SO_THU_LY: ba.soThuLy,
        QLA_PC_SO_BA: ba.soBa,
        QLA_PC_NGAY_BA: ba.ngayBa,
        QLA_PC_MA_DON: ba.maDon,
      };
      const thuMucBc = path.join(THU_MUC_CHAY, 'reports/e2e-phan-cong-tham-phan', ba.soThuLy);
      xoaThuMuc(thuMucBc);
      const kq = chaySpec('e2e-phan-cong-tham-phan', env, tt('B03'));
      const j = docJson(path.join(thuMucBc, 'test-results.json'));
      if (j?.thamPhan) ba.thamPhan = j.thamPhan;
      if (tc(j, 'TC11').trangThai !== 'PASS') return { trangThai: 'FAIL', loi: (tc(j, 'TC11').chiTiet || tc(j, 'TC05').chiTiet || []).slice(-1)[0] || `spec thoát ${kq.ma}`, log: kq.log };
      return { log: kq.log };
    }) &&
    buoc(ba, 'B04', () => chayVanBan(ba, null, tt('B04'))) &&
    buoc(ba, 'B05', () => layIdVanBan(ba, '19-GDT', 'idToTrinh')) &&
    buoc(ba, 'B06', () => chayLanhDao(ba, TK.cvp, ba.idToTrinh, 'ky-trinh-tiep', 'Tờ trình phân công', tt('B06'))) &&
    buoc(ba, 'B07', () => chayLanhDao(ba, TK.pca, ba.idToTrinh, 'phe-duyet', 'Tờ trình phân công', tt('B07'))) &&
    buoc(ba, 'B08', () => chayVanBan(ba, 'Thông báo phân công TP', tt('B08'))) &&
    buoc(ba, 'B09', () => layIdVanBan(ba, '14-GDT', 'idThongBao')) &&
    buoc(ba, 'B10', () => chayLanhDao(ba, TK.cvp, ba.idThongBao, 'ky-logic', 'Thông báo phân công', tt('B10'))) &&
    buoc(ba, 'B11', () => {
      const thuKy = THU_KY_VU[ba.maVuNhan];
      if (!thuKy) return { trangThai: 'BLOCKED', loi: `Chưa có tài khoản thư ký cho Vụ ${ba.maVuNhan} (${ba.vuNhan})` };
      const env = { QLA_NV_CCCD: thuKy.cccd, QLA_NV_TEN: thuKy.ten, QLA_NV_MA_DON: ba.maDon, QLA_NV_SO_BA: ba.soBa, QLA_NV_NGAY_BA: ba.ngayBa };
      const thuMucBc = path.join(THU_MUC_CHAY, 'reports/e2e-nhan-don-tl-vu-an', ba.maDon);
      xoaThuMuc(thuMucBc);
      const kq = chaySpec('e2e-nhan-don-tl-vu-an', env, tt('B11'), false);
      const j = docJson(path.join(thuMucBc, 'test-results.json'));
      if (tc(j, 'TC04').trangThai !== 'PASS') return { trangThai: 'FAIL', loi: (tc(j, 'TC04').chiTiet || []).slice(-1)[0] || `spec thoát ${kq.ma}`, log: kq.log };
      ba.dongVuAn = ((tc(j, 'TC04').chiTiet || []).find(s => s.startsWith('Dòng:')) || '').replace(/^Dòng:\s*/, '');
      // EVD: ảnh kết quả tìm kiếm ở tab "Đã có vụ án" → ket-qua/evd-tim-kiem/
      const anh = path.join(thuMucBc, 'screenshots', '04-ket-qua-tim-kiem.png');
      if (fs.existsSync(anh)) {
        const thuMucEvd = path.join(KET_QUA, 'evd-tim-kiem');
        fs.mkdirSync(thuMucEvd, { recursive: true });
        ba.evdTimKiem = `evd-tim-kiem/${slug(ba.soBa)}-${ba.ngayBa.replace(/\//g, '')}-don-${ba.maDon}.png`;
        fs.copyFileSync(anh, path.join(KET_QUA, ba.evdTimKiem));
      }
      return { log: kq.log };
    }) &&
    // Nhóm KNTC tố tụng: vụ khiếu nại phải hiện ở "Quản lý khiếu nại"; nhóm tử hình: đơn hiện ở "Đơn ân giảm"
    (!['kntc', 'tu-hinh'].includes(ba.nhom) ||
      buoc(ba, 'B12', () => {
        const thuKy = THU_KY_VU[ba.maVuNhan];
        if (!thuKy) return { trangThai: 'BLOCKED', loi: `Chưa có tài khoản thư ký cho Vụ ${ba.maVuNhan} (${ba.vuNhan})` };
        const anGiam = ba.nhom === 'tu-hinh';
        const env = { QLA_KN_CCCD: thuKy.cccd, QLA_KN_TEN: thuKy.ten, QLA_KN_MA_DON: ba.maDon, QLA_KN_SO_BA: ba.soBa, QLA_KN_SO_THU_LY: ba.soThuLy, QLA_KN_MAN: anGiam ? 'don-an-giam' : '' };
        const thuMucBc = path.join(THU_MUC_CHAY, `reports/${anGiam ? 'e2e-don-an-giam' : 'e2e-quan-ly-khieu-nai'}`, ba.maDon);
        xoaThuMuc(thuMucBc);
        const kq = chaySpec('e2e-quan-ly-khieu-nai', env, tt('B12'), false);
        const j = docJson(path.join(thuMucBc, 'test-results.json'));
        const vu = anGiam
          ? db(`select g.is_an_tuhinh, g.is_xinangiam_an_tuhinh, (select count(*) from quanlyan.don_an_giam a where a.id_don = g.id_don) don_an_giam, (select max(a.id_ho_so) from quanlyan.don_an_giam a where a.id_don = g.id_don) id_ho_so from quanlyan.don_gdt g where g.id_don='${q(ba.idDon)}'`)[0]
          : db(`select v.ma_vuan, v.giai_doan, v.loai_vu_giai_quyet from quanlyan.don d join quanlyan.vuan v on v.id = d.id_vu_giaiquyet where d.id='${q(ba.idDon)}'`)[0];
        ba.vuKhieuNai = !vu
          ? 'chưa có dữ liệu'
          : anGiam
            ? `án tử hình=${vu.IS_AN_TUHINH} · xin ân giảm=${vu.IS_XINANGIAM_AN_TUHINH} · DON_AN_GIAM=${vu.DON_AN_GIAM} · hồ sơ=${vu.ID_HO_SO || '—'}`
            : `${vu.MA_VUAN} · ${vu.GIAI_DOAN} · ${vu.LOAI_VU_GIAI_QUYET}`;
        if (tc(j, 'TC03').trangThai !== 'PASS') return { trangThai: 'FAIL', loi: `${(tc(j, 'TC03').chiTiet || []).slice(-1)[0] || `spec thoát ${kq.ma}`} · DB: ${ba.vuKhieuNai}`, log: kq.log };
        const anh = path.join(thuMucBc, 'screenshots', '03-ket-qua-tim-kiem.png');
        if (fs.existsSync(anh)) {
          fs.mkdirSync(path.join(KET_QUA, 'evd-tim-kiem'), { recursive: true });
          ba.evdKhieuNai = `evd-tim-kiem/${slug(ba.soBa)}-${ba.ngayBa.replace(/\//g, '')}-don-${ba.maDon}-${anGiam ? 'an-giam' : 'khieu-nai'}.png`;
          fs.copyFileSync(anh, path.join(KET_QUA, ba.evdKhieuNai));
        }
        return { log: kq.log };
      }));
  ba.trangThai = ok ? 'XONG' : Object.values(ba.buoc || {}).some(b => b.trangThai === 'BLOCKED') ? 'BLOCKED' : 'LOI';
  ba.ketThuc = new Date().toISOString();
  luu();
}

/** Tờ trình (loai=null) hoặc Thông báo phân công: spec e2e-to-trinh-phan-cong; lỗi lưu mà đã có bản nháp → chạy lại 1 lần */
function chayVanBan(ba, loai, nhan) {
  const env = {
    QLA_TT_CCCD: TK.truongPhong.cccd,
    QLA_TT_MA_DON: ba.maDon,
    QLA_TT_SO_THU_LY: ba.soThuLy,
    QLA_TT_SO_BA: ba.soBa,
    QLA_TT_NGAY_BA: ba.ngayBa,
    QLA_TT_TOA: ba.tenToa,
    QLA_TT_NGUOI_DUYET: NGUOI_DUYET,
    QLA_TT_NGUOI_KY: NGUOI_KY,
    ...(loai ? { QLA_TT_LOAI_VB: loai, QLA_TT_TEN_VB: 'Thông báo phân công' } : {}),
  };
  const thuMucBc = path.join(THU_MUC_CHAY, 'reports/e2e-to-trinh-phan-cong', `${ba.maDon}${loai ? '-Thông-báo-phân-công' : ''}`);
  let kq;
  for (let lan = 1; lan <= 2; lan++) {
    xoaThuMuc(thuMucBc);
    kq = chaySpec('e2e-to-trinh-phan-cong', env, `${nhan}-lan${lan}`);
    const j = docJson(path.join(thuMucBc, 'test-results.json'));
    if (daXong(tc(j, 'TC12').trangThai) && daXong(tc(j, 'TC14').trangThai)) return { log: kq.log };
    // Chỉ chạy lại khi đã có bản nháp (spec lượt 2 sẽ trình bản nháp, không tạo bản sao)
    const coNhap = (tc(j, 'TC09').trangThai === 'FAIL') && db(
      `select count(*) n from quanlyan.vanban v join quanlyan.don_vanban dv on dv.id_vanban=v.id where dv.id_don='${q(ba.idDon)}' and v.ma_bieumau like '${loai ? '14-GDT' : '19-GDT'}%' and (v.danh_dau_xoa=0 or v.danh_dau_xoa is null)`,
    )[0]?.N === '1';
    if (!coNhap) return { trangThai: 'FAIL', loi: (Object.values(j?.ketQua || {}).find(t => t.trangThai === 'FAIL')?.chiTiet || []).slice(-1)[0] || `spec thoát ${kq.ma}`, log: kq.log };
  }
  return { trangThai: 'FAIL', loi: 'Trình ký bản nháp không thành công sau 2 lượt', log: kq.log };
}

function layIdVanBan(ba, maMau, truong) {
  const ds = db(
    `select v.id from quanlyan.vanban v join quanlyan.don_vanban dv on dv.id_vanban=v.id where dv.id_don='${q(ba.idDon)}' and v.ma_bieumau like '${maMau}%' and (v.danh_dau_xoa=0 or v.danh_dau_xoa is null)`,
  );
  if (ds.length !== 1) return { trangThai: 'FAIL', loi: `Có ${ds.length} văn bản mẫu ${maMau} của đơn` };
  ba[truong] = ds[0].ID;
}

function chayLanhDao(ba, tk, id, hanhDong, tenVb, nhan) {
  const env = { QLA_LD_CCCD: tk.cccd, QLA_LD_TEN: tk.ten, QLA_LD_ID: id, QLA_LD_HANH_DONG: hanhDong, QLA_LD_MA_DON: ba.maDon, QLA_LD_TEN_VB: tenVb };
  const thuMucBc = path.join(THU_MUC_CHAY, 'reports/e2e-lanh-dao-duyet', `${ba.maDon}-${hanhDong}`);
  xoaThuMuc(thuMucBc);
  const kq = chaySpec('e2e-lanh-dao-duyet', env, nhan);
  const j = docJson(path.join(thuMucBc, 'test-results.json'));
  if (daXong(tc(j, 'TC04').trangThai) || tc(j, 'TC02').trangThai === 'SKIPPED_ALREADY_DONE' || tc(j, 'TC03').trangThai === 'SKIPPED_ALREADY_DONE') return { log: kq.log };
  const loi = (j?.ketQua || []).find(t => t.trangThai === 'FAIL');
  return { trangThai: 'FAIL', loi: (loi?.chiTiet || []).slice(-1)[0] || `spec thoát ${kq.ma}`, log: kq.log };
}

// ───────────── Báo cáo ─────────────
/** Nhiều luồng cùng ghi báo cáo → ghi file tạm rồi đổi tên (không để file dở) */
function ghiNguyenTu(tep, noiDung) {
  const tam = `${tep}.${process.pid}.tmp`;
  fs.writeFileSync(tam, noiDung);
  try {
    fs.renameSync(tam, tep);
  } catch {
    fs.rmSync(tam, { force: true });
  }
}
/**
 * Bổ sung EVD cho đơn đã qua B11 mà chưa có ảnh (luồng chạy bằng bản cũ): tìm báo cáo spec bước 11 trong MỌI
 * thư mục chạy toa-an-chay-rieng-daotao* → chép ảnh kết quả tìm kiếm + lấy dòng tìm thấy.
 */
function boSungEvd(b) {
  if (b.evdTimKiem || !b.maDon || b.buoc?.B11?.trangThai !== 'PASS') return;
  const goc = path.dirname(path.dirname(THU_MUC_CHAY));
  const dsThuMuc = fs.readdirSync(goc).filter(d => /^toa-an-chay-rieng-daotao(-\d+)?$/.test(d));
  for (const d of dsThuMuc) {
    const bc = path.join(goc, d, 'e2e', 'reports', 'e2e-nhan-don-tl-vu-an', b.maDon);
    const anh = path.join(bc, 'screenshots', '04-ket-qua-tim-kiem.png');
    if (!fs.existsSync(anh)) continue;
    fs.mkdirSync(path.join(KET_QUA, 'evd-tim-kiem'), { recursive: true });
    b.evdTimKiem = `evd-tim-kiem/${slug(b.soBa)}-${b.ngayBa.replace(/\//g, '')}-don-${b.maDon}.png`;
    fs.copyFileSync(anh, path.join(KET_QUA, b.evdTimKiem));
    const j = docJson(path.join(bc, 'test-results.json'));
    if (!b.dongVuAn) b.dongVuAn = ((tc(j, 'TC04').chiTiet || []).find(s => s.startsWith('Dòng:')) || '').replace(/^Dòng:\s*/, '');
    return;
  }
}

function xuatBaoCao() {
  const ds = Object.values(tienDoGop()).sort((a, b) => String(a.batDau || '').localeCompare(String(b.batDau || '')));
  ds.forEach(boSungEvd);
  const cot =['STT', 'Loại án', 'Cấp', 'Số BA', 'Ngày BA', 'Tòa', 'Người đứng đơn', 'Mã đơn', 'Số thụ lý', 'Vụ nhận', 'Thẩm phán', 'Id tờ trình', 'Id thông báo', 'Bước đã xong', 'Trạng thái', 'Lỗi / ghi chú', 'Cập nhật', 'EVD tìm kiếm (Đã có vụ án)', 'Dòng tìm thấy', 'Hình thức đơn', 'Nhóm', 'EVD Quản lý khiếu nại / Đơn ân giảm', 'Kiểm DB (vụ khiếu nại / ân giảm)'];
  const dong = ds.map((b, i) => {
    const xong = BUOC.filter(([ma]) => b.buoc?.[ma]?.trangThai === 'PASS').length;
    const loi = Object.entries(b.buoc || {}).find(([, v]) => v.trangThai !== 'PASS');
    return [
      i + 1, b.loaiAn, b.capXetXu, b.soBa, b.ngayBa, b.tenToa, b.nguoiDungDon || '', b.maDon || '', b.soThuLy || '', b.vuNhan || '',
      b.thamPhan || '', b.idToTrinh || '', b.idThongBao || '', `${xong}/${['kntc', 'tu-hinh'].includes(b.nhom) ? BUOC.length : BUOC.length - 1}`,
      b.trangThai || (xong ? 'DANG_CHAY' : 'CHUA_CHAY'),
      [loi ? `${loi[0]} ${BUOC.find(x => x[0] === loi[0])[1]}: ${loi[1].trangThai} – ${loi[1].loi}` : '', b.loiHeThong ? `Lỗi hệ thống (đơn vẫn tạo): ${b.loiHeThong}` : ''].filter(Boolean).join(' | '),
      b.capNhat ? new Date(b.capNhat).toLocaleString('vi-VN') : '',
      b.evdTimKiem || '',
      (b.dongVuAn || '').replace(/^Dòng:\s*/, ''),
      b.hinhThuc || 'Đơn đề nghị GĐT/TT',
      b.nhom || 'don-gdt',
      b.evdKhieuNai || '',
      b.vuKhieuNai || '',
    ];
  });
  const csv = [cot, ...dong].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  ghiNguyenTu(path.join(KET_QUA, 'TIEN_DO_DON_GDT.csv'), '﻿' + csv);
  const dem = s => dong.filter(r => r[14] === s).length;
  const md = [
    '# Tiến độ tạo đơn GĐT/TT hàng loạt (đào tạo)',
    '',
    `Cập nhật ${new Date().toLocaleString('vi-VN')} · ${ds.length} bản án · XONG ${dem('XONG')} · LOI ${dem('LOI')} · BLOCKED ${dem('BLOCKED')} · đang chạy ${dem('DANG_CHAY')}`,
    '',
    `Bước: ${BUOC.map(([m, t]) => `${m} ${t}`).join(' · ')}`,
    '',
    `| ${cot.join(' | ')} |`,
    `|${cot.map(() => '---').join('|')}|`,
    ...dong.map(r => `| ${r.map(v => String(v).replace(/\|/g, '/')).join(' | ')} |`),
  ];
  ghiNguyenTu(path.join(KET_QUA, 'TIEN_DO_DON_GDT.md'), md.join('\n'));
  try {
    const ExcelJS = require(process.env.QLA_EXCELJS || 'exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Tien do');
    ws.addRow(cot);
    dong.forEach(r => ws.addRow(r));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.columns.forEach((c, i) => (c.width = Math.min(50, Math.max(8, cot[i].length + 2, ...dong.map(r => String(r[i]).length + 2)))));
    const mau = { XONG: 'FFC6EFCE', LOI: 'FFFFC7CE', BLOCKED: 'FFFFEB9C' };
    dong.forEach((r, i) => {
      if (mau[r[14]]) ws.getRow(i + 2).getCell(15).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: mau[r[14]] } };
      // Cột EVD: link tương đối tới ảnh (mở được khi file xlsx nằm cùng thư mục ket-qua)
      for (const iEvd of [cot.indexOf('EVD tìm kiếm (Đã có vụ án)'), cot.indexOf('EVD Quản lý khiếu nại / Đơn ân giảm')])
        if (r[iEvd]) ws.getRow(i + 2).getCell(iEvd + 1).value = { text: 'Xem ảnh', hyperlink: r[iEvd] };
    });
    const ct = wb.addWorksheet('Chi tiet buoc');
    ct.addRow(['Mã đơn', 'Số BA', 'Bước', 'Tên bước', 'Trạng thái', 'Giây', 'Lỗi', 'Log']);
    ds.forEach(b => BUOC.forEach(([m, t]) => b.buoc?.[m] && ct.addRow([b.maDon || '', b.soBa, m, t, b.buoc[m].trangThai, b.buoc[m].giay, b.buoc[m].loi, b.buoc[m].log])));
    ct.getRow(1).font = { bold: true };
    const tam = path.join(KET_QUA, `.TIEN_DO_DON_GDT.${process.pid}.xlsx`);
    wb.xlsx
      .writeFile(tam)
      .then(() => fs.renameSync(tam, path.join(KET_QUA, 'TIEN_DO_DON_GDT.xlsx')))
      .catch(() => fs.rmSync(tam, { force: true }));
  } catch {
    /* không có exceljs → chỉ có .csv/.md */
  }
}

// ───────────── Chọn bản án ─────────────
function chonBanAn() {
  const tatCa = JSON.parse(fs.readFileSync(DANH_SACH, 'utf8'));
  const ids = lay('id');
  if (ids) return ids.split(',').map(id => tatCa.find(r => r.ID_BAN_AN === id)).filter(Boolean);
  const chon = lay('chon');
  if (!chon) throw new Error('Thiếu --chon=HS:3,DS:2 hoặc --id=...');
  const ra = [];
  for (const phan of chon.split(',')) {
    const [vt, so] = phan.split(':');
    const loai = VIET_TAT[vt] || vt;
    const gop = tienDoGop();
    // Bản án đã thuộc danh sách chạy của NHÓM KHÁC → bỏ (tránh 2 nhóm cùng tạo đơn cho một bản án)
    const cuaNhomKhac = new Set(
      fs.readdirSync(KET_QUA)
        .filter(f => /^ds-chay(\..+)?\.json$/.test(f) && f !== path.basename(TEP_DS_CHAY))
        .flatMap(f => docJson(path.join(KET_QUA, f)) || []),
    );
    const ung = tatCa
      .filter(r => r.LOAI_AN === loai && !cuaNhomKhac.has(r.ID_BAN_AN) && (!gop[r.ID_BAN_AN] || (gop[r.ID_BAN_AN].nhom || 'don-gdt') === (NHOM || 'don-gdt')))
      .filter(r => gop[r.ID_BAN_AN]?.trangThai !== 'XONG' && Number(r.SO_NGUOI) > 0 && !r.CAN_XEM)
      .sort((a, b) => (a.CAP_XET_XU === 'Phúc thẩm' ? 0 : 1) - (b.CAP_XET_XU === 'Phúc thẩm' ? 0 : 1));
    let lay2 = 0;
    for (const r of ung) {
      if (lay2 >= Number(so)) break;
      // Đang dở ở lượt trước → chạy tiếp (không kiểm "đã có đơn" vì đơn đó là của chính luồng)
      if (gop[r.ID_BAN_AN]) {
        ra.push(r);
        lay2++;
        continue;
      }
      // Bỏ bản án đã có đơn trên DB (do người khác tạo sau khi lập danh sách)
      const n =db(`select count(*) n from quanlyan.don where so_banan_qd='${q(r.SO_BAN_AN)}' and ngay_banan_qd=to_date('${r.NGAY_BAN_AN}','DD/MM/YYYY') and don_vi_ra_banan_qd='${q(r.MA_TOA)}' and (danh_dau_xoa=0 or danh_dau_xoa is null)`)[0].N;
      if (n !== '0') continue;
      ra.push(r);
      lay2++;
    }
  }
  return ra;
}

if (args.includes('--bao-cao')) {
  xuatBaoCao();
  console.log('Đã xuất báo cáo:', KET_QUA);
} else if (args.includes('--lap-danh-sach')) {
  // Chọn MỘT LẦN cho mọi luồng (chọn riêng từng luồng thì lệch nhau khi luồng khác vừa tạo đơn)
  const ds = chonBanAn().map(r => r.ID_BAN_AN);
  fs.writeFileSync(TEP_DS_CHAY, JSON.stringify(ds, null, 1));
  console.log(`Đã lập ${TEP_DS_CHAY}: ${ds.length} bản án`);
} else {
  const tatCa = JSON.parse(fs.readFileSync(DANH_SACH, 'utf8'));
  let ds;
  if (LUONG) {
    const tatCaId = JSON.parse(fs.readFileSync(TEP_DS_CHAY, 'utf8'));
    const gop = tienDoGop();
    ds = tatCaId.filter((_, i) => i % LUONG_N === LUONG_I - 1).filter(id => gop[id]?.trangThai !== 'XONG').map(id => ({ ID_BAN_AN: id }));
    // Bản án dở ở luồng/lượt khác → chép tiến độ sang luồng này để bỏ qua bước đã PASS
    for (const { ID_BAN_AN: id } of ds) if (gop[id] && !tienDo.banAn[id]) tienDo.banAn[id] = gop[id];
  } else {
    ds = chonBanAn();
  }
  console.log(`Luồng ${LUONG || '1/1'} · chạy ${ds.length} bản án · thư mục chạy ${THU_MUC_CHAY} · báo cáo ${KET_QUA}`);
  for (const r of ds) chayMotBanAn(tatCa.find(x => x.ID_BAN_AN === r.ID_BAN_AN) || r);
  console.log('\nXong. Báo cáo:', path.join(KET_QUA, 'TIEN_DO_DON_GDT.xlsx'));
}
