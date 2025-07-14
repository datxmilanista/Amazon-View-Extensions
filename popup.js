document.addEventListener('DOMContentLoaded', () => {
    // Lấy tất cả các phần tử trên giao diện
    const amazonSiteSelect = document.getElementById("amazon-site");
    const userProfileSelect = document.getElementById("user-profile");
    const profileDescription = document.getElementById("profile-description");
    const categorySelect = document.getElementById("category");
    const loopsInput = document.getElementById("loops");
    const statusDiv = document.getElementById("status");
    const countdownDiv = document.getElementById("countdown");
    const loopCounterDiv = document.getElementById("loop-counter");
    const sessionTimerDiv = document.getElementById("session-timer");
    const startBtn = document.getElementById("start");
    const stopBtn = document.getElementById("stop");
    const viewImageCheckbox = document.getElementById('view-image-random');

    let timerInterval = null;

    // Dữ liệu mô tả cho các Profile
    const profileDescriptions = {
        researcher: "Hành vi kỹ tính: Ưu tiên sản phẩm chất lượng, dành nhiều thời gian xem xét, có khả năng xem review và thêm vào giỏ hàng cao.",
        normal: "Hành vi cân bằng: Tốc độ và tương tác ở mức vừa phải, mô phỏng người dùng phổ thông nhất.",
        fast_shopper: "Hành vi nhanh gọn: Lướt xem rất nhanh, ít tương tác sâu, mô phỏng người dùng đã biết rõ mình muốn mua gì."
    };

    // Xử lý các sự kiện của người dùng
    amazonSiteSelect.addEventListener("change", () => {
        chrome.storage.local.set({ siteKey: amazonSiteSelect.value });
    });
    
    userProfileSelect.addEventListener("change", () => {
        const selectedProfile = userProfileSelect.value;
        profileDescription.textContent = profileDescriptions[selectedProfile];
        // Lưu toàn bộ trạng thái hiện tại
        chrome.storage.local.set({
            userProfile: selectedProfile,
            siteKey: amazonSiteSelect.value,
            categoryKey: categorySelect.value,
            loops: parseInt(loopsInput.value, 10)
        });
    });

    categorySelect.addEventListener("change", () => {
        chrome.storage.local.set({
            categoryKey: categorySelect.value,
            userProfile: userProfileSelect.value,
            siteKey: amazonSiteSelect.value,
            loops: parseInt(loopsInput.value, 10)
        });
    });

    loopsInput.addEventListener("change", () => {
        chrome.storage.local.set({
            loops: parseInt(loopsInput.value, 10),
            userProfile: userProfileSelect.value,
            siteKey: amazonSiteSelect.value,
            categoryKey: categorySelect.value
        });
    });

    startBtn.addEventListener("click", () => {
        const siteKey = amazonSiteSelect.value;
        const categoryKey = categorySelect.value;
        const loops = parseInt(loopsInput.value, 10);
        const userProfile = userProfileSelect.value;
        chrome.runtime.sendMessage({ command: "start", siteKey, categoryKey, loops, userProfile });
    });

    stopBtn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ command: "stop" });
    });
    
    // Hàm định dạng thời gian từ giây sang MM:SS
    function formatTime(totalSeconds) {
        if (totalSeconds < 0) totalSeconds = 0;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Quản lý và cập nhật bộ đếm giờ
    function startAndManageTimers(data) {
        if (timerInterval) clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            if (!data.isRunning) {
                clearInterval(timerInterval);
                return;
            }
            if (data.sessionStartTime) {
                const elapsed = Math.round((Date.now() - data.sessionStartTime) / 1000);
                sessionTimerDiv.textContent = `Thời gian phiên: ${formatTime(elapsed)}`;
            }
            if (data.scrollEndTime && data.scrollEndTime > Date.now()) {
                const timeLeft = Math.round((data.scrollEndTime - Date.now()) / 1000);
                countdownDiv.textContent = formatTime(timeLeft);
            }
        }, 1000);
    }

    // Cập nhật toàn bộ giao diện dựa trên trạng thái
    function updateUI(data) {
        if (data.siteKey) amazonSiteSelect.value = data.siteKey;
        if (data.categoryKey) categorySelect.value = data.categoryKey;
        if (data.loops !== undefined) loopsInput.value = data.loops;
        if (data.userProfile) {
            userProfileSelect.value = data.userProfile;
            profileDescription.textContent = profileDescriptions[data.userProfile];
        }
        startBtn.disabled = data.isRunning;
        stopBtn.disabled = !data.isRunning;
        sessionTimerDiv.textContent = data.isRunning ? 'Bắt đầu phiên...' : '';
        if (data.isRunning) {
            statusDiv.textContent = data.status || '...';
            statusDiv.classList.add('running');
            startAndManageTimers(data);
            if (data.scrollEndTime && data.scrollEndTime > Date.now()) {
                countdownDiv.style.display = 'block';
                loopCounterDiv.style.display = 'block';
                loopCounterDiv.textContent = `(${data.currentLoop + 1}/${data.loops})`;
            } else {
                countdownDiv.style.display = 'none';
                loopCounterDiv.style.display = 'none';
            }
        } else {
            statusDiv.textContent = data.status || '💤 Sẵn sàng để bắt đầu.';
            statusDiv.classList.remove('running');
            countdownDiv.style.display = 'none';
            loopCounterDiv.style.display = 'none';
            if (timerInterval) clearInterval(timerInterval);
        }
    }

    const keysToGet = ['status', 'categoryKey', 'loops', 'isRunning', 'scrollEndTime', 'userProfile', 'siteKey', 'sessionStartTime', 'currentLoop'];

    // Lấy dữ liệu lần đầu khi mở popup
    chrome.storage.local.get(keysToGet, (data) => {
        updateUI(data);
    });
    
    // Lắng nghe các thay đổi từ background để cập nhật UI real-time
    chrome.storage.onChanged.addListener(() => {
        chrome.storage.local.get(keysToGet, (data) => {
            updateUI(data);
        });
    });

    const siteDomains = {
        jp: "amazon.co.jp",
        us: "amazon.com",
        sg: "amazon.sg"
    };

    // Tự động phát hiện trang Amazon khi mở popup
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
            const url = tabs[0].url;
            for (const [key, domain] of Object.entries(siteDomains)) {
                if (url.includes(domain)) {
                    amazonSiteSelect.value = key;
                    chrome.storage.local.set({ siteKey: key });
                    break;
                }
            }
        }
    });

    // Lưu trạng thái khi thay đổi checkbox xem ảnh sản phẩm
    viewImageCheckbox.addEventListener('change', () => {
        chrome.storage.local.set({ viewImageRandom: viewImageCheckbox.checked });
    });

    // Khi mở popup, cập nhật trạng thái checkbox
    chrome.storage.local.get(['viewImageRandom'], (data) => {
        viewImageCheckbox.checked = !!data.viewImageRandom;
    });
});