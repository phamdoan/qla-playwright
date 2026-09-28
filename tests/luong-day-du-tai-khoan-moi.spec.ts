/**
 * TRỌN "Luồng nhập data.txt" (Bước 1 → 9) cho TỪNG bản án trong dữ liệu test.
 *
 * Mỗi bản án của data/22A_BAN_AN_ST_TOA_AN_DATA.xlsx (24 bản án sơ thẩm, khớp với 3 cột nhập trong
 * data/BAN_AN_SO_THAM_TOA_AN_GDT.xlsx) là một nhóm test chạy tuần tự:
 *
 *   B1–B2  Cán bộ nhập đơn theo bản án (không OCR) → tra cứu → chọn người từ bản án cũ → Lưu
 *   B3     Phân công thẩm phán (ngẫu nhiên, đã lọc đúng 1 đơn)
 *   B4     Tờ trình phân công thẩm phán → Trình ký (Người duyệt / Người ký theo tài liệu)
 *   B6–B7a Chánh văn phòng cho ý kiến → Cấp trình tiếp "Phó chánh án", người trình "Nguyễn Hải Trâm" → Ký logic
 *   B8–B9  Phó Chánh án phê duyệt Tờ trình
 *   B5     Thông báo phân công TP → Trình ký
 *   B7b    Chánh văn phòng ký logic Thông báo
 *
 * THỨ TỰ khác tài liệu ở chỗ B5: "Thông báo phân công TP" chỉ lập được SAU KHI tờ trình đã được
 * duyệt ở cấp Chánh án/Phó Chánh án (backend: existsToTrinhPhanCongDaButPhe trong DonServiceImpl).
 *
 * Trong một nhóm, bước trước hỏng thì các bước sau tự bỏ qua (serial) để không để lại hồ sơ dở dang;
 * các bản án khác vẫn chạy bình thường.
 *
 * ⚠ TẠO DỮ LIỆU THẬT trên môi trường đang chọn. Chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1.
 * Chạy bằng giao diện: npm run ui:stg:ghi   (hoặc npm run staging:ui rồi chọn project tai-khoan-moi)
 * Giới hạn số vụ:      npm run ui:stg:ghi -- --dong=2,3   /   --so-dong=5
 */
import { expect, test } from '@playwright/test';
import { choPhepGhiTKM } from '../account';
import { chonDongChay, docBanAnSoTham } from '../common/ban-an-so-tham';
import { nhapDonTuBanAn } from '../common/buoc-nhap-don';
import { moTrangVaiTKM } from '../common/luong-tkm';
import { daXongBuoc, docDong, ghiSoCai } from '../common/so-cai-tkm';
import { HctpPage } from '../pages/hctp.page';
import { ThemMoiDonPage } from '../pages/them-moi-don.page';
import { PheDuyetPage } from '../pages/phe-duyet.page';

/** Người duyệt / người ký theo Luồng nhập data.txt */
const NGUOI_DUYET = 'Nguyễn Thị Thu Hường';
const NGUOI_KY = 'Nguyễn Tường Linh';
const CAP_TRINH_TIEP = 'Phó chánh án';
const NGUOI_TRINH_TIEP = 'Nguyễn Hải Trâm';

const MOI_TRUONG = process.env.QLA_ENV || 'stg';
const { ds } = docBanAnSoTham();
/** Mặc định chạy TẤT CẢ bản án; thu hẹp bằng QLA_TKM_DONG / QLA_TKM_SO_DONG */
const DS_CHAY = process.env.QLA_TKM_DONG || process.env.QLA_TKM_SO_DONG ? chonDongChay(ds) : ds;

