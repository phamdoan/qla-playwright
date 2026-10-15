/**
 * Sổ cái luồng "Đơn khởi kiện và yêu cầu" (dân sự sơ thẩm).
 *
 * Mỗi vụ án trong Excel (khoá = "Mã vụ án ST", không có thì lấy tên nguyên đơn + bị đơn) ghi lại
 * id đơn đã tạo và các bước đã chạy xong. Nhờ vậy chạy lại thì:
 *   - không tạo đơn trùng cho vụ đã nhập,
 *   - các bước sau (phân công, ký…) lấy đúng id đơn của lần chạy trước mà không phải nhập lại từ đầu.
 *
 * File: seed-output/dan-su-so-tham.<env>.ledger.json
 */
import fs from 'fs';
import path from 'path';
import type { VuAnDanSu } from './du-lieu-dan-su';

export type BuocDanSu =
  | 'nhapDon' | 'phanCong' | 'kyPhanCong' | 'thuLy' | 'phanCongVuAn'
  // xét xử sơ thẩm: 47DS (ký) → 48DS, 51DS (xác nhận đã ký) → 52DS bản án (ký)
  | 'quyetDinhXetXu' | 'bienBanPhienToa' | 'bienBanNghiAn' | 'banAn';

export interface DongSoCaiDanSu {
  khoa: string;
  maVuAn?: string;
  nguyenDon?: string;
  biDon?: string;
  idDon?: string;
  soTiepNhan?: string;
  /** Yêu cầu phê duyệt sinh ra khi trình ký quyết định phân công (dùng cho bước Chánh án ký) */
  idYeuCauPheDuyet?: string;
  /** Vụ án sinh ra sau khi thụ lý đơn */
  idVuAn?: string;
  maVuAnThuLy?: string;
  /** Ngày mở phiên tòa theo lịch xét xử gắn vào 47DS */
  ngayXetXu?: string;
  /** Bản án sơ thẩm (52DS) sau khi Lấy số + Ký logic */
  soBanAn?: string;
  ngayBanAn?: string;
  /** Các bước đã hoàn thành (bước có trong đây thì lần chạy sau bỏ qua) */
  daXong: BuocDanSu[];
  luc: string;
}

/**
 * Khoá nhận dạng một vụ án trong file Excel. Nhiều dòng để "Mã vụ án ST" là dấu chấm (chưa có mã)
 * nên chỉ dùng mã khi thật sự là mã, còn lại nhận dạng bằng cặp nguyên đơn – bị đơn.
 */
export const khoaVuAn = (v: VuAnDanSu) => {
  const ma = (v.maVuAn || '').trim();
  return ma && ma !== '.' ? ma : `${v.nguyenDon.hoTen}|${v.biDon.hoTen}`;
};

const duongDan = () =>
  path.resolve(__dirname, `../seed-output/dan-su-so-tham.${process.env.QLA_ENV || 'stg'}.ledger.json`);

const doc = (): Record<string, DongSoCaiDanSu> => {
  const f = duongDan();
  if (!fs.existsSync(f)) return {};
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8')) as Record<string, DongSoCaiDanSu>;
  } catch {
    return {};
  }
};

export const docDong = (v: VuAnDanSu): DongSoCaiDanSu | undefined => doc()[khoaVuAn(v)];

/** Vụ này đã hoàn thành bước đó chưa */
export const daXongBuoc = (v: VuAnDanSu, buoc: BuocDanSu) => (docDong(v)?.daXong || []).includes(buoc);

/** Ghi/cập nhật một vụ án trong sổ cái (gộp với dữ liệu đã có) */
export function ghiSoCai(
  v: VuAnDanSu,
  them: Partial<Omit<DongSoCaiDanSu, 'daXong' | 'khoa'>> & { xongBuoc?: BuocDanSu },
): DongSoCaiDanSu {
  const f = duongDan();
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tatCa = doc();
  const khoa = khoaVuAn(v);
  const cu: DongSoCaiDanSu = tatCa[khoa] || {
    khoa,
    maVuAn: v.maVuAn,
    nguyenDon: v.nguyenDon.hoTen,
    biDon: v.biDon.hoTen,
    daXong: [],
    luc: '',
  };
  const { xongBuoc, ...phanConLai } = them;
  const moi: DongSoCaiDanSu = {
    ...cu,
    ...phanConLai,
    daXong: xongBuoc && !cu.daXong.includes(xongBuoc) ? [...cu.daXong, xongBuoc] : cu.daXong,
    luc: new Date().toISOString(),
  };
  tatCa[khoa] = moi;
  fs.writeFileSync(f, JSON.stringify(tatCa, null, 2));
  return moi;
}
