/**
 * Phân loại mỗi CỘT của biểu mẫu báo cáo thành một loại UT KIỂM ĐƯỢC TRÊN MÀN HÌNH.
 *
 * Nguyên tắc (user chốt 14/10/2026): **không dùng SQL để kiểm**. SQL trong mapping chỉ là tham
 * chiếu để biết ô đó cần dữ liệu gì; việc kiểm phải lên màn hình xem thứ đó CÓ trên hệ thống chưa.
 *
 * Mỗi cột rơi vào một loại:
 *
 *   CONG_THUC  cột cộng/trừ các cột khác (`Cột 6 = Cột 2 + Cột 3 - …`, hoặc màn hình = "ct").
 *              Không cần màn nguồn: kiểm bằng chính các ô khác của biểu mẫu.
 *   BIEU_MAU   mapping chốt ô bằng `VANBAN.MA_BIEUMAU IN ('45DS', …)` → lên màn Quản lý biểu mẫu
 *              (và ô chọn loại văn bản trên màn nghiệp vụ) xem mã đó có chưa.
 *   DANH_MUC   mapping chốt bằng `MA_LOAI_DANHMUC IN ('QHPL_TC_DS', …)` → kiểm trên ô chọn
 *              "Quan hệ pháp luật (Thống kê)" / màn danh mục.
 *   TRUONG     mapping chốt bằng cột DB (`VUAN.NGAY_THULY`, `VUAN.THOIHAN_XETXU`…) → kiểm trường
 *              tương ứng có trên màn nào; cần khai NEO (nhãn trên màn) vì tên cột DB ≠ nhãn.
 *   CHUA_RO    mapping chưa đủ để chốt (ô trống, hoặc chỉ có ghi chú "cần xác nhận").
 *
 * Một cột có thể cần nhiều mảnh (vd. vừa mã biểu mẫu vừa trường ngày) → `manh` giữ tất cả, `loai`
 * là loại CHÍNH để xếp nhóm báo cáo.
 */

/** Mã màn hình viết tắt mà BA dùng trong cột "Mockup/ Màn hình". */
const VIET_TAT_MAN = [
  [/^(ct|c[ôo]ng\s*th[ứu]c)$/i, 'CONG_THUC'],
  [/x[ửu]\s*l[ýy]\s*[đd][ơo]n/i, 'XU_LY_DON'],
  [/th[ụu]\s*l[ýy]/i, 'THU_LY'],
  [/cbxx|chu[ẩa]n\s*b[ịi]\s*x[ée]t\s*x[ửu]/i, 'CHUAN_BI_XET_XU'],
  [/k[ếe]t\s*qu[ảa]/i, 'KET_QUA'],
  [/^xx$|x[ée]t\s*x[ửu]/i, 'XET_XU'],
  [/[đd][ưu][ơo]ng\s*s[ựu]|ng[ưu][ờo]i\s*tham\s*gia\s*t[ốo]\s*t[ụu]ng/i, 'NGUOI_THAM_GIA'],
  [/t[òo]a\s*c[ấa]p\s*tr[êe]n/i, 'TOA_CAP_TREN'],
  [/s[ơo]\s*th[ẩa]m/i, 'LAY_TU_SO_THAM'],
  [/to[àa]n\s*b[ộo]/i, 'TOAN_BO'],
];

/** "cbxx, xx" → ['CHUAN_BI_XET_XU','XET_XU']; trả [] nếu BA để trống. */
function giaiMaManHinh(o) {
  if (!o) return [];
  const ra = new Set();
  for (const phan of String(o).split(/[,;/]|\bv[àa]\b/i)) {
    const s = phan.trim();
    if (!s) continue;
    for (const [re, ma] of VIET_TAT_MAN) {
      if (re.test(s)) {
        ra.add(ma);
        break;
      }
    }
  }
  return [...ra];
}

/** Tách danh sách mã trong `IN ('a','b', c)` hoặc `= 'a'`; chấp cả mã KHÔNG có nháy (19VDS). */
function tachMa(doan) {
  const ra = [];
  for (const m of doan.matchAll(/'([^']*)'|([A-Z0-9][A-Z0-9_.\-]{1,})/g)) {
    const v = (m[1] || m[2] || '').trim();
    // mapping có ô viết `IN ('45DS', , '46DS')` → nháy rỗng, bỏ qua thay vì sinh UT mã rỗng
    if (!v) continue;
    if (/^(IN|AND|OR|NOT|NULL|IS|SELECT|FROM|WHERE)$/i.test(v)) continue;
    // mã hợp lệ: bắt đầu bằng chữ/số, dài ≥ 2. Loại rác do mapping viết `IN (',' …)`.
    if (!/^[A-Za-z0-9][A-Za-z0-9_.\-]+$/.test(v)) continue;
    ra.push(v);
  }
  return ra;
}

