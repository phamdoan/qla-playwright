import { Luong } from '../../common/buoc';
import { BIEU_MAU_10B, Don10B, LINH_VUC_10B, TrangThai10B, docDon10B } from './cau-hinh-10B';
import { docTaiKhoanSync } from '../../../utils/tai-khoan';
import { buoc01 } from './buoc/01-them-de-nghi';
import { buoc02 } from './buoc/02-yeu-cau-chuyen-ho-so';
import { buoc03 } from './buoc/03-ghi-nhan-nhan-ho-so';
import { buoc04 } from './buoc/04-thu-ly-ho-so';
import { buoc05 } from './buoc/05-phan-cong-tham-phan';
import { buoc06 } from './buoc/06-them-hoat-dong';
import { buoc07 } from './buoc/07-ra-quyet-dinh';

/**
 * Biểu mẫu 10B — đề nghị/kiến nghị xem xét lại quyết định công nhận kết quả hòa giải thành,
 * theo file hướng dẫn src/step/10-hoa-giai/form-10B/HD 10B.docx.
 * Đầu vào: data-form-10B.xlsx (mỗi dòng một đơn 10A đã hòa giải thành). Mỗi bước một file trong ./buoc/.
 * Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_10B: Luong<Don10B, TrangThai10B> = {
  linhVuc: LINH_VUC_10B,
  bieuMau: BIEU_MAU_10B,
  dsVuAn: docDon10B(),
  dsTaiKhoan: docTaiKhoanSync(),
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07],
};
