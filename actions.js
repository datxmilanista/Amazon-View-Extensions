(() => {
    const delay = (ms) => new Promise(res => setTimeout(res, ms));
    const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const updateStatus = (message) => {
        try {
            chrome.runtime.sendMessage({ command: "update_status", status: message });
        } catch (e) {
            console.log("Status:", message);
        }
    };

    async function humanTyping(inputEl, text) {
        inputEl.focus();
        let currentValue = "";
        for (const char of text) {
            if (Math.random() < 0.05) {
                // Tạo typo trên biến tạm, không ảnh hưởng đến giá trị thật
                let typoValue = currentValue + String.fromCharCode(random(97, 122));
                inputEl.value = typoValue;
                inputEl.dispatchEvent(new Event("input", { bubbles: true }));
                await delay(random(50, 120));
                inputEl.value = currentValue; // Xóa typo, trả lại giá trị đúng
                inputEl.dispatchEvent(new Event("input", { bubbles: true }));
            }
            currentValue += char;
            inputEl.value = currentValue;
            inputEl.dispatchEvent(new Event("input", { bubbles: true }));
            await delay(random(70, 180));
        }
    }

    async function humanLikeScroll(duration) {
        const startTime = Date.now();
        const readingPhaseDuration = duration * 0.6;
        await updateStatus(`... đang đọc thông tin sản phẩm.`);
        let lastY = 0;
        while (Date.now() - startTime < readingPhaseDuration) {
            const randomY = lastY + random(200, 600);
            window.scrollTo({ top: randomY, behavior: 'smooth' });
            await delay(random(2500, 6000));
            lastY = randomY;
        }
        await updateStatus(`... lướt xuống xem toàn bộ trang.`);
        while (window.innerHeight + window.scrollY < document.body.offsetHeight - 100) {
            window.scrollBy({ top: random(400, 800), behavior: 'smooth' });
            await delay(random(1200, 2500));
            if (Math.random() < 0.2) {
                await delay(random(3000, 7000));
            }
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

    const siteConfig = {
        jp: { domain: "https://www.amazon.co.jp" },
        us: { domain: "https://www.amazon.com" },
        sg: { domain: "https://www.amazon.sg" }
    };

    const MAX_RELATED_VIEW = 2;

    function getCurrentAsin() {
        const match = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
        return match ? match[1] : null;
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
                us: { sponsoredText: 'Sponsored' },
                sg: { sponsoredText: 'Sponsored' }
            };
            const strings = siteStrings[data.siteKey] || siteStrings.us;
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
            let relatedViewCount = data.relatedViewCount || 0;
            const currentAsin = getCurrentAsin();

            await updateStatus(`👁️ Đang xem sản phẩm...`);
            await delay(random(2000, 4000));

            const config = data.profileConfig;
            if (Math.random() < config.reviewChance) {
                const requestSent = await requestToViewReviews(data.siteKey);
                if (requestSent) return;
            }

            const scrollDuration = random(config.scrollDurations[0], config.scrollDurations[1]);
            const scrollEndTime = Date.now() + scrollDuration;
            await chrome.storage.local.set({ scrollEndTime: scrollEndTime, currentLoop: data.currentLoop });
            await humanLikeScroll(scrollDuration);

            // Kiểm tra và thực hiện xem ảnh nếu được bật
            const { viewImageRandom } = await chrome.storage.local.get(['viewImageRandom']);
            if (viewImageRandom) {
                await actions.randomViewProductImage();
            }

            await chrome.storage.local.set({ scrollEndTime: null, currentLoop: loop });

            // Thêm vào giỏ hàng hoặc danh sách yêu thích
            let addedToCart = false;
            if (Math.random() < config.addToCartChance) {
                await addToCart();
                addedToCart = true;
            }
            let addedToWishlist = false;
            if (Math.random() < (config.addToWishlistChance || 0.2)) {
                const wishlistBtn = document.querySelector('#add-to-wishlist-button-submit, .wishlist-button');
                if (wishlistBtn) {
                    wishlistBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await delay(random(1000, 2000));
                    wishlistBtn.click();
                    await delay(random(2000, 4000));
                    addedToWishlist = true;
                }
            }

            // Nếu chưa hết số lần view thì tiếp tục tìm sản phẩm tiếp theo
            if (loop < data.loops) {
                await updateStatus("🕵️ Tìm sản phẩm tiếp theo...");
                const relatedLinks = findRelatedProductLinks();
                let viewedAsins = data.viewedAsins || [];
                if (!viewedAsins.includes(currentAsin) && currentAsin) {
                    viewedAsins.push(currentAsin);
                }
                const filteredLinks = relatedLinks.filter(link => {
                    const asinMatch = link.match(/\/dp\/([A-Z0-9]{10})/);
                    return asinMatch && !viewedAsins.includes(asinMatch[1]);
                });

                if (relatedViewCount < MAX_RELATED_VIEW && filteredLinks.length > 0) {
                    const nextLink = filteredLinks[random(0, filteredLinks.length - 1)];
                    await chrome.storage.local.set({
                        relatedViewCount: relatedViewCount + 1,
                        viewedAsins: viewedAsins
                    });
                    window.location.href = nextLink;
                } else {
                    await updateStatus("🔄 Đang lấy từ khóa mới...");
                    chrome.runtime.sendMessage({ command: "get_new_keyword" }, (response) => {
                        if (response?.newKeyword && response.newKeyword !== data.keyword) {
                            chrome.storage.local.set({
                                relatedViewCount: 0,
                                viewedAsins: viewedAsins
                            });
                            executeSearch(response.newKeyword);
                        } else {
                            updateStatus("❌ Không có từ khoá mới hoặc bị trùng, dừng lại.");
                            chrome.storage.local.set({ isRunning: false });
                        }
                    });
                }
            } else {
                // Nếu là lần cuối thì báo hoàn thành
                await updateStatus("✅ Đã hoàn thành tất cả lượt xem và thao tác!");
                chrome.storage.local.set({ isRunning: false });
            }
        },
        randomViewProductImage: async () => {
            const images = document.querySelectorAll('.image-container img');
            if (images.length > 0) {
                const randomIndex = Math.floor(Math.random() * images.length);
                images[randomIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                await delay(random(1000, 2000));
                images[randomIndex].click();
                await delay(random(2000, 4000));
            }
        }
    };

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action && actions[message.action]) {
            actions[message.action](message);
        }
    });

    return actions;
})();
