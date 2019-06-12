// 각 모드별 정보 변수
let modeInfo = {
    mode: '',
    brush: {
        strokeColor: 'rgba(255, 0, 0, 0.8)',
        strokeWidth: 10,
        fillColor: 'rgba(255, 0, 0, 0.4)',
        isPaint: false,
        lastPointerPosition: null,
        context: null,
        path: []
    },
    rect: {
        name: 'rectangle',
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
        name: 'polygon',
        circleName: 'circleForPolygon',
        strokeColor: 'rgba(255, 0, 0, 0.8)',
        strokeWidth: 10,
        fillColor: 'rgba(255, 0, 0, 0.4)',
        circleCount: 0,
        polygonCount: 0,
        polygonGroup: null
    }
};

let canvasState = {
    undo: [],
    redo: [],
    saving: true
}

let selectedStrokeColor = 'rgba(30, 144, 255, 0.8)'

// 캔버스 생성
let konvaContainerId = 'konva-container';
let $konvaContainer = $('#' + konvaContainerId);
let stage = new Konva.Stage({
    container: konvaContainerId,
    width: $konvaContainer.width(),
    height: $konvaContainer.height(),
    draggable: false
});

let layer = new Konva.Layer();
stage.add(layer);

let bgImage;
let backgroundLayerName = 'backgroundLayer';

