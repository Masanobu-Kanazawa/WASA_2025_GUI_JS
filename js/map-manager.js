class WASAMapManager {
    constructor(mapId) {
        this.mapId = mapId;
        this.map = null;
        this.currentMapKey = "biwako";
        
        // 地図設定（元のPythonアプリと同じ）
        this.mapSettings = {
            "biwako": {
                // フル範囲用設定
                // "lat_min": 35.1187, "lat_max": 35.5204,
                // "lon_min": 135.9861, "lon_max": 136.3499
                "lat_min": 35.2191, "lat_max": 35.42,
                "lon_min": 136.097, "lon_max": 136.279
            },
            "fuzigawa": {
                "lat_min": 35.1172, "lat_max": 35.1247,
                "lon_min": 138.6284, "lon_max": 138.6353
            },
            "ootone": {
                "lat_min": 35.8543, "lat_max": 35.8641,
                "lon_min": 140.2365, "lon_max": 140.2461
            },
            "okegawa": {
                "lat_min": 35.9716, "lat_max": 35.9814,
                "lon_min": 139.5194, "lon_max": 139.529
            }   
        };
        
        // 軌跡データ
        this.trajectory = [];
        this.trajectoryEnabled = true;
        
        // 風データ
        this.windDirection = null;
        this.windSpeed = null;
        
        // レイヤー
        this.trajectoryLayer = null;
        this.aircraftMarker = null;
        
        this.customMarkers = [];
        this.customMarkerData = [];
        
        this.init();
    }
    
    init() {
        // Leaflet地図を作成
        this.map = L.map(this.mapId, {
            zoomControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            boxZoom: true,
            keyboard: true,
            dragging: true,
            touchZoom: true,
            zoom: 20,
            zoomSnap: 0.25,   // ズームステップを細かく
            zoomDelta: 0.25   // ズーム操作1回あたりの幅を細かく
        });
        
        // OpenStreetMapタイルを読み込み
        this.loadMap();
        
        // 軌跡レイヤーグループを作成
        this.trajectoryLayer = L.layerGroup().addTo(this.map);
        
        console.log('地図初期化完了');
    }
    
    addMarkerStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .aircraft-marker {
                font-size: 20px;
                text-align: center;
                line-height: 20px;
                filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.8));
                transform-origin: center;
            }
            
            .trajectory-plane-marker {
                font-size: 12px;
                text-align: center;
                line-height: 12px;
                filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.6));
                transform-origin: center;
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);
    }
    
    // 地図読み込み
    loadMap() {
        const setting = this.mapSettings[this.currentMapKey];
        
        // デバッグ情報を出力
        console.log(`=== 地図設定: ${this.currentMapKey} ===`);
        console.log(`北緯: ${setting.lat_max}°`);
        console.log(`南緯: ${setting.lat_min}°`);
        console.log(`東経: ${setting.lon_max}°`);
        console.log(`西経: ${setting.lon_min}°`);
        console.log(`中心座標: 北緯 ${(setting.lat_min + setting.lat_max) / 2}°, 東経 ${(setting.lon_min + setting.lon_max) / 2}°`);
        
        // 既存のタイルレイヤーをクリア
        this.map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                this.map.removeLayer(layer);
            }
        });
        
        // ESRI衛星写真タイルを読み込み
        L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
            attribution: 'Tiles © Esri'
        }).addTo(this.map);
        
        // 地図範囲にフィットするようにビューを調整
        const bounds = [
            [setting.lat_min, setting.lon_min],
            [setting.lat_max, setting.lon_max]
        ];
        console.log(`地図境界:`, bounds);
        this.map.fitBounds(bounds, { zoom: 20 });
        
        // カスタムマーカー再描画
        if (this.customMarkerData && this.customMarkerData.length > 0) {
            this.addCustomMarkers(this.customMarkerData);
        }
        
        console.log(`地図読み込み完了: ${this.currentMapKey}`);
    }
    
    // 飛行機マーカー更新
    updateAircraft(lat, lon, heading) {
        if (!this.map) return;
        
        const position = [lat, lon];
        
        // 飛行機マーカーが存在しない場合は作成
        if (!this.aircraftMarker) {
            // カスタムアイコン作成（飛行機の向きを方位に合わせる）
            const aircraftIcon = L.divIcon({
                className: 'aircraft-marker',
                html: '✈️',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            
            this.aircraftMarker = L.marker(position, { icon: aircraftIcon }).addTo(this.map);
        } else {
            // 既存マーカーの位置を更新
            this.aircraftMarker.setLatLng(position);
        }
        
        // 飛行機の向きを方位に合わせて回転（地図には影響しない）
        if (heading !== null && heading !== undefined) {
            const markerElement = this.aircraftMarker.getElement();
            if (markerElement) {
                // 既存のtransformを保持しつつ、回転のみを追加
                const currentTransform = markerElement.style.transform || '';
                const translateMatch = currentTransform.match(/translate3d\([^)]*\)/);
                const translate = translateMatch ? translateMatch[0] : '';
                
                // 回転のみを適用
                markerElement.style.transform = `${translate} rotate(${heading}deg)`;
            }
        }
        
        // 地図の自動中心化を削除（飛行機が移動するように）
        // this.map.setView(position, this.map.getZoom());
    }
    
    // 軌跡表示更新
    updateTrajectoryDisplay() {
        if (!this.map || this.trajectory.length < 2) return;
        
        // 既存の軌跡レイヤーを削除
        if (this.trajectoryLayer) {
            this.map.removeLayer(this.trajectoryLayer);
        }
        
        // 軌跡を水色の線で描画（頂点マーカーなし）
        this.trajectoryLayer = L.polyline(this.trajectory, {
            color: '#00bfff', // 水色
            weight: 2,
            opacity: 0.8
        }).addTo(this.map);
    }
    
    // 軌跡開始
    startTrajectory() {
        this.trajectoryEnabled = true;
        console.log('軌跡開始');
    }
    
    // 軌跡停止
    stopTrajectory() {
        this.trajectoryEnabled = false;
        console.log('軌跡停止');
    }
    
    // 軌跡リセット
    resetTrajectory() {
        this.trajectory = [];
        if (this.trajectoryLayer) {
            this.map.removeLayer(this.trajectoryLayer);
            this.trajectoryLayer = L.layerGroup().addTo(this.map);
        }
        WASAMapManager.phase = 1;
        WASAMapManager.reachedGoal = false;
        console.log('軌跡リセット');
    }
    
    // 風データ表示更新
    updateWindData(direction, speed) {
        this.windDirection = direction;
        this.windSpeed = speed;
        
        // 風データの表示（簡易実装）
        if (direction !== null && speed !== null) {
            const setting = this.mapSettings[this.currentMapKey];
            const windLat = setting.lat_min + (setting.lat_max - setting.lat_min) * 0.8;
            const windLon = setting.lon_min + (setting.lon_max - setting.lon_min) * 0.8;
            
            // 既存の風マーカーを削除
            this.map.eachLayer(layer => {
                if (layer.options && layer.options.isWindMarker) {
                    this.map.removeLayer(layer);
                }
            });
            
            // 新しい風マーカーを追加
            const windMarker = L.marker([windLat, windLon], {
                icon: L.divIcon({
                    className: 'wind-marker',
                    html: `<div style="color: #233e84; font-weight: bold; background: rgba(255,255,255,0.8); padding: 2px 4px; border-radius: 3px; font-size: 12px;">
                             ↑ ${speed.toFixed(1)} m/s
                           </div>`,
                    iconSize: [80, 20],
                    iconAnchor: [40, 10]
                }),
                isWindMarker: true
            }).addTo(this.map);
        }
    }
    
    // 地図範囲チェック
    isPositionInCurrentMap(latitude, longitude) {
        const setting = this.mapSettings[this.currentMapKey];
        return latitude >= setting.lat_min && latitude <= setting.lat_max &&
               longitude >= setting.lon_min && longitude <= setting.lon_max;
    }
    
    // 座標からピクセル位置計算（元のPythonアプリの関数）
    latLonToXY(lat, lon) {
        const setting = this.mapSettings[this.currentMapKey];
        const x = Math.round((lon - setting.lon_min) / (setting.lon_max - setting.lon_min) * setting.img_w);
        const y = Math.round(setting.img_h - (lat - setting.lat_min) / (setting.lat_max - setting.lat_min) * setting.img_h);
        return {
            x: Math.max(0, Math.min(x, setting.img_w - 1)),
            y: Math.max(0, Math.min(y, setting.img_h - 1))
        };
    }
    
    // 現在の地図設定取得
    getCurrentMapSetting() {
        return this.mapSettings[this.currentMapKey];
    }
    
    // 軌跡データ取得
    getTrajectoryData() {
        return [...this.trajectory];
    }
    
    // マップサイズ調整
    invalidateSize() {
        if (this.map) {
            this.map.invalidateSize();
        }
    }
    
    // 破棄
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
    
    // 軌跡更新
    updateTrajectory(lat, lon) {
        if (!this.trajectoryEnabled) return;
        if (lat < 0.1 || lon < 0.1) return;
        
        const position = [lat, lon];
        this.trajectory.push(position);
        
        // 軌跡の長さを制限（1000ポイント）
        if (this.trajectory.length > 1000) {
            this.trajectory = this.trajectory.slice(-1000);
        }
        
        this.updateTrajectoryDisplay();
    }
    
    // 位置更新（飛行機と軌跡の両方を更新）
    updatePosition(latitude, longitude, heading = 0) {
        if (latitude === 0 && longitude === 0) return;
        
        // 飛行機マーカー更新
        this.updateAircraft(latitude, longitude, heading);

        // 距離更新
        this.updateDistanceMeters(latitude, longitude);
        
        // 軌跡更新
        this.updateTrajectory(latitude, longitude);
    }
    
    // 地図変更
    changeMap(mapKey) {
        if (this.mapSettings[mapKey]) {
            this.currentMapKey = mapKey;
            console.log(`地図変更: ${mapKey}`);
            
            // 新しい地図を読み込み
            this.loadMap();
            
            // 軌跡もリセット
            this.resetTrajectory();
            
            // カスタムマーカー再描画
            if (this.customMarkerData && this.customMarkerData.length > 0) {
                this.addCustomMarkers(this.customMarkerData);
            }
        }
    }
    
    // 現在の地図表示範囲を確認
    checkCurrentMapBounds() {
        if (!this.map) {
            console.log('地図が初期化されていません');
            return;
        }
        
        const currentBounds = this.map.getBounds();
        const currentCenter = this.map.getCenter();
        const currentZoom = this.map.getZoom();
        
        console.log('=== 現在の地図表示状況 ===');
        console.log(`現在の中心: 北緯 ${currentCenter.lat}°, 東経 ${currentCenter.lng}°`);
        console.log(`現在のズーム: ${currentZoom}`);
        console.log(`現在の表示範囲:`);
        console.log(`  北緯: ${currentBounds.getNorth()}°`);
        console.log(`  南緯: ${currentBounds.getSouth()}°`);
        console.log(`  東経: ${currentBounds.getEast()}°`);
        console.log(`  西経: ${currentBounds.getWest()}°`);
        
        // 設定値との比較
        const setting = this.mapSettings[this.currentMapKey];
        console.log('=== 設定値との比較 ===');
        console.log(`設定値 - 北緯: ${setting.lat_max}° vs 表示: ${currentBounds.getNorth()}°`);
        console.log(`設定値 - 南緯: ${setting.lat_min}° vs 表示: ${currentBounds.getSouth()}°`);
        console.log(`設定値 - 東経: ${setting.lon_max}° vs 表示: ${currentBounds.getEast()}°`);
        console.log(`設定値 - 西経: ${setting.lon_min}° vs 表示: ${currentBounds.getWest()}°`);
    }

    updateDistanceMeters(lat, lon) {
        if (this.currentMapKey !== 'biwako') return;

        const distFromP = this._haversine(lat, lon, WASAMapManager.points.P.lat, WASAMapManager.points.P.lon);
        const distToK = this._haversine(lat, lon, WASAMapManager.points.K.lat, WASAMapManager.points.K.lon);

        if (distFromP > 1000000) return;  // 無効な初期座標想定

        // 段階遷移チェック
        if ((WASAMapManager.phase === 1 || WASAMapManager.phase === 3) && distFromP >= 10975) {
            WASAMapManager.phase = WASAMapManager.phase + 1;
            console.log(`フェーズ変更: ${WASAMapManager.phase}`);
        } else if (WASAMapManager.phase === 2 && distFromP <= 1000) {
            WASAMapManager.phase = 3;
            console.log(`フェーズ変更: ${WASAMapManager.phase}`);
        }

        // フェーズ別距離計算
        if (WASAMapManager.phase === 1) {
            WASAMapManager.distance = distFromP;
        }

        if (WASAMapManager.phase === 2) {
            WASAMapManager.distance = (21097.5 - distToK) < 10975 ? 10975 : (21097.5 - distToK);
        }

        if (WASAMapManager.phase === 3) {
            WASAMapManager.distance = (distFromP <= 1000) ? 21097.5 : (21097.5 + distToK);
        }

        if (WASAMapManager.phase === 4) {
            if (!WASAMapManager.reachedGoal && distFromP <= 300) {
                WASAMapManager.reachedGoal = true;
            }
            WASAMapManager.distance = WASAMapManager.reachedGoal ? 42195 : ((42195 - distFromP) < 31220 ? 31220 : (42195 - distFromP));
        }
    }

    // 2点間の距離（メートル, Haversine公式）
    _haversine(lat1, lon1, lat2, lon2) {
        const R = 6371000; // 地球半径(m)
        const toRad = deg => deg * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    // カスタムマーカーを全て削除
    clearCustomMarkers() {
        if (this.customMarkers && this.customMarkers.length > 0) {
            this.customMarkers.forEach(marker => this.map.removeLayer(marker));
        }
        this.customMarkers = [];
    }

    // カスタムマーカーを追加
    addCustomMarkers(points) {
        this.clearCustomMarkers();
        this.customMarkerData = points;
        if (!this.map) return;
        points.forEach(point => {
            const marker = L.circleMarker([point.lat, point.lon], {
                color: point.color,
                fillColor: point.color,
                fillOpacity: 0.8,
                radius: 8,
                weight: 2
            }).addTo(this.map);
            if (point.label) {
                marker.bindTooltip(point.label, {permanent: true, direction: 'top', className: 'custom-marker-label'});
            }
            this.customMarkers.push(marker);
        });
    }
} 

WASAMapManager.points = {
    P: { lat: 35.294230, lon: 136.254344 },
    T: { lat: 35.368138, lon: 136.174102 },
    O: { lat: 35.274218, lon: 136.136190 },
    K: { lat: 35.297069, lon: 136.243910 },
};

WASAMapManager.phase = 1;
WASAMapManager.reachedGoal = false;
WASAMapManager.distance = 0;
