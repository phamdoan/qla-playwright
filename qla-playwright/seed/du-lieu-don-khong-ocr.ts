/**
 * ⚠️ DỮ LIỆU CHO SCRIPT SEED (tạo đơn thật trên môi trường) — KHÔNG dùng cho test regression.
 *
 * Sinh bộ hồ sơ DEMO "Đơn đề nghị GĐT/TT" có tính tất định (deterministic): cùng SEED + cùng mã nguồn
 * → cùng họ tên, ngày, số bản án, nội dung... cho từng chỉ số 001..300 (tạo 10 hồ sơ ra đúng 10 hồ sơ đầu
 * của bộ 300). Không dùng Math.random.
 *
 * - Thông tin cá nhân: GIẢ LẬP, đúng định dạng (họ tên tiếng Việt, CCCD 12 số, SĐT 10 số). Không lấy của người thật;
 *   loại trừ tên người nổi tiếng và tên các tài khoản demo trong kịch bản.
 * - Danh mục hệ thống (Tỉnh, Phường/Xã, Tòa án, Vụ GĐKT): KHÔNG khai ở đây. Hồ sơ chỉ giữ số ngẫu nhiên [0,1)
 *   (uTinh, uXa); script seed đọc danh mục thật (API màn hình đang gọi) rồi mới chọn phần tử theo số này.
 * - Nhãn Loại án / Tư cách tố tụng / Hình thức nhận / Cấp xét xử lấy nguyên văn enum của qla-webapp
 *   (types/don.d.ts LoaiAnConfig, HinhThucNhanDonGdtTtConfig; constants/enums.ts LoaiConNguoiDSEnum, LoaiConNguoiConfig).
 */
import { NguoiGia, ddmmyyyy } from '../common/du-lieu';
import type { ThongTinDon } from '../pages/them-moi-don.page';

export const SEED = 20260922;
export const MARKER_PREFIX = `PW_DEMO_NO_OCR_${SEED}_`;
export const SO_HO_SO_TOI_DA = 3000;
/** Mốc ngày cố định để ngày tháng không đổi theo ngày chạy */
const NGAY_MOC = new Date(2026, 8, 22);

export const markerCua = (index: number, prefix: string = MARKER_PREFIX) => `${prefix}${String(index).padStart(3, '0')}`;

/** Cấu hình một bộ seed khác (mốc ngày / seed / marker riêng) — bỏ trống thì dùng bộ mặc định ở trên */
export interface BoSeed {
  seed?: number;
  ngayMoc?: Date;
  markerPrefix?: string;
}

// ───────────────────────────── PRNG tất định ─────────────────────────────

/** mulberry32: PRNG 32-bit nhỏ gọn, đủ phân bố cho dữ liệu demo */
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;
const chon = <T>(r: Rng, ds: readonly T[]) => ds[Math.floor(r() * ds.length)];
const soNguyen = (r: Rng, min: number, max: number) => min + Math.floor(r() * (max - min + 1));
const chuSo = (r: Rng, doDai: number) => Array.from({ length: doDai }, () => Math.floor(r() * 10)).join('');
/** Chọn theo trọng số: [[giá trị, trọng số], ...] */
function theoTiLe<T>(r: Rng, ds: readonly (readonly [T, number])[]): T {
  const tong = ds.reduce((s, [, w]) => s + w, 0);
  let x = r() * tong;
  for (const [v, w] of ds) if ((x -= w) < 0) return v;
  return ds[ds.length - 1][0];
}
const truocNgayMoc = (moc: Date, soNgay: number) => {
  const d = new Date(moc);
  d.setDate(d.getDate() - soNgay);
  return d;
};

// ───────────────────────────── Họ tên ─────────────────────────────

/** Tỉ lệ gần đúng phân bố họ ở Việt Nam */
const HO: readonly (readonly [string, number])[] = [
  ['Nguyễn', 31], ['Trần', 11], ['Lê', 9], ['Phạm', 7], ['Hoàng', 5], ['Huỳnh', 3], ['Phan', 4], ['Vũ', 4],
  ['Võ', 3], ['Đặng', 3], ['Bùi', 3], ['Đỗ', 3], ['Hồ', 2], ['Ngô', 2], ['Dương', 2], ['Lý', 1], ['Đinh', 1],
  ['Trịnh', 1], ['Mai', 1], ['Đào', 1], ['Cao', 1], ['Lương', 1], ['Tạ', 1], ['Chu', 1],
];
const DEM_NAM = ['Đức', 'Minh', 'Quang', 'Hữu', 'Thành', 'Công', 'Xuân', 'Ngọc', 'Anh', 'Trọng', 'Duy', 'Tiến', 'Mạnh', 'Quốc', 'Việt', 'Đình', 'Gia', 'Hoàng', 'Thanh'] as const;
const TEN_NAM = ['Hoàng', 'Đức', 'Huy', 'Tuấn', 'Hùng', 'Dũng', 'Nam', 'Long', 'Sơn', 'Phong', 'Khang', 'Thắng', 'Hải', 'Trung', 'Kiên', 'Bình', 'Cường', 'Tùng', 'Hiếu', 'Phúc', 'Quân', 'Vinh', 'Toàn', 'Lâm', 'Nghĩa', 'Tâm', 'Khải', 'Đạt', 'Hưng', 'Thịnh', 'Lộc', 'Tài', 'Khoa', 'Bảo', 'An'] as const;
const DEM_NU = ['Thu', 'Ngọc', 'Thanh', 'Mai', 'Hồng', 'Minh', 'Phương', 'Thùy', 'Kim', 'Bích', 'Diệu', 'Quỳnh', 'Hoài'] as const;
/** Đệm thứ hai cho tên nữ 4 chữ (Nguyễn Thị Thanh Hằng) */
const DEM_NU_2 = ['Thanh', 'Thu', 'Minh', 'Ngọc', 'Hồng', 'Kim', 'Mai', 'Phương'] as const;
const TEN_NU = ['Hương', 'Hằng', 'Trang', 'Linh', 'Lan', 'Hạnh', 'Hoa', 'Nga', 'Yến', 'Anh', 'Thảo', 'Huyền', 'Nhung', 'Dung', 'Hà', 'Oanh', 'Vân', 'Ngân', 'Giang', 'Châu', 'My', 'Hiền', 'Thủy', 'Liên', 'Duyên', 'Tuyết', 'Nhàn', 'Xuân', 'Ly', 'Quyên'] as const;

