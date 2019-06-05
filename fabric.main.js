// 캔버스 전역 변수
let canvas = undefined;

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
        line1: new fabric.Line([0, 0, 0, 0], {
            strokeWidth: 2,
            stroke: 'rgba(20, 20, 20, 0.5)'
        }),
        line2: new fabric.Line([0, 0, 0, 0], {
            strokeWidth: 2,
            stroke: 'rgba(20, 20, 20, 0.5)'
        })
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
        canvas.selection = false;
        canvas.selectionColor = 'rgba(0,255,0,0.3)';
        canvas.selectionBorderColor = 'red';
        canvas.selectionLineWidth = 5;

        // Group controll disable
        fabric.Group.prototype.hasControls = false;

        // Default brush
        canvas.freeDrawingBrush.color = modeInfo.brush.strokeColor;
        canvas.freeDrawingBrush.width = modeInfo.brush.strokeWidth;

        // Set background image
        var imgUrl = 'san-andreas-alexandra-daddario-dwayne-johnson.jpg';
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
        modeInfo.mode = mode;
        modeInfo.rect.step = 0;
        canvas.remove(modeInfo.rect.line1);
        canvas.remove(modeInfo.rect.line2);
        modeInfo.poly.circleCount = 0;
        modeInfo.poly.polygonCount++;
        canvas.isDrawingMode = false;

        switch (mode) {
            case 'Brush':
                dap.setCanvasSelection(false);
                canvas.isDrawingMode = true;
                break;
            case 'FillBrush':
                dap.setCanvasSelection(false);
                canvas.isDrawingMode = true;
                break;
            case 'Select':
                dap.setCanvasSelection(true);
                break;
            case 'Rectangle':
                dap.setCanvasSelection(false);
                modeInfo.rect.step = 1;
                canvas.add(modeInfo.rect.line1);
                canvas.add(modeInfo.rect.line2);
                break;
            case 'Polygon':
                dap.setCanvasSelection(false);
                break;
            default:
                break;
        }

        canvas.requestRenderAll();
    },
    // 캔버스 줌
    zoomCanvas: (delta, evt) => {
        // canvan.getZoom(): 캔버스의 줌 수치 (0.1단위)
        var orgZoom = canvas.getZoom();
        var targetZoom = 1;
        if (delta) {
            targetZoom = Math.round((orgZoom - (delta / 1000)) * 10) / 10;
        }

        // 최대 10배, 최소 -10배
        if (targetZoom > 10) targetZoom = 10;
        if (targetZoom < 0.1) targetZoom = 0.1;

        if (evt) {
            canvas.zoomToPoint({ x: evt.offsetX, y: evt.offsetY }, targetZoom);
            evt.preventDefault();
            evt.stopPropagation();
        } else {
            canvas.zoomToPoint({ x: canvas.getCenter().left, y: canvas.getCenter().top }, targetZoom);
        }

        // 화면을 벗어나는 줌이 발생하면 화면끝으로 고정
        if (targetZoom <= 1) {
            if (canvas.viewportTransform[4] > canvas.getWidth() - canvas.getWidth() * targetZoom) {
                canvas.viewportTransform[4] = canvas.getWidth() - canvas.getWidth() * targetZoom;
            }
            if (canvas.viewportTransform[4] < 0) {
                canvas.viewportTransform[4] = 0;
            }

            if (canvas.viewportTransform[5] > canvas.getHeight() - canvas.getHeight() * targetZoom) {
                canvas.viewportTransform[5] = canvas.getHeight() - canvas.getHeight() * targetZoom;
            }
            if (canvas.viewportTransform[5] < 0) {
                canvas.viewportTransform[5] = 0;
            }
        }

        $('#zoom-info').text(Math.round(targetZoom * 100) + '%');

        canvas.requestRenderAll();
    },
    // 캔버스의 모든 상태를 저장
    saveCanvasState: (eventName, target) => {
        if (canvasState.saving) {
            // 저장시 가상의 선은 제외
            var tempObjects = canvas._objects.filter(obj => obj.type != "line");
            canvas._objects = tempObjects;

            // 저장시 폴리곤관련 변수도 저장
            canvasState.undo.push({
                canvasStr: JSON.stringify(canvas),
                circleCount: modeInfo.poly.circleCount,
                polygonCount: modeInfo.poly.polygonCount
            });
        }
        if (canvasState.undo.length > 1) {
            $('#btn-undo').prop('disabled', false);
        }
    },
    // 캔버스 언두
    undoCanvas: () => {
        canvasState.redo.push(canvasState.undo.pop());

        canvasState.saving = false;
        canvas.remove(...canvas.getObjects());
        var loadTarget = canvasState.undo[canvasState.undo.length - 1];
        canvas.loadFromJSON(loadTarget.canvasStr, () => {
            modeInfo.poly.circleCount = loadTarget.circleCount;
            modeInfo.poly.polygonCount = loadTarget.polygonCount;

            canvas.renderAll();
            canvasState.saving = true;
        });

        if (canvasState.redo.length > 0) {
            $('#btn-redo').prop('disabled', false);
        }
        if (canvasState.undo.length < 2) {
            $('#btn-undo').prop('disabled', true);
        }
    },
    // 캔버스 리두
    redoCanvas: () => {
        canvasState.undo.push(canvasState.redo.pop());

        canvasState.saving = false;
        canvas.remove(...canvas.getObjects());
        var loadTarget = canvasState.undo[canvasState.undo.length - 1];
        canvas.loadFromJSON(loadTarget.canvasStr, () => {
            modeInfo.poly.circleCount = loadTarget.circleCount;
            modeInfo.poly.polygonCount = loadTarget.polygonCount;

            canvas.renderAll();
            canvasState.saving = true;
        });

        if (canvasState.redo.length < 1) {
            $('#btn-redo').prop('disabled', true);
        }
        if (canvasState.undo.length > 1) {
            $('#btn-undo').prop('disabled', false);
        }
    },
    // 캔버스의 선택 가능 모드 설정
    setCanvasSelection: (selection) => {
        canvas.selection = selection;
    },
    // 사각형 모드에서 시작점 생성
    createRectangleStartPoint: () => {
        return new fabric.Circle({
            radius: modeInfo.rect.strokeWidth / 2,
            fill: modeInfo.rect.strokeColor,
            left: modeInfo.rect.x,
            top: modeInfo.rect.y,
            selectable: false
        });
    },
    // 사각형 모드에서 사각형 생성
    createRectangle: (pointer) => {
        return new fabric.Rect({
            top: modeInfo.rect.y,
            left: modeInfo.rect.x,
            width: pointer.x - modeInfo.rect.strokeWidth / 2 - modeInfo.rect.x,
            height: pointer.y - modeInfo.rect.strokeWidth / 2 - modeInfo.rect.y,
            stroke: modeInfo.rect.strokeColor,
            strokeWidth: modeInfo.rect.strokeWidth,
            fill: modeInfo.rect.fillColor,
            hasControls: false,
            borderColor: 'orange',
            borderWidth: 10
        })
    },
    // 폴리곤 모드에서 점을 생성
    createPolygonPoint: (pointer) => {
        return new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: modeInfo.poly.strokeWidth / 2,
            hasBorders: false,
            hasControls: false,
            polygonNo: modeInfo.poly.polygonCount,
            name: "draggableCircle",
            circleNo: modeInfo.poly.circleCount,
            fill: modeInfo.poly.strokeColor,
            hasRotatingPoint: false,
            originX: 'center',
            originY: 'center'
        });
    },
    // 폴린곤 모드에서 다각형을 생성
    createPolygon: (points) => {
        return new fabric.Polygon(points, {
            fill: modeInfo.poly.fillColor,
            PolygonNumber: modeInfo.poly.polygonCount,
            name: "Polygon",
            selectable: false,
            noofcircles: modeInfo.poly.circleCount - 1,
            objectCaching: false
        });
    },
    // 브러쉬 모드에서 내부 채우기
    fillBrush: (obj) => {
        obj.dirty = true;
        obj.strokeWidth = modeInfo.brush.strokeWidth;
        obj.fill = modeInfo.brush.fillColor;

        dap.saveCanvasState('object:filled', obj);
    },
    // 캔버스 초기화
    clearCanvas: () => {
        canvasState.saving = false;
        canvas.remove(...canvas.getObjects());
        $('input[type=radio][name=rad-mode]:checked').trigger('click');
        canvasState.saving = true;
    },
    // 이미지로 저장 버튼
    saveCanvasToBitmap: () => {
        var dataurl = canvas.toDataURL('image/jpeg');
        fetch(dataurl)
            .then(res => res.blob())
            .then(blob => {
                console.log(blob);

                var fd = new FormData();
                fd.append('image', blob, 'filename');

                // TODO 업로드
            });
    },
    // 사각형 정보 가져오기
    getRectInfo: () => {
        var rectObj = canvas.getObjects('rect');
        rectObj.forEach(obj => {
            alert(`좌상 : ${obj.aCoords.tl}, 우상 : ${obj.aCoords.tr},` +
                `좌하: ${obj.aCoords.bl}, 우하 : ${obj.aCoords.br}`);
        });

        // TODO 업로드
    }
};

