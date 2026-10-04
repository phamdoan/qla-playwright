/**
 * LUỒNG NHẬP DATA GĐT/TT · DANH SÁCH CASE (22 bước, BƯỚC 2–23 của đặc tả).
 *
 * KHÔNG CÓ THAM SỐ NÀO. Môi trường có thể hoàn toàn TRẮNG: bước 24 vào
 * `/qla/quan-ly-don/danh-sach-don` → "Thêm mới", tải tệp đơn, bỏ qua OCR, tự sinh số/ngày/tòa bản
 * án rồi nhập tay — tra cứu không ra bản án thì thêm "bản án/quyết định liên quan" bằng tay, đúng
 * cách màn hình cho phép. Xem `flows/quan-ly-don/flow-002-gdt-tt-nhap-data/cai-dat.ts`.
 *
 *   npm run preprod        chạy thẳng 22 bước
 *   npm run preprod:ui     UI mode, bấm ▶ từng bước
 */
import type { CaseChay } from '../../../khung/luong';
import type { InputGdtTt } from '../../../flows/quan-ly-don/flow-002-gdt-tt-nhap-data/cai-dat';
import { FLOW_QLD_002 } from '../../../flows/quan-ly-don/flow-002-gdt-tt-nhap-data/flow';
import type { DinhDanhCase } from '../../../khung/case-state';
import { INPUT as INPUT_KDTM } from '../../kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/case-001/input';

export function ddCase(caseId: string): DinhDanhCase {
  return {
    phanHe: FLOW_QLD_002.phanHe,
    flow: FLOW_QLD_002.flow,
    caseId,
    module: FLOW_QLD_002.module,
    rootCaseKey: `${FLOW_QLD_002.module}|${FLOW_QLD_002.flow}|${caseId}`,
  };
}

/**
 * MỘT CASE DUY NHẤT, KHÔNG THAM SỐ.
 *
 * Môi trường trắng nên KHÔNG khai bản án: bước 24 tự sinh số/ngày/tòa bản án, tra cứu không ra thì
 * thêm "bản án/quyết định liên quan" bằng tay — đúng cách màn hình cho phép. Xem `cai-dat.ts`.
 */
export const DS_CASE: CaseChay<InputGdtTt>[] = [
  {
    dd: ddCase('gdt-01'),
    input: {
      ...INPUT_KDTM,
      /** Pre-prod chạy KHÔNG OCR (chốt 04/10/2026) */
      duongVao: 'khong-ocr' as const,
      loaiAnMa: 'DAN_SU' as const,
      tepDon: 'don-gdt.pdf',
      loaiQdBa: 'Bản án',
      capXetXu: 'Phúc thẩm',
      hinhThucNhan: 'Trực tiếp',
      thuTucGiaiQuyet: 'Giám đốc thẩm',
    } as unknown as InputGdtTt,
  },
];
