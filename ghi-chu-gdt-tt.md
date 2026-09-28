# Luồng GĐT/TT: từ đơn đề nghị đến danh sách vụ xét xử

Ghi chú thực chiến trên STG (26–27/09/2026). Nguồn nghiệp vụ: `Luồng nhập data.txt` và
`Playwright nhập data GDT-TT.txt` (Bước 1–18). Spec: `tests/luong-gdt-tt-26-09-2026.spec.ts` +
`common/luong-gdt-tt.ts` + `pages/gdt.page.ts`. Sổ cái:
`seed-output/luong-gdt-tt-26-09-2026.stg.ledger*.json`, khoá = số bản án | ngày bản án | tòa ra bản án.

## Tiến độ (27/09/2026)

22 bản án trong sổ cái. B1–B14 xong hết; **B15 tắc vì lỗi backend** (xem dưới), B16–B18 chưa chạy.

| Bước | Việc | Số vụ xong |
|---|---|---|
| B1–B8 | Nhập đơn → phân công → tờ trình → thông báo (ký logic) | 22 |
| B9–B10 | Giao tiểu hồ sơ sang Vụ GĐKT | 22 |
| B11 | Phân công Thẩm tra viên | 20 |
| B12a | Dự thảo kết quả giải quyết (kháng nghị) | 13 |
| B12b–B13 | Trình / duyệt dự thảo kháng nghị | 21–22 |
| B14 | Hồ sơ kháng nghị: chuyển và nhận | 22 |
| **B15** | Thụ lý vụ GĐT → danh sách vụ xét xử → lấy số → trình ký | **0** |
| B16–B18 | Duyệt chương trình làm việc, biểu mẫu HĐXX, ký | 0 |

## B15 tắc: lỗi ở truy vấn `findByPhanCongXetXuByIdVuAn`

Bước 15 của cả hai tài liệu (thụ lý → tạo danh sách vụ xét xử → chọn Hội đồng toàn thể → chọn lịch →
Lưu → Danh sách tham mưu → Lấy số → Trình ký) dừng ở nút Lưu với thông báo:

> Vụ án chưa xác định thẩm phán chủ tọa, không thể trình ký

**Không phải thiếu bước phân công, cũng không phải lỗi automation — là lỗi ở câu truy vấn backend.**
(Hai kết luận trước của tôi — "thiếu bước phân công chủ tọa", rồi "thiếu bước chuyển đơn sang vụ xét xử" —
đều sai; ghi lại để không ai đi lại đường đó.)

Chuỗi phụ thuộc:

1. `ModalTaoDSVuXetXu#handleLuu` chặn ngay đầu hàm khi `nhomChuToaChinh` rỗng — thoát **trước** khi gọi
   API, nên không có gì được lưu.
2. `nhomChuToaChinh` gom từ `thamPhanChuToaHoTen`, map từ `record.tenTP`.
3. `tenTP` do `DanhSachXetXuServiceImpl` lấy từ `phanCongService.phanCongVuXetXu(va.getId())`, trong đó
   `va` là **vụ XÉT XỬ** (`GIAI_DOAN = 2`).
4. `PhanCongServiceImpl#phanCongVuXetXu` trả `List.of()` ngay nếu
   `PhanCongRepository#findByPhanCongXetXuByIdVuAn` không trả về gì.

Câu truy vấn đó (`PhanCongRepository`, khoảng dòng 666–698):

    from PhanCong pc
      join Don d on d.idVuAn = pc.idVuAn        <- đơn nối PHAN_CONG qua ID_VUAN
         and d.isDonChinh = true
    where d.idVuGiaiQuyet = :idVuAn             <- nhưng tham số lại so với ID_VU_GIAIQUYET
      and pc.vaiTro = THAM_TRA_VIEN
      and pc.trangThai = DA_DUYET
      and pc.giaiDoanVuAn = GIAM_DOC_THAM

