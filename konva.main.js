// 캔버스 전역 변수
let w = 500;
let h = 500;
let stage = new Konva.Stage({
    container: 'konva-container',
    width: w,
    height: h
});

// 각 모드별 정보 변수
let modeInfo = {
    mode: '',
    rect: {
        strokeColor: 'rgba(255, 0, 0, 0.8)',
        strokeWidth: 10,
        fillColor: 'rgba(255, 0, 0, 0.4)',
        step: 0,
        x: 0,
        y: 0,
        startPoint: null,
        line1: null,
        line2: null
    },
    poly: {
        strokeColor: 'rgba(255, 0, 0, 0.8)',
        strokeWidth: 10,
        fillColor: 'rgba(255, 0, 0, 0.4)',
        circleCount: 0,
        polygonCount: 1
    },
    brush: {
        strokeColor: 'rgba(255, 0, 0, 0.8)',
        strokeWidth: 10,
        fillColor: 'rgba(255, 0, 0, 0.4)'
    }
};

let canvasState = {
    undo: [],
    redo: [],
    saving: true
}

// 캔버스 관련 전역 함수
const dap = {
    // 캔버스 기본값 설정
    initCanvas: () => {
        var imageObj = new Image();
        imageObj.onload = function () {
            var image = new Konva.Image({
                x: 0,
                y: 0,
                image: imageObj,
                width: w,
                height: h
            });
            var backgroundLayer = new Konva.Layer();
            backgroundLayer.add(image);
            backgroundLayer.setZIndex(0);

            stage.add(backgroundLayer);
        };
        imageObj.src = 'san-andreas-alexandra-daddario-dwayne-johnson.jpg';
        fabric.Image.fromURL(imgUrl, (img) => {
            canvas.setBackgroundImage(img, () => {
                canvas.renderAll();
                dap.saveCanvasState('canvas:init', null);
            }, {
                    scaleX: Math.floor(canvas.width / img.width * 100) / 100,
                    scaleY: Math.floor(canvas.height / img.height * 100) / 100
                });
        });
    },
    // 패브릭 관련 변수 초기화
    setModeinfo: (mode) => {

    },
    // 캔버스 줌
    zoomCanvas: (delta, evt) => {

    },
    // 캔버스의 모든 상태를 저장
    saveCanvasState: (eventName, target) => {

    },
    // 캔버스 언두
    undoCanvas: () => {

    },
    // 캔버스 리두
    redoCanvas: () => {

    },
    // 캔버스의 선택 가능 모드 설정
    setCanvasSelection: (selection) => {

    },
    // 사각형 모드에서 시작점 생성
    createRectangleStartPoint: () => {
        var circle = new Konva.Circle({
            x: stage.width() / 2,
            y: stage.height() / 2,
            radius: 70,
            fill: 'red',
            stroke: 'black',
            strokeWidth: 4
        });
    },
    // 사각형 모드에서 사각형 생성
    createRectangle: (pointer) => {

    },
    // 폴리곤 모드에서 점을 생성
    createPolygonPoint: (pointer) => {

    },
    // 폴리곤 모드에서 다각형을 생성
    createPolygon: (points) => {

    },
    // 브러쉬 모드에서 내부 채우기
    fillBrush: (obj) => {

    },
    // 캔버스 초기화
    clearCanvas: () => {

    },
    // 이미지로 저장 버튼
    saveCanvasToBitmap: () => {

    },
    // 사각형 정보 가져오기
    getRectInfo: () => {

    }
};

dap.initCanvas();