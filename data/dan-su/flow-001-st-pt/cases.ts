/**
 * LUỒNG DÂN SỰ · DANH SÁCH CASE.
 *
 * Thêm case = thêm một phần tử ở đây + một file `<case>/input.ts` (ghi đè vài ô trên bộ gieo chung).
 * Không thêm file spec — cả luồng chỉ có một file spec.
 *
 *   QLA_CASE=case-ds-001     chỉ chạy case này
 *
 * Ngoài 4 case viết tay dưới đây, luồng còn nhận case SINH TỪ BẢN ÁN THẬT đã công bố
 * (`data/vu-an-thuc/`). Chúng chỉ vào danh sách khi bật `QLA_VU_AN_THUC` — xem `vu-an-thuc/sinh-case.ts`.
 */
import type { CaseChay } from '../../../khung/luong';
import type { InputDanSu } from '../../../flows/dan-su/flow-001-st-pt/cai-dat';
import { FLOW_DS_001 } from '../../../flows/dan-su/flow-001-st-pt/flow';
import type { DinhDanhCase } from '../../../khung/case-state';
import { DD as DD_DS_001, INPUT as INPUT_DS_001 } from './case-001/input';
import { DD as DD_DS_002, INPUT as INPUT_DS_002 } from './case-002/input';
import { DD as DD_DS_003, INPUT as INPUT_DS_003 } from './case-003/input';
import { DD as DD_DS_004, INPUT as INPUT_DS_004 } from './case-004/input';
import { caseVuAnThuc } from '../../vu-an-thuc/sinh-case';

/** Định danh của một case bất kỳ trong luồng này — khoá gieo bất biến, biết trước khi chạy */
export function ddCase(caseId: string): DinhDanhCase {
  return {
    phanHe: FLOW_DS_001.phanHe,
    flow: FLOW_DS_001.flow,
    caseId,
    module: FLOW_DS_001.module,
    rootCaseKey: `${FLOW_DS_001.module}|${FLOW_DS_001.flow}|${caseId}`,
  };
}

export const DS_CASE: CaseChay<InputDanSu>[] = [
  { dd: DD_DS_001, input: INPUT_DS_001 },
  { dd: DD_DS_002, input: INPUT_DS_002 },
  { dd: DD_DS_003, input: INPUT_DS_003 },
  { dd: DD_DS_004, input: INPUT_DS_004 },
  // Rỗng khi không bật QLA_VU_AN_THUC → hành vi mặc định của luồng không đổi
  ...(caseVuAnThuc() as CaseChay<InputDanSu>[]),
];
