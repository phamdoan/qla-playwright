/**
 * FLOW BCTK 001 · BẢN ĐỒ BƯỚC — kiểm tra chức năng Báo cáo thống kê trên MỘT biểu mẫu.
 *
 * Khác mọi luồng khác trong `flows/`: luồng này KHÔNG gieo dữ liệu. Các luồng vụ án/vụ việc
 * (`bctk/ban-do-luong.ts`) gieo vụ tới "Kết quả giải quyết"; luồng này mở biểu mẫu thống kê và
 * kiểm xem số đó có lên báo cáo đúng không. Một CASE = một biểu mẫu (2A, 4A, …) + một bộ tiêu chí.
 *
 * Năm hạng mục kiểm của QC (sheet "CheckList STG" — `[QC] Tiến độ test BCTK.xlsx`) ứng với bước:
 *
 *   Kiểm tra giao diện báo cáo          → 01, 02
 *   Kiểm tra bộ lọc báo cáo             → 01, 05, 06
 *   Kiểm tra tính chính xác của số liệu → 03
 *   Kiểm tra mapping dữ liệu            → 04 (popup minh chứng: số trên ô ↔ danh sách vụ)
 *   Kiểm tra phân quyền                 → 08
 *   (thêm) Kết xuất                      → 07 (Quy_tac_dat_ten_file_ket_xuat.xlsm)
 *
 * Màn BCTK KHÔNG nằm trong `qla-webapp/src/pages` — webapp chỉ có mục menu `/bctk`, `/bctk/gdttt`,
 * `/bctk/hs`, `/bctk/ds` (`qla-webapp/src/layouts/MenuV3/du-lieu/quyTacAnhXa.ts:354-360`). Màn lập
 * báo cáo 80 mẫu thuộc ứng dụng/dịch vụ báo cáo riêng nên mọi bước đang ở mức `TAI-LIEU`
 * (SRS + mockup `Prototype_LapBaoCao_ThongKe_v2_1_*.html`). Xác minh xong thì nâng mức, ghi bằng chứng.
 */
import type { DinhNghiaFlow } from '../../../khung/flow';

const SRS = 'SRS/Tài liệu đặc tả giao diện BCTK v1.0.docx';
const TC = 'Tester/Testcase_BCTK_<nhóm>.xlsx';

export const FLOW_BCTK_001: DinhNghiaFlow = {
  phanHe: 'bao-cao-thong-ke',
  flow: 'flow-001-lap-bao-cao',
  module: 'BAO_CAO_THONG_KE',
  ten: 'Báo cáo thống kê: chọn tiêu chí → lập báo cáo → đối chiếu số liệu → minh chứng → lưu/mở lại → kết xuất → phân quyền',
  nguon: `Báo cáo thống kê/${SRS} · ${TC}`,
  buoc: [
    {
      ma: '01-chon-tieu-chi',
      ten: 'Chọn biểu mẫu + kỳ báo cáo + đơn vị → Lập báo cáo',
      manHinh: 'Lập báo cáo thống kê · khung tiêu chí',
      route: '',
      vai: 'canBoThongKe',
      vao: [],
      ra: ['tieuChiBaoCao'],
      nguon: `${SRS} · ${TC} sheet "TestCase UI"`,
      xacMinh: 'UNKNOWN',
      bangChungXacMinh: 'chưa biết route thật — webapp chỉ có link menu /bctk/*',
      canTruoc: null,
    },
    {
      ma: '02-xem-so-lieu',
      ten: 'Bảng số liệu hiện đủ cột của biểu mẫu → chụp lại giá trị từng ô',
      manHinh: 'Lập báo cáo thống kê · bảng số liệu',
      route: '',
      vai: 'canBoThongKe',
      vao: ['tieuChiBaoCao'],
      ra: ['soLieuBaoCao'],
      nguon: `${SRS} · sheet "Kịch bản <mã>" của ${TC}`,
      xacMinh: 'TAI-LIEU',
    },
    {
      ma: '03-doi-chieu-so-lieu',
      ten: 'Đối chiếu từng cột với expected.ts (Kịch bản của Tester) và công thức cột cộng',
      manHinh: 'Lập báo cáo thống kê · bảng số liệu',
      route: '',
      vai: 'canBoThongKe',
      vao: ['soLieuBaoCao'],
      ra: ['ketQuaDoiChieu'],
      nguon: `${TC} sheet "<mã>" (cột Mô tả: "Cột 6 = Cột 2 + Cột 4"…)`,
      xacMinh: 'TAI-LIEU',
    },
    {
      ma: '04-xem-minh-chung',
      ten: 'Bấm một ô có số → popup chi tiết số liệu, số dòng khớp số trên ô',
      manHinh: 'Popup minh chứng số liệu',
      route: '',
      vai: 'canBoThongKe',
      vao: ['soLieuBaoCao'],
      ra: ['dsVuMinhChung'],
      nguon: `SRS/Của BA/Popup minh chứng số liệu/* · ${TC} TC02`,
      xacMinh: 'TAI-LIEU',
    },
    {
      ma: '05-luu-bo-loc',
      ten: 'Lưu bộ lọc / báo cáo với tiêu chí đang chọn',
      manHinh: 'Lập báo cáo thống kê · Lưu',
      route: '',
      vai: 'canBoThongKe',
      vao: ['tieuChiBaoCao'],
      ra: ['idBaoCaoDaLuu'],
      nguon: `SRS/Của BA/Bộ lọc/SRS_BoLocTieuChi.docx · Test_case_bo_loc_bao_cao_thong_ke.xlsx`,
      xacMinh: 'TAI-LIEU',
    },
    {
      ma: '06-mo-lai-bao-cao',
      ten: 'Mở lại báo cáo đã lưu → tiêu chí và số liệu giữ nguyên',
      manHinh: 'Danh sách báo cáo đã lưu',
      route: '',
      vai: 'canBoThongKe',
      vao: ['idBaoCaoDaLuu', 'soLieuBaoCao'],
      ra: ['soLieuMoLai'],
      nguon: `${TC} TC01 "Mở lại báo cáo sau khi lưu"`,
      xacMinh: 'TAI-LIEU',
    },
    {
      ma: '07-ket-xuat',
      ten: 'Kết xuất Excel → tên tệp đúng quy tắc, số liệu trong tệp khớp màn',
      manHinh: 'Lập báo cáo thống kê · Kết xuất',
      route: '',
      vai: 'canBoThongKe',
      vao: ['tieuChiBaoCao', 'soLieuBaoCao'],
      ra: ['tepKetXuat'],
      nguon: 'SRS/Của BA/Quy_tac_dat_ten_file_ket_xuat.xlsm',
      xacMinh: 'TAI-LIEU',
      canTruoc: '03-doi-chieu-so-lieu',
    },
    {
      ma: '08-kiem-tra-phan-quyen',
      ten: 'Tài khoản không có quyền / khác đơn vị không thấy hoặc không lập được biểu mẫu',
      manHinh: 'Lập báo cáo thống kê',
      route: '',
      vai: 'khongQuyenThongKe',
      vao: ['tieuChiBaoCao'],
      ra: ['ketQuaPhanQuyen'],
      nguon: 'Tester/Phân quyền BCTK.docx',
      xacMinh: 'TAI-LIEU',
      canTruoc: '01-chon-tieu-chi',
    },
  ],
};
