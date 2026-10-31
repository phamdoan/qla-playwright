import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { TrangThai6B, VuAn6B } from '../cau-hinh-6B';
import { daCoBieuMau, gio, luuTaiBanKy, moBieuMau, moVuAn, oBieuMauXetXu } from './chung';

/**
 * Tab "Xét xử" › mục "Kết quả xét xử": chưa chọn loại kết quả (còn các thẻ) → bấm thẻ "Bản án — Tòa xét xử xong…".
 * Đã chọn loại khác ("Loại kết quả: Quyết định") thì để nguyên — bước 12 báo lỗi khi không thấy "Tạo bản án".
 */
export async function chonKetQuaBanAn(m: ManHinh) {
  await m.moTab('xet-xu');
  const the = m.page.locator('main button').filter({ hasText: /Tòa xét xử xong/ }).first();
  if (await the.isVisible().catch(() => false)) {
    await the.click();
    await m.choTaiXong(1500);
  }
}

/**
 * BƯỚC 11 · Tòa phúc thẩm · Biên bản nghị án phúc thẩm (21-HC) (hướng dẫn bước 11)
 *
 *  1. Tab "Xét xử" › "Kết quả xét xử" → thẻ "Bản án" (nếu chưa chọn loại kết quả)
 *  2. Ô loại biểu mẫu chọn "Biên bản nghị án phúc thẩm (21-HC)" → "Thêm mới văn bản"
 *  3. Vào hồi bắt đầu nghị án 10:00 · kết thúc 10:45 (sau giờ kết thúc phiên tòa ở bước 10) · Căn cứ nghị án · Ý kiến thảo luận
 *     (ngày, Tòa án, địa điểm hệ thống tự điền)
 *  4. "Lưu" → "Tải bản biên bản đã ký" (PDF mẫu) → "Xác nhận đã ký" → "Đóng"
 */
export const buoc11: Buoc<VuAn6B, TrangThai6B> = {
  so: 11,
  ten: 'Tòa phúc thẩm · Biên bản nghị án phúc thẩm (21-HC), tải bản đã ký',
  huongDan: '11',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaPhucTham)), can('urlVuAnPT', 7));
    await chonKetQuaBanAn(m);
    if (await daCoBieuMau(m, /Biên bản nghị án/)) return;

    const bm = await moBieuMau(m, oBieuMauXetXu, '21', 'Thêm mới văn bản');
    await gio(m, bm, /Vào hồi.*bắt đầu nghị án/, '10:00');
    await m.nhap(bm, 'Căn cứ nghị án', 'Căn cứ tài liệu, chứng cứ đã được xem xét tại phiên tòa phúc thẩm và kết quả tranh tụng tại phiên tòa');
    await m.nhap(bm, 'Ý kiến thảo luận', 'Hội đồng xét xử thảo luận, biểu quyết thống nhất không chấp nhận kháng cáo, giữ nguyên bản án sơ thẩm');
    await gio(m, bm, /Vào hồi.*kết thúc nghị án/, '10:45');
    await luuTaiBanKy(m, bm);
  },
};
