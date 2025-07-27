class WASADataManager {
    constructor() {
        // フライトデータ
        this.data = {
            // 基本データ
            date: "-",
            time: "-",
            latitude: 0,
            longitude: 0,
            altitude: 0,
            rpm: 0,
            
            // 速度・方位データ
            tacho: 0,           // 対気速度
            groundSpeed: 0,     // 対地速度
            gpsAltitude: 0,     // GPS高度
            gpsCourse: 0,       // GPS方位
            temperature: 0,     // 温度
            
            // 制御面データ
            elevatorAngle: 0,   // 水平舵角
            rudderAngle: 0,     // 垂直舵角
            rudderTrim: 0,      // トリム
            
            // 姿勢データ
            roll: 0,
            pitch: 0,
            yaw: 0
        };
        
        // データ履歴（グラフ用）
        this.historyLength = WASAGraphManager.maxGraphWidth * WASADataManager.samplePerSecond + 1; // グラフ幅×1秒間に取得する回数分
        this.altitudeHist = [];
        this.rpmHist = [];
        this.tasHist = [];       // 対気速度履歴
        this.groundHist = [];    // 対地速度履歴
        this.rollHist = [];
        this.pitchHist = [];
        
        // タイマー
        this.awsTimer = null;
        this.amedasTimer = null;
        
        // イベントハンドラー
        this.onDataUpdate = null;
        this.onError = null;
        
        // AWS API URL
        this.awsApiUrl = "https://62u95gbc60.execute-api.us-east-1.amazonaws.com/test/items/hpa/latest";
        
        // リクエスト状態
        this.isUpdating = false;
    }
    
    // 初期化
    init() {
        console.log('WASADataManager: 初期化中...');
        this.startTimers();
    }
    
    // タイマー開始
    startTimers() {
        // AWS APIタイマー
        this.awsTimer = setInterval(() => {
            this.updateAWSData();
        }, 1000 / WASADataManager.samplePerSecond);
        
        // アメダスタイマー（1分間隔）
        this.amedasTimer = setInterval(() => {
            this.updateAmedasData();
        }, 60000);
        
        // 初回データ取得
        this.updateAWSData();
    }
    
    // タイマー停止
    stopTimers() {
        if (this.awsTimer) {
            clearInterval(this.awsTimer);
            this.awsTimer = null;
        }
        if (this.amedasTimer) {
            clearInterval(this.amedasTimer);
            this.amedasTimer = null;
        }
    }
    
    // AWS APIからデータ取得・更新
    async updateAWSData() {
        if (this.isUpdating) return;
        
        this.isUpdating = true;
        
        try {
            const response = await fetch(this.awsApiUrl, {
                method: 'GET',
                timeout: 5000
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ AWS API接続成功:', new Date().toLocaleTimeString());
                this.processAWSData(data);
            } else {
                console.warn('AWS API エラー:', response.status);
                this.fallbackToSimulation();
            }
        } catch (error) {
            console.warn('AWS API接続エラー:', error);
            this.fallbackToSimulation();
        } finally {
            this.isUpdating = false;
        }
    }
    
    // AWS APIデータ処理
    processAWSData(apiData) {
        console.log('📊 AWSデータ処理中:', {
            latitude: apiData.Latitude,
            longitude: apiData.Longitude,
            altitude: apiData.GPSAltitude,
            speed: apiData.GPSSpeed,
            time: apiData.Time
        });
        
        // データ更新
        this.data.latitude = parseFloat(apiData.Latitude || 0);
        this.data.longitude = parseFloat(apiData.Longitude || 0);
        this.data.altitude = parseFloat(apiData.Altitude || 0);
        this.data.gpsAltitude = parseFloat(apiData.GPSAltitude || 0);
        this.data.gpsCourse = parseFloat(apiData.GPSCourse || 0);
        this.data.groundSpeed = parseFloat(apiData.GPSSpeed || 0);
        this.data.tacho = parseFloat(apiData.AirSpeed || 0);
        this.data.rpm = parseInt(apiData.PropellerRotationSpeed || 0);
        this.data.yaw = parseFloat(apiData.Yaw_Mad6 || 0);
        this.data.roll = -parseFloat(apiData.Roll_Mad6 || 0);
        this.data.pitch = parseFloat(apiData.Pitch_Mad6 || 0);
        this.data.temperature = parseFloat(apiData.Temperature || 0);
        this.data.elevatorAngle = parseFloat(apiData.Elevator || 0);
        this.data.rudderAngle = parseFloat(apiData.Rudder || 0);
        this.data.rudderTrim = parseFloat(apiData.Trim || 0);
        
        // 日時データ
        this.data.date = apiData.Date || "-";
        this.data.time = apiData.Time || "-";
        
        // 履歴に追加
        this.addToHistory();
        
        // UIに通知
        if (this.onDataUpdate) {
            this.onDataUpdate(this.data);
        }
    }
    
    // シミュレーションデータ生成（API接続できない場合）
    fallbackToSimulation() {
        console.log('🎮 シミュレーションモード:', new Date().toLocaleTimeString());
        
        // 琵琶湖の座標範囲でシミュレーション
        const biwako = {
            lat_min: 35.2191,
            lat_max: 35.42,
            lon_min: 136.097,
            lon_max: 136.279
        };
        
        // ランダムデータ生成
        this.data.altitude = Math.random() * 10;
        this.data.tacho = Math.random() * 10;
        this.data.roll = (Math.random() - 0.5) * 10;
        this.data.pitch = (Math.random() - 0.5) * 10;
        this.data.latitude = biwako.lat_min + Math.random() * (biwako.lat_max - biwako.lat_min);
        this.data.longitude = biwako.lon_min + Math.random() * (biwako.lon_max - biwako.lon_min);
        this.data.rpm = Math.floor(Math.random() * 200);
        this.data.groundSpeed = Math.random() * 10;
        this.data.gpsAltitude = Math.random() * 100;
        this.data.gpsCourse = Math.random() * 360;
        this.data.temperature = 20 + Math.random() * 10;
        this.data.elevatorAngle = (Math.random() - 0.5) * 20;
        this.data.rudderAngle = (Math.random() - 0.5) * 20;
        this.data.rudderTrim = (Math.random() - 0.5) * 10;
        this.data.yaw = Math.random() * 360;
        
        // 時刻
        const now = new Date();
        this.data.date = now.toLocaleDateString('ja-JP');
        this.data.time = now.toLocaleTimeString('ja-JP');
        
        // 履歴に追加
        this.addToHistory();
        
        // UIに通知
        if (this.onDataUpdate) {
            this.onDataUpdate(this.data);
        }
    }
    
    // データ履歴に追加
    addToHistory() {
        this.altitudeHist.push(this.data.altitude);
        this.rpmHist.push(this.data.rpm);
        this.tasHist.push(this.data.tacho);
        this.groundHist.push(this.data.groundSpeed);
        this.rollHist.push(this.data.roll);
        this.pitchHist.push(this.data.pitch);
        
        // 履歴長制限
        const histories = [
            this.altitudeHist, this.rpmHist, this.tasHist,
            this.groundHist, this.rollHist, this.pitchHist
        ];
        
        histories.forEach(hist => {
            if (hist.length > this.historyLength) {
                hist.shift();
            }
        });
    }
    
    // アメダスデータ更新（風データ）
    updateAmedasData() {
        // 実装省略（元のPythonアプリではコメントアウトされている）
        console.log('アメダスデータ更新（未実装）');
    }
    
    // 現在のデータを取得
    getCurrentData() {
        return { ...this.data };
    }
    
    // グラフ用履歴データを取得
    getHistoryData() {
        const N = this.altitudeHist.length;
        const x = Array.from({length: N}, (_, i) => -(N-1-i) / WASADataManager.samplePerSecond);
        
        return {
            x: x,
            altitude: [...this.altitudeHist],
            rpm: [...this.rpmHist],
            tas: [...this.tasHist],
            ground: [...this.groundHist],
            roll: [...this.rollHist],
            pitch: [...this.pitchHist]
        };
    }
    
    // データ履歴クリア
    clearHistory() {
        this.altitudeHist = [];
        this.rpmHist = [];
        this.tasHist = [];
        this.groundHist = [];
        this.rollHist = [];
        this.pitchHist = [];
        console.log('データ履歴をクリアしました');
    }
    
    // 破棄
    destroy() {
        this.stopTimers();
        console.log('WASADataManager: 破棄されました');
    }
} 

WASADataManager.samplePerSecond = 4; // 1秒間に取得するサンプル数