/** Không dùng tên trùng người nổi tiếng / lãnh đạo / tài khoản demo trong kịch bản */
const TEN_LOAI_TRU = new Set([
  'Nguyễn Xuân Phúc', 'Nguyễn Thị Kim Ngân', 'Nguyễn Tấn Dũng', 'Phạm Minh Chính', 'Nguyễn Phú Trọng', 'Võ Nguyên Giáp',
  'Trần Đại Quang', 'Võ Văn Thưởng', 'Nguyễn Hòa Bình', 'Lê Minh Trí', 'Trần Thanh Mẫn', 'Lương Cường', 'Võ Thị Ánh Xuân',
  'Nguyễn Minh Triết', 'Trương Tấn Sang', 'Nguyễn Văn An', 'Nông Đức Mạnh', 'Phan Văn Khải', 'Võ Văn Kiệt',
  // Tài khoản demo (KỊCH BẢN DEMO CHI TIẾT GĐTTT)
  'Lê Mỹ Linh', 'Nguyễn Thị Thu Hường', 'Nguyễn Tường Linh', 'Nguyễn Văn Quảng', 'Bùi Thị Thanh Loan', 'Nguyễn Thị Bình',
]);

function taoHoTen(r: Rng, nam: boolean) {
  const ho = theoTiLe(r, HO);
  // Đệm "Văn" (nam) / "Thị" (nữ) phổ biến nhất; khoảng một nửa tên nữ có "Thị" dùng thêm đệm thứ hai (Nguyễn Thị Thanh Hằng)
  if (nam) return `${ho} ${r() < 0.3 ? 'Văn' : chon(r, DEM_NAM)} ${chon(r, TEN_NAM)}`;
  const dem = r() < 0.4 ? (r() < 0.5 ? `Thị ${chon(r, DEM_NU_2)}` : 'Thị') : chon(r, DEM_NU);
  return `${ho} ${dem} ${chon(r, TEN_NU)}`;
}

// ───────────────────────────── Định dạng giấy tờ (giả lập) ─────────────────────────────

/** Mã tỉnh trong số CCCD (quy tắc cấu trúc số CCCD), chỉ để sinh số đúng định dạng */
const MA_TINH_CCCD = ['001', '002', '004', '008', '010', '015', '017', '019', '020', '022', '024', '025', '026', '027', '030', '031', '033', '034', '035', '036', '037', '038', '040', '042', '044', '045', '046', '048', '049', '051', '052', '054', '056', '058', '060', '062', '064', '066', '068', '070', '072', '074', '075', '077', '079', '080', '082', '083', '084', '086', '087', '089', '091', '092', '093', '094', '095', '096'] as const;
const DAU_SO_DI_DONG = ['090', '091', '093', '094', '096', '097', '098', '032', '033', '034', '035', '036', '037', '038', '039', '070', '076', '077', '078', '079', '081', '082', '083', '084', '085', '086', '088', '089'] as const;
const DUONG = ['Lê Lợi', 'Trần Hưng Đạo', 'Nguyễn Trãi', 'Quang Trung', 'Hùng Vương', 'Lý Thường Kiệt', 'Hai Bà Trưng', 'Trần Phú', 'Lê Duẩn', 'Phan Đình Phùng', 'Nguyễn Du', 'Lê Hồng Phong', 'Nguyễn Văn Cừ', 'Điện Biên Phủ', 'Ngô Quyền'] as const;
const THON = ['Đông', 'Tây', 'Trung', 'Thượng', 'Hạ', 'Tân Lập', 'Tân Phú', 'An Bình', 'Phú Hòa', 'Đồng Tâm', 'Hòa Bình', 'Thống Nhất'] as const;

function taoNguoi(r: Rng, hoTen: string, nam: boolean): NguoiGia {
  const namSinh = soNguyen(r, 1952, 1998);
  const ngaySinh = ddmmyyyy(new Date(namSinh, soNguyen(r, 0, 11), soNguyen(r, 1, 28)));
  // CCCD: 3 số mã tỉnh + 1 số giới tính/thế kỷ (TK20: Nam 0, Nữ 1) + 2 số cuối năm sinh + 6 số
  const cccd = `${chon(r, MA_TINH_CCCD)}${nam ? 0 : 1}${String(namSinh).slice(2)}${chuSo(r, 6)}`;
  const sdt = `${chon(r, DAU_SO_DI_DONG)}${chuSo(r, 7)}`;
  const diaChi =
    r() < 0.6
      ? r() < 0.5
        ? `Số ${soNguyen(r, 2, 280)}, ngõ ${soNguyen(r, 3, 120)} đường ${chon(r, DUONG)}`
        : `Số ${soNguyen(r, 2, 280)} đường ${chon(r, DUONG)}`
      : r() < 0.5
        ? `Tổ dân phố số ${soNguyen(r, 1, 18)}`
        : `Thôn ${chon(r, THON)}`;
  return { hoTen, gioiTinh: nam ? 'Nam' : 'Nữ', ngaySinh, cccd, sdt, diaChi };
}

// ───────────────────────────── Loại án & nội dung ─────────────────────────────

interface CauHinhLoaiAn {
  /** Nhãn Select "Loại án" (LoaiAnConfig) */
  loaiAn: string;
  /** Ký hiệu trong số bản án: 125/2026/DS-PT */
  kyHieu: string;
  /** Từ khoá nhận diện Vụ GĐKT nhận đơn (enum DonViChuyenDen: VU_GDKT_HS/DANSU/HC/KDTM) */
  vuGdkt: string;
  /** [nhãn Tư cách tố tụng, cách xưng trong đơn, trọng số] */
  tuCach: readonly (readonly [string, string, number])[];
  /** Quan hệ pháp luật / tội danh */
  qhpl: readonly string[];
  /** Lý do đề nghị theo cách xưng */
  lyDo: (xung: string) => readonly string[];
}

