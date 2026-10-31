import { test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BIEU_MAU_1D1, BanAn1D1, LINH_VUC_1D1, TK_LANH_DAO, TK_VU_TRUONG, TrangThai1D1, Y_KIEN_DE_XUAT } from '../cau-hinh-1D1';
import { luuDongKetQua } from '../../../../utils/file-helper';
import { dongVuXetXu } from './chung';

/**
 * BƯỚC 09 · Vụ trưởng · Quản lý xét xử GĐT — kiểm tra kết quả, lưu kết quả (hướng dẫn bước 9)
 *
 *  1. Giám đốc thẩm, tái thẩm › Quản lý xét xử GĐT → tab "Tất cả" → lọc số bản án → dòng của hồ sơ (Kháng nghị: <số KN>)
 *  2. Ghi output/1-hinh-su/1D1/output-ma-vu-an-form-1D1_<ngày>_<giờ>.xlsx
 */
export const buoc09: Buoc<BanAn1D1, TrangThai1D1> = {
  so: 9,
  ten: 'Vụ trưởng · Quản lý xét xử GĐT — kiểm tra kết quả, lưu kết quả',
  huongDan: '9',
  chay: async ({ vuAn, tt, moPhien, can }) => {
    const soKhangNghi = can('soKhangNghi', 1);
    const phien = await moPhien(TK_VU_TRUONG);
    const m = new ManHinh(phien.page);
    await phien.vao('vu-an/gdt-tt/quan-ly-vu-xet-xu/danh-sach');
    await m.choTaiXong(3000);
    const dong = await dongVuXetXu(m, vuAn.soBanAn, soKhangNghi);
    const chu = (await dong.innerText()).replace(/\s+/g, ' ');
    const soThuLy = chu.match(/Số TLXX:\s*(\d+)/)?.[1] ?? '';
    const trangThai = chu.match(/(Chưa xét xử|Đã xét xử|Đã có kết quả[^0-9]*?)\s+(Đã lên lịch xét xử|Chưa lên lịch xét xử)?/)?.[0]?.trim() ?? '';

    await luuDongKetQua(
      LINH_VUC_1D1,
      BIEU_MAU_1D1,
      TK_VU_TRUONG,
      ['Số bản án', 'Ngày bản án', 'Tòa ra quyết định', 'Cấp xét xử', 'Người kháng nghị', 'Số QĐKN', 'Ngày QĐKN', 'Thẩm phán', 'Số tờ trình PC', 'Chủ tọa', 'Thẩm phán khác', 'Lịch xét xử', 'Số chương trình làm việc', 'Số thụ lý XX', 'Ý kiến đề xuất / Kết quả GĐT,TT', 'Trạng thái', 'Link vụ án'],
      [vuAn.soBanAn, vuAn.ngayBanAn, vuAn.toaAn, vuAn.capXetXu, vuAn.nguoiKhangNghi, soKhangNghi, tt.ngayKhangNghi ?? '', tt.thamPhan ?? '', tt.soToTrinh ?? '', TK_LANH_DAO.ten!, tt.thanhVienHDXX ?? '', tt.lichXetXu ?? '', tt.soChuongTrinh ?? '', soThuLy, Y_KIEN_DE_XUAT, trangThai, tt.urlVuAn ?? ''],
      'Số QĐKN',
    );
    test.info().annotations.push({ type: 'Vụ tái thẩm hình sự', description: `KN ${soKhangNghi} · BA ${vuAn.soBanAn} · TLXX ${soThuLy} · ${tt.lichXetXu} · ${trangThai}` });
  },
};
