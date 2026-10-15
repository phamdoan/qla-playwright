/**
 * FLOW-001 HÌNH SỰ · BẢN ĐỒ BƯỚC — vụ án hình sự sơ thẩm.
 *
 * Nguồn: `docs/stepdata/ST_PT_Hinh_su.txt` (spec do người viết tay, có URL từng màn, tên trường,
 * điều kiện khóa của từng nút). Phần này phủ **PHẦN A2 + PHẦN B** — tạo vụ án bằng wizard rồi đi
 * hết chi tiết vụ án sơ thẩm tới bản án có hiệu lực. Kháng cáo (PHẦN C) và phúc thẩm (E, F) thêm
 * sau khi giai đoạn này xanh trọn.
 *
 * Vì sao làm hình sự trước: luồng KDTM đang kẹt ở 66-DS phúc thẩm, còn luồng này chạy được bằng
 * MỘT tài khoản Tòa khu vực — tránh đúng thứ đã làm kẹt: văn bản treo "Chờ ký" vì người ký khác
 * tài khoản đang chạy.
 *
 * Bài học đã có sẵn trong spec, không phải mò lại:
 *   · "Ký logic" chỉ hiện khi tài khoản đăng nhập TRÙNG "Người ký"; không trùng thì nút là
 *     "Trình ký" → đăng nhập tài khoản người ký → mở `/file-viewer/{idVanBan}?mode=EDIT` → Ký logic.
 *   · Bản án chỉ tạo được khi quyết định 020 (đưa vụ án ra xét xử) ĐÃ KÝ.
 *   · Sau mỗi lần ký phải TẢI LẠI TRANG mới thấy badge trạng thái đổi (FE không tự cập nhật).
 */
import type { DinhNghiaFlow } from '../../../khung/flow';

const CHI_TIET = (tab: string) => `vu-an/so-tham/chi-tiet?id={idVuAnHinhSu}&tab=${tab}`;
const NGUON = 'docs/stepdata/ST_PT_Hinh_su.txt';