const LY_DO_DAN_SU = [
  'Tòa án cấp phúc thẩm chưa thu thập, đánh giá đầy đủ các tài liệu, chứng cứ về nguồn gốc và quá trình quản lý, sử dụng tài sản tranh chấp',
  'việc áp dụng pháp luật khi giải quyết vụ án chưa phù hợp với các tình tiết khách quan của vụ án',
  'bản án chưa xem xét đầy đủ các tài liệu, chứng cứ tôi đã cung cấp trong quá trình giải quyết vụ án',
  'kết luận của bản án chưa phù hợp với những tình tiết khách quan của vụ án, ảnh hưởng đến quyền và lợi ích hợp pháp của tôi',
  'Tòa án chưa đưa đầy đủ người có quyền lợi, nghĩa vụ liên quan vào tham gia tố tụng',
] as const;

const LOAI_AN_SEED: readonly (readonly [CauHinhLoaiAn, number])[] = [
  [{
    loaiAn: 'Dân sự', kyHieu: 'DS', vuGdkt: 'dân sự',
    tuCach: [['Nguyên đơn', 'nguyên đơn', 6], ['Bị đơn', 'bị đơn', 3], ['Người có quyền lợi, nghĩa vụ liên quan', 'người có quyền lợi, nghĩa vụ liên quan', 1]],
    qhpl: ['Tranh chấp quyền sử dụng đất', 'Tranh chấp hợp đồng vay tài sản', 'Tranh chấp về thừa kế tài sản', 'Tranh chấp hợp đồng chuyển nhượng quyền sử dụng đất', 'Tranh chấp đòi lại tài sản', 'Tranh chấp hợp đồng đặt cọc', 'Tranh chấp về bồi thường thiệt hại ngoài hợp đồng'],
    lyDo: () => LY_DO_DAN_SU,
  }, 34],
  [{
    loaiAn: 'Hình sự', kyHieu: 'HS', vuGdkt: 'hình sự',
    tuCach: [['Bị cáo', 'bị cáo', 13], ['Bị hại', 'bị hại', 7]],
    qhpl: ['Lừa đảo chiếm đoạt tài sản', 'Cố ý gây thương tích', 'Trộm cắp tài sản', 'Vi phạm quy định về tham gia giao thông đường bộ', 'Lạm dụng tín nhiệm chiếm đoạt tài sản', 'Tàng trữ trái phép chất ma túy'],
    lyDo: xung =>
      xung === 'bị hại'
        ? [
            'phần quyết định về trách nhiệm bồi thường thiệt hại chưa tương xứng với thiệt hại thực tế mà tôi phải gánh chịu',
            'bản án chưa xem xét đầy đủ chi phí điều trị, khoản thu nhập bị mất mà tôi đã cung cấp chứng cứ',
          ]
        : [
            'Tòa án chưa xem xét đầy đủ các tình tiết giảm nhẹ trách nhiệm hình sự như thành khẩn khai báo, đã tự nguyện bồi thường và có nhân thân tốt',
            'mức hình phạt áp dụng chưa tương xứng với tính chất, mức độ của hành vi và vai trò của tôi trong vụ án',
            'Tòa án cấp phúc thẩm chưa xem xét hoàn cảnh gia đình đặc biệt khó khăn của tôi khi quyết định hình phạt',
          ],
  }, 24],
  [{
    loaiAn: 'Hành chính', kyHieu: 'HC', vuGdkt: 'hành chính',
    tuCach: [['Nguyên đơn', 'người khởi kiện', 17], ['Người có quyền lợi, nghĩa vụ liên quan', 'người có quyền lợi, nghĩa vụ liên quan', 3]],
    qhpl: ['Khiếu kiện quyết định thu hồi đất, bồi thường, hỗ trợ và tái định cư', 'Khiếu kiện quyết định cấp giấy chứng nhận quyền sử dụng đất', 'Khiếu kiện quyết định xử phạt vi phạm hành chính trong lĩnh vực xây dựng', 'Khiếu kiện quyết định giải quyết khiếu nại về đất đai'],
    lyDo: () => [
      'việc đánh giá tính hợp pháp của quyết định hành chính bị kiện chưa xem xét đầy đủ trình tự, thủ tục ban hành quyết định',
      'bản án chưa xem xét đầy đủ các tài liệu về nguồn gốc, quá trình sử dụng đất mà tôi đã cung cấp',
      'kết luận của bản án chưa phù hợp với quy định của pháp luật đất đai tại thời điểm ban hành quyết định',
    ],
  }, 14],
  [{
    loaiAn: 'Kinh doanh thương mại', kyHieu: 'KDTM', vuGdkt: 'kinh doanh',
    tuCach: [['Nguyên đơn', 'nguyên đơn', 1], ['Bị đơn', 'bị đơn', 1]],
    qhpl: ['Tranh chấp hợp đồng mua bán hàng hóa', 'Tranh chấp hợp đồng tín dụng', 'Tranh chấp hợp đồng thi công xây dựng', 'Tranh chấp hợp đồng thuê tài sản'],
    lyDo: () => LY_DO_DAN_SU,
  }, 11],
  [{
    loaiAn: 'Hôn nhân gia đình', kyHieu: 'HNGĐ', vuGdkt: 'kinh doanh',
    tuCach: [['Nguyên đơn', 'nguyên đơn', 1], ['Bị đơn', 'bị đơn', 1]],
    qhpl: ['Ly hôn, tranh chấp về nuôi con và chia tài sản chung', 'Tranh chấp về chia tài sản sau khi ly hôn', 'Tranh chấp về cấp dưỡng nuôi con', 'Thay đổi người trực tiếp nuôi con sau khi ly hôn'],
    lyDo: () => [
      'việc phân chia tài sản chung chưa xem xét đầy đủ công sức đóng góp của tôi vào việc tạo lập, duy trì tài sản',
      'việc giao con cho bên kia trực tiếp nuôi dưỡng chưa xem xét đầy đủ điều kiện chăm sóc, giáo dục con tốt nhất',
      'bản án chưa xem xét đầy đủ các tài liệu, chứng cứ tôi đã cung cấp trong quá trình giải quyết vụ án',
    ],
  }, 11],
  [{
    loaiAn: 'Lao động', kyHieu: 'LĐ', vuGdkt: 'kinh doanh',
    // Người lao động khởi kiện, bên bị kiện là doanh nghiệp sử dụng lao động
    tuCach: [['Nguyên đơn', 'nguyên đơn', 1]],
    qhpl: ['Tranh chấp về trường hợp bị đơn phương chấm dứt hợp đồng lao động', 'Tranh chấp về tiền lương, trợ cấp thôi việc', 'Tranh chấp về bồi thường thiệt hại do tai nạn lao động'],
    lyDo: () => [
      'việc xác định người sử dụng lao động đơn phương chấm dứt hợp đồng lao động đúng pháp luật chưa phù hợp với chứng cứ trong hồ sơ',
      'bản án chưa tính đúng, đủ các khoản tiền lương, trợ cấp mà tôi được hưởng theo quy định của Bộ luật Lao động',
      'bản án chưa xem xét đầy đủ các tài liệu, chứng cứ tôi đã cung cấp trong quá trình giải quyết vụ án',
    ],
  }, 6],
];

