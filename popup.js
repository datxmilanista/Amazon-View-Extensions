document.addEventListener('DOMContentLoaded', () => {
    // --- Lấy tất cả các phần tử trên giao diện ---
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

    // Biến để quản lý bộ đếm giờ
    let timerInterval = null;

    // --- Dữ liệu mô tả cho các Profile ---
    const profileDescriptions = {
        researcher: "Hành vi kỹ tính: Ưu tiên sản phẩm chất lượng, dành nhiều thời gian xem xét, có khả năng xem review và thêm vào giỏ hàng cao.",
        normal: "Hành vi cân bằng: Tốc độ và tương tác ở mức vừa phải, mô phỏng người dùng phổ thông nhất.",
        fast_shopper: "Hành vi nhanh gọn: Lướt xem rất nhanh, ít tương tác sâu, mô phỏng người dùng đã biết rõ mình muốn mua gì."
    };

    // --- Xử lý các sự kiện của người dùng ---
    amazonSiteSelect.addEventListener("change", () => {
        chrome.storage.local.set({ siteKey: amazonSiteSelect.value });
    });
    
    userProfileSelect.addEventListener("change", () => {
        const selectedProfile = userProfileSelect.value;
        profileDescription.textContent = profileDescriptions[selectedProfile];
        chrome.storage.local.set({ userProfile: selectedProfile });
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
    
    // --- Các hàm cập nhật giao diện ---

    // Hàm định dạng thời gian từ giây sang MM:SS
    function formatTime(totalSeconds) {
        if (totalSeconds < 0) totalSeconds = 0;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Hàm quản lý và cập nhật tất cả các bộ đếm giờ
    function startAndManageTimers(data) {
        if (timerInterval) clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            if (!data.isRunning) {
                clearInterval(timerInterval);
                return;
            }
            
            // Cập nhật tổng thời gian phiên
            if (data.sessionStartTime) {
                const elapsed = Math.round((Date.now() - data.sessionStartTime) / 1000);
                sessionTimerDiv.textContent = `Thời gian phiên: ${formatTime(elapsed)}`;
            }
            
            // Cập nhật đồng hồ đếm ngược
            if (data.scrollEndTime && data.scrollEndTime > Date.now()) {
                const timeLeft = Math.round((data.scrollEndTime - Date.now()) / 1000);
                countdownDiv.textContent = formatTime(timeLeft);
            }
        }, 1000);
    }

    // Hàm chính, cập nhật toàn bộ giao diện dựa trên trạng thái
    function updateUI(data) {
        // Cập nhật các lựa chọn từ storage
        if (data.siteKey) amazonSiteSelect.value = data.siteKey;
        if (data.categoryKey) categorySelect.value = data.categoryKey;
        if (data.userProfile) {
            userProfileSelect.value = data.userProfile;
            profileDescription.textContent = profileDescriptions[data.userProfile];
        } else {
            const defaultProfile = userProfileSelect.value;
            profileDescription.textContent = profileDescriptions[defaultProfile];
        }
        loopsInput.value = data.loops || 10;
        
        // Cập nhật trạng thái chạy/dừng
        startBtn.disabled = data.isRunning;
        stopBtn.disabled = !data.isRunning;
        sessionTimerDiv.textContent = data.isRunning ? 'Bắt đầu phiên...' : '';
        
        if (data.isRunning) {
            statusDiv.textContent = data.status || '...';
            statusDiv.classList.add('running');
            startAndManageTimers(data);
            
            // Hiển thị/ẩn countdown và bộ đếm vòng lặp
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
    
    // --- Khởi tạo và lắng nghe thay đổi ---
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
});