/** Sinh dữ liệu giả nhưng đúng định dạng thật (tên, CCCD, SĐT, ngày) cho các form QLA */

const chon = <T>(ds: readonly T[]) => ds[Math.floor(Math.random() * ds.length)];
const soNgauNhien = (doDai: number) => Array.from({ length: doDai }, () => Math.floor(Math.random() * 10)).join('');

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô'] as const;
const DEM_NAM = ['Văn', 'Đức', 'Minh', 'Quang', 'Hữu', 'Thành'] as const;
const DEM_NU = ['Thị', 'Thu', 'Ngọc', 'Thanh', 'Mai', 'Hồng'] as const;
const TEN_NAM = ['Hùng', 'Dũng', 'Tuấn', 'Nam', 'Long', 'Sơn', 'Phong', 'Khang'] as const;
const TEN_NU = ['Lan', 'Hương', 'Hạnh', 'Trang', 'Linh', 'Hoa', 'Nga', 'Yến'] as const;
const DUONG = ['Láng Hạ', 'Kim Mã', 'Tràng Thi', 'Hoàng Quốc Việt', 'Nguyễn Trãi', 'Giải Phóng'] as const;

/** Định dạng DD/MM/YYYY */
export const ddmmyyyy = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

/** Ngày cách hôm nay `soNgay` ngày về trước */
export const truocNgay = (soNgay: number) => {
  const d = new Date();
  d.setDate(d.getDate() - soNgay);
  return d;
};

export interface NguoiGia {
  hoTen: string;
  gioiTinh: 'Nam' | 'Nữ';
  ngaySinh: string;
  cccd: string;
  sdt: string;
  diaChi: string;
}

export function nguoiNgauNhien(): NguoiGia {
  const nam = Math.random() < 0.5;
  const hoTen = `${chon(HO)} ${chon(nam ? DEM_NAM : DEM_NU)} ${chon(nam ? TEN_NAM : TEN_NU)}`;
  const namSinh = 1960 + Math.floor(Math.random() * 40); // 1960–1999
  const ngaySinh = ddmmyyyy(new Date(namSinh, Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)));
  // CCCD 12 số: 3 số mã tỉnh (001 = Hà Nội) + 1 số giới tính/thế kỷ (thế kỷ 20: Nam 0, Nữ 1) + 2 số cuối năm sinh + 6 số ngẫu nhiên
  const cccd = `001${nam ? 0 : 1}${String(namSinh).slice(2)}${soNgauNhien(6)}`;
  const sdt = `09${soNgauNhien(8)}`;
  const diaChi = `Số ${1 + Math.floor(Math.random() * 200)}, ngõ ${1 + Math.floor(Math.random() * 100)} ${chon(DUONG)}`;
  return { hoTen, gioiTinh: nam ? 'Nam' : 'Nữ', ngaySinh, cccd, sdt, diaChi };
}

/** Số bản án dạng 125/2026/DS-ST */
export const soBanAn = (nam: number, kyHieu = 'DS-ST') => `${1 + Math.floor(Math.random() * 400)}/${nam}/${kyHieu}`;

export const soNgau = soNgauNhien;
