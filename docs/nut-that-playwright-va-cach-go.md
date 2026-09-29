# Sáu nhóm nút thắt khi chạy Playwright trên QLA — bằng chứng và cách gỡ

Số liệu đo trên đợt seed GĐT/TT 28/09/2026 (20 vụ, 7 luồng song song, 141 lỗi trong
`seed-output/*.tung-buoc.B*.out`):

| Nhóm lỗi | Số | Tỷ lệ |
|---|---|---|
| Không định danh được dòng/vụ/đề xuất trên lưới | 81 | 57% |
| `element(s) not found` — chờ locator không bao giờ khớp | 32 | 23% |
| Timeout click/chờ phần tử — cùng nguyên nhân | 22 | 16% |
| API nghiệp vụ từ chối (lỗi thật) | 4 | 3% |
| Danh mục/cấu hình sai tên | 2 | 1% |

**96% nút thắt quy về một lỗi thiết kế duy nhất** (nhóm 1). Ba nhóm còn lại nhỏ nhưng tốn thời
gian vì khó đọc ra nguyên nhân.

---

## 1. Điều hướng bằng bộ lọc thay vì bằng khóa (96% lỗi)

### Triệu chứng
`Không thấy vụ án 10 ở Quản lý xét xử GĐT` · `Không thấy hội đồng của bản án 5 23/09/2026 … Dòng
đang hiện (0): (trống)` · `Không thấy đề xuất "Tờ trình phân công thẩm phán tối cao" của vụ này` ·
`element(s) not found` · `locator.click: Timeout 30000ms exceeded`.

### Nguyên nhân gốc
Luồng 23 bước được viết theo kiểu: mỗi bước tự mở lại danh sách rồi **lọc để tìm lại vụ của mình**
bằng dữ liệu nghiệp vụ mềm (số bản án, ngày, tòa, tên đương sự). Ba trục đó đều không định danh được:

- **Số bản án** — server lọc `LIKE %x%`. Lọc "3" trả về 34, 377, 23. Dữ liệu thật có số bản án
  1–3 chữ số trùng nhau hàng chục vụ giữa các đợt.
- **Ngày + tòa ra bản án** — nhiều vụ cùng ngày cùng tòa; và trên một số màn hai ô này nối sang
  bảng khác nên vô hiệu.
- **Tên đương sự** — trên các màn giai đoạn 2 thì **không tồn tại** (xem mục 2).

Vụ đã tạo rồi thì **id nằm ngay trên URL chi tiết**, nhưng không được bắt lại và không ghi sổ cái.
Sổ cái chỉ lưu `maDon`, `soThuLy`, `idDon`, `khoaToTrinh`, `khoaThongBao`, `khoaDuThao` —
thiếu hẳn `idVuXetXu` / `maVuXetXu` của vụ giai đoạn 2 do B14 sinh ra.

### Cách gỡ
1. Bước nào tạo thực thể mới thì bắt khóa ngay:
   `const id = new URL(page.url()).searchParams.get('id')` hoặc đọc từ response API, rồi ghi sổ cái.
2. Bước sau `page.goto('vu-an/gdt-tt/quan-ly-vu-xet-xu/chi-tiet?id=' + id)` — bỏ hẳn bước lọc.
3. Chỉ lọc khi thật sự chưa có khóa, và ưu tiên **số thụ lý > mã đơn > mã vụ án**.
4. Luôn `moRongCoTrang(page)` (cỡ trang 100) trước khi khớp dòng — mặc định 10 dòng/trang.
5. Khi khớp số ngắn, bắt buộc regex **đứng riêng**, không khớp chuỗi con. Bản án "45" từng trúng
   dòng có số thụ lý `1234567945` và khiến bước chuyển + nhận hồ sơ kháng nghị **của vụ khác** mà
   vẫn báo pass (27/09/2026, VG20). Đây là loại lỗi nguy hiểm nhất: pass giả, hỏng dữ liệu.

---

## 2. Không nắm mô hình dữ liệu trước khi viết màn hình

Hai sự thật quyết định toàn bộ luồng GĐT mà nhóm test không biết cho tới khi điều tra DB:

### 2a. Đơn chính / đơn phụ
Đơn nhập vào mà trùng (số BA + ngày BA + tòa ra BA) với đơn đã có sẽ thành **đơn phụ**
(`DON.IS_DON_CHINH = 0`). Toàn bộ 10 đơn KDTM đợt 28/09 đều là đơn phụ.

Các màn Quản lý vụ án / Phân công TTV / Phân công HĐXX đều join `... and d.isDonChinh = true`
→ đơn phụ **không bao giờ hiện**. Bốn vụ K01/K02/K04/K08 chết cứng ở B12a vì lý do này.

**Cách gỡ:** thêm "Bước 0" — tra `/qla/quan-ly-don/danh-sach-don?tab=tong-so` theo Số BA/QĐ +
Ngày BA/QĐ + Tòa ra BA/QĐ **trước khi tạo đơn**; đã có đơn chính thì dùng lại, không tạo thêm.