function timSau(van, reKhoa) {
  const ra = [];
  for (const m of van.matchAll(reKhoa)) {
    // lấy đoạn sau dấu = / IN tới hết ngoặc hoặc tới dấu ; , và
    const sau = van.slice(m.index + m[0].length, m.index + m[0].length + 400);
    const trongNgoac = sau.match(/^\s*\(([^)]*)\)/);
    const doan = trongNgoac ? trongNgoac[1] : (sau.match(/^\s*('[^']*'|[A-Z0-9_.\-]+)/) || [''])[0];
    ra.push(...tachMa(doan));
  }
  return [...new Set(ra)];
}

const RE_MA_BIEU_MAU = /MA_BIEU_?MAU\s*(?:IN|=|n[ằa]m\s*trong)\s*/gi;
const RE_MA_LOAI_DM = /MA_LOAI_DANHMUC\s*(?:IN|=)\s*/gi;
/**
 * `VUAN.NGAY_THULY`, `QTDM.DANHMUC.MA_LOAI_DANHMUC` … → BẢNG.CỘT.
 * Bắt cả dạng ba phần (SCHEMA.BẢNG.CỘT) vì mapping viết lẫn hai lối; dạng hai phần mà phần đầu là
 * tên SCHEMA (`QTDM.DANHMUC`) thì KHÔNG phải cột — bỏ, nếu không UT sẽ đi tìm trường tên "DANHMUC".
 */
const RE_COT_DB = /\b([A-Z][A-Z0-9_]{2,})\.([A-Z][A-Z0-9_]{2,})(?:\.([A-Z][A-Z0-9_]{2,}))?\b/g;
const SCHEMA = /^(QTDM|QTUD|BCTK|QUANLYAN|TA_REPORT|APP_GSCM|GDTTT|PDB_QLATT|CDTA)$/;

/** Cột DB chỉ là bộ lọc kỹ thuật, không phải "dữ liệu người dùng nhập" → không sinh UT trường. */
const COT_KY_THUAT = /^(ID|ID_[A-Z0-9_]+|DANH_DAU_XOA|GIAI_DOAN|LOAI_AN|MA_DONVI|MA_BIEU_?MAU|MA_LOAI_DANHMUC|TRANG_THAI|MA|TEN)$/;

function gomVan(c) {
  return [c.truong, c.boLoc, c.moTa, c.huongDan, ...(c.dongPhu || []).flatMap(p => [p.truong, p.boLoc, p.moTa])]
    .filter(Boolean)
    .join(' \n ');
}

/** Phân loại một cột mapping. Trả { loai, manh, manHinh, … } */
function phanLoaiCot(c) {
  const van = gomVan(c);
  const manHinh = giaiMaManHinh(c.manHinh);
  const maBieuMau = timSau(van, RE_MA_BIEU_MAU);
  const maLoaiDanhMuc = timSau(van, RE_MA_LOAI_DM);

  const cotDb = [];
  for (const m of van.matchAll(RE_COT_DB)) {
    // Nằm trong một mã có gạch nối (`36-GDTHS.TC01-2026`) thì không phải BẢNG.CỘT
    if (van[m.index - 1] === '-' || van[m.index + m[0].length] === '-') continue;
    // ba phần = SCHEMA.BẢNG.CỘT; hai phần = BẢNG.CỘT, trừ khi phần đầu là schema (→ không có cột)
    const bang = m[3] ? m[2] : m[1];
    const cot = m[3] || m[2];
    if (!m[3] && SCHEMA.test(m[1])) continue;
    if (COT_KY_THUAT.test(cot)) continue;
    const khoa = `${bang}.${cot}`;
    if (!cotDb.includes(khoa)) cotDb.push(khoa);
  }

  const laCongThuc = !!c.congThuc || manHinh.includes('CONG_THUC');

  const manh = [];
  if (laCongThuc) manh.push({ kieu: 'CONG_THUC', chiTiet: c.congThuc || '(màn hình ghi "công thức")' });
  for (const ma of maBieuMau) manh.push({ kieu: 'BIEU_MAU', chiTiet: ma });
  for (const ma of maLoaiDanhMuc) manh.push({ kieu: 'DANH_MUC', chiTiet: ma });
  for (const k of cotDb) manh.push({ kieu: 'TRUONG', chiTiet: k });

  // Loại CHÍNH: công thức > biểu mẫu > danh mục > trường > chưa rõ
  const loai = laCongThuc
    ? 'CONG_THUC'
    : maBieuMau.length
      ? 'BIEU_MAU'
      : maLoaiDanhMuc.length
        ? 'DANH_MUC'
        : cotDb.length
          ? 'TRUONG'
          : 'CHUA_RO';

  return {
    loai,
    manHinh,
    maBieuMau,
    maLoaiDanhMuc,
    cotDb,
    manh,
    // Lý do không kiểm được: để báo cáo nói thật thay vì bỏ qua im lặng
    lyDoChuaRo:
      loai === 'CHUA_RO'
        ? !van.trim()
          ? 'mapping để trống cả Trường/Bộ lọc/Mô tả'
          : 'mapping chỉ có diễn giải, không chốt mã biểu mẫu / danh mục / cột DB nào'
        : '',
  };
}

module.exports = { phanLoaiCot, giaiMaManHinh, tachMa, VIET_TAT_MAN };
