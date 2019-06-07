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

// 캔버스 생성
let konvaContainerId = 'konva-container';
let $konvaContainer = $('#' + konvaContainerId);
let stage = new Konva.Stage({
    container: konvaContainerId,
    width: $konvaContainer.width(),
    height: $konvaContainer.height()
});

let layer = new Konva.Layer();
stage.add(layer);

let bgImage;

// 캔버스 관련 이벤트
stage.on('click', e => {
    var cName = e.target.getClassName();
    var pointer = stage.getPointerPosition();

    // 사각형 모드
    if (modeInfo.rect.step == 1) {
        modeInfo.rect.x = pointer.x - modeInfo.rect.strokeWidth / 2;
        modeInfo.rect.y = pointer.y - modeInfo.rect.strokeWidth / 2;

        modeInfo.rect.startPoint = dap.createRectangleStartPoint();
        layer.add(modeInfo.rect.startPoint).draw();

        modeInfo.rect.step = 2;
    } else if (modeInfo.rect.step == 2) {
        modeInfo.rect.startPoint.destroy();

        layer.add(dap.createRectangle(pointer)).draw();

        modeInfo.rect.x = 0;
        modeInfo.rect.y = 0;
        modeInfo.rect.step = 0;
    }

    if (cName == 'Image') {
        stage.find('Transformer').destroy();
        layer.draw();
        return;
    }
    // do nothing if clicked NOT on our rectangles
    // if (!e.target.hasName('rect')) {
    //     return;
    // }
    // remove old transformers
    // TODO: we can skip it if current rect is already selected
    stage.find('Transformer').destroy();

    // create new transformer
    if (cName == 'Rect') {
        var tr = new Konva.Transformer();
        layer.add(tr);
        tr.attachTo(e.target);
        tr.keepRatio(false);
        tr.rotateEnabled(false);
        layer.draw();
    }
});

stage.on('wheel', e => {
    // delta: 마우스휠 수치 (100단위)
    dap.zoomCanvas(e.evt.deltaY, e.evt);
});

// 캔버스 관련 전역 함수
const dap = {
    // 캔버스 기본값 설정
    initCanvas: () => {
        var imageObj = new Image();
        imageObj.onload = () => {
            bgImage = new Konva.Image({
                x: 0,
                y: 0,
                image: imageObj,
                width: $konvaContainer.width(),
                height: $konvaContainer.height()
            });
            var backgroundLayer = new Konva.Layer();
            backgroundLayer.add(bgImage);
            stage.add(backgroundLayer);

            backgroundLayer.setZIndex(0);
        };
        imageObj.src = 'san-andreas-alexandra-daddario-dwayne-johnson.jpg';
    },
    // 패브릭 관련 변수 초기화
    setModeinfo: (mode) => {
        modeInfo.mode = mode;
        modeInfo.rect.step = 0;
        // canvas.remove(modeInfo.rect.line1);
        // canvas.remove(modeInfo.rect.line2);
        // modeInfo.poly.circleCount = 0;
        // modeInfo.poly.polygonCount++;
        // canvas.isDrawingMode = false;

        switch (mode) {
            case 'Brush':
                break;
            case 'FillBrush':
                break;
            case 'Select':
                break;
            case 'Rectangle':
                // dap.setCanvasSelection(false);
                modeInfo.rect.step = 1;
                // canvas.add(modeInfo.rect.line1);
                // canvas.add(modeInfo.rect.line2);
                break;
        }
    },
    // 캔버스 줌
    zoomCanvas: (delta, evt) => {
        var pointer = { x: stage.width() / 2, y: stage.height() / 2 };
        if (evt) {
            evt.preventDefault();
            pointer = stage.getPointerPosition();
        }

        var scaleBy = 1.1;
        var oldScale = stage.scaleX();

        var mousePointTo = {
            x: pointer.x / oldScale - stage.x() / oldScale,
            y: pointer.y / oldScale - stage.y() / oldScale
        };

        var newScale = 1;
        if (delta) {
            newScale = delta > 0 ? oldScale / scaleBy : oldScale * scaleBy;
        }
        if (newScale > 10) {
            newScale = 10;
        } else if (newScale < 0.1) {
            newScale = 0.1;
        }
        stage.scale({ x: newScale, y: newScale });

        var newPos = {
            x: -(mousePointTo.x - pointer.x / newScale) * newScale,
            y: -(mousePointTo.y - pointer.y / newScale) * newScale
        };

        stage.position(newPos);
        stage.batchDraw();

        $('#zoom-info').text(Math.round(newScale * 100) + '%');
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
        return new Konva.Circle({
            x: modeInfo.rect.x,
            y: modeInfo.rect.y,
            radius: modeInfo.rect.strokeWidth / 2,
            fill: modeInfo.rect.fillColor,
            stroke: modeInfo.rect.strokeColor,
            strokeWidth: modeInfo.rect.strokeWidth,
            draggable: true
        }).on('dragend', e => {
            var pointer = stage.getPointerPosition();
            modeInfo.rect.x = pointer.x;
            modeInfo.rect.y = pointer.y;
        });
    },
    // 사각형 모드에서 사각형 생성
    createRectangle: (pointer) => {
        return new Konva.Rect({
            x: modeInfo.rect.x,
            y: modeInfo.rect.y,
            width: pointer.x - modeInfo.rect.strokeWidth / 2 - modeInfo.rect.x,
            height: pointer.y - modeInfo.rect.strokeWidth / 2 - modeInfo.rect.y,
            fill: modeInfo.rect.fillColor,
            stroke: modeInfo.rect.strokeColor,
            strokeWidth: modeInfo.rect.strokeWidth,
            draggable: true
        }).strokeScaleEnabled(false);
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