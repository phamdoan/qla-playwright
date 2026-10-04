# Bộ vụ án thật — 111 bản án đã công bố làm hạt giống

## Vì sao có bộ này

Luồng dân sự trước đó chỉ có 4 case, cả 4 đều **cùng một quan hệ pháp luật** ("Tranh chấp hợp đồng
vay tài sản"). Chạy bao nhiêu lượt cũng chỉ ra bản án cùng một loại tranh chấp, nên dữ liệu trên môi
trường kiểm thử không phản ánh được bề rộng nghiệp vụ.

Bộ này lấy **bản án thật đã công bố** trên cổng công bố bản án của TAND tối cao
(<https://congbobanan.toaan.gov.vn>) làm hạt giống, để một lượt chạy sinh ra nhiều bản án thuộc nhiều
quan hệ pháp luật khác nhau.

| | |
|---|---|
| Số bản ghi | 111 (111 URL khác nhau) |
| Quan hệ pháp luật khác nhau | 31 lá |
| Theo loại đơn | Dân sự 60 · Kinh doanh, thương mại 30 · Lao động 13 · Hôn nhân và gia đình 8 |
| Ngày thu | 04/10/2026 |

## Tệp nào ở đâu

| Tệp | Vai trò |
|---|---|
| `tools/sinh-ban-an-cong-bo/thu-thap.json` | **Nguồn sự thật** — bản ghi thu từ cổng. Thêm bản án mới ở đây. |
| `tools/sinh-ban-an-cong-bo/danh-muc-qhpl.tsv` | Ảnh chụp danh mục lá QHPL của `QTDM.DANHMUC` (STG, 04/10/2026). |
| `tools/sinh-ban-an-cong-bo/sinh.js` | Ghép hai tệp trên → sinh dữ liệu. `npm run ban-an-cong-bo:sinh`. |
| `tools/sinh-ban-an-cong-bo/doc-danh-muc.md` | Cách chụp lại danh mục và cách thêm bản án. |
| `data/vu-an-thuc/ban-an-cong-bo.ts` | **Sinh tự động, đừng sửa tay.** |
| `data/vu-an-thuc/sinh-case.ts` | Biến mỗi bản ghi thành một case của luồng dân sự. |

## Cái gì là THẬT, cái gì không

Ba điều phải nói rõ, vì nhầm là hiểu sai cả bộ dữ liệu:

1. **Tên đương sự KHÔNG phải tên thật — và không thể là tên thật.** Cổng công bố đã che tên các bên
   trước khi công bố (chỉ còn "bà Lưu Thị H", "Công ty TNHH U."). Nên khi chạy, tên nguyên
   đơn/bị đơn vẫn do `tenDuongSu()` sinh tất định từ mã case. Trích yếu thì giữ **nguyên văn** tiêu
   đề cổng công bố.

2. **`soBanAn` / `ngay` là của bản án GỐC**, chỉ để tra lại nguồn. Số bản án mà hệ thống cấp khi
   chạy là OUTPUT do máy chủ sinh — gieo lại số gốc vào ô "Số bản án" sẽ đụng
   `SO_DC_CAP_DA_TON_TAI`.

3. **Phân loại của cổng không luôn trùng một lá chọn được.** Mã lá (`maQhpl`, `tenQhpl`, `qhplCha`)
   đọc trực tiếp từ `QTDM.DANHMUC` và chỉ lấy **lá chọn được**: cấp 1 hoặc 2 và không còn cấp con.
   Lý do:
   - FE từ chối nút còn cấp con (*"Nhóm danh mục này còn cấp con"*);
   - `chonQhplThongKe` chỉ mở được **một** cấp cha, nên lá cấp 3 không chọn nổi.

   Khi phân loại của cổng rơi vào một nhóm như vậy, bản ghi có `ghiChu` nói rõ đã hạ về lá nào và
   vì sao. Bốn trường hợp đã gặp:

   | Phân loại của cổng | Mã nhóm (không chọn được) | Lá đã dùng |
   |---|---|---|
   | Tranh chấp thừa kế quyền sử dụng đất | `QHPL_TC_DS.010.005` (cấp 2, còn 2 con) | `QHPL_TC_DS.005` Tranh chấp về thừa kế tài sản |
   | Tranh chấp đất đai | `QHPL_TC_DS.010` (cấp 1, còn 8 con) | `QHPL_TC_DS.010.007` Tranh chấp quyền sử dụng đất |
   | Tranh chấp về quyền sở hữu và các quyền khác đối với tài sản | `QHPL_TC_DS.002` (cấp 1, còn 3 con) | `QHPL_TC_DS.002.002` Tranh chấp về quyền sở hữu tài sản |
   | Tranh chấp hợp đồng đặt cọc | *không có lá nào trong `QHPL_TC_DS`* | `QHPL_TC_DS.003.022` Tranh chấp khác |

   Trường hợp cuối không phải thiếu sót của bộ dữ liệu: danh mục dân sự thật sự **không có** lá "đặt
   cọc" (chỉ KDTM có `QHPL_TC_KDTM.011`), dù cổng vẫn phân loại 6 bản án theo nhãn đó.

## Cách chạy

Mặc định `DS_CASE` của luồng dân sự **không đổi** — vẫn 4 case viết tay. 81 case sinh từ bộ bản án
thật chỉ vào danh sách khi bật biến môi trường:

```bash
# một case cụ thể (nên làm trước, mỗi loại đơn một case)
QLA_VU_AN_THUC=bacb-022 npm run ds:vu-an-thuc

# cả bộ 81 case
QLA_VU_AN_THUC=1 npm run ds:vu-an-thuc
```

Vì sao không bật sẵn: một case là 23 bước, khoảng 9 phút. Cả bộ là hàng chục giờ chạy và hàng chục
nghìn dòng ghi lên STG — đó phải là quyết định của người chạy, không phải tác dụng phụ của việc thêm
một tệp dữ liệu.

Mã bản án gõ sai thì **ném lỗi ngay lúc nạp spec**, không im lặng bỏ qua.

## Mức đã kiểm tới đâu

| Việc | Tình trạng |
|---|---|
| 111 bản ghi, mã lá khớp danh mục máy chủ | ✅ script dừng nếu lệch; đã chạy sạch |
| 81 case biên dịch và vào đúng danh sách khi bật cờ | ✅ `playwright test --list` ra đủ 81 |
| Hành vi mặc định (không bật cờ) không đổi | ✅ 0 case sinh thêm |
| Loại đơn **Dân sự** chạy hết 23 bước | ✅ đã có case-ds-002/003/004 xanh 23/23 |
| Loại đơn **Hôn nhân và gia đình** | ⚠ **chưa có lượt chạy nào** |
| Loại đơn **Lao động** | ⚠ **chưa có lượt chạy nào** |

Hai loại đơn cuối đi cùng bộ bước theo đặc tả (Step3–8 sơ thẩm, Step1–4 phúc thẩm; chỉ khác loại đơn
và quan hệ pháp luật), nhưng **chưa có bằng chứng chạy**. Chạy một case của mỗi loại trước khi chạy
cả bộ:

```bash
QLA_VU_AN_THUC=bacb-022 npm run ds:vu-an-thuc   # Hôn nhân và gia đình
QLA_VU_AN_THUC=bacb-030 npm run ds:vu-an-thuc   # Lao động
```

## 30 bản ghi KDTM thì sao

Chưa sinh case. Luồng KDTM là 45 bước và có cụm GĐT/TT, cần hạt giống khác (vai GĐT, Thẩm phán
TANDTC, danh mục theo Vụ) — xem `data/kinh-doanh-thuong-mai/flow-001-st-pt-gdt-bao-cao/cases.ts`.
Dữ liệu đã nằm sẵn trong `DS_BAN_AN_CONG_BO`, lọc bằng `banAnTheoLoaiDon('Kinh doanh, thương mại')`.

## Một phát hiện kèm theo: danh mục KDTM đã đổi ngày 03/10/2026

Trong lúc đối chiếu, hỏi `QTDM.DANHMUC` trên STG thì thấy **mọi dòng** của
`MA_LOAI_DANHMUC='QHPL_TC_KDTM'` đều có `NGAY_SUA = 2026-10-03`:

- thêm nhóm mới `QHPL_TC_KDTM.030` "Tranh chấp hợp đồng thương mại" ở cấp 1;
- **hạ 12 lá hợp đồng xuống làm con của `.030`** và **đổi tên** chúng — `.001` từ
  `Mua bán hàng hoá` thành `Tranh chấp hợp đồng mua bán hàng hóa` (đổi cả `hoá` → `hóa`);
- thêm `.031` (nhượng quyền thương mại), `.032` (hợp đồng khác), `.033` (giữa các thành viên công ty).

Hệ quả: hạt giống KDTM cũ (`tenQhplThongKe: 'Mua bán hàng hoá'`, không khai nhánh cha) **không còn
khớp mục nào** — cây chỉ nạp cấp 1 mà lá giờ ở cấp 2. Đã sửa `case-001/input.ts` của KDTM: đổi tên lá
và thêm `qhplChaThongKe`. **Lượt chạy KDTM tiếp theo sẽ là lượt đầu tiên kiểm lại chỗ sửa này.**
