class WASAFlightGUI {
    constructor() {
        // コンポーネント
        this.dataManager = null;
        this.pfdWidget = null;
        this.mapManager = null;
        this.graphManager = null;
        
        // DOM要素
        this.dataElements = {};
        this.controlElements = {};
        
        // 状態
        this.isInitialized = false;
        this.isLoading = true;
        
        this.init();
    }
    
    async init() {
        try {
            console.log('WASA Flight GUI: 初期化開始...');
            
            // ローディング表示
            this.showLoading(true);
            
            // DOM要素初期化
            this.initializeElements();
            
            // コンポーネント初期化
            await this.initializeComponents();
            
            // イベントハンドラー設定
            this.setupEventHandlers();
            
            // ウィンドウイベント設定
            this.setupWindowEvents();
            
            // 初期化完了
            this.isInitialized = true;
            
            // ローディング非表示
            this.showLoading(false);
            
            console.log('WASA Flight GUI: 初期化完了');
            
        } catch (error) {
            console.error('初期化エラー:', error);
            this.showError('アプリケーションの初期化に失敗しました');
        }
    }
    
    // DOM要素初期化
    initializeElements() {
        // データ表示要素
        this.dataElements = {
            date: document.getElementById('date-value'),
            time: document.getElementById('time-value'),
            latitude: document.getElementById('latitude-value'),
            longitude: document.getElementById('longitude-value'),
            altitude: document.getElementById('altitude-value'),
            rpm: document.getElementById('rpm-value'),
            tacho: document.getElementById('tacho-value'),
            groundSpeed: document.getElementById('ground-speed-value'),
            gpsAltitude: document.getElementById('gps-altitude-value'),
            gpsCourse: document.getElementById('gps-course-value'),
            temperature: document.getElementById('temperature-value'),
            elevatorAngle: document.getElementById('elevator-angle-value'),
            rudderTrim: document.getElementById('rudder-trim-value'),
            rudderAngle: document.getElementById('rudder-angle-value'),
            roll: document.getElementById('roll-value'),
            pitch: document.getElementById('pitch-value'),
            yaw: document.getElementById('yaw-value')
        };
        
        // コントロール要素
        this.controlElements = {
            mapSelector: document.getElementById('map-selector'),
            trajStartBtn: document.getElementById('traj-start-btn'),
            trajStopBtn: document.getElementById('traj-stop-btn'),
            trajResetBtn: document.getElementById('traj-reset-btn')
        };
        
        // 要素存在チェック
        const missingElements = [];
        Object.keys(this.dataElements).forEach(key => {
            if (!this.dataElements[key]) {
                missingElements.push(`data-element: ${key}`);
            }
        });
        Object.keys(this.controlElements).forEach(key => {
            if (!this.controlElements[key]) {
                missingElements.push(`control-element: ${key}`);
            }
        });
        
        if (missingElements.length > 0) {
            console.warn('Missing DOM elements:', missingElements);
        }
    }
    
    // コンポーネント初期化
    async initializeComponents() {
        console.log('コンポーネント初期化中...');
        
        // データマネージャー初期化
        this.dataManager = new WASADataManager();
        this.dataManager.onDataUpdate = (data) => this.handleDataUpdate(data);
        this.dataManager.onError = (error) => this.handleError(error);
        this.dataManager.init();
        
        // PFDウィジェット初期化
        this.pfdWidget = new WASAPFDWidget('pfd-canvas');
        
        // 地図マネージャー初期化
        this.mapManager = new WASAMapManager('map');
        
        // 琵琶湖3点マーカー
        this.biwakoPoints = [
            { lat: WASAMapManager.points.P.lat, lon: WASAMapManager.points.P.lon, color: 'red', label: 'P' },
            { lat: WASAMapManager.points.T.lat, lon: WASAMapManager.points.T.lon, color: 'green', label: 'T' },
            { lat: WASAMapManager.points.O.lat, lon: WASAMapManager.points.O.lon, color: 'green', label: 'O' },
            { lat: WASAMapManager.points.K.lat, lon: WASAMapManager.points.K.lon, color: 'blue', label: 'K' }
        ];
        // 初期地図がbiwakoならマーカー追加
        if (this.mapManager.currentMapKey === 'biwako') {
            this.mapManager.addCustomMarkers(this.biwakoPoints);
        }
        
        // 地図表示確認（デバッグ用）
        setTimeout(() => {
            this.mapManager.checkCurrentMapBounds();
        }, 1000);
        
        // グラフマネージャー初期化
        this.graphManager = new WASAGraphManager();
        
        // 初期化待機
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('コンポーネント初期化完了');
    }
    
