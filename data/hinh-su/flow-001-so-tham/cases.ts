/**
 * FLOW HÌNH SỰ 001 · DANH SÁCH CASE.
 *
 * Thêm case = thêm một phần tử ở đây + một file `<case>/input.ts`. Không thêm file spec —
 * cả luồng chỉ có một file spec, như bên KDTM.
 */
import type { CaseChay } from '../../../khung/luong';
import type { InputHinhSu } from '../../../flows/hinh-su/flow-001-so-tham/cai-dat';
import { DD as DD_001, INPUT as INPUT_001 } from './case-001/input';

export const DS_CASE: CaseChay<InputHinhSu>[] = [{ dd: DD_001, input: INPUT_001 }];
