/**
 * Bóc `Mapping_<mã>.xlsx` (tài liệu BA) → JSON/TSV: mỗi dòng = MỘT CỘT của biểu mẫu báo cáo.
 *
 *   node tools/bctk/boc-mapping.js "<thư mục Mapping Data>" 2A 2B 4A 4B 4C 4D
 *   node tools/bctk/boc-mapping.js "<thư mục>" --tat-ca          # cả 81 biểu mẫu
 *
 * Ra: tools/bctk/mapping/<mã>.json  +  tools/bctk/mapping/<mã>.tsv
 *
 * KHÔNG chép xlsx vào repo (repo public — xem bctk/README.md). Chỉ bản bóc.
 *
 * Vì sao phải bóc: mapping là nguồn duy nhất nói "ô số N của biểu mẫu lấy từ bảng/trường/điều kiện
 * nào". UT trên màn hình cần nó để biết mỗi ô PHẢI có dữ liệu gì, và cột nào chỉ là phép cộng
 * (`Cột 6 = Cột 2 + Cột 3 - …`) nên kiểm được ngay trên màn, không cần tra nguồn.
 *
 * SQL trong các cột `truong` / `boLoc` là THAM CHIẾU để hiểu nghiệp vụ. Không dùng để chạy.
 */
const fs = require('fs');
const path = require('path');
const { docWorkbook, SO_COT } = require('./doc-xlsx-lib');

const THU_MUC_RA = path.join(__dirname, 'mapping');

/** Tiêu đề cột trong sheet mapping không thống nhất giữa các nhóm án → khớp bằng regex. */
/** Tiêu đề cột "số thứ tự cột báo cáo": 2A dùng "CỘT", 2B/4C "Cột", 4A/4B "STT", nhóm khác "Cột BC". */
const RE_SO_COT = /^(c[ộo]t\s*bc|c[ộo]t|stt)$/i;

const COT_CHUAN = [
  ['soCot', RE_SO_COT],
  ['tenCot', /^t[êe]n\s*c[ộo]t\s*b[áa]o\s*c[áa]o$/i],
  // Cột quan trọng nhất cho UT trên màn: BA ghi màn hình/mockup nào sinh ra số của ô này
  ['manHinh', /(mockup|m[àa]n\s*h[ìi]nh)/i],
  ['truongThongTin', /tr[ưu][ờo]ng\s*th[ôo]ng\s*tin$/i],
  ['yKienVanPhongPopup', /(v[ăa]n\s*ph[òo]ng.*popup|[ýy]\s*ki[êe]n.*popup)/i],
  ['yKienVanPhong', /^([ýy]\s*ki[êe]n\s*c[ủu]a\s*)?v[ăa]n\s*ph[òo]ng$/i],
  ['bangChinh', /^b[ảa]ng\s*(d[ữu]\s*li[ệe]u\s*)?ch[íi]nh$/i],
  ['truong', /^tr[ưu][ờo]ng\s*\/\s*(c[ộo]t\s*c[ầa]n\s*l[ấa]y|ph[ée]p\s*t[íi]nh)$/i],
  ['boLocMoi', /^b[ộo]\s*l[ọo]c\s*b[ổo]\s*sung\s*\(new\)$/i],
  ['boLoc', /^b[ộo]\s*l[ọo]c\s*(\/\s*[đd]i[ềe]u\s*ki[ệe]n|b[ổo]\s*sung)$/i],
  ['moTa', /^(m[ôo]\s*t[ảa]\s*)?nghi[ệe]p\s*v[ụu]\s*d[ữu]\s*li[ệe]u$/i],
  ['trangThai', /^tr[ạa]ng\s*th[áa]i/i],
  ['huongDan', /^h[ưu][ớo]ng\s*d[ẫa]n$/i],
  ['coTaiLieu', /^(c[óo]\s*)?t[àa]i\s*li[ệe]u\s*\?$/i],
  ['coDb', /^(c[óo]\s*)?db\s*\?$/i],
  ['coHeThong', /^(c[óo]\s*)?h[ệe]\s*th[ốo]ng\s*\?$/i],
  ['moTaPopup', /^m[ôo]\s*t[ảa]\s*popup$/i],
  ['viDuPopup', /^v[íi]\s*d[ụu]\s*popup$/i],
  ['thacMac', /^(th[ắa]c\s*m[ắa]c|c[âa]u\s*h[ỏo]i)$/i],
  ['toChuyenGiaTraLoi', /^t[ổo]\s*chuy[êe]n\s*gia\s*tr[ảa]\s*l[ờo]i$/i],
];

