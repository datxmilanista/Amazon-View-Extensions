# 🤖 Amazon View Extensions - Extension Amazon với hành vi thông minh

AMZ Pro Viewer là một tiện ích mở rộng trình duyệt (Chrome Extension) được thiết kế để mô phỏng hành vi của người dùng thực khi duyệt và tương tác với các trang sản phẩm trên Amazon. Dự án này tập trung vào việc áp dụng các kỹ thuật tiên tiến để tìm kiếm sản phẩm, khám phá các mặt hàng liên quan, và đặc biệt là giảm thiểu khả năng bị các hệ thống chống bot phát hiện.

## 🌟 Tính năng nổi bật

- **Tìm kiếm sản phẩm theo từ khóa**: Tự động tìm kiếm sản phẩm trên Amazon dựa trên danh sách từ khóa được cấu hình.
- **Duyệt sản phẩm thông minh**:
  - Tự động click vào các sản phẩm từ trang kết quả tìm kiếm.
  - Xem chi tiết sản phẩm với hành vi lướt trang (scroll) tự nhiên, mô phỏng cách đọc của con người.
  - Có khả năng tương tác với phần đánh giá sản phẩm, click để xem chi tiết các review rồi quay lại trang sản phẩm.
  - Mô phỏng hành vi "Thêm vào giỏ hàng" (Add to Cart) với một tỉ lệ ngẫu nhiên, tạo tín hiệu là một khách hàng tiềm năng.
- **Phát hiện và điều hướng sản phẩm liên quan**: Tự động tìm và chuyển hướng đến các sản phẩm gợi ý (ví dụ: "Sản phẩm liên quan đến mặt hàng này", "Thường được mua cùng").
- **Tích hợp dữ liệu từ khóa ngoài**: Danh sách từ khóa được quản lý trong một file riêng (`keywords.js`), giúp dễ dàng mở rộng và tùy chỉnh cho nhiều ngách hàng khác nhau (điện tử, mỹ phẩm, đồ gia dụng, đồ chơi...).
- **Giao diện Pop-up thân thiện**: Cho phép người dùng dễ dàng chọn ngách hàng và số lần duyệt sản phẩm.

## 🕵️‍♂️ Kỹ thuật chống phát hiện Bot (Anti-Detection)

Dự án này sử dụng nhiều kỹ thuật để làm cho hành vi duyệt web trở nên tự nhiên nhất có thể, giảm thiểu nguy cơ bị Amazon nhận diện là bot:

- **Mô phỏng gõ phím người thật**: Khi nhập từ khóa tìm kiếm, tốc độ gõ và khoảng cách giữa các ký tự được tạo ngẫu nhiên.
- **Lướt trang (Scroll) tự nhiên**: Hành vi cuộn trang được mô phỏng giống với cách người dùng thực lướt và đọc thông tin trên trang, bao gồm việc lướt lên xuống ngẫu nhiên và dừng lại ở các khu vực quan trọng.
- **Độ trễ ngẫu nhiên**: Mọi hành động (click, lướt trang, chuyển tab) đều có một độ trễ ngẫu nhiên, tránh sự đều đặn dễ bị phát hiện của bot.
- **Luân chuyển hành vi**: Tích hợp xác suất ngẫu nhiên cho các hành động như xem review hay thêm vào giỏ hàng, khiến mỗi phiên làm việc trở nên độc đáo và khó đoán.
- **Điều hướng thông minh**: Sau khi xem review, bot sẽ quay lại trang sản phẩm đang duyệt thay vì nhảy đi nơi khác, mô phỏng hành vi so sánh và nghiên cứu của người dùng.

## 🚀 Hướng dẫn cài đặt và sử dụng

### Cài đặt

Để cài đặt và chạy AMZ Pro Viewer, bạn cần tải mã nguồn về và tải nó lên trình duyệt Chrome (hoặc các trình duyệt dựa trên Chromium khác) dưới dạng một tiện ích mở rộng chưa được đóng gói.

1. **Tải mã nguồn**:

Clone repository này về máy tính của bạn:

```bash
git clone https://github.com/datxmilanista/Amazon-View-Extensions.git
