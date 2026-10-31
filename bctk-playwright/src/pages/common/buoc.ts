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
 *   · Bước cần làm nhiều lần (vd. thêm 3 pháp nhân) khai báo `soLan`: chạy `chay` lượt 1…N, lưu state sau
 *     từng lượt (lanXong) → lỗi giữa chừng thì lần sau chạy tiếp từ lượt hỏng, không làm lại lượt đã xong.
 *
 * File spec chỉ việc gọi luồng (test() phải nằm trong file spec thì UI mới hiện đúng):
 *
 *   // lần lượt từng vụ: hết các bước của vụ này mới sang vụ tiếp theo
 *   for (const vuAn of LUONG.dsVuAn)
 *     test.describe(vuAn.maVuAn, () => {
 *       for (const buoc of LUONG.cacBuoc) test(tenBuoc(buoc), ({ browser }) => chayBuoc(LUONG, buoc, vuAn, browser));
 *     });
 */

export interface VuAnLuong {
  maVuAn: string;
}

export interface NguCanh<V extends VuAnLuong, T extends TrangThaiChung> {
  browser: Browser;
  vuAn: V;
  /** Trạng thái các bước trước để lại (kể cả các lượt trước của chính bước này) */
  tt: T;
  /** Lượt hiện tại, đếm từ 1 (bước không lặp luôn là 1) */
  lan: number;
  /** Tổng số lượt của bước */
  soLan: number;
  /** Mở phiên đăng nhập (tự đóng khi bước kết thúc; cùng tài khoản thì dùng lại phiên đang mở) */
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
  /** Số lượt lặp bước này cho mỗi vụ án (mặc định 1); dạng hàm thì tính theo trạng thái các bước trước */
  soLan?: number | ((tt: T) => number);
  /** Làm bước (một lượt) cho một vụ án; trả về dữ liệu cần lưu cho các bước / lượt sau */
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

/**
 * Tên nhóm hiện trên UI, vd. "Buoc 05 · Tòa phúc thẩm · Tiếp nhận hồ sơ (HD 4.1–4.3)".
 * Chữ "Buoc" không dấu để lọc bằng --grep "Buoc 0[1-5] " không bị PowerShell làm hỏng ký tự.
 */
export const tenBuoc = (b: Buoc<any, any>) =>
  `Buoc ${String(b.so).padStart(2, '0')} · ${b.ten}${b.huongDan ? ` (HD ${b.huongDan})` : ''}`;

/**
 * Phiên đang mở trong worker. Test hết giờ thì Playwright bỏ ngang hàm test, khối finally đóng phiên có khi không kịp chạy
 * → phiên của bước trước nằm lại (Vụ 08 bước 09, 29/10: 5 context cũ còn mở, máy chậm, mỗi thao tác 3–5s)
 * → bước sau đóng nốt trước khi chạy.
 */
const phienConMo = new Set<PhienDangNhap>();

/** Chạy một bước cho một vụ án — gọi trong test() ở file spec */
export async function chayBuoc<V extends VuAnLuong, T extends TrangThaiChung>(
  luong: Luong<V, T>,
  buoc: Buoc<V, T>,
  vuAn: V,
  browser: Browser,
) {
  for (const p of phienConMo) await p.dong();
  phienConMo.clear();
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
  // Bước đã xong ở lượt trước → không mở lại màn hình (mở lại màn cũ tốn thời gian, có khi lỗi: đơn đã thụ lý thì API đơn báo 500,
  // biểu mẫu đã ký mở ra chỉ xem…). Muốn làm lại thì sửa "buocXong" trong state.
  test.skip((tt.buocXong ?? 0) >= buoc.so, `Bước ${buoc.so} của ${vuAn.maVuAn} đã xong ở lượt trước`);
  if (!tt.batDau) {
    tt = ghiTrangThai<T>(luong.linhVuc, luong.bieuMau, vuAn.maVuAn, {
      batDau: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }),
    } as Partial<T>);
  }

  const soLan = Math.max(1, (typeof buoc.soLan === 'function' ? buoc.soLan(tt) : buoc.soLan) ?? 1);
  // Phiên theo tài khoản — các lượt dùng lại, không đăng nhập lại mỗi lượt
  const cacPhien = new Map<string, PhienDangNhap>();
  const nguCanh = (lan: number): NguCanh<V, T> => ({
    browser,
    vuAn,
    tt,
    lan,
    soLan,
    moPhien: async tk => {
      let p = cacPhien.get(tk.taiKhoan);
      if (!p) {
        p = await PhienDangNhap.mo(browser, tk.taiKhoan);
        cacPhien.set(tk.taiKhoan, p);
        phienConMo.add(p);
      }
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
  try {
    // Bước lặp: bắt đầu từ lượt sau lượt cuối đã xong
    for (let lan = (tt.lanXong?.[buoc.so] ?? 0) + 1; lan <= soLan; lan++) {
      const chayLan = async () => {
        const thayDoi = await buoc.chay(nguCanh(lan));
        const lanXong = soLan > 1 ? { lanXong: { ...tt.lanXong, [buoc.so]: lan } } : {};
        tt = ghiTrangThai<T>(luong.linhVuc, luong.bieuMau, vuAn.maVuAn, { ...(thayDoi || {}), ...lanXong } as Partial<T>);
      };
      if (soLan > 1) await test.step(`Lượt ${lan}/${soLan}`, chayLan);
      else await chayLan();
    }
    const moi = ghiTrangThai<T>(luong.linhVuc, luong.bieuMau, vuAn.maVuAn, {
      buocXong: Math.max(tt.buocXong ?? 0, buoc.so),
    } as Partial<T>);
    await test.info().attach('trang-thai.json', { body: JSON.stringify(moi, null, 2), contentType: 'application/json' });
  } finally {
    for (const p of cacPhien.values()) {
      await p.dong();
      phienConMo.delete(p);
    }
  }
}

