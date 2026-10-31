import { Luong } from '../../common/buoc';
import { DonNguon, TrangThai10E, cauHinh10E, danhSachDon10E } from './cau-hinh-10E';
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
 * Biểu mẫu 10E — tranh chấp kinh doanh, thương mại được hòa giải tại Tòa án (luồng như 10C, Loại đơn "Kinh doanh, thương mại"), theo file hướng dẫn
 * src/step/10-hoa-giai/form-10E/HD 10E.docx.
 *
 * Mỗi bước một file trong ./buoc/, chứa đầy đủ thao tác màn hình của bước đó (dùng chung ở ./buoc/chung.ts).
 * Giao diện đổi → chỉ sửa trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_10E: Luong<DonNguon, TrangThai10E> = {
  linhVuc: cauHinh10E.linhVuc,
  bieuMau: cauHinh10E.bieuMau,
  dsVuAn: danhSachDon10E(cauHinh10E),
  dsTaiKhoan: docTaiKhoanSync(),
  cacBuoc: [buoc01, buoc02, buoc03, buoc04, buoc05, buoc06, buoc07, buoc08],
};
