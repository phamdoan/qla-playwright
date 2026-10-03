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
  nguyenDon: { ...INPUT_DS_001.nguyenDon, nguyenVan: TEN_NGUYEN_DON, hoTen: TEN_NGUYEN_DON },
  biDon: { ...INPUT_DS_001.biDon, nguyenVan: TEN_BI_DON, hoTen: TEN_BI_DON },
  noiDungYeuCau: `Đề nghị Tòa án giải quyết tranh chấp hợp đồng vay tài sản giữa ${TEN_NGUYEN_DON} và ${TEN_BI_DON}.`,
  tenNguoiKhangCao: TEN_BI_DON,
  tieuDeLichXetXu: `Phiên tòa sơ thẩm dân sự — ${TEN_NGUYEN_DON}`,
};
