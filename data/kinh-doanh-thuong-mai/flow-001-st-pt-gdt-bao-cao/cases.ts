/**
 * FLOW-001 · DANH SÁCH CASE chạy qua luồng.
 *
 * Thêm case = thêm một phần tử ở đây (và một file `<case>/input.ts`). **Không thêm file spec** —
 * cả luồng chỉ có một file spec.
 *
 * Với hàng nghìn case thì không khai tay: dùng `dsCaseTuBang()` bên dưới, mỗi DÒNG dữ liệu là một
 * case, `caseId` lấy từ khoá của dòng nên chạy lại bao nhiêu lần cũng trỏ đúng một case.
 *
 * Chọn case lúc chạy (không sửa code):
 *   QLA_CASE=case-001,case-007     chỉ chạy các case này
 *   QLA_SO_CASE=5                  chỉ chạy 5 case đầu
 */
import type { CaseChay } from '../../../khung/luong';
import type { InputKdtm } from '../../../flows/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/cai-dat';
import { FLOW_001 } from '../../../flows/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/flow';
import type { DinhDanhCase } from '../../../khung/case-state';
import { DD as DD_001, INPUT as INPUT_001 } from './case-001/input';
import { DD as DD_002, INPUT as INPUT_002 } from './case-002/input';
import { caseVuAnThucKdtm } from '../../vu-an-thuc/sinh-case';

/** Định danh của một case bất kỳ trong flow này — khoá gieo bất biến, biết trước khi chạy */
export function ddCase(caseId: string): DinhDanhCase {
  return {
    phanHe: FLOW_001.phanHe,
    flow: FLOW_001.flow,
    caseId,
    module: FLOW_001.module,
    rootCaseKey: `${FLOW_001.module}|${FLOW_001.flow}|${caseId}`,
  };
}

/**
 * case-002 dựng 03/10/2026: bản sao case-001 với mã case khác (tên đương sự tự sinh khác), chạy lại
 * cả luồng bằng dữ liệu gieo ĐÃ SỬA — chủ toạ phúc thẩm và Thẩm phán TANDTC đều CHỈ ĐỊNH vào tài khoản
 * của bộ, nên bản án phúc thẩm ký được và Chương trình làm việc HĐXX về đúng Phó Chánh án.
 */
export const DS_CASE: CaseChay<InputKdtm>[] = [
  { dd: DD_001, input: INPUT_001 },
  { dd: DD_002, input: INPUT_002 },
  // Rỗng khi không bật QLA_VU_AN_THUC → hành vi mặc định của luồng không đổi
  ...(caseVuAnThucKdtm() as CaseChay<InputKdtm>[]),
];

/**
 * Sinh case từ một BẢNG dữ liệu (Excel/CSV của Tester) — lối đi cho hàng nghìn case.
 *
 * Chưa bật vì bộ dữ liệu KDTM của Tester ("Data Test KDTM _ Sơ Thẩm - Phúc Thẩm - GĐT_TT.xlsx")
 * chưa chốt cột nào ứng với ô nào. Khi chốt:
 *   1. đọc bảng bằng `common/xlsx.ts`,
 *   2. mỗi dòng → `{ dd: ddCase(maDong), input: { ...INPUT_001, ...ánh xạ cột } }`,
 *   3. `caseId` lấy từ CỘT KHOÁ của dòng (vd. 'case-kdtm-0007'), KHÔNG lấy theo số thứ tự dòng —
 *      thứ tự dòng đổi là state trỏ sang case khác.
 */
export function dsCaseTuBang(): CaseChay<InputKdtm>[] {
  throw new Error(
    'Chưa bật: cần chốt ánh xạ cột của "Data Test KDTM _ Sơ Thẩm - Phúc Thẩm - GĐT_TT.xlsx" ' +
      '(sheet "Sơ thẩm") sang các trường của input.ts trước khi sinh case từ bảng.',
  );
}
