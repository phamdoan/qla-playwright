/**
 * FLOW BCTK 001 — MỘT FILE, kiểm chức năng Báo cáo thống kê cho từng biểu mẫu (case).
 *
 * Luồng chỉ ĐỌC báo cáo, trừ bước 05 (lưu báo cáo). Cả 8 bước đang `fixme` cho tới khi xác minh
 * được màn BCTK thật — xem flows/bao-cao-thong-ke/flow-001-lap-bao-cao/flow.ts.
 *
 *   node tools/lineage.js bao-cao-thong-ke/flow-001-lap-bao-cao
 */
import { khaiLuong } from '../../../khung/luong';
import { CAI_DAT } from '../../../flows/bao-cao-thong-ke/flow-001-lap-bao-cao/cai-dat';
import { FLOW_BCTK_001 } from '../../../flows/bao-cao-thong-ke/flow-001-lap-bao-cao/flow';
import { DS_CASE } from '../../../data/bao-cao-thong-ke/flow-001-lap-bao-cao/cases';

khaiLuong({
  flow: FLOW_BCTK_001,
  dsCase: DS_CASE,
  caiDat: CAI_DAT,
  /** Hai vai trừu tượng trong flow.ts → tài khoản thật khai ở input.ts của case */
  vai: (buoc, input) =>
    buoc.vai === 'canBoThongKe' ? input.vaiLapBaoCao : buoc.vai === 'khongQuyenThongKe' ? input.vaiKhongQuyen : buoc.vai,
});
