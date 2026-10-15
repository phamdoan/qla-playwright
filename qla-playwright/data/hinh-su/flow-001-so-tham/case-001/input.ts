/**
 * CASE-001 của FLOW HÌNH SỰ 001 — dữ liệu GIEO, TẤT ĐỊNH.
 *
 * Nguồn: `docs/stepdata/ST_PT_Hinh_su.txt`. Spec ghi "Random" ở nhiều ô; ta CHỐT giá trị để chạy
 * lại ra đúng một bộ dữ liệu, tra lại được trên lưới.
 *
 * Cái gì do HỆ THỐNG cấp thì KHÔNG khai ở đây: mã vụ án, số thụ lý, số quyết định, số bản án —
 * chúng là bằng chứng, nằm trong CaseState.
 *
 * Tiền tố `[BCTK-TEST]` mà spec yêu cầu KHÔNG dùng được cho tên người: FE chặn ký tự đặc biệt
 * trong họ tên (chỉ cho chữ, dấu, khoảng trắng, dấu nháy). Vẫn dùng cho TÊN VẬT CHỨNG.
 */
import type { DinhDanhCase } from '../../../../khung/case-state';
import { tenDuongSu } from '../../../../khung/ten-viet';
import { soTatDinh } from '../../../../khung/so-tat-dinh';
import { FLOW_HS_001 } from '../../../../flows/hinh-su/flow-001-so-tham/flow';

export const CASE_ID = 'case-001';
export const ROOT_CASE_KEY = `${FLOW_HS_001.module}|${FLOW_HS_001.flow}|${CASE_ID}`;

export const DD: DinhDanhCase = {
  phanHe: FLOW_HS_001.phanHe,
  flow: FLOW_HS_001.flow,
  caseId: CASE_ID,
  module: FLOW_HS_001.module,
  rootCaseKey: ROOT_CASE_KEY,
};

export const TEN_BI_CAN = tenDuongSu(CASE_ID, 'biCan');
export const TEN_BI_HAI = tenDuongSu(CASE_ID, 'biHai', 'nu');
export const TEN_NGUOI_BAO_CHUA = tenDuongSu(CASE_ID, 'nguoiBaoChua');

