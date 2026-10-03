/**
 * FLOW_DAN_SU — MỘT FILE, chạy cả luồng dân sự từ đầu đến cuối cho từng case.
 *
 * ⚠ TẠO DỮ LIỆU THẬT. Chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1 (npm script có `--ghi`).
 *
 * Bản đồ bước  : flows/dan-su/flow-001-st-pt/flow.ts  (tái dùng bước 01→23 của luồng KDTM)
 * Cài đặt bước : flows/dan-su/flow-001-st-pt/cai-dat.ts (dùng chung thân bước với KDTM)
 * Case (dữ liệu): data/dan-su/flow-001-st-pt/cases.ts
 * Đặc tả       : docs/stepdata/StepData_DanSu_VuAn.txt
 *
 *   npm run kdtm:flow-001:stg -- --file=dan-su/flows/flow-001-st-pt
 */
import { khaiLuong } from '../../../khung/luong';
import { CAI_DAT } from '../../../flows/dan-su/flow-001-st-pt/cai-dat';
import { FLOW_DS_001 } from '../../../flows/dan-su/flow-001-st-pt/flow';
import { DS_CASE } from '../../../data/dan-su/flow-001-st-pt/cases';

khaiLuong({
  flow: FLOW_DS_001,
  dsCase: DS_CASE,
  caiDat: CAI_DAT,
  /**
   * Vai của luồng dân sự: toàn bộ bước sơ thẩm/phúc thẩm chạy bằng vai khai trong flow (kế thừa từ
   * KDTM). Luồng này KHÔNG có bước GĐT nên không cần ánh xạ 'chanhAn' như spec KDTM.
   */
  vai: (buoc, input) => (buoc.vai === 'chanhAnPhucThamHanhChinh' ? input.vaiPhucTham : buoc.vai === 'chanhAn' ? input.vaiSoTham : buoc.vai),
});
