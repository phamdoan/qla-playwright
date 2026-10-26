import { Luong } from '../../common/buoc';
import { DonNguon, TrangThai10A, cauHinh10A, danhSachDon10A } from './cau-hinh-10A';
import { docTaiKhoanSync } from '../../../utils/tai-khoan';
import { buoc01 } from './buoc/01-them-don';
import { buoc02 } from './buoc/02-phan-cong-hoa-giai';
import { buoc03 } from './buoc/03-thong-bao-01-hg';
import { buoc04 } from './buoc/04-ghi-nhan-ket-qua';

/**
 * Biểu mẫu 10A — tranh chấp dân sự được hòa giải tại Tòa án, theo file hướng dẫn
 * src/step/10-hoa-giai/form-10A/HD 10A.docx.
 *
 * Mỗi bước một file trong ./buoc/, chứa đầy đủ thao tác màn hình của bước đó (dùng chung ở ./buoc/chung.ts).
 * Giao diện đổi → chỉ sửa trong ./buoc/. Thêm/bớt/đổi thứ tự bước: sửa danh sách `cacBuoc`.
 */
export const LUONG_10A: Luong<DonNguon, TrangThai10A> = {
  linhVuc: cauHinh10A.linhVuc,
  bieuMau: cauHinh10A.bieuMau,
  dsVuAn: danhSachDon10A(cauHinh10A),
  dsTaiKhoan: docTaiKhoanSync(),
  cacBuoc: [buoc01, buoc02, buoc03, buoc04],
};
