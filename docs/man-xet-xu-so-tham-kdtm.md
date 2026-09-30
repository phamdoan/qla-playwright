# Màn chi tiết vụ án sơ thẩm KDTM — đo thật trên STG

Đo ngày **30/09/2026** trên STG, route `vu-an/dan-su/so-tham/chi-tiet?id=<id>&tab=thong-tin-chung`.
Công cụ đo: `tests/kinh-doanh-thuong-mai/do-tab-xet-xu.spec.ts` (đặt `QLA_ID`, `QLA_VAI`).

## Ba cái bẫy đã làm tôi kết luận sai — đọc trước khi tin bất kỳ phép đo nào

1. **Sai môi trường.** Gọi thẳng `npx playwright test` nạp `.env` (dev), không phải `.env.staging`.
   Trang vẫn mở, đủ tab, nhưng **mọi danh sách rỗng và nút bị khoá** → rất dễ kết luận "màn không
   có chức năng đó". Phải đặt `QLA_HO_SO_ENV=staging`, và đọc dòng log `injected env … from …`.
2. **`moTab` bấm nhầm tab.** Màn có cả "Chuẩn bị xét xử" và "Xét xử"; khớp chuỗi con rồi `.first()`
   thì `moTab(page,'Xét xử')` luôn bấm "Chuẩn bị xét xử". Nội dung vẫn đổi nên nhìn như chạy đúng.
   Đã sửa: ưu tiên khớp TÊN CHÍNH XÁC, và phải **chờ dải tab render xong rồi mới chọn ứng viên**.
3. **Sai vai.** Chạy bằng `chanhAn` (Chánh án TANDTC) cho ra một màn KHÁC hẳn tài khoản Tòa sơ thẩm
   mà tài liệu chỉ định. Xem mục "Vai" bên dưới.

## Vai: phải dùng đúng tài khoản Tòa sơ thẩm

`StepData_KinhDoanhThuongMai_VuAn.txt` b1 chỉ định tài khoản Tòa án cấp sơ thẩm — trong
`config/tai-khoan.local.json` chính là vai **`chanhAnDanSu`** (Tòa án nhân dân khu vực 9 - Hà Nội).
Tài khoản phúc thẩm là `chanhAnPhucThamHanhChinh` (ông Nguyễn Xuân Kỳ).

Khác biệt giữa hai vai — đo trên cùng một nghiệp vụ:

| | `chanhAn` (TANDTC) | `chanhAnDanSu` (Tòa khu vực 9) |
|---|---|---|
| Nút ký trên biểu mẫu | chỉ **"Trình ký"** → quyết định treo "Chờ ký" | **"Ký logic"** → "Đã ban hành" |
| Nút "Phân công" | mở thẳng một modal 10-VDS | mở **menu 3 quyết định** PC-001 · PC-002 · PC-004 (đúng tài liệu) |
| Hội thẩm nhân dân trong danh mục | chỉ 01 người | đủ 02 người |
| Danh mục "Địa điểm xét xử" của lịch | Phòng xét xử 102 (PXX102), Phòng xử lưu động… | **chỉ một mục tên "X"** |

Ghi chú cũ "nút Phân công mở thẳng modal — KHÁC TÀI LIỆU" và "48-DS/51-DS không có trên màn KDTM"
đều **sai**, đều do đo bằng vai `chanhAn`.

## Tab "Xét xử" — hai khối KHÔNG phải ant-card

Ngoài các khối `.ant-collapse-item`/`.ant-card` thường gặp, tab này còn hai khối đánh số ①②
**không dùng hai lớp CSS đó**, nên `khoiTheoTieuDe` không tìm ra. Phải neo theo TIÊU ĐỀ + NÚT
(`khoiTheoTieuDeVaNut` trong `xet-xu.flow.ts`):

- ① **Bản án sơ thẩm** — nút "+ Tạo bản án"; mỗi vụ tối đa 01 bản án sơ thẩm
- ② **Quyết định của Hội đồng xét xử** — nút "+ Thêm mới quyết định"

Ô chọn loại của ② **đã điền sẵn** "Biên bản phiên tòa sơ thẩm (48-DS)", nên bộ lọc theo chữ
"Chọn loại biểu mẫu" trượt qua nó.

Danh mục của ② nở dần theo trạng thái:

| Thời điểm | Danh mục |
|---|---|
| chưa có 48-DS | 48-DS · Quyết định buộc rời khỏi phòng xử án |
| 48-DS đã "Hoàn thành" | thêm 39-DS · 49-DS · 50-DS |

**Chưa lần nào thấy "Biên bản nghị án (51-DS)"** dù StepData Step6.3 yêu cầu.

## Hai kiểu ký — phải phân biệt

| Kiểu | Nút | Ghi chú |
|---|---|---|
| Quyết định ký số | **Ký logic** | toast "Ký logic thành công" |
| Biên bản ký giấy (48-DS) | **Xác nhận đã ký** | KHOÁ tới khi tải bản scan PDF; toast "Đã xác nhận biên bản đã ký" (không có chữ "thành công") |
| Khi tài khoản không phải người ký | **Trình ký** | mở hộp "Nhập thông tin trình duyệt ký" → điền nội dung → "Gửi" → trạng thái "Chờ ký", nút đổi thành "Đã trình ký / Thu hồi" |

