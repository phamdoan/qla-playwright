/**
 * FLOW-001 · CẦU NỐI GIAI ĐOẠN C → D: bản án của case, KHÔNG đọc Excel.
 *
 * VẤN ĐỀ: `common/luong-gdt-tt.ts` (B1–B23, đã chạy thật trên STG 27–29/09/2026) nhận một
 * `BanAnSoTham` đọc từ Excel (`common/ban-an-so-tham.ts` · FILE_INPUT / FILE_DOI_CHIEU). Trong
 * FLOW_KDTM_GDT_TT, bản án ĐÃ do bước 12/22 của chính flow tạo ra — đọc lại Excel là hard-code
 * đúng cái vừa sinh, và sai ngay khi số bản án hệ thống cấp khác con số trong file.
 *
 * CÁCH LÀM: dựng `BanAnSoTham` từ CaseState. Thiếu khoá thì NÉM LỖI nói rõ phải chạy lại bước nào —
 * không lặng lẽ rơi về giá trị mặc định (rơi về mặc định là tạo đơn GĐT cho bản án của vụ khác).
 *
 * Dùng ở bước 24 (`24-gdt-tao-don-de-nghi`) và mọi bước GĐT sau đó cần dấu hiệu nhận vụ.
 */
import type { BanAnSoTham } from '../../../common/ban-an-so-tham';
import { chuanNgay } from '../../../common/ban-an-so-tham';
import { DinhDanhCase, moCase } from '../../../khung/case-state';
import { FLOW_001 } from './flow';
import { bangPhuThuoc } from '../../../khung/flow';

/** Cấp bản án mà đơn GĐT đề nghị xem xét lại */
export type CapDeNghi = 'phuc-tham' | 'so-tham';

export interface TuyChonBanAnTuState {
  /**
   * Đề nghị GĐT theo bản án PHÚC THẨM (mặc định — luồng chuẩn của case-001) hay theo bản án
   * SƠ THẨM (khi vụ không bị kháng cáo, bản án sơ thẩm có hiệu lực).
   */
  cap?: CapDeNghi;
  /** Ô "Thủ tục giải quyết" ở tab Thông tin bản án đề nghị */
  thuTucGiaiQuyet?: 'Giám đốc thẩm' | 'Tái thẩm';
  /** Cột "Người kháng nghị" dùng ở bước lập dự thảo kháng nghị */
  nguoiKhangNghi?: string;
  /** Quan hệ pháp luật của vụ sơ thẩm — điền ô "Quan hệ pháp luật" của đơn (án dân sự/KDTM) */
  quanHePhapLuat?: string;
  /** Tên đương sự để CHỐT DANH TÍNH VỤ trên các màn phê duyệt (dauHieuVu) */
  nguyenDon?: string;
}

/**
 * Đọc CaseState của case rồi dựng đúng ba ô nhập của tab "Thông tin bản án đề nghị":
 * `soBanAn` → thongTinBanAn.soBanAnQd, `ngayBanAn` → ngayBanAnQd, `toaAn` → tenToaXetXu/maToaXetXu
 * (đối chiếu FE: `qla-webapp/src/pages/QuanLyDon/ThemMoiDon/type.ts` · FIELD_NAMES.THONG_TIN_BAN_AN).
 */
export function banAnTuState(dd: DinhDanhCase, tuyChon: TuyChonBanAnTuState = {}): BanAnSoTham {
  const { cap = 'phuc-tham' } = tuyChon;
  const state = moCase(dd, bangPhuThuoc(FLOW_001));
  const duLieu = state.doc().duLieu;

  // Khoá + bước sinh ra khoá đó, đúng theo `flow.ts` — thiếu thì chỉ tên bước phải chạy lại
  const nguon =
    cap === 'phuc-tham'
      ? {
          so: ['soBanAnPhucTham', '22-phuc-tham-ban-an-75-ds'],
          ngay: ['ngayBanAnPhucTham', '22-phuc-tham-ban-an-75-ds'],
          toa: ['toaRaBanAnPhucTham', '22-phuc-tham-ban-an-75-ds'],
          capXetXu: 'Phúc thẩm',
        }
      : {
          so: ['soBanAnSoTham', '12-so-tham-ban-an-52-ds'],
          ngay: ['ngayBanAnSoTham', '12-so-tham-ban-an-52-ds'],
          toa: ['toaRaBanAnSoTham', '12-so-tham-ban-an-52-ds'],
          capXetXu: 'Sơ thẩm',
        };

  const can = ([khoa, buoc]: string[]): string => {
    const v = duLieu[khoa];
    if (!v?.trim()) {
      throw new Error(
        `Chưa dựng được bản án cho đơn GĐT: state của ${dd.caseId} thiếu "${khoa}" → chạy lại bước ` +
          `"${buoc}". KHÔNG được thay bằng số bản án trong Excel: đơn GĐT phải trỏ đúng bản án của case này.`,
      );
    }
    return v.trim();
  };

  return {
    dong: 0, // không đến từ Excel nên không có số dòng
    soBanAn: can(nguon.so),
    ngayBanAn: chuanNgay(can(nguon.ngay)),
    toaAn: can(nguon.toa),
    toaAnTrongFile: can(nguon.toa),
    capXetXu: nguon.capXetXu,
    loaiAn: 'Kinh doanh, thương mại',
    maVuAn: duLieu.maVuAnSoTham,
    quanHePhapLuat: tuyChon.quanHePhapLuat,
    thuTucGiaiQuyet: tuyChon.thuTucGiaiQuyet ?? 'Giám đốc thẩm',
    nguoiKhangNghi: tuyChon.nguoiKhangNghi,
    // Nút [Gợi ý] của màn sinh nội dung đơn — để rỗng thì bước nhập đơn tự bấm Gợi ý và đọc lại
    noiDungGoiY: '',
    // Dấu hiệu chốt danh tính vụ trên các màn phê duyệt (common/luong-gdt-tt.ts · dauHieuVu)
    ...(tuyChon.nguyenDon ? { nguyenDon: tuyChon.nguyenDon } : {}),
  } as BanAnSoTham;
}