/** Cột tên biểu mẫu trải qua nhiều mức (B=nhóm, C=nhóm con, D/E=ô lá) do tiêu đề bị trộn ô. */
function ghepTenCot(hang, cotDau, cotKeTiep) {
  const tu = SO_COT(cotDau);
  const den = cotKeTiep ? SO_COT(cotKeTiep) : tu + 1;
  const phan = [];
  for (const [cot, gt] of hang) {
    const n = SO_COT(cot);
    if (n >= tu && n < den) phan.push([n, gt]);
  }
  return phan
    .sort((a, b) => a[0] - b[0])
    .map(p => p[1])
    .join(' · ');
}

/** `Cột 6 = Cột 2 + Cột 3 - Cột 4 - Cột 5` ở bất kỳ ô mô tả nào → trích ra phép tính. */
function timCongThuc(...oMoTa) {
  for (const o of oMoTa) {
    if (!o) continue;
    const m = o.match(/C[ộo]t\s*\d+\s*=\s*[^.;]*?C[ộo]t\s*\d+[^.;]*/i);
    if (m) return m[0].replace(/\s+/g, ' ').trim();
  }
  return '';
}

function timSheetMapping(sheets, ma) {
  const uuTien = sheets.filter(s => /mapping/i.test(s.ten));
  for (const s of [...uuTien, ...sheets]) {
    for (const [, hang] of s.luoi) {
      for (const gt of hang.values()) {
        if (RE_SO_COT.test(gt)) return s;
      }
    }
  }
  throw new Error(`${ma}: không thấy sheet mapping (không có dòng tiêu đề "Cột BC"/"CỘT")`);
}

function bocMotTep(tep, ma) {
  const sheets = docWorkbook(tep);
  const sheet = timSheetMapping(sheets, ma);

  // 1 · dòng tiêu đề + bản đồ cột
  let dongTieuDe = 0;
  let banDo = null;
  for (const [dong, hang] of [...sheet.luoi].sort((a, b) => a[0] - b[0])) {
    const coSoCot = [...hang.values()].some(v => RE_SO_COT.test(v));
    if (!coSoCot) continue;
    banDo = {};
    for (const [cot, gt] of hang) {
      for (const [khoa, re] of COT_CHUAN) {
        if (re.test(gt) && !banDo[khoa]) {
          banDo[khoa] = cot;
          break;
        }
      }
    }
    dongTieuDe = dong;
    break;
  }
  if (!banDo || !banDo.soCot) throw new Error(`${ma}: không dựng được bản đồ cột`);

  // 2 · "Bộ lọc chung" nằm ở các dòng trên tiêu đề
  let boLocChung = '';
  for (const [dong, hang] of sheet.luoi) {
    if (dong >= dongTieuDe) continue;
    for (const gt of hang.values()) {
      // 4A ghi "•Bộ lọc chung:", 4C ghi "* Bộ lọc chung:" → cho phép dấu đầu dòng đứng trước
      if (/^[•*\-\s]*b[ộo]\s*l[ọo]c\s*chung/i.test(gt) && gt.length > boLocChung.length) boLocChung = gt;
    }
  }

  // 3 · cột kế tiếp sau `tenCot` để biết tên biểu mẫu trải tới đâu
  const cotCoNhan = Object.entries(banDo)
    .map(([khoa, cot]) => ({ khoa, cot, n: SO_COT(cot) }))
    .sort((a, b) => a.n - b.n);
  const viTriTen = cotCoNhan.findIndex(c => c.khoa === 'tenCot');
  const cotSauTen = viTriTen >= 0 ? cotCoNhan[viTriTen + 1]?.cot : undefined;

  // 4 · từng dòng dữ liệu. Một cột báo cáo có thể trải NHIỀU dòng Excel: dòng đầu mang số cột,
  //     các dòng sau không có số (ô bị trộn) và chứa mức con / lý do / bộ lọc riêng → gom vào `dongPhu`.
  const dsCot = [];
  const docDong = hang => {
    const lay = khoa => (banDo[khoa] ? hang.get(banDo[khoa]) || '' : '');
    return {
      tenCot: banDo.tenCot ? ghepTenCot(hang, banDo.tenCot, cotSauTen) : '',
      manHinh: lay('manHinh'),
      bangChinh: lay('bangChinh'),
      truong: lay('truong'),
      boLoc: [lay('boLoc'), lay('boLocMoi')].filter(Boolean).join(' ⟶ (new) '),
      moTa: lay('moTa'),
      huongDan: lay('huongDan'),
      trangThai: lay('trangThai'),
      coTaiLieu: lay('coTaiLieu'),
      coDb: lay('coDb'),
      coHeThong: lay('coHeThong'),
      moTaPopup: lay('moTaPopup'),
      thacMac: lay('thacMac'),
    };
  };

  for (const [dong, hang] of [...sheet.luoi].sort((a, b) => a[0] - b[0])) {
    if (dong <= dongTieuDe) continue;
    const oSoCot = hang.get(banDo.soCot);
    const so = oSoCot === undefined ? NaN : Number(String(oSoCot).replace(',', '.'));

    if (!Number.isFinite(so) || so <= 0) {
      // dòng phụ của cột đang mở: chỉ nhận khi có nội dung nghiệp vụ
      const phu = docDong(hang);
      const coNoiDung = [phu.tenCot, phu.boLoc, phu.moTa, phu.truong, phu.bangChinh].some(Boolean);
      if (dsCot.length && coNoiDung) dsCot[dsCot.length - 1].dongPhu.push({ ...phu, dongExcel: dong });
      continue;
    }

    const o = docDong(hang);
    const congThuc = timCongThuc(o.moTa, o.boLoc, o.truong, o.huongDan);
    dsCot.push({
      soCot: Math.round(so),
      ...o,
      congThuc,
      // cột phép tính: không có bảng nguồn mà có công thức → kiểm được NGAY TRÊN MÀN, không cần tra nguồn
      laCotTinh: !!congThuc && !o.bangChinh,
      dongExcel: dong,
      dongPhu: [],
    });
  }

  return {
    ma,
    tepNguon: path.basename(tep),
    sheetMapping: sheet.ten,
    dongTieuDe,
    boLocChung,
    soCot: dsCot.length,
    cot: dsCot,
  };
}