canvas = this.__canvas = new fabric.Canvas('c');

dap.initCanvas();

// Just before mouse click event
canvas.on('mouse:down:before', function (opt) {
    var evt = opt.e;

    if (evt.altKey === true) {
        canvas.isDrawingMode = false;
    }
});

// Mouse click event
canvas.on('mouse:down', function (opt) {
    var evt = opt.e;

    if (evt.altKey === true) {
        // 선택 모드
        canvas.isDragging = true;
        dap.setCanvasSelection(false);
        canvas.lastPosX = evt.clientX;
        canvas.lastPosY = evt.clientY;
    } else {
        var pointer = canvas.getPointer(evt);

        // 사각형 모드
        if (modeInfo.rect.step == 1) {
            modeInfo.rect.x = pointer.x - modeInfo.rect.strokeWidth / 2;
            modeInfo.rect.y = pointer.y - modeInfo.rect.strokeWidth / 2;

            modeInfo.rect.startPoint = dap.createRectangleStartPoint();
            canvas.add(modeInfo.rect.startPoint);

            modeInfo.rect.step = 2;
        } else if (modeInfo.rect.step == 2) {
            canvas.remove(modeInfo.rect.startPoint);

            canvas.add(dap.createRectangle(pointer));

            modeInfo.rect.x = 0;
            modeInfo.rect.y = 0;
            modeInfo.rect.step = 0;
        }

        // 폴리곤 
        if (modeInfo.mode == "Polygon") {
            // 점을 클릭 했을 경우에는 이동을 고려하여 새로운 점을 생성하지 않음
            if (opt.target && opt.target.type == "circle" && opt.target.name == "draggableCircle") {
                return;
            }

            modeInfo.poly.circleCount++;
            circle = dap.createPolygonPoint(pointer);
            canvas.add(circle);

            // 점이 3개 이상이면 폴리곤 그리기
            if (modeInfo.poly.circleCount > 2) {
                var points = [];
                console.log(modeInfo.poly.circleCount);
                console.log(modeInfo.poly.polygonCount);
                canvas.getObjects().forEach((obj) => {
                    if (obj.polygonNo === modeInfo.poly.polygonCount) {
                        points.push({ x: obj.left, y: obj.top });
                    }
                });

                var existsPolygon = null;
                canvas.getObjects().forEach((obj) => {
                    if (obj.PolygonNumber === modeInfo.poly.polygonCount) {
                        existsPolygon = obj;
                    }
                });
                if (existsPolygon) {
                    existsPolygon.points = points;
                } else {
                    var newPolygon = dap.createPolygon(points);
                    canvas.add(newPolygon);
                    canvas.sendToBack(newPolygon);
                }
            }
        }
    }

    canvas.requestRenderAll();
});

