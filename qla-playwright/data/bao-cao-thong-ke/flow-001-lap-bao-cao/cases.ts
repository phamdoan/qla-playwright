/**
 * FLOW BCTK 001 · DANH SÁCH CASE — một case cho một biểu mẫu.
 *
 * Thêm biểu mẫu = thêm thư mục `mau-<mã>/` (input.ts + expected.ts) và một phần tử ở đây.
 * Không thêm file spec.
 */
import type { CaseChay } from '../../../khung/luong';
import type { InputBctk } from '../../../flows/bao-cao-thong-ke/flow-001-lap-bao-cao/cai-dat';
import { DD as DD_2A, INPUT as INPUT_2A } from './mau-2a/input';

export const DS_CASE: CaseChay<InputBctk>[] = [{ dd: DD_2A, input: INPUT_2A }];
