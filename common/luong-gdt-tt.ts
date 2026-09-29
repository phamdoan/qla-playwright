/**
 * Các bước của "Luồng nhập data.txt" (GĐT/TT) cho MỘT bản án, dùng chung cho các file theo ngày
 * tests/luong-gdt-tt-<dd-mm-yyyy>.spec.ts — file theo ngày chỉ khai bộ dữ liệu rồi gọi dangKyLuongGdtTT.
 *
 * Nguồn nghiệp vụ và bảng đối chiếu bước ↔ code: docs/Playwright nhập data GDT-TT.(docx|txt) và
 * docs/doi-chieu-luong-gdt-tt.md — thêm/sửa bước ở tài liệu thì cập nhật bảng đối chiếu cùng lúc.
 *
 * SỐ BƯỚC KHỚP 100% tài liệu "Playwright nhập data GDT-TT-báo cáo thống kê.txt" (23 bước). Hai bước có
 * trên hệ thống mà tài liệu thiếu thì mang số phụ: B10b (Giao tiểu hồ sơ) và B13b (Người ký ban hành
 * Quyết định kháng nghị). Bước 23 của tài liệu là đăng nhập lại rồi mở màn Quản lý vụ xét xử — spec làm phần kiểm chứng.
 *
 *   B1–B2  Cán bộ nhập đơn theo bản án (không OCR) → tra cứu → chọn người từ bản án cũ → Lưu
 *   B3     Phân công thẩm phán (ngẫu nhiên) ở màn Quản lý đơn
 *   B4     Tờ trình phân công thẩm phán → Trình ký
 *   B5     Tờ thông báo phân công thẩm phán → Trình ký  (chỉ lập được SAU KHI tờ trình đã duyệt,
 *          nên trong spec nó chạy sau B9 — đây là chỗ DUY NHẤT thứ tự chạy khác tài liệu)
 *   B7a    Chánh văn phòng duyệt Tờ trình → Cấp trình tiếp "Phó chánh án", người trình "Nguyễn Hải Trâm"
 *   B7b    Chánh văn phòng ký logic Tờ thông báo
 *   B9     Phó Chánh án phê duyệt đề xuất phân công thẩm phán
 *   ── nhánh Vụ Giám đốc kiểm tra (tài khoản + giá trị nghiệp vụ đọc từ config/luong-gdt.json) ──
 *   B10    Thư ký Vụ      · Nhận đơn và TL vụ án › tab "Đã có vụ án": đơn phải hiển thị
 *   B10b   Thư ký Vụ      · Giao tiểu hồ sơ (Giao THS — màn riêng). TÀI LIỆU THIẾU, hệ thống vẫn cần
 *   B11    Vụ trưởng      · Phân công TTV › Chưa phân công TTV › Phân công chỉ định (TTV + Lãnh đạo)
 *   B12a   Thẩm tra viên  · Quản lý vụ án › tab Tờ trình › Tạo dự thảo kết quả giải quyết (Kháng nghị)
 *   B12b   Thẩm tra viên  · Trình văn bản dự thảo → Cấp trình "Phó Chánh án TANDTC" → Xin ý kiến
 *   B13    Phó Chánh án   · Phê duyệt đề xuất › tick dự thảo → nút "Duyệt"
 *   B13b   Người ký       · Ký logic Quyết định kháng nghị giám đốc thẩm. TÀI LIỆU THIẾU
 *   B14    Thư ký Vụ      · Hồ sơ kháng nghị › chuyển hồ sơ đi → nhận ở tab hồ sơ đến (sinh vụ xét xử GĐ2)
 *   B15    Vụ trưởng      · Quản lý xét xử GĐT › Xem chi tiết › tab Thụ lý › nút "Thụ lý"
 *   B16    Vụ trưởng      · Phân công thẩm phán › tab "DS chưa phân công NGẪU NHIÊN", lọc Hình thức
 *                           "Hồ sơ kháng nghị GĐT-TT" → "Phân công ngẫu nhiên" (hệ thống tự chọn thẩm
 *                           phán, KHÔNG nhập tên) → tờ trình MS_02_TC → Lấy số → Trình ký
 *   B17    Phó Chánh án   · Ký logic Tờ trình phân công thẩm phán tối cao
 *   B18    Vụ trưởng      · Phân công TTV cho HỒ SƠ KHÁNG NGHỊ (lọc Hình thức "Hồ sơ kháng nghị GĐT-TT")
 *   B19    Vụ trưởng      · Tạo danh sách vụ xét xử (hội đồng + lịch) → Danh sách tham mưu › Lấy số ›
 *                           Trình ký › Gửi
 *   B20    Chánh án       · Phê duyệt Chương trình làm việc HĐXX (CTLVHDXX — trình lên Chánh án)
 *   B21    Vụ trưởng      · Phân công Hội đồng xét xử › thêm 2 biểu mẫu (QĐ thành lập HĐXX, Thông báo
 *                           VKS tham gia phiên tòa) → nơi nhận → Lưu → Trình ký › Gửi
 *   B22    Phó Chánh án   · Ký logic hai biểu mẫu Hội đồng xét xử
 *   B23    Vụ trưởng      · Quản lý xét xử GĐT › lọc Số/Ngày BA/QĐ › mở chi tiết tab "Kết quả xét xử"
 *                           (còn TODO: làm gì ở tab đó — chờ nghiệp vụ)
 * B17–B22 đã chạy xác nhận trên STG với VA017 (VA26-004096, 27/09/2026); B17+B18 đạt 22/22 lượt cho
 * 22 vụ. Tài liệu nghiệp vụ: docs/Playwright nhập data GDT-TT.(docx|txt) bản 27/09/2026.
 * Đối chiếu tài liệu ↔ code: docs/doi-chieu-luong-gdt-tt.md.
 *
 * Thứ tự chạy KHÁC thứ tự tài liệu ở một chỗ: B5 (Thông báo phân công) chạy SAU B8–B9, vì chỉ lập được
 * thông báo khi tờ trình đã được Phó Chánh án phê duyệt.
 *
 * Mỗi bản án một describe serial: bước lỗi chỉ dừng bản án đó, bản án khác vẫn chạy (không tắc cả đợt).
 * Chạy lại an toàn: bước đã xong bị bỏ qua theo sổ cái seed-output/<tenSoCai>.<env>.ledger.json.
 */