47-DS ghi rõ trên màn: *"do Thẩm phán được phân công giải quyết vụ án ký"*. Vì vậy **Thẩm phán chủ
tọa phải là chính tài khoản đang chạy**, nếu không sẽ chỉ trình ký được và luồng tắc ở bước 12.

## Điều kiện mở bước 12 (bản án 52-DS)

Khối "Lịch sử mở phiên tòa" đếm **Số lần mở phiên tòa**; khi còn `0` thì "Kết quả xét xử" là
"Chưa có kết quả" và nút **"Tạo bản án" bị khoá**. Lập xong 48-DS ("Hoàn thành") vẫn chưa đủ —
cần 47-DS **có hiệu lực**, không phải chỉ "Chờ ký".

## Bước 15 — chuyển hồ sơ lên phúc thẩm (ĐÃ THÔNG)

Chốt ngày 30/09/2026 với vụ `VA26-004979`:

- Đường dẫn thật: **`vu-an/dan-su/so-tham/ho-so-chuyen-di`** (tài liệu ghi
  `quan-ly-so-tham/dan-su/chuyen-di-phuc-tham` → "Không tìm thấy trang").
  Vụ KDTM dùng chung màn của nhánh Dân sự; nhánh "Kinh doanh và thương mại" không có mục này.
- **Điều kiện để vụ vào tab "Chưa chuyển": thông báo kháng cáo 62-DS phải ĐÃ BAN HÀNH.**
  62-DS treo "Chờ ký" thì vụ không xuất hiện ở bất kỳ tab nào của màn chuyển đi — kể cả "Tất cả".
  Mà 62-DS chỉ ban hành được khi "Người ký ban hành" là chính tài khoản đang chạy.
- Nút là `Chuyển vụ án (n)` — có icon và SỐ DÒNG ĐANG CHỌN; `(0)` nghĩa là chưa tick được.
- Bấm xong hiện **modal thường** (không phải `ant-modal-confirm`):
  *"Chuyển vụ án — Xác nhận chuyển 1 vụ án tới tòa án nhận?"* với nút **[Hủy] [Chuyển]**.
  Không bấm "Chuyển" thì vụ đứng yên, không toast, không lỗi.
- Xong: vụ sang tab **"Chờ tiếp nhận"**, đơn vị nhận **Tòa án nhân dân thành phố Hà Nội**.

### Nhật ký loại trừ (giữ lại vì dễ đi vào lại vết xe đổ)

Đo 30/09/2026 với vụ `VA26-004950`, vai `chanhAnDanSu`:

| Đã thử | Kết quả |
|---|---|
| `quan-ly-so-tham/dan-su/chuyen-di-phuc-tham` (StepData 8.1 ghi) | "Rất tiếc! Không tìm thấy trang!" |
| menu Dân sự › Quản lý sơ thẩm › Hồ sơ vụ án chuyển đi → `vu-an/dan-su/so-tham/ho-so-chuyen-di` | mở đúng màn (tab *Tất cả (97) · Chưa chuyển (4) · Chờ tiếp nhận (3) · Đã được tiếp nhận (90)*) nhưng **không có vụ KDTM**, tra cả tab "Tất cả" cũng không thấy |
| `vu-an/kinh-doanh-thuong-mai/so-tham/ho-so-chuyen-di` | HTTP 200 nhưng không có tab "Chưa chuyển" |
| nhánh menu "Kinh doanh và thương mại" | chỉ có **Quản lý sơ thẩm** (`vu-an/kinh-doanh-thuong-mai/so-tham/danh-sach`) và **Quản lý phúc thẩm** — không có mục "Hồ sơ vụ án chuyển đi" |

Trạng thái vụ lúc đó: bản án `297/2026/DS-ST` đã ban hành; đơn kháng cáo đã lập, có 55-DS
`5255114/2026`, dòng kháng cáo ghi **"Chờ xử lý"**; thông báo 62-DS `5255115/2026` ở **"Chờ ký"**.

Hai khả năng còn lại, chưa phân định được: (a) phải xử lý đơn kháng cáo / ban hành 62-DS thì vụ
mới vào danh sách chuyển đi; (b) vụ KDTM chuyển hồ sơ ở một màn khác chưa tìm ra.

## Các tab khác

| Tab | Khối chính |
|---|---|
| Thông tin chung | người tham gia tố tụng · lịch sử địa vị tố tụng · thông báo & quyết định liên quan · danh sách đơn · tạm ứng án phí · tài sản |
| Thụ lý | thông tin thụ lý · thông báo thụ lý — số ghi GỘP: `65501315/2026/TLST-KDTM ngày 30/09/2026` |
| Phân công | quyết định phân công · người tiến hành tố tụng |
| Chuẩn bị xét xử | kết quả phiên họp hòa giải · Danh sách quyết định · BPKCTT · nhập/tách vụ án |
| Quản lý án | hiệu lực bản án · phân bổ án phí · **kháng cáo** · kháng nghị · thông báo kháng cáo/kháng nghị (7 mẫu: 56-DS · 57-DS · 58-DS · 61-DS · **62-DS** · 63-DS · 64-DS) · khiếu nại · sửa chữa bổ sung · công bố bản án |
| Tài liệu, chứng cứ | (không có khối dạng card) |
| Theo dõi tống đạt | tống đạt điện tử · trực tiếp · niêm yết · phương tiện thông tin đại chúng |
| Báo cáo | báo cáo tiến độ giải quyết |

Bước 13 (kháng cáo) và 14 (62-DS) có đủ chỗ ở tab "Quản lý án".