const COT_TSV = [
  'soCot',
  'tenCot',
  'manHinh',
  'bangChinh',
  'truong',
  'boLoc',
  'moTa',
  'congThuc',
  'laCotTinh',
  'trangThai',
  'coTaiLieu',
  'coDb',
  'coHeThong',
];

function ghiRa(kq) {
  fs.mkdirSync(THU_MUC_RA, { recursive: true });
  fs.writeFileSync(path.join(THU_MUC_RA, `${kq.ma}.json`), JSON.stringify(kq, null, 2) + '\n', 'utf8');
  const dong = [COT_TSV.join('\t')];
  for (const c of kq.cot) {
    dong.push(COT_TSV.map(k => String(c[k] ?? '').replace(/[\t\r\n]+/g, ' ')).join('\t'));
  }
  fs.writeFileSync(path.join(THU_MUC_RA, `${kq.ma}.tsv`), dong.join('\n') + '\n', 'utf8');
}

function timTep(goc, ma) {
  const dsTep = [];
  const di = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name.toLowerCase() === 'old') continue; // bản cũ: bỏ
        di(p);
      } else if (/\.xlsx$/i.test(e.name) && !/^~\$/.test(e.name)) dsTep.push(p);
    }
  };
  di(goc);
  const re = new RegExp(`mapping[ _]*${ma}(_updated)?(\\s*\\(\\d+\\))?\\.xlsx$`, 'i');
  const khop = dsTep.filter(p => re.test(path.basename(p)));
  if (!khop.length) throw new Error(`không thấy tệp mapping cho ${ma} trong ${goc}`);
  // Ưu tiên bản `_updated`, rồi tên ngắn nhất (tránh "Bản sao của …")
  khop.sort((a, b) => {
    const u = x => (/_updated/i.test(x) ? 0 : 1);
    return u(a) - u(b) || path.basename(a).length - path.basename(b).length;
  });
  return khop[0];
}

function main() {
  const [goc, ...dsMa] = process.argv.slice(2);
  if (!goc) {
    console.error('Dùng: node tools/bctk/boc-mapping.js "<thư mục Mapping Data>" 2A 2B 4A …');
    process.exit(2);
  }
  let ma = dsMa;
  if (!ma.length || ma[0] === '--tat-ca') {
    const { DANH_MUC_80_BAO_CAO } = require('../../bctk/danh-muc-80-bao-cao.ts');
    ma = DANH_MUC_80_BAO_CAO.map(b => b.ma);
  }

  const tomTat = [];
  for (const m of ma) {
    try {
      const tep = timTep(goc, m);
      const kq = bocMotTep(tep, m);
      ghiRa(kq);
      tomTat.push(kq);
      const tinh = kq.cot.filter(c => c.laCotTinh).length;
      const coNguon = kq.cot.filter(c => c.bangChinh).length;
      console.log(
        `${m.padEnd(4)} ${String(kq.soCot).padStart(3)} cột · ${String(tinh).padStart(3)} cột phép tính · ` +
          `${String(coNguon).padStart(3)} cột có bảng nguồn · sheet "${kq.sheetMapping}" · ${path.basename(tep)}`,
      );
    } catch (e) {
      console.log(`${m.padEnd(4)} LỖI: ${e.message}`);
    }
  }
  console.log(`\nĐã ghi ${tomTat.length} biểu mẫu vào ${path.relative(process.cwd(), THU_MUC_RA)}`);
}

if (require.main === module) main();
module.exports = { bocMotTep, timTep };
