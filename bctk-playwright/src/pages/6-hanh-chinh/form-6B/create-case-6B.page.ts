import { Luong } from '../../common/buoc';
import { BIEU_MAU_6B, LINH_VUC_6B, TrangThai6B, VuAn6B, docVuAn6B } from './cau-hinh-6B';
import { docTaiKhoanSync } from '../../../utils/tai-khoan';
import { buoc01 } from './buoc/01-tiep-nhan-khang-nghi';
import { buoc02 } from './buoc/02-don-khang-cao';
import { buoc03 } from './buoc/03-giay-xac-nhan-khang-cao';
import { buoc04 } from './buoc/04-thong-bao-khang-cao';
import { buoc05 } from './buoc/05-chuyen-ho-so';
import { buoc06 } from './buoc/06-tiep-nhan-ho-so';
import { buoc07 } from './buoc/07-thu-ly-phuc-tham';
import { buoc08 } from './buoc/08-phan-cong-tham-phan';
import { buoc09 } from './buoc/09-quyet-dinh-xet-xu';
import { buoc10 } from './buoc/10-bien-ban-phien-toa';
import { buoc11 } from './buoc/11-bien-ban-nghi-an';
import { buoc12 } from './buoc/12-tao-ban-an';

/**
 * Biểu mẫu 6B — vụ án hành chính phúc thẩm (kháng cáo và/hoặc kháng nghị), theo file hướng dẫn
 * src/step/6-hanh-chinh/form-6B/HD 6B.docx. Đầu vào: data-form-6B.xlsx (mỗi dòng một vụ sơ thẩm đã có bản án).
 *
 * Tài khoản mỗi bước lấy theo cột "Tòa án sơ thẩm" / "Tòa án phúc thẩm" của file đầu vào (tra Taikhoan.xlsx).
 * Mỗi bước một file trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_6B: Luong<VuAn6B, TrangThai6B> = {
  linhVuc: LINH_VUC_6B,
  bieuMau: BIEU_MAU_6B,
  dsVuAn: docVuAn6B(),
  dsTaiKhoan: docTaiKhoanSync(),
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08, buoc09, buoc10, buoc11, buoc12],
};
