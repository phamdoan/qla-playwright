/**
 * FLOW QUẢN LÝ ĐƠN 002 — NHẬP DATA GĐT/TT, ĐỦ 22 BƯỚC (BƯỚC 2–23 của đặc tả).
 *
 * Nguồn: `docs/stepdata/GDT-TT-bao-cao-thong-ke.txt`.
 * ⚠ TẠO DỮ LIỆU THẬT. Chỉ chạy khi có `--ghi`.
 *
 * Bản án đầu vào phải CÓ THẬT trên môi trường (đặc tả không tạo bản án):
 *   QLA_BA_SO=… QLA_BA_NGAY=dd/MM/yyyy QLA_BA_TOA="…" npm run gdt:preprod
 *
 * Không khai bản án → danh sách case rỗng → khung bỏ qua luồng, không giết lượt chạy.
 */
import { khaiLuong } from '../../../khung/luong';
import { CAI_DAT } from '../../../flows/quan-ly-don/flow-002-gdt-tt-nhap-data/cai-dat';
import { FLOW_QLD_002 } from '../../../flows/quan-ly-don/flow-002-gdt-tt-nhap-data/flow';
import { DS_CASE } from '../../../data/quan-ly-don/flow-002-gdt-tt-nhap-data/cases';

khaiLuong({
  flow: FLOW_QLD_002,
  dsCase: DS_CASE,
  caiDat: CAI_DAT,
  /** 6 vai theo đặc tả: canBo · chanhVanPhong · phoChanhAn · thuKyVuDanSu · vuTruongDanSu · chanhAn */
  vai: buoc => buoc.vai,
  phut: 15,
});
