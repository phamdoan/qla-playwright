/**
 * LUỒNG DÂN SỰ · BẢNG CÀI ĐẶT — dùng nguyên thân bước của luồng KDTM.
 *
 * Hai luồng đi cùng màn, cùng biểu mẫu, cùng thứ tự (xem ghi chú đầu `flow.ts` của luồng này); khác
 * nhau nằm ở DỮ LIỆU GIEO. Nên ở đây KHÔNG chép lại thân bước: chép là hai bản sao rồi lệch nhau dần,
 * mà lỗi nào sửa ở KDTM cũng phải nhớ sửa sang đây.
 *
 * Bảng của KDTM còn thừa các bước 24→45 (GĐT/TT); flow dân sự chỉ khai tới bước 23 nên khung không
 * gọi tới chúng — thừa khoá trong bảng cài đặt là vô hại.
 */
import { CAI_DAT as CAI_DAT_KDTM, type InputKdtm } from '../../kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/cai-dat';

/** Dữ liệu gieo của luồng dân sự dùng chung kiểu với KDTM (cùng tập ô của cùng các biểu mẫu) */
export type InputDanSu = InputKdtm;

export const CAI_DAT = CAI_DAT_KDTM;