    // イベントハンドラー設定
    setupEventHandlers() {
        // イベントリスナー設定
        document.getElementById('map-selector').addEventListener('change', (e) => {
            this.mapManager.changeMap(e.target.value);
            // biwako選択時のみマーカー追加
            if (e.target.value === 'biwako') {
                this.mapManager.addCustomMarkers(this.biwakoPoints);
            } else {
                this.mapManager.clearCustomMarkers();
            }
        });
        
        // 軌跡コントロール
        document.getElementById('trajectory-btn').addEventListener('click', () => {
            this.mapManager.startTrajectory();
        });
        
        document.getElementById('trajectory-stop-btn').addEventListener('click', () => {
            this.mapManager.stopTrajectory();
        });
        
        document.getElementById('trajectory-reset-btn').addEventListener('click', () => {
            this.mapManager.resetTrajectory();
        });
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
    }
    
    // ウィンドウイベント設定
    setupWindowEvents() {
        // リサイズイベント
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // ページ離脱時の処理
        window.addEventListener('beforeunload', () => {
            this.destroy();
        });
    }
    
    // データ更新処理
    handleDataUpdate(data) {
        if (!this.isInitialized) return;
        
        try {
            // UI表示更新
            this.updateDataDisplay(data);
            
            // PFD更新
            this.updatePFD(data);
            
            // 地図更新
            this.updateMap(data);
            
            // グラフ更新
            this.updateGraphs();
            
        } catch (error) {
            console.error('データ更新エラー:', error);
        }
    }
    
    // UI表示更新
    updateDataDisplay(data) {
        // 基本データ
        if (this.dataElements.date) this.dataElements.date.textContent = data.date;
        if (this.dataElements.time) this.dataElements.time.textContent = data.time;
        if (this.dataElements.latitude) this.dataElements.latitude.textContent = data.latitude.toFixed(6);
        if (this.dataElements.longitude) this.dataElements.longitude.textContent = data.longitude.toFixed(6);
        if (this.dataElements.altitude) this.dataElements.altitude.textContent = data.altitude.toFixed(2);
        if (this.dataElements.rpm) this.dataElements.rpm.textContent = data.rpm;
        
        // 速度データ
        if (this.dataElements.tacho) this.dataElements.tacho.textContent = data.tacho.toFixed(1);
        if (this.dataElements.groundSpeed) this.dataElements.groundSpeed.textContent = data.groundSpeed.toFixed(1);
        if (this.dataElements.gpsAltitude) this.dataElements.gpsAltitude.textContent = data.gpsAltitude.toFixed(1);
        if (this.dataElements.gpsCourse) this.dataElements.gpsCourse.textContent = data.gpsCourse.toFixed(1);
        if (this.dataElements.temperature) this.dataElements.temperature.textContent = data.temperature.toFixed(1);
        
        // 制御面データ
        if (this.dataElements.elevatorAngle) this.dataElements.elevatorAngle.textContent = data.elevatorAngle.toFixed(1);
        if (this.dataElements.rudderTrim) this.dataElements.rudderTrim.textContent = data.rudderTrim.toFixed(1);
        if (this.dataElements.rudderAngle) this.dataElements.rudderAngle.textContent = data.rudderAngle.toFixed(1);
        
        // 姿勢データ
        if (this.dataElements.roll) this.dataElements.roll.textContent = data.roll.toFixed(2);
        if (this.dataElements.pitch) this.dataElements.pitch.textContent = data.pitch.toFixed(2);
        if (this.dataElements.yaw) this.dataElements.yaw.textContent = data.yaw.toFixed(2);
    }
    
    // PFD更新
    updatePFD(data) {
        if (this.pfdWidget) {
            this.pfdWidget.updateData(
                data.roll,           // ロール
                data.pitch,          // ピッチ
                data.altitude,       // 高度（海抜高度ではなく普通の高度）
                data.tacho,          // 対気速度
                data.gpsCourse,      // 方位
                0.0,                 // 垂直速度（未実装）
                0.0                  // 旋回率（未実装）
            );
        }
    }
    
    // 地図更新
    updateMap(data) {
        if (this.mapManager && data.latitude !== 0 && data.longitude !== 0) {
            this.mapManager.updatePosition(data.latitude, data.longitude, data.gpsCourse);
            this.updateDistance();
        }
    }
    
    // グラフ更新
    updateGraphs() {
        if (this.graphManager && this.dataManager) {
            const historyData = this.dataManager.getHistoryData();
            this.graphManager.updateGraphs(historyData);
        }
    }
    
