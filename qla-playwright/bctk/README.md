# Chuẩn thư mục để gieo dữ liệu Báo cáo thống kê

## Vấn đề mà chuẩn này giải

Có 13 đặc tả trong `docs/stepdata/` và 81 biểu mẫu báo cáo thống kê. Trước đây không có chỗ nào trả
lời được hai câu hỏi cơ bản:

1. **Chạy luồng nào thì có số liệu cho biểu mẫu nào?**
2. **Luồng chạy xanh rồi, số liệu đã vào báo cáo chưa?**

Câu 2 mới là câu nguy hiểm. Một case xanh hết bước mà vụ **chưa lên "Kết quả giải quyết"** thì báo
cáo thống kê **không đếm được** — vụ chỉ nằm ở nhóm "Phải giải quyết", không vào "Đã giải quyết", và
không có ô nào trong nhóm "Kết quả xét xử". Xanh mà vô dụng.

Nên chuẩn này đặt **"Kết quả giải quyết" làm chốt**, không phải "hết bước".

## Bốn nhóm chỉ tiêu mà mọi biểu mẫu vụ/việc đều có

Đọc từ sheet `Gộp` của `80 báo cáo.xlsx` (tài liệu của BA):

| Nhóm | Ví dụ chỉ tiêu | Luồng phải làm gì |
|---|---|---|
| Phải giải quyết | Mới thụ lý · Cũ còn lại · Chuyển vụ án | Thụ lý là đủ |
| Đã giải quyết | Đã xét xử · Đình chỉ · Xét xử kháng cáo | **phải có "Kết quả giải quyết"** |
| Còn lại chưa giải quyết | Tạm đình chỉ · Quá hạn chủ quan/khách quan | nhánh rẽ riêng |
| Kết quả xét xử | Giữ nguyên · Sửa · Hủy để xét xử lại | **phải có "Kết quả giải quyết"** |
| Hình thức xét xử | Án lệ · Trực tuyến · Rút gọn · Phiên tòa rút kinh nghiệm | ô phụ trên màn xét xử |

Luồng chỉ gieo tới "thụ lý" thì chỉ nuôi được cột đầu của biểu mẫu. Muốn có số ở ba nhóm sau thì
phải đi hết tới kết quả — và với các nhóm "Còn lại chưa giải quyết" thì phải chạy **nhánh rẽ**
(tạm đình chỉ, đình chỉ, trả hồ sơ), không phải nhánh chính.

## Hai khuôn luồng, không phải mười ba

Đọc hết 13 đặc tả thì chỉ có **hai khuôn lặp lại**, trùng nhau từng Step:

```
khuôn VỤ ÁN   — 4 đặc tả: DS · HNGĐ · KDTM · LĐ
  sơ thẩm    Step3 Thụ lý → Step4 Phân công → Step5 Chuẩn bị xét xử → Step6 Xét xử
             → Step7 Kháng cáo → Step8 Chuyển hồ sơ lên phúc thẩm
  phúc thẩm  Step1 Thụ lý → Step2 Phân công → Step3 Chuẩn bị xét xử → Step4 Xét xử

khuôn VỤ VIỆC — 4 đặc tả: DS · HNGĐ · KDTM · LĐ
  sơ thẩm    Step3 Thụ lý → Step4 Phân công → Step5 Chuẩn bị giải quyết
             → Step6 Phiên họp giải quyết (22-VDS) → Step7 Kháng cáo → Step8 Chuyển lên PT
  phúc thẩm  Step1 Kháng cáo, kháng nghị → Step2 Thụ lý → Step3 Phân công
             → Step4 Phiên họp phúc thẩm (27-VDS)
```

Còn lại là khuôn riêng: **hình sự** (có thêm Thi hành án), **phá sản**, **BPXLHC**, và cụm
**GĐT/TT** dùng chung.

Hệ quả: 8 luồng vụ án/vụ việc **sao khuôn**, không viết lại — y như `flows/dan-su/flow-001-st-pt`
đang dùng lại nguyên bộ bước 01→23 của luồng KDTM. Chỉ khác **dữ liệu gieo**: loại đơn, quan hệ
pháp luật, tư cách đương sự.

## Thư mục

