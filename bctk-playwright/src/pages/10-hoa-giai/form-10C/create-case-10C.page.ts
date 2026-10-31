import { Luong } from '../../common/buoc';
import { DonNguon, TrangThai10C, cauHinh10C, danhSachDon10C } from './cau-hinh-10C';
import { docTaiKhoanSync } from '../../../utils/tai-khoan';
import { buoc01 } from './buoc/01-them-don';
import { buoc02 } from './buoc/02-phan-cong-hoa-giai';
import { buoc03 } from './buoc/03-thong-bao-01-hg';
import { buoc04 } from './buoc/04-ghi-nhan-ket-qua';
import { buoc05 } from './buoc/05-chi-dinh-hoa-giai-vien';
import { buoc06 } from './buoc/06-thong-bao-07-hg';
import { buoc07 } from './buoc/07-ghi-nhan-ket-qua-hoa-giai';
import { buoc08 } from './buoc/08-quyet-dinh-cong-nhan';

/**
 * Biểu mẫu 10C — tranh chấp hôn nhân và gia đình được hòa giải tại Tòa án (luồng như 10A, Loại đơn "Hôn nhân gia đình"), theo file hướng dẫn
 * src/step/10-hoa-giai/form-10C/HD 10C.docx.
 *
 * Mỗi bước một file trong ./buoc/, chứa đầy đủ thao tác màn hình của bước đó (dùng chung ở ./buoc/chung.ts).
 * Giao diện đổi → chỉ sửa trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_10C: Luong<DonNguon, TrangThai10C> = {
  linhVuc: cauHinh10C.linhVuc,
  bieuMau: cauHinh10C.bieuMau,
  dsVuAn: danhSachDon10C(cauHinh10C),
  dsTaiKhoan: docTaiKhoanSync(),
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08],
};