const KET_DON = [
  'Tôi xin cam đoan những nội dung trình bày trên là đúng sự thật và chịu trách nhiệm trước pháp luật.',
  'Kính mong Quý Tòa xem xét, giải quyết.',
  'Tôi xin chân thành cảm ơn.',
] as const;

// ───────────────────────────── Hồ sơ seed ─────────────────────────────

export interface HoSoSeed {
  index: number;
  marker: string;
  nguoi: NguoiGia;
  hinhThucNhan: 'Trực tiếp' | 'Bưu điện';
  loaiAn: string;
  kyHieu: string;
  vuGdkt: string;
  tuCach: string;
  xung: string;
  capXetXu: 'Phúc thẩm';
  soBanAn: string;
  ngayBanAn: string;
  ngayToaNhan: string;
  ngayDauBuuDien: string;
  ngayGhiTrenDon: string;
  soDen: string;
  maBiThu: string;
  quanHePhapLuat: string;
  lyDo: string;
  ketDon: string;
  ghiChu: string;
  /** Số ngẫu nhiên [0,1) chọn Tỉnh / Phường/Xã trong danh mục thật (sắp theo mã) */
  uTinh: number;
  uXa: number;
  /** Chi tiết đầy đủ các bên, bản án sơ thẩm, kết quả giải quyết trước, đơn thụ lý kèm */
  chiTiet: ChiTietHoSo;
}

/**
 * Sinh danh sách hồ sơ 1..soLuong. Họ tên sinh tuần tự trên một luồng PRNG riêng để bảo đảm không trùng;
 * các thuộc tính khác sinh trên PRNG theo chỉ số → hồ sơ thứ i không phụ thuộc soLuong.
 */
export function taoDanhSachHoSo(soLuong: number, bo: BoSeed = {}): HoSoSeed[] {
  const seed = bo.seed ?? SEED;
  const ngayMoc = bo.ngayMoc ?? NGAY_MOC;
  const prefix = bo.markerPrefix ?? MARKER_PREFIX;
  if (!Number.isInteger(soLuong) || soLuong < 1 || soLuong > SO_HO_SO_TOI_DA) {
    throw new Error(`Số hồ sơ phải là số nguyên 1..${SO_HO_SO_TOI_DA}, nhận ${soLuong}`);
  }
  const rTen = mulberry32(seed);
  const daDung = new Set<string>();
  const dsTen: { hoTen: string; nam: boolean }[] = [];
  while (dsTen.length < SO_HO_SO_TOI_DA) {
    const nam = rTen() < 0.52;
    const hoTen = taoHoTen(rTen, nam);
    if (daDung.has(hoTen) || TEN_LOAI_TRU.has(hoTen)) continue;
    daDung.add(hoTen);
    dsTen.push({ hoTen, nam });
  }

  return dsTen.slice(0, soLuong).map(({ hoTen, nam }, i) => {
    const index = i + 1;
    const r = mulberry32(seed * 1000 + index);
    const nguoi = taoNguoi(r, hoTen, nam);
    const la = theoTiLe(r, LOAI_AN_SEED);
    const [tuCach, xung] = theoTiLe(r, la.tuCach.map(([nhan, x, w]) => [[nhan, x] as const, w] as const));

    // Ngày: tòa nhận trong ~11 tuần trước mốc; dấu bưu điện 1–6 ngày trước; ngày ghi đơn 0–10 ngày trước dấu bưu điện;
    // bản án phúc thẩm 45–330 ngày trước ngày ghi đơn (còn trong thời hạn đề nghị GĐT)
    const toaNhan = truocNgayMoc(ngayMoc, soNguyen(r, 0, 80));
    const dauBuuDien = truocNgayMoc(toaNhan, soNguyen(r, 1, 6));
    const ghiDon = truocNgayMoc(dauBuuDien, soNguyen(r, 0, 10));
    const banAn = truocNgayMoc(ghiDon, soNguyen(r, 45, 330));

    const marker = markerCua(index, prefix);
    const hs: HoSoSeed = {
      index,
      marker,
      nguoi,
      hinhThucNhan: r() < 0.55 ? 'Bưu điện' : 'Trực tiếp',
      loaiAn: la.loaiAn,
      kyHieu: la.kyHieu,
      vuGdkt: la.vuGdkt,
      tuCach,
      xung,
      capXetXu: 'Phúc thẩm',
      soBanAn: `${soNguyen(r, 8, 486)}/${banAn.getFullYear()}/${la.kyHieu}-PT`,
      ngayBanAn: ddmmyyyy(banAn),
      ngayToaNhan: ddmmyyyy(toaNhan),
      ngayDauBuuDien: ddmmyyyy(dauBuuDien),
      ngayGhiTrenDon: ddmmyyyy(ghiDon),
      soDen: String(soNguyen(r, 1200, 9800)),
      // Số hiệu bưu gửi quốc tế S10: 2 chữ + 9 số + VN
      maBiThu: `R${chon(r, ['R', 'E', 'A'])}${chuSo(r, 9)}VN`,
      quanHePhapLuat: chon(r, la.qhpl),
      lyDo: chon(r, la.lyDo(xung)),
      ketDon: chon(r, KET_DON),
      ghiChu: '',
      uTinh: r(),
      uXa: r(),
      chiTiet: undefined as unknown as ChiTietHoSo,
    };
    // Sinh sau cùng để không làm đổi các giá trị phía trên của bộ dữ liệu
    hs.ghiChu = chon(r, hs.hinhThucNhan === 'Bưu điện' ? GHI_CHU_BUU_DIEN : GHI_CHU_TRUC_TIEP);
    hs.chiTiet = taoChiTiet(hs, nam, { toaNhan, dauBuuDien, ghiDon, banAn }, seed);
    return hs;
  });
}

