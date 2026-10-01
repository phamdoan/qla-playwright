/**
 * FLOW HÌNH SỰ 001 · BẢNG CÀI ĐẶT: mã bước → thân nghiệp vụ.
 *
 * Bước nào chưa có ở đây thì khung đánh `fixme` — hiện trong `--list` để thấy luồng còn thiếu gì,
 * và KHÔNG bao giờ báo xanh giả.
 */
import type { BangCaiDat } from '../../../khung/luong';
import type { INPUT } from '../../../data/hinh-su/flow-001-so-tham/case-001/input';
import { taoVuAnHinhSu } from './tao-vu-an.flow';
import { thuLyVuAnHinhSu } from './thu-ly.flow';
import { phanCongHoiThamThuKy, phanCongThamPhan } from './phan-cong.flow';
import { duaRaXetXu020, moPhienToa } from './xet-xu.flow';

export type InputHinhSu = typeof INPUT;

export const CAI_DAT: BangCaiDat<InputHinhSu> = {
  '01-tao-vu-an': ({ page, input, ghi }) => taoVuAnHinhSu(page, input, ghi),
  '02-thu-ly': ({ page, input, ghi }) => thuLyVuAnHinhSu(page, input, ghi),
  '03-phan-cong-tham-phan': ({ page, input, ghi }) => phanCongThamPhan(page, input, ghi),
  '04-phan-cong-hoi-tham-thu-ky': ({ page, input, ghi }) => phanCongHoiThamThuKy(page, input, ghi),
  '05-mo-phien-toa': ({ page, input, ghi }) => moPhienToa(page, input, ghi),
  '06-dua-ra-xet-xu-020': ({ page, input, ghi, can }) =>
    duaRaXetXu020(page, input, ghi, can('ngayMoPhienToa')),

  // Bước 07 (bản án sơ thẩm) chưa cài đặt — xem flows/hinh-su/flow-001-so-tham/flow.ts
};
