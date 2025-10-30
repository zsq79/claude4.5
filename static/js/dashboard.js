/**
 * Token Dashboard - 前端控制器
 * 基于模块化设计，遵循单一职责原则
 */

class TokenDashboard {
    constructor() {
        this.autoRefreshInterval = null;
        this.isAutoRefreshEnabled = false;
        this.apiBaseUrl = '/api';
        
        this.init();
    }

    /**
     * 初始化Dashboard
     */
    init() {
        this.bindEvents();
        this.bindMainTabEvents();
        this.refreshTokens();
        this.loadSettings();
    }

    /**
     * 绑定主标签页事件
     */
    bindMainTabEvents() {
        const tabBtns = document.querySelectorAll('.main-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchMainTab(btn.dataset.tab));
        });
    }

    /**
     * 切换主标签页
     */
    switchMainTab(tabName) {
        // 切换按钮状态
        document.querySelectorAll('.main-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // 切换内容
        document.querySelectorAll('.main-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeTab = document.getElementById(`${tabName}-tab`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // 加载设置（如果切换到设置页）
        if (tabName === 'settings') {
            this.loadSettings();
        }
    }

    /**
     * 绑定事件处理器 (DRY原则)
     */
    bindEvents() {
        // 手动刷新按钮
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshTokens());
        }

        // 热更新配置按钮
        const reloadBtn = document.querySelector('.reload-config-btn');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => this.openReloadModal());
        }

        // 自动刷新开关
        const switchEl = document.querySelector('.switch');
        if (switchEl) {
            switchEl.addEventListener('click', () => this.toggleAutoRefresh());
        }

        // 模态框相关事件
        this.bindModalEvents();

        // 设置页面事件
        this.bindSettingsEvents();
    }

    /**
     * 绑定设置页面事件
     */
    bindSettingsEvents() {
        const saveBtn = document.querySelector('.save-settings-btn');
        const resetBtn = document.querySelector('.reset-settings-btn');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }
    }

    /**
     * 绑定模态框事件
     */
    bindModalEvents() {
        const modal = document.getElementById('reloadModal');
        const closeBtn = modal?.querySelector('.close');
        const tabBtns = modal?.querySelectorAll('.tab-btn');
        const submitJsonBtn = document.getElementById('submitJson');
        const submitFileBtn = document.getElementById('submitFile');
        const configFileInput = document.getElementById('configFile');

        // 关闭按钮
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeReloadModal());
        }

        // 点击模态框外部关闭
        if (modal) {
            window.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeReloadModal();
                }
            });
        }

        // 标签页切换
        if (tabBtns) {
            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
            });
        }

        // JSON提交
        if (submitJsonBtn) {
            submitJsonBtn.addEventListener('click', () => this.submitJsonConfig());
        }

        // 文件上传
        if (submitFileBtn) {
            submitFileBtn.addEventListener('click', () => this.submitFileConfig());
        }

        // 文件选择（支持多文件）
        if (configFileInput) {
            configFileInput.addEventListener('change', (e) => {
                const files = e.target.files;
                const fileNameEl = document.getElementById('fileName');
                if (fileNameEl) {
                    if (files.length === 0) {
                        fileNameEl.textContent = '';
                    } else if (files.length === 1) {
                        fileNameEl.textContent = `已选择: ${files[0].name}`;
                    } else {
                        fileNameEl.textContent = `已选择 ${files.length} 个文件: ${Array.from(files).map(f => f.name).join(', ')}`;
                    }
                }
            });
        }

        // 拖拽上传支持
        this.bindDragDropEvents();
    }

    /**
     * 绑定拖拽上传事件
     */
    bindDragDropEvents() {
        const fileLabel = document.querySelector('.file-label');
        const configFileInput = document.getElementById('configFile');

        if (!fileLabel || !configFileInput) return;

        // 阻止默认拖拽行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileLabel.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // 拖拽进入 - 添加高亮效果
        ['dragenter', 'dragover'].forEach(eventName => {
            fileLabel.addEventListener(eventName, () => {
                fileLabel.classList.add('drag-over');
            });
        });

        // 拖拽离开 - 移除高亮效果
        ['dragleave', 'drop'].forEach(eventName => {
            fileLabel.addEventListener(eventName, () => {
                fileLabel.classList.remove('drag-over');
            });
        });

        // 文件拖放（支持多文件）
        fileLabel.addEventListener('drop', (e) => {
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                // 检查所有文件是否都是 JSON
                const allJson = Array.from(files).every(f => f.name.endsWith('.json'));
                if (!allJson) {
                    this.showReloadStatus('error', '请只上传 JSON 文件');
                    return;
                }

                // 将文件设置到 input 元素
                configFileInput.files = files;

                // 显示文件名
                const fileNameEl = document.getElementById('fileName');
                if (fileNameEl) {
                    if (files.length === 1) {
                        fileNameEl.textContent = `已选择: ${files[0].name}`;
                    } else {
                        fileNameEl.textContent = `已选择 ${files.length} 个文件: ${Array.from(files).map(f => f.name).join(', ')}`;
                    }
                }
            }
        });
    }

    /**
     * 获取Token数据 - 简单直接 (KISS原则)
     */
    async refreshTokens() {
        const tbody = document.getElementById('tokenTableBody');
        this.showLoading(tbody, '正在刷新Token数据...');
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/tokens`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.updateTokenTable(data);
            this.updateStatusBar(data);
            this.updateLastUpdateTime();
            
        } catch (error) {
            console.error('刷新Token数据失败:', error);
            this.showError(tbody, `加载失败: ${error.message}`);
        }
    }

    /**
     * 更新Token表格 (OCP原则 - 易于扩展新字段)
     */
    updateTokenTable(data) {
        const tbody = document.getElementById('tokenTableBody');
        
        if (!data.tokens || data.tokens.length === 0) {
            this.showError(tbody, '暂无Token数据');
            return;
        }
        
        const rows = data.tokens.map(token => this.createTokenRow(token)).join('');
        tbody.innerHTML = rows;
    }

    /**
     * 创建单个Token行 (SRP原则)
     */
    createTokenRow(token) {
        const statusClass = this.getStatusClass(token);
        const statusText = this.getStatusText(token);
        const isDisabled = token.status === 'disabled';
        
        return `
            <tr data-index="${token.index}">
                <td>${token.user_email || 'unknown'}</td>
                <td><span class="token-preview">${token.token_preview || 'N/A'}</span></td>
                <td>${token.auth_type || 'social'}</td>
                <td>${token.remaining_usage || 0}</td>
                <td>${this.formatDateTime(token.expires_at)}</td>
                <td>${this.formatDateTime(token.last_used)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td class="actions">
                    <button class="action-btn toggle-btn" onclick="dashboard.toggleToken(${token.index})" title="${isDisabled ? '启用' : '停用'}">
                        ${isDisabled ? '▶️' : '⏸️'}
                    </button>
                    <button class="action-btn delete-btn" onclick="dashboard.deleteToken(${token.index})" title="删除">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }

    /**
     * 更新状态栏 (SRP原则)
     */
    updateStatusBar(data) {
        this.updateElement('totalTokens', data.total_tokens || 0);
        this.updateElement('activeTokens', data.active_tokens || 0);
    }

    /**
     * 更新最后更新时间
     */
    updateLastUpdateTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
        this.updateElement('lastUpdate', timeStr);
    }

    /**
     * 切换自动刷新 (ISP原则 - 接口隔离)
     */
    toggleAutoRefresh() {
        const switchEl = document.querySelector('.switch');
        
        if (this.isAutoRefreshEnabled) {
            this.stopAutoRefresh();
            switchEl.classList.remove('active');
        } else {
            this.startAutoRefresh();
            switchEl.classList.add('active');
        }
    }

    /**
     * 启动自动刷新
     */
    startAutoRefresh() {
        this.autoRefreshInterval = setInterval(() => this.refreshTokens(), 30000);
        this.isAutoRefreshEnabled = true;
    }

    /**
     * 停止自动刷新
     */
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
        this.isAutoRefreshEnabled = false;
    }

    /**
     * 工具方法 - 状态判断 (KISS原则)
     */
    getStatusClass(token) {
        if (new Date(token.expires_at) < new Date()) {
            return 'status-expired';
        }
        const remaining = token.remaining_usage || 0;
        if (remaining === 0) return 'status-exhausted';
        if (remaining <= 5) return 'status-low';
        return 'status-active';
    }

    getStatusText(token) {
        if (new Date(token.expires_at) < new Date()) {
            return '已过期';
        }
        const remaining = token.remaining_usage || 0;
        if (remaining === 0) return '已耗尽';
        if (remaining <= 5) return '即将耗尽';
        return '正常';
    }

    /**
     * 工具方法 - 日期格式化 (DRY原则)
     */
    formatDateTime(dateStr) {
        if (!dateStr) return '-';
        
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '-';
            
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch (e) {
            return '-';
        }
    }

    /**
     * UI工具方法 (KISS原则)
     */
    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) element.textContent = content;
    }

    showLoading(container, message) {
        container.innerHTML = `
            <tr>
                <td colspan="8" class="loading">
                    <div class="spinner"></div>
                    ${message}
                </td>
            </tr>
        `;
    }

    showError(container, message) {
        container.innerHTML = `
            <tr>
                <td colspan="8" class="error">
                    ${message}
                </td>
            </tr>
        `;
    }

    /**
     * 切换token状态（启用/停用）
     */
    async toggleToken(index) {
        console.log('toggleToken called with index:', index, 'type:', typeof index);
        
        if (index === undefined || index === null) {
            alert('Token索引无效');
            return;
        }

        if (!confirm('确定要切换此Token的状态吗？')) {
            return;
        }

        try {
            const payload = { index: parseInt(index) };
            console.log('Sending toggle request:', payload);

            const response = await fetch(`${this.apiBaseUrl}/tokens/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            console.log('Toggle response:', result);

            if (response.ok && result.success) {
                // 刷新列表
                await this.refreshTokens();
            } else {
                alert(`操作失败: ${result.error || '未知错误'}`);
            }
        } catch (error) {
            console.error('Toggle error:', error);
            alert(`请求失败: ${error.message}`);
        }
    }

    /**
     * 删除token
     */
    async deleteToken(index) {
        console.log('deleteToken called with index:', index, 'type:', typeof index);
        
        if (index === undefined || index === null) {
            alert('Token索引无效');
            return;
        }

        if (!confirm('确定要删除此Token吗？此操作不可恢复！')) {
            return;
        }

        try {
            const payload = { index: parseInt(index) };
            console.log('Sending delete request:', payload);

            const response = await fetch(`${this.apiBaseUrl}/tokens/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            console.log('Delete response:', result);

            if (response.ok && result.success) {
                // 刷新列表
                await this.refreshTokens();
            } else {
                alert(`删除失败: ${result.error || '未知错误'}`);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert(`请求失败: ${error.message}`);
        }
    }

    /**
     * 模态框操作
     */
    openReloadModal() {
        const modal = document.getElementById('reloadModal');
        if (modal) {
            modal.style.display = 'block';
            this.clearReloadStatus();
        }
    }

    closeReloadModal() {
        const modal = document.getElementById('reloadModal');
        if (modal) {
            modal.style.display = 'none';
            this.clearReloadStatus();
        }
    }

    switchTab(tabName) {
        // 切换标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // 切换内容
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeTab = document.getElementById(`${tabName}-tab`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    /**
     * JSON提交
     */
    async submitJsonConfig() {
        const textarea = document.getElementById('configJson');
        const configText = textarea?.value.trim();

        if (!configText) {
            this.showReloadStatus('error', '请输入配置JSON');
            return;
        }

        // 验证JSON格式
        let configData;
        try {
            configData = JSON.parse(configText);
        } catch (e) {
            this.showReloadStatus('error', `JSON格式错误: ${e.message}`);
            return;
        }

        if (!Array.isArray(configData)) {
            this.showReloadStatus('error', '配置必须是数组格式');
            return;
        }

        this.showReloadStatus('loading', '正在提交配置...');

        try {
            const response = await fetch(`${this.apiBaseUrl}/tokens/reload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: configText
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showReloadStatus('success', `✅ ${result.message || '配置更新成功'}！已加载 ${result.config_count} 个配置`);
                // 3秒后关闭模态框并刷新
                setTimeout(() => {
                    this.closeReloadModal();
                    this.refreshTokens();
                }, 3000);
            } else {
                this.showReloadStatus('error', result.error || '更新失败');
            }
        } catch (error) {
            this.showReloadStatus('error', `请求失败: ${error.message}`);
        }
    }

    /**
     * 文件上传提交（支持多文件智能解析）
     */
    async submitFileConfig() {
        const fileInput = document.getElementById('configFile');
        const files = fileInput?.files;

        if (!files || files.length === 0) {
            this.showReloadStatus('error', '请选择文件');
            return;
        }

        this.showReloadStatus('loading', '正在解析文件...');

        try {
            // 智能解析文件
            const parsedConfigs = await this.parseMultipleFiles(files);
            
            if (parsedConfigs.length === 0) {
                this.showReloadStatus('error', '未能从文件中解析出有效配置');
                return;
            }

            this.showReloadStatus('loading', `正在添加 ${parsedConfigs.length} 个配置...`);

            // 直接发送解析后的 JSON
            const response = await fetch(`${this.apiBaseUrl}/tokens/reload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(parsedConfigs)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showReloadStatus('success', `✅ ${result.message || '配置添加成功'}！已添加 ${result.config_count} 个配置`);
                // 3秒后关闭模态框并刷新
                setTimeout(() => {
                    this.closeReloadModal();
                    this.refreshTokens();
                }, 3000);
            } else {
                this.showReloadStatus('error', result.error || '添加失败');
            }
        } catch (error) {
            this.showReloadStatus('error', `处理失败: ${error.message}`);
        }
    }

    /**
     * 智能解析多个文件
     */
    async parseMultipleFiles(files) {
        const fileArray = Array.from(files);
        const allData = [];

        // 读取所有文件
        for (const file of fileArray) {
            try {
                const content = await this.readFileAsText(file);
                const json = JSON.parse(content);
                allData.push({ name: file.name, data: json });
            } catch (error) {
                console.error(`解析文件 ${file.name} 失败:`, error);
                throw new Error(`文件 ${file.name} 格式错误: ${error.message}`);
            }
        }

        // 智能识别文件类型并合并
        return this.smartMergeConfigs(allData);
    }

    /**
     * 智能合并配置文件
     */
    smartMergeConfigs(fileDataList) {
        const configs = [];
        
        // 查找 kiro-auth-token.json 文件
        const kiroTokenFile = fileDataList.find(f => 
            f.name.includes('kiro-auth-token') || 
            (f.data.refreshToken && f.data.authMethod)
        );

        // 查找 client 配置文件（以哈希命名的文件）
        const clientFiles = fileDataList.filter(f => 
            f.data.clientId && f.data.clientSecret && f !== kiroTokenFile
        );

        // 查找标准配置文件（数组格式）
        const standardConfigs = fileDataList.filter(f => Array.isArray(f.data));

        // 处理标准配置文件
        for (const file of standardConfigs) {
            configs.push(...file.data);
        }

        // 处理 Kiro token 文件组合
        if (kiroTokenFile) {
            const kiroData = kiroTokenFile.data;
            
            // 查找匹配的 client 配置
            let clientData = null;
            if (kiroData.clientIdHash && clientFiles.length > 0) {
                // 通过哈希匹配
                clientData = clientFiles.find(f => 
                    f.name.includes(kiroData.clientIdHash)
                )?.data || clientFiles[0]?.data;
            } else if (clientFiles.length > 0) {
                // 直接使用第一个 client 配置
                clientData = clientFiles[0].data;
            }

            if (kiroData.authMethod === 'IdC' && clientData) {
                // IdC 认证：合并 kiro token 和 client 配置
                configs.push({
                    auth: 'IdC',
                    refreshToken: kiroData.refreshToken,
                    clientId: clientData.clientId,
                    clientSecret: clientData.clientSecret
                });
            } else if (kiroData.authMethod === 'Social') {
                // Social 认证
                configs.push({
                    auth: 'Social',
                    refreshToken: kiroData.refreshToken
                });
            } else if (kiroData.refreshToken) {
                // 兼容其他格式，根据是否有 client 信息判断
                if (clientData) {
                    configs.push({
                        auth: 'IdC',
                        refreshToken: kiroData.refreshToken,
                        clientId: clientData.clientId,
                        clientSecret: clientData.clientSecret
                    });
                } else {
                    // 默认当作 Social
                    configs.push({
                        auth: 'Social',
                        refreshToken: kiroData.refreshToken
                    });
                }
            }
        }

        // 去重（基于 refreshToken）
        const uniqueConfigs = [];
        const seen = new Set();
        for (const config of configs) {
            if (!seen.has(config.refreshToken)) {
                seen.add(config.refreshToken);
                uniqueConfigs.push(config);
            }
        }

        return uniqueConfigs;
    }

    /**
     * 读取文件为文本
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }

    /**
     * 显示状态消息
     */
    showReloadStatus(type, message) {
        const statusEl = document.getElementById('reloadStatus');
        if (!statusEl) return;

        statusEl.className = `reload-status ${type}`;
        statusEl.textContent = message;
        statusEl.style.display = 'block';
    }

    clearReloadStatus() {
        const statusEl = document.getElementById('reloadStatus');
        if (statusEl) {
            statusEl.style.display = 'none';
            statusEl.textContent = '';
        }
        
        // 清空输入
        const textarea = document.getElementById('configJson');
        if (textarea) textarea.value = '';
        
        const fileInput = document.getElementById('configFile');
        if (fileInput) fileInput.value = '';
        
        const fileName = document.getElementById('fileName');
        if (fileName) fileName.textContent = '';
    }

    /**
     * 加载设置
     */
    async loadSettings() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/settings`);
            if (response.ok) {
                const settings = await response.json();
                this.fillSettingsForm(settings);
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    /**
     * 填充设置表单
     */
    fillSettingsForm(settings) {
        const fields = {
            'clientToken': settings.KIRO_CLIENT_TOKEN || '',
            'stealthMode': settings.STEALTH_MODE || 'true',
            'headerStrategy': settings.HEADER_STRATEGY || 'real_simulation',
            'http2Mode': settings.STEALTH_HTTP2_MODE || 'auto',
            'port': settings.PORT || '8080',
            'ginMode': settings.GIN_MODE || 'release',
            'logLevel': settings.LOG_LEVEL || 'info',
            'logFormat': settings.LOG_FORMAT || 'json',
            'logConsole': settings.LOG_CONSOLE || 'true',
            'maxToolLength': settings.MAX_TOOL_DESCRIPTION_LENGTH || '10000'
        };

        for (const [id, value] of Object.entries(fields)) {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        }
    }

    /**
     * 保存设置
     */
    async saveSettings() {
        const statusEl = document.getElementById('settingsStatus');
        
        const settings = {
            KIRO_CLIENT_TOKEN: document.getElementById('clientToken')?.value || '',
            STEALTH_MODE: document.getElementById('stealthMode')?.value || 'true',
            HEADER_STRATEGY: document.getElementById('headerStrategy')?.value || 'real_simulation',
            STEALTH_HTTP2_MODE: document.getElementById('http2Mode')?.value || 'auto',
            PORT: document.getElementById('port')?.value || '8080',
            GIN_MODE: document.getElementById('ginMode')?.value || 'release',
            LOG_LEVEL: document.getElementById('logLevel')?.value || 'info',
            LOG_FORMAT: document.getElementById('logFormat')?.value || 'json',
            LOG_CONSOLE: document.getElementById('logConsole')?.value || 'true',
            MAX_TOOL_DESCRIPTION_LENGTH: document.getElementById('maxToolLength')?.value || '10000'
        };

        statusEl.className = 'settings-status loading';
        statusEl.textContent = '正在保存配置...';

        try {
            const response = await fetch(`${this.apiBaseUrl}/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                statusEl.className = 'settings-status success';
                statusEl.textContent = '✅ 配置保存成功！' + (result.restart_required ? '（部分配置需要重启服务生效）' : '');
                
                setTimeout(() => {
                    statusEl.style.display = 'none';
                }, 5000);
            } else {
                statusEl.className = 'settings-status error';
                statusEl.textContent = result.error || '保存失败';
            }
        } catch (error) {
            statusEl.className = 'settings-status error';
            statusEl.textContent = `保存失败: ${error.message}`;
        }
    }

    /**
     * 重置设置
     */
    resetSettings() {
        if (!confirm('确定要重置所有设置为默认值吗？')) {
            return;
        }

        const defaults = {
            'clientToken': '',
            'stealthMode': 'true',
            'headerStrategy': 'real_simulation',
            'http2Mode': 'auto',
            'port': '8080',
            'ginMode': 'release',
            'logLevel': 'info',
            'logFormat': 'json',
            'logConsole': 'true',
            'maxToolLength': '10000'
        };

        for (const [id, value] of Object.entries(defaults)) {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        }

        const statusEl = document.getElementById('settingsStatus');
        statusEl.className = 'settings-status success';
        statusEl.textContent = '已重置为默认值（点击"保存配置"以应用）';
        
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }
}

// DOM加载完成后初始化 (依赖注入原则)
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new TokenDashboard();
});