```
e2e/
├─ docs/stepdata/                       13 đặc tả nguồn (đã đủ cả 12 tệp của "Scrip auto")
├─ bctk/                                lớp "phục vụ báo cáo thống kê"
│  ├─ README.md                         tệp này
│  ├─ danh-muc-80-bao-cao.ts            SINH — 81 biểu mẫu: nhóm, mã, giai đoạn, tên
│  └─ ban-do-luong.ts                   luồng nào nuôi biểu mẫu nào + chốt "Kết quả giải quyết"
├─ flows/<phân hệ>/<flow>/              thân bước
├─ flows/bao-cao-thong-ke/flow-001-lap-bao-cao/   KIỂM chức năng BCTK (case = biểu mẫu), không gieo
├─ data/<phân hệ>/<flow>/               cases.ts + case-NNN/input.ts
├─ data/vu-an-thuc/                     111 bản án thật làm hạt giống (docs/vu-an-thuc.md)
├─ tests/<phân hệ>/flows/<flow>.spec.ts một spec cho cả luồng, case là dữ liệu
└─ tools/bctk/                          sinh danh mục · đo độ phủ · dựng khung
```

### Tên phân hệ

`hinh-su` · `dan-su` · `hon-nhan-gia-dinh` · `kinh-doanh-thuong-mai` · `lao-dong` · `pha-san` ·
`bien-phap-xu-ly-hanh-chinh`

### Tên luồng

Luồng **mới** đặt `flow-NNN-<khuôn>-<phạm vi>`:

| | |
|---|---|
| `flow-001-vu-an-st-pt` | khuôn vụ án, sơ thẩm → phúc thẩm |
| `flow-002-vu-viec-st-pt` | khuôn vụ việc, sơ thẩm → phúc thẩm |
| `flow-001-phuc-hoi-pha-san` | khuôn riêng |
| `flow-001-xem-xet-quyet-dinh` | khuôn riêng (BPXLHC) |

Ba luồng **đã có** giữ nguyên tên cũ — `flow-001-st-pt`, `flow-001-so-tham`,
`flow-001-st-pt-gdt-bao-cao`. **Không đổi tên**: tên luồng nằm trong `rootCaseKey`, đổi là mất toàn
bộ trạng thái đã gieo của các case cũ.

## Công cụ

```bash
npm run bctk:do-phu              # biểu mẫu nào đã có số liệu, biểu mẫu nào chưa
npm run bctk:do-phu -- --md      # bảng Markdown để dán vào tài liệu
npm run bctk:do-phu -- --cong    # chỉ kiểm, thoát mã 1 nếu khai sai → dùng trong cổng kiểm thử
npm run bctk:dung-khung          # xem khung thư mục sẽ tạo cho luồng chưa làm
npm run bctk:dung-khung -- --ghi # tạo thật
npm run bctk:danh-muc            # sinh lại danh-muc-80-bao-cao.ts từ 80-bao-cao.tsv
```

`--cong` bắt đúng một lỗi, nhưng là lỗi hay mắc nhất: khai `trangThai: 'xong'` mà để
`chotKetQua: null`. Đó chính là "xanh giả" ở mức bản đồ — luồng tưởng xong nhưng báo cáo vẫn trống.

## Độ phủ hiện tại (04/10/2026)

**6/81 biểu mẫu đã có số liệu**: 2A, 2B (dân sự ST/PT) và 4A, 4B, 4C, 4D (KDTM ST/PT/GĐT/TT).

| Tình trạng | Số biểu mẫu |
|---|---|
| ✓ có số liệu | 6 |
| ~ có đặc tả, chưa chạy tới chốt | 14 |
| · chưa có luồng nào trỏ tới | 61 |

61 biểu mẫu chưa có luồng nào là chuyện bình thường ở giai đoạn này: phần lớn là hình sự chuyên đề
(1G→1X), hành chính (6A→6E), đơn tư pháp (8A→8E), Báo cáo Quốc hội (9A→9K) và hòa giải đối thoại
(10A→10K) — **không có đặc tả nào trong "Scrip auto" trỏ tới chúng**. Chạy hết 13 đặc tả hiện có
vẫn chỉ phủ được khoảng 20/81. Muốn hơn thì phải có đặc tả mới, không phải chạy nhiều hơn.

## Khi làm xong một luồng

1. Chạy đến khi có case xanh tới bước làm vụ lên "Kết quả giải quyết".
2. Sửa `bctk/ban-do-luong.ts`: `daTao: true`, `trangThai: 'xong'`, `chotKetQua: '<mã bước>'`.
3. Xoá `README.md` giữ chỗ trong thư mục luồng.
4. `npm run bctk:do-phu -- --cong` phải xanh.