// 캔버스 관련 이벤트
stage.on('click', e => {
    stage.find('Transformer').destroy();

    var name = e.target.getName();
    var pointer = dap.getPointer();

    // 현재 선택한 모드에 따른 처리
    switch (modeInfo.mode) {
        case 'Select':
            if (name == modeInfo.rect.name) {
                dap.createRectangleTransformer(e.target);
            } else if (name == modeInfo.poly.circleName || name == modeInfo.poly.name) {
                dap.createPolygonTransformer(e.target.getParent());
            }
            break;
        case 'Brush':
            break;
        case 'FillBrush':
            break;
        case 'Rectangle':
            if (modeInfo.rect.step == 0) {
                if (name == modeInfo.rect.name) {
                    dap.createRectangleTransformer(e.target);
                }
            } else if (modeInfo.rect.step == 1) {
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
            break;
        case 'Polygon':
            modeInfo.poly.circleCount++;

            modeInfo.poly.polygonGroup.add(dap.createPolygonPoint(pointer));
            layer.add(modeInfo.poly.polygonGroup).draw();

            // 점이 3개 이상이면 폴리곤 그리기
            if (modeInfo.poly.circleCount > 2) {
                var points = [];
                stage.find('Circle').filter((obj) => {
                    return obj.getAttr('polygonCount') == modeInfo.poly.polygonCount;
                }).forEach((obj) => {
                    points.push(obj.x());
                    points.push(obj.y());
                });

                var existsPolygon = null;
                stage.find('Line').forEach((obj) => {
                    if (obj.getAttr('polygonCount') == modeInfo.poly.polygonCount) {
                        existsPolygon = obj;
                    }
                });

                if (existsPolygon) {
                    existsPolygon.points(points);
                } else {
                    var polygon = dap.createPolygon(points);
                    modeInfo.poly.polygonGroup.add(polygon);
                    polygon.setZIndex(0);
                    layer.add(modeInfo.poly.polygonGroup).draw();
                }
            }

            stage.find('Transformer').forceUpdate();
            break;
    }

    layer.draw();
});

stage.on('mousedown', (e) => {
    var pointer = dap.getPointer();

    // 현재 선택한 모드에 따른 처리
    switch (modeInfo.mode) {
        case 'Brush':
            modeInfo.brush.context.globalCompositeOperation = 'source-over';
            modeInfo.brush.context.beginPath();

            var image = stage.find('.imageForBrush')[0];
            var localPos = {
                x: pointer.x - image.x(),
                y: pointer.y - image.y()
            };
            modeInfo.brush.context.moveTo(localPos.x, localPos.y);

            modeInfo.brush.isPaint = true;
            modeInfo.brush.lastPointerPosition = pointer;
            break;
    }
});

stage.on('mousemove', (e) => {
    var pointer = dap.getPointer();

    // 현재 선택한 모드에 따른 처리
    switch (modeInfo.mode) {
        case 'Brush':
            if (!modeInfo.brush.isPaint) return;

            var image = stage.find('.imageForBrush')[0];
            var localPos = {
                x: pointer.x - image.x(),
                y: pointer.y - image.y()
            };

            modeInfo.brush.path.push(localPos);

            break;
    }
});

stage.on('mouseup', (e) => {
    var pointer = dap.getPointer();

    // 현재 선택한 모드에 따른 처리
    switch (modeInfo.mode) {
        case 'Brush':
            for (var i = 0; i < modeInfo.brush.path.length; i++) {
                modeInfo.brush.context.lineTo(modeInfo.brush.path[i].x, modeInfo.brush.path[i].y);
            }
            modeInfo.brush.context.closePath();
            modeInfo.brush.context.stroke();

            modeInfo.brush.lastPointerPosition = pointer;
            layer.batchDraw();

            modeInfo.brush.isPaint = false;
            break;
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
        // 알트키로 배경 이미지 드래깅 이벤트 삽입
        let container = stage.container();
        container.tabIndex = 1;
        container.addEventListener('keydown', e => {
            if (e.keyCode == 18) {
                stage.draggable(true);
            }
        });
        container.addEventListener('keyup', e => {
            if (e.keyCode == 18) {
                stage.draggable(false);
            }
        });

        // Commented for delete button
        // container.addEventListener('focusout', e => {
        //     stage.find('Transformer').destroy();
        //     layer.draw();
        // });

        // 배경 이미지 삽입
        var imageObj = new Image();
        imageObj.onload = () => {
            bgImage = new Konva.Image({
                x: 0,
                y: 0,
                image: imageObj,
                width: $konvaContainer.width(),
                height: $konvaContainer.height()
            }).on('mouseover', e => {
                container.focus();
            });
            var backgroundLayer = new Konva.Layer({ name: backgroundLayerName });
            backgroundLayer.add(bgImage);
            stage.add(backgroundLayer);
            backgroundLayer.setZIndex(0);
        };
        imageObj.src = 'san-andreas-alexandra-daddario-dwayne-johnson.jpg';

        // 브러쉬 모드일때 캔버스 추가를 위한 셋팅
        var canvas = document.createElement('canvas');
        canvas.width = $konvaContainer.width();
        canvas.height = $konvaContainer.height();
        layer.add(new Konva.Image({
            name: 'imageForBrush',
            image: canvas,
            x: 0,
            y: 0
        }));
        modeInfo.brush.context = canvas.getContext('2d');
        modeInfo.brush.context.strokeStyle = modeInfo.brush.strokeColor;
        modeInfo.brush.context.lineJoin = 'round';
        modeInfo.brush.context.lineWidth = modeInfo.brush.strokeWidth;
    },
    // 모드 관련 초기화
    setModeinfo: (mode) => {
        modeInfo.mode = mode;
        modeInfo.rect.step = 0;
        // canvas.remove(modeInfo.rect.line1);
        // canvas.remove(modeInfo.rect.line2);

        switch (mode) {
            case 'Brush':
                break;
            case 'FillBrush':
                break;
            case 'Select':
                break;
            case 'Rectangle':
                modeInfo.rect.step = 1;
                // canvas.add(modeInfo.rect.line1);
                // canvas.add(modeInfo.rect.line2);
                break;
            case 'Polygon':
                modeInfo.poly.circleCount = 0;
                modeInfo.poly.polygonCount++;
                modeInfo.poly.polygonGroup = new Konva.Group({ draggable: true });
                break;
        }

        // 사각형모드 첫번째 동그라미 삭제
        stage.find('Circle').filter((obj) => {
            return !obj.getAttr('polygonCount');
        }).forEach((obj) => {
            obj.destroy();
        });

        // 폴리곤모드 동그라미만 남은 부분 삭제
        stage.find('Circle').filter((obj) => {
            return obj.getAttr('polygonCount');
        }).forEach((obj) => {
            var exists = false;
            stage.find('Line').forEach((lineObj) => {
                if (obj.getAttr('polygonCount') == lineObj.getAttr('polygonCount')) {
                    exists = true;
                }
            });
            if (!exists) obj.destroy();
        });

        layer.draw();
    },
    // 현재 마우스 커서의 위치값 반환
    getPointer: () => {
        var transform = stage.getAbsoluteTransform().copy();
        transform.invert();
        return transform.point(stage.getPointerPosition());
    },
    // 캔버스 줌
    zoomCanvas: (delta, evt) => {
        var pointer = { x: stage.width() / 2, y: stage.height() / 2 };
        if (evt) {
            evt.preventDefault();
            pointer = dap.getPointer();
        }

        var oldScale = Math.floor(stage.scaleX() * 10) / 10;
        var newScale = 1;
        if (delta) {
            newScale = delta > 0 ? oldScale - 0.1 : oldScale + 0.1;
        }
        if (newScale > 10) {
            newScale = 10;
        } else if (newScale < 0.1) {
            newScale = 0.1;
        }
        stage.scale({ x: newScale, y: newScale });

        var mousePointTo = {
            x: Math.round(pointer.x / oldScale) - Math.round(stage.x() / oldScale),
            y: Math.round(pointer.y / oldScale) - Math.round(stage.y() / oldScale)
        };

        var newPos = { x: 0, y: 0 };
        if (evt) {
            newPos = {
                x: -(mousePointTo.x - Math.round(pointer.x / newScale)) * newScale,
                y: -(mousePointTo.y - Math.round(pointer.y / newScale)) * newScale
            };
        }

        stage.position(newPos);
        stage.batchDraw();

        stage.find('Transformer').forceUpdate();

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
        }).on('mouseover', e => {
            e.target.stroke(selectedStrokeColor);
            layer.draw();
        }).on('mouseout', e => {
            e.target.stroke(modeInfo.rect.strokeColor);
            layer.draw();
        }).on('dragend', e => {
            var pointer = dap.getPointer();
            modeInfo.rect.x = pointer.x;
            modeInfo.rect.y = pointer.y;
        });
    },
    // 사각형 모드에서 사각형 생성
    createRectangle: (pointer) => {
        return new Konva.Rect({
            name: modeInfo.rect.name,
            x: modeInfo.rect.x,
            y: modeInfo.rect.y,
            width: pointer.x - modeInfo.rect.strokeWidth / 2 - modeInfo.rect.x,
            height: pointer.y - modeInfo.rect.strokeWidth / 2 - modeInfo.rect.y,
            fill: modeInfo.rect.fillColor,
            stroke: modeInfo.rect.strokeColor,
            strokeWidth: modeInfo.rect.strokeWidth,
            draggable: true
        }).on('mouseover', e => {
            e.target.stroke(selectedStrokeColor);
            layer.draw();
        }).on('mouseout', e => {
            e.target.stroke(modeInfo.rect.strokeColor);
            layer.draw();
        }).on('dragstart', e => {
            stage.find('Transformer').destroy();
            dap.createRectangleTransformer(e.target);
        }).strokeScaleEnabled(false);
    },
    // 사각형에 대한 트랜스포머 생성
    createRectangleTransformer: (target) => {
        var tr = new Konva.Transformer();
        tr.attachTo(target);
        tr.keepRatio(false);
        tr.rotateEnabled(false);
        layer.add(tr);
    },
    // 폴리곤 모드에서 점을 생성
    createPolygonPoint: (pointer) => {
        return new Konva.Circle({
            name: modeInfo.poly.circleName,
            x: pointer.x,
            y: pointer.y,
            radius: (modeInfo.poly.strokeWidth / 2) + 2,
            fill: modeInfo.poly.strokeColor,
            stroke: modeInfo.poly.strokeColor,
            strokeWidth: 4,
            draggable: true,
            polygonCount: modeInfo.poly.polygonCount
        }).on('dragmove', e => {
            var points = [];
            stage.find('Circle').filter((obj) => {
                return obj.getAttr('polygonCount') == modeInfo.poly.polygonCount;
            }).forEach((obj) => {
                points.push(obj.x());
                points.push(obj.y());
            });

            stage.find('Line').forEach((obj) => {
                if (obj.getAttr('polygonCount') == modeInfo.poly.polygonCount) {
                    obj.points(points);
                }
            });

            stage.find('Transformer').forceUpdate();
        }).on('mouseover', e => {
            e.target.stroke(selectedStrokeColor);
            layer.draw();
        }).on('mouseout', e => {
            e.target.stroke(modeInfo.poly.strokeColor);
            layer.draw();
        }).strokeScaleEnabled(false);;
    },
    // 폴리곤 모드에서 다각형을 생성
    createPolygon: (points) => {
        return new Konva.Line({
            name: modeInfo.poly.name,
            points: points,
            fill: modeInfo.poly.fillColor,
            stroke: modeInfo.poly.strokeColor,
            strokeWidth: modeInfo.poly.strokeWidth,
            closed: true,
            polygonCount: modeInfo.poly.polygonCount
        }).on('mouseover', e => {
            e.target.stroke(selectedStrokeColor);
            layer.draw();
        }).on('mouseout', e => {
            e.target.stroke(modeInfo.poly.strokeColor);
            layer.draw();
        }).on('dragstart', e => {
            stage.find('Transformer').destroy();
            dap.createPolygonTransformer(e.target);
        }).strokeScaleEnabled(false);
    },
    // 폴리곤 다각형에 대한 트랜스포머 생성
    createPolygonTransformer: (target) => {
        var tr = new Konva.Transformer({
            rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315]
        });
        tr.attachTo(target);
        // tr.keepRatio(false);
        // tr.rotateEnabled(false);
        layer.add(tr);
    },
    // 브러쉬 모드에서 내부 채우기
    fillBrush: (obj) => {

    },
    // 현재 선택된 오브젝트 삭제
    delete: () => {
        var transformers = stage.find('Transformer');
        transformers.each((transformer) => {
            transformer._node.destroy();
            transformer.destroy();
        });
        layer.draw();
    },
    // 캔버스 초기화
    clearCanvas: () => {
        stage.getChildren((obj) => {
            return obj.getName() != backgroundLayerName;
        }).destroyChildren().draw();
    },
    // 이미지로 저장 버튼
    saveCanvasToBitmap: () => {

    },
    // 사각형 정보 가져오기
    getRectInfo: () => {

    }
};

dap.initCanvas();