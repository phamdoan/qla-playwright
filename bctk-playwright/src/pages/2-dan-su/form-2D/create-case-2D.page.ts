import { Luong } from '../../common/buoc';
import { BIEU_MAU_2D, BanAn2D, LINH_VUC_2D, TrangThai2D, docBanAn2D, TK_VU_TRUONG } from './cau-hinh-2D';
import { docTaiKhoanSync } from '../../../utils/tai-khoan';
import { buoc01 } from './buoc/01-them-ho-so-khang-nghi';
import { buoc02 } from './buoc/02-phan-cong-tham-phan';
import { buoc03 } from './buoc/03-phan-cong-tham-tra-vien';
import { buoc04 } from './buoc/04-ky-to-trinh-phan-cong';
import { buoc05 } from './buoc/05-tao-lich-xet-xu';
import { buoc06 } from './buoc/06-phe-duyet-chuong-trinh';
import { buoc07 } from './buoc/07-quyet-dinh-thanh-lap-hdxx';
import { buoc08 } from './buoc/08-ky-quyet-dinh-hdxx';
import { buoc09 } from './buoc/09-quan-ly-vu-xet-xu';

/**
 * Biểu mẫu 2D — vụ án dân sự giám đốc thẩm, theo file hướng dẫn src/step/2-dan-su/form-2D/HD 2D.docx.
 * Đầu vào: data-form-2D.xlsx (mỗi dòng một bản án bị kháng nghị). Hai tài khoản: Vụ trưởng (làm) và lãnh đạo TANDTC (ký/duyệt).
 * Mỗi bước một file trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_2D: Luong<BanAn2D, TrangThai2D> = {
  linhVuc: LINH_VUC_2D,
  bieuMau: BIEU_MAU_2D,
  dsVuAn: docBanAn2D(),
  dsTaiKhoan: docTaiKhoanSync(),
  tkKetQua: TK_VU_TRUONG,
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08, buoc09],
};
