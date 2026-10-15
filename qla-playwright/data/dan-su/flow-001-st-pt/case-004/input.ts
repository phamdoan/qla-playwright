/**
 * CASE-DS-004 — bản sao CASE-DS-003, chạy lại trọn 01→23 trên dữ liệu sạch để nghiệm thu toàn bộ
 * bản vá trong ngày 03/10/2026 (và sinh đủ bộ ảnh 23/23 bước bằng cờ --anh).
 *
 * CASE-DS-003 — DỮ LIỆU DÂN SỰ chạy trên CẶP TÒA CỦA LUỒNG KDTM (tòa sơ thẩm + tòa phúc thẩm mà bộ
 * có tài khoản cho cả hai).
 *
 * VÌ SAO KHÔNG DÙNG TÀI KHOẢN GHI TRONG ĐẶC TẢ:
 * b1 của StepData_DanSu_VuAn.txt chỉ định một tài khoản Tòa sơ thẩm khác (vai `chanhAnDanSuVuAn`).
 * Chạy case-ds-002 bằng tài khoản đó thì 01→15 xanh, nhưng BƯỚC 16 TẮC: hồ sơ chuyển lên tòa phúc
 * thẩm QUẢN LÝ tòa sơ thẩm đó, mà bộ không có tài khoản của tòa phúc thẩm ấy — vai `vaiPhucTham`
 * hiện có (Nguyễn Xuân Kỳ) thuộc tòa phúc thẩm khác nên tab "Chờ tiếp nhận" không có vụ
 * (đo 03/10/2026: vụ VA26-005356).
 *
 * Tài khoản trong đặc tả là DỮ LIỆU MÔI TRƯỜNG, không phải quy tắc nghiệp vụ — cùng bài học với
 * "người duyệt là Nguyễn Hải Trâm" ở luồng GĐT. Nên case này giữ nguyên NGHIỆP VỤ DÂN SỰ (loại đơn,
 * quan hệ pháp luật) nhưng chạy trên cặp tòa mà bộ đi được từ đầu tới cuối.
 *
 * Muốn chạy đúng tài khoản của đặc tả thì phải khai thêm vai tòa phúc thẩm tương ứng trong
 * `config/tai-khoan.local.json` rồi đặt `vaiPhucTham` cho case.
 */
import type { DinhDanhCase } from '../../../../khung/case-state';
import { tenDuongSu } from '../../../../khung/ten-viet';
import { FLOW_DS_001 } from '../../../../flows/dan-su/flow-001-st-pt/flow';
import { INPUT as INPUT_KDTM } from '../../../kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

export const CASE_ID = 'case-ds-004';
export const ROOT_CASE_KEY = `${FLOW_DS_001.module}|${FLOW_DS_001.flow}|${CASE_ID}`;

export const DD: DinhDanhCase = {
  phanHe: FLOW_DS_001.phanHe,
  flow: FLOW_DS_001.flow,
  caseId: CASE_ID,
  module: FLOW_DS_001.module,
  rootCaseKey: ROOT_CASE_KEY,
};

export const TEN_NGUYEN_DON = tenDuongSu(CASE_ID, 'nguyenDon');
export const TEN_BI_DON = tenDuongSu(CASE_ID, 'biDon', 'nu');

export const INPUT = {
  // Giữ TOÀN BỘ seed của tòa KDTM (tài khoản, người ký, Viện kiểm sát, chủ toạ) — chúng nhất quán
  // với nhau; chỉ thay phần NGHIỆP VỤ DÂN SỰ bên dưới.
  ...INPUT_KDTM,

  // ───────── Nghiệp vụ dân sự (StepData_DanSu_VuAn.txt b4.6–b4.9) ─────────
  loaiDon: 'Dân sự',
  /** Lá nằm ở CẤP 2 nên phải mở nhánh cha trước (xem chonQhplThongKe) */
  qhplChaThongKe: 'Tranh chấp về giao dịch dân sự, hợp đồng dân sự',
  maQhplThongKe: 'QHPL_TC_DS.003.005',
  tenQhplThongKe: 'Tranh chấp hợp đồng vay tài sản',
  quanHePhapLuatChiTiet: 'Tranh chấp hợp đồng vay tài sản',
  quanHePhapLuatThongKe: 'vay tài sản',

  // ───────── Đương sự riêng của case ─────────
  nguyenDon: { ...INPUT_KDTM.nguyenDon, nguyenVan: TEN_NGUYEN_DON, hoTen: TEN_NGUYEN_DON },
  biDon: { ...INPUT_KDTM.biDon, nguyenVan: TEN_BI_DON, hoTen: TEN_BI_DON },
  noiDungYeuCau: `Đề nghị Tòa án giải quyết tranh chấp hợp đồng vay tài sản giữa ${TEN_NGUYEN_DON} và ${TEN_BI_DON}.`,
  tenNguoiKhangCao: TEN_BI_DON,
  tieuDeLichXetXu: `Phiên tòa sơ thẩm dân sự — ${TEN_NGUYEN_DON}`,
};
