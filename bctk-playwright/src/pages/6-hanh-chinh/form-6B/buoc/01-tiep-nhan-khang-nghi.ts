import { Buoc } from '../../../common/buoc';
import { TrangThai6B, VuAn6B, coKhangNghi } from '../cau-hinh-6B';
import { hoTen } from '../../../../utils/fake-data';
import { docMaDinhDanh, moVuAn, popup } from './chung';

/**
 * BƯỚC 01 · Tòa sơ thẩm · Tiếp nhận quyết định kháng nghị (hướng dẫn bước 1)
 *
 *  1. Tài khoản tòa sơ thẩm mở "Link vụ án" → ghi lại Mã định danh (bước 07 dùng để tìm vụ ở tòa phúc thẩm)
 *  2. Luồng không có kháng nghị → dừng ở đây
 *  3. Tab "Kết quả sơ thẩm" → "Thêm mới quyết định kháng nghị" → drawer "Tiếp nhận quyết định kháng nghị phúc thẩm"
 *  4. Số tiếp nhận, Số QĐ kháng nghị ngẫu nhiên · Viện kiểm sát cùng cấp · Người ký ngẫu nhiên (Viện trưởng)
 *     · Loại văn bản "Bản án" · bản án sơ thẩm của vụ · Lý do · Yêu cầu Tòa án cấp phúc thẩm (Căn cứ pháp luật điền sẵn)
 *  5. "Lưu quyết định kháng nghị"
 * Mục "Danh sách kháng nghị" đã có dòng (lượt trước) → không tiếp nhận lại.
 */
export const buoc01: Buoc<VuAn6B, TrangThai6B> = {
  so: 1,
  ten: 'Tòa sơ thẩm · Mã định danh, tiếp nhận quyết định kháng nghị',
  huongDan: '1',
  chay: async ({ vuAn, tt, moPhien, tkToa }) => {
    if (!coKhangNghi(vuAn) && !/cáo/i.test(vuAn.luong)) throw new Error(`Luồng "${vuAn.luong}" chưa hỗ trợ — dùng "Kháng cáo", "Kháng nghị" hoặc "Kháng cáo, kháng nghị"`);
    const m = await moVuAn(await moPhien(tkToa(vuAn.toaSoTham)), vuAn.linkVuAn);
    const maDinhDanh = (await docMaDinhDanh(m)) || tt.maDinhDanh;
    if (!maDinhDanh) throw new Error('Không đọc được "Mã định danh" ở Thông tin chung của vụ án');
    if (!coKhangNghi(vuAn)) return { maDinhDanh };

    await m.moTab('quan-ly-an');
    const ds = await m.moMuc('Danh sách kháng nghị');
    await m.choBang(ds);
    if (await ds.locator('.ant-table-row').count()) return { maDinhDanh, soKhangNghi: tt.soKhangNghi };

    await m.nut(ds, /Thêm mới quyết định kháng nghị/).click();
    const d = popup(m, 'Tiếp nhận quyết định kháng nghị');
    await d.waitFor({ timeout: 30_000 });
    await m.choTaiXong(1500);

    await m.nhap(d, 'Số tiếp nhận', String(Math.floor(10 + Math.random() * 990)));
    const soKhangNghi = await m.nhap(d, 'Số quyết định kháng nghị', String(Math.floor(10_000 + Math.random() * 90_000)));
    // Viện kiểm sát cùng cấp với tòa sơ thẩm ("Tòa án nhân dân khu vực 9 - Hà Nội" → "Viện kiểm sát nhân dân khu vực 9 - Hà Nội")
    await m.chon(d, 'Viện kiểm sát ban hành', vuAn.toaSoTham.replace(/^Tòa án nhân dân/i, 'Viện kiểm sát nhân dân'));
    await m.nhap(d, 'Người ký quyết định', hoTen());
    if (!(await m.docGiaTri('Chức vụ người ký', d))) await m.chon(d, 'Chức vụ người ký', 'Viện trưởng');
    await m.chon(d, 'Loại văn bản bị kháng nghị', 'Bản án');
    await m.page.waitForTimeout(500);
    await m.chon(d, 'Bản án/quyết định của vụ án');
    await m.nhap(d, 'Lý do kháng nghị', 'Bản án sơ thẩm đánh giá chứng cứ chưa đầy đủ, áp dụng pháp luật chưa chính xác');
    await m.nhap(d, 'Yêu cầu Tòa án cấp phúc thẩm', 'Đề nghị Tòa án cấp phúc thẩm xét xử sửa bản án sơ thẩm');
    await m.nut(d, 'Lưu quyết định kháng nghị').click();
    await m.choThongBao(/thành công/i);
    await d.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
    return { maDinhDanh, soKhangNghi };
  },
};