for (const b of DS_CHAY) {
  test.describe(`Vụ dòng ${b.dong} · bản án ${b.soBanAn} ngày ${b.ngayBanAn}${b.biCao ? ` · ${b.biCao}` : ''}`, () => {
    test.describe.configure({ mode: 'serial' });
    test.beforeEach(() => {
      test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
    });

    // Dữ liệu nối giữa các bước của chính vụ này
    let maDon = '';
    let soThuLy = '';
    let khoaToTrinh: string | undefined;
    let khoaThongBao: string | undefined;

    test('B1–B2 · Nhập đơn theo bản án', async ({ browser }, testInfo) => {
      testInfo.setTimeout(12 * 60_000);
      const ghi = (type: string, description: string) => testInfo.annotations.push({ type, description });
      const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CANBO');

      // Bản án đã chạy rồi thì dùng lại đơn cũ, không tạo đơn trùng. Ưu tiên sổ cái; sổ cái trống
      // thì tìm trên hệ thống theo nội dung đơn (gắn với Số bản án + Ngày bản án + Tòa ra bản án).
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
      expect(soThuLy, 'Bước trước chưa cho số thụ lý').toBeTruthy();
      const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CANBO');
      await new HctpPage(page).phanCongThamPhanNgauNhien(soThuLy);
      ghiSoCai(b, { xongBuoc: 'phanCong' });
      await context.close();
    });

    test('B4 · Tờ trình phân công thẩm phán → Trình ký', async ({ browser }, testInfo) => {
      test.skip(daXongBuoc(b, 'toTrinh'), 'Bản án này đã lập Tờ trình ở lần chạy trước');
      testInfo.setTimeout(8 * 60_000);
      const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CANBO');
      khoaToTrinh = await new HctpPage(page).lapTamTrinhPhanCong(maDon, NGUOI_DUYET, NGUOI_KY);
      expect(khoaToTrinh, 'Không lấy được id yêu cầu phê duyệt của Tờ trình phân công').toBeTruthy();
      ghiSoCai(b, { khoaToTrinh, xongBuoc: 'toTrinh' });
      testInfo.annotations.push({ type: 'khoá tờ trình', description: String(khoaToTrinh) });
      await context.close();
    });

    test('B6–B7a · Chánh văn phòng cho ý kiến, trình Phó Chánh án, ký logic', async ({ browser }, testInfo) => {
      test.skip(daXongBuoc(b, 'kyToTrinh'), 'Tờ trình của bản án này đã ký logic ở lần chạy trước');
      khoaToTrinh = khoaToTrinh || docDong(b)?.khoaToTrinh;
      const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CVP');
      const pd = new PheDuyetPage(page);
      await pd.mo();
      // false = yêu cầu đã duyệt xong từ lần chạy trước
      if (await pd.moChiTietTheoId(khoaToTrinh!)) {
        await pd.ykienVaKyLogic('Đồng ý phân công Thẩm phán, kính trình Phó Chánh án phê duyệt.', CAP_TRINH_TIEP, NGUOI_TRINH_TIEP);
      }
      ghiSoCai(b, { xongBuoc: 'kyToTrinh' });
      await context.close();
    });

    test('B8–B9 · Phó Chánh án phê duyệt Tờ trình', async ({ browser }, testInfo) => {
      test.skip(daXongBuoc(b, 'duyetToTrinh'), 'Tờ trình của bản án này đã được phê duyệt ở lần chạy trước');
      khoaToTrinh = khoaToTrinh || docDong(b)?.khoaToTrinh;
      const { page, context } = await moTrangVaiTKM(browser, testInfo, 'PCA');
      const pd = new PheDuyetPage(page);
      await pd.mo();
      if (await pd.moChiTietTheoId(khoaToTrinh!)) {
        await pd.ykienVaPheDuyet('Đồng ý phân công Thẩm phán theo tờ trình.');
      }
      ghiSoCai(b, { xongBuoc: 'duyetToTrinh' });
      await context.close();
    });

    test('B5 · Thông báo phân công TP → Trình ký', async ({ browser }, testInfo) => {
      test.skip(daXongBuoc(b, 'thongBao'), 'Bản án này đã lập Thông báo phân công ở lần chạy trước');
      testInfo.setTimeout(8 * 60_000);
      const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CANBO');
      // Chỉ lập được sau khi tờ trình đã được duyệt (xem ghi chú đầu file)
      khoaThongBao = await new HctpPage(page).lapVanBanTuDanhSachDon(
        maDon,
        /Thông báo phân công TP/i,
        'Thông báo phân công',
        NGUOI_DUYET,
        NGUOI_KY,
      );
      expect(khoaThongBao, 'Không lấy được id yêu cầu phê duyệt của Thông báo phân công').toBeTruthy();
      ghiSoCai(b, { khoaThongBao, xongBuoc: 'thongBao' });
      testInfo.annotations.push({ type: 'khoá thông báo', description: String(khoaThongBao) });
      await context.close();
    });

    test('B7b · Chánh văn phòng ký logic Thông báo', async ({ browser }, testInfo) => {
      test.skip(daXongBuoc(b, 'kyThongBao'), 'Thông báo của bản án này đã ký logic ở lần chạy trước');
      khoaThongBao = khoaThongBao || docDong(b)?.khoaThongBao;
      const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CVP');
      const pd = new PheDuyetPage(page);
      await pd.mo();
      if (await pd.moChiTietTheoId(khoaThongBao!)) {
        await pd.ykienVaKyLogicVanBan('Đồng ý ban hành thông báo phân công Thẩm phán.');
      }
      ghiSoCai(b, { xongBuoc: 'kyThongBao' });
      testInfo.annotations.push({ type: 'đơn hoàn tất', description: `mã ${maDon} – số thụ lý ${soThuLy}` });
      await context.close();
    });
  });
}
