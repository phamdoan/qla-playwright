import { Luong } from '../../common/buoc';
import { DonNguon, TrangThai5A, cauHinh5A, danhSachDon5A } from './cau-hinh-5A';
import { docTaiKhoanSync } from '../../../utils/tai-khoan';
import { buoc01 } from './buoc/01-them-don';
import { buoc02 } from './buoc/02-phan-cong-tham-phan-don';
import { buoc03 } from './buoc/03-nghia-vu-tam-ung';
import { buoc04 } from './buoc/04-thong-bao-29-ds';
import { buoc05 } from './buoc/05-ghi-nhan-nop-phi';
import { buoc06 } from './buoc/06-thu-ly-vu-an';
import { buoc07 } from './buoc/07-phan-cong-tham-phan';
import { buoc08 } from './buoc/08-thong-bao-31-ds';
import { buoc09 } from './buoc/09-bien-ban-35-ds';
import { buoc10 } from './buoc/10-quyet-dinh-xet-xu';
import { buoc11 } from './buoc/11-bien-ban-nghi-an';
import { buoc12 } from './buoc/12-bien-ban-phien-toa';
import { buoc13 } from './buoc/13-tao-ban-an';

/**
 * Biểu mẫu 5A — vụ án lao động sơ thẩm (đơn khởi kiện → thụ lý → chuẩn bị xét xử → xét xử → bản án),
 * theo file hướng dẫn src/step/5-lao-dong/form-5A/HD 5A.docx.
 *
 * Mỗi bước một file trong ./buoc/, chứa đầy đủ thao tác màn hình của bước đó (dùng chung ở ./buoc/chung.ts).
 * Giao diện đổi → chỉ sửa trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_5A: Luong<DonNguon, TrangThai5A> = {
  linhVuc: cauHinh5A.linhVuc,
  bieuMau: cauHinh5A.bieuMau,
  dsVuAn: danhSachDon5A(cauHinh5A),
  dsTaiKhoan: docTaiKhoanSync(),
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08, buoc09, buoc10, buoc11, buoc12, buoc13],
};