import { expect, test } from '@playwright/test';
import { choPhepGhiTKM } from '../account';
import { choHetSpin, chonSelect, hienTrong, nghi } from './antd';
import { BanAnSoTham } from './ban-an-so-tham';
import { nhapDonTuBanAn } from './buoc-nhap-don';
import { cauHinhLuong, giaTri, taiKhoan } from './cau-hinh-luong';
import { moTrangVaiCauHinh, moTrangVaiTKM } from './luong-tkm';
import { moMenu } from './menu';
import { soCai } from './so-cai-tkm';
import { GdtPage } from '../pages/gdt.page';
import { HctpPage } from '../pages/hctp.page';
import { PheDuyetPage } from '../pages/phe-duyet.page';
import { ThemMoiDonPage } from '../pages/them-moi-don.page';

/** Người duyệt / người ký theo Luồng nhập data.txt */
const NGUOI_DUYET = 'Nguyễn Thị Thu Hường';
const NGUOI_KY = 'Nguyễn Tường Linh';
const CAP_TRINH_TIEP = 'Phó chánh án';
const NGUOI_TRINH_TIEP = 'Nguyễn Hải Trâm';

const MOI_TRUONG = process.env.QLA_ENV || 'stg';

export interface VuLuongGdtTT {
  /** Tên nhóm test hiển thị trên UI/báo cáo */
  tieuDe: string;
  banAn: BanAnSoTham;
}

/**
 * Vụ Giám đốc kiểm tra xử lý nhánh B10+ — vai (khoá taiKhoan) và khoá nghiepVu riêng của Vụ đó
 * trong config/luong-gdt.json. Mặc định là Vụ GĐKT về hình sự.
 */
export interface VuGdkt {
  thuKyVu: string;
  vuTruong: string;
  thamTraVien: string;
  /**
   * Vai làm Bước 14 (Hồ sơ kháng nghị). Tách khỏi thuKyVu vì màn "Hồ sơ kháng nghị đi" lọc theo
   * QuanLyAnPermissionSpecificationFactory#donKetQuaReadPredicate: cán bộ KHÔNG phải lãnh đạo
   * (CAN_BO.MA_CHUC_VU không nằm trong danh sách chức vụ lãnh đạo) chỉ thấy DON_KETQUA do chính
   * mình tạo, mà bản ghi KHANG_NGHI lại do người ký quyết định tạo ra. Mặc định vẫn là thuKyVu.
   */
  hoSoKhangNghi?: string;
  /** Khoá nghiepVu thay thế, vd. { thamTraVien: 'thamTraVienDanSu' } */
  doiGiaTri?: Record<string, string>;
}

export const VU_GDKT_HINH_SU: VuGdkt = {
  thuKyVu: 'thuKyVu',
  vuTruong: 'vuTruong',
  thamTraVien: 'thamTraVien',
  hoSoKhangNghi: 'thuKyVuHoSoKhangNghi',
};

export interface TuyChonLuongGdtTT {
  /** Tên sổ cái (seed-output/<tenSoCai>.<env>.ledger.json) */
  tenSoCai: string;
  /** Vụ GĐKT nhận vụ ở B10+ (mặc định Vụ hình sự) */
  vuGdkt?: VuGdkt;
}

/** Vai chưa khai tài khoản (config hoặc biến môi trường) */
const thieuTaiKhoan = (vai: string) => {
  try {
    taiKhoan(vai);
    return false;
  } catch {
    return true;
  }
};

/**
 * Mở đề xuất "Tờ trình phân công thẩm phán" để ký/duyệt.
 *
 * Ưu tiên id lấy khi trình ký. Id không còn trong danh sách phê duyệt (đổi vai xử lý, bản ghi rơi khỏi
 * bộ lọc của tài khoản…) thì tìm theo TÊN LOẠI văn bản rồi CHỐT DANH TÍNH VỤ trước khi thao tác — không
 * chốt danh tính là ký nhầm tờ trình của vụ khác. Trả về false khi đề xuất đã duyệt xong từ lần trước.
 */
async function moDeXuatToTrinh(pd: PheDuyetPage, khoa: string | undefined, b: BanAnSoTham): Promise<boolean> {
  if (khoa) {
    try {
      return await pd.moChiTietTheoId(khoa);
    } catch (loi) {
      console.log('    · Không thấy đề xuất theo id ' + khoa + ' → tìm theo tên loại văn bản. ' + (loi as Error).message);
      await pd.mo();
    }
  }
  const tuLuc = new Date(Date.now() - 7 * 24 * 3600_000);
  return pd.moChiTietDungVu(/Tờ trình phân công/i, dauHieuVu(b), tuLuc);
}

/** Dấu hiệu nhận ra vụ trên trang phê duyệt: số bản án + tên đương sự/bị cáo */
function dauHieuVu(b: BanAnSoTham): string[] {
  const x = b as { biCao?: string; nguyenDon?: string; duongSu?: string };
  return [b.soBanAn, x.biCao || '', x.nguyenDon || '', x.duongSu || ''].filter(Boolean);
}