**Nguyên nhân sâu hơn: số bản án đặt là số trần.** Dataset KDTM 28/09 dùng `1`–`10` làm số bản án.
Đo trên STG 30/09/2026:

| Số BA | Ngày | Số đơn cùng (số + ngày + tòa D01.133) | đơn chính |
|---|---|---|---|
| 3 | 24/09/2026 | 5 | 2 |
| 1, 2, 4, 5, 6, 7, 9, 10 | — | 4 mỗi số | 1–2 |
| 8 | 26/09/2026 | 3 | 1 |

Riêng bản án số 3 có 5 đơn, tạo rải rác trong cùng ngày 28/09 (02:25 · 20:07 · 20:59 · 21:23 ·
23:06) — tức **chính các lần chạy lại của Playwright tự sinh ra đơn trùng của nhau**, không phải
chỉ đụng dữ liệu có sẵn.

Cộng thêm việc server lọc `LIKE %x%`: gõ `3` trả về **551 đơn**; `1` khớp chính xác 29 đơn, `2`
khớp 39 đơn. Trên STG hiện có **1.763/2.041 bản án là số trần**.

Số bản án đúng phải là `<số>/<năm>/<ký hiệu>` — `377/2026/KDTM-ST`, `56/2026/KDTM-PT`,
`122/2025/DS-ST`. Chạy end-to-end từ sơ thẩm thì hệ thống tự cấp số đúng dạng lúc "Lấy số"; chỉ
cần bắt lại làm output và ghi sổ cái. Xem quy tắc R1b trong `e2e/CLAUDE.md`.

### 2b. Vụ giai đoạn 2 gần như "vô danh"
B14 không dùng lại đơn đã nhập. Nó sinh **đơn kỹ thuật mới** (`LOAI_DON = HO_SO_KHANG_NGHI_GDT`,
`IS_DON_CHINH = 1`) và neo vụ xét xử giai đoạn 2 vào đơn đó. Đơn kỹ thuật này:

- **có** `SO_BANAN_QD`, `NGAY_BANAN_QD`, `DON_VI_RA_BANAN_QD` đúng;
- **không có** bản ghi `DON_DOITUONG_LIENQUAN` nào;
- có `ID_VU_GIAIQUYET = NULL`.

Vụ giai đoạn 2 cũng có **0 bản ghi `CONNGUOI_VU`** (vụ giai đoạn 3 có 3).

Hệ quả — bộ lọc "Nguyên đơn/Người khiếu nại" trên màn Quản lý xét xử GĐT **luôn trả 0 dòng với mọi
vụ, mọi người dùng**, vì server viết:

```java
// qla/src/main/java/vn/gtel/tatc/qla/service/impl/XetXuGdtServiceImpl.java:1297
spec.exists(VuGiaiQuyetDtlq.class, sub -> sub
    .equal(VuGiaiQuyetDtlq_.idVuGiaiQuyet, Don_.idVuGiaiQuyet)   // = NULL
    .like(VuGiaiQuyetDtlq_.TEN_DOI_TUONG_LIEN_QUAN, p.getNguyenDon()));
```

Đây là **lỗi hệ thống**, không phải lỗi test. Code test lại ưu tiên đúng ô này và bỏ hẳn lọc số
BA/QĐ khi màn có nó → B15/B19/B21/B23 chết hàng loạt.

**Cách gỡ:** trên màn giai đoạn 2, lọc theo **Số BA/QĐ** (server lọc trên `Don.soBanAnQD` của đơn
chính — chạy được), khớp dòng theo số + ngày + tòa, **không** đưa đương sự vào điều kiện.

### 2c. `BAN_AN` là kết quả, không phải điều kiện
Vụ giai đoạn 2 chỉ có bản ghi `BAN_AN` **sau khi B23 lưu kết quả xét xử** (đo: VA26-004811 có
`BAN_AN` tạo 15:59, cùng lúc `VUAN_KETQUA`). Ghi chú cũ trong code — "vụ GĐ2 không có BAN_AN nên
không lọc được số bản án" — là **sai**, và đã kéo cả một nhánh `khongLocSoBanAn` đi sai hướng.

Bài học: comment sai còn hại hơn không comment. Mọi nhận định nguyên nhân phải kèm `SELECT` hoặc
`file:line`.

---

## 3. Sổ cái báo "xong" nhưng DB không có

Đã gặp: B11 ghi xong nhưng `DON_PHANCONG` không có dòng vai trò TTV cho K01/K02/K04/K08;
B19 ghi xong cho D07 nhưng chưa có vụ giai đoạn 2 nào.

Nguyên nhân: bước đánh dấu xong khi "không văng lỗi", trong khi thao tác UI đã trượt âm thầm
(bấm nhầm dòng, popup đóng trước khi lưu, nút "Lưu" không gọi API).

