import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai5A } from '../cau-hinh-5A';
import { ngay } from '../../../../utils/fake-data';
import { chonMenu, dungSo, luuKyDong, moChiTietDon, popup, themNguoiPhanCong } from './chung';

/**
 * BƯỚC 02 · Phân công Thẩm phán giải quyết đơn (hướng dẫn bước 2)
 *
 *  1. Mở chi tiết đơn → tab "Phân công" → "Phân công" › "Phân công Thẩm phán giải quyết đơn"
 *  2. Popup "Quyết định phân công Thẩm phán xem xét đơn khởi kiện": "Dùng số" dưới ô Số quyết định
 *     · Ngày quyết định = hôm nay · Vai trò "Thẩm phán xử lý đơn" · người được phân công ngẫu nhiên → mũi tên
 *  3. "Lưu" → "Ký logic" → "Đóng" (sau đó tab "Kết quả xử lý" mới mở)
 */
export const buoc02: Buoc<DonNguon, TrangThai5A> = {
  so: 2,
  ten: 'Phân công Thẩm phán giải quyết đơn, dùng số, ký logic',
  huongDan: '2',
  chay: async ({ vuAn, moPhien, tkToa, can }) => {
    const m = await moChiTietDon(await moPhien(tkToa(vuAn.toaAn)), can('urlDon', 1));
    await m.moTab('phan-cong');
    const main = m.page.locator('main');

    // Lượt trước đã phân công → đọc lại số quyết định và thẩm phán
    const bang = main.locator('.ant-table-row');
    await bang.first().or(main.locator('.ant-table-placeholder').first()).first().waitFor({ timeout: 30_000 });
    const dongQD = bang.filter({ hasText: /Quyết định phân công thẩm phán giải quyết đơn/i }).first();
    const dongTP = bang.filter({ hasText: 'Thẩm phán xử lý đơn' }).first();
    if (await dongQD.count()) {
      // Lượt trước lưu được quyết định (đã cấp số) nhưng hỏng trước "Ký logic" → quyết định chưa hiệu lực,
      // "Danh sách người được phân công" trống, bước 03 bị máy chủ chặn "Cần phân công Thẩm phán…" → mở quyết định ký nốt
      if (!(await dongTP.count())) {
        await dongQD.locator('button:has(.anticon-eye), a:has(.anticon-eye)').first().click();
        const bm = popup(m, 'Quyết định phân công Thẩm phán');
        await bm.waitFor({ timeout: 30_000 });
        await m.choTaiXong();
        const nguoi = bm.locator('tbody tr').filter({ hasText: 'Thẩm phán xử lý đơn' });
        if (!(await nguoi.count())) await themNguoiPhanCong(m, bm, 'Thẩm phán xử lý đơn');
        await luuKyDong(m, bm);
        await dongTP.waitFor({ timeout: 30_000 });
      }
      const chuTP = (await dongTP.innerText()).replace(/\s+/g, ' ');
      return {
        soQDPhanCongDon: (await dongQD.innerText()).match(/\S+\/QĐ-\S+/)?.[0] ?? '',
        thamPhanXuLyDon: chuTP.match(/Thẩm phán xử lý đơn\s+(.+?)\s*\(/)?.[1] ?? '',
      };
    }

    await chonMenu(m, main, 'Phân công', 'Phân công Thẩm phán giải quyết đơn');
    const bm = popup(m, 'Quyết định phân công Thẩm phán');
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    const soQDPhanCongDon = await dungSo(m, bm, 'Số quyết định');
    await m.ngay(bm, 'Ngày quyết định', ngay(0));
    const thamPhanXuLyDon = await themNguoiPhanCong(m, bm, 'Thẩm phán xử lý đơn');
    await luuKyDong(m, bm);
    return { soQDPhanCongDon, thamPhanXuLyDon };
  },
};
