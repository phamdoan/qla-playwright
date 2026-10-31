import { Luong } from '../../common/buoc';
import { TrangThai1A1, VuNguon, cauHinh1A1, danhSachVu1A1 } from './cau-hinh-1A1';
import { docTaiKhoanSync } from '../../../utils/tai-khoan';
import { buoc01 } from './buoc/01-tao-ho-so';
import { buoc02 } from './buoc/02-tiep-nhan-ho-so';
import { buoc03 } from './buoc/03-them-bi-can-phap-nhan';
import { buoc04 } from './buoc/04-them-nguoi-bao-chua';
import { buoc05 } from './buoc/05-thu-ly';
import { buoc06 } from './buoc/06-phan-cong-tham-phan';
import { buoc07 } from './buoc/07-phan-cong-hoi-tham';
import { buoc08 } from './buoc/08-quyet-dinh-xet-xu';
import { buoc09 } from './buoc/09-tao-ban-an';

/**
 * Biểu mẫu 1A1 — vụ án hình sự sơ thẩm, bị can là pháp nhân thương mại, theo file hướng dẫn
 * src/step/1-hinh-su/form-1A1/HD 1A1.docx.
 *
 * Mỗi bước một file trong ./buoc/, chứa đầy đủ thao tác màn hình của bước đó (dùng chung ở ./buoc/chung.ts).
 * Giao diện đổi → chỉ sửa trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_1A1: Luong<VuNguon, TrangThai1A1> = {
  linhVuc: cauHinh1A1.linhVuc,
  bieuMau: cauHinh1A1.bieuMau,
  dsVuAn: danhSachVu1A1(cauHinh1A1),
  dsTaiKhoan: docTaiKhoanSync(),
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08, buoc09],
};
