import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BanAn2C, TK_LANH_DAO, TK_VU_TRUONG, TrangThai2C } from '../cau-hinh-2C';
import { xuLyChoDuyet } from './chung';

/**
 * BƯỚC 08 · Lãnh đạo · Ký logic quyết định thành lập HĐXX và công văn mời VKS (hướng dẫn bước 8)
 *
 *  Tài khoản lãnh đạo → Công tác lãnh đạo › Phê duyệt đề xuất › tab "Chờ duyệt"
 *  → mở văn bản do Vụ trưởng trình (mới nhất, danh sách xếp mới lên đầu) → màn "Ký số văn bản" → "Ký logic"
 * Màn ký của hai văn bản này không có chữ để đối chiếu số văn bản → lấy đề xuất mới nhất của từng loại.
 * Trước khi ký: xem bảng "Quyết định/Thông báo" ở chi tiết hội đồng (bước 07) — văn bản nào đã "Đã ký" thì bỏ qua.
 */
export const buoc08: Buoc<BanAn2C, TrangThai2C> = {
  so: 8,
  ten: 'Lãnh đạo · Ký logic quyết định thành lập HĐXX và công văn mời VKS',
  huongDan: '8',
  chay: async ({ tt, moPhien, can }) => {
    // Ký "mới nhất" có thể ký giúp văn bản của hồ sơ khác cùng Vụ trưởng → tới lượt hồ sơ đó "Chờ duyệt" đã hết
    // (30/10: BA 56352 báo không thấy công văn dù công văn 248 đã ký) → xem trạng thái thật trước
    const urlHoiDong = can('urlHoiDong', 7);
    const vt = await moPhien(TK_VU_TRUONG);
    const m = new ManHinh(vt.page);
    await vt.vao(urlHoiDong);
    await m.choTaiXong(2500);
    const bangQD = m.page.locator('main .ant-table').filter({ hasText: 'Tên biểu mẫu' }).last();
    await bangQD.locator('.ant-table-row').first().waitFor({ timeout: 60_000 });
    const daKy = async (ten: RegExp) => /Đã ký/.test(await bangQD.locator('.ant-table-row').filter({ hasText: ten }).first().innerText().catch(() => ''));
    const kyQD = !tt.daKyQDHoiDong && !(await daKy(/Quyết định (thành lập|phân công) Hội đồng xét xử/i));
    const kyCV = !(await daKy(/Công văn mời Viện kiểm sát/i));

    const phien = await moPhien(TK_LANH_DAO);
    if (kyQD) await xuLyChoDuyet(phien, /Quyết định (thành lập|phân công) Hội đồng xét xử/i, TK_VU_TRUONG.ten!, 'Ký logic');
    if (kyCV) await xuLyChoDuyet(phien, /Công văn mời Viện kiểm sát/i, TK_VU_TRUONG.ten!, 'Ký logic');
    return { daKyQDHoiDong: true };
  },
};
