import { test, expect } from '@playwright/test';
import { nguoiNgauNhien } from '../common/du-lieu';
import { ThemMoiDonPage, taoThongTinDon } from '../pages/them-moi-don.page';

/**
 * Case 2: Danh sách đơn → "Thêm mới" → tải BanAn_A.pdf → OCR → "Lấy thông tin" (them-moi-tu-ocr)
 * → điền đủ mọi khối như người dùng thật → "Lưu thông tin" → mở lại đơn kiểm tra từng trường
 * → tìm đơn trong Danh sách đơn.
 * Dùng session của tests/auth.setup.ts. Dữ liệu bổ sung sinh ngẫu nhiên mỗi lần chạy.
 */
test('thêm mới Đơn đề nghị GĐT/TT từ OCR', async ({ page }) => {
  test.setTimeout(30 * 60_000); // OCR có thể mất tới 15 phút

  const trang = new ThemMoiDonPage(page);
  const d = taoThongTinDon(nguoiNgauNhien());
  const ghi = (type: string, description: string) => test.info().annotations.push({ type, description });

  const ocrId = process.env.QLA_OCR_ID; // gỡ lỗi: dùng lại kết quả OCR cũ, bỏ qua bước chờ OCR
  if (ocrId) {
    await test.step(`Mở lại kết quả OCR ${ocrId}`, () => trang.moKetQuaOcr(ocrId));
  } else {
    await test.step('Mở màn Thêm mới từ Danh sách đơn', () => trang.moTuDanhSachDon());
    await test.step('Tải lên file đơn PDF', () => trang.taiLenFileDon());
    await test.step('Bắt đầu OCR, chờ bóc tách, Lấy thông tin', () => trang.ocrVaLayThongTin());
  }

  await test.step('Thông tin bản án: Cấp xét xử', () => trang.datCapXetXu(d));
  const daDien = await test.step('Điền các trường OCR còn thiếu', () => trang.dienTruongThieu(d));
  ghi('trường tự điền', daDien.join(', ') || '(OCR đủ)');
  await test.step('Tra cứu bản án', () => trang.traCuuBanAn());
  ghi('bản án liên quan', await test.step('Thêm bản án liên quan', () => trang.themBanAnLienQuan(d)));
  await test.step('Thêm kết quả giải quyết liên quan', () => trang.themKetQuaGiaiQuyet(d));
  await test.step('Thêm đơn thụ lý kèm', () => trang.themDonThuLyKem(d));
  await test.step('Người tham gia tố tụng', () => trang.nhapNguoiThamGiaToTung(d));

  const idDon = await test.step('Lưu thông tin', () => trang.luu(d));
  ghi('id đơn', idDon);

  const { maDon, ketQua } = await test.step('Mở lại đơn, so từng trường', () => trang.kiemTraSauLuu());
  ghi('mã đơn', maDon);
  await test.info().attach('kiem-tra-sau-luu.json', { body: JSON.stringify(ketQua, null, 2), contentType: 'application/json' });
  for (const t of ketQua.truong) expect.soft(t.sau, `Trường "${t.ten}" sau khi lưu`).toBe(t.truoc);
  for (const b of ketQua.bang) expect.soft(b.co, `Bảng "${b.ten}" phải có "${b.canCo}"`).toBe(true);

  await test.step('Tìm đơn trong Danh sách đơn', () => trang.timTrongDanhSachDon(maDon, d.nguoi.hoTen));
});
