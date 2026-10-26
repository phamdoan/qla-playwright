import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { TrangThai1B, VuAnNguon } from '../cau-hinh-1B';
import { chuanHoa } from '../../../../utils/tai-khoan';
import { batDauBang, trinhKy } from './chung';

/**
 * BƯỚC 07 · Tòa phúc thẩm · Phân công thẩm phán chủ tọa, trình ký (hướng dẫn 5.1)
 *
 *  1. Mở vụ án phúc thẩm → tab "Phân công" › "Danh sách quyết định phân công"
 *  2. "Phân công" › "Phân công Thẩm phán" → vai trò "Thẩm phán chủ tọa" → chọn người → mũi tên thêm vào bảng
 *     (chọn trong số người CÓ tài khoản trong Taikhoan.xlsx để ký được quyết định xét xử ở bước 10)
 *  3. "Lưu" → "Trình ký" → "Gửi"
 */
export const buoc07: Buoc<VuAnNguon, TrangThai1B> = {
  so: 7,
  ten: 'Tòa phúc thẩm · Phân công thẩm phán chủ tọa, trình ký',
  huongDan: '5.1',
  chay: async ({ moPhien, tkToa, nguoiCoTaiKhoan, can }) => {
    const toa = can('toaPhucTham', 4);
    const phien = await moPhien(tkToa(toa));
    await phien.vao(can('urlVuAn', 5));
    const m = new ManHinh(phien.page);
    await m.moTab('phan-cong');
    const muc = await m.moMuc('Danh sách quyết định phân công');

    // Lượt trước đã phân công chủ tọa → đọc lại từ bảng
    await m.choBang(muc);
    const daCo = muc.locator('.ant-table-row').filter({ hasText: 'Thẩm phán chủ tọa' }).first();
    if (await daCo.count()) {
      return { chuToa: await m.docCot(daCo, 'Người được phân công'), nguoiKyPhanCong: await m.docCot(daCo, 'Người ký') };
    }

    await m.nut(muc, 'Phân công').click();
    await m.page.locator('.ant-dropdown:visible').getByText('Phân công Thẩm phán', { exact: true }).click();
    const bm = m.popup('Phân công Thẩm phán');
    await bm.waitFor({ timeout: 30_000 });
    await m.choTaiXong();

    await m.chon(bm, 'Vai trò', /Thẩm phán chủ tọa/);
    await m.page.waitForTimeout(800);
    const uuTien = nguoiCoTaiKhoan(toa);
    const coTaiKhoan = (await m.cacLuaChon(bm, 'Tên người được phân công')).filter(n =>
      uuTien.some(t => chuanHoa(n).startsWith(chuanHoa(t))),
    );
    const muon = coTaiKhoan.length ? coTaiKhoan[Math.floor(Math.random() * coTaiKhoan.length)] : undefined;
    const daChon = await m.chon(bm, 'Tên người được phân công', muon ? batDauBang(muon.split(' - ')[0]) : undefined);
    const chuToa = daChon.split(' - ')[0].trim();

    await bm.locator('button:has(.anticon-arrow-down)').first().click();
    await bm.locator('.ant-table-row').filter({ hasText: chuToa }).first().waitFor({ timeout: 15_000 });
    await m.nut(bm, 'Lưu').click();
    await m.choThongBao(/Lưu quyết định thành công/);
    return { chuToa, nguoiKyPhanCong: await trinhKy(m, bm) };
  },
};