export const FLOW_HS_001: DinhNghiaFlow = {
  phanHe: 'hinh-su',
  flow: 'flow-001-so-tham',
  module: 'HINH_SU',
  ten: 'Vụ án hình sự: tạo vụ án → thụ lý → phân công → chuẩn bị xét xử → xét xử → bản án sơ thẩm',
  nguon: NGUON,
  buoc: [
    {
      ma: '01-tao-vu-an',
      ten: 'Wizard "Thêm mới vụ án" 5 bước → tạo vụ án hình sự',
      manHinh: 'Thêm mới vụ án (wizard)',
      route: 'vu-an/so-tham/them-moi-vu-an',
      vai: 'toaKhuVuc',
      vao: [],
      ra: ['idVuAnHinhSu', 'tenVuAn', 'tenBiCan'],
      nguon: `${NGUON} · PHẦN A2 b3–b13`,
      xacMinh: 'TAI-LIEU',
      bangChungXacMinh: 'spec ghi rõ route /vu-an/so-tham/them-moi-vu-an và 5 bước của wizard',
    },
    {
      ma: '02-thu-ly',
      ten: 'Tab Thụ lý → "Cấp số thụ lý vụ án" → Xác nhận thụ lý',
      manHinh: 'Chi tiết vụ án sơ thẩm · tab Thụ lý',
      route: CHI_TIET('thong-tin-chung'),
      vai: 'toaKhuVuc',
      vao: ['idVuAnHinhSu'],
      ra: ['soThuLyHinhSu', 'ngayThuLyHinhSu'],
      nguon: `${NGUON} · PHẦN B Step1`,
      xacMinh: 'TAI-LIEU',
      bangChungXacMinh: 'spec: sau "Xác nhận thụ lý" trạng thái → "Chưa phân công thẩm phán"',
    },
    {
      ma: '03-phan-cong-tham-phan',
      ten: 'Phân công Thẩm phán chủ tọa (001) → Lấy số → Ký logic',
      manHinh: 'Chi tiết vụ án sơ thẩm · tab Phân công',
      route: CHI_TIET('thong-tin-chung'),
      vai: 'toaKhuVuc',
      vao: ['idVuAnHinhSu'],
      ra: ['soQuyetDinhPhanCongTP'],
      nguon: `${NGUON} · PHẦN B Step2.1`,
      xacMinh: 'TAI-LIEU',
      bangChungXacMinh: 'spec: ký xong trạng thái → "Đã phân công thẩm phán"',
    },
    {
      ma: '04-phan-cong-hoi-tham-thu-ky',
      ten: 'Phân công Hội thẩm (2 người) và Thư ký → Lấy số → Ký logic',
      manHinh: 'Chi tiết vụ án sơ thẩm · tab Phân công',
      route: CHI_TIET('thong-tin-chung'),
      vai: 'toaKhuVuc',
      vao: ['idVuAnHinhSu'],
      ra: ['soQuyetDinhPhanCongHT', 'soQuyetDinhPhanCongTK'],
      nguon: `${NGUON} · PHẦN B Step2.2–2.3`,
      xacMinh: 'TAI-LIEU',
      bangChungXacMinh: 'spec: Hội thẩm dùng mẫu 001, Thư ký dùng mẫu 002',
    },
    /**
     * ⚠ THỨ TỰ NGƯỢC VỚI SPEC. Spec 4.1→4.2 bảo mở phiên tòa (tạo lịch) rồi mới lập 020 và gắn
     * lịch vào. Hệ thống làm ngược: nút "Mở phiên tòa" bị vô hiệu với tooltip
     *   "Lịch xét xử được tạo khi ký Quyết định đưa vụ án ra xét xử sơ thẩm"
     * (đo 01/10/2026 trên UAT, vụ đã ở trạng thái ĐÃ PHÂN CÔNG TP). Nên lập 020 trước, lịch do
     * hệ thống sinh khi ký 020.
     */
    {
      ma: '05-dua-ra-xet-xu-020',
      ten: 'Quyết định đưa vụ án ra xét xử sơ thẩm (020) → Lấy số → Ký logic (lịch sinh khi ký)',
      manHinh: 'Chi tiết vụ án sơ thẩm · tab Chuẩn bị xét xử',
      route: CHI_TIET('thong-tin-chung'),
      vai: 'toaKhuVuc',
      vao: ['idVuAnHinhSu'],
      ra: ['soQuyetDinh020'],
      nguon: `${NGUON} · PHẦN B Step4.2`,
      xacMinh: 'DO-THAT',
      bangChungXacMinh:
        'tooltip của nút "Mở phiên tòa": lịch xét xử được tạo khi ký 020 — nên 020 phải đi trước',
    },
    {
      ma: '06-mo-phien-toa',
      ten: 'Tab Xét xử → kiểm lịch xét xử do ký 020 sinh ra',
      manHinh: 'Chi tiết vụ án sơ thẩm · tab Xét xử',
      route: CHI_TIET('thong-tin-chung'),
      vai: 'toaKhuVuc',
      vao: ['idVuAnHinhSu', 'soQuyetDinh020'],
      ra: ['ngayMoPhienToa'],
      nguon: `${NGUON} · PHẦN B Step4.1`,
      xacMinh: 'DO-THAT',
      bangChungXacMinh: 'lịch xét xử phải hiện trên tab Xét xử sau khi 020 đã ký',
    },
    {
      ma: '07-ban-an-so-tham',
      ten: 'Tạo bản án hình sự sơ thẩm → Lấy số → Trình ký/Ký logic',
      manHinh: 'Chi tiết vụ án sơ thẩm · tab Xét xử · panel Kết quả xét xử',
      route: CHI_TIET('thong-tin-chung'),
      vai: 'toaKhuVuc',
      vao: ['idVuAnHinhSu', 'soQuyetDinh020'],
      ra: ['soBanAnHinhSu', 'ngayBanAnHinhSu'],
      nguon: `${NGUON} · PHẦN B Step4.3`,
      xacMinh: 'TAI-LIEU',
      bangChungXacMinh: 'spec: ký xong trạng thái vụ → "Đã xét xử"',
    },
  ],
};