/** Ghi chú của cán bộ tiếp nhận — văn phong nghiệp vụ thật, KHÔNG ghi marker/chữ "demo" vào hệ thống */
const GHI_CHU_BUU_DIEN = [
  'Đơn gửi qua đường bưu điện, kèm bản sao bản án phúc thẩm.',
  'Nhận qua bưu điện; đơn kèm bản sao bản án và bản sao căn cước công dân.',
  'Đơn gửi bảo đảm qua bưu điện, tài liệu kèm theo gồm bản sao bản án sơ thẩm và phúc thẩm.',
  'Nhận qua bưu điện, đương sự chưa gửi kèm tài liệu chứng cứ mới.',
] as const;
const GHI_CHU_TRUC_TIEP = [
  'Đương sự trực tiếp nộp đơn tại bộ phận tiếp nhận, kèm bản sao căn cước công dân.',
  'Nộp trực tiếp; đơn kèm bản sao bản án phúc thẩm và các tài liệu liên quan.',
  'Đương sự nộp trực tiếp, cam kết bổ sung tài liệu chứng cứ trong thời hạn quy định.',
  'Đương sự kèm bản sao bản án và giấy tờ tùy thân.',
] as const;

/** Nội dung đơn theo loại án, tư cách và tòa đang chọn trên form */
export function noiDungDon(h: HoSoSeed, tenToa: string) {
  const vuAn =
    h.loaiAn === 'Hình sự'
      ? `vụ án hình sự về tội "${h.quanHePhapLuat}"`
      : `vụ án ${h.loaiAn.toLowerCase()} "${h.quanHePhapLuat}"`;
  return (
    `Tôi là ${h.xung} trong ${vuAn} đã được giải quyết bằng Bản án ${h.loaiAn.toLowerCase()} phúc thẩm số ${h.soBanAn} ` +
    `ngày ${h.ngayBanAn} của ${tenToa}. Tôi nhận thấy ${h.lyDo}. ` +
    'Vì vậy, tôi làm đơn này kính đề nghị Tòa án nhân dân tối cao xem xét lại bản án nêu trên theo thủ tục giám đốc thẩm, ' +
    `giải quyết theo đúng quy định của pháp luật. ${h.ketDon}`
  );
}

/**
 * Chuyển hồ sơ seed thành ThongTinDon của ThemMoiDonPage. `tinh`/`phuongXa` là nhãn danh mục thật đã chọn;
 * `toaAn` là từ khoá tìm tòa (tên tỉnh bỏ tiền tố) → TreeSelect chọn tòa thật đầu tiên khớp.
 */
export function thongTinDon(h: HoSoSeed, tinh: string, phuongXa: string): ThongTinDon {
  // Từ khoá tìm tòa cấp tỉnh: "thành phố Hà Nội" / "tỉnh Lâm Đồng" (không khớp nhầm "Tòa Phúc thẩm TANDTC tại Hà Nội")
  const tuKhoaToa = tinh.replace(/^Thành phố\s+/i, 'thành phố ').replace(/^Tỉnh\s+/i, 'tỉnh ').trim();
  return {
    nguoi: h.nguoi,
    ngayToaNhan: h.ngayToaNhan,
    ngayDauBuuDien: h.ngayDauBuuDien,
    ngayGhiTrenDon: h.ngayGhiTrenDon,
    capXetXu: h.capXetXu,
    soBanAn: h.soBanAn,
    ngayBanAn: h.ngayBanAn,
    loaiAn: h.loaiAn,
    tuCach: h.tuCach,
    donViChuyenDen: h.vuGdkt,
    toaAn: tuKhoaToa,
    tinh,
    phuongXa,
    noiDung: tenToa => noiDungDon(h, tenToa),
    ghiChu: h.ghiChu,
    soDen: h.soDen,
    maBiThu: h.maBiThu,
    quanHePhapLuat: h.quanHePhapLuat,
    // biDon/nguoiLienQuan: luồng seed nhập đương sự bằng dienNguoiDayDu (chiTiet), 2 trường này chỉ để đủ kiểu
    banAnSoTham: h.chiTiet.banAnSoTham,
    ketQua: { loai: 'Thông báo trả lời đơn', ...h.chiTiet.ketQuaTruoc },
    donThuLyKem: h.chiTiet.donThuLyKem,
    biDon: h.nguoi,
    nguoiLienQuan: h.nguoi,
  };
}

