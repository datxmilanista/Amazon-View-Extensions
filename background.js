// background.js - Phiên bản cuối cùng

import { keywordDatabase } from './keywords.js';

const delay = (ms) => new Promise(res => setTimeout(res, ms));
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Cấu hình cho từng trang Amazon
const siteConfig = {
    jp: { domain: "https://www.amazon.co.jp" },
    us: { domain: "https://www.amazon.com" },
    sg: { domain: "https://www.amazon.sg" } // Thêm cấu hình cho amazon.sg
};

// Cấu hình cho từng hồ sơ người dùng
const profiles = {
    researcher: {
        scrollDurations: [75000, 100000], // 75-100 giây
        reviewChance: 0.30, // 30% cơ hội xem review
        addToCartChance: 0.20 // 20% cơ hội thêm vào giỏ
    },
    normal: {
        scrollDurations: [60000, 90000], // 60-90 giây
        reviewChance: 0.15, // 15%
        addToCartChance: 0.10 // 10%
    },
    fast_shopper: {
        scrollDurations: [25000, 40000], // 25-40 giây
        reviewChance: 0.05, // 5%
        addToCartChance: 0.05 // 5%
    }
};

// Khởi tạo trạng thái mặc định khi cài đặt extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    isRunning: false,
    siteKey: 'jp',
    categoryKey: 'electronics',
    userProfile: 'normal',
    loops: 10,
    currentLoop: 0,
    status: '💤 Sẵn sàng để bắt đầu.',
    scrollEndTime: null,
    returnToUrl: null,
    sessionStartTime: null
  });
});

// Lắng nghe tất cả các tin nhắn từ popup hoặc content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "start") {
    const { siteKey, categoryKey, loops, userProfile } = message;
    // Nếu là sg thì lấy keyword của us
    const keywordSet = siteKey === 'sg' ? keywordDatabase['us'] : (keywordDatabase[siteKey] || keywordDatabase['jp']);
    const keywordList = keywordSet[categoryKey] || [categoryKey];
    const randomKeyword = keywordList[Math.floor(Math.random() * keywordList.length)];
    startProcess(siteKey, categoryKey, loops, userProfile, randomKeyword);

  } else if (message.command === "stop") {
    stopProcess();
  
  } else if (message.command === "get_new_keyword") {
    (async () => {
      const data = await chrome.storage.local.get(['siteKey', 'categoryKey']);
      // Nếu là sg thì lấy keyword của us
      const keywordSet = data.siteKey === 'sg' ? keywordDatabase['us'] : (keywordDatabase[data.siteKey] || keywordDatabase['jp']);
      const keywordList = keywordSet[data.categoryKey] || [];
      const newRandomKeyword = keywordList[Math.floor(Math.random() * keywordList.length)];
      await chrome.storage.local.set({ keyword: newRandomKeyword });
      sendResponse({ newKeyword: newRandomKeyword });
    })();
    return true; 
  
  } else if (message.command === "view_reviews") {
    (async () => {
      await chrome.storage.local.set({ returnToUrl: sender.tab.url });
      chrome.tabs.update(sender.tab.id, { url: message.reviewsUrl });
    })();
    return true;
  } else if (message.command === "update_status") {
        chrome.storage.local.set({ status: message.status });
    }
});

// Hàm bắt đầu một phiên làm việc mới
async function startProcess(siteKey, categoryKey, loops, userProfile, keyword) {
  const profileConfig = profiles[userProfile] || profiles['normal'];
  await chrome.storage.local.set({
    isRunning: true, siteKey, categoryKey, keyword, loops, userProfile, profileConfig,
    currentLoop: 0,
    status: `🚀 Bắt đầu với hồ sơ: ${userProfile}`,
    sessionStartTime: Date.now()
  });

  const domain = siteConfig[siteKey].domain;
  const tabs = await chrome.tabs.query({ url: `${domain}/*` });
  const amazonTab = tabs.find(t => t.active) || tabs[0];
  
  if (amazonTab) {
    chrome.tabs.update(amazonTab.id, { url: domain + "/", active: true });
  } else {
    chrome.tabs.create({ url: domain + "/", active: true });
  }
}

// Hàm dừng phiên làm việc
async function stopProcess() {
  await chrome.storage.local.set({
    isRunning: false,
    status: '⏹️ Đã dừng bởi người dùng.',
    scrollEndTime: null,
    returnToUrl: null,
    sessionStartTime: null
  });
}

// "Bộ não" chính, lắng nghe sự thay đổi của các tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Chỉ hoạt động khi tab đã tải xong và là trang Amazon
  if (
    changeInfo.status !== 'complete' ||
    !(tab.url.includes('amazon.co.jp') || tab.url.includes('amazon.com') || tab.url.includes('amazon.sg')) // Thêm amazon.sg
  ) return;

  const data = await chrome.storage.local.get(null); // Lấy toàn bộ dữ liệu
  
  // Kịch bản 1: Đang ở trang review, cần quay lại
  if (data.returnToUrl && tab.url.includes('/product-reviews/')) {
    await chrome.storage.local.set({ status: "...đang đọc các đánh giá." });
    await delay(random(8000, 15000)); // Mô phỏng đọc review
    
    await chrome.storage.local.set({ returnToUrl: null, status: "...quay lại trang sản phẩm." });
    chrome.tabs.update(tabId, { url: data.returnToUrl });
    return;
  }

  // Nếu extension không chạy thì dừng lại
  if (!data.isRunning) return;

  // Kịch bản 2: Đã hoàn thành tất cả các vòng lặp
  if (data.currentLoop >= data.loops) {
    await stopProcess();
    await chrome.storage.local.set({ status: '✅ Hoàn thành!' });
    return;
  }
  
  // Kịch bản 3: Quyết định hành động dựa trên URL hiện tại
  const domain = siteConfig[data.siteKey].domain;
  let action;
  if (tab.url === domain + "/" || tab.url === domain) action = 'search';
  else if (tab.url.includes("/s?k=")) action = 'clickProduct';
  else if (tab.url.includes("/dp/")) action = 'viewProduct';
  
  // Nếu có hành động phù hợp, inject và gửi message cho actions.js
  if (action) {
    try {
        // Chỉ inject nếu tab là trang web hợp lệ
        if (
            tab.url &&
            tab.url.startsWith('http') &&
            !tab.url.includes('chrome://') &&
            !tab.url.includes('about:blank') &&
            !tab.url.includes('error')
        ) {
            await chrome.scripting.executeScript({ target: { tabId }, files: ['actions.js'] });
            // Đợi một chút để script khởi tạo listener
            setTimeout(() => {
                chrome.tabs.sendMessage(tabId, { action, ...data });
            }, 500); // 500ms hoặc hơn nếu cần
        } else {
            console.warn("Tab không hợp lệ để inject hoặc gửi message:", tab.url, `Tab ID: ${tabId}`);
        }
    } catch (e) { 
        console.error("Lỗi khi inject hoặc gửi message:", e, `Tab ID: ${tabId}`); 
    }
  }
});