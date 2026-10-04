/**
 * FLOW-002 QUẢN LÝ ĐƠN · NHẬP DATA GĐT/TT — ĐỦ 22 BƯỚC theo đặc tả.
 *
 * Nguồn: `docs/stepdata/GDT-TT-bao-cao-thong-ke.txt` — **BƯỚC 2 → BƯỚC 23**.
 *
 * ───────────────────────── VÌ SAO CÓ LUỒNG NÀY ─────────────────────────
 *
 * `flow-001-them-moi-don` chỉ có 2 bước (nhập đơn + kiểm lại) — tức chỉ phủ **BƯỚC 2** của đặc tả.
 * Đặc tả thì dài 22 bước, đi qua 6 vai, tới tận màn Quản lý vụ xét xử:
 *
 *   BƯỚC 2  nhập dữ liệu đơn & tạo hồ sơ        BƯỚC 13 phê duyệt dự thảo kháng nghị
 *   BƯỚC 3  phân công thẩm phán                 BƯỚC 14 chuyển và nhận hồ sơ kháng nghị
 *   BƯỚC 4  tờ trình phân công                  BƯỚC 15 thụ lý vụ án xét xử GĐT
 *   BƯỚC 5  thông báo phân công                 BƯỚC 16 phân công thẩm phán tối cao
 *   BƯỚC 6–7 CVP duyệt tờ trình, ký thông báo   BƯỚC 17 ký số tờ trình
 *   BƯỚC 8–9 PCA phê duyệt đề xuất              BƯỚC 18 phân công TTV cho HSKN
 *   BƯỚC 10 kiểm thụ lý đơn                     BƯỚC 19 danh sách vụ xét xử + trình lịch
 *   BƯỚC 11 phân công thẩm tra viên             BƯỚC 20 phê duyệt chương trình làm việc
 *   BƯỚC 12 dự thảo quyết định kháng nghị       BƯỚC 21–23 QĐ HĐXX, ký logic, màn quản lý vụ xét xử
 *
 * ───────────────────────── KHÔNG VIẾT LẠI THÂN BƯỚC ─────────────────────────
 *
 * 22 bước này ĐÃ CÓ: chúng là bước 24→45 của `flow-001-st-pt-gdt-bao-cao`, đã chạy xanh trọn trên
 * STG (case-002, 45/45). Luồng này LỌC LẤY đúng cụm đó và dùng chung bảng cài đặt — y như
 * `flows/dan-su/flow-001-st-pt` dùng lại bước 01→23 của KDTM. Chép thân bước ra là có hai bản sao
 * rồi lệch nhau dần.
 *
 * GIỮ NGUYÊN MÃ BƯỚC `24-…` → `45-…`, không đánh số lại từ 01:
 *   · mã bước nằm trong CaseState, đổi mã là mất trạng thái đã gieo;
 *   · dùng chung `CAI_DAT` của KDTM thì mã phải trùng khoá;
 *   · `--buoc=24..30` vẫn lọc được như cũ.
 *
 * ───────────────────────── ĐẦU VÀO: MỘT BẢN ÁN ĐÃ CÓ ─────────────────────────
 *
 * Đặc tả bắt đầu từ MỘT BẢN ÁN ĐÃ TỒN TẠI — nó không có bước nào tạo bản án. Trên STG, luồng 45 bước
 * tự sinh bản án ở bước 22 rồi cụm GĐT đọc từ CaseState. Chạy riêng cụm này thì không có bước 22 nào,
 * nên case phải khai `banAnGdt` (số/ngày/tòa/loại án) trỏ vào bản án CÓ THẬT trên môi trường đang
 * chạy. Bước 24 vẫn TRA CỨU bản án đó: không tìm thấy là dừng ngay, không nhập tay thành đơn trỏ vào
 * bản án không có thật. Xem `gdt-tt.flow.ts · banAnTuState · banAnGieo`.
 */
import { DinhNghiaFlow } from '../../../khung/flow';
import { FLOW_001 as FLOW_KDTM } from '../../kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/flow';

/** Bước đầu của cụm GĐT trong luồng KDTM (= BƯỚC 2 của đặc tả) */
const BUOC_DAU = 24;

export const FLOW_QLD_002: DinhNghiaFlow = {
  phanHe: 'quan-ly-don',
  flow: 'flow-002-gdt-tt-nhap-data',
  module: 'QUAN_LY_DON',
  ten: 'Nhập data GĐT/TT: đơn đề nghị → phân công → kháng nghị → thụ lý xét xử → HĐXX → quản lý vụ xét xử (BƯỚC 2–23)',
  nguon: 'docs/stepdata/GDT-TT-bao-cao-thong-ke.txt',
  buoc: FLOW_KDTM.buoc.filter(b => Number(b.ma.slice(0, 2)) >= BUOC_DAU),
};
