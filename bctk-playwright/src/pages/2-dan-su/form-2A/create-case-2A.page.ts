import { Luong } from '../../common/buoc';
import { DonNguon, TrangThai2A, cauHinh2A, danhSachDon2A } from './cau-hinh-2A';
import { docTaiKhoanSync } from '../../../utils/tai-khoan';
import { buoc01 } from './buoc/01-them-don';

/**
 * Biểu mẫu 2A — vụ án dân sự sơ thẩm (đơn khởi kiện → thụ lý → phân công), theo file hướng dẫn
 * src/step/2-dan-su/form-2A/HD 2A.docx.
 *
 * Mỗi bước một file trong ./buoc/, chứa đầy đủ thao tác màn hình của bước đó (dùng chung ở ./buoc/chung.ts).
 * Giao diện đổi → chỉ sửa trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_2A: Luong<DonNguon, TrangThai2A> = {
  linhVuc: cauHinh2A.linhVuc,
  bieuMau: cauHinh2A.bieuMau,
  dsVuAn: danhSachDon2A(cauHinh2A),
  dsTaiKhoan: docTaiKhoanSync(),
  cacBuoc: [buoc01],
};