Điều kiện `where` đòi đơn **vừa** thuộc vụ xét xử (qua `ID_VUAN`) **vừa** có `ID_VU_GIAIQUYET` bằng đúng
id vụ xét xử đó. Dữ liệu thật không như vậy: `ID_VU_GIAIQUYET` trỏ vào **vụ giải quyết đơn**
(`GIAI_DOAN = 3`) hoặc để NULL.

Kiểm chứng trên STG — vụ xét xử `VA26-003259`:

| Dữ liệu | Giá trị | Điều kiện |
|---|---|---|
| `PHAN_CONG` TTV Võ Thị Thùy Giang | `TRANG_THAI=2` (Đã duyệt), `GIAI_DOAN_VU_AN=2`, `ID_VUAN` = vụ xét xử | thoả cả 3 |
| `DON` 8630 `ID_VUAN` | VA26-003259 (giai đoạn 2) | khớp `d.idVuAn = pc.idVuAn` |
| `DON` 8630 `ID_VU_GIAIQUYET` | **NULL** | `where` không bao giờ khớp |

Tức vụ **đã phân công đầy đủ** mà vẫn báo "chưa xác định thẩm phán chủ tọa". Log console của FE khớp:
`thamPhanChuToaHoTen: null`, `nhomChuToaChinh: "__CHUA_CO__"`, `biChanTrinhKy: true`.

Toàn DB chỉ có **17 đơn** mà `ID_VU_GIAIQUYET` tình cờ trỏ vào một vụ `GIAI_DOAN = 2` — dữ liệu cũ bất
thường — và cả 17 vụ ấy lại **không** có `PHAN_CONG` TTV đã duyệt, nên cũng không vụ nào lập được danh
sách vụ xét xử.

**Đề xuất cho backend (cần xác nhận):** `where` nên là `d.idVuAn = :idVuAn` cho khớp với id mà
`DanhSachXetXuServiceImpl` truyền vào (id vụ xét xử), thay vì `d.idVuGiaiQuyet`; hoặc nếu chủ ý là truyền
id vụ giải quyết đơn thì sửa ở nơi gọi. Cách nào cũng là **sửa code** — không có thao tác nào trên UI gỡ
được, và **không nên** chữa bằng cách UPDATE `DON.ID_VU_GIAIQUYET` vì cột đó đang mang nghĩa khác.

## Những gì B15 ĐÃ làm được

Thụ lý vụ GĐT **chạy thật và đã ghi DB**: `VA26-004056` có `SO_THULY = 1234567897`,
`NGAY_THULY = 27/09/2026`. Chỉ phần danh sách vụ xét xử là chưa lưu. Chạy lại thì `thuLyVuAnGdt` tự nhận
ra đã thụ lý nên không thụ lý hai lần.

`GdtPage#taoDanhSachVuXetXu` đã được sửa để khi gặp cảnh báo này thì ném lỗi nêu thẳng cả bốn điều kiện
của truy vấn, thay vì chỉ chép lại câu cảnh báo của màn — để người chạy sau không phải truy lại từ đầu.

## Bước thiếu trước đó: 186HC/187HC (đã xử lý)

Xem [ghi-chu-hanh-chinh-so-tham-phuc-tham.md](ghi-chu-hanh-chinh-so-tham-phuc-tham.md) — cùng loại vấn đề
"biểu mẫu có trong code nhưng thiếu danh mục trên môi trường", và cách nạp qua API.

## Bẫy đã gặp ở luồng này

- **B14 · phân quyền**: màn "Hồ sơ kháng nghị đi" lọc theo
  `QuanLyAnPermissionSpecificationFactory#donKetQuaReadPredicate` — cán bộ **không phải lãnh đạo**
  (`CAN_BO.MA_CHUC_VU` không thuộc danh sách chức vụ lãnh đạo) chỉ thấy `DON_KETQUA` **do chính mình tạo**.
  Bản ghi `KHANG_NGHI` lại do người ký quyết định tạo, nên Thư ký viên (chức vụ NULL) thấy danh sách trống
  vĩnh viễn. Đang tạm chạy B14 bằng tài khoản Vụ trưởng, khai ở `taiKhoan.thuKyVuHoSoKhangNghi`.
