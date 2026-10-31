import { Buoc } from '../../../common/buoc';
import { BanAn5C, TK_LANH_DAO, TK_VU_TRUONG, TrangThai5C } from '../cau-hinh-5C';
import { xuLyChoDuyet } from './chung';

/**
 * BƯỚC 08 · Lãnh đạo · Ký logic quyết định thành lập HĐXX và công văn mời VKS (hướng dẫn bước 8)
 *
 *  Tài khoản lãnh đạo → Công tác lãnh đạo › Phê duyệt đề xuất › tab "Chờ duyệt"
 *  → mở văn bản do Vụ trưởng trình (mới nhất, danh sách xếp mới lên đầu) → màn "Ký số văn bản" → "Ký logic"
 * Màn ký của hai văn bản này không có chữ để đối chiếu số văn bản → lấy đề xuất mới nhất của từng loại.
 */
export const buoc08: Buoc<BanAn5C, TrangThai5C> = {
  so: 8,
  ten: 'Lãnh đạo · Ký logic quyết định thành lập HĐXX và công văn mời VKS',
  huongDan: '8',
  chay: async ({ tt, moPhien }) => {
    const phien = await moPhien(TK_LANH_DAO);
    if (!tt.daKyQDHoiDong) {
      await xuLyChoDuyet(phien, /Quyết định (thành lập|phân công) Hội đồng xét xử/i, TK_VU_TRUONG.ten!, 'Ký logic');
    }
    await xuLyChoDuyet(phien, /Công văn mời Viện kiểm sát/i, TK_VU_TRUONG.ten!, 'Ký logic');
    return { daKyQDHoiDong: true };
  },
};
