import { Luong } from '../../common/buoc';
import { BIEU_MAU_10K, Don10K, LINH_VUC_10K, TrangThai10K, docDon10K } from './cau-hinh-10K';
import { docTaiKhoanSync } from '../../../utils/tai-khoan';
import { buoc01 } from './buoc/01-them-de-nghi';
import { buoc02 } from './buoc/02-yeu-cau-chuyen-ho-so';
import { buoc03 } from './buoc/03-ghi-nhan-nhan-ho-so';
import { buoc04 } from './buoc/04-thu-ly-ho-so';
import { buoc05 } from './buoc/05-phan-cong-tham-phan';
import { buoc06 } from './buoc/06-them-hoat-dong';
import { buoc07 } from './buoc/07-ra-quyet-dinh';

/**
 * Biểu mẫu 10K — đề nghị/kiến nghị xem xét lại quyết định công nhận kết quả đối thoại thành,
 * theo file hướng dẫn src/step/10-hoa-giai/form-10K/HD 10K.docx.
 * Đầu vào: data-form-10K.xlsx (mỗi dòng một đơn 10I đã đối thoại thành). Mỗi bước một file trong ./buoc/.
 * Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_10K: Luong<Don10K, TrangThai10K> = {
  linhVuc: LINH_VUC_10K,
  bieuMau: BIEU_MAU_10K,
  dsVuAn: docDon10K(),
  dsTaiKhoan: docTaiKhoanSync(),
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07],
};
