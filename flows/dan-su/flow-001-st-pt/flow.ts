/**
 * FLOW_DS_001 — LUỒNG VỤ ÁN DÂN SỰ: đơn khởi kiện → sơ thẩm → kháng cáo → phúc thẩm.
 *
 * Đặc tả: `docs/stepdata/StepData_DanSu_VuAn.txt` (229 dòng).
 *
 * TÁI DÙNG NGUYÊN BỘ BƯỚC 01→23 CỦA LUỒNG KDTM, không chép lại khai báo.
 *
 * Vì sao được: đối chiếu từng mục của hai đặc tả thì hai luồng đi **cùng màn, cùng biểu mẫu, cùng thứ
 * tự** — kể cả route: luồng KDTM vốn chạy trên `vu-an/dan-su/so-tham/chi-tiet` (màn dân sự dùng chung
 * cho các loại án, xem ghi chú đầu flow.ts của KDTM). Khác nhau nằm ở DỮ LIỆU GIEO:
 *   · Loại đơn "Dân sự" thay vì "Kinh doanh, thương mại"
 *   · Quan hệ pháp luật: tranh chấp dân sự (vd. hợp đồng vay tài sản) thay vì mua bán hàng hoá
 *   · Tư cách đương sự: "Người khởi kiện"/"Người bị kiện" (đặc tả DS b6) — KDTM dùng nguyên đơn/bị đơn
 * …nên đây là FLOW RIÊNG nhưng dùng chung THÂN BƯỚC; dữ liệu ở `data/dan-su/flow-001-st-pt/`.
 *
 * KHÁC VỀ PHẠM VI: đặc tả dân sự DỪNG Ở PHÚC THẨM (Step4.7), không có giai đoạn GĐT/TT. Nên luồng này
 * chỉ lấy bước 01→23 của KDTM và bỏ toàn bộ cụm GĐT (24→45).
 *
 * MỘT MÂU THUẪN TRONG CHÍNH ĐẶC TẢ (ghi lại để người sau khỏi tưởng kịch bản sai):
 * b4.10 yêu cầu chọn "Không tiến hành hòa giải tại Tòa án" + lý do, nhưng Step5.5–5.7 lại lập Biên bản
 * hòa giải 34-DS và kiểm "Phiên họp lần 1". Vụ đã đánh dấu KHÔNG hòa giải thì màn không mở 34-DS/35-DS.
 * Bước 09 xử lý đúng như vậy: lập 31-DS, còn 34/35 ghi "(không áp dụng — vụ không hòa giải)".
 * Muốn chạy nhánh CÓ hòa giải thì gieo `khongHoaGiai: false` trong input của case.
 */
import { DinhNghiaFlow } from '../../../khung/flow';
import { FLOW_001 as FLOW_KDTM } from '../../kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/flow';

/** Bước cuối của luồng dân sự: hết phúc thẩm (23), không có GĐT/TT */
const BUOC_CUOI = 23;

export const FLOW_DS_001: DinhNghiaFlow = {
  phanHe: 'dan-su',
  flow: 'flow-001-st-pt',
  module: 'DAN_SU',
  ten: 'Dân sự: đơn khởi kiện → bản án sơ thẩm 52-DS → kháng cáo → bản án phúc thẩm 75-DS',
  nguon: 'docs/stepdata/StepData_DanSu_VuAn.txt',
  buoc: FLOW_KDTM.buoc
    .filter(b => Number(b.ma.slice(0, 2)) <= BUOC_CUOI)
    .map(b => ({
      ...b,
      // Giữ nguyên mã/thứ tự/khoá bàn giao; chỉ đổi NGUỒN ĐẶC TẢ cho đúng tài liệu của luồng này
      nguon: b.nguon.replace(/^StepData KDTM/, 'StepData DS'),
    })),
};