/** dd/mm/yyyy cách hôm nay `n` ngày về trước */
const ngayTruoc = (n: number) => {
  const d = new Date(Date.now() - n * 86400_000);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export const INPUT = {
  /**
   * TÀI KHOẢN. Spec PHẦN A2 b1: "Thư ký Tòa án khu vực (có menu Hình sự)".
   * `chanhAnDanSu` = Tòa án nhân dân khu vực 9 - Hà Nội, menu có nhánh "Hình sự" (đo 30/09/2026),
   * và là tài khoản ký được — cần thiết vì "Ký logic" chỉ hiện khi người ký TRÙNG tài khoản chạy.
   */
  vaiToaKhuVuc: 'chanhAnDanSu',

  // ───────── Bước 01 · wizard "Thêm mới vụ án" ─────────
  /** b3 · Bước 1: Thông tin cáo trạng */
  truongHopThuLy: 'VKS truy tố lần đầu',
  soCaoTrang: `${soTatDinh(ROOT_CASE_KEY, 'soCaoTrang', 2)}/CT-VKS`,
  ngayCaoTrang: ngayTruoc(10),
  soButLuc: String(soTatDinh(ROOT_CASE_KEY, 'soButLuc', 3)),

  /** b5 · Bước 2: bị can (Điều 173 khoản 1 — Trộm cắp tài sản, ít nghiêm trọng) */
  tenBiCan: TEN_BI_CAN,
  ngaySinhBiCan: '12/04/1990',
  soDinhDanhBiCan: String(soTatDinh(ROOT_CASE_KEY, 'dinhDanhBiCan', 12)).padStart(12, '0'),
  gioiTinhBiCan: 'Nam',
  quocTich: 'Việt Nam',
  danToc: 'Kinh',
  ngheNghiep: undefined as string | undefined,
  trinhDoVanHoa: undefined as string | undefined,
  dangVien: 'Không',
  congChuc: 'Không',
  nghienMaTuy: 'Không',
  treViThanhNien: 'Không',
  diaChiBiCan: 'Số 10, phố Hàng Bài',
  /**
   * Địa chỉ: cả 5 nhóm (Nơi sinh / Quê quán / HKTT / Tạm trú / Nơi ở hiện tại) đều BẮT BUỘC —
   * để trống thì "Lưu" báo "Vui lòng chọn thông tin địa chỉ" (đo 01/10/2026).
   * Phường/xã để rỗng để lấy mục đầu danh mục của tỉnh: danh mục phường sau sát nhập chưa tra
   * được, chốt một tên không có thật thì bước nào cũng đỏ.
   */
  tinhThanhBiCan: 'Hà Nội',
  phuongXaBiCan: undefined as string | undefined,
  /** 5.2 · thông tin tố tụng — thời điểm phạm tội phải TRƯỚC ngày bị khởi tố */
  thoiDiemPhamToi: ngayTruoc(90),
  ngayBiKhoiTo: ngayTruoc(60),
  diaBanPhamToi: 'Thành thị',
  tienAn: '0',
  tienSu: '0',
  /** 5.3 · điều luật áp dụng */
  dieuLuat: 'Điều 173',
  khoanDieuLuat: 'Khoản 1',

  /** b7 · Bước 3: thông tin vụ án */
  noiDungVuAn:
    'Bị can lợi dụng sơ hở của người bị hại để chiếm đoạt tài sản; tài sản chiếm đoạt đã được thu hồi.',
  gioXayRa: '20:00',
  ngayXayRa: ngayTruoc(95),
  diaDiemXayRa: 'Số 10, phố Hàng Bài',

  /** b9 · Bước 4: người tham gia tố tụng */
  tenBiHai: TEN_BI_HAI,
  tenNguoiBaoChua: TEN_NGUOI_BAO_CHUA,
  ngaySinhBiHai: '20/08/1992',
  /** Drawer người tham gia tố tụng cũng có 5 nhóm địa chỉ bắt buộc như drawer bị can */
  diaChiBiHai: 'Số 25, phố Lò Đúc',
  /** Căn cước bắt buộc với người tham gia tố tụng ("Vui lòng nhập căn cước") */
  soDinhDanhBiHai: String(soTatDinh(ROOT_CASE_KEY, 'dinhDanhBiHai', 12)).padStart(12, '0'),
  ngayCapCCCDBiHai: '15/03/2021',

  /** b11 · Bước 5: vật chứng */
  tenVatChung: '[BCTK-TEST] Điện thoại di động',
  soLuongVatChung: '1',
  thuocSoHuu: 'Chưa xác định rõ hoặc Cơ quan công an trực tiếp phát hiện',

  // ───────── Bước 02 · thụ lý ─────────
  thuTucApDung: 'Thủ tục thông thường',
  /** Spec 1.3: Ngày thụ lý phải ≥ Ngày giao hồ sơ */
  ngayGiaoHoSo: ngayTruoc(5),
  ngayThuLy: ngayTruoc(0),

  // ───────── Bước 03–04 · phân công ─────────
  /** Người ký các quyết định — PHẢI là tài khoản đang chạy thì mới "Ký logic" được */
  nguoiKy: 'Nguyễn Mậu Trường',
  vaiTroThamPhanChuToa: 'Thẩm phán chủ tọa',
  /**
   * Để rỗng = lấy mục đầu danh mục nhân sự của đơn vị. Không gieo tên vì danh sách thẩm phán /
   * hội thẩm / thư ký của Tòa khu vực 9 chưa tra được; gieo một tên không có trong danh mục thì
   * bước này đỏ ngay. Hội thẩm chọn 2 lượt: người đã đưa vào bảng bị loại khỏi danh mục nên hai
   * lượt "lấy mục đầu" ra hai người khác nhau.
   */
  tenThamPhan: undefined as string | undefined,
  tenHoiTham: undefined as string | undefined,
  tenThuKy: undefined as string | undefined,
  vaiTroHoiTham: 'Hội thẩm nhân dân',
  soHoiTham: 2,
  vaiTroThuKy: 'Thư ký',

  // ───────── Bước 05 · lịch xét xử ─────────
  gioBatDauXetXu: '08:00',
  gioKetThucXetXu: '11:00',
  hinhThucXetXu: 'Trực tiếp',
  tinhChatPhienToa: 'Xét xử công khai',
  /** Để rỗng thì lấy mục đầu danh mục phòng của đơn vị — mỗi tòa một danh mục khác nhau */
  diaDiemXetXu: undefined as string | undefined,

  // ───────── Bước 06 · quyết định đưa vụ án ra xét xử ─────────
  /**
   * CHUỖI tìm kiếm trong ô "Chọn loại biểu mẫu" — ô là Select có tìm kiếm nên giá trị này được GÕ
   * để lọc. Spec gọi mẫu này là 020 "Quyết định đưa vụ án ra xét xử sơ thẩm".
   */
  maBieuMau020: 'đưa vụ án ra xét xử',

  // ───────── Bước 07 · bản án ─────────
  loaiHinhPhat: 'Hình phạt chính',
  hinhPhat: 'Tù có thời hạn',
  soNamTu: '1',
  soThangTu: '6',
  anPhi: '200000',
  nhanDinhHDXX:
    'Hành vi của bị cáo đủ yếu tố cấu thành tội Trộm cắp tài sản theo Điều 173 Bộ luật Hình sự.',
  yKienVienKiemSat: 'Đề nghị Hội đồng xét xử tuyên bị cáo phạm tội Trộm cắp tài sản.',
} as const;
