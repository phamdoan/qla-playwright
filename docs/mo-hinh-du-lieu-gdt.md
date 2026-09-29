# Mô hình dữ liệu luồng GĐT / Tái thẩm — bản đồ để đọc trước khi sửa màn hình

Kiểm chứng trên STG ngày 29/09/2026 bằng `SELECT` + mã nguồn `qla/`, `qla-webapp/`.

## Ba thực thể dễ nhầm

```
VUAN (giai đoạn 3 — giải quyết đơn)          VUAN (giai đoạn 2 — xét xử GĐT)
  MA_VUAN  VA26-004544                         MA_VUAN  VA26-004803
  DON_VI_KHOI_TAO  D01.107                     DON_VI_KHOI_TAO  D01
  CONNGUOI_VU  3 dòng                          CONNGUOI_VU  0 dòng
        ▲                                            ▲   ID_VUAN_GOC ──┘
        │ DON.ID_VU_GIAIQUYET                        │ DON.ID_VUAN
        │                                            │
   ĐƠN GĐT/TT người dùng nhập              ĐƠN KỸ THUẬT do B14 sinh
   MA_DON 10243                             MA_DON 10364
   LOAI_DON  DON_GDT_TT                      LOAI_DON  HO_SO_KHANG_NGHI_GDT
   IS_DON_CHINH  0  ← đơn phụ!               IS_DON_CHINH  1
   SO_BANAN_QD  7                            SO_BANAN_QD  7
   DON_DOITUONG_LIENQUAN  3 dòng             DON_DOITUONG_LIENQUAN  0 dòng
                                             ID_VU_GIAIQUYET  NULL
```

Ba hệ quả phải thuộc:

1. **Đơn người dùng nhập gắn vào vụ giai đoạn 3**, không gắn vào vụ xét xử.
2. **Vụ xét xử không có đương sự** — cả `CONNGUOI_VU` của vụ lẫn `DON_DOITUONG_LIENQUAN` của đơn
   kỹ thuật đều rỗng. Mọi cách định danh theo tên người đều vô hiệu từ B14 trở đi.
3. **Số/ngày/tòa bản án thì có** trên đơn kỹ thuật → đó là trục lọc duy nhất còn dùng được,
   bên cạnh số thụ lý xét xử (chỉ có sau B15).

## Màn nào lọc theo bảng nào

| Màn | API / spec | Điều kiện then chốt |
|---|---|---|
| Quản lý xét xử GĐT | `XetXuGdtServiceImpl.buildDanhSachSpec` | `VuAn.giaiDoan = GIAM_DOC_THAM`, `VuAn.donViKhoiTao = userInfo.maToaAn` (= `D01`), và với user không phải Chánh án: `EXISTS DonChuyen(maDonViChuyenDenNoiBo = organizationCode)` **OR** `EXISTS HoSoKhangNghiDen(idVuAn, TRANG_THAI = DA_NHAN, maDonViNhan = organizationCode)` |
| — lọc Số BA/QĐ | cùng file, ~dòng 1244 | `LIKE` trên `DonGdt.SO_BANAN_QD` / `Don.SO_BAN_AN_QD` / `DonGdt.SO_QUYET_DINH` → **chạy được** |
| — lọc Ngày BA/QĐ | cùng file, ~dòng 1255 | chỉ so `Don.NGAY_BAN_AN_QD` (một nguồn duy nhất) |
| — lọc Nguyên đơn | cùng file, ~dòng 1297 | `EXISTS VuGiaiQuyetDtlq(idVuGiaiQuyet = Don.idVuGiaiQuyet)` mà cột đó `NULL` → **luôn 0 dòng** |
| Danh sách vụ xét xử | `DanhSachXetXuVuAnMatchRepository` | `join Don d on d.idVuAn = v.id and d.isDonChinh = true` |
| Phân công HĐXX | `PhanCongHoiDongXetXuServiceImpl.phanCongTheoDonBanAn` | `don.idVuAn = pcv.idVuAn OR don.idVuGiaiQuyet = pcv.idVuAn`, `isDonChinh = true`, lọc `LIKE` trên `don.soBanAnQD` |
| Cột lưới hiển thị | `qla-webapp/src/pages/VuAn/GdtTt/QuanLyVuXetXu/components/DanhSachVuXetXu/columns.tsx` | 4 cột gộp: Thông tin vụ xét xử (kháng nghị, số/ngày TLXX), Thông tin bản án (số BA, tòa, đương sự), Phân công, Trạng thái |

Ghi nhớ: **mọi màn của luồng đều join qua đơn `isDonChinh = true`.** Đơn phụ không tồn tại với hệ thống.

## Phân công nằm ở đâu

