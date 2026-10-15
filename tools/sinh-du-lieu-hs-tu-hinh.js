/**
 * Sinh bộ dữ liệu 30 vụ án hình sự có hình phạt TỬ HÌNH cho môi trường đào tạo, đúng khuôn file
 * data-test-hinh-su.xlsx mà spec sơ thẩm hình sự đọc (common/du-lieu-hinh-su.ts):
 *   sheet "03_MASTER_VU_AN" (một dòng một vụ) + "04_MASTER_BI_CAO" (một dòng một bị cáo).
 * Mỗi vụ một bị cáo đầu vụ, tuổi trưởng thành (FE lọc bỏ "Tử hình" với bị cáo dưới 18 tuổi —
 * qla-webapp/.../QuyetDinhHinhPhatModal.tsx:171-179).
 * Tội danh có khung tử hình: Giết người (Điều 123 khoản 1), Mua bán trái phép chất ma túy (Điều 251 khoản 4).
 *
 *   QLA_EXCELJS=<đường dẫn exceljs> node tools/sinh-du-lieu-hs-tu-hinh.js [ra.xlsx]
 * Mặc định ra data/data-hinh-su-tu-hinh-daotao.xlsx (không commit — repo public, dữ liệu .xlsx bị bỏ qua).
 */
const path = require('path');
const ExcelJS = require(process.env.QLA_EXCELJS || 'exceljs');

const RA = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data', 'data-hinh-su-tu-hinh-daotao.xlsx'));

// Họ tên bị cáo: tên người Việt thông dụng, không trùng nhau, không trùng người thật nổi tiếng
const BI_CAO = [
  ['Lường Văn Thắm', 'Nam', 1984, 'Thái', 'Lao động tự do'],
  ['Vàng A Sùng', 'Nam', 1990, 'Mông', 'Làm nông'],
  ['Phạm Đức Toàn', 'Nam', 1979, 'Kinh', 'Lái xe'],
  ['Hoàng Văn Quyết', 'Nam', 1988, 'Tày', 'Không nghề nghiệp'],
  ['Nguyễn Thị Hồng Nhung', 'Nữ', 1986, 'Kinh', 'Kinh doanh tự do'],
  ['Trần Minh Khôi', 'Nam', 1992, 'Kinh', 'Lao động tự do'],
  ['Lò Văn Pánh', 'Nam', 1983, 'Thái', 'Làm nông'],
  ['Đỗ Quang Huy', 'Nam', 1995, 'Kinh', 'Không nghề nghiệp'],
  ['Vũ Văn Hưng', 'Nam', 1977, 'Kinh', 'Thợ xây'],
  ['Giàng A Páo', 'Nam', 1987, 'Mông', 'Làm nông'],
  ['Bùi Thanh Tùng', 'Nam', 1991, 'Mường', 'Lao động tự do'],
  ['Lê Văn Cường', 'Nam', 1981, 'Kinh', 'Buôn bán'],
  ['Đinh Thị Thu Trang', 'Nữ', 1989, 'Kinh', 'Kinh doanh tự do'],
  ['Ngô Văn Lực', 'Nam', 1985, 'Kinh', 'Lái xe'],
  ['Hà Văn Tiến', 'Nam', 1993, 'Tày', 'Lao động tự do'],
  ['Phan Thanh Sơn', 'Nam', 1980, 'Kinh', 'Không nghề nghiệp'],
  ['Mùa A Dế', 'Nam', 1994, 'Mông', 'Làm nông'],
  ['Trịnh Văn Mạnh', 'Nam', 1976, 'Kinh', 'Thợ cơ khí'],
  ['Lương Văn Đạt', 'Nam', 1990, 'Nùng', 'Lao động tự do'],
  ['Nguyễn Văn Thành', 'Nam', 1982, 'Kinh', 'Buôn bán'],
  ['Cao Văn Bình', 'Nam', 1988, 'Kinh', 'Không nghề nghiệp'],
  ['Tống Thị Mai', 'Nữ', 1984, 'Kinh', 'Buôn bán'],
  ['Quàng Văn Inh', 'Nam', 1986, 'Thái', 'Làm nông'],
  ['Dương Văn Khải', 'Nam', 1978, 'Kinh', 'Lái xe'],
  ['Lý Văn Phúc', 'Nam', 1992, 'Dao', 'Làm nông'],
  ['Hồ Đức Nghĩa', 'Nam', 1983, 'Kinh', 'Lao động tự do'],
  ['Thào A Chư', 'Nam', 1991, 'Mông', 'Làm nông'],
  ['Mai Văn Tâm', 'Nam', 1980, 'Kinh', 'Thợ xây'],
  ['Kiều Văn Hải', 'Nam', 1987, 'Kinh', 'Không nghề nghiệp'],
  ['Triệu Văn Sinh', 'Nam', 1989, 'Dao', 'Lao động tự do'],
];

// Xen kẽ hai tội có khung tử hình; nhân thân ghi theo mã spec hiểu (du-lieu-hinh-su.ts: tachDacDiem)
const TOI = [
  { ten: 'Tội giết người', dieu: 'Điều 123', khoan: 'khoản 1', nhom: 'Tội phạm khác', dacDiem: 'Áp dụng biện pháp tạm giam' },
  {
    ten: 'Tội mua bán trái phép chất ma túy',
    dieu: 'Điều 251',
    khoan: 'khoản 4',
    nhom: 'Tội phạm về ma túy',
    dacDiem: 'Áp dụng biện pháp tạm giam',
  },
];