- **B14 · phân trang**: danh sách hàng trăm hồ sơ → phải nhập ô "Số bản án/quyết định" (`soBAQD` lọc theo
  `DON.SO_BANAN_QD`) rồi Tìm kiếm; tab "đi" không có checkbox, thao tác là icon `swap` trên dòng và chỉ
  hiện khi hồ sơ chưa chuyển; tab "đến" mới có checkbox + nút thanh công cụ.
- **B14 · đính kèm bắt buộc**: popup "Chuyển hồ sơ kháng nghị" bắt bật công tắc đính kèm VÀ chọn ≥1 tài
  liệu; cây hồ sơ trộn thư mục với tài liệu nên tick lần lượt rồi đọc bộ đếm "Đã chọn N tài liệu" của
  chính màn để biết đã chọn được tài liệu thật chưa.
- **B12b · tiểu hồ sơ**: nút "Tiểu hồ sơ" chỉ có với tờ trình (`laToTrinh(record.maBieuMau)`), dự thảo thì
  không — điều kiện theo loại văn bản, không phải theo thời điểm, nên truyền cờ `canTieuHoSo` thay vì dò DOM.
- **Toast hay tắt trước khi đọc được** → kiểm chứng bằng trạng thái thật trên màn (badge "Đã chuyển",
  "Đã duyệt"), không chờ toast.
- Các bẫy antd dùng chung (tên nút có tiền tố icon, đầu khối gập cũng là button, placeholder của Select là
  `<span>`) — xem danh sách đầy đủ trong ghi chú luồng hành chính.

## Cột `DON.ID_VU_GIAIQUYET` được ghi ở bước nào (chạy lẻ từng bước VA024, 27/09/2026)

Câu hỏi đặt ra từ chỗ tắc B15: `where d.idVuGiaiQuyet = :idVuAn` không bao giờ khớp thì cột đó mang giá
trị gì, và ai ghi nó. Đã chạy lại luồng **từ B1** cho một vụ sạch (VA024 · VA26-003617 · bản án 65500626)
trên STG, truy vấn DB sau từng bước.

| Bước Playwright | Ghi được gì vào DB | `DON.ID_VUAN` | `DON.ID_VU_GIAIQUYET` | `IS_DON_CHINH` |
|---|---|---|---|---|
| B1–B2 Nhập đơn | `DON` 9624, `DON_GDT`, `DON_CHUYEN` (THU_LY_MOI) | NULL | NULL | 0 |
| B3 Phân công TP | `DON_PHANCONG` (TPTAND.003, trạng thái 1) | NULL | NULL | 0 |
| B4 Tờ trình MS_02 → trình ký | `VANBAN` MS_02 + `YEUCAU_PHEDUYET` | NULL | NULL | 0 |
| B6–B7a CVP ký logic | thêm chi tiết duyệt cấp Chánh văn phòng | NULL | NULL | 0 |
| **B8–B9 PCA phê duyệt tờ trình** | **tạo vụ `VA26-004357` (GIAI_DOAN = 3)** | NULL | **725da2cb-…** | **1** |
| B5 / B7b Thông báo MS_03 | `VANBAN` MS_03 | NULL | 725da2cb-… | 1 |
| B10 Nhận đơn & TL vụ án | (chỉ đọc) — đơn đã hiện ở tab "Đã có vụ án" | NULL | 725da2cb-… | 1 |

