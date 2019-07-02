var defaultStrokeColor = 'rgba(255, 0, 0, 0.8)';
var defaultStrokeWidth = 5;
var defaultFillColor = 'rgba(255, 0, 0, 0.4)';
var selectedStrokeColor = 'rgba(30, 144, 255, 0.8)';

// 각 모드별 정보 변수
var modeInfo = {
    mode: '',
    brush: {
        name: 'imageForBrush',
        strokeColor: defaultStrokeColor,
        strokeWidth: defaultStrokeWidth,
        fillColor: defaultFillColor,
        context: undefined,
        lastPointerPosition: undefined,
        isPaint: false
    },
    fillBrush: {
        name: 'fillBrush',
        strokeColor: defaultStrokeColor,
        strokeWidth: defaultStrokeWidth,
        fillColor: defaultFillColor,
        fillBrushLine: undefined,
        isPaint: false
    },
    rect: {
        name: 'rectangle',
        strokeColor: defaultStrokeColor,
        strokeWidth: defaultStrokeWidth,
        fillColor: defaultFillColor,
        step: 0,
        startPoint: undefined
    },
    poly: {
        name: 'polygon',
        circleName: 'circleForPolygon',
        strokeColor: defaultStrokeColor,
        strokeWidth: defaultStrokeWidth,
        fillColor: defaultFillColor,
        circleCount: 0,
        polygonCount: 0,
        polygonGroup: undefined
    }
};

var canvasState = {
    undo: [],
    redo: [],
    saving: true
}

// 캔버스 생성
var konvaContainerId = 'konva-container';
var $konvaContainer = $('#' + konvaContainerId);
var stage = new Konva.Stage({
    container: konvaContainerId,
    width: $konvaContainer.width(),
    height: $konvaContainer.height()
});

var layer = new Konva.Layer();
stage.add(layer);

var bgImage = undefined;
var bgImageWidth = 0;
var bgImageHeight = 0;
var backgroundLayerName = 'backgroundLayer';

