import { Luong } from '../../common/buoc';
import { DonNguon, TrangThai3A, cauHinh3A, danhSachDon3A } from './cau-hinh-3A';
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

/**
 * Biểu mẫu 3A — vụ án hôn nhân và gia đình sơ thẩm (ly hôn) (đơn khởi kiện → thụ lý → phân công), theo file hướng dẫn
 * src/step/3-hon-nhan-gia-dinh/form-3A/HD 3A.docx.
 *
 * Mỗi bước một file trong ./buoc/, chứa đầy đủ thao tác màn hình của bước đó (dùng chung ở ./buoc/chung.ts).
 * Giao diện đổi → chỉ sửa trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_3A: Luong<DonNguon, TrangThai3A> = {
  linhVuc: cauHinh3A.linhVuc,
  bieuMau: cauHinh3A.bieuMau,
  dsVuAn: danhSachDon3A(cauHinh3A),
  dsTaiKhoan: docTaiKhoanSync(),
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08, buoc09, buoc10],
};