/** Chọn phần tử danh mục theo số [0,1) — danh mục đã sắp theo mã nên cùng danh mục → cùng kết quả */
export const chonTheoSo = <T>(ds: readonly T[], u: number) => ds[Math.min(ds.length - 1, Math.floor(u * ds.length))];

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** HTML trang đơn (in ra PDF làm "file đơn" bắt buộc tải lên) — trình bày như đơn thật, không ghi chú demo */
export function htmlDon(h: HoSoSeed, diaChiDayDu: string, tenToaDuKien: string) {
  const n = h.nguoi;
  const [dd, mm, yyyy] = h.ngayGhiTrenDon.split('/');
  const p = (s: string) => `<p>${escapeHtml(s)}</p>`;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
    body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; margin: 0 12mm; }
    .c { text-align: center; } .b { font-weight: bold; } .r { text-align: right; font-style: italic; }
    h1 { font-size: 15pt; text-align: center; margin: 18px 0 4px; }
  </style></head><body>
    <p class="c b">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br>Độc lập - Tự do - Hạnh phúc</p>
    <p class="r">Ngày ${dd} tháng ${mm} năm ${yyyy}</p>
    <h1>ĐƠN ĐỀ NGHỊ XEM XÉT THEO THỦ TỤC GIÁM ĐỐC THẨM</h1>
    <p class="c">Kính gửi: Chánh án Tòa án nhân dân tối cao</p>
    ${p(`Họ và tên: ${n.hoTen}. Giới tính: ${n.gioiTinh}. Ngày sinh: ${n.ngaySinh}.`)}
    ${p(`Số CCCD: ${n.cccd}. Số điện thoại: ${n.sdt}.`)}
    ${p(`Địa chỉ liên hệ: ${diaChiDayDu}.`)}
    ${p(noiDungDon(h, tenToaDuKien))}
    <p class="r" style="margin-top:36px">Người làm đơn<br><br><br><span class="b" style="font-style:normal">${escapeHtml(n.hoTen)}</span></p>
  </body></html>`;
}

/** Tên file ASCII cho upload: Don-de-nghi-GDT-Nguyen-Van-Hoang.pdf */
export const tenFileDon = (h: HoSoSeed) =>
  `Don-de-nghi-GDT-${h.nguoi.hoTen
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, '-')}.pdf`;

// ───────────────────────────── Chi tiết đầy đủ (không để trống) ─────────────────────────────
//
// Nhãn Dân tộc / Tôn giáo / Nghề nghiệp / Chức vụ / Ngoại ngữ / Trình độ / Thành phần gia đình lấy NGUYÊN VĂN danh mục QTDM
// (DANTOC, TONGIAO, NGHE_NGHIEP, CHUC_VU, NGOAINGU, TRINH_DO_VAN_HOA, TRINHDODAOTAO, THANHPHANGIADINH); script seed đối chiếu
// với danh mục thật trước khi chạy, thiếu nhãn nào thì dừng. Tỉnh/Phường-Xã chỉ giữ số [0,1), chọn trên danh mục thật lúc chạy.
// Chuỗi {XA}, {TINH} trong nơi làm việc / địa chỉ được thay bằng tên địa danh thật đã chọn.

/** Địa chỉ chưa chọn địa danh: số [0,1) để chọn Tỉnh / Phường-Xã trong danh mục thật; `cungTinh` = dùng tỉnh của nơi ở hiện tại */
export interface DiaChiSeed {
  uTinh: number;
  uXa: number;
  soNha: string;
  /** Dùng lại đúng địa chỉ nơi ở hiện tại */
  giongHienTai?: boolean;
}

export interface NguoiSeed extends NguoiGia {
  ngayCap: string;
  noiCap: string;
  /** Các ô danh mục không ràng buộc nghiệp vụ: số [0,1) để chọn ngẫu nhiên trong danh mục thật lúc chạy */
  uDanToc: number;
  uTonGiao: number;
  quocTich: string;
  uNgheNghiep: number;
  uChucVu: number;
  noiLamViec: string;
  uNgoaiNgu: number;
  uTrinhDoVanHoa: number;
  uTrinhDoDaoTao: number;
  uThanhPhanGiaDinh: number;
  email: string;
  fax?: string;
  congChucVienChuc: boolean;
  ghiChu: string;
  noiSinh: DiaChiSeed;
  queQuan: DiaChiSeed;
  hktt: DiaChiSeed;
  tamTru: DiaChiSeed;
  hienTai: DiaChiSeed;
}

export interface PhapNhanSeed {
  loai: 'UBND' | 'DOANH_NGHIEP';
  /** Tên có thể chứa {XA}/{TINH} (UBND) — thay khi chạy */
  ten: string;
  tenEn: string;
  tenVietTat: string;
  tuKhoaPhanLoai: string[];
  ngayThanhLap: string;
  coQuanQuyetDinh?: string;
  giayChungNhanSo?: string;
  ngayCapChungNhan?: string;
  coQuanCapChungNhan?: string;
  coQuanKhac: string;
  moTa: string;
  sdt: string;
  tienAn: string;
  truSo: DiaChiSeed;
}

export type BenSeed = { nguoi: NguoiSeed } | { phapNhan: PhapNhanSeed };

export interface ChiTietHoSo {
  nguoiDungDon: NguoiSeed;
  /** Bên đối lập với người đứng đơn (bị đơn / nguyên đơn / UBND / doanh nghiệp / bị cáo khi đứng đơn là bị hại) */
  benKhac: BenSeed;
  /** Người có quyền lợi, nghĩa vụ liên quan (án không phải hình sự) */
  nguoiLienQuan: NguoiSeed;
  banAnSoTham: { so: string; ngay: string };
  ketQuaTruoc: { so: string; ngay: string };
  donThuLyKem: { soDen: string; ngayNhan: string; ngayGhi: string };
  noiDungKhieuNai: string;
}

const NOI_CAP_CCCD = 'Cục Cảnh sát quản lý hành chính về trật tự xã hội';

/** Nơi làm việc (dùng chung cho mọi nghề; {XA}, {TINH} thay bằng địa danh thật lúc chạy) */
const NOI_LAM_VIEC = [
  'Sản xuất nông nghiệp tại {XA}',
  'Kinh doanh tại {XA}, {TINH}',
  'Làm nội trợ tại gia đình',
  'Công ty TNHH Thương mại Minh Khang Phát',
  'Công ty Cổ phần Xây dựng Tân Hưng Thịnh',
  'Công ty TNHH May mặc Phú An Gia',
  'Công ty Cổ phần Vận tải Nam Việt Khang',
  'Trường Trung học cơ sở {XA_GON}',
  'Ủy ban nhân dân {XA}',
  'Trung tâm Y tế khu vực {TINH_GON}',
  'Hợp tác xã vận tải {TINH_GON}',
] as const;

const GHI_CHU_NGUOI = [
  'Đương sự có mặt thường xuyên tại địa phương.',
  'Liên hệ qua số điện thoại đã cung cấp.',
  'Đương sự đã cung cấp bản sao căn cước công dân.',
  'Địa chỉ liên lạc trùng với nơi ở hiện tại.',
] as const;

const khongDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

function taoDiaChi(r: Rng, giongHienTai = false): DiaChiSeed {
  const soNha =
    r() < 0.55
      ? `Số ${soNguyen(r, 2, 280)}${r() < 0.5 ? `, ngõ ${soNguyen(r, 3, 120)}` : ''} đường ${chon(r, DUONG)}`
      : r() < 0.5
        ? `Tổ dân phố số ${soNguyen(r, 1, 18)}`
        : `Thôn ${chon(r, THON)}`;
  return { uTinh: r(), uXa: r(), soNha, giongHienTai };
}

/** Người đầy đủ; `hienTai` truyền vào để người đứng đơn khớp địa chỉ liên lạc của đơn */
function taoNguoiSeed(r: Rng, co: NguoiGia, nam: boolean, hienTai: DiaChiSeed): NguoiSeed {
  const namSinh = Number(co.ngaySinh.slice(-4));
  const ngayCap = new Date(2021 + soNguyen(r, 0, 4), soNguyen(r, 0, 11), soNguyen(r, 1, 28));
  const phanTen = khongDau(co.hoTen).toLowerCase().split(' ');
  const email = `${phanTen[phanTen.length - 1]}${phanTen.slice(0, -1).map(p => p[0]).join('')}${String(namSinh).slice(2)}${r() < 0.4 ? soNguyen(r, 1, 99) : ''}@gmail.com`;
  const noiSinh = taoDiaChi(r);
  return {
    ...co,
    ngayCap: ddmmyyyy(ngayCap),
    noiCap: NOI_CAP_CCCD,
    uDanToc: r(),
    uTonGiao: r(),
    quocTich: 'Việt Nam',
    uNgheNghiep: r(),
    uChucVu: r(),
    noiLamViec: chon(r, NOI_LAM_VIEC),
    uNgoaiNgu: r(),
    uTrinhDoVanHoa: r(),
    uTrinhDoDaoTao: r(),
    uThanhPhanGiaDinh: r(),
    email,
    fax: `02${chuSo(r, 9)}`,
    congChucVienChuc: r() < 0.25,
    ghiChu: chon(r, GHI_CHU_NGUOI),
    noiSinh,
    // Quê quán thường trùng nơi sinh; HKTT, tạm trú đa số trùng nơi ở hiện tại
    queQuan: r() < 0.7 ? noiSinh : taoDiaChi(r),
    hktt: r() < 0.8 ? { ...hienTai, giongHienTai: true } : taoDiaChi(r),
    tamTru: { ...hienTai, giongHienTai: true },
    hienTai,
  };
}

/** Người khác (bị đơn, người liên quan, bị cáo): họ tên khác người đứng đơn */
function taoNguoiKhac(r: Rng, tranhTen: string, gioiTinh?: 'Nam' | 'Nữ'): NguoiSeed {
  const nam = gioiTinh ? gioiTinh === 'Nam' : r() < 0.52;
  let hoTen = taoHoTen(r, nam);
  while (hoTen === tranhTen || TEN_LOAI_TRU.has(hoTen)) hoTen = taoHoTen(r, nam);
  const co = taoNguoi(r, hoTen, nam);
  return taoNguoiSeed(r, co, nam, taoDiaChi(r));
}

const LINH_VUC_DN = [
  ['Thương mại và Dịch vụ', 'TRADING AND SERVICES', 'kinh doanh thương mại, dịch vụ'],
  ['Xây dựng và Thương mại', 'CONSTRUCTION AND TRADING', 'thi công xây dựng công trình dân dụng'],
  ['Sản xuất và Thương mại', 'MANUFACTURING AND TRADING', 'sản xuất, gia công hàng hóa'],
  ['Vận tải và Logistics', 'TRANSPORT AND LOGISTICS', 'vận tải hàng hóa, kho bãi'],
  ['Thực phẩm', 'FOOD', 'chế biến, phân phối thực phẩm'],
  ['May mặc', 'GARMENT', 'sản xuất hàng may mặc'],
] as const;
const THUONG_HIEU = ['Minh Khang Phát', 'Tân Hưng Thịnh', 'Phú An Gia', 'Đức Thành Tín', 'Bảo Ngọc Lâm', 'Thiên An Phúc', 'Nam Việt Khang', 'Quang Minh Đạt', 'Hải Đăng Phát', 'Trường Thịnh Phát', 'Kim Ngân Phúc', 'Hòa An Lộc', 'Thành Công Mới', 'Việt Tiến Hưng', 'Đông Nam Phát'] as const;

function taoDoanhNghiep(r: Rng): PhapNhanSeed {
  const [linhVuc, linhVucEn, moTa] = chon(r, LINH_VUC_DN);
  const hieu = chon(r, THUONG_HIEU);
  const coPhan = r() < 0.35;
  const thanhLap = new Date(2005 + soNguyen(r, 0, 15), soNguyen(r, 0, 11), soNguyen(r, 1, 28));
  const maSo = `0${soNguyen(r, 1, 8)}${chuSo(r, 8)}`;
  const hieuEn = khongDau(hieu).toUpperCase();
  return {
    loai: 'DOANH_NGHIEP',
    ten: `${coPhan ? 'Công ty Cổ phần' : 'Công ty TNHH'} ${linhVuc} ${hieu}`,
    // Ô Tên tiếng Anh tối đa 50 ký tự
    tenEn: [`${hieuEn} ${linhVucEn} ${coPhan ? 'JOINT STOCK COMPANY' : 'COMPANY LIMITED'}`, `${hieuEn} ${linhVucEn} ${coPhan ? 'JSC' : 'CO., LTD'}`, `${hieuEn} ${coPhan ? 'JOINT STOCK COMPANY' : 'COMPANY LIMITED'}`].find(t => t.length <= 50) ?? `${hieuEn} ${coPhan ? 'JSC' : 'CO., LTD'}`,
    tenVietTat: `${hieuEn.replace(/\s+/g, '')} ${coPhan ? 'JSC' : 'CO., LTD'}`,
    tuKhoaPhanLoai: ['Doanh nghiệp', 'Công ty', 'Kinh tế'],
    ngayThanhLap: ddmmyyyy(thanhLap),
    giayChungNhanSo: maSo,
    ngayCapChungNhan: ddmmyyyy(thanhLap),
    // Ô tối đa 50 ký tự
    coQuanCapChungNhan: 'Sở Kế hoạch và Đầu tư {TINH}',
    coQuanKhac: 'Không',
    moTa: `Doanh nghiệp hoạt động trong lĩnh vực ${moTa}.`,
    sdt: `${chon(r, DAU_SO_DI_DONG)}${chuSo(r, 7)}`,
    tienAn: 'Không',
    truSo: taoDiaChi(r),
  };
}

function taoUbnd(r: Rng, hienTaiNguoiKien: DiaChiSeed): PhapNhanSeed {
  return {
    loai: 'UBND',
    ten: 'Ủy ban nhân dân {XA_THUONG}',
    tenEn: "People's Committee of {XA_EN}",
    tenVietTat: 'UBND {XA_THUONG}',
    tuKhoaPhanLoai: ['Cơ quan nhà nước', 'Nhà nước', 'Hành chính', 'Cơ quan'],
    // Chính quyền cấp xã sau sắp xếp đơn vị hành chính hoạt động từ 01/07/2025
    ngayThanhLap: '01/07/2025',
    coQuanQuyetDinh: 'Ủy ban Thường vụ Quốc hội',
    coQuanKhac: 'Không',
    moTa: 'Cơ quan hành chính nhà nước ở địa phương.',
    sdt: `02${chuSo(r, 8)}`.slice(0, 10),
    tienAn: 'Không',
    // Người khởi kiện kiện UBND nơi mình cư trú
    truSo: { ...hienTaiNguoiKien, soNha: `Số ${soNguyen(r, 1, 120)} đường ${chon(r, DUONG)}`, giongHienTai: true },
  };
}

function taoChiTiet(
  h: HoSoSeed,
  nam: boolean,
  ngay: { toaNhan: Date; dauBuuDien: Date; ghiDon: Date; banAn: Date },
  seed: number = SEED,
): ChiTietHoSo {
  const r = mulberry32(seed * 7919 + h.index);
  const hienTai: DiaChiSeed = { uTinh: h.uTinh, uXa: h.uXa, soNha: h.nguoi.diaChi };
  const nguoiDungDon = taoNguoiSeed(r, h.nguoi, nam, hienTai);
  const doiGioi = h.nguoi.gioiTinh === 'Nam' ? 'Nữ' : 'Nam';
  let benKhac: BenSeed;
  if (h.loaiAn === 'Hành chính') benKhac = { phapNhan: taoUbnd(r, hienTai) };
  else if (h.loaiAn === 'Kinh doanh thương mại' || h.loaiAn === 'Lao động') benKhac = { phapNhan: taoDoanhNghiep(r) };
  else benKhac = { nguoi: taoNguoiKhac(r, h.nguoi.hoTen, h.loaiAn === 'Hôn nhân gia đình' ? doiGioi : undefined) };
  const nguoiLienQuan = taoNguoiKhac(r, h.nguoi.hoTen);

  const soTham = truocNgayMoc(ngay.banAn, soNguyen(r, 90, 240));
  const khoang = Math.round((ngay.ghiDon.getTime() - ngay.banAn.getTime()) / 86_400_000);
  const ketQua = truocNgayMoc(ngay.ghiDon, soNguyen(r, 5, Math.max(6, khoang - 10)));
  const ghiKem = truocNgayMoc(ngay.ghiDon, soNguyen(r, 3, Math.max(4, Math.min(30, khoang - 5))));
  const nhanKem = new Date(ghiKem);
  nhanKem.setDate(nhanKem.getDate() + soNguyen(r, 2, 6));
  if (nhanKem > ngay.toaNhan) nhanKem.setTime(ngay.toaNhan.getTime());

  return {
    nguoiDungDon,
    benKhac,
    nguoiLienQuan,
    banAnSoTham: { so: `${soNguyen(r, 12, 520)}/${soTham.getFullYear()}/${h.kyHieu}-ST`, ngay: ddmmyyyy(soTham) },
    ketQuaTruoc: { so: `${soNguyen(r, 15, 890)}/TB-TA`, ngay: ddmmyyyy(ketQua) },
    donThuLyKem: { soDen: String(soNguyen(r, 1200, 9800)), ngayNhan: ddmmyyyy(nhanKem), ngayGhi: ddmmyyyy(ghiKem) },
    noiDungKhieuNai:
      h.xung === 'bị hại'
        ? `Đề nghị xem xét lại phần trách nhiệm bồi thường thiệt hại trong bản án về tội "${h.quanHePhapLuat}".`
        : `Đề nghị xem xét lại tội danh "${h.quanHePhapLuat}" và mức hình phạt đã tuyên.`,
  };
}

/** Tên xã/tỉnh dùng trong văn bản: "Xã Hòa Long" → gọn "Hòa Long", thường "xã Hòa Long", tiếng Anh "Hoa Long Commune" */
export function bienDiaDanh(tinh: string, xa: string) {
  const loaiXa = /^(Phường|Xã|Đặc khu|Thị trấn)\s+/i.exec(xa)?.[1] ?? '';
  const xaGon = xa.replace(/^(Phường|Xã|Đặc khu|Thị trấn)\s+/i, '').trim();
  const tinhGon = tinh.replace(/^(Thành phố|Tỉnh|TP\.?)\s+/i, '').trim();
  const en = { 'Phường': 'Ward', 'Xã': 'Commune', 'Đặc khu': 'Special Zone', 'Thị trấn': 'Township' }[loaiXa] ?? 'Commune';
  return {
    '{XA}': xa,
    '{XA_GON}': xaGon,
    '{XA_THUONG}': loaiXa ? `${loaiXa.toLowerCase()} ${xaGon}` : xa,
    '{XA_EN}': `${khongDau(xaGon)} ${en}`,
    '{TINH}': tinh,
    '{TINH_GON}': tinhGon,
  };
}

/** Thay {XA}, {TINH}... trong chuỗi */
export const thayDiaDanh = (s: string, bien: Record<string, string>) =>
  Object.entries(bien).reduce((kq, [k, v]) => kq.split(k).join(v), s);
