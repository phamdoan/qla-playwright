import { Luong } from '../../common/buoc';
import { BIEU_MAU_1D1, BanAn1D1, LINH_VUC_1D1, TrangThai1D1, docBanAn1D1, TK_VU_TRUONG } from './cau-hinh-1D1';
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
 * Biểu mẫu 1D1 — vụ án hình sự tái thẩm, theo file hướng dẫn src/step/1-hinh-su/form-1D1/HD 1D1.docx.
 * Đầu vào: data-form-1D1.xlsx (mỗi dòng một bản án bị kháng nghị). Hai tài khoản: Vụ trưởng Vụ GĐKT hình sự (làm)
 * và lãnh đạo TANDTC (ký/duyệt). Mỗi bước một file trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_1D1: Luong<BanAn1D1, TrangThai1D1> = {
  linhVuc: LINH_VUC_1D1,
  bieuMau: BIEU_MAU_1D1,
  dsVuAn: docBanAn1D1(),
  dsTaiKhoan: docTaiKhoanSync(),
  tkKetQua: TK_VU_TRUONG,
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08, buoc09],
};
