/**
 * TÊN NGƯỜI VIỆT cho dữ liệu gieo — TẤT ĐỊNH theo mã case.
 *
 * Vì sao có file này: bản trước ghép nhãn case bằng chữ cái ("Trần Kinh Doanh Aab") để né luật
 * của FE cấm chữ số trong họ tên. Đọc trên lưới thì biết ngay của case nào, nhưng "Aab" không
 * phải tiếng Việt — dữ liệu kiểm thử nhìn giả và không dùng để demo được.
 *
 * Cách làm ở đây: mỗi case sinh ra một họ tên NGƯỜI VIỆT THẬT, lấy từ danh sách họ · tên đệm ·
 * tên dưới đây, chọn bằng băm FNV-1a của (mã case + vai). Cùng mã case thì luôn ra cùng một tên,
 * nên chạy lại vẫn tìm đúng dòng trên lưới; case khác nhau thì gần như chắc chắn khác tên.
 *
 * Danh sách phỏng theo bộ tên tiếng Việt thông dụng (tham khảo github.com/duyet/vietnamese-namedb),
 * viết gọn lại ngay trong repo để không phụ thuộc mạng và không kéo theo dữ liệu ngoài.
 *
 * Luật họ tên của FE (`qla-webapp` · FormDuongSu…): chỉ CHỮ, DẤU, KHOẢNG TRẮNG và dấu nháy đơn,
 * tối đa 100 ký tự — mọi tên sinh ra ở đây đều thoả.
 */

/** 30 họ phổ biến nhất */
const HO = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
  'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Tô', 'Trương', 'Lưu',
  'Mai', 'Cao', 'Thái', 'Đoàn', 'Tạ', 'Lâm', 'Chu', 'Hà', 'Vương', 'Phùng',
];

const DEM_NAM = ['Văn', 'Hữu', 'Đức', 'Quang', 'Minh', 'Xuân', 'Công', 'Thành', 'Bá', 'Tuấn'];
const DEM_NU = ['Thị', 'Thu', 'Ngọc', 'Thanh', 'Kim', 'Hồng', 'Mai', 'Diệu', 'Phương', 'Bích'];

const TEN_NAM = [
  'An', 'Bình', 'Cường', 'Dũng', 'Đạt', 'Giang', 'Hải', 'Hùng', 'Khang', 'Khoa',
  'Lâm', 'Long', 'Minh', 'Nam', 'Nghĩa', 'Phong', 'Phúc', 'Quân', 'Quyết', 'Sơn',
  'Tài', 'Thắng', 'Thịnh', 'Tiến', 'Toàn', 'Trung', 'Tuấn', 'Vinh', 'Vũ', 'Ý',
];

const TEN_NU = [
  'Anh', 'Bích', 'Chi', 'Dung', 'Duyên', 'Giang', 'Hà', 'Hạnh', 'Hoa', 'Huệ',
  'Hương', 'Lan', 'Linh', 'Loan', 'Mai', 'My', 'Nga', 'Ngân', 'Nhung', 'Oanh',
  'Phương', 'Quỳnh', 'Thảo', 'Thu', 'Thuỳ', 'Trang', 'Trinh', 'Tuyết', 'Vân', 'Yến',
];

/** FNV-1a 32 bit — cùng hàm băm đang dùng ở `so-tat-dinh.ts`, để mọi thứ tất định theo một kiểu */
function bam(chuoi: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < chuoi.length; i++) {
    h ^= chuoi.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export type GioiTinh = 'nam' | 'nu';

/**
 * Họ tên người Việt tất định.
 *
 * @param hat  mã case (hoặc bất cứ chuỗi gốc nào) — cùng `hat` + `vai` luôn ra cùng một tên
 * @param vai  phân biệt nhiều người trong một case: 'nguyenDon', 'biDon', 'nguoiLamChung'…
 *
 *   hoTenViet('case-001', 'nguyenDon') → 'Đặng Hữu Thịnh'
 *
 * Ba thành phần lấy từ ba lát cắt khác nhau của số băm nên đổi một chữ trong `vai` là ra tên khác
 * hẳn, không bị kiểu "cùng họ, chỉ khác tên".
 */
export function hoTenViet(hat: string, vai: string, gioiTinh: GioiTinh = 'nam'): string {
  const h = bam(`${hat}|${vai}`);
  const dem = gioiTinh === 'nu' ? DEM_NU : DEM_NAM;
  const ten = gioiTinh === 'nu' ? TEN_NU : TEN_NAM;
  return [
    HO[h % HO.length],
    dem[(h >>> 8) % dem.length],
    ten[(h >>> 16) % ten.length],
  ].join(' ');
}

/** Kiểm một chuỗi có hợp luật họ tên của FE không — chặn sớm ngay trong dữ liệu gieo */
export function hopLeHoTen(ten: string): boolean {
  return /^[\p{L}\p{M}\s']{1,100}$/u.test(ten);
}

/** Họ tên đương sự cho một case, có kiểm luật của FE ngay khi gieo */
export function tenDuongSu(hat: string, vai: string, gioiTinh: GioiTinh = 'nam'): string {
  const ten = hoTenViet(hat, vai, gioiTinh);
  if (!hopLeHoTen(ten)) {
    throw new Error(
      `Tên "${ten}" vi phạm luật họ tên của FE (chỉ chữ, dấu, khoảng trắng, dấu nháy; tối đa 100 ký tự).`,
    );
  }
  return ten;
}
