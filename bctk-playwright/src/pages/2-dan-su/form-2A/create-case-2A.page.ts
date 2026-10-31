import { Luong } from '../../common/buoc';
import { DonNguon, TrangThai2A, cauHinh2A, danhSachDon2A } from './cau-hinh-2A';
import { docTaiKhoanSync } from '../../../utils/tai-khoan';
import { buoc01 } from './buoc/01-them-don';
import { buoc02 } from './buoc/02-phan-cong-tham-phan-don';
import { buoc03 } from './buoc/03-thong-bao-26-ds';
import { buoc04 } from './buoc/04-nghia-vu-tam-ung';
import { buoc05 } from './buoc/05-thong-bao-29-ds';
import { buoc06 } from './buoc/06-ghi-nhan-nop-phi';
import { buoc07 } from './buoc/07-thu-ly-vu-an';
import { buoc08 } from './buoc/08-phan-cong-tham-phan';
import { buoc09 } from './buoc/09-phan-cong-thu-ky';
import { buoc10 } from './buoc/10-phan-cong-hoi-tham';
import { buoc11 } from './buoc/11-quyet-dinh-xet-xu';
import { buoc12 } from './buoc/12-tao-ban-an';
import { thuLaiKhiMayChuLoi } from './buoc/chung';

/**
 * Biểu mẫu 2A — vụ án dân sự sơ thẩm (đơn khởi kiện → thụ lý → phân công → xét xử → bản án), theo file hướng dẫn
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
  // Máy chủ STG báo lỗi giữa chừng → tự chạy lại bước (thuLaiKhiMayChuLoi)
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08, buoc09, buoc10, buoc11, buoc12].map(b => thuLaiKhiMayChuLoi(b)),
};
