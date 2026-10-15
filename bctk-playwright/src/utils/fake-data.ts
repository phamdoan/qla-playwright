import type { TruongForm } from '../pages/base.page';

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương'];
const DEM = ['Văn', 'Thị', 'Hữu', 'Minh', 'Thanh', 'Quốc', 'Ngọc', 'Đức', 'Thu', 'Hoài'];
const TEN = ['An', 'Bình', 'Cường', 'Dũng', 'Hà', 'Hải', 'Hùng', 'Lan', 'Linh', 'Long', 'Mai', 'Nam', 'Phong', 'Quân', 'Tâm', 'Trang'];
const TINH = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Nghệ An', 'Thanh Hóa', 'Khánh Hòa'];

const ngauNhien = <T>(ds: T[]): T => ds[Math.floor(Math.random() * ds.length)];
const so = (doDai: number) => Array.from({ length: doDai }, () => Math.floor(Math.random() * 10)).join('');

export const hoTen = () => `${ngauNhien(HO)} ${ngauNhien(DEM)} ${ngauNhien(TEN)}`;
export const cccd = () => `0${so(2)}${ngauNhien(['0', '1'])}${so(8)}`;
export const soDienThoai = () => `09${so(8)}`;
export const diaChi = () => `Số ${Math.ceil(Math.random() * 200)}, ${ngauNhien(TINH)}`;
/** Số thụ lý duy nhất theo thời điểm chạy để tránh trùng giữa các lượt */
export const soThuLy = () => `${Date.now().toString().slice(-6)}/${new Date().getFullYear()}`;

/** Ngày dd/MM/yyyy, lệch `lechNgay` so với hôm nay (âm = quá khứ) */
export function ngay(lechNgay = 0): string {
  const d = new Date(Date.now() + lechNgay * 86_400_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Năm sinh dd/MM/yyyy cho người từ `tu` đến `den` tuổi */
export const ngaySinh = (tu = 18, den = 60) => ngay(-Math.floor((tu + Math.random() * (den - tu)) * 365));

const SINH: Record<string, (thamSo?: string) => string> = {
  hoTen: () => hoTen(),
  cccd: () => cccd(),
  soDienThoai: () => soDienThoai(),
  diaChi: () => diaChi(),
  soThuLy: () => soThuLy(),
  ngay: thamSo => ngay(Number(thamSo ?? 0)),
  ngaySinh: () => ngaySinh(),
};

/**
 * Thay placeholder trong giá trị data JSON:
 *   "{{hoTen}}", "{{cccd}}", "{{soThuLy}}", "{{ngay}}", "{{ngay:-30}}" (30 ngày trước), "{{ngaySinh}}"...
 * Giá trị không có placeholder giữ nguyên.
 */
export function thayGiaTri(giaTri: string): string {
  return giaTri.replace(/\{\{(\w+)(?::(-?\w+))?\}\}/g, (goc, ten: string, thamSo?: string) => {
    const ham = SINH[ten];
    if (!ham) throw new Error(`Placeholder không hỗ trợ: ${goc}`);
    return ham(thamSo);
  });
}

/** Sinh bộ trường mới (mỗi vụ án một bộ giá trị khác nhau) từ khai báo trong JSON */
export const sinhTruong = (truong: TruongForm[]): TruongForm[] =>
  truong.map(t => (typeof t.giaTri === 'string' ? { ...t, giaTri: thayGiaTri(t.giaTri) } : t));