Chuỗi trong backend: `PheDuyetDeXuatServiceImpl#xuLySauKySoMs02SauPheDuyet` (chỉ chạy khi người duyệt là
Chánh án/Phó Chánh án **và** văn bản là MS_02) → `taoVuAnTuDonSauKhiXinYKien` →
`DonService#taoVuAnTuDonNeuDuThongTinBanAn` → `ghepVaoVuAnCuHoacTaoMoiNeuCo` → `taoVuAnTuDon`, nơi có
`don.setIdVuGiaiQuyet(vuAnGiaiQuyet.getId())` + `setIsDonChinh(...)` (`DonServiceImpl:7336`).
Điều kiện `coDuThongTinBanAn` đọc bảng **`DON_GDT`** và đòi đủ `SO_BANAN_QD`, `NGAY_BANAN_QD`,
`MA_TOA_RA_BANAN_QD` — cả hai đơn đối chiếu đều đủ, nên đây không phải chỗ chặn.

**Hai kết luận cho B15:**

1. Cột này **luôn trỏ vào vụ GIẢI QUYẾT ĐƠN (`GIAI_DOAN = 3`)**, không bao giờ trỏ vào vụ xét xử
   (`GIAI_DOAN = 2`). `DanhSachXetXuServiceImpl:196` lại truyền id **vụ xét xử** vào tham số `:idVuAn`,
   nên `where d.idVuGiaiQuyet = :idVuAn` sai về bản chất, không phải sai dữ liệu.
2. Với đơn mà B15 thực sự tra (`LOAI_DON = HO_SO_KHANG_NGHI_GDT`, do
   `DonKetQuaServiceImpl#taoVuXetXuGDT` sinh ra), cột này **NULL theo thiết kế**:
   `taoVuAnTuDonNeuDuThongTinBanAn` mở đầu bằng
   `LoaiDon.HO_SO_KHANG_NGHI_GDT.equals(don.getLoaiDon()) ? isNotBlank(don.getIdVuAn()) : isNotBlank(don.getIdVuGiaiQuyet())`
   — tức loại đơn ấy dùng `ID_VUAN`, không dùng `ID_VU_GIAIQUYET`. Đối chiếu STG: **185/185 đơn**
   `HO_SO_KHANG_NGHI_GDT` có `ID_VU_GIAIQUYET` NULL.

Vậy đề xuất `where pc.idVuAn = :idVuAn` (hoặc `d.idVuAn`) ở mục trên là đúng hướng, và **không có cách
nào nạp dữ liệu để gỡ** — cột NULL là đúng thiết kế của loại đơn đó.

## Bẫy automation: chạy lẻ một bước làm tờ trình rơi vào đơn khác

B3 có dòng đọc lại sổ cái khi chạy `--grep` một bước, **B4 và B5 thì không**:

    maDon = maDon || docDong(b)?.maDon || '';

Thiếu dòng đó, `maDon` là `''`, ô lọc mã đơn để trống và `lapTamTrinhPhanCong('')` lập tờ trình trên
**dòng đầu danh sách** — lần chạy 27/09 đã lập MS_02 số 3123448 trên đơn nháp **9626** (đơn khiếu nại,
không có số bản án) rồi PCA duyệt luôn, khiến hệ thống sinh vụ khiếu nại **VA26-004354**. Playwright vẫn
báo *passed* và sổ cái ghi `khoaToTrinh` của đơn sai — một **false pass** đúng kiểu đã gặp ở S12 hành
chính. Đã thêm fallback + `expect(maDon).toBeTruthy()` vào B4/B5, bỏ dấu `toTrinh`/`thongBao` trong sổ cái
`…ledger.obs024.json`, chạy lại và tờ trình MS_02 `8d2a7047-…` đã gắn đúng đơn 9624.

**Rác còn lại trên STG do lần chạy sai** (do account automation tạo, cần nghiệp vụ xoá, không sửa DB):
đơn nháp 9625 / 9626 / 9627, vụ khiếu nại `VA26-004354`, văn bản MS_02 + MS_13 số 3123448 và MS_03 số
3123449.

