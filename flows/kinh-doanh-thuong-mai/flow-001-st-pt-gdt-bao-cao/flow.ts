/**
 * FLOW_KDTM_GDT_TT — vụ án Kinh doanh, thương mại:
 * đơn khởi kiện → sơ thẩm → kháng cáo → phúc thẩm → GĐT/TT → vụ xét xử → báo cáo thống kê.
 *
 * MỘT BƯỚC = MỘT MÀN HÌNH, hoặc một hành động nghiệp vụ chính trên màn hình đó.
 * Ba bước "đăng nhập" của tài liệu (BƯỚC 1, 6, 8 của file GĐT/TT) KHÔNG thành bước riêng: mỗi bước
 * đã khai `vai`, khung tự mở phiên đúng tài khoản.
 *
 * NGUỒN ĐẶC TẢ (tham khảo nghiệp vụ, KHÔNG phải nguồn chân lý):
 *   · `Tester/Scrip auto/StepData_KinhDoanhThuongMai_VuAn.txt (bản gốc ngoài repo)`   (giai đoạn A–C)
 *   · `docs/stepdata/GDT-TT-bao-cao-thong-ke.txt` (giai đoạn D, BƯỚC 1–23)
 *
 * NGUỒN XÁC MINH (ưu tiên hơn tài liệu) — đo 30/09/2026 trên code FE `qla-webapp`:
 *   · Wizard tạo đơn KKYC : `src/pages/QuanLyDon/DonKhoiKienYeuCau/ThemMoi/ThemMoiWizardBody.tsx`
 *   · Tab chi tiết đơn    : `src/pages/QuanLyDon/DonKhoiKienYeuCau/ChiTiet/index.tsx` (dòng 260–282)
 *   · Tab vụ án sơ thẩm   : `src/pages/VuAn/SoTham/DanSuNew/ChiTietVuAn/index.tsx` (dòng 33–41)
 *   · Tab vụ án phúc thẩm : `src/pages/VuAn/PhucTham/DanSuNew/ChiTietVuAn/index.tsx` (dòng 32–41)
 *   · Field bản án đề nghị: `src/pages/QuanLyDon/ThemMoiDon/type.ts` (FIELD_NAMES.THONG_TIN_BAN_AN)
 *   · Giai đoạn D đã chạy thật trên STG 27–29/09/2026 qua `common/luong-gdt-tt.ts` (B1–B23);
 *     khoá bàn giao lấy đúng tên đã ghi sổ cái (`common/so-cai-tkm.ts` · DongSoCaiTKM).
 *
 * ⚠ CẢNH BÁO LỆCH TÀI LIỆU (đã đối chiếu FE):
 *   1. MỘT VỤ ÁN CÓ HAI ROUTE CHI TIẾT, RA HAI MÀN KHÁC NHAU (đo 30/09/2026 trên cùng vụ
 *      VA26-004877):
 *        · `vu-an/kinh-doanh-thuong-mai/so-tham/chi-tiet` → màn CŨ, không có tab chuẩn bị xét xử,
 *          danh mục biểu mẫu thiếu 31/34/35/47-DS. Hệ thống TỰ ĐIỀU HƯỚNG sang đây sau khi thụ lý.
 *        · `vu-an/dan-su/so-tham/chi-tiet` → màn ĐÚNG, tab
 *          "Thông tin chung · Thụ lý · Phân công · Chuẩn bị xét xử · Xét xử · Quản lý án".
 *      `docs/stepdata/StepData sơ thẩm_KDTM.txt` · Step 5 ghi rõ phải sang route `dan-su`.
 *      Lấy URL sau khi thụ lý làm chuẩn là vào nhầm màn — đã từng kết luận nhầm là "hệ thống mâu
 *      thuẫn: đòi 47-DS mà không cho lập 47-DS".
 *   3. Màn "Báo cáo thống kê" KHÔNG tồn tại trong `qla-webapp` (bước 46) — xem ghi chú ở bước đó.
 */
import type { DinhNghiaFlow } from '../../../khung/flow';

/** Chi tiết đơn khởi kiện: cùng một màn, khác tab */
const CHI_TIET_DON = (tab: string) =>
  `quan-ly-don/don-khoi-kien-va-yeu-cau/chi-tiet?id={idDon}&tab=${tab}`;
/**
 * Chi tiết vụ án sơ thẩm KDTM.
 *
 * ⚠ ĐO THẬT 30/09/2026 mới ra đúng: sau khi thụ lý, hệ thống điều hướng sang
 * `vu-an/kinh-doanh-thuong-mai/so-tham/chi-tiet?id=…&tab=thong-tin-chung` — KHÔNG phải
 * `quan-ly-so-tham/dan-su/chi-tiet` như suy từ routes.ts. Route dân sự có trong routes.ts nên dễ
 * tưởng KDTM dùng chung; thực tế KDTM có route riêng do menu máy chủ cấp (routes.ts không có).
 * Bài học: route lấy từ URL thật sau một lượt chạy, không suy từ file route.
 */
const VU_SO_THAM = (tab: string) =>
  // Tab KHÔNG đưa vào URL: khoá tab khác nhau giữa các màn chi tiết, sai khoá thì trang trắng.
  // Thân bước tự click tab theo tên (common/bieu-mau.ts · moTab) — đúng như tài liệu Tester mô tả.
  `vu-an/dan-su/so-tham/chi-tiet?id={idVuAnSoTham}&tab=thong-tin-chung`;
