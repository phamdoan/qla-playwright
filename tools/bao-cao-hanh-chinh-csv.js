#!/usr/bin/env node
/**
 * Sinh file CSV báo cáo tiến độ luồng hành chính sơ thẩm → phúc thẩm từ sổ cái
 * seed-output/hanh-chinh-so-tham.<env>.json.
 *
 *   node tools/bao-cao-hanh-chinh-csv.js            → seed-output/bao-cao-hanh-chinh-<env>.csv
 *
 * Cột "Bước hiện tại" là bước CUỐI CÙNG đã xong theo đúng trình tự nghiệp vụ (không phải bước ghi
 * sau cùng vào sổ), và "Bước tiếp theo" là bước gần nhất còn thiếu — để biết chạy tiếp từ đâu.
 */
const fs = require('fs');
const path = require('path');

const MOI_TRUONG = process.env.QLA_ENV || 'stg';
const FILE_SO_CAI = path.resolve(__dirname, `../seed-output/hanh-chinh-so-tham.${MOI_TRUONG}.json`);
const FILE_RA = path.resolve(__dirname, `../seed-output/bao-cao-hanh-chinh-${MOI_TRUONG}.csv`);

/** Trình tự nghiệp vụ: [khoá bước trong sổ cái, tên hiển thị, mã test] */
const TRINH_TU = [
  ['nhapDon', 'Nhập đơn khởi kiện', 'B4–B9'],
  ['phanCong', 'Phân công Thẩm phán xử lý đơn', 'S2'],
  ['thuLy', 'Thụ lý vụ án', 'S3'],
  ['phanCongVuAn', 'Phân công Thẩm phán chủ tọa', 'S6'],
  ['kyQuyetDinhXetXu', 'Ký QĐ đưa ra xét xử (16-HC)', 'S7'],
  ['bienBanPhienToa', 'Biên bản phiên tòa (20-HC)', 'S8'],
  ['bienBanNghiAn', 'Biên bản nghị án (21-HC)', 'S9'],
  ['banAn', 'Bản án sơ thẩm (22-HC)', 'S10'],
  ['khangCao', 'Đơn kháng cáo (24-HC) + giấy xác nhận (25-HC)', 'S11'],
  ['thongBaoKhangCao', 'Thông báo về việc kháng cáo (32-HC)', 'S11b'],
  ['chuyenPhucTham', 'Chuyển hồ sơ lên phúc thẩm', 'S12'],
  ['tiepNhanPhucTham', 'Tiếp nhận hồ sơ ở cấp phúc thẩm', 'PT1'],
  ['thuLyPhucTham', 'Thụ lý phúc thẩm', 'PT2'],
  ['phanCongPhucTham', 'Phân công Thẩm phán chủ tọa PT (186-HC)', 'PT3'],
  ['kyQuyetDinhXetXuPhucTham', 'Ký QĐ đưa ra xét xử PT (36-HC)', 'PT4'],
  ['bienBanPhucTham', 'Biên bản phúc thẩm', 'PT5'],
  ['banAnPhucTham', 'Bản án phúc thẩm', 'PT6'],
];

const oCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const soCai = JSON.parse(fs.readFileSync(FILE_SO_CAI, 'utf8'));
const dsKhoa = Object.keys(soCai).sort(
  (a, b) => Number(a.replace('dong-', '')) - Number(b.replace('dong-', '')),
);

const COT = [
  'Dòng Excel',
  'Mã vụ án sơ thẩm',
  'Số thụ lý ST',
  'Số bản án ST',
  'Ngày bản án ST',
  'Tòa ra quyết định bản án ST',
  'Số tiếp nhận kháng cáo',
  'Mã vụ án phúc thẩm',
  'Số bản án PT',
  'Ngày bản án PT',
  'Tòa ra quyết định bản án PT',
  'Số bước đã xong',
  'Bước hiện tại',
  'Bước tiếp theo',
  'Trạng thái',
  'Link vụ án sơ thẩm',
  'Link vụ án phúc thẩm',
  'Cập nhật lúc',
];

const GOC = 'https://qla-stg.toaan.gov.vn/qla';
const dong = [COT.map(oCsv).join(',')];

for (const khoa of dsKhoa) {
  const v = soCai[khoa];
  const xong = new Set(v.daXong || []);
  const chiSoChuaXong = TRINH_TU.findIndex(([ma]) => !xong.has(ma));
  const hetSach = chiSoChuaXong === -1;
  const buocHienTai = hetSach
    ? TRINH_TU[TRINH_TU.length - 1]
    : chiSoChuaXong === 0
      ? null
      : TRINH_TU[chiSoChuaXong - 1];
  const buocTiepTheo = hetSach ? null : TRINH_TU[chiSoChuaXong];

  // Vụ không ra bản án sơ thẩm thì cả nhánh phúc thẩm không áp dụng, không tính là "đang dở"
  const khongCoBanAn = !xong.has('banAn') && xong.has('phanCongVuAn') && !v.soBanAn;
  const trangThai = hetSach
    ? 'Xong sơ thẩm + phúc thẩm'
    : khongCoBanAn
      ? 'Không ra bản án sơ thẩm (đình chỉ/chuyển hồ sơ) — không có phúc thẩm'
      : `Đang dở, chờ ${buocTiepTheo[2]}`;

  dong.push(
    [
      khoa.replace('dong-', ''),
      v.maVuAn || '',
      v.soTiepNhan || '',
      // Ưu tiên giá trị lấy từ DB: bộ ba số + ngày + tòa ra bản án là khoá tìm đơn ở luồng GĐT/TT,
      // còn số đọc từ form có thể đã ghép hậu tố "/năm" nên tìm kiếm không khớp.
      v.soBanAnDb || v.soBanAn || '',
      v.ngayBanAnDb || v.ngayBanAn || '',
      v.toaRaBanAn || '',
      v.soTiepNhanKhangCao || '',
      v.maVuAnPt || '',
      v.soBanAnPt || '',
      v.ngayBanAnPt || '',
      v.toaRaBanAnPt || '',
      `${xong.size}/${TRINH_TU.length}`,
      buocHienTai ? `${buocHienTai[2]} · ${buocHienTai[1]}` : '(chưa bắt đầu)',
      buocTiepTheo ? `${buocTiepTheo[2]} · ${buocTiepTheo[1]}` : '',
      trangThai,
      v.idVuAn ? `${GOC}/vu-an/hanh-chinh/so-tham/chi-tiet?id=${v.idVuAn}` : '',
      v.idVuAnPt ? `${GOC}/vu-an/hanh-chinh/phuc-tham/chi-tiet?id=${v.idVuAnPt}` : '',
      v.luc ? new Date(v.luc).toLocaleString('vi-VN') : '',
    ]
      .map(oCsv)
      .join(','),
  );
}

// BOM để Excel mở đúng tiếng Việt
fs.writeFileSync(FILE_RA, '﻿' + dong.join('\n') + '\n', 'utf8');
console.log(`Đã ghi ${dsKhoa.length} dòng vào ${FILE_RA}`);
