// actions.js - Phiên bản cuối cùng

const delay = (ms) => new Promise(res => setTimeout(res, ms));
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const updateStatus = (message) => chrome.storage.local.set({ status: message });

// --- CÁC HÀM HỖ TRỢ ---

async function humanTyping(inputEl, text) {
    inputEl.focus();
    inputEl.value = "";
    for (const char of text) {
        inputEl.value += char;
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        if (Math.random() < 0.1) await delay(random(300, 600));
        await delay(random(70, 180));
    }
}

async function humanLikeScroll(duration) {
    const startTime = Date.now();
    const readingPhaseDuration = duration * 0.6;
    await updateStatus(`... đang đọc thông tin sản phẩm.`);
    const topZoneHeight = 1800;
    while (Date.now() - startTime < readingPhaseDuration) {
        const randomY = random(0, topZoneHeight);
        window.scrollTo({ top: randomY, behavior: 'smooth' });
        await delay(random(3000, 7000));
    }
    await updateStatus(`... lướt xuống xem toàn bộ trang.`);
    while (window.innerHeight + window.scrollY < document.body.offsetHeight - 100) {
        window.scrollBy({ top: random(400, 800), behavior: 'smooth' });
        await delay(random(800, 2000));
    }
    await delay(random(1500, 3000));
    await updateStatus(`... quay lên xem sản phẩm gợi ý.`);
    const firstCarousel = document.querySelector('ol.a-carousel');
    if (firstCarousel) {
        const targetY = firstCarousel.getBoundingClientRect().top + window.scrollY - (window.innerHeight / 4);
        while (window.scrollY > targetY) {
            window.scrollBy({ top: -Math.abs(random(500, 900)), behavior: 'smooth' });
            await delay(random(700, 1500));
            if (window.scrollY <= targetY + 100) break;
        }
        await delay(random(2000, 3000));
    }
}

function findRelatedProductLinks() {
    let allFoundLinks = [];
    const carousels = document.querySelectorAll('ol.a-carousel');
    carousels.forEach((carousel) => {
        const linksInCarousel = Array.from(carousel.querySelectorAll('li.a-carousel-card a[href*="/dp/"]'));
        if (linksInCarousel.length > 0) {
            allFoundLinks.push(...linksInCarousel.map(a => a.href));
        }
    });
    if (allFoundLinks.length > 0) {
        const pathParts = window.location.pathname.split('/');
        const currentAsin = pathParts[pathParts.indexOf('dp') + 1];
        return [...new Set(allFoundLinks)].filter(href => href && href.includes('/dp/') && !href.includes(currentAsin));
    }
    return [];
}

async function executeSearch(keyword) {
    const input = document.getElementById("twotabsearchtextbox");
    if (input) {
        await updateStatus(`⌨️ Đang tìm kiếm: "${keyword}"`);
        await humanTyping(input, keyword);
        await delay(random(500, 1000));
        input.form.submit();
    }
}

async function requestToViewReviews(siteKey) {
    const siteStrings = {
        jp: { reviewsLinkHook: 'see-all-reviews-link-foot' },
        us: { reviewsLinkHook: 'see-all-reviews-link-foot' }
    };
    const strings = siteStrings[siteKey] || siteStrings.jp;
    await updateStatus("...chuẩn bị xem đánh giá.");
    const reviewsSectionLink = document.querySelector(`#reviews-medley-footer a[data-hook="${strings.reviewsLinkHook}"]`);
    if (reviewsSectionLink) {
        const reviewsUrl = reviewsSectionLink.href;
        chrome.runtime.sendMessage({ command: "view_reviews", reviewsUrl: reviewsUrl });
        return true;
    }
    return false;
}

async function addToCart() {
    await updateStatus("🛒 Thử thêm vào giỏ hàng...");
    const addToCartBtn = document.getElementById("add-to-cart-button");
    if (addToCartBtn && !addToCartBtn.disabled) {
        addToCartBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(random(1000, 2000));
        addToCartBtn.click();
        await delay(random(4000, 6000));
        const closeButton = document.querySelector('#attach-close_sideSheet-link, .a-button-close');
        if (closeButton) closeButton.click();
    }
}

const actions = {
    search: async (data) => {
        const cookieBanner = document.getElementById("sp-cc-accept");
        if (cookieBanner) cookieBanner.click();
        await delay(random(1000, 1500));
        await executeSearch(data.keyword);
    },
    clickProduct: async (data) => {
        const siteStrings = {
            jp: { sponsoredText: 'スポンサー' },
            us: { sponsoredText: 'Sponsored' }
        };
        const strings = siteStrings[data.siteKey] || siteStrings.jp;
        await updateStatus("🧐 Chọn ngẫu nhiên một sản phẩm...");
        await delay(random(2000, 4000));
        const products = document.querySelectorAll('div[data-component-type="s-search-result"]');
        const validProducts = Array.from(products).filter(p => !p.innerText.includes(strings.sponsoredText));
        if (validProducts.length > 0) {
            const productToClick = validProducts[random(0, validProducts.length - 1)];
            const link = productToClick.querySelector("a.a-link-normal");
            if (link) {
                link.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await delay(random(1500, 2500));
                link.click();
            } else {
                await updateStatus("❌ Sản phẩm không có link hợp lệ. Dừng lại.");
                chrome.storage.local.set({ isRunning: false });
            }
        } else {
            await updateStatus("❌ Không tìm thấy sản phẩm nào trên trang 1. Dừng lại.");
            chrome.storage.local.set({ isRunning: false });
        }
    },
    viewProduct: async (data) => {
        let loop = data.currentLoop + 1;
        await updateStatus(`👁️ Đang xem sản phẩm...`); // Status sẽ được cập nhật chi tiết hơn bởi popup
        await delay(random(2000, 4000));

        const config = data.profileConfig;
        if (Math.random() < config.reviewChance) {
            const requestSent = await requestToViewReviews(data.siteKey);
            if (requestSent) {
                return;
            }
        }

        const scrollDuration = random(config.scrollDurations[0], config.scrollDurations[1]);
        const scrollEndTime = Date.now() + scrollDuration;
        await chrome.storage.local.set({ scrollEndTime: scrollEndTime, currentLoop: data.currentLoop });
        await humanLikeScroll(scrollDuration);

        await chrome.storage.local.set({ scrollEndTime: null, currentLoop: loop });

        if (Math.random() < config.addToCartChance) {
            await addToCart();
        }

        await updateStatus("🕵️ Tìm sản phẩm gợi ý...");
        const relatedLinks = findRelatedProductLinks();

        if (relatedLinks.length > 0) {
            const nextLink = relatedLinks[random(0, relatedLinks.length - 1)];
            window.location.href = nextLink;
        } else {
            await updateStatus("❌ Không tìm thấy gợi ý, đang lấy từ khóa mới...");
            chrome.runtime.sendMessage({ command: "get_new_keyword" }, (response) => {
                const siteConfig = { jp: { domain: "https://www.amazon.co.jp" }, us: { domain: "https://www.amazon.com" } };
                if (response?.newKeyword) {
                    executeSearch(response.newKeyword);
                } else {
                    window.location.href = siteConfig[data.siteKey].domain + "/";
                }
            });
        }
    }
};

chrome.runtime.onMessage.addListener((message) => {
    if (message.action && actions[message.action]) {
        actions[message.action](message);
    }
});