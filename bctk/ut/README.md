# UT Báo cáo thống kê — đối soát MAPPING ↔ MÀN HÌNH

## Câu hỏi mà bộ UT này trả lời

Với **từng ô** của biểu mẫu báo cáo thống kê:

> Thứ mà mapping nói ô này cần — **đã có trên màn hình chưa?**

Chốt 14/10/2026 (người dùng): **không kiểm bằng SQL.** SQL trong `Mapping_<mã>.xlsx` chỉ để biết ô
đó cần dữ liệu gì; việc kiểm phải lên màn thao tác. Nên mỗi UT mang theo **thứ phải đi tìm trên
màn** (mã biểu mẫu, nhóm danh mục, trường nhập), không mang câu truy vấn.

Khác `flows/bao-cao-thong-ke/flow-001-lap-bao-cao` (kiểm chức năng màn lập báo cáo: giao diện, bộ
lọc, kết xuất, phân quyền). Bộ UT ở đây kiểm **điều kiện cần**: dữ liệu nuôi ô đó có chỗ trên hệ
thống hay không. Thiếu một mã biểu mẫu thì ô tương ứng **không bao giờ** có số, dù màn báo cáo chạy
tốt.

## Phạm vi đợt này — 6 biểu mẫu, 284 ô

2A, 2B (dân sự ST/PT) và 4A, 4B, 4C, 4D (KDTM ST/PT/GĐT/TT) — đúng 6 biểu mẫu mà
`npm run bctk:do-phu` báo **đã có số liệu**, nên UT có đối tượng thật để so.

| Loại UT | Số ô | Kiểm trên màn bằng cách nào | Chạy được chưa |
|---|---:|---|---|
| mã biểu mẫu | 150 | tìm mã trên **Cấu hình · Quản lý biểu mẫu** (`/qla/cau-hinh/bieu-mau`) | **đã chạy** — 27/28 có |
| nhóm danh mục | 6 | ô "Quan hệ pháp luật (Thống kê)" của wizard **Thêm mới đơn khởi kiện và yêu cầu** | **đã chạy** — 4/4 có |
| cột phép tính | 87 | cộng/trừ các ô khác **trên chính biểu mẫu báo cáo** | chưa — xem "Chặn" |
| trường trên màn | 39 | tìm nhãn trường trên màn nghiệp vụ | chưa — phải khai neo (34 cột DB) |
| mapping chưa chốt | 2 | — | không: mapping chưa chốt gì để kiểm |

## Chặn

1. **Cột phép tính (87 ô) cần màn LẬP báo cáo có tham số kỳ + đơn vị.** Môi trường hiện chỉ có
   dashboard `/qla/bctk/{ds,hs,gdttt}`: không ô lọc, không nút lập báo cáo, số liệu tổng hợp toàn cơ
   quan (đo 03/10/2026 — `docs/flow-kdtm-gdt-tt.md` · điểm 13). Có màn thật thì bỏ `fixme` ở cụm D
   của spec.
2. **34 cột DB chưa có neo.** Mapping nói `VUAN.THOIHAN_XETXU`, màn nói "Thời hạn xét xử" — không có
   phép biến đổi tự động nào đúng. Khai vào `neo.ts` · `NEO_COT_DB`, **kèm `bangChung`**.

Chưa khai neo thì UT đánh `fixme` kèm lý do — **không khớp mờ theo từ khoá để có màu xanh**
(CLAUDE.md · R0, R4).

## Tệp

```
bctk/ut/
├─ README.md       tệp này
├─ loai.ts         kiểu dữ liệu (viết tay)
├─ neo.ts          KHAI TAY: chỗ đi tìm trên màn + bằng chứng
├─ 2A.ts … 4D.ts   SINH TỰ ĐỘNG từ mapping — đừng sửa tay
└─ chi-muc.ts      SINH TỰ ĐỘNG: gom 6 bộ + bảng tra "thứ cần → ô báo cáo phụ thuộc"

tools/bctk/
├─ doc-xlsx-lib.js   đọc xlsx không cần thư viện (đọc ĐÚNG ô rỗng tự đóng — xem dưới)
├─ boc-mapping.js    Mapping_<mã>.xlsx → tools/bctk/mapping/<mã>.json + .tsv
├─ phan-loai-ut.js   mỗi cột mapping → loại UT + thứ phải tìm trên màn
├─ sinh-ut.js        json → bctk/ut/*.ts
└─ ut-do-phu.mjs     độ phủ + danh sách thứ ĐANG THIẾU trên màn

tests/bao-cao-thong-ke/ut-mapping-man-hinh.spec.ts   UT chạy trên màn (chỉ đọc, không ghi)
state/bao-cao-thong-ke/ut-mapping/<env>.ndjson       kết quả từng lượt chạy (không commit)
```

Tệp `Mapping_<mã>.xlsx` **không** nằm trong repo (repo public — xem `bctk/README.md`); chỉ bản bóc
`tools/bctk/mapping/*` là vào repo. Bóc lại khi BA gửi bản mới:

