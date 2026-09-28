/**
 * ███ TẠO ĐƠN KHÔNG QUA OCR THEO DỮ LIỆU EXCEL ███  (tạo dữ liệu thật, không phải test hồi quy)
 *
 * Khác với tests/tao-don-khong-ocr*.spec.ts (tự sinh hồ sơ ngẫu nhiên), class này dùng ĐÚNG dữ liệu
 * hai file Excel — mỗi bản án sơ thẩm tạo một đơn:
 *   data/BAN_AN_SO_THAM_TOA_AN_GDT.xlsx   → 3 ô nhập: Số bản án | Ngày bản án | Tòa ra quyết định bản án
 *   data/22A_BAN_AN_ST_TOA_AN_DATA.xlsx   → đối chiếu: loại án, cấp xét xử, bị cáo, mã vụ án
 * (24 bản án, đọc bằng common/ban-an-so-tham.ts)
 *
 * Mỗi đơn đi đúng luồng "Luồng nhập data.txt" Bước 1–2: Danh sách đơn → Thêm mới → tải tài liệu
 * → "Quay lại" ở popup OCR (nhập tay) → nhập 3 ô bản án + cấp xét xử → tra cứu → chọn người từ
 * bản án cũ → [Gợi ý] nội dung → Đơn vị chuyển đến + Thụ lý mới → Thông tin khiếu nại → Lưu.
 * Không làm các bước phân công / tờ trình / thông báo — việc đó ở luong-day-du-tai-khoan-moi.spec.ts.
 *
 * Chạy lại an toàn: bản án đã tạo đơn sẽ bị BỎ QUA (sổ cái seed-output/tao-don-ban-an-excel.<env>.ledger.json;
 * sổ cái trống thì tìm đơn cũ ngay trên hệ thống theo Số bản án + Ngày + Tòa).
 *
 * ⚠ TẠO DỮ LIỆU THẬT. Chỉ chạy khi QLA_TKM_CHO_PHEP_GHI=1.
 *   npm run staging -- --project=tai-khoan-moi tao-don-khong-ocr-ban-an-excel --reporter=list
 *   npm run ui:stg:ghi -- --file=tao-don-khong-ocr-ban-an-excel
 *   QLA_TKM_DONG=2,3 npm run staging -- --project=tai-khoan-moi tao-don-khong-ocr-ban-an-excel
 */
import { expect, test } from '@playwright/test';
import { choPhepGhiTKM } from '../account';
import { chonDongChay, docBanAnSoTham } from '../common/ban-an-so-tham';
import { nhapDonTuBanAn } from '../common/buoc-nhap-don';
import { moTrangVaiTKM } from '../common/luong-tkm';
import { soCai } from '../common/so-cai-tkm';
import { ThemMoiDonPage } from '../pages/them-moi-don.page';

const MOI_TRUONG = process.env.QLA_ENV || 'stg';
const { ds, lech } = docBanAnSoTham();
/** Mặc định chạy TẤT CẢ bản án trong Excel; thu hẹp bằng QLA_TKM_DONG / QLA_TKM_SO_DONG */
const DS_CHAY = process.env.QLA_TKM_DONG || process.env.QLA_TKM_SO_DONG ? chonDongChay(ds) : ds;
const { docDong, ghiSoCai } = soCai('tao-don-ban-an-excel');

test.describe(`Tạo đơn không qua OCR theo ${ds.length} bản án trong Excel`, () => {
  test.beforeEach(() => {
    test.skip(!choPhepGhiTKM(), `Môi trường ${MOI_TRUONG} không cho ghi dữ liệu (QLA_TKM_CHO_PHEP_GHI ≠ 1)`);
  });

  test('dữ liệu Excel đọc được và khớp file đối chiếu', async () => {
    test.info().annotations.push({ type: 'số bản án', description: `${ds.length} (chạy lượt này: ${DS_CHAY.length})` });
    expect(ds.length, 'Không đọc được bản án nào từ file Excel').toBeGreaterThan(0);
    // Chênh lệch giữa 2 file ghi rõ ra báo cáo thay vì tự suy đoán
    expect(lech, `Chênh lệch giữa 2 file Excel:\n${lech.join('\n')}`).toEqual([]);
  });

  for (const b of DS_CHAY) {
    test(`dòng ${b.dong} · bản án ${b.soBanAn} ngày ${b.ngayBanAn}${b.biCao ? ` · ${b.biCao}` : ''}`, async ({ browser }, testInfo) => {
      testInfo.setTimeout(12 * 60_000);
      const ghi = (type: string, description: string) => testInfo.annotations.push({ type, description });
      const { page, context } = await moTrangVaiTKM(browser, testInfo, 'CANBO');

      // Đã tạo đơn cho bản án này rồi thì bỏ qua (sổ cái, hoặc tìm ngay trên hệ thống)
      const daGhi = docDong(b);
      const daCo = daGhi?.maDon
        ? { maDon: daGhi.maDon, soThuLy: daGhi.soThuLy || '' }
        : await new ThemMoiDonPage(page).timDonDaNhapTheoBanAn(b.noiDungGoiY);

      if (daCo?.maDon) {
        ghi('bỏ qua', `Bản án ${b.soBanAn} – ${b.ngayBanAn} đã có đơn ${daCo.maDon}${daCo.soThuLy ? ` (số TL ${daCo.soThuLy})` : ''}`);
        ghiSoCai(b, { maDon: daCo.maDon, soThuLy: daCo.soThuLy, xongBuoc: 'nhapDon' });
        await context.close();
        return;
      }

      const kq = await nhapDonTuBanAn(page, b, testInfo);
      ghiSoCai(b, { maDon: kq.maDon, soThuLy: kq.soThuLy, idDon: kq.idDon, xongBuoc: 'nhapDon' });

      // Kết quả cuối: đơn phải có mã đơn và đã thụ lý mới
      expect(kq.maDon, 'Đơn phải có mã đơn sau khi lưu').toBeTruthy();
      expect(kq.soThuLy, 'Đơn phải được thụ lý mới (có số thụ lý)').toBeTruthy();
      await context.close();
    });
  }
});
