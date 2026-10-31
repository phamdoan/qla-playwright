import { test } from '@playwright/test';
import { Buoc, Luong } from '../../common/buoc';
import { BIEU_MAU_2C, BanAn2C, LINH_VUC_2C, TrangThai2C, docBanAn2C } from './cau-hinh-2C';
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
import { thuLaiKhiMayChuLoi } from '../form-2A/buoc/chung';

/**
 * Mỗi bước tối đa 20 phút: bước của lãnh đạo dò "Chờ duyệt" qua hàng chục đề xuất, máy chạy song song nhiều luồng
 * thì một thao tác mất 10–30s (30/10: bước 06, 07 hết 10 phút giữa chừng)
 */
const choPhepCham = (b: Buoc<BanAn2C, TrangThai2C>): Buoc<BanAn2C, TrangThai2C> => ({
  ...b,
  chay: nc => {
    test.setTimeout(Math.max(test.info().timeout, 1_200_000));
    return b.chay(nc);
  },
});

/**
 * Biểu mẫu 2C — vụ án dân sự giám đốc thẩm, theo file hướng dẫn src/step/2-dan-su/form-2C/HD 2C.docx.
 * Đầu vào: data-form-2C.xlsx (mỗi dòng một bản án bị kháng nghị). Hai tài khoản: Vụ trưởng (làm) và lãnh đạo TANDTC (ký/duyệt).
 * Mỗi bước một file trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_2C: Luong<BanAn2C, TrangThai2C> = {
  linhVuc: LINH_VUC_2C,
  bieuMau: BIEU_MAU_2C,
  dsVuAn: docBanAn2C(),
  dsTaiKhoan: docTaiKhoanSync(),
  // Máy chủ báo lỗi / bị đẩy về Trang chủ, đăng nhập giữa bước → chạy lại bước (dùng chung với 2A)
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08, buoc09].map(b => thuLaiKhiMayChuLoi(choPhepCham(b))),
};
