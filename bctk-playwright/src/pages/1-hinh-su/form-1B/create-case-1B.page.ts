import { Luong } from '../../common/buoc';
import { TrangThai1B, VuAnNguon, cauHinh1B, docVuAnMoi1B } from './cau-hinh-1B';
import { docTaiKhoanSync } from '../../../utils/tai-khoan';
import { buoc01 } from './buoc/01-so-tham-khang-cao';
import { buoc02 } from './buoc/02-so-tham-duyet';
import { buoc03 } from './buoc/03-so-tham-thong-bao';
import { buoc04 } from './buoc/04-so-tham-chuyen-ho-so';
import { buoc05 } from './buoc/05-phuc-tham-tiep-nhan';
import { buoc06 } from './buoc/06-phuc-tham-thu-ly';
import { buoc07 } from './buoc/07-phuc-tham-phan-cong';
import { buoc08 } from './buoc/08-ky-phan-cong';
import { buoc09 } from './buoc/09-quyet-dinh-xet-xu';
import { buoc10 } from './buoc/10-ky-quyet-dinh';
import { buoc11 } from './buoc/11-tao-ban-an';

/**
 * Biểu mẫu 1B — tạo vụ án phúc thẩm hình sự, theo file hướng dẫn
 * src/step/1-hinh-su/form-1B/HS phúc thẩm tòa PT tối cao (1).docx.
 *
 * Mỗi bước một file trong ./buoc/, chứa đầy đủ thao tác màn hình của bước đó (thao tác dùng chung nhiều bước
 * ở ./buoc/chung.ts). Giao diện đổi → chỉ sửa trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_1B: Luong<VuAnNguon, TrangThai1B> = {
  linhVuc: cauHinh1B.linhVuc,
  bieuMau: cauHinh1B.bieuMau,
  dsVuAn: docVuAnMoi1B(cauHinh1B),
  dsTaiKhoan: [...docTaiKhoanSync(), ...cauHinh1B.taiKhoanBoSung],
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08, buoc09, buoc10, buoc11],
};