```bash
npm run bctk:boc-mapping -- "<thư mục Mapping Data>" 2A 2B 4A 4B 4C 4D
npm run bctk:sinh-ut -- 2A 2B 4A 4B 4C 4D
npm run bctk:ut-do-phu -- --cong     # cổng: bắt khai sai ngay trong dữ liệu
```

## Chạy UT

```bash
# PHẢI đặt môi trường: `npx playwright test` trần nạp .env (dev) → màn rỗng, dễ kết luận sai
QLA_HO_SO_ENV=staging npx playwright test tests/bao-cao-thong-ke/ut-mapping-man-hinh.spec.ts
QLA_HO_SO_ENV=staging npx playwright test tests/bao-cao-thong-ke -g "mã biểu mẫu"   # chỉ cụm A
QLA_VAI=chanhAnDanSu  # đổi vai (mặc định chanhAn)

npm run bctk:ut-do-phu              # tổng hợp
npm run bctk:ut-do-phu -- --thieu   # chỉ in thứ ĐANG THIẾU trên màn + ô báo cáo bị hỏng theo
npm run bctk:ut-do-phu -- --md      # bảng Markdown
```

UT **đỏ nghĩa là có phát hiện**: thứ đó không có trên màn ⇒ các ô báo cáo phụ thuộc nó sẽ trống.
Thông báo lỗi luôn kèm danh sách ô bị ảnh hưởng (`2A cột 8,9 · 4B cột 12`).

Ba trạng thái ghi vào tệp kết quả, đừng gộp:

| | nghĩa |
|---|---|
| `CO` | tìm thấy trên màn |
| `KHONG_CO` | màn mở được, đã tìm, **không có** → phát hiện thật |
| `CHUA_KIEM` | chưa kiểm được (ô không hiện, vai không mở được màn…) → **không** phải kết luận "không có" |

## Kết quả lượt chạy đầu — STG, 14/10/2026, vai `chanhAn`

Đọc được **1.133 mã** biểu mẫu trên màn (1.152 dòng). Cụm mã biểu mẫu: **27/28 CÓ**, một mã KHÔNG CÓ:

| Mã | Ô báo cáo hỏng theo | Ứng viên gần nhất trên màn |
|---|---|---|
| `RKN` | 2B cột 43 · 4B cột 43 — "Số vụ, việc Viện kiểm sát rút kháng nghị nhưng đương sự không rút kháng cáo" | `PSTBVVRKN` (phá sản), `KNTT_TBRUT` — **không** phải mã cho DS/KDTM |

Mapping ghi nguyên văn `VANBAN.MA_BIEUMAU IN ('RKN')`, nên đây **không** phải lỗi bóc. Hai đường xử
lý, cần BA/dev chốt: (a) mapping ghi sai mã, phải sửa thành mã thật của "Quyết định/Thông báo rút
kháng nghị" dân sự; hoặc (b) biểu mẫu đó chưa đăng ký, phải thêm. Thuộc nhóm 3 của CLAUDE.md · R6
(lỗi ngoài test) — **không vá vòng trong UT**.

Danh mục mã đọc được lưu ở `state/bao-cao-thong-ke/ut-mapping/ma-bieu-mau-tren-man.<env>.txt`
(spec `ut-do-ma-gan-giong.spec.ts`), để tra ứng viên thay thế mà không phải chạy lại 2 phút/lượt.

Cụm nhóm danh mục: **4/4 CÓ**. Tổ hợp mở ra từng nhóm (đã khai vào `neo.ts`, đo trên STG):

| Nhóm | Loại đơn × Phân loại đơn | Nhánh cấp 1 |
|---|---|---:|
| `QHPL_TC_DS` | Dân sự × Đơn khởi kiện | 10 |
| `QHPL_YC_DS` | Dân sự × Đơn yêu cầu | 5 |
| `QHPL_TC_KDTM` | Kinh doanh, thương mại × Đơn khởi kiện | 6 |
| `QHPL_YC_KDTM` | Kinh doanh, thương mại × Đơn yêu cầu | 5 |

Nhóm danh mục là **trục dòng** của cột 1 (2A, 2B dùng hai nhóm DS; 4A–4D dùng hai nhóm KDTM), nên
thiếu một nhóm là mất hẳn một mục của biểu mẫu — không phải mất một ô.

## Hai bẫy của màn Quản lý biểu mẫu (đo trên STG 14/10/2026)

1. **Ô "Mã biểu mẫu" của Tìm kiếm nâng cao KHÔNG đáng tin để chứng minh "không có".** Tra `20VDS` ra
   **0 dòng** trong khi `20VDS` CÓ thật trong danh mục đọc thẳng từ lưới; `DS1` ra 0 dòng dù `DS17`
   có. Lượt chạy đầu vì thế báo sai 4/28 mã là thiếu. UT hiện **đọc cả danh mục một lượt rồi so
   trong mã nguồn test** — đúng hơn và nhanh hơn (một lượt cho cả 28 mã).