// Mouse moving event
canvas.on('mouse:move', function (opt) {
    var evt = opt.e;
    var pointer = canvas.getPointer(evt);

    // 선택 모드
    if (canvas.isDragging) {
        canvas.relativePan(new fabric.Point(evt.movementX, evt.movementY));
    }

    if (modeInfo.mode == 'Rectangle') {
        canvas.setCursor('crosshair');
        modeInfo.rect.line1.set({ x1: 0, y1: pointer.y, x2: canvas.getWidth(), y2: pointer.y });
        modeInfo.rect.line2.set({ x1: pointer.x, y1: 0, x2: pointer.x, y2: canvas.getHeight() });
    } else {
        canvas.setCursor('defaultCursor');
    }

    canvas.requestRenderAll();
});

// Mouse clicked event
canvas.on('mouse:up', function (opt) {
    canvas.isDragging = false;
    if (modeInfo.mode == "Select") {
        dap.setCanvasSelection(true);
    }

    if (modeInfo.mode == "Brush" || modeInfo.mode == "FillBrush") {
        canvas.isDrawingMode = true;
    }

    canvas.requestRenderAll();
});

// Mouse wheel event
canvas.on('mouse:wheel', function (opt) {
    var evt = opt.e;

    // delta: 마우스휠 수치 (100단위)
    var delta = evt.deltaY;
    dap.zoomCanvas(delta, evt);
});

