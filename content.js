function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Hàm tự động cuộn xuống để kích hoạt lazy loading
async function autoScroll(times = 5, scrollStep = 1000, wait = 2000) {
  for (let i = 0; i < times; i++) {
    window.scrollBy(0, scrollStep);
    console.log(`🌀 Đang cuộn lần ${i + 1}...`);
    await delay(wait + Math.random() * 1000); // Delay ngẫu nhiên mỗi lần
  }
  window.scrollTo(0, 0); // Cuộn về đầu nếu muốn
  console.log("✅ Hoàn thành cuộn trang.");
}

// Phân tích danh sách sản phẩm từ trang tìm kiếm
async function parseSearchResults() {
  const results = [];
  const items = document.querySelectorAll('[data-component-type="s-search-result"]');

  for (const item of items) {
    const titleEl = item.querySelector('h2 a span');
    const linkEl = item.querySelector('h2 a');

    if (titleEl && linkEl) {
      results.push({
        title: titleEl.innerText.trim(),
        url: "https://www.amazon.co.jp" + linkEl.getAttribute("href")
      });
    }
  }

  console.log("🔍 商品一覧:", results);
  return results;
}

// Gợi ý sản phẩm liên quan từ trang chi tiết
async function parseRelatedProducts() {
  await delay(2000 + Math.random() * 3000);

  const relatedSection = [...document.querySelectorAll('h2')]
    .find(el => el.innerText.includes("この商品を買った人はこんな商品も買っています"));

  if (!relatedSection) return;

  const productCards = relatedSection.parentElement.querySelectorAll("li, div");

  const relatedProducts = [];
  productCards.forEach(el => {
    const title = el.querySelector("span.a-text-normal");
    const link = el.querySelector("a");

    if (title && link) {
      relatedProducts.push({
        title: title.innerText.trim(),
        url: "https://www.amazon.co.jp" + link.getAttribute("href")
      });
    }
  });

  console.log("🧲 関連商品:", relatedProducts);
}

(async () => {
  if (location.pathname.startsWith("/s")) {
    console.log("📄 Đang ở trang kết quả tìm kiếm...");
    await autoScroll(8, 1200, 2000); // Cuộn 8 lần, mỗi lần 1200px, delay 2s
    await parseSearchResults();
  } else if (location.pathname.includes("/dp/")) {
    await parseRelatedProducts();
  }
})();
