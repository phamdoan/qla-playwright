/**
 * CASE-DS-002 — bản sao case-ds-001 với MỘT sửa đổi: CHỦ TOẠ là chính tài khoản đang chạy.
 *
 * Vì sao phải có case mới: case-ds-001 đã phân công chủ toạ "Bùi Đăng Huy" ở bước 08, mà bước 08 thấy
 * vụ đã có phân công thì bỏ qua — không đổi được người. Kẹt kéo theo:
 *   47-DS ở tòa này là QUYẾT ĐỊNH KÝ SỐ → kịch bản chỉ "Trình ký" được, văn bản nằm chờ chữ ký của
 *   chủ toạ; dòng đứng ở "Chờ ký" → 51-DS không hiện trong danh mục → nút "Tạo bản án" khoá (bước 12).
 *
 * Cùng một quy tắc đã gặp ở luồng GĐT (xem docs/flow-kdtm-gdt-tt.md): NGƯỜI KÝ KHOÁ THEO CHỦ TOẠ, nên
 * chủ toạ phải là người mình có tài khoản. Luồng KDTM vốn đã gieo đúng (`tenThamPhanChuToa` =
 * "Nguyễn Mậu Trường" = tài khoản chạy) nên chưa bao giờ lộ.
 */
import type { DinhDanhCase } from '../../../../khung/case-state';
import { tenDuongSu } from '../../../../khung/ten-viet';
import { FLOW_DS_001 } from '../../../../flows/dan-su/flow-001-st-pt/flow';
import { INPUT as INPUT_DS_001 } from '../case-001/input';

export const CASE_ID = 'case-ds-002';
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
  ...INPUT_DS_001,
  /** Chủ toạ = tài khoản đang chạy (vai `chanhAnDanSuVuAn`) để ký được 47-DS và bản án 52-DS */
  tenThamPhanChuToa: 'Lưu Tuấn Dũng',
  /**
   * TÒA PHÚC THẨM = TAND TỐI CAO, hỏi thẳng CSDL ngày 04/10/2026 (bảng VU_CHUYEN):
   *   D01.133 (TAND TP Hải Phòng) → DON_VI_TIEPNHAN = D01 "Tòa án nhân dân tối cao" (11 hồ sơ),
   *   còn D01.131.09 (khu vực 9 Hà Nội) → D01.131 (TAND TP Hà Nội).
   *
   * Trước đó tôi suy luận hồ sơ của tòa tỉnh phải lên TAND CẤP CAO và kết luận "ngoài tầm tài
   * khoản" — SAI. Vai `phoChanhAn` (Nguyễn Hải Trâm) thuộc đúng đơn vị D01 nên tiếp nhận được.
   */
  vaiPhucTham: 'phoChanhAn',

  /**
   * NGƯỜI KÝ PHÚC THẨM = CHÍNH TÀI KHOẢN CHẠY phúc thẩm (Nguyễn Hải Trâm, D01).
   *
   * 84-DS là quyết định KÝ SỐ: để người khác làm chủ toạ thì kịch bản chỉ "Trình ký" được, phân
   * công chưa có hiệu lực, và bước 20 bị hệ thống chặn với đúng câu "Vụ án chưa phân công Thẩm
   * phán/Thư ký nên chưa có người nhận thông báo" (đo 04/10/2026). Hạt giống cũ ghi Nguyễn Xuân Kỳ
   * — thẩm phán của TAND TP Hà Nội, không thuộc D01.
   */
  nguoiKyPhucTham: 'Nguyễn Hải Trâm',
  nguyenDon: { ...INPUT_DS_001.nguyenDon, nguyenVan: TEN_NGUYEN_DON, hoTen: TEN_NGUYEN_DON },
  biDon: { ...INPUT_DS_001.biDon, nguyenVan: TEN_BI_DON, hoTen: TEN_BI_DON },
  noiDungYeuCau: `Đề nghị Tòa án giải quyết tranh chấp hợp đồng vay tài sản giữa ${TEN_NGUYEN_DON} và ${TEN_BI_DON}.`,
  tenNguoiKhangCao: TEN_BI_DON,
  tieuDeLichXetXu: `Phiên tòa sơ thẩm dân sự — ${TEN_NGUYEN_DON}`,
};
