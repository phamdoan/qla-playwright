/**
 * FLOW_KDTM_GDT_TT — MỘT FILE, chạy cả luồng từ đầu đến cuối cho từng case.
 *
 * ⚠ TẠO DỮ LIỆU THẬT. Chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1 (npm script có `--ghi`).
 *
 * Bản đồ 44 bước   : flows/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/flow.ts
 * Cài đặt từng bước: flows/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/cai-dat.ts
 * Case (dữ liệu)   : data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/cases.ts
 * Tài liệu         : docs/flow-kdtm-gdt-tt.md
 *
 * File này KHÔNG chứa nghiệp vụ và không cần sửa khi thêm bước hay thêm case.
 *
 *   npm run kdtm:flow-001:stg                              chạy cả luồng, mọi case
 *   npm run kdtm:flow-001:stg -- --case=case-001           chỉ một case
 *   npm run kdtm:flow-001:stg -- --buoc=01..06             chỉ bước 01–06
 */
import { khaiLuong } from '../../../khung/luong';
import { CAI_DAT } from '../../../flows/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/cai-dat';
import { FLOW_001 } from '../../../flows/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/flow';
import { DS_CASE } from '../../../data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/cases';

khaiLuong({
  flow: FLOW_001,
  dsCase: DS_CASE,
  caiDat: CAI_DAT,
  /**
   * Case chạy ở nhiều cấp tòa nên hai vai này lấy theo `input.ts`; các vai còn lại (GĐT/TT:
   * canBo, phoChanhAn, thamTraVienDanSu, thuKyVuDanSu, chanhVanPhong) GIỮ NGUYÊN như khai trong
   * flow.ts.
   *
   * Bản trước viết `… ? input.vaiPhucTham : input.vaiSoTham` nên ép MỌI vai không phải phúc thẩm
   * thành vai sơ thẩm — các bước GĐT 24–43 sẽ chạy sai tài khoản (đo 30/09/2026, chưa kịp lộ vì
   * chưa chạy tới đó).
   */
  vai: (buoc, input) =>
    buoc.vai === 'chanhAnPhucThamHanhChinh'
      ? input.vaiPhucTham
      : // 'chanhAn' ở các bước SƠ THẨM nghĩa là chánh án của tòa sơ thẩm (case-002: chanhAnDanSu).
        // Ở các bước GĐT/TT thì KHÔNG đổi: bước 42 cần đúng Chánh án TANDTC (STG: Nguyễn Văn Quảng =
        // `taiKhoan.chanhAn`) vì Chương trình làm việc HĐXX khoá người ký = chủ toạ = Chánh án.
        // Đo 02/10/2026: ánh xạ cũ đẩy bước 42 sang chanhAnDanSu nên hàng chờ duyệt không có văn bản.
        buoc.vai === 'chanhAn' && !(buoc.nguon ?? '').includes('GĐT/TT')
        ? input.vaiSoTham
        : buoc.vai,
});
