import { Buoc } from '../../../common/buoc';
import { TrangThai5B, VuAn5B } from '../cau-hinh-5B';
import { hoTen } from '../../../../utils/fake-data';
import { moVuAn, ngauNhien, popup } from './chung';

/**
 * BƯỚC 01 · Tòa sơ thẩm · Tiếp nhận quyết định kháng nghị (hướng dẫn bước 1)
 *
 *  1. Tài khoản tòa sơ thẩm mở "Link vụ án" → tab "Kết quả sơ thẩm" → "Tiếp nhận quyết định kháng nghị"
 *  2. Số QĐ kháng nghị ngẫu nhiên · Viện kiểm sát ban hành · địa chỉ · người ký (Viện trưởng)
 *     · Loại văn bản "Bản án" · bản án sơ thẩm của vụ · lý do · yêu cầu cấp phúc thẩm
 *  3. "Lưu quyết định kháng nghị"
 * Mục "Danh sách kháng nghị" đã có dòng (lượt trước) → không tiếp nhận lại.
 */
export const buoc01: Buoc<VuAn5B, TrangThai5B> = {
  so: 1,
  ten: 'Tòa sơ thẩm · Tiếp nhận quyết định kháng nghị',
  huongDan: '1',
  chay: async ({ vuAn, tt, moPhien, tkToa }) => {
    if (!/nghị|nghi/i.test(vuAn.luong)) throw new Error(`Luồng "${vuAn.luong}" chưa hỗ trợ — form 5B hiện chỉ có luồng "Kháng nghị"`);
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaSoTham)), vuAn.linkVuAn);
    await m.moTab('quan-ly-an');
    const ds = await m.moMuc('Danh sách kháng nghị');
    await m.choBang(ds);
    if (await ds.locator('.ant-table-row').count()) return { soKhangNghi: tt.soKhangNghi };

    await m.nut(m.page.locator('main'), 'Tiếp nhận quyết định kháng nghị').click();
    const d = popup(m, 'Tiếp nhận quyết định kháng nghị');
    await d.waitFor({ timeout: 30_000 });
    await m.choTaiXong(1500);

    const soKhangNghi = await m.nhap(d, 'Số quyết định kháng nghị', String(Math.floor(100 + Math.random() * 900)));
    // Viện kiểm sát cùng cấp với tòa sơ thẩm ("Tòa án nhân dân khu vực 9 - Hà Nội" → "Viện kiểm sát nhân dân khu vực 9 - Hà Nội")
    const vienKiemSat = await m.chon(d, 'Viện kiểm sát ban hành', vuAn.toaSoTham.replace(/^Tòa án nhân dân/i, 'Viện kiểm sát nhân dân'));
    await m.nhap(d, 'Địa chỉ Viện kiểm sát kháng nghị', `Số ${1 + Math.floor(Math.random() * 200)} ${ngauNhien(['Lê Duẩn', 'Trần Phú', 'Kim Mã', 'Láng Hạ'])}, Hà Nội`);
    await m.nhap(d, 'Người ký quyết định', hoTen());
    await m.chon(d, 'Chức vụ người ký', 'Viện trưởng');
    await m.chon(d, 'Loại văn bản bị kháng nghị', 'Bản án');
    const banAnSoTham = await m.chon(d, 'Bản án/quyết định của vụ án');
    await m.nhap(d, 'Lý do kháng nghị', 'Bản án sơ thẩm đánh giá chứng cứ chưa đầy đủ, áp dụng pháp luật chưa chính xác');
    await m.nhap(d, 'Yêu cầu Tòa án cấp phúc thẩm', 'Đề nghị Tòa án cấp phúc thẩm xét xử sửa bản án sơ thẩm');
    await m.nut(d, 'Lưu quyết định kháng nghị').click();
    await m.choThongBao(/thành công/i);
    await d.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    return { soKhangNghi, vienKiemSat, banAnSoTham };
  },
};