2. **Lưới có cột `STT` đứng trước**, nên `td[1]` là *Tên biểu mẫu*, không phải mã — dù khai báo
   `columns` trong `qla-webapp/src/pages/QuanLyBieuMau/index.tsx:233-245` xếp Tên trước Mã. Phải tra
   chỉ số cột theo TIÊU ĐỀ: đọc nhầm cột cho ra "997 mã" mà toàn là tên, và kết luận "không có mã nào
   gần giống" khi đó là vô giá trị.
3. Nút của antd mang cả chữ của icon: nút thật tên **"search Tìm kiếm"**, **"up Thu gọn"** →
   `getByRole('button', { name: 'Tìm kiếm', exact: true })` chờ hết 30 s rồi hỏng. Khớp bằng regex
   neo cuối (`/Tìm kiếm$/`) để không trúng "Tìm kiếm nâng cao".
4. Cụm UT **không** dùng `mode: 'serial'`: ở đây "đỏ" chính là kết quả cần biết, mà serial bỏ qua
   mọi test sau cái đỏ đầu tiên (lượt chạy đầu: mã `058` đỏ → 27 UT "did not run").

## Bẫy của ô "Quan hệ pháp luật (Thống kê)" (đo 14/10/2026)

1. **"Cây rỗng" thường là "dropdown chưa mở".** Click ngay sau `chonSelect` rơi vào lúc dropdown của
   ô trước đang đóng → ô QHPL không mở → đọc 0 nhánh. Hai lần suýt thành kết luận sai
   (`QHPL_TC_KDTM`, `QHPL_YC_KDTM`). Cách đúng: `Escape` → click → **chờ dropdown của chính ô này**,
   lặp tối đa 3 lần; không mở được thì ghi `CHUA_KIEM`, **không** ghi `KHONG_CO`.
2. **Danh mục phụ thuộc HAI ô**: `#loaiDon` (loại án) và `#phanLoai` (Đơn khởi kiện / Đơn yêu cầu).
   Chưa chọn đủ thì cây rỗng thật — nên neo phải mang cả tổ hợp, không chỉ tên màn.
3. **Vào wizard bằng NÚT trên màn danh sách** `quan-ly-don/don-khoi-kien-va-yeu-cau/danh-sach?tab=ALL`;
   `page.goto` thẳng route wizard trả vỏ rỗng (`pages/them-moi-don.page.ts:1253`). Lưu ý route
   `quan-ly-don/them-moi` là màn **Đơn đề nghị GĐT/TT**, không có ô này.
4. Mở wizard làm hệ thống **cấp sẵn "Số tiếp nhận"** (đo: 99). UT không bấm Lưu nên không tạo đơn,
   nhưng đừng coi việc mở form là hoàn toàn không tác dụng phụ.

## Bẫy đã gặp khi bóc mapping (14/10/2026)

1. **`tools/bctk/doc-xlsx.js` đọc LỆCH CỘT.** Regex của nó không khớp ô rỗng tự đóng
   (`<c r="C3" s="18"/>`) nên nhãn cột trượt sang ô sau, in ra chỉ số sharedString thô (những số
   `15`, `59`, `61` vô nghĩa). Bóc mapping bằng nó là sai hết → dùng `doc-xlsx-lib.js`.
2. **Tiêu đề cột không thống nhất giữa các nhóm án**: 2A dùng `CỘT`, 2B/4C `Cột`, 4A/4B `STT`, nhóm
   khác `Cột BC`; "Bảng chính" ↔ "Bảng dữ liệu chính"; "Trường / Phép tính" ↔ "Trường / Cột cần lấy".
   Vì vậy khớp tiêu đề bằng regex, không bằng chỉ số cột.
3. **Tên cột báo cáo trải nhiều ô** (B = nhóm, C/D/E = mức con) và **một cột báo cáo trải nhiều dòng
   Excel** (dòng sau không có số cột) → phải ghép, nếu không mất mức con và mất bộ lọc riêng.
4. **`QTDM.DANHMUC` không phải `BẢNG.CỘT`** mà là `SCHEMA.BẢNG`; `36-GDTHS.TC01-2026` là một mã, dấu
   `.` ở giữa không phải phân cách bảng/cột. Không lọc hai dạng này thì UT đi tìm trường tên
   "DANHMUC".
5. **4C và 4D không có cột "Mockup/ Màn hình"** (BA để trống cả sheet) → 78 ô của hai biểu mẫu này
   không có gợi ý màn nào; phải suy từ luồng nghiệp vụ khi khai neo.
6. **Mã biểu mẫu trong mapping có cả dạng không nháy** (`19VDS` trong `IN ('45DS','46DS',19VDS)`) và
   ô viết lỗi (`IN ('45DS', , '46DS')`) → bộ bóc nhận cả hai, bỏ mã rỗng.