| Việc | Bảng | Cột phân biệt |
|---|---|---|
| Thẩm tra viên / lãnh đạo TTV (trên **đơn**) | `DON_PHANCONG` | `VAI_TRO` = `TTV`, `LDTTV` |
| Thẩm phán TAND tối cao (trên **vụ**) | `PHAN_CONG` | `VAI_TRO` = `TA.TP.001`, `TRANG_THAI = 2` (đã duyệt) |
| Chủ tọa / thành viên HĐXX | `PHAN_CONG` | `VAI_TRO` = `TPCT`, `TPTVHDXX` |

Chưa có `TA.TP.001` đã duyệt thì B19 báo "Vụ án chưa xác định thẩm phán chủ tọa, không thể trình ký".

Kiểm tra số thành viên hội đồng sau B21: đúng phải là 1 `TPCT` + đúng số `TPTVHDXX` theo cấu hình.
Đã gặp vụ VA26-004810 bị tick nhầm **24 thành viên** — dữ liệu sai, phải làm lại.

## Trạng thái vụ xét xử

| `TRANG_THAI_VU_AN` | Ý nghĩa quan sát được |
|---|---|
| `TT_VUAN.002.001` | vừa tạo, **chưa thụ lý** (`SO_THULY` NULL) |
| `TT_VUAN.002.002` | đã qua thụ lý / phân công |
| `TT_VUAN.003.007` | đã có kết quả xét xử (`VUAN_KETQUA`) |

`VUAN.SO_THULY` của vụ xét xử chỉ có sau B15. Trước đó không dùng số thụ lý để tìm vụ được.

## Vụ GĐKT xử lý đơn theo loại án

Đơn được định tuyến về Vụ theo loại án; tài khoản sai Vụ thì không thấy đơn/vụ.

- Dân sự, KDTM, lao động, hôn nhân → **D01.107** (Vụ Giám đốc, kiểm tra về dân sự)
- Một vài đơn lệch về `D01.121.KTNVTHA` (đã gặp với đơn 10230, 10252)
- Hình sự → Vụ hình sự

Từ B10 trở đi phải dùng đúng bộ tài khoản của Vụ tương ứng (`thuKyVuDanSu` / `vuTruongDanSu` /
`thamTraVienDanSu` …).

## Câu SELECT hay dùng

```sql
-- vụ giai đoạn 2 sinh từ các đơn đã nhập
SELECT g.MA_VUAN, g.SO_THULY, g.TRANG_THAI_VU_AN, g.DON_VI_KHOI_TAO
FROM VUAN g
WHERE g.GIAI_DOAN = 2 AND NVL(g.DANH_DAU_XOA,0) = 0
  AND g.ID_VUAN_GOC IN (SELECT ID_VU_GIAIQUYET FROM DON WHERE MA_DON IN ('10243','10237'));

-- đơn chính đang neo vụ xét xử (đơn kỹ thuật) — để biết lọc số BA/QĐ nào ra vụ
SELECT v.MA_VUAN, d.MA_DON, d.LOAI_DON, d.IS_DON_CHINH, d.SO_BANAN_QD, d.NGAY_BANAN_QD
FROM VUAN v JOIN DON d ON d.ID_VUAN = v.ID AND NVL(d.DANH_DAU_XOA,0) = 0
WHERE v.MA_VUAN = 'VA26-004803';

-- phân công của vụ (chủ tọa / hội đồng)
SELECT p.VAI_TRO, p.TEN_CANBO, p.TRANG_THAI
FROM PHAN_CONG p JOIN VUAN v ON v.ID = p.ID_VUAN
WHERE v.MA_VUAN = 'VA26-004810' AND NVL(p.DANH_DAU_XOA,0) = 0;

-- đơn là đơn chính hay đơn phụ
SELECT MA_DON, IS_DON_CHINH, SO_BANAN_QD, NGAY_BANAN_QD, DON_VI_RA_BANAN_QD
FROM DON WHERE MA_DON IN ('10225','10237','10240');
```

## Cột dễ nhầm tên (đã mất thời gian vì `ORA-00904`)

| Bảng | Đúng | Hay gõ nhầm |
|---|---|---|
| `PHAN_CONG` | `ID_VUAN`, `TEN_CANBO` | `ID_VU_AN`, `HO_TEN` |
| `DON` | `ID_VUAN`, `ID_VU_GIAIQUYET` | `ID_VU_AN`, `ID_HOSO_VUAN` |
| `BAN_AN` | `SO_BAN_AN`, `NGAY_BAN_AN` | `SO_BANAN`, `LOAI_BANAN` |
| `HOSO_KHANGNGHI_DEN` | `ID_VUAN`, `MA_DONVI_NHAN` | `ID_VU_AN`, `MA_DON_VI_NHAN` |
| `DON_DOITUONG_LIENQUAN` | `TEN_DOITUONG_LIENQUAN` | `TEN_DOI_TUONG_LIEN_QUAN` |
| `VUAN` | không có `MA_DONVI` | — |