export function dangKyLuongGdtTT(dsVu: VuLuongGdtTT[], { tenSoCai, vuGdkt = VU_GDKT_HINH_SU }: TuyChonLuongGdtTT) {
  const { docDong, daXongBuoc, ghiSoCai } = soCai(tenSoCai);
  /** Giá trị nghiệp vụ theo Vụ đang chạy (khoá thay thế nếu có) */
  const gt = (khoa: string) => giaTri(vuGdkt.doiGiaTri?.[khoa] ?? khoa);
  /** Vai làm Bước 14; chưa khai trong config thì quay về Thư ký Vụ */
  const vaiHoSoKhangNghi =
    vuGdkt.hoSoKhangNghi && !thieuTaiKhoan(vuGdkt.hoSoKhangNghi) ? vuGdkt.hoSoKhangNghi : vuGdkt.thuKyVu;
  const vaiThieu = [vuGdkt.thuKyVu, vuGdkt.vuTruong, vuGdkt.thamTraVien].filter(thieuTaiKhoan);
  const lyDoThieuVai = `Chưa khai tài khoản ${vaiThieu.join(', ')} trong config/luong-gdt.json → chưa chạy được nhánh Vụ GĐKT`;

  for (const { tieuDe, banAn: b } of dsVu) {
    test.describe(tieuDe, () => {
      test.describe.configure({ mode: 'serial' });
      test.beforeEach(() => {
        test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
      });

      // Dữ liệu nối giữa các bước của chính bản án này
      let maDon = '';
      let soThuLy = '';
      let khoaToTrinh: string | undefined;
      let khoaThongBao: string | undefined;
      let khoaDuThao: string | undefined;

      test('B1–B2 · Nhập đơn theo bản án', async ({ browser }, testInfo) => {
        testInfo.setTimeout(12 * 60_000);
        const ghi = (type: string, description: string) => testInfo.annotations.push({ type, description });
        const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CANBO');

        // Đã chạy bản án này rồi thì dùng lại đơn cũ, không tạo đơn trùng
        const daGhi = docDong(b);
        let daCo = daGhi?.maDon ? { maDon: daGhi.maDon, soThuLy: daGhi.soThuLy || '' } : null;
        if (!daCo) daCo = await new ThemMoiDonPage(page).timDonDaNhapTheoBanAn(b.noiDungGoiY);

        if (daCo?.maDon) {
          maDon = daCo.maDon;
          soThuLy = daCo.soThuLy;
          ghi('bỏ qua', `Bản án ${b.soBanAn} – ${b.ngayBanAn} đã có đơn ${maDon}${soThuLy ? ` (số TL ${soThuLy})` : ''} → không nhập lại`);
          ghiSoCai(b, { maDon, soThuLy, xongBuoc: 'nhapDon' });
        } else {
          const kq = await nhapDonTuBanAn(page, b, testInfo);
          maDon = kq.maDon;
          soThuLy = kq.soThuLy;
          ghiSoCai(b, { maDon, soThuLy, idDon: kq.idDon, xongBuoc: 'nhapDon' });
        }
        await context.close();
      });

      test('B3 · Phân công thẩm phán (ngẫu nhiên)', async ({ browser }, testInfo) => {
        test.skip(daXongBuoc(b, 'phanCong'), 'Bản án này đã phân công thẩm phán ở lần chạy trước');
        // Chạy riêng bước này (--grep) thì biến trong bộ nhớ chưa có → đọc lại từ sổ cái
        soThuLy = soThuLy || docDong(b)?.soThuLy || '';
        maDon = maDon || docDong(b)?.maDon || '';
        expect(soThuLy, 'Chưa có số thụ lý trong sổ cái — chạy B1–B2 trước').toBeTruthy();
        const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CANBO');
        await new HctpPage(page).phanCongThamPhanNgauNhien(soThuLy);
        ghiSoCai(b, { xongBuoc: 'phanCong' });
        await context.close();
      });

      test('B4 · Tờ trình phân công thẩm phán → Trình ký', async ({ browser }, testInfo) => {
        test.skip(daXongBuoc(b, 'toTrinh'), 'Bản án này đã lập Tờ trình ở lần chạy trước');
        testInfo.setTimeout(8 * 60_000);
        // Chạy riêng bước này (--grep) thì maDon trong bộ nhớ còn rỗng → đọc lại từ sổ cái.
        // Thiếu dòng này thì danh sách đơn không được lọc và tờ trình rơi vào một đơn bất kỳ.
        maDon = maDon || docDong(b)?.maDon || '';
        expect(maDon, 'Chưa có mã đơn trong sổ cái — chạy B1–B2 trước').toBeTruthy();
        const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CANBO');
        khoaToTrinh = await new HctpPage(page).lapTamTrinhPhanCong(maDon, NGUOI_DUYET, NGUOI_KY);
        expect(khoaToTrinh, 'Không lấy được id yêu cầu phê duyệt của Tờ trình phân công').toBeTruthy();
        ghiSoCai(b, { khoaToTrinh, xongBuoc: 'toTrinh' });
        testInfo.annotations.push({ type: 'khoá tờ trình', description: String(khoaToTrinh) });
        await context.close();
      });

      test('B7a · Chánh văn phòng cho ý kiến, trình Phó Chánh án, ký logic', async ({ browser }, testInfo) => {
        test.skip(daXongBuoc(b, 'kyToTrinh'), 'Tờ trình của bản án này đã ký logic ở lần chạy trước');
        khoaToTrinh = khoaToTrinh || docDong(b)?.khoaToTrinh;
        const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CVP');
        const pd = new PheDuyetPage(page);
        await pd.mo();
        // false = yêu cầu đã duyệt xong từ lần chạy trước
        if (await moDeXuatToTrinh(pd, khoaToTrinh, b)) {
          await pd.ykienVaKyLogic('Đồng ý phân công Thẩm phán, kính trình Phó Chánh án phê duyệt.', CAP_TRINH_TIEP, NGUOI_TRINH_TIEP);
        }
        ghiSoCai(b, { xongBuoc: 'kyToTrinh' });
        await context.close();
      });

      test('B9 · Phó Chánh án phê duyệt Tờ trình', async ({ browser }, testInfo) => {
        test.skip(daXongBuoc(b, 'duyetToTrinh'), 'Tờ trình của bản án này đã được phê duyệt ở lần chạy trước');
        khoaToTrinh = khoaToTrinh || docDong(b)?.khoaToTrinh;
        const { page, context } = await moTrangVaiTKM(browser, testInfo, 'PCA');
        const pd = new PheDuyetPage(page);
        await pd.mo();
        if (await moDeXuatToTrinh(pd, khoaToTrinh, b)) {
          await pd.ykienVaPheDuyet('Đồng ý phân công Thẩm phán theo tờ trình.');
        }
        ghiSoCai(b, { xongBuoc: 'duyetToTrinh' });
        await context.close();
      });

      test('B5 · Thông báo phân công TP → Trình ký', async ({ browser }, testInfo) => {
        test.skip(daXongBuoc(b, 'thongBao'), 'Bản án này đã lập Thông báo phân công ở lần chạy trước');
        testInfo.setTimeout(8 * 60_000);
        maDon = maDon || docDong(b)?.maDon || '';
        expect(maDon, 'Chưa có mã đơn trong sổ cái — chạy B1–B2 trước').toBeTruthy();
        const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CANBO');
        try {
          khoaThongBao = await new HctpPage(page).lapVanBanTuDanhSachDon(
            maDon,
            /Thông báo phân công TP/i,
            'Thông báo phân công',
            NGUOI_DUYET,
            NGUOI_KY,
          );
        } catch (loi) {
          // Đơn KHÔNG còn trong danh sách khi lọc "Thông báo phân công TP" nghĩa là văn bản đã lập và
          // đã trình ký ở lượt chạy trước (bộ lọc loại văn bản chỉ liệt kê đơn CHƯA có văn bản đó), chỉ
          // là sổ cái chưa kịp ghi id. Lập lại sẽ tạo thêm một thông báo thừa → coi như xong, để B7b tìm
          // theo tên loại văn bản rồi chốt danh tính vụ trước khi ký.
          if (!/Không thấy đơn .* khi lọc loại văn bản/.test((loi as Error).message)) throw loi;
          console.log('    · B5: đơn ' + maDon + ' không còn trong danh sách lập "Thông báo phân công TP" → đã lập từ trước');
        }
        ghiSoCai(b, { ...(khoaThongBao ? { khoaThongBao } : {}), xongBuoc: 'thongBao' });
        testInfo.annotations.push({ type: 'khoá thông báo', description: String(khoaThongBao) });
        await context.close();
      });

      test('B7b · Chánh văn phòng ký logic Thông báo', async ({ browser }, testInfo) => {
        test.skip(daXongBuoc(b, 'kyThongBao'), 'Thông báo của bản án này đã ký logic ở lần chạy trước');
        khoaThongBao = khoaThongBao || docDong(b)?.khoaThongBao;
        const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CVP');
        const pd = new PheDuyetPage(page);
        await pd.mo();
        if (khoaThongBao) {
          if (await pd.moChiTietTheoId(khoaThongBao)) {
            await pd.ykienVaKyLogicVanBan('Đồng ý ban hành thông báo phân công Thẩm phán.');
          }
        } else {
          // B5 có thể đã lập + trình ký xong nhưng hết thời gian chờ toast nên sổ cái không kịp ghi id
          // (đo 29/09/2026 với D04). Chạy lại B5 sẽ lập THÊM một thông báo nữa → thay vì vậy tìm đề
          // xuất "Thông báo phân công" đang chờ duyệt rồi CHỐT DANH TÍNH VỤ trước khi ký.
          const tuLuc = new Date(Date.now() - 7 * 24 * 3600_000);
          if (await pd.moChiTietDungVu(/Thông báo phân công/i, dauHieuVu(b), tuLuc)) {
            await pd.ykienVaKyLogicVanBan('Đồng ý ban hành thông báo phân công Thẩm phán.');
          }
        }
        ghiSoCai(b, { xongBuoc: 'kyThongBao' });
        testInfo.annotations.push({ type: 'đơn hoàn tất', description: `mã ${maDon} – số thụ lý ${soThuLy}` });
        await context.close();
      });

      // ───────────── Nhánh Vụ Giám đốc kiểm tra (Bước 10+) ─────────────

      test('B10 · Thư ký Vụ: đơn đã hiển thị ở "Nhận đơn và TL vụ án" › tab Đã có vụ án', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        const ghi = (type: string, description: string) => testInfo.annotations.push({ type, description });
        // Chạy riêng bước này (--grep) thì biến trong bộ nhớ còn rỗng → đọc lại từ sổ cái
        soThuLy = soThuLy || docDong(b)?.soThuLy || '';
        maDon = maDon || docDong(b)?.maDon || '';
        const { page, context } = await moTrangVaiCauHinh(browser, testInfo, vuGdkt.thuKyVu);

        await moMenu(page, ['Quản lý án GĐT/TT', 'Nhận đơn và TL vụ án']);
        const tab = page.getByRole('tab', { name: /Đã có vụ án/ });
        await expect(tab, 'Không thấy tab "Đã có vụ án" — kiểm tra quyền của tài khoản Thư ký Vụ').toBeVisible({ timeout: 60_000 });
        await tab.click();
        await choHetSpin(page);
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
        await nghi(page, 1500, 2500);

        // Lọc theo SỐ + NGÀY BẢN ÁN. KHÔNG lọc bằng ô "Số thụ lý" của màn này: nó tìm theo số thụ lý
        // VỤ ÁN chứ không phải số thụ lý của ĐƠN, nên điền số thụ lý đơn vào là bảng trống dù vụ có
        // thật (đo 28/09/2026 với K01 – số thụ lý đơn 1234568246). Số thụ lý chỉ dùng để khớp dòng.
        // "Ngày bản án/quyết định" là RangePicker HAI ô (từ → đến) — chỉ điền ô đầu thì khoảng ngày
        // không hợp lệ và màn trả về danh sách CHƯA LỌC (đo 27/09/2026).
        await page.getByLabel('Số bản án/quyết định', { exact: true }).fill(b.soBanAn);
        const oNgay = page.getByLabel('Ngày bản án/quyết định', { exact: true });
        await oNgay.fill(b.ngayBanAn);
        await page.keyboard.press('Enter');
        await nghi(page, 400, 800);
        await page.keyboard.type(b.ngayBanAn); // antd chuyển con trỏ sang ô kết thúc sau Enter
        await page.keyboard.press('Enter');
        await page.keyboard.press('Escape');
        // Lọc thêm TÒA ra bản án: bộ 28/09/2026 có số bản án 1–3 chữ số, số "1" trùng 10 đơn khác trên
        // STG nên số + ngày vẫn có thể ra nhiều dòng của vụ khác.
        const oToa = page.getByLabel('Tòa ra bản án/quyết định', { exact: true }).first();
        if (b.toaAn && (await hienTrong(oToa, 5_000))) {
          await chonSelect(page, oToa, b.toaAn, { goDeLoc: true }).catch(() => {
            console.log(`    · Không chọn được "Tòa ra bản án/quyết định" = ${b.toaAn} → bỏ điều kiện tòa`);
          });
        }
        await choHetSpin(page);
        await page.getByRole('button', { name: /Tìm kiếm$/ }).first().click();
        await choHetSpin(page);
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
        await nghi(page, 1500, 2500);

        // Dòng của vụ: ưu tiên khớp số thụ lý (duy nhất); không có thì khớp số bản án ĐỨNG RIÊNG —
        // số ngắn như "3" mà khớp chuỗi con sẽ trúng mọi dòng có chữ số 3 (ngày 23/09, số 130…).
        const dsDong = page.locator('.ant-table-row:visible');
        const soRieng = new RegExp(`(^|[^0-9])${b.soBanAn}([^0-9]|$)`);
        // Ưu tiên MÃ ĐƠN: mỗi dòng hiện "Mã đơn:xxxxx" và mã đơn là duy nhất. Số thụ lý trên dòng là
        // "Thụ lý mới" của VỤ ÁN, khác số thụ lý ĐƠN trong sổ cái (kiểm 29/09/2026: đơn 10250 hiện
        // "Thụ lý mới: 1234568308") nên khớp theo số thụ lý có thể trượt.
        const maHienTai = maDon || docDong(b)?.maDon || '';
        const theoMa = maHienTai ? dsDong.filter({ hasText: new RegExp(`Mã đơn:\s*${maHienTai}(?![0-9])`) }) : dsDong;
        const theoThuLy = soThuLy ? dsDong.filter({ hasText: soThuLy }) : dsDong.filter({ hasText: soRieng });
        const dong = (
          maHienTai && (await theoMa.count())
            ? theoMa
            : (await theoThuLy.count())
              ? theoThuLy
              : dsDong.filter({ hasText: soRieng })
        ).first();
        await expect(
          dong,
          `Không thấy vụ (bản án ${b.soBanAn} ngày ${b.ngayBanAn}, số thụ lý đơn ${soThuLy || '-'}) ở tab ` +
            `"Đã có vụ án" — vụ án chỉ sinh ra sau khi Phó Chánh án phê duyệt tờ trình phân công (B9).`,
        ).toBeVisible({ timeout: 60_000 });
        ghi('dòng vụ án', (await dong.innerText()).replace(/\s+/g, ' ').slice(0, 300));
        await context.close();
      });

      test('B10b · Thư ký Vụ: Giao tiểu hồ sơ cho Thẩm tra viên', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        test.skip(daXongBuoc(b, 'giaoTieuHoSo'), 'Bản án này đã giao tiểu hồ sơ ở lần chạy trước');
        // Bắt buộc có số thụ lý: giaoTieuHoSo lọc dòng theo nó, để rỗng thì filter khớp MỌI dòng và
        // thao tác rơi vào dòng đầu bảng — tức đơn của vụ khác (đã xảy ra 27/09/2026 với đơn 9620).
        soThuLy = soThuLy || docDong(b)?.soThuLy || '';
        expect(soThuLy, 'Chưa có số thụ lý trong sổ cái — chạy B1–B2 trước').toBeTruthy();
        const { page, context } = await moTrangVaiCauHinh(browser, testInfo, vuGdkt.thuKyVu);
        await new GdtPage(page).giaoTieuHoSo(b.soBanAn, soThuLy, {
          nguoiGiao: gt('nguoiGiaoTieuHoSo'),
          nguoiNhan: gt('nguoiNhanTieuHoSo'),
          ngayBanAn: b.ngayBanAn,
          toaAn: b.toaAn,
          maDon: maDon || docDong(b)?.maDon,
        });
        ghiSoCai(b, { xongBuoc: 'giaoTieuHoSo' });
        await context.close();
      });

      test('B11 · Vụ trưởng: phân công Thẩm tra viên (chỉ định)', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        test.skip(daXongBuoc(b, 'phanCongTTV'), 'Bản án này đã phân công Thẩm tra viên ở lần chạy trước');
        const ghi = (type: string, description: string) => testInfo.annotations.push({ type, description });
        const { page, context } = await moTrangVaiCauHinh(browser, testInfo, vuGdkt.vuTruong);
        const ttv = gt('thamTraVien');
        const lanhDao = gt('lanhDaoPhuTrach');
        ghi('phân công', `TTV ${ttv} – lãnh đạo ${lanhDao}`);

        await new GdtPage(page).phanCongTTV(b.soBanAn, ttv, lanhDao, {
          ngayBanAn: b.ngayBanAn,
          toaAn: b.toaAn,
          // Số thụ lý ĐƠN là khoá lọc chắc chắn nhất ở màn Phân công TTV (xem phanCongTTV)
          soThuLy: docDong(b)?.soThuLy,
        });
        ghiSoCai(b, { xongBuoc: 'phanCongTTV' });
        await context.close();
      });

      test('B12a · Thẩm tra viên: tạo dự thảo kết quả giải quyết (Kháng nghị)', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        test.skip(daXongBuoc(b, 'duThaoKetQua'), 'Bản án này đã tạo dự thảo kết quả giải quyết ở lần chạy trước');
        const ghi = (type: string, description: string) => testInfo.annotations.push({ type, description });
        const { page, context } = await moTrangVaiCauHinh(browser, testInfo, vuGdkt.thamTraVien);
        const gdt = new GdtPage(page);

        const idVuAn = await gdt.moVuAn(b.soBanAn, b.ngayBanAn, b.toaAn);
        ghi('id vụ án', idVuAn);
        const daCoDuThao = await gdt.taoDuThaoKetQuaGiaiQuyet(idVuAn, {
          ketQua: gt('ketQuaGiaiQuyet'),
          // Ô "Người ký" (#MA_NGUOI_KY) là danh sách CÁN BỘ, không phải ô "Người kháng nghị": thử đổ
          // chức danh "Chánh án Tòa án nhân dân tối cao" vào đây ngày 27/09/2026 thì dropdown không có
          // mục đó và B13a hỏng. Cột "Người kháng nghị" của Excel (b.nguoiKhangNghi) nằm ở ô khác trên
          // form — chưa xác định được ô nào, đang chờ nghiệp vụ chỉ chỗ.
          nguoiKy: gt('nguoiKyQuyetDinh'),
          thamQuyenXetXu: gt('thamQuyenXetXu'),
          noiDungVuAn: gt('noiDungVuAn'),
          xetThay: gt('xetThay'),
        });
        if (daCoDuThao) ghi('bỏ qua', `Vụ án đã có dự thảo: ${daCoDuThao}`);
        ghiSoCai(b, { xongBuoc: 'duThaoKetQua' });
        await context.close();
      });

      // ───────────── Bước 13b → 22 của "Playwright nhập data GDT-TT" ─────────────

      test('B12b · Thẩm tra viên: Trình văn bản dự thảo kháng nghị → Xin ý kiến', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        test.skip(daXongBuoc(b, 'trinhDuThao'), 'Dự thảo của bản án này đã trình xin ý kiến ở lần chạy trước');
        testInfo.setTimeout(10 * 60_000);
        const { page, context } = await moTrangVaiCauHinh(browser, testInfo, vuGdkt.thamTraVien);
        const gdt = new GdtPage(page);
        const idVuAn = await gdt.moVuAn(b.soBanAn, b.ngayBanAn, b.toaAn);
        // canTieuHoSo = false: dự thảo kết quả giải quyết không phải tờ trình nên không có bước
        // tiểu hồ sơ (DanhSachVanBanToTrinh.tsx chỉ render nút đó cho mã biểu mẫu tờ trình)
        khoaDuThao = await gdt.trinhToTrinhThamTra(
          idVuAn,
          gt('capTrinhKhangNghi'),
          /Kháng nghị|Dự thảo/,
          false,
          gt('nguoiTrinhKhangNghi'), // tài liệu Bước 13: "Người được trình chọn Nguyễn Hải Trâm"
        );
        expect(khoaDuThao, 'Không lấy được id yêu cầu phê duyệt của dự thảo kháng nghị').toBeTruthy();
        ghiSoCai(b, { khoaDuThao, xongBuoc: 'trinhDuThao' });
        testInfo.annotations.push({ type: 'khoá dự thảo', description: String(khoaDuThao) });
        await context.close();
      });

      test('B13 · Phó Chánh án: duyệt dự thảo Quyết định kháng nghị giám đốc thẩm', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        test.skip(daXongBuoc(b, 'duyetDuThao'), 'Dự thảo của bản án này đã được duyệt ở lần chạy trước');
        khoaDuThao = khoaDuThao || docDong(b)?.khoaDuThao;
        const { page, context } = await moTrangVaiTKM(browser, testInfo, 'PCA');
        const pd = new PheDuyetPage(page);
        await pd.mo();
        // Khoá B12b trả về là id VĂN BẢN dự thảo, không phải lúc nào cũng trùng id/idDuLieu của yêu
        // cầu phê duyệt bên màn Phó Chánh án → tra theo id trước, không thấy thì tìm theo tên loại
        // văn bản trong khoảng thời gian gần đây.
        let con: boolean;
        try {
          con = await pd.moChiTietTheoId(khoaDuThao!);
        } catch {
          await pd.mo();
          con = await pd.moChiTietNeuCon('Kháng nghị giám đốc thẩm', '', new Date(Date.now() - 24 * 3600_000));
        }
        // Màn này tick dự thảo rồi bấm Duyệt, không có ô nhập ý kiến (Bước 13 tài liệu)
        if (con) await pd.duyetDuThaoKemTheo();
        ghiSoCai(b, { xongBuoc: 'duyetDuThao' });
        await context.close();
      });

      // Tài liệu nhảy thẳng từ "Duyệt" (bước 13) sang "Hồ sơ kháng nghị" (bước 14), nhưng hồ sơ chỉ
      // hiện ở màn đó khi vụ án có bản ghi DonKetQua loại KHANG_NGHI (DonKetQuaRepository
      // .searchHoSoKhangNghiDi). Bản ghi này do BieuMau056GDTServiceImpl.xuLySauKySo tạo, tức chỉ
      // sinh ra SAU KHI KÝ SỐ quyết định — duyệt đề xuất thôi chưa đủ.
      test('B13b · Người ký: ký Quyết định kháng nghị giám đốc thẩm', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        test.skip(daXongBuoc(b, 'kyDuThao'), 'Quyết định kháng nghị của bản án này đã ký ở lần chạy trước');
        testInfo.setTimeout(10 * 60_000);
        const { page, context } = await moTrangVaiTKM(browser, testInfo, 'PCA');
        const pd = new PheDuyetPage(page);
        // Mở theo ID dự thảo (B12b ghi vào sổ cái). Tìm theo tên loại văn bản là KHÔNG đủ: mọi vụ đều
        // có đề xuất tên "Kháng nghị giám đốc thẩm", 28/09/2026 VG16 (bản án 33) mở trúng đề xuất của
        // vụ khác (VA26-004447, bản án 47 — Công ty TNHH Đại Dương Miền Nam) và thấy "Đã duyệt".
        const khoaKy = khoaDuThao || docDong(b)?.khoaDuThao;
        let conKy = false;
        // Không có id, hoặc id không còn trong danh sách → duyệt lần lượt các đề xuất cùng tên loại và
        // chốt danh tính vụ ở từng cái (moChiTietDungVu), thay vì lấy dòng đầu rồi báo "không phải vụ này".
        const tuLucKy = new Date(Date.now() - 7 * 24 * 3600_000);
        if (khoaKy) {
          try {
            conKy = await pd.moChiTietTheoId(khoaKy);
          } catch {
            conKy = await pd.moChiTietDungVu('Kháng nghị giám đốc thẩm', dauHieuVu(b), tuLucKy);
          }
        } else {
          conKy = await pd.moChiTietDungVu('Kháng nghị giám đốc thẩm', dauHieuVu(b), tuLucKy);
        }
        if (conKy) await pd.ykienVaKyLogicVanBan('Đồng ý ban hành Quyết định kháng nghị giám đốc thẩm.');
        ghiSoCai(b, { xongBuoc: 'kyDuThao' });
        await context.close();
      });

      test('B14 · Thư ký Vụ: chuyển và nhận Hồ sơ kháng nghị', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        test.skip(daXongBuoc(b, 'hoSoKhangNghi'), 'Hồ sơ kháng nghị của bản án này đã chuyển/nhận ở lần chạy trước');
        testInfo.setTimeout(10 * 60_000);
        const { page, context } = await moTrangVaiCauHinh(browser, testInfo, vaiHoSoKhangNghi);
        await new GdtPage(page).chuyenVaNhanHoSoKhangNghi(b.soBanAn, {
          donViNhan: gt('donViNhanHoSo'),
          // Số bút lục không có trong dữ liệu nguồn — lấy theo số bản án để tra ngược được
          soButLuc: b.soBanAn,
          // Lọc thêm theo ngày + tòa để không trúng dòng của vụ khác cùng số bản án
          ngayBanAn: b.ngayBanAn,
          toaAn: b.toaAn,
        });
        ghiSoCai(b, { xongBuoc: 'hoSoKhangNghi' });
        await context.close();
      });

      // Bắt buộc trước B19: popup "Danh sách vụ xét xử đã chọn" chặn Lưu với "Vụ án chưa
      // xác định thẩm phán chủ tọa" nếu vụ xét xử chưa có phân công Thẩm phán TANDTC (PHAN_CONG TA.TP.001) ĐÃ
      // DUYỆT — XetXuGdtServiceImpl.getDanhSach lấy tenTP từ đó. Cách làm theo vụ mẫu VA26-003270.
      // Tài liệu Bước 15: Quản lý xét xử GĐT › vụ vừa nhận từ Hồ sơ kháng nghị đến › Xem chi tiết ›
      // tab Thụ lý › nút "Thụ lý". Tách khỏi Bước 19 vì tài liệu đặt nó TRƯỚC phân công thẩm phán.
      test('B15 · Vụ trưởng: thụ lý vụ án xét xử GĐT', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        test.skip(daXongBuoc(b, 'thuLyXetXu'), 'Bản án này đã thụ lý vụ xét xử ở lần chạy trước');
        testInfo.setTimeout(8 * 60_000);
        const ghi = (type: string, description: string) => testInfo.annotations.push({ type, description });
        const { page, context } = await moTrangVaiCauHinh(browser, testInfo, vuGdkt.vuTruong);
        ghi('thụ lý GĐT', (await new GdtPage(page).thuLyVuAnGdt(b.soBanAn, b.ngayBanAn, b.toaAn)) ? 'vừa thụ lý' : 'đã thụ lý từ trước');
        ghiSoCai(b, { xongBuoc: 'thuLyXetXu' });
        await context.close();
      });

      test('B16 · Vụ trưởng: phân công Thẩm phán TANDTC → Lưu tờ trình → Lấy số → Trình ký', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        test.skip(daXongBuoc(b, 'phanCongTPTC'), 'Bản án này đã phân công Thẩm phán TANDTC ở lần chạy trước');
        testInfo.setTimeout(10 * 60_000);
        const { page, context } = await moTrangVaiCauHinh(browser, testInfo, vuGdkt.vuTruong);
        // Tài liệu Bước 16: PHÂN CÔNG NGẪU NHIÊN — hệ thống tự chọn Thẩm phán TANDTC, không ai nhập tên.
        // Vì vậy không truyền (và không kiểm) tên thẩm phán; ai được phân công thì đọc lại từ màn.
        const khoa = await new GdtPage(page).phanCongThamPhanTANDTC(b.soBanAn, b.ngayBanAn, {
          nguoiKy: gt('nguoiKyToTrinhTANDTC'),
          toaAn: b.toaAn,
        });
        testInfo.annotations.push({ type: 'tờ trình TPTC', description: khoa || '(đã lưu từ trước)' });
        ghiSoCai(b, { ...(khoa ? { khoaToTrinhTPTC: khoa } : {}), xongBuoc: 'phanCongTPTC' });
        await context.close();
      });

      test('B17 · Phó Chánh án: ký logic Tờ trình phân công thẩm phán TANDTC', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        test.skip(daXongBuoc(b, 'duyetPhanCongTPTC'), 'Tờ trình phân công Thẩm phán TANDTC đã được duyệt ở lần chạy trước');
        const khoa = docDong(b)?.khoaToTrinhTPTC;
        const { page, context } = await moTrangVaiTKM(browser, testInfo, 'PCA');
        const pd = new PheDuyetPage(page);
        // Duyệt theo id văn bản (không lấy "đề xuất mới nhất" để khỏi duyệt nhầm tờ trình của vụ khác).
        // Tờ trình MS_02_TC mở ở màn "Ký số văn bản" (Ký số / Ký logic / Từ chối ký) → Ký logic.
        // moChiTietTheoId tự mở menu — không gọi pd.mo() trước (mở 2 lần có thể thu gọn menu Công tác lãnh đạo).
        if (khoa) {
          if (await pd.moChiTietTheoId(khoa)) await pd.ykienVaKyLogicVanBan('Đồng ý phân công Thẩm phán TANDTC theo tờ trình.');
        } else if (
          (await pd.mo(), true) &&
          await pd.moChiTietNeuCon('Tờ trình phân công thẩm phán tối cao', taiKhoan(vuGdkt.vuTruong).ten, new Date(Date.now() - 24 * 3600_000))
        ) {
          await pd.ykienVaKyLogicVanBan('Đồng ý phân công Thẩm phán TANDTC theo tờ trình.');
        }
        ghiSoCai(b, { xongBuoc: 'duyetPhanCongTPTC' });
        await context.close();
      });

      // Tài liệu Bước 18: sau khi ký tờ trình phân công Thẩm phán tối cao, Vụ trưởng phân công Thẩm tra
      // viên LẦN THỨ HAI — lần này cho HỒ SƠ KHÁNG NGHỊ, lọc Hình thức phân công "Hồ sơ kháng nghị GĐT-TT".
      // Khác B12: B12 phân công TTV cho ĐƠN và không lọc hình thức.
      test('B18 · Vụ trưởng: phân công Thẩm tra viên cho Hồ sơ kháng nghị', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        test.skip(daXongBuoc(b, 'phanCongTTVHoSo'), 'Bản án này đã phân công TTV cho hồ sơ kháng nghị ở lần chạy trước');
        const ghi = (type: string, description: string) => testInfo.annotations.push({ type, description });
        const { page, context } = await moTrangVaiCauHinh(browser, testInfo, vuGdkt.vuTruong);
        const ttv = gt('thamTraVien');
        const lanhDao = gt('lanhDaoPhuTrach');
        ghi('phân công HSKN', `TTV ${ttv} – lãnh đạo ${lanhDao}`);
        await new GdtPage(page).phanCongTTV(b.soBanAn, ttv, lanhDao, {
          hinhThuc: gt('hinhThucPhanCongTPTC'),
          ngayBanAn: b.ngayBanAn,
          toaAn: b.toaAn,
          soThuLy: docDong(b)?.soThuLy,
        });
        ghiSoCai(b, { xongBuoc: 'phanCongTTVHoSo' });
        await context.close();
      });

      test('B19 · Vụ trưởng: tạo danh sách vụ xét xử, lấy số và trình ký', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        test.skip(daXongBuoc(b, 'danhSachXetXu'), 'Bản án này đã tạo danh sách vụ xét xử ở lần chạy trước');
        testInfo.setTimeout(15 * 60_000);
        const ghi = (type: string, description: string) => testInfo.annotations.push({ type, description });
        const { page, context } = await moTrangVaiCauHinh(browser, testInfo, vuGdkt.vuTruong);
        const gdt = new GdtPage(page);
        ghi('danh sách vụ xét xử', (await gdt.taoDanhSachVuXetXu(b.soBanAn, gt('loaiHoiDong'), b.ngayBanAn, b.toaAn)) ? 'vừa tạo' : 'đã có từ trước');
        const khoaChuongTrinh = await gdt.laySoVaTrinhKyThamMuu(b.soBanAn, b.ngayBanAn, b.toaAn);
        if (khoaChuongTrinh) ghi('id chương trình làm việc', khoaChuongTrinh);
        ghiSoCai(b, { ...(khoaChuongTrinh ? { khoaChuongTrinh } : {}), xongBuoc: 'danhSachXetXu' });
        await context.close();
      });

      // Đo trên STG 28/09/2026 (vai Phó Chánh án: 95 đề xuất, KHÔNG có biểu mẫu CTLVHDXX nào; vai Chánh
      // án: 22 bản ghi CTLVHDXX) → Chương trình làm việc HĐXX trình lên CHÁNH ÁN, không phải Phó Chánh án.
      test('B20 · Chánh án: phê duyệt Chương trình làm việc', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        test.skip(daXongBuoc(b, 'duyetChuongTrinh'), 'Chương trình làm việc của bản án này đã duyệt ở lần chạy trước');
        const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'chanhAn');
        const pd = new PheDuyetPage(page);
        const khoaChuongTrinh = docDong(b)?.khoaChuongTrinh;
        if (khoaChuongTrinh) {
          // Mở theo id văn bản B19 đã trình: màn Phê duyệt đề xuất phân trang 10 dòng và có đề xuất
          // cùng tên của vụ khác, tìm theo tên dễ duyệt nhầm văn bản của vụ khác.
          if (await pd.moChiTietTheoId(khoaChuongTrinh)) {
            await pd.ykienVaPheDuyet('Đồng ý chương trình làm việc của Hội đồng xét xử.');
          }
        } else {
          await pd.mo();
          // Vụ chạy B19 trước khi có khoá trong sổ cái: tìm theo tên "Chương trình làm việc của HĐXX".
          // KHÔNG nhận thêm nhãn "Tờ trình thẩm tra vụ việc": đo trên STG 28/09/2026, dòng đó là biểu mẫu
          // MS_42 "Tờ trình vụ giải quyết" của một vụ giải quyết đơn khác, duyệt vào là duyệt sai văn bản.
          // moChiTietNeuCon: không còn ở "Chờ duyệt" mà đã ở "Đã duyệt" thì coi như xong, không báo lỗi giả
          if (
            await pd.moChiTietNeuCon(
              /Chương trình làm việc/,
              taiKhoan(vuGdkt.vuTruong).ten,
              new Date(Date.now() - 24 * 3600_000),
            )
          ) {
            await pd.ykienVaPheDuyet('Đồng ý chương trình làm việc của Hội đồng xét xử.');
          }
        }
        ghiSoCai(b, { xongBuoc: 'duyetChuongTrinh' });
        await context.close();
      });

      test('B21 · Vụ trưởng: thêm biểu mẫu Hội đồng xét xử → Trình ký', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        test.skip(daXongBuoc(b, 'bieuMauHoiDong'), 'Biểu mẫu Hội đồng xét xử của bản án này đã lập ở lần chạy trước');
        testInfo.setTimeout(15 * 60_000);
        const { page, context } = await moTrangVaiCauHinh(browser, testInfo, vuGdkt.vuTruong);
        const homNay = new Date().toLocaleDateString('en-GB');
        const dsId = await new GdtPage(page).themBieuMauHoiDong(b.soBanAn, {
          dsBieuMau: (cauHinhLuong().nghiepVu.bieuMauHoiDong as unknown as string[]) || [],
          nguoiKy: gt('nguoiKyBieuMau'),
          ngayThongBao: homNay,
          ngayBanAn: b.ngayBanAn,
          toaAn: b.toaAn,
        });
        const khoaCu = docDong(b)?.khoaBieuMauHoiDong || [];
        ghiSoCai(b, { khoaBieuMauHoiDong: [...new Set([...khoaCu, ...dsId])], xongBuoc: 'bieuMauHoiDong' });
        await context.close();
      });

      test('B22 · Phó Chánh án: ký logic biểu mẫu Hội đồng xét xử', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        test.skip(daXongBuoc(b, 'kyBieuMauHoiDong'), 'Biểu mẫu Hội đồng xét xử của bản án này đã ký ở lần chạy trước');
        testInfo.setTimeout(10 * 60_000);
        const { page, context } = await moTrangVaiCauHinh(browser, testInfo, 'phoChanhAn');
        const pd = new PheDuyetPage(page);
        const dsKhoa = docDong(b)?.khoaBieuMauHoiDong || [];
        if (dsKhoa.length) {
          // Mở theo id văn bản B17 đã trình: tab Chờ duyệt phân trang 10 dòng và có cùng tên biểu mẫu của vụ khác
          for (const khoa of dsKhoa) {
            if (!(await pd.moChiTietTheoId(khoa))) continue; // đã ký ở lần chạy trước
            await pd.ykienVaKyLogicVanBan('Đồng ý ban hành văn bản của Hội đồng xét xử.');
          }
        } else {
          // Hai biểu mẫu trình cùng lúc → ký lần lượt. Mọi vụ đều có biểu mẫu trùng tên nên phải
          // chốt danh tính vụ ở từng đề xuất (moChiTietDungVu), không lấy dòng đầu danh sách.
          const tuLuc = new Date(Date.now() - 7 * 24 * 3600_000);
          for (const ten of (cauHinhLuong().nghiepVu.bieuMauHoiDong as unknown as string[]) || []) {
            if (!(await pd.moChiTietDungVu(ten, dauHieuVu(b), tuLuc))) continue;
            await pd.ykienVaKyLogicVanBan(`Đồng ý ban hành ${ten.toLowerCase()}.`);
          }
        }
        ghiSoCai(b, { xongBuoc: 'kyBieuMauHoiDong' });
        await context.close();
      });
      // Tài liệu Bước 23: đăng nhập lại Vụ trưởng và chuyển sang màn Quản lý vụ xét xử.
      // Không tạo dữ liệu — chỉ kiểm chứng vụ đã đi hết luồng và hiện đúng ở màn cuối.
      test('B23 · Vụ trưởng: mở chi tiết vụ xét xử — tab Kết quả xét xử', async ({ browser }, testInfo) => {
        test.skip(vaiThieu.length > 0, lyDoThieuVai);
        const ghi = (type: string, description: string) => testInfo.annotations.push({ type, description });
        const { page, context } = await moTrangVaiCauHinh(browser, testInfo, vuGdkt.vuTruong);
        const idVuXetXu = await new GdtPage(page).moKetQuaXetXu(b.soBanAn, b.ngayBanAn, {
          nguyenNhan: (b as { nguyenNhan?: string }).nguyenNhan,
          ketQuaXetXu: (b as { ketQuaXetXu?: string }).ketQuaXetXu,
          toaAn: b.toaAn,
        });
        ghi('vụ xét xử', idVuXetXu);
        ghiSoCai(b, { idVuXetXu });
        await context.close();
      });

    });
  }
}