## SỬA LẠI KẾT LUẬN B15 (27/09/2026, sau khi có B14b)

Mục "B15 tắc: lỗi ở truy vấn `findByPhanCongXetXuByIdVuAn`" ở trên **SAI**. Thực tế thiếu **B14b**:
Vụ trưởng phải phân công **Thẩm phán TANDTC** rồi lưu tờ trình `MS_02_TC`, lấy số và trình ký; B14c Phó
Chánh án ký logic tờ trình đó. Có hai bước ấy thì nút Lưu của popup "Danh sách vụ xét xử đã chọn" chạy
bình thường. Đã chạy thật: **22/22 lượt B14b + B14c pass** cho 20 vụ (VA028, VA033, VA035, VA054, VA131,
VA132, VA133, VA134, VA135, VA139, VA140 và 9 vụ nhánh A).

**Không được suy luận tiếp từ source `qla/` trong máy**: bảng `DANH_SACH_XETXU`, `DANH_SACH_XETXU_VUAN`,
`DANH_SACH_XETXU_THANHVIEN`, `HOIDONG_XETXU` trên STG đều **0 dòng** trong khi màn Danh sách tham mưu vẫn
liệt kê 43 bản ghi → bản build đang chạy trên STG khác source đang có. Kết luận về câu truy vấn nói trên
cũng rơi vào cái bẫy này.

## B15 tắc thật: CHỈ CÓ MỘT LỊCH XÉT XỬ GĐT CHO CẢ 21 VỤ

`LICH_XET_XU` với `LOAI_NGHIEP_VU = 'HOIDONG_XETXU'` trên STG chỉ có **2 dòng** (25/09 và 26/09 10:31), và
mọi lượt chạy đều chọn cùng một lịch **26/09/2026 11:00 – Phòng xét xử 102**. Chính chốt chặn trong
`GdtPage#taoDanhSachVuXetXu` đã cảnh báo: lưu danh sách lên một lịch **đã có** danh sách thì hệ thống
**THAY** danh sách cũ bằng vụ mới. Nên 20 vụ lần lượt ghi đè nhau trên đúng một lịch.

Hệ quả đo được trên DB:

| Dữ liệu | Số liệu |
|---|---|
| Văn bản `CTLVHDXX` (Chương trình làm việc HĐXX) sinh 27/09 15:26–16:10 | số **33 → 53** (21 văn bản) |
| Trong đó có `YEUCAU_PHEDUYET` (tức đã trình ký) | **0** |
| `CTLVHDXX` đã trình ký trong ngày | **1** — số 32, 14:51, của VA017 |
| `TRANG_THAI_CAP_SO` của 21 văn bản kia | 4 (đã cấp số) nhưng `TRANG_THAI = 0` |

Ở màn Danh sách tham mưu, dòng của các vụ này chỉ còn icon mắt; popup mở ra ở chế độ chỉ đọc với footer
**Đóng / Xem biểu mẫu / Hủy cấp số** — **không có nút Trình ký**, nên `laySoVaTrinhKyThamMuu` hết giờ.
Đã thử vá bằng cách đóng popup còn sót (`GdtPage#dongPopupConMo`) — không giải quyết được, vì popup này do
chính cú bấm icon mắt mở ra.

**Việc cần nghiệp vụ quyết (không tự tạo được):** mỗi vụ GĐT cần **một lịch xét xử riêng** (hoặc xác nhận
một lịch được phép chứa nhiều vụ, và chỉ ra cách thêm vụ vào danh sách đã có thay vì ghi đè). Hiện chỉ có
1 lịch dùng được nên B15 chỉ chạy trọn cho đúng 1 vụ — đó là VA017.

**Rác cần dọn:** 21 văn bản `CTLVHDXX` số 33–53 đã cấp số nhưng chưa trình ký, không gắn được vào lịch nào.