// 캔버스 관련 이벤트
stage.on('click', function (e) {
    stage.find('Transformer').destroy();

    var targetName = e.target.getName();
    var pointer = dap.getPointer();

    // 현재 선택한 모드에 따른 처리
    switch (modeInfo.mode) {
        case 'Select':
            if (targetName == modeInfo.fillBrush.name) {
                dap.createTransformer(e.target);
            } else if (targetName == modeInfo.rect.name) {
                dap.createTransformer(e.target);
            } else if (targetName == modeInfo.poly.circleName || targetName == modeInfo.poly.name) {
                dap.createTransformer(e.target.getParent());
            }
            break;
        case 'Brush':
            break;
        case 'FillBrush':
            break;
        case 'Rectangle':
            if (modeInfo.rect.step == 0) {
                if (targetName == modeInfo.rect.name) {
                    dap.createTransformer(e.target);
                }
            } else if (modeInfo.rect.step == 1) {
                modeInfo.rect.startPoint = dap.createRectangleStartPoint(pointer);
                layer.add(modeInfo.rect.startPoint).draw();

                modeInfo.rect.step = 2;
            } else if (modeInfo.rect.step == 2) {
                modeInfo.rect.startPoint.destroy();
                layer.add(dap.createRectangle(pointer)).draw();

                // 네모가 그려진 후 상태저장
                dap.saveCanvasState();

                modeInfo.rect.step = 1;
            }
            break;
        case 'Polygon':
            modeInfo.poly.circleCount++;

            modeInfo.poly.polygonGroup.add(dap.createPolygonPoint(pointer));
            layer.add(modeInfo.poly.polygonGroup).draw();

            // 점이 3개 이상이면 폴리곤 그리기
            if (modeInfo.poly.circleCount > 2) {
                var points = [];
                stage.find('Circle').filter(function (obj) {
                    return obj.getAttr('polygonCount') == modeInfo.poly.polygonCount;
                }).forEach(function (obj) {
                    points.push(obj.x());
                    points.push(obj.y());
                });

                var existsPolygon = undefined;
                stage.find('Line').forEach(function (obj) {
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
                // 점추가 3개 이상일 경우 폴리곤 까지 변경 후 상태저장
                dap.saveCanvasState();
            }

            stage.find('Transformer').forceUpdate();
            break;
        default:
        	break;
    }
    
    layer.batchDraw();
});

stage.on('mousedown', function (e) {
    var pointer = dap.getPointer();

    // 현재 선택한 모드에 따른 처리
    switch (modeInfo.mode) {
        case 'Brush':
            modeInfo.brush.isPaint = true;
            modeInfo.brush.lastPointerPosition = pointer;

            break;
        case 'FillBrush':
            if (!modeInfo.fillBrush.isPaint) return;

            modeInfo.fillBrush.fillBrushLine = dap.createFillBrushLine(pointer);
            layer.add(modeInfo.fillBrush.fillBrushLine).draw();

            // 라인 생성 시 상태저장
            dap.saveCanvasState();

            break;
    }
});

stage.on('mousemove', function (e) {
    var pointer = dap.getPointer();

    // 현재 선택한 모드에 따른 처리
    switch (modeInfo.mode) {
        case 'Brush':
            if (!modeInfo.brush.isPaint) return;

            if (modeInfo.brush.erase) {
                modeInfo.brush.context.globalCompositeOperation = 'destination-out';
            } else {
                modeInfo.brush.context.globalCompositeOperation = 'source-over';
            }
            modeInfo.brush.context.beginPath();

            var judgeTpId = dap.getJudgeTpId();
            var image;
            stage.find('.' + modeInfo.brush.name).forEach(function (obj) {
                if (obj.getAttr("judgeTpId") == judgeTpId) {
                    image = obj;
                }
            });

            var localPos = {
                x: modeInfo.brush.lastPointerPosition.x - image.x(),
                y: modeInfo.brush.lastPointerPosition.y - image.y()
            };
            modeInfo.brush.context.moveTo(localPos.x, localPos.y);

            localPos = {
                x: pointer.x - image.x(),
                y: pointer.y - image.y()
            };
            modeInfo.brush.context.lineTo(localPos.x, localPos.y);
            modeInfo.brush.context.closePath();
            modeInfo.brush.context.stroke();

            modeInfo.brush.lastPointerPosition = pointer;
            
            image.setAttr("isDrawn", true);

            layer.batchDraw();

            // 선이 그어 진 후 상태저장
            dap.saveCanvasState();

            break;
        case 'FillBrush':
            if (!modeInfo.fillBrush.fillBrushLine) return;

            // 선이 그어 진 후 상태저장
            modeInfo.fillBrush.fillBrushLine.points(modeInfo.fillBrush.fillBrushLine.points().concat([pointer.x, pointer.y])).draw();

            break;
    }
});

stage.on('mouseup', function (e) {
    var pointer = dap.getPointer();

    // 현재 선택한 모드에 따른 처리
    switch (modeInfo.mode) {
        case 'Brush':
            modeInfo.brush.isPaint = false;

            break;
        case 'FillBrush':
            if (!modeInfo.fillBrush.fillBrushLine) return;

            modeInfo.fillBrush.fillBrushLine.closed(true).draw();

            var originalStrokeColor = modeInfo.fillBrush.fillBrushLine.getAttr('stroke');

            modeInfo.fillBrush.fillBrushLine.on('dragstart', function (e) {
        		stage.find('Transformer').destroy();
        		dap.createTransformer(e.target);
            }).on('dragend', dap.saveCanvasState
            ).on('mouseover', function (e) { dap.setMouserover(e) }
            ).on('mouseout', function (e) { dap.setMouserout(e, originalStrokeColor) });
            
            modeInfo.fillBrush.fillBrushLine = undefined;

            break;
    }
});

stage.on('wheel', function (e) {
    // delta: 마우스휠 수치 (100단위)
    dap.zoomCanvas(e.evt.deltaY, e.evt);
});

// 캔버스 관련 전역 함수
var dap = {
    // 캔버스 기본값 설정
    initCanvas: function () {
    	dap.setModeinfo('Select');
    },
    // 배경 이미지 지정 (이미지 소스, 가로길이, 세로길이, 이미지 로딩 완료 후 호출 함수)
    setBackgroundImage: function (imgSrc, imgWidth, imgHeight, funcName) {
    	bgImageWidth = imgWidth;
    	bgImageHeight = imgHeight;
        var imageObj = new Image();
        imageObj.onerror = function () {
        	if (bgImage) {
        		bgImage.image(null);
        		stage.batchDraw();
        	}
        }
        imageObj.onload = function () {
            if (!bgImage) {
                bgImage = new Konva.Image({
                    x: 0,
                    y: 0,
                    image: imageObj,
                    width: bgImageWidth,
                    height: bgImageHeight
                });
                var backgroundLayer = new Konva.Layer({
                    name: backgroundLayerName
                });
                backgroundLayer.add(bgImage);
                stage.add(backgroundLayer);
                backgroundLayer.setZIndex(0);
            } else {
                bgImage.image(imageObj);
            }
            
            window[funcName]();
        };
        imageObj.src = imgSrc;
    },
    // 스테이지 크기 조절
    setStageSize: function (width, height) {
        stage.width(width).height(height);
        var scaleByImage = Math.round(stage.width() / bgImageWidth * 10) / 10;
        if (bgImageHeight > bgImageWidth) {
        	scaleByImage = Math.round(stage.height() / bgImageHeight * 10) / 10;
        }
        stage.scale({ x: scaleByImage, y: scaleByImage });
        stage.batchDraw();
    },
    // 스테이지 크기를 화면에 맞게
    setStageSizeToFit: function () {
    	var scaleByImage = Math.round(stage.width() / bgImageWidth * 10) / 10;
        if (bgImageHeight > bgImageWidth) {
        	scaleByImage = Math.round(stage.height() / bgImageHeight * 10) / 10;
        }
        stage.scale({ x: scaleByImage, y: scaleByImage });
        stage.batchDraw();
    },
    // 모드 관련 초기화
    setModeinfo: function (mode) {
        modeInfo.mode = mode;
        modeInfo.rect.step = 0;
        modeInfo.fillBrush.fillBrushLine = undefined;
        modeInfo.fillBrush.isPaint = false;

        switch (mode) {
            case 'Select':
                break;
            case 'Brush':
                // 브러쉬 모드일때 캔버스 추가를 위한 셋팅
                var judgeTpId = dap.getJudgeTpId();
                var brushImageExists = false;
                stage.find('.' + modeInfo.brush.name).forEach(function (obj) {
                    if (obj.getAttr("judgeTpId") == judgeTpId) {
                        brushImageExists = true;
                        modeInfo.brush.context = obj.image().getContext('2d');
                    }
                });

                if (!brushImageExists) {
                    var canvas = document.createElement('canvas');
                    canvas.width = bgImageWidth;
                    canvas.height = bgImageHeight;
                    var image = new Konva.Image({
                        name: modeInfo.brush.name,
                        image: canvas,
                        x: 0,
                        y: 0,
                        judgeTpId: dap.getJudgeTpId(),
                        judgeTpCd: dap.getJudgeTpCd()
                    });
                    layer.add(image);
                    image.setZIndex(0);
                    modeInfo.brush.context = canvas.getContext('2d');
                    modeInfo.brush.context.strokeStyle = modeInfo.brush.strokeColor;
                    modeInfo.brush.context.lineJoin = 'round';
                    modeInfo.brush.context.lineWidth = modeInfo.brush.strokeWidth;
                }
                break;
            case 'FillBrush':
                modeInfo.fillBrush.isPaint = true;
                break;
            case 'Rectangle':
                modeInfo.rect.step = 1;
                break;
            case 'Polygon':
                modeInfo.poly.circleCount = 0;
                modeInfo.poly.polygonCount++;
                modeInfo.poly.polygonGroup = new Konva.Group();
                break;
        }
        
        if (mode == "Select") {
        	stage.draggable(true);
            stage.find('.' + modeInfo.fillBrush.name).forEach(function (obj) { obj.draggable(true); });
            stage.find('.' + modeInfo.rect.name).forEach(function (obj) { obj.draggable(true); });
            stage.find('.' + modeInfo.poly.circleName).forEach(function (obj) { obj.draggable(true); });
            stage.find('Group').forEach(function (obj) { obj.draggable(true); });
        } else {
        	stage.draggable(false);
            stage.find('.' + modeInfo.fillBrush.name).forEach(function (obj) { obj.draggable(false); });
            stage.find('.' + modeInfo.rect.name).forEach(function (obj) { obj.draggable(false); });
            stage.find('.' + modeInfo.poly.circleName).forEach(function (obj) { obj.draggable(false); });
            stage.find('Group').forEach(function (obj) { obj.draggable(false); });
        }

        dap.destroyTrashObjects();
    },
    // 쓸모없는 오브젝트 삭제
    destroyTrashObjects: function () {
    	stage.find('Transformer').destroy();
    	
        // 사각형모드 첫번째 동그라미 삭제
        stage.find('Circle').filter(function (obj) {
            return !obj.getAttr('polygonCount');
        }).forEach(function (obj) {
            obj.destroy();
        });

        // 폴리곤모드 동그라미만 남은 부분 삭제
        stage.find('Circle').filter(function (obj) {
            return obj.getAttr('polygonCount');
        }).forEach(function (obj) {
            var exists = false;
            stage.find('Line').forEach(function (lineObj) {
                if (obj.getAttr('polygonCount') == lineObj.getAttr('polygonCount')) {
                    exists = true;
                }
            });
            if (!exists) obj.destroy();
        });

        layer.batchDraw();
    },
    // 현재 마우스 커서의 위치값 반환
    getPointer: function () {
        var transform = stage.getAbsoluteTransform().copy();
        transform.invert();
        return transform.point(stage.getPointerPosition());
    },
    // 캔버스 줌
    zoomCanvas: function (delta, evt) {
        var oldScale = Math.round(stage.scaleX() * 100) / 100;
        var newScale = 1;
        if (delta) {
            newScale = Math.round((delta > 0 ? oldScale - 0.1 : oldScale + 0.1) * 100) / 100;
        }

        if (newScale > 10) {
            newScale = 10;
        } else if (newScale < 0.1) {
            newScale = 0.1;
        }
        stage.scale({ x: newScale, y: newScale });

        var newPos = { x: 0, y: 0 };
        if (evt) {
            var mousePointTo = {
                x: Math.round(stage.getPointerPosition().x / oldScale) - Math.round(stage.x() / oldScale),
                y: Math.round(stage.getPointerPosition().y / oldScale) - Math.round(stage.y() / oldScale)
            };

            newPos = {
                x: -(mousePointTo.x - Math.round(stage.getPointerPosition().x / newScale)) * newScale,
                y: -(mousePointTo.y - Math.round(stage.getPointerPosition().y / newScale)) * newScale
            };
        }
        stage.position(newPos);
        stage.batchDraw();

        stage.find('Transformer').forceUpdate();

        $('#zoom-info').text(Math.round(newScale * 100) + '%');

        return [(Math.round((newScale - 0.1) * 100) / 100 <= 0.1 ? false : true), (Math.round((newScale + 0.1) * 100) / 100 >= 10 ? false : true)]
    },
    // 캔버스의 모든 상태를 저장
    saveCanvasState: function () {
        if (canvasState.saving) {
            canvasState.undo.push(dap.saveToJSON());
        }
    },
    // 캔버스 언두
    undoCanvas: function () {
        if (!canvasState.undo[canvasState.undo.length - 2]) return;

        canvasState.redo.push(canvasState.undo.pop());

        canvasState.saving = false;
        var konvaJSON = canvasState.undo[canvasState.undo.length - 1];
        dap.loadFromJSON(konvaJSON);
        canvasState.saving = true;

        return [(canvasState.undo.length < 2 ? false : true), (canvasState.redo.length > 0 ? true : false)]
    },
    // 캔버스 리두
    redoCanvas: function () {
        if (!canvasState.redo[canvasState.redo.length - 1]) return;

        canvasState.undo.push(canvasState.redo.pop());

        canvasState.saving = false;
        var konvaJSON = canvasState.undo[canvasState.undo.length - 1];
        dap.loadFromJSON(konvaJSON);
        canvasState.saving = true;

        return [(canvasState.undo.length < 2 ? false : true), (canvasState.redo.length > 0 ? true : false)]
    },
    // 캔버스의 모든 상태를 초기화
    resetCanvasState: function () {
        canvasState.undo = [];
        canvasState.redo = [];
        canvasState.saving = true;
    },
    // 객체 색상 정의
    setShapesColor: function (hex) {
    	if (!hex) return;
    	
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        var rgbColor = function (alpha) {
            return 'rgba(' + parseInt(result[1], 16) + ', ' + parseInt(result[2], 16) + ', ' + parseInt(result[3], 16) + ', ' + alpha + ')';
        }

        modeInfo.brush.strokeColor = rgbColor(1);
        if (modeInfo.brush.context) {
            modeInfo.brush.context.strokeStyle = rgbColor(1);
        }
        modeInfo.fillBrush.strokeColor = rgbColor(1);
        modeInfo.fillBrush.fillColor = rgbColor(0.4);
        modeInfo.rect.strokeColor = rgbColor(1);
        modeInfo.rect.fillColor = rgbColor(0.4);
        modeInfo.poly.strokeColor = rgbColor(1);
        modeInfo.poly.fillColor = rgbColor(0.4);
    },
    // 객체 선굵기 지정
    setShapesStrokeWidth: function (strokeWidth) {
        modeInfo.brush.strokeWidth = strokeWidth;
        if (modeInfo.brush.context) {
            modeInfo.brush.context.lineWidth = strokeWidth;
        }
        modeInfo.fillBrush.strokeWidth = strokeWidth;
        modeInfo.rect.strokeWidth = strokeWidth;
        modeInfo.poly.strokeWidth = strokeWidth;
    },
    // 브러쉬 모드 => 지우개 모드 선택
    setBrushEraseMode: function (brushEraseMode) {
        if (brushEraseMode) {
            modeInfo.brush.erase = true;
        } else {
            modeInfo.brush.erase = false;
        }
    },
    // 트랜스포머 생성
    createTransformer: function (target) {
        var tr = new Konva.Transformer();
        tr.attachTo(target);
        tr.keepRatio(false);
        tr.rotateEnabled(false);
        layer.add(tr);
    },
    // 브러쉬 채우기 라인 생성
    createFillBrushLine: function (pointer) {
        var newObj = new Konva.Line({
            name: modeInfo.fillBrush.name,
            points: [pointer.x, pointer.y],
            fill: modeInfo.fillBrush.fillColor,
            stroke: modeInfo.fillBrush.strokeColor,
            strokeWidth: modeInfo.fillBrush.strokeWidth,
            tension: 0.1,
            strokeScaleEnabled: false,
            judgeTpId: dap.getJudgeTpId(),
            judgeTpCd: dap.getJudgeTpCd()
        });

        return newObj;
    },
    // 사각형 모드에서 시작점 생성
    createRectangleStartPoint: function (pointer) {
        var newObj = new Konva.Circle({
            x: pointer.x,
            y: pointer.y,
            radius: modeInfo.rect.strokeWidth / 2,
            fill: modeInfo.rect.fillColor,
            stroke: modeInfo.rect.strokeColor,
            strokeWidth: modeInfo.rect.strokeWidth
        });

        var originalStrokeColor = newObj.getAttr('stroke');

        newObj.on('mouseover', function (e) { dap.setMouserover(e) }
        ).on('mouseout', function (e) { dap.setMouserout(e, modeInfo.rect.strokeColor) });
        return newObj;
    },
    // 사각형 모드에서 사각형 생성
    createRectangle: function (pointer) {
        var newObj = new Konva.Rect({
            name: modeInfo.rect.name,
            x: modeInfo.rect.startPoint.x(),
            y: modeInfo.rect.startPoint.y(),
            width: pointer.x - modeInfo.rect.strokeWidth / 2 - modeInfo.rect.startPoint.x(),
            height: pointer.y - modeInfo.rect.strokeWidth / 2 - modeInfo.rect.startPoint.y(),
            fill: modeInfo.rect.fillColor,
            stroke: modeInfo.rect.strokeColor,
            strokeWidth: modeInfo.rect.strokeWidth,
            strokeScaleEnabled: false,
            judgeTpId: dap.getJudgeTpId(),
            judgeTpCd: dap.getJudgeTpCd()
        });

        var originalStrokeColor = newObj.getAttr('stroke');

        newObj.on('dragstart', function (e) {
            stage.find('Transformer').destroy();
            dap.createTransformer(e.target);
        }).on('dragend', dap.saveCanvasState
        ).on('mouseover', function (e) { dap.setMouserover(e) }
        ).on('mouseout', function (e) { dap.setMouserout(e, originalStrokeColor) });
        return newObj;
    },
    // 폴리곤 모드에서 점을 생성
    createPolygonPoint: function (pointer) {
        var newObj = new Konva.Circle({
            name: modeInfo.poly.circleName,
            x: pointer.x,
            y: pointer.y,
            radius: (modeInfo.poly.strokeWidth / 2) + 2,
            fill: modeInfo.poly.strokeColor,
            stroke: modeInfo.poly.strokeColor,
            strokeWidth: 4,
            polygonCount: modeInfo.poly.polygonCount,
            strokeScaleEnabled: false,
            judgeTpId: dap.getJudgeTpId(),
            judgeTpCd: dap.getJudgeTpCd()
        });

        var originalPolygonCoount = newObj.getAttr('polygonCount');
        var originalStrokeColor = newObj.getAttr('stroke');

        newObj.on('dragmove', function (e) {
            var points = [];
            stage.find('Circle').filter(function (obj) {
                return obj.getAttr('polygonCount') == originalPolygonCoount;
            }).forEach(function (obj) {
                points.push(obj.x());
                points.push(obj.y());
            });

            stage.find('Line').forEach(function (obj) {
                if (obj.getAttr('polygonCount') == originalPolygonCoount) {
                    obj.points(points);
                }
            });

            stage.find('Transformer').forceUpdate();
        }).on('mouseover', function (e) { dap.setMouserover(e) }
        ).on('mouseout', function (e) { dap.setMouserout(e, originalStrokeColor) });
        return newObj;
    },
    // 폴리곤 모드에서 다각형을 생성
    createPolygon: function (points) {
        var newObj = new Konva.Line({
            name: modeInfo.poly.name,
            points: points,
            fill: modeInfo.poly.fillColor,
            stroke: modeInfo.poly.strokeColor,
            strokeWidth: modeInfo.poly.strokeWidth,
            closed: true,
            polygonCount: modeInfo.poly.polygonCount,
            strokeScaleEnabled: false,
            judgeTpId: dap.getJudgeTpId(),
            judgeTpCd: dap.getJudgeTpCd()
        });

        var originalStrokeColor = newObj.getAttr('stroke');

        newObj.on('dragstart', function (e) {
        	stage.find('Transformer').destroy();
            dap.createTransformer(e.target);
        }).on('dragend', dap.saveCanvasState
        ).on('mouseover', function (e) { dap.setMouserover(e) }
        ).on('mouseout', function (e) { dap.setMouserout(e, originalStrokeColor) });
        return newObj;
    },
    // 마우스 오버시 도형 설정
    setMouserover: function (e) {
        document.body.style.cursor = 'pointer';
        e.target.stroke(selectedStrokeColor);
        layer.batchDraw();
    },
    // 마우스 아웃시 도형 설정
    setMouserout: function (e, originalStrokeColor) {
        document.body.style.cursor = 'default';
        e.target.stroke(originalStrokeColor);
        layer.batchDraw();
    },
    // 현재 선택된 오브젝트 삭제
    deleteObject: function () {
        var transformers = stage.find('Transformer');
        transformers.each(function (transformer) {
            transformer._node.destroy();
            transformer.destroy();
        });
        layer.batchDraw();
        
        dap.saveCanvasState();
    },
    // 캔버스 초기화
    clearCanvas: function () {
        stage.getChildren(function (obj) {
            return obj.getName() != backgroundLayerName;
        }).destroyChildren().draw();
        
        dap.saveCanvasState();
    },
    // 저장 버튼 (JSON 형태로 반환)
    saveToJSON: function () {
        dap.destroyTrashObjects();

        var konvaJSON = new Object();

        konvaJSON[modeInfo.brush.name] = [];
        stage.find('.' + modeInfo.brush.name).forEach(function (obj) {
            var fromScaleX = obj.scaleX();
            var fromScaleY = obj.scaleY();
            var toScaleX = Math.round(fromScaleX / stage.scaleX() * 10) / 10;
            var toScaleY = Math.round(fromScaleY / stage.scaleX() * 10) / 10;
            obj.scale({ x: toScaleX, y: toScaleY });
            var dataURL = obj.toDataURL();
            obj.scale({ x: fromScaleX, y: fromScaleY });
            konvaJSON[modeInfo.brush.name].push({ ...obj.getAttrs(), dataURL: dataURL });
        });

        konvaJSON[modeInfo.fillBrush.name] = [];
        stage.find('.' + modeInfo.fillBrush.name).forEach(function (obj) {
            konvaJSON[modeInfo.fillBrush.name].push(obj.getAttrs());
        });

        konvaJSON[modeInfo.rect.name] = [];
        stage.find('.' + modeInfo.rect.name).forEach(function (obj) {
            konvaJSON[modeInfo.rect.name].push(obj.getAttrs());
        });

        konvaJSON[modeInfo.poly.circleName] = [];
        stage.find('.' + modeInfo.poly.circleName).forEach(function (obj) {
            konvaJSON[modeInfo.poly.circleName].push(obj.getAttrs());
        });
        konvaJSON[modeInfo.poly.name] = [];
        stage.find('.' + modeInfo.poly.name).forEach(function (obj) {
            konvaJSON[modeInfo.poly.name].push(obj.getAttrs());
        });

        return konvaJSON;
    },
    // 로드 버튼
    loadFromJSON: function (konvaJSON) {
        if (konvaJSON) {
            dap.clearCanvas();

            if (konvaJSON[modeInfo.brush.name]) {
                konvaJSON[modeInfo.brush.name].forEach(function (newObj, index) {
                    var canvas = document.createElement('canvas');
                    canvas.width = bgImageWidth;
                    canvas.height = bgImageHeight;
                    
                    var imageObj = new Image();
                    imageObj.onload = function () {
                        var image = new Konva.Image({
                            name: modeInfo.brush.name,
                            image: canvas,
                            x: 0,
                            y: 0,
                            judgeTpId: newObj.judgeTpId,
                            judgeTpCd: newObj.judgeTpCd,
                            isDrawn: true
                        });
                        layer.add(image);
                        image.setZIndex(0);
                        modeInfo.brush.context = canvas.getContext('2d');
                        modeInfo.brush.context.strokeStyle = modeInfo.brush.strokeColor;
                        modeInfo.brush.context.lineJoin = 'round';
                        modeInfo.brush.context.lineWidth = modeInfo.brush.strokeWidth;

                        modeInfo.brush.context.drawImage(imageObj, 0, 0);
                        image.draw();
                    };
                    imageObj.src = newObj.dataURL;
                });
            }

            if (konvaJSON[modeInfo.fillBrush.name]) {
                konvaJSON[modeInfo.fillBrush.name].forEach(function (newObj) {
                    layer.add(
                        new Konva.Line(newObj).on('dragend', dap.saveCanvasState
                        ).on('mouseover', function (e) { dap.setMouserover(e) }
                        ).on('mouseout', function (e) { dap.setMouserout(e, newObj.stroke) }
                        ).on('dragstart', function (e) {
                            stage.find('Transformer').destroy();
                            dap.createTransformer(e.target);
                        })
                    );
                });
            }
            if (konvaJSON[modeInfo.rect.name]) {
                konvaJSON[modeInfo.rect.name].forEach(function (newObj) {
                    layer.add(
                        new Konva.Rect(newObj).on('dragstart', function (e) {
                            stage.find('Transformer').destroy();
                            dap.createTransformer(e.target);
                        }).on('dragend', dap.saveCanvasState
                        ).on('mouseover', function (e) { dap.setMouserover(e) }
                        ).on('mouseout', function (e) { dap.setMouserout(e, newObj.stroke) })
                    );
                });
            }
            if (konvaJSON[modeInfo.poly.name]) {
                modeInfo.poly.polygonCount = 1;
                konvaJSON[modeInfo.poly.name].forEach(function (newObj) {
                    modeInfo.poly.polygonGroup = new Konva.Group();
                    var newPolygonCount = modeInfo.poly.polygonCount++;
                    var originalStrokeColor = newObj.stroke;

                    if (konvaJSON[modeInfo.poly.circleName]) {
                        konvaJSON[modeInfo.poly.circleName].filter(function (newCircleObj) {
                            return newCircleObj.polygonCount == newObj.polygonCount;
                        }).forEach(function (newCircleObj) {
                            var originalCircleStrokeColor = newCircleObj.stroke;

                            modeInfo.poly.polygonGroup.add(
                                new Konva.Circle({
                                    name: newCircleObj.name,
                                    x: newCircleObj.x,
                                    y: newCircleObj.y,
                                    radius: (newCircleObj.strokeWidth / 2) + 2,
                                    fill: newCircleObj.fill,
                                    stroke: newCircleObj.stroke,
                                    strokeWidth: 4,
                                    polygonCount: newPolygonCount,
                                    strokeScaleEnabled: false,
                                    judgeTpId: newCircleObj.judgeTpId,
                                    judgeTpCd: newCircleObj.judgeTpCd
                                }).on('dragmove', function (e) {
                                    var points = [];
                                    stage.find('Circle').filter(function (obj) {
                                        return obj.getAttr('polygonCount') == newPolygonCount;
                                    }).forEach(function (obj) {
                                        points.push(obj.x());
                                        points.push(obj.y());
                                    });

                                    stage.find('Line').forEach(function (obj) {
                                        if (obj.getAttr('polygonCount') == newPolygonCount) {
                                            obj.points(points);
                                        }
                                    });

                                    stage.find('Transformer').forceUpdate();
                                }).on('dragend', dap.saveCanvasState
                                ).on('mouseover', function (e) { dap.setMouserover(e) }
                                ).on('mouseout', function (e) { dap.setMouserout(e, originalCircleStrokeColor) })
                            );
                        });
                    }

                    var polygon = new Konva.Line({
                        name: newObj.name,
                        points: newObj.points,
                        fill: newObj.fill,
                        stroke: newObj.stroke,
                        strokeWidth: newObj.strokeWidth,
                        closed: true,
                        polygonCount: newPolygonCount,
                        strokeScaleEnabled: false,
                        judgeTpId: newObj.judgeTpId,
                        judgeTpCd: newObj.judgeTpCd
                    }).on('dragstart', function (e) {
                        stage.find('Transformer').destroy();
                        dap.createTransformer(e.target);
                    }).on('dragend', dap.saveCanvasState
                    ).on('mouseover', function (e) { dap.setMouserover(e) }
                    ).on('mouseout', function (e) { dap.setMouserout(e, originalStrokeColor) });
                    modeInfo.poly.polygonGroup.add(polygon);
                    polygon.setZIndex(0);
                    layer.add(modeInfo.poly.polygonGroup);
                });
            }

            layer.batchDraw();

            dap.saveCanvasState();
        }
    },
    // 사각형 정보 가져오기
    getRectInfo: function () {

    },
    // 현재 선택된 판정값을 반환
    getJudgeTpId: function () {
        return $("#imageLabel_judgeTpId").val();
    },
    // 현재 선택된 판정값을 반환
    getJudgeTpCd: function () {
        return $("#imageLabel_judgeTpId option:selected").data("judge_tp_cd");
    },
    // 현재 이미지를 투명, 검은색 배경의 data URL 로 반환
    saveToDataURL: function (labelTp) {
    	dap.destroyTrashObjects();
    	
        var formData = new FormData();

        var orgBgImageImage = (bgImage ? bgImage.image() : null);
        var orgStagePosition = { x: stage.x(), y: stage.y() };
        var orgStageWidth = stage.width();
        var orgStageHeight = stage.height();
        var orgStageScale = { x: stage.scaleX(), y: stage.scaleY() };

        // 썸네일용 전체 이미지
        stage.position({ x: 0, y: 0 });
        stage.width(bgImageWidth);
        stage.height(bgImageHeight);
        stage.scale({ x: 1, y: 1 });
        var canvasToBlob = dap.dataURItoBlob(stage.toDataURL());
        formData.append('canvasToBlob', canvasToBlob, 'canvasToBlob.png');

        // 배경검은색이미지
        if (labelTp == "SGMT") {
        	if (bgImage) {
        		bgImage.image(null);
        		bgImage.fill('black');
        	}

            // 판정값별로 생성
            var judgeTpJSON = dap.getCanvasJudgeTpJSON();
            
            var judgeTpIdArr = judgeTpJSON.judgeTpIdArr;
            var judgeTpCdArr = judgeTpJSON.judgeTpCdArr;
            
            if (judgeTpIdArr.length < 1) {
            	judgeTpIdArr.push($("#imageLabel_judgeTpId").val());
            	judgeTpCdArr.push($("#imageLabel_judgeTpId option:selected").data("judge_tp_cd"));
            }
            
            for (var i = 0; i < judgeTpIdArr.length; i++) {
                var judgeTpId = judgeTpIdArr[i];
                var judgeTpCd = judgeTpCdArr[i];
                formData.append('judgeTpIdArr', judgeTpId);
                formData.append('judgeTpCdArr', judgeTpCd);

                // judgeTpId 가 동일한 객체만 보이게 한다
                stage.find('.' + modeInfo.brush.name).forEach(function (obj) {
                    if (obj.getAttr("judgeTpId") == judgeTpId && obj.isDrawn) {
                    	obj.show();
                    } else {
                        obj.hide();
                    }
                });
                stage.find('.' + modeInfo.fillBrush.name).forEach(function (obj) {
                    if (obj.getAttr("judgeTpId") == judgeTpId) {
                    	obj.setAttr('originalFill', obj.fill());
                    	obj.fill(obj.stroke());
                        obj.show();
                    } else {
                        obj.hide();
                    }
                });
                stage.find('.' + modeInfo.rect.name).forEach(function (obj) {
                    if (obj.getAttr("judgeTpId") == judgeTpId) {
                    	obj.setAttr('originalFill', obj.fill());
                    	obj.fill(obj.stroke());
                        obj.show();
                    } else {
                        obj.hide();
                    }
                });
                stage.find('.' + modeInfo.poly.circleName).forEach(function (obj) { obj.hide(); });
                stage.find('.' + modeInfo.poly.name).forEach(function (obj) {
                    if (obj.getAttr("judgeTpId") == judgeTpId) {
                    	obj.setAttr('originalFill', obj.fill());
                    	obj.fill(obj.stroke());
                        obj.show();
                    } else {
                        obj.hide();
                    }
                });

                var blackBgBlob = dap.dataURItoBlob(stage.toDataURL());
                formData.append('blackBgBlobArr', blackBgBlob, 'blackBgBlob.' + judgeTpCd + '.jpg');
            }
        }

        if (bgImage) {
        	bgImage.image(orgBgImageImage);
        	bgImage.fill(null);
        }
        stage.position(orgStagePosition);
        stage.width(orgStageWidth);
        stage.height(orgStageHeight);
        stage.scale(orgStageScale);

        // judgeTpId 별로 숨긴 객체를 모두 보이게 한다.
        stage.find('.' + modeInfo.brush.name).forEach(function (obj) { obj.show(); });
        stage.find('.' + modeInfo.fillBrush.name).forEach(function (obj) {
        	obj.fill(obj.getAttr('originalFill'));
        	obj.show();
        });
        stage.find('.' + modeInfo.rect.name).forEach(function (obj) {
        	obj.fill(obj.getAttr('originalFill'));
        	obj.show();
        });
        stage.find('.' + modeInfo.poly.circleName).forEach(function (obj) { obj.show(); });
        stage.find('.' + modeInfo.poly.name).forEach(function (obj) {
        	obj.fill(obj.getAttr('originalFill'));
        	obj.show();
        });

        stage.batchDraw();

        return formData;
    },
    // DataURL의 이미지 데이터를 바이너리 형태로 변환
    dataURItoBlob: function (dataURI) {
        var byteString = atob(dataURI.split(',')[1]);
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        var blob = new Blob([ab], { type: mimeString });
        return blob;
    },
    // 그려진 이미지 중에서 라벨링 값의 배열을 반환
    getCanvasJudgeTpJSON: function () {
        var konvaJSON = dap.saveToJSON();

        var returnJSON = new Object();
        returnJSON.judgeTpIdArr = [];
        returnJSON.judgeTpCdArr = [];
        if (konvaJSON[modeInfo.brush.name].length > 0) {
            konvaJSON[modeInfo.brush.name].forEach(function (obj) {
                if (obj.judgeTpId && returnJSON.judgeTpIdArr.indexOf(obj.judgeTpId) == -1 && obj.isDrawn) {
                    returnJSON.judgeTpIdArr.push(obj.judgeTpId);
                    returnJSON.judgeTpCdArr.push(obj.judgeTpCd);
                }
            });
        }
        if (konvaJSON[modeInfo.fillBrush.name].length > 0) {
            konvaJSON[modeInfo.fillBrush.name].forEach(function (obj) {
                if (obj.judgeTpId && returnJSON.judgeTpIdArr.indexOf(obj.judgeTpId) == -1) {
                    returnJSON.judgeTpIdArr.push(obj.judgeTpId);
                    returnJSON.judgeTpCdArr.push(obj.judgeTpCd);
                }
            });
        }
        if (konvaJSON[modeInfo.rect.name].length > 0) {
            konvaJSON[modeInfo.rect.name].forEach(function (obj) {
                if (obj.judgeTpId && returnJSON.judgeTpIdArr.indexOf(obj.judgeTpId) == -1) {
                    returnJSON.judgeTpIdArr.push(obj.judgeTpId);
                    returnJSON.judgeTpCdArr.push(obj.judgeTpCd);
                }
            });
        }
        if (konvaJSON[modeInfo.poly.name].length > 0) {
            konvaJSON[modeInfo.poly.name].forEach(function (obj) {
                if (obj.judgeTpId && returnJSON.judgeTpIdArr.indexOf(obj.judgeTpId) == -1) {
                    returnJSON.judgeTpIdArr.push(obj.judgeTpId);
                    returnJSON.judgeTpCdArr.push(obj.judgeTpCd);
                }
            });
        }

        return returnJSON;
    }
};

dap.initCanvas();
dap.setBackgroundImage('san-andreas-alexandra-daddario-dwayne-johnson.jpg', 4928, 3280, 'load');
