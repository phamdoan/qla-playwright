import { Luong } from '../../common/buoc';
import { BIEU_MAU_5D, BanAn5D, LINH_VUC_5D, TrangThai5D, docBanAn5D } from './cau-hinh-5D';
import { docTaiKhoanSync } from '../../../utils/tai-khoan';
import { buoc01 } from './buoc/01-them-ho-so-khang-nghi';
import { buoc02 } from './buoc/02-phan-cong-tham-phan';
import { buoc03 } from './buoc/03-ky-to-trinh-phan-cong';
import { buoc04 } from './buoc/04-phan-cong-tham-tra-vien';
import { buoc05 } from './buoc/05-tao-lich-xet-xu';
import { buoc06 } from './buoc/06-phe-duyet-chuong-trinh';
import { buoc07 } from './buoc/07-thu-ly-to-trinh-vu-xet-xu';
import { buoc08 } from './buoc/08-y-kien-to-trinh-vu-xet-xu';
import { buoc09 } from './buoc/09-quan-ly-vu-xet-xu';

/**
 * Biểu mẫu 5D — vụ án lao động tái thẩm, theo file hướng dẫn src/step/5-lao-dong/form-5D/HD 5D.docx.
 * Đầu vào: data-form-5D.xlsx (mỗi dòng một bản án bị kháng nghị). Hai tài khoản: Vụ trưởng Vụ GĐKT về kinh doanh thương mại, phá sản, lao động, gia đình & người chưa thành niên (làm)
 * và lãnh đạo TANDTC (ký/duyệt). Mỗi bước một file trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_5D: Luong<BanAn5D, TrangThai5D> = {
  linhVuc: LINH_VUC_5D,
  bieuMau: BIEU_MAU_5D,
  dsVuAn: docBanAn5D(),
  dsTaiKhoan: docTaiKhoanSync(),
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08, buoc09],
};
