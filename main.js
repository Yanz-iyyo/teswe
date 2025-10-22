document.addEventListener('DOMContentLoaded', () => {
    const App = {
        state: {
            isSpamming: false,
            isMonitoring: false,
            currentTab: 'text',
            mediaMode: 'upload',
            selectedFile: null,
            spamIntervalId: null,
            monitorOffset: 0,
        },
        elements: {
            botToken: document.getElementById('botToken'),
            botInfoPanel: document.getElementById('botInfoPanel'),
            botPhoto: document.getElementById('botPhoto'),
            botNameInfo: document.getElementById('botNameInfo'),
            botUsername: document.getElementById('botUsername'),
            editBotName: document.getElementById('editBotName'),
            editBotBio: document.getElementById('editBotBio'),
            saveProfileBtn: document.getElementById('saveProfileBtn'),
            newProfilePhotoInput: document.getElementById('newProfilePhotoInput'),
            savePhotoBtn: document.getElementById('savePhotoBtn'),
            statusLog: document.getElementById('statusLog'),
            clearLogBtn: document.getElementById('clearLogBtn'),
            chatId: document.getElementById('chatId'),
            mediaTabs: document.getElementById('media-tabs'),
            caption: document.getElementById('caption'),
            mediaInputArea: document.getElementById('media-input-area'),
            uploadModeBtn: document.getElementById('upload-mode-btn'),
            urlModeBtn: document.getElementById('url-mode-btn'),
            uploadContainer: document.getElementById('upload-container'),
            urlContainer: document.getElementById('url-container'),
            fileUpload: document.getElementById('fileUpload'),
            uploadText: document.getElementById('upload-text'),
            mediaUrl: document.getElementById('mediaUrl'),
            sendOnceBtn: document.getElementById('sendOnceBtn'),
            startSpamBtn: document.getElementById('startSpamBtn'),
            stopSpamBtn: document.getElementById('stopSpamBtn'),
            unstoppableSpam: document.getElementById('unstoppableSpam'),
            spamCount: document.getElementById('spamCount'),
            spamDelay: document.getElementById('spamDelay'),
            messageMonitor: document.getElementById('messageMonitor'),
            clearMonitorBtn: document.getElementById('clearMonitorBtn'),
            themeToggle: document.getElementById('theme-toggle'),
            themeIcon: document.getElementById('theme-icon'),
            toastContainer: document.getElementById('toast-container'),
        },
        init() {
            this.setupEventListeners();
            this.applyTheme(localStorage.getItem('theme') !== 'light');
            this.log('Panel Platinum siap digunakan.', 'info');
        },
        async callApi(method, params = {}, file = null, fileField = null) {
            const token = this.elements.botToken.value.trim();
            if (!token) return null;
            const url = `https://api.telegram.org/bot${token}/${method}`;
            const options = { method: 'POST' };
            if (file) {
                const formData = new FormData();
                Object.keys(params).forEach(key => formData.append(key, params[key]));
                const mediaKey = fileField || (this.state.currentTab === 'photo' ? 'photo' : this.state.currentTab === 'video' ? 'video' : 'document');
                formData.append(mediaKey, file, file.name);
                options.body = formData;
            } else {
                options.headers = { 'Content-Type': 'application/json' };
                options.body = JSON.stringify(params);
            }
            try {
                const response = await fetch(url, options);
                const data = await response.json();
                if (!data.ok) throw new Error(data.description);
                return data.result;
            } catch (error) {
                this.log(`API Error: ${error.message}`, 'error');
                if (method !== 'getUpdates') this.showToast(`Error: ${error.message}`, 'error');
                return null;
            }
        },
        log(message, type = 'info') {
            const { statusLog } = this.elements;
            if (statusLog.querySelector('p')?.textContent.includes('Menunggu')) statusLog.innerHTML = '';
            const typeColor = { success: 'text-green-400', error: 'text-red-400', warn: 'text-yellow-400', info: 'text-sky-400' }[type];
            statusLog.innerHTML += `<div><span class="text-slate-500">[${new Date().toLocaleTimeString()}]</span> <span class="${typeColor}">${message}</span></div>`;
            statusLog.scrollTop = statusLog.scrollHeight;
        },
        showToast(message, type = 'success') {
            const { toastContainer } = this.elements;
            const toast = document.createElement('div');
            const icon = type === 'success' ? 'ph-check-circle' : 'ph-x-circle';
            const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
            toast.className = `toast flex items-center gap-3 ${bgColor} text-white font-bold py-3 px-5 rounded-lg shadow-xl`;
            toast.innerHTML = `<i class="ph ${icon} text-2xl"></i><span>${message}</span>`;
            toastContainer.appendChild(toast);
            setTimeout(() => {
                toast.classList.add('removing');
                toast.addEventListener('animationend', () => toast.remove());
            }, 3000);
        },
        applyTheme(isDark) {
            document.documentElement.classList.toggle('dark', isDark);
            this.elements.themeIcon.className = `ph-duotone ph-${isDark ? 'moon' : 'sun'} text-2xl`;
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        },
        setButtonLoading(btn, isLoading, defaultText = '') {
            btn.disabled = isLoading;
            if (isLoading) {
                btn.dataset.originalContent = btn.innerHTML;
                btn.innerHTML = '<i class="spinner w-5 h-5 border-2 border-white/50 border-t-white rounded-full"></i>';
            } else {
                btn.innerHTML = btn.dataset.originalContent || defaultText;
            }
        },
        switchTab(tabName) {
            this.state.currentTab = tabName;
            this.elements.mediaTabs.querySelectorAll('.tab-button').forEach(btn => {
                const isSelected = btn.dataset.tab === tabName;
                btn.classList.toggle('bg-accent', isSelected);
                btn.classList.toggle('text-white', isSelected);
                btn.classList.toggle('bg-input-bg', !isSelected);
                btn.classList.toggle('text-text-muted', !isSelected);
            });
            this.elements.mediaInputArea.classList.toggle('hidden', tabName === 'text');
            this.elements.caption.placeholder = tabName === 'text' ? 'Tulis pesan Anda di sini...' : 'Tulis caption (opsional)...';
        },
        switchMediaMode(mode) {
            this.state.mediaMode = mode;
            const { uploadModeBtn, urlModeBtn, uploadContainer, urlContainer } = this.elements;
            const isUpload = mode === 'upload';
            uploadModeBtn.classList.toggle('bg-accent', isUpload);
            uploadModeBtn.classList.toggle('text-white', isUpload);
            uploadModeBtn.classList.toggle('text-text-muted', !isUpload);
            urlModeBtn.classList.toggle('bg-accent', !isUpload);
            urlModeBtn.classList.toggle('text-white', !isUpload);
            urlModeBtn.classList.toggle('text-text-muted', isUpload);
            uploadContainer.classList.toggle('hidden', !isUpload);
            urlContainer.classList.toggle('hidden', isUpload);
        },
        async handleBotTokenChange() {
            this.log('Memverifikasi token...', 'info');
            const botInfo = await this.callApi('getMe');
            if (!botInfo) {
                this.log('Token tidak valid atau gagal terhubung.', 'error');
                this.elements.botInfoPanel.classList.add('hidden');
                return;
            }
            this.log('Token valid. Mengambil detail profil...', 'success');
            const [descriptionInfo, profilePhotos] = await Promise.all([
                this.callApi('getMyDescription'),
                this.callApi('getUserProfilePhotos', { user_id: botInfo.id, limit: 1 })
            ]);
            this.elements.botNameInfo.textContent = botInfo.first_name;
            this.elements.botUsername.textContent = `@${botInfo.username}`;
            this.elements.editBotName.value = botInfo.first_name;
            this.elements.editBotBio.value.trim() = descriptionInfo?.description || '';
            this.elements.botPhoto.style.backgroundImage = 'none';
            if (profilePhotos?.total_count > 0) {
                const fileId = profilePhotos.photos[0][0].file_id;
                const fileInfo = await this.callApi('getFile', { file_id: fileId });
                if (fileInfo) {
                    const photoUrl = `https://api.telegram.org/file/bot${this.elements.botToken.value.trim()}/${fileInfo.file_path}`;
                    this.elements.botPhoto.style.backgroundImage = `url(${photoUrl})`;
                }
            }
            this.elements.botInfoPanel.classList.remove('hidden');
            if (!this.state.isMonitoring) this.startMonitoring();
        },
        async handleSaveProfile() {
            this.setButtonLoading(this.elements.saveProfileBtn, true, 'Simpan Teks Profil');
            const newName = this.elements.editBotName.value.trim();
            const newBio = this.elements.editBotBio.value.trim();
            this.log('Menyimpan perubahan nama/bio...', 'info');
            const [nameResult, bioResult] = await Promise.all([
                this.callApi('setMyName', { name: newName }),
                this.callApi('setMyDescription', { description: newBio })
            ]);
            if (nameResult || bioResult) {
                this.showToast('Profil teks berhasil diperbarui!', 'success');
                await this.handleBotTokenChange();
            }
            this.setButtonLoading(this.elements.saveProfileBtn, false);
        },
        async handleSetProfilePhoto() {
            const { newProfilePhotoInput, savePhotoBtn } = this.elements;
            const file = newProfilePhotoInput.files[0];
            if (!file) {
                this.showToast('Pilih file foto terlebih dahulu!', 'error');
                return;
            }
            this.setButtonLoading(savePhotoBtn, true, 'Update Foto');
            this.log('Mengunggah foto profil baru...', 'info');
            const result = await this.callApi('setMyProfilePhoto', {}, file, 'photo');
            if (result) {
                this.showToast('Foto profil berhasil diperbarui!', 'success');
                this.log('Memuat ulang info bot...', 'info');
                await this.handleBotTokenChange();
            }
            this.setButtonLoading(savePhotoBtn, false);
            newProfilePhotoInput.value = '';
        },
        async startMonitoring() {
            if (this.state.isMonitoring) return;
            this.state.isMonitoring = true;
            this.log('Monitor pesan diaktifkan.', 'info');
            if (this.elements.messageMonitor.querySelector('p')?.textContent.includes('Menunggu')) this.elements.messageMonitor.innerHTML = '';
            while (this.state.isMonitoring) {
                const updates = await this.callApi('getUpdates', { offset: this.state.monitorOffset, timeout: 30 });
                if (!this.state.isMonitoring) break;
                if (updates) {
                    updates.forEach(update => {
                        this.state.monitorOffset = update.update_id + 1;
                        const msg = update.message || update.edited_message;
                        if (msg) {
                            const from = msg.from ? `${msg.from.first_name} (@${msg.from.username || 'N/A'})` : (msg.chat.title || 'Unknown Chat');
                            const text = msg.text || msg.caption || `[Media: ${Object.keys(msg).find(k => ['photo','video','document','sticker'].includes(k)) || 'unknown'}]`;
                            const msgEntry = document.createElement('div');
                            msgEntry.className = 'p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs';
                            msgEntry.innerHTML = `<div class="flex justify-between items-center"><strong class="text-sky-500">${from}</strong><span class="text-text-muted text-[10px]">${new Date(msg.date * 1000).toLocaleTimeString()}</span></div><p class="mt-1">${text}</p><div class="text-right mt-1"><button class="btn reply-btn text-xs bg-sky-500 text-white px-2 py-1 rounded" data-chat-id="${msg.chat.id}">Balas</button></div>`;
                            this.elements.messageMonitor.appendChild(msgEntry);
                        }
                    });
                    if (updates.length > 0) this.elements.messageMonitor.scrollTop = this.elements.messageMonitor.scrollHeight;
                } else {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
            this.log('Monitor pesan dihentikan.', 'warn');
        },
        getRequestPayload() {
            const chatId = this.elements.chatId.value.trim();
            const caption = this.elements.caption.value.trim();
            if (!chatId) {
                this.showToast('Chat ID wajib diisi!', 'error');
                return null;
            }
            let method, params = { chat_id: chatId }, file = this.state.selectedFile;
            params.caption = caption;
            switch (this.state.currentTab) {
                case 'text':
                    method = 'sendMessage';
                    params.text = caption;
                    if (!params.text) {
                        this.showToast('Pesan tidak boleh kosong!', 'error');
                        return null;
                    }
                    delete params.caption;
                    break;
                case 'photo':
                    method = 'sendPhoto';
                    break;
                case 'video':
                    method = 'sendVideo';
                    break;
                case 'file':
                    method = 'sendDocument';
                    break;
            }
            if (this.state.currentTab !== 'text') {
                if (this.state.mediaMode === 'url') {
                    const url = this.elements.mediaUrl.value.trim();
                    if (!url) {
                        this.showToast('URL media tidak boleh kosong!', 'error');
                        return null;
                    }
                    const mediaKey = this.state.currentTab === 'file' ? 'document' : this.state.currentTab;
                    params[mediaKey] = url;
                    file = null;
                } else if (!file) {
                    this.showToast('File belum dipilih!', 'error');
                    return null;
                }
            }
            return { method, params, file };
        },
        async handleSendOnce() {
            const payload = this.getRequestPayload();
            if (!payload) return;
            this.setButtonLoading(this.elements.sendOnceBtn, true, '<span class="btn-text">Kirim Sekali</span>');
            this.log(`Mengirim ${this.state.currentTab} sekali...`, 'info');
            const result = await this.callApi(payload.method, payload.params, payload.file);
            if (result) {
                this.log('Pengiriman tunggal berhasil!', 'success');
                this.showToast('Berhasil terkirim!', 'success');
            }
            this.setButtonLoading(this.elements.sendOnceBtn, false);
        },
        startSpam() {
            const payload = this.getRequestPayload();
            if (!payload) return;
            const count = parseInt(this.elements.spamCount.value) || 100;
            const delay = parseInt(this.elements.spamDelay.value) || 500;
            this.state.isSpamming = true;
            this.updateSpamButtons();
            this.log(`Memulai spam ${this.state.currentTab} (Target: ${count}, Jeda: ${delay}ms)...`, 'warn');
            let counter = 0;
            this.state.spamIntervalId = setInterval(async () => {
                if (!this.state.isSpamming) {
                    clearInterval(this.state.spamIntervalId);
                    return;
                }
                counter++;
                const result = await this.callApi(payload.method, payload.params, payload.file);
                if (result) {
                    this.log(`Spam ke-${counter} berhasil.`, 'success');
                } else {
                    this.log(`Gagal mengirim spam ke-${counter}. Menghentikan...`, 'error');
                    this.stopSpam();
                    return;
                }
                if (!this.elements.unstoppableSpam.checked && counter >= count) {
                    this.stopSpam();
                    this.log(`Batas spam (${count}x) tercapai. Spam dihentikan.`, 'info');
                }
            }, delay);
        },
        stopSpam() {
            if (!this.state.isSpamming) return;
            clearInterval(this.state.spamIntervalId);
            this.state.isSpamming = false;
            this.updateSpamButtons();
            this.log('Spam dihentikan oleh pengguna.', 'warn');
        },
        updateSpamButtons() {
            const { startSpamBtn, stopSpamBtn, sendOnceBtn } = this.elements;
            const isSpamming = this.state.isSpamming;
            startSpamBtn.disabled = isSpamming;
            sendOnceBtn.disabled = isSpamming;
            startSpamBtn.classList.toggle('opacity-50', isSpamming);
            sendOnceBtn.classList.toggle('opacity-50', isSpamming);
            stopSpamBtn.disabled = !isSpamming;
            stopSpamBtn.classList.toggle('opacity-50', !isSpamming);
            stopSpamBtn.classList.toggle('cursor-not-allowed', !isSpamming);
        },
        setupEventListeners() {
            this.elements.botToken.addEventListener('change', () => this.handleBotTokenChange());
            this.elements.saveProfileBtn.addEventListener('click', () => this.handleSaveProfile());
            this.elements.savePhotoBtn.addEventListener('click', () => this.handleSetProfilePhoto());
            this.elements.clearLogBtn.addEventListener('click', () => {
                this.elements.statusLog.innerHTML = '<p class="text-text-muted">Log dibersihkan.</p>';
            });
            this.elements.clearMonitorBtn.addEventListener('click', () => {
                this.elements.messageMonitor.innerHTML = '<p class="text-text-muted">Monitor dibersihkan.</p>';
            });
            this.elements.themeToggle.addEventListener('click', () => this.applyTheme(!document.documentElement.classList.contains('dark')));
            this.elements.mediaTabs.querySelectorAll('.tab-button').forEach(btn => btn.addEventListener('click', () => this.switchTab(btn.dataset.tab)));
            this.elements.uploadModeBtn.addEventListener('click', () => this.switchMediaMode('upload'));
            this.elements.urlModeBtn.addEventListener('click', () => this.switchMediaMode('url'));
            this.elements.fileUpload.addEventListener('change', e => {
                if (e.target.files.length > 0) {
                    this.state.selectedFile = e.target.files[0];
                    this.elements.uploadText.textContent = this.state.selectedFile.name;
                    this.log(`File dipilih: ${this.state.selectedFile.name}`, 'info');
                }
            });
            this.elements.sendOnceBtn.addEventListener('click', () => this.handleSendOnce());
            this.elements.startSpamBtn.addEventListener('click', () => this.startSpam());
            this.elements.stopSpamBtn.addEventListener('click', () => this.stopSpam());
            this.elements.messageMonitor.addEventListener('click', (e) => {
                if (e.target.classList.contains('reply-btn')) {
                    const targetChatId = e.target.dataset.chatId;
                    this.elements.chatId.value = targetChatId;
                    this.log(`Mode Balasan Aktif: Menargetkan Chat ID ${targetChatId}`, 'warn');
                    this.showToast(`Mode balasan aktif!`, 'success');
                    this.elements.caption.focus();
                }
            });
        },
    };
    App.init();
});