import { Luong } from '../../common/buoc';
import { DonNguon, TrangThai6A, cauHinh6A, danhSachDon6A } from './cau-hinh-6A';
import { docTaiKhoanSync } from '../../../utils/tai-khoan';
import { buoc01 } from './buoc/01-them-don';
import { buoc02 } from './buoc/02-phan-cong-tham-phan-don';
import { buoc03 } from './buoc/03-thong-bao-sua-doi-bo-sung';
import { buoc04 } from './buoc/04-nghia-vu-tam-ung';
import { buoc05 } from './buoc/05-thong-bao-04-hc';
import { buoc06 } from './buoc/06-ghi-nhan-nop-phi';
import { buoc07 } from './buoc/07-thu-ly-vu-an';
import { buoc08 } from './buoc/08-phan-cong-tham-phan';
import { buoc09 } from './buoc/09-phan-cong-thu-ky';
import { buoc10 } from './buoc/10-phan-cong-hoi-tham';
import { buoc11 } from './buoc/11-quyet-dinh-xet-xu';
import { buoc12 } from './buoc/12-bien-ban-phien-toa';
import { buoc13 } from './buoc/13-bien-ban-nghi-an';
import { buoc14 } from './buoc/14-tao-ban-an';

/**
 * Biểu mẫu 6A — vụ án hành chính sơ thẩm (đơn khởi kiện → thụ lý → phân công → chuẩn bị xét xử → xét xử → bản án), theo file hướng dẫn
 * src/step/6-hanh-chinh/form-6A/HD 6A.docx.
 *
 * Mỗi bước một file trong ./buoc/, chứa đầy đủ thao tác màn hình của bước đó (dùng chung ở ./buoc/chung.ts).
 * Giao diện đổi → chỉ sửa trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_6A: Luong<DonNguon, TrangThai6A> = {
  linhVuc: cauHinh6A.linhVuc,
  bieuMau: cauHinh6A.bieuMau,
  dsVuAn: danhSachDon6A(cauHinh6A),
  dsTaiKhoan: docTaiKhoanSync(),
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08, buoc09, buoc10, buoc11, buoc12, buoc13, buoc14],
};
