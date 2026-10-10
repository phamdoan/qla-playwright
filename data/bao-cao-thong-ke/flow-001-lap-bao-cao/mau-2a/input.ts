/**
 * CASE MAU-2A của FLOW BCTK 001 — tiêu chí lập báo cáo, TẤT ĐỊNH.
 *
 * Chọn 2A làm case đầu vì đây là biểu mẫu đã có số liệu gieo (`bctk/README.md`: 2A, 2B, 4A–4D) và
 * Tester đã có sheet "Kịch bản 2A" (vụ VA26-…, lọc 14/08/2026 – 17/08/2026).
 *
 * `caseId` theo MÃ BIỂU MẪU, không theo số thứ tự — thêm biểu mẫu khác thì thêm thư mục `mau-<mã>`.
 */
import type { DinhDanhCase } from '../../../../khung/case-state';
import { FLOW_BCTK_001 } from '../../../../flows/bao-cao-thong-ke/flow-001-lap-bao-cao/flow';

export const CASE_ID = 'mau-2a';
export const ROOT_CASE_KEY = `${FLOW_BCTK_001.module}|${FLOW_BCTK_001.flow}|${CASE_ID}`;

export const DD: DinhDanhCase = {
  phanHe: FLOW_BCTK_001.phanHe,
  flow: FLOW_BCTK_001.flow,
  caseId: CASE_ID,
  module: FLOW_BCTK_001.module,
  rootCaseKey: ROOT_CASE_KEY,
};

export const INPUT = {
  /** mã biểu mẫu trong `bctk/danh-muc-80-bao-cao.ts` */
  maBaoCao: '2A' as const,
  /** Kỳ lọc theo "Kịch bản 2A" của Tester */
  tuNgay: '14/08/2026',
  denNgay: '17/08/2026',
  /** CHƯA CHỐT: đơn vị lập báo cáo — Kịch bản 2A không ghi rõ tòa */
  donVi: '',
  /** CHƯA CHỐT: khoá tài khoản trong config/luong-gdt.json cho vai `canBoThongKe` */
  vaiLapBaoCao: '',
  /** CHƯA CHỐT: tài khoản KHÔNG có quyền BCTK, dùng ở bước 08 */
  vaiKhongQuyen: '',
};
