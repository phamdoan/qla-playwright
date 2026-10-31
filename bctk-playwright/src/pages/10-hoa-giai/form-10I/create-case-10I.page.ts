import { Luong } from '../../common/buoc';
import { DonNguon, TrangThai10I, cauHinh10I, danhSachDon10I } from './cau-hinh-10I';
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
 * Biểu mẫu 10I — khiếu kiện hành chính được đối thoại tại Tòa án (luồng như 10C, Loại đơn "Hành chính"; thêm đơn như 6A), theo file hướng dẫn
 * src/step/10-hoa-giai/form-10I/HD 10I.docx.
 *
 * Mỗi bước một file trong ./buoc/, chứa đầy đủ thao tác màn hình của bước đó (dùng chung ở ./buoc/chung.ts).
 * Giao diện đổi → chỉ sửa trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_10I: Luong<DonNguon, TrangThai10I> = {
  linhVuc: cauHinh10I.linhVuc,
  bieuMau: cauHinh10I.bieuMau,
  dsVuAn: danhSachDon10I(cauHinh10I),
  dsTaiKhoan: docTaiKhoanSync(),
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08],
};
