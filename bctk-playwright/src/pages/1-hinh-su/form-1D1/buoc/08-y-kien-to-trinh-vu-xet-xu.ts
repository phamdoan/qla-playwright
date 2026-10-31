import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BanAn1D1, TK_LANH_DAO, TK_VU_TRUONG, TrangThai1D1, Y_KIEN_DE_XUAT } from '../cau-hinh-1D1';

/**
 * BƯỚC 08 · Lãnh đạo · Cho ý kiến và ký tờ trình vụ xét xử (hướng dẫn bước 8)
 *
 *  Tài khoản lãnh đạo (Nguyễn Hải Trâm) → Công tác lãnh đạo › Phê duyệt đề xuất › tab "Chờ duyệt"
 *  → mở "Tờ trình vụ xét xử" do Vụ trưởng trình (nội dung có số bản án) → Kết quả GĐT,TT = ý kiến đề xuất ở bước 07
 *  → "Lưu và ký logic"
 */
export const buoc08: Buoc<BanAn1D1, TrangThai1D1> = {
  so: 8,
  ten: 'Lãnh đạo · Cho ý kiến (Kết quả GĐT,TT), lưu và ký logic tờ trình vụ xét xử',
  huongDan: '8',
  chay: async ({ vuAn, moPhien }) => {
    const phien = await moPhien(TK_LANH_DAO);
    const m = new ManHinh(phien.page);
    const p = m.page;
    const main = p.locator('main');
    // i = vị trí tờ trình đang xét; tờ trình của bản án khác thì xét tờ trình kế tiếp
    for (let i = 0; i < 15; i++) {
      await phien.vao('lanh-dao/phe-duyet-de-xuat/danh-sach');
      await m.choTaiXong(2000);
      await main.locator('[role=tab]').filter({ hasText: 'Chờ duyệt' }).click();
      await m.choTaiXong(2500);
      await m.choBang(main);
      const dong = main.locator('.ant-table-row').filter({ hasText: /Tờ trình vụ xét xử/ }).filter({ hasText: TK_VU_TRUONG.ten! });
      if (i >= (await dong.count())) break;
      await dong.nth(i).locator('a').filter({ hasText: /Tờ trình vụ xét xử/ }).first().click();
      await p.waitForURL(/y-kien-lanh-dao/, { timeout: 60_000 });
      await m.choTaiXong(3000);
      if (!(await main.innerText()).includes(vuAn.soBanAn)) continue;

      await p.getByRole('combobox', { name: /Kết quả GĐT,\s*TT/ }).click();
      await p.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: Y_KIEN_DE_XUAT }).first().click();
      await m.nut(main, /Lưu và ký logic/).click();
      await m.dongYTatCaXacNhan();
      await m.choThongBao(/thành công|Đã ký|Đã phê duyệt/i);
      return;
    }
    throw new Error(`Không thấy "Tờ trình vụ xét xử" của ${TK_VU_TRUONG.ten} (bản án ${vuAn.soBanAn}) đang chờ duyệt`);
  },
};
