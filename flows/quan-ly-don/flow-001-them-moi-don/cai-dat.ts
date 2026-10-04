/**
 * FLOW-001 QUẢN LÝ ĐƠN · BẢNG CÀI ĐẶT: mã bước → thân nghiệp vụ.
 *
 * Bước nào chưa có ở đây thì khung đánh `fixme` — hiện trong `--list` để thấy luồng còn thiếu gì,
 * và KHÔNG bao giờ báo xanh giả.
 */
import type { BangCaiDat } from '../../../khung/luong';
import type { LoaiAn } from '../../../pages/them-moi-don.page';
import { kiemTraSauLuu, themMoiDon } from './them-moi.flow';

/** Dữ liệu gieo của một case thêm mới đơn — cái gì máy chủ sinh thì KHÔNG khai ở đây */
export interface InputThemMoiDon {
  /** Vai chạy cả luồng (cán bộ HCTP nhập đơn) */
  vaiNhapDon: string;
  /** `ocr` = bóc tách tệp PDF rồi điền phần thiếu · `khong-ocr` = bấm "Quay lại", nhập tay */
  duongVao: 'ocr' | 'khong-ocr';
  /** Khoá bộ mặc định theo loại án trong page object (`LOAI_AN`) */
  loaiAnMa: LoaiAn;

  // ── Ba ô mà hai spec cũ bỏ mặc định; giá trị hợp lệ đo bằng spec dò do-loai-qd-ba ──
  /** "Bản án" | "Quyết định" | "Quyết định miễn/giảm THA" */
  loaiQdBa?: string;
  /** "Trực tiếp" | "Tiếp công dân" | "Bưu điện" | "Điện tử" | "Nội bộ" */
  hinhThucNhan?: string;
  /** "Giám đốc thẩm" | "Tái thẩm" | "Giám đốc thẩm - Tái thẩm" | "Chưa xác định" */
  thuTucGiaiQuyet?: string;
  /** "Sơ thẩm" | "Phúc thẩm" | "Giám đốc thẩm" | "Tái thẩm" */
  capXetXu?: string;
  /** Ô "Quan hệ pháp luật" ở khối Người tham gia tố tụng — chữ tự do */
  quanHePhapLuat?: string;
}

export const CAI_DAT: BangCaiDat<InputThemMoiDon> = {
  '01-them-moi-don': ({ page, input, ghi }) => themMoiDon(page, input, ghi),
  '02-kiem-tra-sau-luu': ({ page, input, ghi }) => kiemTraSauLuu(page, input, ghi),
};
