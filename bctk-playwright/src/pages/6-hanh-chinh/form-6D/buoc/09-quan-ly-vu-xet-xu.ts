import { test } from '@playwright/test';
import { Buoc } from '../../../common/buoc';
import { ManHinh } from '../../../base.page';
import { BIEU_MAU_6D, BanAn6D, LINH_VUC_6D, TK_LANH_DAO, TK_VU_TRUONG, TrangThai6D, Y_KIEN_DE_XUAT } from '../cau-hinh-6D';
import { luuDongKetQua, timDongOutput } from '../../../../utils/file-helper';
import { dongVuXetXu } from './chung';

/**
 * BƯỚC 09 · Vụ trưởng · Quản lý xét xử GĐT — kiểm tra kết quả, lưu kết quả (hướng dẫn bước 9)
 *
 *  1. Giám đốc thẩm, tái thẩm › Quản lý xét xử GĐT → tab "Tất cả" → lọc số bản án → dòng của hồ sơ (Kháng nghị: <số KN>)
 *  2. Ghi output/6-hanh-chinh/6D/output-ma-vu-an-form-6D_<ngày>_<giờ>.xlsx
 */
export const buoc09: Buoc<BanAn6D, TrangThai6D> = {
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
    // Bản án đầu vào của 6D là bản án sơ thẩm của 6A → lấy người bị kiện / cấp cơ quan bị kiện từ output 6A theo số bản án
    const vuAn6A = await timDongOutput(LINH_VUC_6D, '6A', 'Số bản án', vuAn.soBanAn);

    await luuDongKetQua(
      LINH_VUC_6D,
      BIEU_MAU_6D,
      TK_VU_TRUONG,
      ['Số bản án', 'Ngày bản án', 'Tòa ra quyết định', 'Cấp xét xử', 'Người kháng nghị', 'Số QĐKN', 'Ngày QĐKN', 'Quan hệ pháp luật', 'Người bị kiện', 'Cấp cơ quan bị kiện', 'Thẩm phán', 'Số tờ trình PC', 'Chủ tọa', 'Thẩm phán khác', 'Lịch xét xử', 'Số chương trình làm việc', 'Số thụ lý XX', 'Ý kiến đề xuất / Kết quả GĐT,TT', 'Trạng thái', 'Link vụ án'],
      [vuAn.soBanAn, vuAn.ngayBanAn, vuAn.toaAn, vuAn.capXetXu, vuAn.nguoiKhangNghi, soKhangNghi, tt.ngayKhangNghi ?? '', tt.quanHePhapLuat ?? '', vuAn6A['Người bị kiện'] ?? '', vuAn6A['Cấp cơ quan bị kiện'] ?? '', tt.thamPhan ?? '', tt.soToTrinh ?? '', TK_LANH_DAO.ten!, tt.thanhVienHDXX ?? '', tt.lichXetXu ?? '', tt.soChuongTrinh ?? '', soThuLy, tt.yKienDeXuat ?? Y_KIEN_DE_XUAT ?? '', trangThai, tt.urlVuAn ?? ''],
      'Số QĐKN',
    );
    test.info().annotations.push({ type: 'Vụ tái thẩm hành chính', description: `KN ${soKhangNghi} · BA ${vuAn.soBanAn} · TLXX ${soThuLy} · ${tt.lichXetXu} · ${trangThai}` });
  },
};
