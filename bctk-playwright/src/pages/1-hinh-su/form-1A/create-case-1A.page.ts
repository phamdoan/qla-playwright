import { Luong } from '../../common/buoc';
import { TrangThai1A, VuNguon, cauHinh1A, danhSachVu1A } from './cau-hinh-1A';
import { docTaiKhoanSync } from '../../../utils/tai-khoan';
import { buoc01 } from './buoc/01-tao-ho-so';
import { buoc02 } from './buoc/02-tiep-nhan-ho-so';
import { buoc03 } from './buoc/03-them-bi-can-ca-nhan';
import { buoc04 } from './buoc/04-them-nguoi-bao-chua';
import { buoc05 } from './buoc/05-thu-ly';
import { buoc06 } from './buoc/06-phan-cong-tham-phan';
import { buoc07 } from './buoc/07-phan-cong-hoi-tham';
import { buoc08 } from './buoc/08-quyet-dinh-xet-xu';
import { buoc09 } from './buoc/09-tao-ban-an';

/**
 * Biểu mẫu 1A — vụ án hình sự sơ thẩm, bị can là cá nhân, theo file hướng dẫn
 * src/step/1-hinh-su/form-1A/HD 1A.docx.
 *
 * Mỗi bước một file trong ./buoc/, chứa đầy đủ thao tác màn hình của bước đó (dùng chung ở ./buoc/chung.ts).
 * Giao diện đổi → chỉ sửa trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_1A: Luong<VuNguon, TrangThai1A> = {
  linhVuc: cauHinh1A.linhVuc,
  bieuMau: cauHinh1A.bieuMau,
  dsVuAn: danhSachVu1A(cauHinh1A),
  dsTaiKhoan: docTaiKhoanSync(),
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08, buoc09],
};
