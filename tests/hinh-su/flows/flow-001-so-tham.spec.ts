/**
 * FLOW HÌNH SỰ 001 — MỘT FILE, chạy cả luồng sơ thẩm từ đầu đến cuối cho từng case.
 *
 * ⚠ TẠO DỮ LIỆU THẬT. Chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1 (npm script có `--ghi`).
 *
 *   node tools/chay-ui.js stg --ghi --cli --buoc=01
 */
import { khaiLuong } from '../../../khung/luong';
import { CAI_DAT } from '../../../flows/hinh-su/flow-001-so-tham/cai-dat';
import { FLOW_HS_001 } from '../../../flows/hinh-su/flow-001-so-tham/flow';
import { DS_CASE } from '../../../data/hinh-su/flow-001-so-tham/cases';

khaiLuong({
  flow: FLOW_HS_001,
  dsCase: DS_CASE,
  caiDat: CAI_DAT,
  /** Cả luồng sơ thẩm chạy bằng một tài khoản Tòa khu vực — khai ở input.ts */
  vai: (buoc, input) => (buoc.vai === 'toaKhuVuc' ? input.vaiToaKhuVuc : buoc.vai),
  /**
   * Bước 01 là wizard 6 màn với drawer bị can ~150 ô (riêng 5 nhóm địa chỉ là 10 dropdown) nên
   * 10 phút mặc định không đủ: lượt 01/10/2026 hết hạn ngay ở màn "Tham gia tố tụng", và Playwright
   * đóng context nên lỗi in ra lại là "không thấy nút Tiếp theo" — sai hẳn chỗ.
   */
  phut: buoc => (buoc.ma === '01-tao-vu-an' ? 30 : 10),
});