// Canvas objects select and moving event
canvas.on('object:moving', function (opt) {
    var target = opt.target;

    switch (target.type) {
        case 'circle':
            if (target.name == "draggableCircle") {
                canvas.forEachObject((obj) => {
                    if (obj.name == "Polygon") {
                        if (obj.PolygonNumber == target.polygonNo) {
                            var points = window["polygon" + target.polygonNo].get("points");
                            points[target.circleNo - 1].x = target.left;
                            points[target.circleNo - 1].y = target.top;
                            window["polygon" + target.polygonNo].set({
                                points: points
                            });
                        }
                    }
                });
            }
            break;
        case 'activeSelection':
            var group = target;
            target.getObjects('circle').forEach((target) => {
                if (target.name == "draggableCircle") {
                    canvas.forEachObject((obj) => {
                        if (obj.name == "Polygon") {
                            if (obj.PolygonNumber == target.polygonNo) {
                                var points = window["polygon" + target.polygonNo].get("points");
                                points[target.circleNo - 1].x = target.left + (group ? group.left + group.width / 2 : 0);
                                points[target.circleNo - 1].y = target.top + (group ? group.top + group.height / 2 : 0);
                                window["polygon" + target.polygonNo].set({
                                    points: points
                                });
                            }
                        }
                    });
                }
            });
            break;
        default:
            break;
    }

    canvas.requestRenderAll();
});

canvas.on("object:added", function (opt) {
    if (canvasState.saving) {
        var target = opt.target;
        switch (modeInfo.mode) {
            case "Rectangle":
                if (target.type == "line" || target.type == "circle") {
                    return;
                }
                break;
            case "Polygon":
                break;
            case "FillBrush":
                if (target.type == "path") {
                    dap.fillBrush(target);
                    return;
                }
                break;
        }
        dap.saveCanvasState("object:added", target);
    }
});
canvas.on("object:modified", function (opt) {
    var target = opt.target;
    dap.saveCanvasState("object:modified", target);
});
canvas.on("object:removed", function (opt) {
    var target = opt.target;
    dap.saveCanvasState("object:removed", target);
});