    // キーボードイベント処理
    handleKeydown(event) {
        switch(event.key) {
            case 'r':
            case 'R':
                // 軌跡リセット
                if (event.ctrlKey) {
                    this.mapManager.resetTrajectory();
                    event.preventDefault();
                }
                break;
            case 's':
            case 'S':
                // データ保存
                if (event.ctrlKey) {
                    this.exportData();
                    event.preventDefault();
                }
                break;
            case 'c':
            case 'C':
                // グラフクリア
                if (event.ctrlKey && event.shiftKey) {
                    this.graphManager.clearAllGraphs();
                    event.preventDefault();
                }
                break;
            case 'z':
            case 'Z':
                // ゼロリセット（姿勢）
                if (event.ctrlKey) {
                    this.dataManager.resetMemoryValues();
                    event.preventDefault();
                }
                break;
        }
    }
    
    // リサイズ処理
    handleResize() {
        if (this.mapManager) {
            this.mapManager.invalidateSize();
        }
        if (this.graphManager) {
            this.graphManager.handleResize();
        }
        if (this.pfdWidget) {
            this.pfdWidget.resizeCanvas();
        }
    }
    
    // エラー処理
    handleError(error) {
        console.error('アプリケーションエラー:', error);
        this.showError(error.message || 'エラーが発生しました');
    }
    
    // ローディング表示制御
    showLoading(show) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            if (show) {
                loadingElement.classList.remove('hidden');
            } else {
                loadingElement.classList.add('hidden');
            }
        }
        this.isLoading = show;
    }
    
    // エラー表示
    showError(message) {
        console.error('Error:', message);
        // 簡易的なエラー表示（実装に応じてカスタマイズ可能）
        alert(`エラー: ${message}`);
    }
    
    // データエクスポート
    exportData() {
        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                currentData: this.dataManager.getCurrentData(),
                historyData: this.dataManager.getHistoryData(),
                trajectoryData: this.mapManager.getTrajectoryData(),
                graphData: JSON.parse(this.graphManager.exportGraphData())
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `wasa_flight_data_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            link.click();
            
            console.log('データエクスポート完了');
        } catch (error) {
            console.error('データエクスポートエラー:', error);
            this.showError('データエクスポートに失敗しました');
        }
    }
    
    // データインポート
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (data.graphData) {
                this.graphManager.importGraphData(JSON.stringify(data.graphData));
            }
            
            console.log('データインポート完了');
        } catch (error) {
            console.error('データインポートエラー:', error);
            this.showError('データインポートに失敗しました');
        }
    }
    
    // アプリケーション情報取得
    getApplicationInfo() {
        return {
            version: '1.0.0',
            components: {
                dataManager: !!this.dataManager,
                pfdWidget: !!this.pfdWidget,
                mapManager: !!this.mapManager,
                graphManager: !!this.graphManager
            },
            isInitialized: this.isInitialized,
            isLoading: this.isLoading
        };
    }
    
    // 統計情報取得
    getStatistics() {
        const stats = {
            app: this.getApplicationInfo(),
            data: this.dataManager ? this.dataManager.getCurrentData() : null,
            graphs: this.graphManager ? this.graphManager.getStatistics() : null,
            trajectory: this.mapManager ? {
                pointCount: this.mapManager.getTrajectoryData().length,
                enabled: this.mapManager.trajectoryEnabled
            } : null
        };
        
        return stats;
    }
    
    // 破棄
    destroy() {
        console.log('WASA Flight GUI: 破棄処理開始...');
        
        if (this.dataManager) {
            this.dataManager.destroy();
            this.dataManager = null;
        }
        
        if (this.mapManager) {
            this.mapManager.destroy();
            this.mapManager = null;
        }
        
        if (this.graphManager) {
            this.graphManager.destroy();
            this.graphManager = null;
        }
        
        this.isInitialized = false;
        console.log('WASA Flight GUI: 破棄処理完了');
    }
    
    // 軌跡累積距離の表示を更新
    updateDistance() {
        const distElem = document.getElementById('trajectory-distance');
        if (!distElem || !this.mapManager) return;
        const meters = WASAMapManager.distance;
        distElem.textContent = `距離: ${meters.toFixed(1)} m`;
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    console.log('WASA 2025 Flight Data GUI - JavaScript版を開始します...');
    
    // グローバルインスタンス作成
    window.wasaFlightGUI = new WASAFlightGUI();
    
    // デバッグ用グローバル関数
    window.wasaDebug = {
        getInfo: () => window.wasaFlightGUI.getApplicationInfo(),
        getStats: () => window.wasaFlightGUI.getStatistics(),
        exportData: () => window.wasaFlightGUI.exportData(),
        resetTrajectory: () => window.wasaFlightGUI.mapManager.resetTrajectory(),
        clearGraphs: () => window.wasaFlightGUI.graphManager.clearAllGraphs(),
        resetMemory: () => window.wasaFlightGUI.dataManager.resetMemoryValues()
    };
    
    console.log('デバッグ関数が利用可能です: wasaDebug');
}); 
