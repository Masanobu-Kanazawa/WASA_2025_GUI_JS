class WASAGraphManager {
    constructor() {
        this.graphs = {};
        this.charts = {};
        
        // グラフ設定（元のPythonアプリと同じ）
        this.graphConfigs = [
            { id: 'altitude', title: '高度', canvasId: 'altitude-graph', yMin: 0, yMax: 10, color: '#3388ff' },
            { id: 'rpm', title: 'ペラ回転数', canvasId: 'rpm-graph', yMin: 0, yMax: 200, color: '#ff6384' },
            { id: 'tas', title: '対気速度', canvasId: 'tas-graph', yMin: 0, yMax: 10, color: '#36a2eb' },
            { id: 'ground', title: '対地速度', canvasId: 'ground-graph', yMin: 0, yMax: 10, color: '#ffce56' },
            { id: 'roll', title: 'roll', canvasId: 'roll-graph', yMin: -10, yMax: 10, color: '#4bc0c0' },
            { id: 'pitch', title: 'pitch', canvasId: 'pitch-graph', yMin: -10, yMax: 10, color: '#9966ff' }
        ];
        
        this.init();
    }
    
    init() {
        console.log('WASAGraphManager: 初期化中...');
        this.createAllGraphs();
    }
    
    createAllGraphs() {
        this.graphConfigs.forEach(config => {
            this.createGraph(config);
        });
    }
    
    createGraph(config) {
        const canvas = document.getElementById(config.canvasId);
        if (!canvas) {
            console.error(`Canvas element not found: ${config.canvasId}`);
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [], // X軸ラベル（時間）
                datasets: [{
                    label: config.title,
                    data: [],
                    borderColor: config.color,
                    backgroundColor: config.color + '20',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0, // ポイントを非表示
                    pointHoverRadius: 4,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0 // アニメーション無効化（リアルタイム表示のため）
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false // 凡例を非表示
                    },
                    title: {
                        display: false // タイトルはHTMLで表示
                    }
                },
                scales: {
                    x: {
                        display: true,
                        type: 'linear',
                        min: -WASAGraphManager.maxGraphWidth,
                        max: 0,
                        ticks: {
                            stepSize: 2,
                            color: '#666',
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            color: '#e0e0e0',
                            lineWidth: 1
                        },
                        title: {
                            display: false
                        }
                    },
                    y: {
                        display: true,
                        min: config.yMin,
                        max: config.yMax,
                        ticks: {
                            color: '#666',
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            color: '#e0e0e0',
                            lineWidth: 1
                        },
                        title: {
                            display: false
                        }
                    }
                }
            }
        });
        
        this.charts[config.id] = chart;
        console.log(`グラフ作成完了: ${config.title}`);
    }
    
    // グラフデータ更新
    updateGraphs(historyData) {
        if (!historyData || !historyData.x) return;
        
        const x = historyData.x; // 時間軸データ
        
        // 各グラフを更新
        this.graphConfigs.forEach(config => {
            const chart = this.charts[config.id];
            if (!chart) return;
            
            let yData = [];
            switch(config.id) {
                case 'altitude':
                    yData = historyData.altitude || [];
                    break;
                case 'rpm':
                    yData = historyData.rpm || [];
                    break;
                case 'tas':
                    yData = historyData.tas || [];
                    break;
                case 'ground':
                    yData = historyData.ground || [];
                    break;
                case 'roll':
                    yData = historyData.roll || [];
                    break;
                case 'pitch':
                    yData = historyData.pitch || [];
                    break;
            }
            
            // データ更新
            this.updateSingleGraph(chart, x, yData);
        });
    }
    
    // 単一グラフの更新
    updateSingleGraph(chart, xData, yData) {
        if (!chart || !xData || !yData) return;
        
        // データポイントの作成
        const dataPoints = xData.map((x, index) => ({
            x: x,
            y: yData[index] !== undefined ? yData[index] : null
        }));
        
        // チャートデータ更新
        chart.data.datasets[0].data = dataPoints;
        
        // X軸範囲を動的に調整
        const minX = Math.min(...xData);
        const maxX = Math.max(...xData);
        chart.options.scales.x.min = Math.min(minX, -WASAGraphManager.maxGraphWidth);
        chart.options.scales.x.max = Math.max(maxX, 0);
        
        // チャート更新（アニメーション無効）
        chart.update('none');
    }
    
    // 全グラフクリア
    clearAllGraphs() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.data.datasets[0].data = [];
                chart.update('none');
            }
        });
        console.log('全グラフをクリアしました');
    }
    
    // 特定グラフクリア
    clearGraph(graphId) {
        const chart = this.charts[graphId];
        if (chart) {
            chart.data.datasets[0].data = [];
            chart.update('none');
            console.log(`グラフ ${graphId} をクリアしました`);
        }
    }
    
    // グラフY軸範囲設定
    setYRange(graphId, yMin, yMax) {
        const chart = this.charts[graphId];
        if (chart) {
            chart.options.scales.y.min = yMin;
            chart.options.scales.y.max = yMax;
            chart.update('none');
            console.log(`グラフ ${graphId} のY軸範囲を ${yMin} - ${yMax} に設定`);
        }
    }
    
    // グラフの色変更
    setGraphColor(graphId, color) {
        const chart = this.charts[graphId];
        if (chart) {
            chart.data.datasets[0].borderColor = color;
            chart.data.datasets[0].backgroundColor = color + '20';
            chart.update('none');
            console.log(`グラフ ${graphId} の色を ${color} に変更`);
        }
    }
    
    // グラフの表示/非表示切り替え
    toggleGraphVisibility(graphId, visible) {
        const canvas = document.getElementById(this.getCanvasId(graphId));
        if (canvas) {
            canvas.style.display = visible ? 'block' : 'none';
            console.log(`グラフ ${graphId} を ${visible ? '表示' : '非表示'} に設定`);
        }
    }
    
    // Canvas ID取得
    getCanvasId(graphId) {
        const config = this.graphConfigs.find(c => c.id === graphId);
        return config ? config.canvasId : null;
    }
    
    // グラフデータエクスポート
    exportGraphData() {
        const exportData = {};
        
        Object.keys(this.charts).forEach(graphId => {
            const chart = this.charts[graphId];
            if (chart) {
                exportData[graphId] = {
                    data: chart.data.datasets[0].data,
                    config: this.graphConfigs.find(c => c.id === graphId)
                };
            }
        });
        
        return JSON.stringify(exportData, null, 2);
    }
    
    // グラフデータインポート
    importGraphData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            Object.keys(data).forEach(graphId => {
                const chart = this.charts[graphId];
                if (chart && data[graphId] && data[graphId].data) {
                    chart.data.datasets[0].data = data[graphId].data;
                    chart.update('none');
                }
            });
            
            console.log('グラフデータのインポートが完了しました');
        } catch (error) {
            console.error('グラフデータインポートエラー:', error);
        }
    }
    
    // ウィンドウリサイズ対応
    handleResize() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.resize();
            }
        });
    }
    
    // 統計情報取得
    getStatistics() {
        const stats = {};
        
        Object.keys(this.charts).forEach(graphId => {
            const chart = this.charts[graphId];
            if (chart && chart.data.datasets[0].data.length > 0) {
                const data = chart.data.datasets[0].data.map(point => point.y).filter(y => y !== null);
                
                if (data.length > 0) {
                    stats[graphId] = {
                        min: Math.min(...data),
                        max: Math.max(...data),
                        avg: data.reduce((a, b) => a + b, 0) / data.length,
                        count: data.length
                    };
                }
            }
        });
        
        return stats;
    }
    
    // グラフ設定取得
    getGraphConfig(graphId) {
        return this.graphConfigs.find(c => c.id === graphId);
    }
    
    // 全グラフ設定取得
    getAllGraphConfigs() {
        return [...this.graphConfigs];
    }
    
    // 破棄
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};
        console.log('WASAGraphManager: 破棄されました');
    }
} 

WASAGraphManager.maxGraphWidth = 20; // グラフの最大幅（秒単位）
