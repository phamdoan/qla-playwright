import { Luong } from '../../common/buoc';
import { BIEU_MAU_1B, LINH_VUC_1B, TrangThai1B, VuAnNguon, docVuAn1B } from './cau-hinh-1B';
import { docTaiKhoanSync } from '../../../utils/tai-khoan';
import { buoc01 } from './buoc/01-so-tham-khang-cao';
import { buoc02 } from './buoc/02-so-tham-duyet';
import { buoc03 } from './buoc/03-so-tham-thong-bao';
import { buoc04 } from './buoc/04-so-tham-chuyen-ho-so';
import { buoc05 } from './buoc/05-phuc-tham-tiep-nhan';
import { buoc06 } from './buoc/06-phuc-tham-thu-ly';
import { buoc07 } from './buoc/07-phuc-tham-phan-cong';
import { buoc08 } from './buoc/08-quyet-dinh-xet-xu';
import { buoc09 } from './buoc/09-tao-ban-an';

/**
 * Biểu mẫu 1B — vụ án phúc thẩm hình sự (kháng cáo / kháng nghị), theo file hướng dẫn
 * src/step/1-hinh-su/form-1B/HD 1B.docx. Đầu vào: data-form-1B.xlsx (mỗi dòng một vụ án sơ thẩm đã xét xử, kèm link).
 *
 * Mỗi bước một file trong ./buoc/, chứa đầy đủ thao tác màn hình của bước đó (thao tác dùng chung nhiều bước
 * ở ./buoc/chung.ts). Giao diện đổi → chỉ sửa trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_1B: Luong<VuAnNguon, TrangThai1B> = {
  linhVuc: LINH_VUC_1B,
  bieuMau: BIEU_MAU_1B,
  dsVuAn: docVuAn1B(),
  dsTaiKhoan: docTaiKhoanSync(),
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08, buoc09],
};
