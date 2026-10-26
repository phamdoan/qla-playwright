import { test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { DonNguon, TrangThai10A, cauHinh10A } from '../cau-hinh-10A';
import { moChiTietDon } from './chung';
import { luuDongKetQua } from '../../../../utils/file-helper';

/**
 * BƯỚC 04 · Ghi nhận kết quả lựa chọn hòa giải (hướng dẫn b3, ý cuối), lưu kết quả
 *
 *  1. Mở chi tiết đơn → tab "Hòa giải" → mục "Kết quả lựa chọn hòa giải của đương sự"
 *  2. "Ghi nhận" ở cột Thao tác → popup → Kết quả lựa chọn "Đồng ý" → "Lưu kết quả"
 *  3. Ghi output/10-hoa-giai/ma-vu-an-form-10A.xlsx (kèm link đơn)
 */
export const buoc04: Buoc<DonNguon, TrangThai10A> = {
  so: 4,
  ten: 'Ghi nhận kết quả lựa chọn hòa giải "Đồng ý", lưu kết quả',
  huongDan: 'b3',
  chay: async ({ vuAn, moPhien, tkToa, can, tt }) => {
    const urlDon = can('urlDon', 1);
    const m = await moChiTietDon(await moPhien(tkToa(vuAn.toaAn)), urlDon);
    await m.moTab('hoa-giai-doi-thoai');
    const main = m.page.locator('main');

    // Bảng kết quả (có cột "Hòa giải viên lựa chọn"); còn nút "Ghi nhận" thì chưa ghi nhận
    const bangKQ = main.locator('.ant-table-wrapper').filter({ hasText: 'Hòa giải viên lựa chọn' }).first();
    await m.choBang(bangKQ);
    const choGhiNhan = bangKQ.locator('.ant-table-row').filter({ has: m.page.getByText('Ghi nhận', { exact: true }) }).first();
    let ketQuaLuaChon = tt.ketQuaLuaChon ?? 'Đồng ý';
    if (await choGhiNhan.count()) {
      await choGhiNhan.getByText('Ghi nhận', { exact: true }).click();
      const bm = m.popup(/Ghi nhận kết quả lựa chọn/);
      await bm.waitFor({ timeout: 30_000 });
      await m.choTaiXong();
      ketQuaLuaChon = await m.chon(bm, 'Kết quả lựa chọn', 'Đồng ý');
      await m.nut(bm, 'Lưu kết quả').click();
      await m.choThongBao(/Thành công/);
      await bm.waitFor({ state: 'hidden', timeout: 15_000 });
    }

    // ── Lưu kết quả (ô đơn này xong; lần chạy sau ô sẽ tạo đơn mới) ──
    await luuDongKetQua(
      cauHinh10A.linhVuc,
      cauHinh10A.bieuMau,
      ['Số tiếp nhận', 'Tên đơn', 'Quan hệ pháp luật', 'Người khởi kiện', 'Người bị kiện', 'Thẩm phán hòa giải', 'Số QĐ phân công', 'Số TB 01-HG', 'Kết quả lựa chọn', 'Link đơn'],
      [tt.soTiepNhan ?? '', tt.tenDon ?? '', tt.quanHePhapLuat ?? '', tt.nguoiKhoiKien ?? '', tt.nguoiBiKien ?? '', tt.thamPhanHoaGiai ?? '', tt.soQuyetDinhPhanCong ?? '', tt.soThongBao01HG ?? '', ketQuaLuaChon, urlDon],
    );
    test.info().annotations.push({ type: 'Đơn đã tạo', description: `${tt.soTiepNhan} · ${tt.tenDon} · ${urlDon}` });
    return { ketQuaLuaChon };
  },
};
