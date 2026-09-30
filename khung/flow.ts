/**
 * KHUNG FLOW — khai báo một hành trình nghiệp vụ hoàn chỉnh.
 *
 * Mô hình: PHÂN HỆ → FLOW → CASE → STEP → ACTION → VERIFY → CHECKPOINT
 *
 *   1 FLOW = 1 hành trình nghiệp vụ hoàn chỉnh (đơn → sơ thẩm → phúc thẩm → GĐT/TT → báo cáo)
 *   1 CASE = 1 bộ dữ liệu chạy qua FLOW
 *   1 STEP = 1 MÀN HÌNH, hoặc 1 hành động nghiệp vụ chính trên màn hình đó
 *   1 PAGE = chỉ là abstraction kỹ thuật để thao tác UI (`pages/`, `common/`)
 *
 * Danh sách bước ở ĐÂY là nguồn duy nhất: thứ tự bước, màn hình, vai chạy, khoá vào/ra, trích dẫn
 * tài liệu và bảng phụ thuộc đều suy ra từ nó — không khai lại ở từng spec (khai hai nơi là lệch
 * hai nơi). `vao`/`ra` khai xong thì lineage tự kiểm được: `node tools/lineage.js`.
 */
import type { BangPhuThuoc } from './case-state';

/** Mức tin của một bước — bước chưa xác minh KHÔNG được coi như đã đúng */
export type MucXacMinh =
  /** đã đối chiếu code FE: route, tab, field, API */
  | 'FE'
  /** đã chạy thật và đo được trên STG/UAT */
  | 'RUNTIME'
  /** chỉ có tài liệu .txt của Tester, chưa đối chiếu gì */
  | 'TAI-LIEU'
  /** chưa biết màn hình thật ở đâu */
  | 'UNKNOWN';

export interface DinhNghiaBuoc {
  /** mã bước = tên file spec không có đuôi, vd. '01-tao-don-khoi-kien' */
  ma: string;
  /** mô tả mốc nghiệp vụ, hiện trên tên test */
  ten: string;
  /** TÊN MÀN HÌNH người dùng thấy, vd. 'Chi tiết vụ án sơ thẩm · tab Xét xử' */
  manHinh: string;
  /**
   * Route của màn hình, tương đối với `/qla/` (baseURL). Đặt `?` cho tham số phải lấy từ state,
   * vd. 'quan-ly-so-tham/dan-su/chi-tiet?id={idVuAnSoTham}&tab=xet-xu'.
   * Rỗng = màn hình không có route riêng (mở bằng nút/popup từ màn khác).
   */
  route: string;
  /** vai đăng nhập để chạy bước (khoá trong config/luong-gdt.json) */
  vai: string;
  /** khoá bàn giao mà bước này ĐỌC từ state (do bước trước sinh ra) */
  vao: string[];
  /** khoá bàn giao mà bước này SINH RA — cũng là bằng chứng ở CHECKPOINT */
  ra: string[];
  /** trích dẫn tài liệu nguồn, vd. 'StepData KDTM · Step6' */
  nguon: string;
  /** đã xác minh màn hình/route bằng gì */
  xacMinh: MucXacMinh;
  /** nguồn xác minh cụ thể: file FE hoặc kết quả chạy thật */
  bangChungXacMinh?: string;
  /**
   * Bước bắt buộc phải xong trước. Mặc định là bước liền trước trong danh sách; đặt `null` cho
   * bước mở đầu (hoặc bước chạy độc lập được).
   */
  canTruoc?: string | null;
}

export interface DinhNghiaFlow {
  /** thư mục phân hệ, vd. 'kinh-doanh-thuong-mai' */
  phanHe: string;
  /** thư mục flow, vd. 'flow-001-st-pt-gdt-bao-cao' */
  flow: string;
  /** mã nghiệp vụ, vd. 'KINH_DOANH_THUONG_MAI' */
  module: string;
  /** hành trình bằng một câu */
  ten: string;
  /** file đặc tả gốc trong `docs/stepdata/` */
  nguon: string;
  buoc: DinhNghiaBuoc[];
}

/** Bảng phụ thuộc suy ra từ thứ tự bước (bước N cần bước N-1 xong, trừ khi khai `canTruoc`) */
export function bangPhuThuoc(f: DinhNghiaFlow): BangPhuThuoc {
  const bang: BangPhuThuoc = {};
  f.buoc.forEach((b, i) => {
    bang[b.ma] = b.canTruoc === null ? undefined : (b.canTruoc ?? f.buoc[i - 1]?.ma);
  });
  return bang;
}

export function timBuoc(f: DinhNghiaFlow, ma: string): DinhNghiaBuoc {
  const b = f.buoc.find(x => x.ma === ma);
  if (!b) {
    throw new Error(
      `Bước "${ma}" không có trong flow ${f.phanHe}/${f.flow}. Bước đã khai: ${f.buoc.map(x => x.ma).join(', ')}`,
    );
  }
  return b;
}

/**
 * Kiểm tra lineage của flow: mọi khoá một bước ĐỌC phải được một bước TRƯỚC nó SINH RA.
 * Bắt được đúng lỗi "hard-code lại dữ liệu step trước đã tạo" ngay lúc khai báo, không cần chạy.
 */
export function kiemLineage(f: DinhNghiaFlow): string[] {
  const loi: string[] = [];
  const daCo = new Map<string, string>(); // khoá → bước sinh ra
  for (const b of f.buoc) {
    for (const k of b.vao) {
      const nguon = daCo.get(k);
      if (!nguon) {
        loi.push(`${b.ma}: đọc khoá "${k}" nhưng không bước nào trước đó sinh ra khoá này`);
      }
    }
    for (const k of b.ra) {
      const cu = daCo.get(k);
      if (cu) loi.push(`${b.ma}: sinh lại khoá "${k}" mà ${cu} đã sinh — đổi tên để khỏi ghi đè`);
      daCo.set(k, b.ma);
    }
  }
  return loi;
}

/** Route thật của bước: thay {khoa} bằng giá trị trong state */
export function routeCuaBuoc(b: DinhNghiaBuoc, duLieu: Record<string, string>): string {
  return b.route.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = duLieu[k];
    if (!v) {
      throw new Error(
        `Route của bước "${b.ma}" cần khoá "${k}" nhưng state chưa có → chạy lại bước sinh ra khoá đó.`,
      );
    }
    return v;
  });
}
