import { Buoc } from '../../../common/buoc';
import { TrangThai6B, VuAn6B, coKhangCao } from '../cau-hinh-6B';
import { moVuAn, popup } from './chung';

/**
 * BƯỚC 02 · Tòa sơ thẩm · Thêm mới đơn kháng cáo (Mẫu 24-HC) (hướng dẫn bước 2)
 *
 *  1. Tab "Kết quả sơ thẩm" → mục "Danh sách kháng cáo" → "Thêm mới" → drawer "Thêm mới đơn kháng cáo — Mẫu 24-HC"
 *  2. Loại kháng cáo "Bản án" · Bản án/quyết định bị kháng cáo = bản án sơ thẩm của vụ
 *     · Loại người kháng cáo "Người khởi kiện" · Tên người kháng cáo ngẫu nhiên · Nội dung kháng cáo
 *     (Số tiếp nhận, ngày, phạm vi hệ thống điền sẵn)
 *  3. "Lưu mới"
 * Luồng không có kháng cáo, hoặc "Danh sách kháng cáo" đã có dòng (lượt trước) → bỏ qua.
 */
export const buoc02: Buoc<VuAn6B, TrangThai6B> = {
  so: 2,
  ten: 'Tòa sơ thẩm · Thêm mới đơn kháng cáo (24-HC)',
  huongDan: '2',
  chay: async ({ vuAn, tt, moPhien, tkToa }) => {
    if (!coKhangCao(vuAn)) return;
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaSoTham)), vuAn.linkVuAn);
    await m.moTab('quan-ly-an');
    const ds = await m.moMuc('Danh sách kháng cáo');
    await m.choBang(ds);
    const dong = ds.locator('.ant-table-row');
    if (await dong.count()) return { nguoiKhangCao: tt.nguoiKhangCao ?? (await dong.first().locator('td').nth(1).innerText()).split('\n')[0].trim() };

    await m.nut(ds, /^\s*Thêm mới\s*$/).click();
    const d = popup(m, 'Thêm mới đơn kháng cáo');
    await d.waitFor({ timeout: 30_000 });
    await m.choTaiXong(1500);

    const oSo = m.oTheoNhan('Số tiếp nhận', d).locator('input').first();
    if (!(await oSo.inputValue())) await oSo.fill(String(Math.floor(10 + Math.random() * 990)));
    await m.chon(d, 'Loại kháng cáo', 'Bản án');
    await m.page.waitForTimeout(500);
    await m.chon(d, 'Bản án/quyết định bị kháng cáo');
    await m.chon(d, 'Loại người kháng cáo', 'Người khởi kiện');
    await m.page.waitForTimeout(500);
    const nguoiKhangCao = await m.chon(d, 'Tên người kháng cáo');
    await m.nhap(d, 'Nội dung kháng cáo', 'Đề nghị Tòa án cấp phúc thẩm xem xét lại toàn bộ bản án sơ thẩm');
    await m.nut(d, 'Lưu mới').click();
    await m.choThongBao(/thành công/i);
    await d.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    return { nguoiKhangCao };
  },
};
