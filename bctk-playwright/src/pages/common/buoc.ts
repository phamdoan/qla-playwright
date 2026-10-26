import { Browser, test } from '@playwright/test';
import { PhienDangNhap } from './login.page';
import { LinhVuc } from '../../utils/file-helper';
import { TaiKhoan, chuanHoa, taiKhoanCuaToa, taiKhoanTheoTen } from '../../utils/tai-khoan';
import { TrangThaiChung, docTrangThai, ghiTrangThai, xoaTrangThai } from '../../utils/trang-thai';

/**
 * Khung chạy một LUỒNG tạo dữ liệu chia thành nhiều BƯỚC — dùng chung cho mọi biểu mẫu.
 *
 *   · Mỗi bước là một file trong pages/<lĩnh vực>/form-<mã>/buoc/, khai báo bằng `Buoc`.
 *   · Dữ liệu bước trước để lại cho bước sau nằm ở state/<lĩnh vực>/form-<mã>/<mã vụ án>.json →
 *     chạy riêng một bước được (debug trên Playwright UI) mà không phải chạy lại các bước trước.
 *   · Bước trước chưa xong thì bước sau tự bỏ qua (ghi rõ lý do).
 *   · Mỗi bước nên tự bỏ qua phần việc đã làm, để chạy lại không tạo dữ liệu trùng.
 *
 * File spec chỉ việc gọi luồng (test() phải nằm trong file spec thì UI mới hiện đúng):
 *
 *   for (const buoc of LUONG.cacBuoc)
 *     test.describe(tenBuoc(buoc), () => {
 *       for (const vuAn of LUONG.dsVuAn) test(vuAn.maVuAn, ({ browser }) => chayBuoc(LUONG, buoc, vuAn, browser));
 *     });
 */

export interface VuAnLuong {
  maVuAn: string;
}

export interface NguCanh<V extends VuAnLuong, T extends TrangThaiChung> {
  browser: Browser;
  vuAn: V;
  /** Trạng thái các bước trước để lại */
  tt: T;
  /** Mở phiên đăng nhập (tự đóng khi bước kết thúc) */
  moPhien: (tk: TaiKhoan) => Promise<PhienDangNhap>;
  /** Tài khoản thao tác của một tòa (dòng đầu của tòa trong Taikhoan.xlsx) */
  tkToa: (toaAn: string) => TaiKhoan;
  /** Tài khoản theo họ tên người dùng (người ký) */
  tkNguoi: (ten: string) => TaiKhoan;
  /** Họ tên những người có tài khoản thuộc một tòa */
  nguoiCoTaiKhoan: (toaAn: string) => string[];
  /** Lấy giá trị bước trước để lại; thiếu thì báo rõ phải chạy lại bước nào */
  can: <K extends keyof T>(khoa: K, buocTao: number) => NonNullable<T[K]>;
}

export interface Buoc<V extends VuAnLuong, T extends TrangThaiChung> {
  so: number;
  ten: string;
  /** Mục tương ứng trong file hướng dẫn, vd. "4.1–4.3" */
  huongDan?: string;
  /** Làm bước cho một vụ án; trả về dữ liệu cần lưu cho các bước sau */
  chay: (nc: NguCanh<V, T>) => Promise<Partial<T> | void>;
}

export interface Luong<V extends VuAnLuong, T extends TrangThaiChung> {
  linhVuc: LinhVuc;
  bieuMau: string;
  /** Vụ án cần chạy — mỗi vụ là một test trong mỗi bước */
  dsVuAn: V[];
  dsTaiKhoan: TaiKhoan[];
  /** Các bước theo đúng thứ tự chạy */
  cacBuoc: Buoc<V, T>[];
}

/** Tên nhóm hiện trên UI, vd. "Bước 05 · Tòa phúc thẩm · Tiếp nhận hồ sơ (HD 4.1–4.3)" */
export const tenBuoc = (b: Buoc<any, any>) =>
  `Bước ${String(b.so).padStart(2, '0')} · ${b.ten}${b.huongDan ? ` (HD ${b.huongDan})` : ''}`;

/** Chạy một bước cho một vụ án — gọi trong test() ở file spec */
export async function chayBuoc<V extends VuAnLuong, T extends TrangThaiChung>(
  luong: Luong<V, T>,
  buoc: Buoc<V, T>,
  vuAn: V,
  browser: Browser,
) {
  let tt = docTrangThai<T>(luong.linhVuc, luong.bieuMau, vuAn.maVuAn);
  const viTri = luong.cacBuoc.indexOf(buoc);
  // Bước đầu của một mục đã chạy hết các bước (form không có đầu vào, mục là "ô" tạo lặp lại) → vòng mới
  const buocCuoi = luong.cacBuoc[luong.cacBuoc.length - 1].so;
  if (viTri === 0 && (tt.buocXong ?? 0) >= buocCuoi) {
    xoaTrangThai(luong.linhVuc, luong.bieuMau, vuAn.maVuAn);
    tt = {} as T;
  }
  const truoc = viTri > 0 ? luong.cacBuoc[viTri - 1].so : 0;
  test.skip((tt.buocXong ?? 0) < truoc, `Bước ${truoc} của ${vuAn.maVuAn} chưa xong — chạy bước đó trước`);

  const cacPhien: PhienDangNhap[] = [];
  try {
    const thayDoi = await buoc.chay({
      browser,
      vuAn,
      tt,
      moPhien: async tk => {
        const p = await PhienDangNhap.mo(browser, tk.taiKhoan);
        cacPhien.push(p);
        return p;
      },
      tkToa: toa => taiKhoanCuaToa(luong.dsTaiKhoan, toa),
      tkNguoi: ten => taiKhoanTheoTen(luong.dsTaiKhoan, ten),
      nguoiCoTaiKhoan: toa => luong.dsTaiKhoan.filter(t => t.ten && chuanHoa(t.toaAn) === chuanHoa(toa)).map(t => t.ten!),
      can: (khoa, buocTao) => {
        const gt = tt[khoa];
        if (gt === undefined || gt === null || gt === '') {
          throw new Error(`Thiếu "${String(khoa)}" — chạy lại Bước ${String(buocTao).padStart(2, '0')} trước`);
        }
        return gt as NonNullable<T[typeof khoa]>;
      },
    });
    const moi = ghiTrangThai<T>(luong.linhVuc, luong.bieuMau, vuAn.maVuAn, {
      ...(thayDoi || {}),
      buocXong: Math.max(tt.buocXong ?? 0, buoc.so),
    } as Partial<T>);
    await test.info().attach('trang-thai.json', { body: JSON.stringify(moi, null, 2), contentType: 'application/json' });
  } finally {
    for (const p of cacPhien) await p.dong();
  }
}