const dd = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

(async () => {
  const wb = new ExcelJS.Workbook();
  const vu = wb.addWorksheet('03_MASTER_VU_AN');
  vu.addRow(['Mã vụ án', 'Trạng thái sơ thẩm', 'Tên vụ án', 'Tòa án', 'Tội danh', 'Điều luật', 'Nhóm tội phạm', 'Ngày thụ lý ST',
    'Bộ luật', 'Kết quả sơ thẩm', 'Ngày kết quả', 'Đặc điểm vụ án', 'Địa bàn', 'Ghi chú']);
  const bc = wb.addWorksheet('04_MASTER_BI_CAO');
  bc.addRow(['ID bị cáo', 'ID vụ án', 'Họ và tên', 'Giới tính', 'Năm sinh', 'Dân tộc', 'Quốc tịch', 'Nghề nghiệp', 'Đặc điểm nhân thân',
    'Tội danh VKS truy tố', 'Tội danh Tòa án xét xử', 'Khoản', 'Điểm', 'Hình phạt chính ST', 'Mức hình phạt', 'Hình phạt bổ sung', 'Ghi chú']);

  // Kháng cáo / bản án phúc thẩm (common/du-lieu-phuc-tham-hs.ts đọc theo tên cột)
  const kc = wb.addWorksheet('07_KHANG_CAO_KHANG_NGHI_PT');
  kc.addRow(['Mã', 'ID vụ án', 'Trạng thái', 'Mã vụ án thực tế ( phúc thẩm )', 'Loại', 'Chủ thể', 'Ngày Kháng cáo/ Kháng nghị', 'Nội dung', 'Ghi chú']);
  const pt = wb.addWorksheet('08_BAN_AN_PHUC_THAM');
  pt.addRow(['ID bản án PT', 'ID vụ án', 'Tòa án phúc thẩm', 'Số thụ lý PT', 'Ngày thụ lý PT', 'Số bản án PT', 'Ngày bản án PT', 'Kết quả', 'Đặc điểm', 'Ghi chú']);

  BI_CAO.forEach(([hoTen, gioiTinh, namSinh, danToc, ngheNghiep], i) => {
    const ma = `TH${String(i + 1).padStart(2, '0')}`;
    const toi = TOI[i % 2];
    // Thụ lý ST rải 01/07–29/07/2026, xét xử sơ thẩm sau thụ lý 35 ngày (tránh Chủ nhật do spec tự lùi)
    const thuLy = new Date(2026, 6, 1 + i);
    const ketQua = new Date(thuLy);
    ketQua.setDate(ketQua.getDate() + 35);
    vu.addRow([ma, '', `${hoTen} - ${toi.ten}`, 'Tòa án TP Hà Nội', toi.ten, toi.dieu, toi.nhom, dd(thuLy), 'Bộ luật hình sự 2025',
      'XET_XU', dd(ketQua), toi.dacDiem, i % 3 === 0 ? 'Nông thôn' : 'Thành thị',
      'Bộ đào tạo 15/10/2026: án tử hình, bị cáo kháng cáo xin giảm hình phạt; phúc thẩm giữ nguyên']);
    bc.addRow([`BTH${String(i + 1).padStart(2, '0')}`, ma, hoTen, gioiTinh, namSinh, danToc, 'Việt Nam', ngheNghiep,
      i % 4 === 0 ? 'tai_pham' : '', toi.ten, toi.ten, toi.khoan, '', 'Tử hình', 'Tử hình', '', 'Bị cáo đầu vụ; kháng cáo xin giảm hình phạt']);
    // Kháng cáo trong hạn 15 ngày kể từ ngày tuyên án (Điều 333 BLTTHS): nộp sau 7 ngày
    const ngayKc = new Date(ketQua);
    ngayKc.setDate(ngayKc.getDate() + 7);
    kc.addRow([`KC${String(i + 1).padStart(2, '0')}`, ma, '', '', 'Kháng cáo', `Bị cáo ${hoTen}`, dd(ngayKc),
      `Bị cáo ${hoTen} kháng cáo xin giảm hình phạt, cho rằng mức án tử hình là quá nghiêm khắc; bị cáo đã thành khẩn khai báo, ăn năn hối cải.`,
      'Kháng cáo xin giảm hình phạt']);
    // Phúc thẩm giữ nguyên: thụ lý PT sau kháng cáo 15 ngày, xét xử PT sau thụ lý ~20 ngày (≤ 15/10/2026)
    const thuLyPt = new Date(ngayKc);
    thuLyPt.setDate(thuLyPt.getDate() + 15);
    const banAnPt = new Date(thuLyPt);
    banAnPt.setDate(banAnPt.getDate() + 20);
    pt.addRow([`PT${String(i + 1).padStart(2, '0')}`, ma, 'Tòa án nhân dân thành phố Hà Nội', '', dd(thuLyPt), '', dd(banAnPt),
      'Giữ nguyên bản án sơ thẩm', 'Không chấp nhận kháng cáo', 'Y án tử hình']);
  });
  await wb.xlsx.writeFile(RA);
  console.log(`Đã ghi ${BI_CAO.length} vụ → ${RA}`);
})();
