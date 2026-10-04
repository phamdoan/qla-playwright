/**
 * FLOW-002 QUẢN LÝ ĐƠN · BẢNG CÀI ĐẶT — dùng NGUYÊN thân bước của cụm GĐT trong luồng KDTM.
 *
 * 22 bước của luồng này chính là bước 24→45 của `flow-001-st-pt-gdt-bao-cao`, đã chạy xanh trọn
 * trên STG. Nên ở đây KHÔNG chép lại thân bước — chép là hai bản sao rồi lệch nhau dần, mà lỗi nào
 * sửa ở KDTM cũng phải nhớ sửa sang đây.
 *
 * Bảng của KDTM còn thừa bước 01→23 (sơ thẩm/phúc thẩm); flow này chỉ khai từ 24 nên khung không
 * gọi tới chúng — thừa khoá trong bảng cài đặt là vô hại.
 */
import { CAI_DAT as CAI_DAT_KDTM, type InputKdtm } from '../../kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/cai-dat';
import type { TuyChonBanAnTuState } from '../../kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/gdt-tt.flow';

/**
 * Dữ liệu gieo: y như KDTM, thêm `banAnGdt` — bản án CÓ THẬT trên môi trường mà đơn GĐT trỏ tới.
 * Bắt buộc với luồng này vì đặc tả bắt đầu từ một bản án đã có (xem `flow.ts`).
 */
export type InputGdtTt = InputKdtm & {
  banAnGdt: NonNullable<TuyChonBanAnTuState['banAnGieo']>;
};

export const CAI_DAT = CAI_DAT_KDTM;
