import { Luong } from '../../common/buoc';
import { BIEU_MAU_5B, LINH_VUC_5B, TrangThai5B, VuAn5B, docVuAn5B } from './cau-hinh-5B';
import { docTaiKhoanSync } from '../../../utils/tai-khoan';
import { buoc01 } from './buoc/01-tiep-nhan-khang-nghi';
import { buoc02 } from './buoc/02-giay-xac-nhan-khang-nghi';
import { buoc03 } from './buoc/03-gui-ho-so';
import { buoc04 } from './buoc/04-tiep-nhan-ho-so-phuc-tham';
import { buoc05 } from './buoc/05-thu-ly-phuc-tham';
import { buoc06 } from './buoc/06-phan-cong-hdxx';
import { buoc07 } from './buoc/07-quyet-dinh-xet-xu-phuc-tham';
import { buoc08 } from './buoc/08-bien-ban-nghi-an';
import { buoc09 } from './buoc/09-bien-ban-phien-toa';
import { buoc10 } from './buoc/10-ban-an-phuc-tham';

/**
 * Biểu mẫu 5B — vụ án lao động phúc thẩm, luồng KHÁNG NGHỊ, theo file hướng dẫn
 * src/step/5-lao-dong/form-5B/HD 5B.docx. Đầu vào: data-form-5B.xlsx (mỗi dòng một vụ sơ thẩm đã có bản án).
 *
 * Tài khoản mỗi bước lấy theo cột "Tòa sơ thẩm" / "Tòa phúc thẩm" của file đầu vào (tra Taikhoan.xlsx).
 * Mỗi bước một file trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_5B: Luong<VuAn5B, TrangThai5B> = {
  linhVuc: LINH_VUC_5B,
  bieuMau: BIEU_MAU_5B,
  dsVuAn: docVuAn5B(),
  dsTaiKhoan: docTaiKhoanSync(),
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08, buoc09, buoc10],
};
