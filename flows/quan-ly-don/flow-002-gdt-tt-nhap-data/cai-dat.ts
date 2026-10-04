/**
 * FLOW-002 QUẢN LÝ ĐƠN · BẢNG CÀI ĐẶT — 22 bước GĐT/TT, dùng thân bước của luồng KDTM, THAY bước 24.
 *
 * 21 bước sau (25→45) lấy nguyên từ `flow-001-st-pt-gdt-bao-cao` — đã chạy xanh trọn trên STG. Chép
 * ra là có hai bản sao rồi lệch nhau dần.
 *
 * ───────────────────────── VÌ SAO PHẢI THAY BƯỚC 24 ─────────────────────────
 *
 * Bước 24 của luồng KDTM vào ĐÚNG màn cần (`quan-ly-don/danh-sach-don` → "Thêm mới"), nhưng thân
 * bước (`common/buoc-nhap-don.ts · nhapDonTuBanAn`) giả định BẢN ÁN ĐÃ CÓ TRONG HỆ THỐNG — hợp lý
 * trên STG, vì ở đó bước 22 của chính case vừa sinh ra bản án. Nó phụ thuộc bản án cũ ở BỐN chỗ:
 *
 *   1. `traCuuBanAn({ batBuocTimThay: true })` — không tìm thấy là dừng;
 *   2. `chonNguoiTuBanAnCu()` — lấy đương sự từ bản án cũ;
 *   3. `goiYNoiDungDon()` + đòi nội dung phải NHẮC số bản án;
 *   4. `loaiAnHienTai()` phải khớp loại án mà tra cứu tự điền.
 *
 * Trên môi trường TRẮNG (pre-prod) không có bản án nào → cả bốn chỗ đều hỏng. Màn thì vẫn cho nhập
 * tay: tra cứu không ra thì thêm "bản án/quyết định liên quan" bằng tay. Đó chính là đường mà
 * `flow-001-them-moi-don · themMoiDon` đi, nên bước 24 ở đây dùng thân bước đó rồi ĐỔI TÊN KHOÁ sang
 * `gdtIdDon` / `gdtMaDon` / `gdtSoThuLyDon` cho các bước 25→45 đọc được.
 */
import type { BangCaiDat } from '../../../khung/luong';
import type { InputKdtm } from '../../kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/cai-dat';
import { CAI_DAT as CAI_DAT_KDTM } from '../../kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/cai-dat';
import { themMoiDon } from '../flow-001-them-moi-don/them-moi.flow';
import type { InputThemMoiDon } from '../flow-001-them-moi-don/cai-dat';

/** Dữ liệu gieo: y như KDTM (hạt giống của case), cộng phần khai cho màn Thêm mới đơn */
export type InputGdtTt = InputKdtm & Pick<InputThemMoiDon, 'duongVao' | 'loaiAnMa'> & Partial<InputThemMoiDon>;

export const CAI_DAT: BangCaiDat<InputGdtTt> = {
  ...(CAI_DAT_KDTM as unknown as BangCaiDat<InputGdtTt>),

  /** BƯỚC 2 của đặc tả — nhập đơn trên môi trường chưa có bản án nào */
  '24-gdt-tao-don-de-nghi': async ({ page, input, ghi }) => {
    const kq = await themMoiDon(page, input as unknown as InputThemMoiDon, ghi);
    /**
     * Đổi tên khoá sang ĐÚNG khoá mà `banAnTuState` đọc (soBanAnPhucTham / ngayBanAnPhucTham /
     * toaRaBanAnPhucTham) — trên luồng 45 bước chúng do bước 22 sinh ra. Nhờ vậy bước 27→45 dùng
     * NGUYÊN thân bước của KDTM, không cần sửa gì thêm.
     */
    return {
      gdtIdDon: kq.idDon,
      gdtMaDon: kq.maDon,
      gdtSoThuLyDon: kq.soThuLy,
      soBanAnPhucTham: kq.soBanAn,
      ngayBanAnPhucTham: kq.ngayBanAn,
      toaRaBanAnPhucTham: kq.toaAn,
    };
  },
};