/** Chi tiết vụ án phúc thẩm */
/** Chi tiết vụ án phúc thẩm — CHƯA đo thật; nhiều khả năng cũng là .../kinh-doanh-thuong-mai/phuc-tham/... */
const VU_PHUC_THAM = (tab: string) =>
  `quan-ly-phuc-tham/dan-su/chi-tiet?id={idVuAnPhucTham}&tab=${tab}`;

const FE_TAB_DON = 'FE: QuanLyDon/DonKhoiKienYeuCau/ChiTiet/index.tsx:260-282';
const FE_TAB_ST =
  'FE: VuAn/SoTham/DanSuNew/ChiTietVuAn/index.tsx:33-41; route đo thật 30/09/2026 sau khi thụ lý VA26-004877';
const FE_TAB_PT = 'FE: VuAn/PhucTham/DanSuNew/ChiTietVuAn/index.tsx:32-41';
const RUNTIME_GDT = 'RUNTIME: common/luong-gdt-tt.ts (đã chạy STG 27–29/09/2026)';

export const FLOW_001: DinhNghiaFlow = {
  phanHe: 'kinh-doanh-thuong-mai',
  flow: 'flow-001-st-pt-gdt-bao-cao',
  module: 'KINH_DOANH_THUONG_MAI',
  ten: 'KDTM: đơn khởi kiện → bản án sơ thẩm 52-DS → kháng cáo → bản án phúc thẩm 75-DS → GĐT/TT → vụ xét xử → báo cáo thống kê',
  nguon: 'Tester/Scrip auto/StepData_KinhDoanhThuongMai_VuAn.txt (bản gốc ngoài repo) + docs/stepdata/GDT-TT-bao-cao-thong-ke.txt',
  buoc: [
    // ═════════ GIAI ĐOẠN A — ĐƠN KHỞI KIỆN (Tòa sơ thẩm) ═════════
    {
      ma: '01-tao-don-khoi-kien',
      ten: 'Tạo đơn khởi kiện Kinh doanh, thương mại (wizard 5 bước)',
      manHinh: 'Thêm mới đơn khởi kiện và yêu cầu',
      /**
       * Để RỖNG có chủ ý: wizard có route `/quan-ly-don/don-khoi-kien-va-yeu-cau/them-moi` (FE
       * navigate tới đó từ màn danh sách) nhưng lối vào đã CHẠY ĐƯỢC là Danh sách đơn → nút
       * "Thêm mới đơn"; `tao-don.flow.ts` tự đi lối đó. Khai route ở đây nữa là điều hướng hai lần.
       */
      route: '',
      vai: 'chanhAn',
      vao: [],
      ra: ['idDon', 'soTiepNhan'],
      nguon: 'StepData KDTM · b1–b10',
      xacMinh: 'FE',
      /**
       * Đơn được TẠO ngay khi bấm "Tiếp theo" ở bước "Thông tin đơn" (validate của
       * STEP_KEYS.THONG_TIN_DON gọi dongBoNeuCan → postDonKhoiKien → trả idDon), rồi bước "Yêu cầu"
       * gọi putDonKhoiKien, cuối cùng "Xử lý đơn" gọi putHoanTatTaoDon(idDon) và điều hướng sang
       * chi-tiet?id=<idDon>. Vì state của wizard nằm trong React (không phải URL), 5 bước wizard
       * KHÔNG tách được thành 5 file spec — tách là phải quay vào màn "Chỉnh sửa đơn", thêm rủi ro
       * mà không thêm giá trị. Nên đây là MỘT bước = MỘT màn hình.
       */
      bangChungXacMinh: 'FE: QuanLyDon/DonKhoiKienYeuCau/ThemMoi/ThemMoiWizardBody.tsx:145-176, 200-252',
      canTruoc: null,
    },
    {
      ma: '02-phan-cong-tham-phan-xu-ly-don',
      ten: 'Phân công Thẩm phán xử lý đơn → Lấy số → Ký logic',
      manHinh: 'Chi tiết đơn · tab Phân công',
      route: CHI_TIET_DON('phan-cong'),
      vai: 'chanhAn',
      vao: ['idDon'],
      ra: ['soQuyetDinhPhanCongDon'],
      nguon: 'StepData KDTM · Chi tiết đơn mục 1–2',
      xacMinh: 'FE',
      bangChungXacMinh: FE_TAB_DON,
    },
    {
      ma: '03-thong-bao-sua-doi-bo-sung-26-ds',
      ten: 'Yêu cầu sửa đổi, bổ sung đơn khởi kiện (26-DS) → Lấy số → Ký logic',
      manHinh: 'Chi tiết đơn · tab Kết quả xử lý',
      route: CHI_TIET_DON('ket-qua-xu-ly'),
      vai: 'chanhAn',
      vao: ['idDon'],
      ra: ['soThongBao26DS'],
      nguon: 'StepData KDTM · Chi tiết đơn mục 3.1–3.7',
      xacMinh: 'FE',
      bangChungXacMinh: `${FE_TAB_DON} (tab chỉ mở khi đơn đã phân công Thẩm phán)`,
    },
    {
      ma: '04-tam-ung-an-phi-29-ds',
      ten: 'Chế độ thủ tục → xác định nghĩa vụ → Thông báo tạm ứng án phí (29-DS)',
      manHinh: 'Chi tiết đơn · tab Kết quả xử lý',
      route: CHI_TIET_DON('ket-qua-xu-ly'),
      vai: 'chanhAn',
      vao: ['idDon'],
      ra: ['soThongBao29DS'],
      nguon: 'StepData KDTM · Chi tiết đơn mục 3.8–3.17',
      xacMinh: 'FE',
      bangChungXacMinh: 'FE: QuanLyDon/DonKhoiKienYeuCau/ChiTiet/KetQuaXuLyTab/index.tsx',
    },
    {
      ma: '05-xac-minh-bien-lai',
      ten: 'Ghi nhận nộp phí → Xác minh biên lai',
      manHinh: 'Chi tiết đơn · tab Kết quả xử lý · popup Xác minh biên lai',
      route: CHI_TIET_DON('ket-qua-xu-ly'),
      vai: 'chanhAn',
      vao: ['idDon', 'soThongBao29DS'],
      ra: ['soBienLai'],
      nguon: 'StepData KDTM · Chi tiết đơn mục 3.18–3.20',
      xacMinh: 'FE',
      bangChungXacMinh: 'FE: QuanLyDon/DonKhoiKienYeuCau/ChiTiet/KetQuaXuLyTab/index.tsx',
    },
    {
      ma: '06-thu-ly-vu-an-30-ds',
      ten: 'Thụ lý vụ (30-DS) → Lấy số → Xác nhận thụ lý → sinh mã vụ án sơ thẩm',
      manHinh: 'Chi tiết đơn · tab Kết quả xử lý · popup "Thụ lý vụ việc"',
      route: CHI_TIET_DON('ket-qua-xu-ly'),
      vai: 'chanhAn',
      vao: ['idDon'],
      ra: ['maVuAnSoTham', 'idVuAnSoTham', 'soThongBao30DS'],
      nguon: 'StepData KDTM · Chi tiết đơn mục 3.21–3.23',
      xacMinh: 'FE',
      /**
       * API thụ lý trả `data.maVuAn`, FE toast "Thụ lý đơn thành công, đã tạo vụ việc <maVuAn>" và
       * giữ `thongTinThuLyTomTat.idVuAn` → lấy được cả mã vụ án và id vụ án làm bằng chứng.
       */
      bangChungXacMinh: 'FE: .../ChiTiet/KetQuaXuLyTab/index.tsx:1084-1131, 1813',
    },

    // ═════════ GIAI ĐOẠN B — VỤ ÁN SƠ THẨM ═════════
    {
      ma: '07-so-tham-thu-ly',
      ten: 'Kiểm tra thông tin thụ lý, ký logic 30-DS nếu còn treo',
      manHinh: 'Chi tiết vụ án sơ thẩm · tab Thụ lý',
      route: VU_SO_THAM('thu-ly'),
      vai: 'chanhAn',
      vao: ['idVuAnSoTham'],
      ra: ['soThuLySoTham', 'ngayThuLySoTham'],
      nguon: 'StepData KDTM · Sơ thẩm Step3',
      xacMinh: 'FE',
      bangChungXacMinh: FE_TAB_ST,
    },
    {
      ma: '08-so-tham-phan-cong',
      ten: 'Phân công Thẩm phán chủ tọa (PC-001), Thư ký (PC-002), 02 Hội thẩm (PC-004)',
      manHinh: 'Chi tiết vụ án sơ thẩm · tab Phân công',
      route: VU_SO_THAM('phan-cong'),
      vai: 'chanhAn',
      vao: ['idVuAnSoTham'],
      ra: ['soQdPhanCongThamPhanSoTham', 'soQdPhanCongThuKySoTham', 'soQdPhanCongHoiTham'],
      nguon: 'StepData KDTM · Sơ thẩm Step4',
      xacMinh: 'FE',
      bangChungXacMinh: FE_TAB_ST,
    },
    {
      ma: '09-so-tham-phien-hop-hoa-giai',
      ten: 'Thông báo phiên họp (31-DS) → Biên bản chứng cứ (35-DS) → Biên bản hòa giải (34-DS)',
      manHinh: 'Chi tiết vụ án sơ thẩm · tab Chuẩn bị xét xử',
      route: VU_SO_THAM('chuan-bi-xet-xu'),
      vai: 'chanhAn',
      vao: ['idVuAnSoTham'],
      ra: ['soThongBao31DS', 'soBienBan35DS', 'soBienBan34DS'],
      nguon: 'StepData KDTM · Sơ thẩm Step5.1–5.7',
      xacMinh: 'FE',
      bangChungXacMinh: `${FE_TAB_ST}; biểu mẫu: VuAn/SoTham/DanSuNew/BieuMau/BieuMau34DS, BieuMau35DS`,
    },
    {
      ma: '10-so-tham-dua-ra-xet-xu-47-ds',
      ten: 'Quyết định đưa vụ án ra xét xử sơ thẩm (47-DS) → lịch xét xử → Lấy số → Ký logic',
      manHinh: 'Chi tiết vụ án sơ thẩm · tab Chuẩn bị xét xử',
      route: VU_SO_THAM('chuan-bi-xet-xu'),
      vai: 'chanhAn',
      vao: ['idVuAnSoTham'],
      ra: ['soQuyetDinh47DS', 'ngayMoPhienToaSoTham'],
      nguon: 'StepData KDTM · Sơ thẩm Step5.8–5.10',
      xacMinh: 'FE',
      bangChungXacMinh: FE_TAB_ST,
    },
    {
      ma: '11-so-tham-bien-ban-phien-toa',
      ten: 'Biên bản phiên tòa sơ thẩm (48-DS) → Biên bản nghị án (51-DS)',
      manHinh: 'Chi tiết vụ án sơ thẩm · tab Xét xử',
      route: VU_SO_THAM('xet-xu'),
      vai: 'chanhAn',
      vao: ['idVuAnSoTham', 'soQuyetDinh47DS', 'ngayMoPhienToaSoTham'],
      ra: ['soBienBan48DS', 'soBienBan51DS'],
      nguon: 'StepData KDTM · Sơ thẩm Step6.1–6.3',
      xacMinh: 'FE',
      bangChungXacMinh: `${FE_TAB_ST}; biểu mẫu: VuAn/SoTham/DanSuNew/BieuMau/BieuMau48DS, BieuMau51DS`,
    },
    {
      ma: '12-so-tham-ban-an-52-ds',
      ten: 'Tạo bản án sơ thẩm (52-DS) → Lấy số → Ký logic',
      manHinh: 'Chi tiết vụ án sơ thẩm · tab Xét xử · popup Bản án sơ thẩm',
      route: VU_SO_THAM('xet-xu'),
      vai: 'chanhAn',
      vao: ['idVuAnSoTham', 'soBienBan48DS', 'soBienBan51DS'],
      /** Ba khoá này là đầu vào BẮT BUỘC của giai đoạn GĐT/TT — xem bước 24 */
      ra: ['soBanAnSoTham', 'ngayBanAnSoTham', 'toaRaBanAnSoTham'],
      nguon: 'StepData KDTM · Sơ thẩm Step6.4–6.7',
      xacMinh: 'FE',
      bangChungXacMinh: `${FE_TAB_ST}; nút "Tạo bản án" chỉ mở khi đã có 48-DS`,
    },
    {
      ma: '13-so-tham-khang-cao-55-ds',
      ten: 'Thêm mới đơn kháng cáo → Giấy xác nhận đã nhận đơn kháng cáo (55-DS)',
      manHinh: 'Chi tiết vụ án sơ thẩm · tab Quản lý án',
      route: VU_SO_THAM('quan-ly-an'),
      vai: 'chanhAn',
      vao: ['idVuAnSoTham', 'soBanAnSoTham', 'ngayBanAnSoTham'],
      ra: ['idDonKhangCao', 'soGiayXacNhan55DS'],
      nguon: 'StepData KDTM · Sơ thẩm Step7.1–7.5',
      xacMinh: 'FE',
      bangChungXacMinh: `${FE_TAB_ST}; VuAn/SoTham/DanSuNew/BieuMau/QuanLyAn`,
    },
    {
      ma: '14-so-tham-thong-bao-khang-cao-62-ds',
      ten: 'Thông báo về việc kháng cáo (62-DS) → Lấy số → Ký logic',
      manHinh: 'Chi tiết vụ án sơ thẩm · tab Quản lý án',
      route: VU_SO_THAM('quan-ly-an'),
      vai: 'chanhAn',
      vao: ['idVuAnSoTham', 'idDonKhangCao'],
      ra: ['soThongBao62DS'],
      nguon: 'StepData KDTM · Sơ thẩm Step7.6–7.7',
      xacMinh: 'FE',
      bangChungXacMinh: FE_TAB_ST,
    },
    {
      ma: '15-chuyen-ho-so-len-phuc-tham',
      ten: 'Tab Chưa chuyển → tick vụ án → Chuyển vụ án',
      manHinh: 'Hồ sơ chuyển đi phúc thẩm (danh sách)',
      /** Màn danh sách nạp theo menu từ máy chủ, không có entry trong routes.ts → chốt khi chạy thật */
      route: '',
      vai: 'chanhAn',
      vao: ['maVuAnSoTham'],
      ra: ['ngayChuyenHoSoPhucTham'],
      nguon: 'StepData KDTM · Sơ thẩm Step8 (tài liệu ghi /qla/quan-ly-so-tham/dan-su/chuyen-di-phuc-tham)',
      xacMinh: 'TAI-LIEU',
      bangChungXacMinh:
        'FE có component VuAn/SoTham/DanSuNew/ChuyenDiPhucTham nhưng KHÔNG có route trong routes.ts ' +
        '(màn danh sách do menu máy chủ cấp) → đường dẫn trong tài liệu chưa xác minh được bằng code',
    },

    // ═════════ GIAI ĐOẠN C — VỤ ÁN PHÚC THẨM (Tòa cấp tỉnh) ═════════
    {
      ma: '16-phuc-tham-tiep-nhan-ho-so',
      ten: 'Tab Chờ tiếp nhận → Tiếp nhận vụ chuyển đến → sinh vụ phúc thẩm',
      manHinh: 'Hồ sơ sơ thẩm chuyển đến để xét xử phúc thẩm (danh sách)',
      route: '',
      vai: 'chanhAnPhucThamHanhChinh',
      vao: ['maVuAnSoTham', 'ngayChuyenHoSoPhucTham'],
      ra: ['idVuAnPhucTham', 'soTiepNhanPhucTham'],
      nguon: 'StepData KDTM · Phúc thẩm b2–b5',
      xacMinh: 'TAI-LIEU',
      bangChungXacMinh:
        'FE: VuAn/PhucTham/DanSuNew/constants.ts · DANH_SACH_PATH = /quan-ly-phuc-tham/dan-su/ho-so-phuc-tham ' +
        '(đó là màn Hồ sơ phúc thẩm; màn Hồ sơ chuyển đến do menu cấp, chưa xác minh đường dẫn)',
    },
    {
      ma: '17-phuc-tham-thu-ly-65-ds',
      ten: 'Thụ lý phúc thẩm theo kháng cáo → Thông báo thụ lý phúc thẩm (65-DS)',
      manHinh: 'Chi tiết vụ án phúc thẩm · tab Thụ lý',
      route: VU_PHUC_THAM('thu-ly'),
      vai: 'chanhAnPhucThamHanhChinh',
      vao: ['idVuAnPhucTham'],
      ra: ['soThuLyPhucTham', 'ngayThuLyPhucTham', 'soThongBao65DS'],
      nguon: 'StepData KDTM · Phúc thẩm Step1',
      xacMinh: 'FE',
      bangChungXacMinh: FE_TAB_PT,
    },
    {
      ma: '18-phuc-tham-phan-cong-84-ds',
      ten: 'Phân công HĐXX 03 Thẩm phán + Thư ký (84-DS) → Kiểm sát viên',
      manHinh: 'Chi tiết vụ án phúc thẩm · tab Phân công',
      route: VU_PHUC_THAM('phan-cong'),
      vai: 'chanhAnPhucThamHanhChinh',
      vao: ['idVuAnPhucTham'],
      ra: ['soQuyetDinh84DS'],
      nguon: 'StepData KDTM · Phúc thẩm Step2',
      xacMinh: 'FE',
      bangChungXacMinh: FE_TAB_PT,
    },
    {
      ma: '19-phuc-tham-tam-ung-an-phi-83-ds',
      ten: 'Thông báo nộp tiền tạm ứng án phí phúc thẩm (83-DS)',
      manHinh: 'Chi tiết vụ án phúc thẩm · tab Chuẩn bị xét xử',
      route: VU_PHUC_THAM('chuan-bi-xet-xu'),
      vai: 'chanhAnPhucThamHanhChinh',
      vao: ['idVuAnPhucTham'],
      ra: ['soThongBao83DS'],
      nguon: 'StepData KDTM · Phúc thẩm Step3.1',
      xacMinh: 'FE',
      bangChungXacMinh: FE_TAB_PT,
    },
    {
      ma: '20-phuc-tham-dua-ra-xet-xu-66-ds',
      ten: 'Quyết định đưa vụ án ra xét xử phúc thẩm (66-DS) → Lấy số → Ký logic',
      manHinh: 'Chi tiết vụ án phúc thẩm · tab Chuẩn bị xét xử',
      route: VU_PHUC_THAM('chuan-bi-xet-xu'),
      vai: 'chanhAnPhucThamHanhChinh',
      vao: ['idVuAnPhucTham'],
      ra: ['soQuyetDinh66DS', 'ngayMoPhienToaPhucTham'],
      nguon: 'StepData KDTM · Phúc thẩm Step3.2–3.4',
      xacMinh: 'FE',
      bangChungXacMinh: FE_TAB_PT,
    },
    {
      ma: '21-phuc-tham-bien-ban-phien-toa',
      ten: 'Biên bản phiên tòa phúc thẩm (73-DS) → Biên bản nghị án (51-DS, không chấp nhận kháng cáo)',
      manHinh: 'Chi tiết vụ án phúc thẩm · tab Xét xử',
      route: VU_PHUC_THAM('xet-xu'),
      vai: 'chanhAnPhucThamHanhChinh',
      vao: ['idVuAnPhucTham', 'soQuyetDinh66DS'],
      ra: ['soBienBan73DS', 'soBienBanNghiAnPhucTham'],
      nguon: 'StepData KDTM · Phúc thẩm Step4.1–4.3',
      xacMinh: 'FE',
      bangChungXacMinh: `${FE_TAB_PT}; biểu mẫu 73-DS: VuAn/SoTham/DanSuNew/BieuMau/BieuMau73DS`,
    },
    {
      ma: '22-phuc-tham-ban-an-75-ds',
      ten: 'Tạo bản án phúc thẩm (75-DS) → Lấy số → Ký logic',
      manHinh: 'Chi tiết vụ án phúc thẩm · tab Xét xử · popup Bản án phúc thẩm',
      route: VU_PHUC_THAM('xet-xu'),
      vai: 'chanhAnPhucThamHanhChinh',
      vao: ['idVuAnPhucTham', 'soBienBan73DS', 'soBienBanNghiAnPhucTham'],
      /** Đây là bản án mà đơn GĐT/TT ở bước 24 đề nghị xem xét lại */
      ra: ['soBanAnPhucTham', 'ngayBanAnPhucTham', 'toaRaBanAnPhucTham'],
      nguon: 'StepData KDTM · Phúc thẩm Step4.4–4.6',
      xacMinh: 'FE',
      bangChungXacMinh: `${FE_TAB_PT}; nút "Tạo bản án phúc thẩm" chỉ mở khi đã có 73-DS và 51-DS`,
    },
    {
      ma: '23-phuc-tham-kiem-ket-qua',
      ten: 'VERIFY: Kết quả giải quyết = "Giữ nguyên bản án sơ thẩm"',
      manHinh: 'Chi tiết vụ án phúc thẩm · tab Kết quả phúc thẩm',
      route: VU_PHUC_THAM('ket-qua-phuc-tham'),
      vai: 'chanhAnPhucThamHanhChinh',
      vao: ['idVuAnPhucTham', 'soBanAnPhucTham'],
      ra: ['ketQuaPhucTham'],
      nguon: 'StepData KDTM · Phúc thẩm Step4.7',
      xacMinh: 'FE',
      /** Tab này KHÔNG có trong StepData nhưng có trong FE — chỗ đối chiếu kết quả tốt nhất */
      bangChungXacMinh: `${FE_TAB_PT} · tab 'ket-qua-phuc-tham' (tài liệu không nhắc tab này)`,
    },

    // ═════════ GIAI ĐOẠN D — GĐT/TT (TANDTC) ═════════
    // Đầu vào của cả giai đoạn là BẢN ÁN PHÚC THẨM do bước 22 sinh ra. Hôm nay
    // `common/luong-gdt-tt.ts` lấy bản án từ Excel (`common/ban-an-so-tham.ts` · FILE_INPUT);
    // chuyển sang khung này thì lấy từ state — adapter: `gdt-tt.flow.ts` · banAnTuState().
    {
      ma: '24-gdt-tao-don-de-nghi',
      ten: 'Nhập đơn đề nghị GĐT theo bản án phúc thẩm → tạo hồ sơ đơn',
      manHinh: 'Danh sách đơn (GĐT) → Thêm mới đơn · tab "Thông tin bản án đề nghị"',
      route: 'quan-ly-don/them-moi',
      vai: 'canBo',
      /**
       * KHÔNG hard-code số/ngày/tòa bản án. Ba khoá này điền vào `thongTinBanAn.soBanAnQd`,
       * `ngayBanAnQd`, `tenToaXetXu`/`maToaXetXu`; bấm icon kính lúp thì hệ thống tra bản án thật
       * và tự điền `loaiAn` + các trường `soBananPhucTham`/`ngayBananPhucTham`/`tenToaXetXuPhucTham`.
       */
      vao: ['soBanAnPhucTham', 'ngayBanAnPhucTham', 'toaRaBanAnPhucTham'],
      ra: ['gdtIdDon', 'gdtMaDon', 'gdtSoThuLyDon'],
      nguon: 'GĐT/TT · BƯỚC 2',
      xacMinh: 'FE',
      bangChungXacMinh:
        'FE: QuanLyDon/ThemMoiDon/type.ts · FIELD_NAMES.THONG_TIN_BAN_AN (soBanAnQd, ngayBanAnQd, ' +
        'capXetXu, maToaXetXu/tenToaXetXu, loaiAn, thuTucGiaiQuyet); route /quan-ly-don/them-moi ' +
        '(routes.ts:606) — cài đặt đã chạy: common/luong-gdt-tt.ts B1–B2',
    },
    {
      ma: '25-gdt-phan-cong-tham-phan-ngau-nhien',
      ten: 'Tab "DS chưa phân công ngẫu nhiên" → Phân công ngẫu nhiên',
      manHinh: 'Quản lý đơn · Phân công thẩm phán',
      route: '',
      vai: 'canBo',
      vao: ['gdtSoThuLyDon'],
      ra: ['gdtThamPhanXuLyDon'],
      nguon: 'GĐT/TT · BƯỚC 3',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B3 (HctpPage.phanCongThamPhanNgauNhien)`,
    },
    {
      ma: '26-gdt-to-trinh-phan-cong',
      ten: 'Loại văn bản = Tờ trình phân công thẩm phán → Tạo văn bản → Trình ký',
      manHinh: 'Chi tiết đơn GĐT · Danh sách văn bản',
      route: '',
      vai: 'canBo',
      vao: ['gdtMaDon'],
      ra: ['gdtKhoaToTrinh'],
      nguon: 'GĐT/TT · BƯỚC 4',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B4 (HctpPage.lapTamTrinhPhanCong → khoaToTrinh)`,
    },
    {
      ma: '27-gdt-thong-bao-phan-cong',
      ten: 'Loại văn bản = Tờ thông báo phân công thẩm phán → Tạo văn bản → Trình ký',
      manHinh: 'Chi tiết đơn GĐT · Danh sách văn bản',
      route: '',
      vai: 'canBo',
      vao: ['gdtMaDon'],
      ra: ['gdtKhoaThongBao'],
      nguon: 'GĐT/TT · BƯỚC 5',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B5`,
    },
    {
      ma: '28-gdt-cvp-duyet-to-trinh',
      ten: 'Chánh văn phòng cho ý kiến, trình Phó Chánh án, ký logic Thông báo',
      manHinh: 'Xem xét quyết định / Phê duyệt văn bản',
      route: '',
      vai: 'chanhVanPhong',
      vao: ['gdtKhoaToTrinh', 'gdtKhoaThongBao'],
      ra: ['gdtToTrinhDaTrinhPca', 'gdtThongBaoDaKy'],
      nguon: 'GĐT/TT · BƯỚC 6–7',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B7a, B7b`,
    },
    {
      ma: '29-gdt-pca-phe-duyet-to-trinh',
      ten: 'Phó Chánh án phê duyệt Tờ trình phân công thẩm phán',
      manHinh: 'Xem xét quyết định / Phê duyệt văn bản',
      route: '',
      vai: 'phoChanhAn',
      vao: ['gdtToTrinhDaTrinhPca'],
      ra: ['gdtToTrinhDaPheDuyet'],
      nguon: 'GĐT/TT · BƯỚC 8–9',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B9`,
    },
    {
      ma: '30-gdt-kiem-thu-ly-don',
      ten: 'VERIFY: đơn đã hiển thị ở "Nhận đơn và TL vụ án" › tab Đã có vụ án',
      manHinh: 'Nhận đơn và thụ lý vụ án (Vụ GĐKT)',
      route: '',
      vai: 'thuKyVuDanSu',
      vao: ['gdtMaDon', 'gdtSoThuLyDon'],
      ra: ['gdtVuAnDaThuLy'],
      nguon: 'GĐT/TT · BƯỚC 10',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B10 (đơn dân sự về Vụ D01.107 → dùng tài khoản *DanSu)`,
    },
    {
      ma: '31-gdt-giao-tieu-ho-so-ttv',
      ten: 'Giao tiểu hồ sơ cho Thẩm tra viên',
      manHinh: 'Nhận đơn và thụ lý vụ án (Vụ GĐKT)',
      route: '',
      vai: 'thuKyVuDanSu',
      vao: ['gdtVuAnDaThuLy'],
      ra: ['gdtThamTraVienDuocGiao'],
      nguon: 'GĐT/TT · BƯỚC 11',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B10b, B11`,
    },
    {
      ma: '32-gdt-du-thao-khang-nghi',
      ten: 'Tạo dự thảo Quyết định kháng nghị → Trình ký',
      manHinh: 'Hồ sơ vụ án GĐT · Dự thảo quyết định kháng nghị',
      route: '',
      vai: 'thamTraVienDanSu',
      vao: ['gdtThamTraVienDuocGiao'],
      ra: ['gdtKhoaDuThao'],
      nguon: 'GĐT/TT · BƯỚC 12',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B12a, B12b`,
    },
    {
      ma: '33-gdt-phe-duyet-khang-nghi',
      ten: 'Phê duyệt dự thảo kháng nghị → Quyết định kháng nghị có số',
      manHinh: 'Xem xét quyết định / Phê duyệt văn bản',
      route: '',
      vai: 'phoChanhAn',
      vao: ['gdtKhoaDuThao'],
      ra: ['gdtSoQuyetDinhKhangNghi'],
      nguon: 'GĐT/TT · BƯỚC 13',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B13, B13b`,
    },
    {
      ma: '34-gdt-chuyen-nhan-ho-so-khang-nghi',
      ten: 'Chuyển và nhận hồ sơ kháng nghị',
      manHinh: 'Hồ sơ kháng nghị đi / đến',
      route: '',
      vai: 'thuKyVuDanSu',
      vao: ['gdtSoQuyetDinhKhangNghi'],
      ra: ['gdtMaHoSoKhangNghi'],
      nguon: 'GĐT/TT · BƯỚC 14',
      xacMinh: 'RUNTIME',
      bangChungXacMinh:
        `${RUNTIME_GDT} · B14 — màn lọc theo donKetQuaReadPredicate: cán bộ không phải lãnh đạo ` +
        'chỉ thấy DON_KETQUA do chính mình tạo → dùng vai hoSoKhangNghi',
    },
    {
      ma: '35-gdt-thu-ly-vu-xet-xu',
      ten: 'Thụ lý vụ án xét xử GĐT',
      manHinh: 'Quản lý vụ xét xử · Thụ lý',
      route: '',
      vai: 'thamTraVienDanSu',
      vao: ['gdtMaHoSoKhangNghi'],
      ra: ['gdtSoThuLyVuXetXu'],
      nguon: 'GĐT/TT · BƯỚC 15',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B15`,
    },
    {
      ma: '36-gdt-phan-cong-tham-phan-toi-cao',
      ten: 'Phân công Thẩm phán vụ án kháng nghị → Trình ký',
      manHinh: 'Quản lý vụ xét xử · Phân công',
      route: '',
      vai: 'thamTraVienDanSu',
      vao: ['gdtSoThuLyVuXetXu'],
      ra: ['gdtKhoaToTrinhTPTC'],
      nguon: 'GĐT/TT · BƯỚC 16',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B16`,
    },
    {
      ma: '37-gdt-ky-so-to-trinh-toi-cao',
      ten: 'Ký số Tờ trình phân công Thẩm phán tối cao',
      manHinh: 'Xem xét quyết định / Phê duyệt văn bản',
      route: '',
      vai: 'phoChanhAn',
      vao: ['gdtKhoaToTrinhTPTC'],
      ra: ['gdtToTrinhTPTCDaKy'],
      nguon: 'GĐT/TT · BƯỚC 17',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B17`,
    },
    {
      ma: '38-gdt-phan-cong-ttv-hskn',
      ten: 'Phân công Thẩm tra viên cho hồ sơ kháng nghị',
      manHinh: 'Quản lý vụ xét xử · Phân công Thẩm tra viên',
      route: '',
      vai: 'thamTraVienDanSu',
      vao: ['gdtSoThuLyVuXetXu'],
      ra: ['gdtThamTraVienHskn'],
      nguon: 'GĐT/TT · BƯỚC 18',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B18`,
    },
    {
      ma: '39-gdt-danh-sach-vu-xet-xu',
      ten: 'Tạo danh sách vụ xét xử và trình duyệt lịch',
      manHinh: 'Quản lý vụ xét xử · Danh sách vụ xét xử',
      route: '',
      vai: 'thamTraVienDanSu',
      vao: ['gdtSoThuLyVuXetXu'],
      ra: ['gdtMaVuXetXu', 'gdtKhoaChuongTrinh'],
      nguon: 'GĐT/TT · BƯỚC 19',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B19`,
    },
    {
      ma: '40-gdt-phe-duyet-chuong-trinh',
      ten: 'Phê duyệt chương trình làm việc',
      manHinh: 'Công tác lãnh đạo · Chương trình làm việc',
      route: '',
      vai: 'phoChanhAn',
      vao: ['gdtKhoaChuongTrinh'],
      ra: ['gdtChuongTrinhDaDuyet'],
      nguon: 'GĐT/TT · BƯỚC 20',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B20`,
    },
    {
      ma: '41-gdt-quyet-dinh-hdxx',
      ten: 'Tạo thông báo và Quyết định phân công Hội đồng xét xử',
      manHinh: 'Quản lý vụ xét xử · Biểu mẫu Hội đồng',
      route: '',
      vai: 'thamTraVienDanSu',
      vao: ['gdtMaVuXetXu'],
      ra: ['gdtKhoaBieuMauHoiDong'],
      nguon: 'GĐT/TT · BƯỚC 21',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B21`,
    },
    {
      ma: '42-gdt-ky-logic-hdxx',
      ten: 'Ký logic Quyết định thành lập HĐXX và Thông báo VKS',
      manHinh: 'Xem xét quyết định / Phê duyệt văn bản',
      route: '',
      vai: 'phoChanhAn',
      vao: ['gdtKhoaBieuMauHoiDong'],
      ra: ['gdtHoiDongDaKy'],
      nguon: 'GĐT/TT · BƯỚC 22',
      xacMinh: 'RUNTIME',
      bangChungXacMinh: `${RUNTIME_GDT} · B22`,
    },
    {
      ma: '43-gdt-man-quan-ly-vu-xet-xu',
      ten: 'VERIFY: vụ hiển thị đúng trạng thái trên màn Quản lý vụ xét xử',
      manHinh: 'Quản lý vụ xét xử (danh sách)',
      route: 'vu-an/gdt-tt/quan-ly-vu-xet-xu/ho-so-vu-an',
      vai: 'thamTraVienDanSu',
      vao: ['gdtMaVuXetXu', 'gdtHoiDongDaKy'],
      ra: ['gdtTrangThaiVuXetXu'],
      nguon: 'GĐT/TT · BƯỚC 23',
      xacMinh: 'FE',
      bangChungXacMinh: `FE: routes.ts:508 /vu-an/gdt-tt/quan-ly-vu-xet-xu/ho-so-vu-an; ${RUNTIME_GDT} · B23`,
    },

    // ═════════ GIAI ĐOẠN E — BÁO CÁO THỐNG KÊ ═════════
    {
      ma: '44-bao-cao-thong-ke',
      ten: 'VERIFY: vụ án của case đếm đúng ô của biểu mẫu thống kê KDTM',
      manHinh: 'Lập báo cáo thống kê (BCTK)',
      route: '',
      vai: 'chanhAn',
      vao: ['maVuAnSoTham', 'soBanAnSoTham', 'soBanAnPhucTham', 'gdtMaVuXetXu'],
      ra: ['soLieuBaoCaoThongKe'],
      nguon: 'Tester/Testcase_BCTK_4_KDTM.xlsx + SRS/Mapping Data/04. KDTM',
      xacMinh: 'UNKNOWN',
      /**
       * ⚠ Màn BCTK KHÔNG có trong `qla-webapp`: quét toàn `src` không ra route/trang nào cho
       * "báo cáo thống kê" (chỉ có `src/pages/ThongBao`). Tài liệu BCTK là bộ mockup HTML riêng
       * (Prototype_LapBaoCao_ThongKe_*.html, dashboard 3 cấp) → BCTK là ứng dụng KHÁC.
       * Chưa biết URL thật thì KHÔNG đoán: bước này giữ UNKNOWN tới khi có đường dẫn/môi trường.
       */
      bangChungXacMinh:
        'ĐÃ QUÉT 30/09/2026: grep "bao-cao-thong-ke|baoCaoThongKe|lap-bao-cao" trong qla-webapp/src ' +
        '→ không có màn nào. BCTK nằm ngoài qla-webapp.',
    },
  ],
};