**Cách gỡ:**
- Chỉ đánh dấu xong khi có bằng chứng ghi được: id trả về, dòng DB, hoặc response 2xx của đúng endpoint.
- Có bước đã làm đúng cách này — B23 kiểm "bấm Lưu mà hệ thống không gọi API `/xetxu-gdt/ketqua`"
  rồi mới báo lỗi. Nhân rộng cách đó.
- Báo cáo tiến độ luôn đối chiếu DB (`tools/ket-xuat-db-gdt.js` → `tools/bao-cao-gdt-tt.js`),
  không đọc sổ cái.

---

## 4. Chạy song song nhiều thư mục

Bảy bản sao `toa-an-chay-rieng-a…g`, mỗi bản có sổ cái riêng → phân mảnh; hai luồng từng chạy cùng
một vụ và tranh trạng thái; `globalTeardown` của luồng cũ dùng bản `tools/bao-cao-gdt-tt.js` cũ và
**ghi đè báo cáo vừa dựng**.

**Cách gỡ:**
- Phân hoạch: một vụ đúng một luồng.
- `node tools/dong-bo-so-cai-cac-luong.js <bộ> <env>` trước và sau mỗi đợt.
- Sửa tool/page object trong `e2e` gốc thì sync sang **tất cả** thư mục chạy riêng trước khi chạy.
- Kiểm `Get-Process node` trước khi sync — không ghi đè khi đang có luồng chạy.

---

## 5. Bẫy giao diện antd lặp lại

| Bẫy | Hậu quả | Cách xử lý |
|---|---|---|
| Cỡ trang mặc định 10 | khớp dòng trượt âm thầm | `moRongCoTrang(page)` trước khi khớp |
| "Tìm kiếm nâng cao" đổi form | ô "Số BA/QĐ" biến mất, bộ lọc nối sang bảng khác → rỗng | không bật trừ khi biết form đổi gì |
| `chonSelect` chờ `getAttribute` | treo 30 s rồi báo timeout vô nghĩa | throw ngay, in danh sách lựa chọn đang có |
| Trường phụ thuộc | chọn Nguyên nhân trước thì bị Kết quả reset | chọn **Kết quả GĐT,TT trước, Nguyên nhân sau** |
| Hộp xác nhận nhiều nhãn | click trượt, bước không lưu | regex `Đồng ý\|Xác nhận\|OK\|Chuyển hồ sơ` |
| Lưới ảo, RangePicker hai ô, `.ant-select-clear` | điền sai ô | dùng helper sẵn trong `common/antd.ts` |

Lỗi cấu hình cùng loại: `nguoiNhanTieuHoSoDanSu = "Phạm Minh Tùng"` không có trong danh mục Giao
tiểu hồ sơ. Vì `chonSelect` in ra danh sách thật (`Phạm Tiến Thành | Trần Phương Nguyên | …`) nên
sửa được trong một lượt — đó là lý do thông báo lỗi phải liệt kê lựa chọn hiện có.

---

## 6. Lỗi hệ thống thật — phải báo, không vá vòng

Chỉ 3% số lỗi, nhưng nếu không tách ra sẽ mất hàng giờ vá test cho một thứ test không chữa được.

- `ORA-12899`: `HOSO_KHANGNGHI_DEN.LOAI_AN VARCHAR2(20)` nhỏ hơn enum `KINH_DOANH_THUONG_MAI`
  (21 ký tự) → B14 chết với mọi vụ KDTM. Đã sửa cột thành `VARCHAR2(100)`.
- Bộ lọc "Nguyên đơn/Người khiếu nại" màn Quản lý xét xử GĐT luôn 0 dòng (mục 2b).
- Vụ giai đoạn 2 không sao chép đương sự từ vụ giai đoạn 3 → lưới không in được tên đương sự.
- `Thẩm quyền giải quyết của đơn không khớp với thẩm quyền của vụ án` khi duyệt tờ trình (B9).

**Cách làm:** dừng, thu thập bằng chứng (SELECT + `file:line` + URL tái hiện), báo user, ghi vào
báo cáo ở cột riêng. Không thêm retry/fallback để "đi qua" lỗi hệ thống.

---

## Phụ lục — thứ tự điều tra chuẩn khi một bước fail

1. Đọc `seed-output/<file>.<socai>.<Bxx>.out` (mọi thư mục chạy riêng). Không chạy lại để xem lỗi.
2. `SELECT` trạng thái thật: vụ có chưa, số thụ lý có chưa, `PHAN_CONG` / `DON_PHANCONG` có dòng chưa.
3. Mở API của màn trong `qla/.../service/impl/` + cột lưới trong `qla-webapp/src/pages/…/columns.tsx`.
4. Phân loại lỗi test / lỗi data / lỗi hệ thống.
5. Sửa, sync sang các thư mục chạy riêng, rồi mới chạy lại đúng bước đó.
