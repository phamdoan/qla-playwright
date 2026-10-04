# Làm mới `danh-muc-qhpl.tsv` (ảnh chụp danh mục lá QHPL)

`danh-muc-qhpl.tsv` là ảnh chụp các **lá chọn được** của danh mục Quan hệ pháp luật (thống kê) trên
STG, 4 cột cách nhau bằng TAB: `MA`, `TEN`, `CAP_DO`, `TEN_NHANH_CHA`.

Chụp ngày **04/10/2026**. Danh mục này có đổi: nhóm `QHPL_TC_KDTM` vừa bị tái cấu trúc ngày
03/10/2026 (thêm `.030`, hạ 12 lá hợp đồng xuống cấp 2 và đổi tên chúng), làm hạt giống KDTM cũ
chết. Nếu một bước báo *"Danh mục Quan hệ pháp luật (Thống kê) không có mục tên đúng …"* thì việc
đầu tiên là chụp lại ảnh này.

## Vì sao chỉ lấy lá cấp 1–2

- FE từ chối nút còn cấp con: *"Nhóm danh mục này còn cấp con"*.
- `chonQhplThongKe` (`common/don-khoi-kien.ts`) chỉ mở được **một** cấp cha, nên lá ở cấp 3 trở
  xuống không chọn nổi bằng kịch bản hiện tại.

## Cách chụp lại

Không có `python`/`sqlplus` trên máy này; dùng Java + `ojdbc11` trong `~/.m2`. `Sql.java` cạnh file
này là một trình chạy SELECT **chỉ đọc** (`setAutoCommit(false)` + `rollback()` ở cuối).

```bash
JAR="$HOME/.m2/repository/com/oracle/database/jdbc/ojdbc11/23.26.0.0.0/ojdbc11-23.26.0.0.0.jar"
javac -cp "$JAR" Sql.java

# Mật khẩu KHÔNG ghi vào tệp nào trong repo — truyền qua biến môi trường
export ORA_URL='jdbc:oracle:thin:@<host>:1521/PDB1' ORA_USER='<user>' ORA_PASS='<pass>'

java -Dfile.encoding=UTF-8 -cp ".;$JAR" Sql "
SELECT d.MA||CHR(9)||d.TEN||CHR(9)||TO_CHAR(d.CAP_DO)||CHR(9)||NVL(p.TEN,'')
FROM QTDM.DANHMUC d
LEFT JOIN QTDM.DANHMUC p ON p.MA=d.MA_DANHMUC_CHA AND p.MA_LOAI_DANHMUC=d.MA_LOAI_DANHMUC
WHERE d.MA_LOAI_DANHMUC IN ('QHPL_TC_DS','QHPL_TC_KDTM','QHPL_TC_HNGD','QHPL_TC_LD')
  AND d.TRANG_THAI=1 AND NVL(d.DANH_DAU_XOA,0)=0
  AND NOT EXISTS (SELECT 1 FROM QTDM.DANHMUC k
                  WHERE k.MA_DANHMUC_CHA=d.MA AND k.MA_LOAI_DANHMUC=d.MA_LOAI_DANHMUC AND k.TRANG_THAI=1)
  AND d.CAP_DO IN (1,2)
ORDER BY d.MA" > danh-muc-qhpl.tsv
```

Hai bẫy đã gặp:

- **thiếu `-Dfile.encoding=UTF-8`** → tiếng Việt ra dấu hỏi, tên lá sai hết.
- **`NVL(d.CAP_DO,'?')`** → `ORA-01722: invalid number`, vì `CAP_DO` là số; phải `TO_CHAR`.

Chụp xong thì sinh lại dữ liệu:

```bash
node tools/sinh-ban-an-cong-bo/sinh.js
```

Script **dừng** nếu có mã lá không còn trong ảnh chụp, kèm danh sách — đó chính là tín hiệu danh mục
đã đổi và cần gán lại mã cho các bản ghi đó trong `thu-thap.json`.

## Thêm bản án mới vào `thu-thap.json`

Mỗi phần tử ghi **nguyên văn những gì cổng công bố nói**, không suy diễn:

```json
{
  "soBanAn": "39/2024/KDTM-PT",
  "ngay": "27/02/2024",
  "toaAn": "TAND TP. Hà Nội",
  "trichYeu": "Tranh chấp hợp đồng mua bán hàng hoá",
  "qhplCongBo": "Tranh chấp về mua bán hàng hóa",
  "nguon": "https://congbobanan.toaan.gov.vn/2ta1691665t1cvn/chi-tiet-ban-an",
  "maQhpl": "QHPL_TC_KDTM.001"
}
```

- `qhplCongBo` là dòng phân loại **của chính cổng** (phần sau dấu `-` cuối tiêu đề). Để rỗng nếu
  tiêu đề không nêu — đừng tự điền.
- `maQhpl` là lá tương ứng trong `danh-muc-qhpl.tsv`. Nếu phân loại của cổng rơi vào một **nhóm còn
  cấp con** (vd. "Tranh chấp đất đai" = `QHPL_TC_DS.010`), hạ xuống một lá con hợp lý và viết
  `ghiChu` nói rõ đã hạ về đâu và vì sao.
- `id` do script sinh theo thứ tự (`bacb-001`, `bacb-002`, …) nên **chèn vào giữa sẽ đổi id của các
  bản ghi sau** — thêm vào cuối nếu muốn giữ id cũ.
