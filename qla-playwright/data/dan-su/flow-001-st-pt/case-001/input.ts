/**
 * CASE-DS-001 của LUỒNG DÂN SỰ — dữ liệu GIEO, TẤT ĐỊNH.
 *
 * Dựng bằng cách LẤY NGUYÊN bộ dữ liệu của case KDTM rồi ghi đè đúng những ô mà đặc tả dân sự
 * (`docs/stepdata/StepData_DanSu_VuAn.txt`) nói khác. Không chép lại cả file: hai bản sao sẽ lệch nhau
 * dần, mà phần lớn ô (ngày tháng, người ký, số tiền, nội dung biểu mẫu) là như nhau.
 *
 * Tên đương sự sinh TẤT ĐỊNH từ mã case nên khác case KDTM — tra lưới vẫn ra đúng vụ của case này.
 * Cái gì là OUTPUT (số tiếp nhận, mã vụ án, số thụ lý, số bản án) thì KHÔNG khai ở đây.
 */
import type { DinhDanhCase } from '../../../../khung/case-state';
import { tenDuongSu } from '../../../../khung/ten-viet';
import { FLOW_DS_001 } from '../../../../flows/dan-su/flow-001-st-pt/flow';
import { INPUT as INPUT_KDTM } from '../../../kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

export const CASE_ID = 'case-ds-001';
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
  ...INPUT_KDTM,

  /**
   * TÀI KHOẢN TÒA SƠ THẨM theo đúng đặc tả (b1 của StepData_DanSu_VuAn.txt). CCCD thật KHÔNG ghi ở
   * đây — repo công khai: nó nằm ở vai `chanhAnDanSuVuAn` trong `config/tai-khoan.local.json`
   * (tệp gitignore). Bản đặc tả trong `docs/stepdata/` cũng đã che số này.
   */
  vaiSoTham: 'chanhAnDanSuVuAn',

  // ───────── Bước 01 · b4 Thông tin đơn (đặc tả DS b4.6–b4.9) ─────────
  /** b4.6: "Loại đơn chọn Dân sự" */
  loaiDon: 'Dân sự',
  /**
   * b4.8: "chọn random 1 mục lá trong nhóm tranh chấp Dân sự (VD: tranh chấp hợp đồng vay tài sản)".
   *
   * ĐÃ HỎI MÁY CHỦ, KHÔNG ĐOÁN (03/10/2026, GET /danh-muc?maDanhMucCha=QHPL_TC_DS.003):
   * nhóm "Tranh chấp về giao dịch dân sự, hợp đồng dân sự" (QHPL_TC_DS.003) có 22 mục lá, trong đó
   * QHPL_TC_DS.003.005 = "Tranh chấp hợp đồng vay tài sản".
   *
   * `chonQhplThongKe` khớp tên lá CHÍNH XÁC (`^tên$`) nên phải gieo đúng chuỗi này.
   * (Trước 03/10/2026 lá KDTM tên ngắn và nằm ở cấp 1 nên bẫy "lá cấp 2" chỉ lộ ở dân sự; từ
   * 03/10/2026 danh mục KDTM cũng đã chuyển lá xuống cấp 2 — xem input của case-001 KDTM.)
   */
  /**
   * NHÁNH CHA của lá — bắt buộc với dân sự: cây chỉ nạp cấp 1, lá nằm ở cấp 2 nên phải mở nhánh này
   * rồi mới bấm lá (lọc bằng chữ thì cây rỗng, đo 03/10/2026).
   */
  qhplChaThongKe: 'Tranh chấp về giao dịch dân sự, hợp đồng dân sự',
  maQhplThongKe: 'QHPL_TC_DS.003.005',
  tenQhplThongKe: 'Tranh chấp hợp đồng vay tài sản',
  quanHePhapLuatChiTiet: 'Tranh chấp hợp đồng vay tài sản',
  /** Chuỗi LỌC cho ô TreeSelect "Quan hệ pháp luật thống kê" ở màn vụ án (gõ để lọc, không phải tên đầy đủ) */
  quanHePhapLuatThongKe: 'vay tài sản',

  // ───────── Bước 01 · b6 Đương sự ─────────
  nguyenDon: { ...INPUT_KDTM.nguyenDon, nguyenVan: TEN_NGUYEN_DON, hoTen: TEN_NGUYEN_DON },
  biDon: { ...INPUT_KDTM.biDon, nguyenVan: TEN_BI_DON, hoTen: TEN_BI_DON },

  // ───────── Bước 01 · b7 Yêu cầu ─────────
  noiDungYeuCau: `Đề nghị Tòa án giải quyết tranh chấp hợp đồng vay tài sản giữa ${TEN_NGUYEN_DON} và ${TEN_BI_DON}.`,

  // ───────── Bước 14 · 61-DS / 62-DS (ô danh mục THEO TÒA) ─────────
  /**
   * NGƯỜI KÝ và VIỆN KIỂM SÁT là danh mục CỦA TÒA ĐANG CHẠY, không mượn được của tòa KDTM.
   * Đo 03/10/2026: ô "Người ký ban hành" của tòa dân sự chỉ có "Lưu Tuấn Dũng - Chánh án | Bùi
   * Đăng Huy …" nên giá trị cũ ("Nguyễn Mậu Trường") không khớp, 62-DS không lưu được
   * ("Vui lòng chọn người ký ban hành | Vui lòng chọn Viện kiểm sát cùng cấp").
   *
   * Viện kiểm sát gieo dạng TIỀN TỐ: tên đầy đủ khác nhau theo địa bàn, khớp kiểu CHỨA nên tiền tố
   * "Viện kiểm sát nhân dân" lấy mục đầu của chính tòa đó — tất định theo thứ tự danh mục.
   */
  nguoiKyBanHanh62DS: 'Lưu Tuấn Dũng',
  vienKiemSatCungCap: 'Viện kiểm sát nhân dân',
  vienKiemSatNhan: 'Viện kiểm sát nhân dân',

  // ───────── Bước 13 · Kháng cáo ─────────
  /** Đặc tả DS 7.2: "Tên người kháng cáo" chọn Người bị kiện */
  tenNguoiKhangCao: TEN_BI_DON,

  // ───────── Nhãn hiển thị khác loại án ─────────
  tieuDeLichXetXu: `Phiên tòa sơ thẩm dân sự — ${TEN_NGUYEN_DON}`,
};
