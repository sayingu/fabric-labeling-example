var defaultStrokeColor = 'rgba(255, 0, 0, 0.8)';
var defaultStrokeWidth = 5;
var defaultFillColor = 'rgba(255, 0, 0, 0.4)';
var selectedStrokeColor = 'rgba(30, 144, 255, 0.8)';

// 각 모드별 정보 변수
var modeInfo = {
    mode: '',
    brush: {
        name: 'imageForBrush',
        strokeColor: defaultFillColor,
        strokeWidth: defaultStrokeWidth,
        eraseColor: 'white',
        context: null,
        lastPointerPosition: null,
        isPaint: false
    },
    fillBrush: {
        name: 'fillBrush',
        strokeColor: defaultStrokeColor,
        strokeWidth: defaultStrokeWidth,
        fillColor: defaultFillColor,
        fillBrushLine: null,
        isPaint: false
    },
    rect: {
        name: 'rectangle',
        circleName: 'circleForRectangle',
        labelName: 'labelForRectangle',
        groupName: 'groupForRectangle',
        strokeColor: defaultStrokeColor,
        strokeWidth: defaultStrokeWidth,
        fillColor: defaultFillColor,
        step: 0,
        startPoint: null,
        rectCount: 1,
        rectGroup: null,
        labelFontSize: 15,
        labelPadding: 8,
        guideName: 'lineForRectangle',
        guideLineX: null,
        guideLineY: null
    },
    poly: {
        name: 'polygon',
        circleName: 'circleForPolygon',
        groupName: 'groupForPolygon',
        strokeColor: defaultStrokeColor,
        strokeWidth: defaultStrokeWidth,
        fillColor: defaultFillColor,
        circleCount: 0,
        polygonCount: 0,
        polygonGroup: null
    },
    guideCircle: {
    	name: 'circleForGuide',
    	obj: null
    },
    guideLine: {
    	name: 'lineForGuide',
    	objX: null,
    	objY: null
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
var stage = null;
stage = new Konva.Stage({
    container: konvaContainerId,
    width: $konvaContainer.width(),
    height: $konvaContainer.height()
});

var layer = null;
layer = new Konva.Layer();
stage.add(layer);

var guideLayer = null;
guideLayer = new Konva.Layer();
stage.add(guideLayer);

var bgImage = null;
var bgImageWidth = 0;
var bgImageHeight = 0;
var backgroundLayerName = 'backgroundLayer';

// 캔버스 관련 이벤트
stage.on('mouseover', function (e) {
	if (e.target.getType() == "Stage") {
		if (modeInfo.mode != "Select") {
			document.body.style.cursor = 'not-allowed';
		}
	} else {
		document.body.style.cursor = 'default';
	}
});
stage.on('mouseout', function (e) {
	document.body.style.cursor = 'default';
});

stage.on('click', function (e) {
    layer.find('Transformer').destroy();

    var targetName = e.target.getName();
    var pointer = dap.getPointer();

    // 현재 선택한 모드에 따른 처리
    switch (modeInfo.mode) {
        case 'Select':
            if (targetName == modeInfo.fillBrush.name) {
                dap.createTransformer(e.target);
            } else if (targetName == modeInfo.rect.name) {
                dap.createTransformer(e.target.getParent());
            } else if (targetName == modeInfo.poly.circleName || targetName == modeInfo.poly.name) {
                dap.createTransformer(e.target.getParent());
            }
            break;
        case 'Brush':
            break;
        case 'FillBrush':
            break;
        case 'Rectangle':
        	if (e.target.getType() == "Stage") return;
        	
            if (modeInfo.rect.step == 0) {
                if (targetName == modeInfo.rect.name) {
                    dap.createTransformer(e.target);
                }
            } else if (modeInfo.rect.step == 1) {
                modeInfo.rect.startPoint = dap.createRectangleStartPoint(pointer);
                layer.add(modeInfo.rect.startPoint).batchDraw();

                modeInfo.rect.step = 2;
            } else if (modeInfo.rect.step == 2) {
                modeInfo.rect.startPoint.destroy();
                
                modeInfo.rect.rectGroup = new Konva.Group({
                	name: modeInfo.rect.groupName,
                	rectCount: modeInfo.rect.rectCount
                }).on('dragstart', function (e) {
                    layer.find('Transformer').destroy();
                    if (e.target.getType() == "Group") {
                    	dap.createTransformer(e.target);
                    } else {
                    	dap.createTransformer(e.target.getParent());
                    }
                }).on('dragend', function () { dap.saveCanvasState(modeInfo.rect.groupName + ' dragend');
                }).on('transformend', function () { dap.saveCanvasState(modeInfo.rect.groupName + ' transformend');
                });
                
                var newObj = dap.createRectangle(pointer);
                modeInfo.rect.rectGroup.add(newObj);
                modeInfo.rect.rectGroup.add(dap.createRectangleLabel({ x: newObj.x(), y: newObj.y() }));
                layer.add(modeInfo.rect.rectGroup).batchDraw();
                
                // 네모가 그려진 후 상태저장
                dap.saveCanvasState('stage clicked rect step 2');

                modeInfo.rect.step = 1;
                modeInfo.rect.rectCount++;
            }
            break;
        case 'Polygon':
        	if (e.target.getType() == "Stage") return;
        	
            modeInfo.poly.circleCount++;

            modeInfo.poly.polygonGroup.add(dap.createPolygonPoint(pointer));
            layer.add(modeInfo.poly.polygonGroup).batchDraw();

            // 점이 3개 이상이면 폴리곤 그리기
            if (modeInfo.poly.circleCount > 2) {
                var points = [];
                layer.find('Circle').filter(function (obj) {
                    return obj.getAttr('polygonCount') == modeInfo.poly.polygonCount;
                }).forEach(function (obj) {
                    points.push(obj.x());
                    points.push(obj.y());
                });

                var existsPolygon = null;
                layer.find('Line').forEach(function (obj) {
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
                    layer.add(modeInfo.poly.polygonGroup).batchDraw();
                }
                // 점추가 3개 이상일 경우 폴리곤 까지 변경 후 상태저장
                dap.saveCanvasState('stage clicked poly circle over three');
            }
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

            if (e.target.getType() == "Stage") return;
            
            modeInfo.fillBrush.fillBrushLine = dap.createFillBrushLine(pointer);
            layer.add(modeInfo.fillBrush.fillBrushLine).batchDraw();

            break;
    }
});

stage.on('mousemove', function (e) {
    var pointer = dap.getPointer();
    
    // 현재 선택한 모드에 따른 처리
    switch (modeInfo.mode) {
        case 'Brush':
        	dap.createOrUpdateGuideCircle();
        	
            if (!modeInfo.brush.isPaint) return;

            if (modeInfo.brush.erase) {
                modeInfo.brush.context.globalCompositeOperation = 'destination-out';
                modeInfo.brush.context.strokeStyle = modeInfo.brush.eraseColor;
            } else {
                modeInfo.brush.context.globalCompositeOperation = 'source-over';
                modeInfo.brush.context.strokeStyle = modeInfo.brush.strokeColor;
            }
            modeInfo.brush.context.beginPath();

            var judgeTpId = dap.getJudgeTpId();
            var image;
            layer.find('.' + modeInfo.brush.name).forEach(function (obj) {
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
            dap.saveCanvasState('stage mouse drag brush mode');

            break;
        case 'FillBrush':
        	dap.createOrUpdateGuideCircle();
        	
            if (!modeInfo.fillBrush.fillBrushLine) return;
            
            // 선이 그어 진 후 상태저장
            modeInfo.fillBrush.fillBrushLine.points(modeInfo.fillBrush.fillBrushLine.points().concat([pointer.x, pointer.y])).draw();

            break;
        case 'Rectangle':
			if (modeInfo.rect.step == 1 || modeInfo.rect.step == 2) {
				dap.createOrUpdateGuideLine();
			}
			
        	break;
        case 'Polygon':
        	dap.createOrUpdateGuideCircle();
			
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
        		layer.find('Transformer').destroy();
        		dap.createTransformer(e.target);
            }).on('dragend', function () { dap.saveCanvasState('stage mouseup fillbrush dragend');
            }).on('transformend', function () { dap.saveCanvasState('stage mouseup fillbrush transformend');
            }).on('mouseover', function (e) { dap.setMouserover(e);
            }).on('mouseout', function (e) { dap.setMouserout(e, originalStrokeColor);
            });
            
            modeInfo.fillBrush.fillBrushLine = null;
            
            // 라인 생성 시 상태저장
            dap.saveCanvasState('stage clicked fillbrush mode');

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
            
            if (funcName) {
                window[funcName]();
            }
        };
        imageObj.src = imgSrc;
        console.log('imgSrc', imgSrc);
    },
    // 스테이지 크기를 화면에 맞게
    setStageSizeFitAndResetPosition: function (width, height) {
    	if (width && height) {
    		stage.width(width).height(height);
            $konvaContainer.width(width).height(height);
    	}
    	
    	var scaleByImageWidth = Math.round(stage.width() / bgImageWidth * 1000) / 1000;
    	var scaleByImageHeight = Math.round(stage.height() / bgImageHeight * 1000) / 1000;
    	var scaleByImage = (scaleByImageWidth > scaleByImageHeight ? scaleByImageHeight : scaleByImageWidth);
        stage.position({ x: 0, y: 0 }).scale({ x: scaleByImage, y: scaleByImage }).batchDraw();
        
        return scaleByImage;
    },
    // 사각형 도형의 라벨 폰트 크기와 공백값을 지정
    setLabelFontAndPadding: function (scaleByImage) {
        modeInfo.rect.labelFontSize += Math.round((1 - scaleByImage) * modeInfo.rect.labelFontSize);
        if (modeInfo.rect.labelFontSize < 4) {
        	modeInfo.rect.labelFontSize = 4;
        }
        modeInfo.rect.labelPadding = modeInfo.rect.labelFontSize / 2;
        if (modeInfo.rect.labelPadding > 15) {
        	modeInfo.rect.labelPadding = 15;
        }
    },
    // 모드 관련 초기화
    setModeinfo: function (mode) {
        modeInfo.mode = mode;
        modeInfo.fillBrush.fillBrushLine = null;
        modeInfo.fillBrush.isPaint = false;
        if (modeInfo.guideCircle.obj) {
        	modeInfo.guideCircle.obj.destroy();
        }
        modeInfo.guideCircle.obj = null;
        modeInfo.rect.step = 0;
        if (modeInfo.guideLine.objX) {
        	modeInfo.guideLine.objX.destroy();
        }
        modeInfo.guideLine.objX = null;
        if (modeInfo.guideLine.objY) {
        	modeInfo.guideLine.objY.destroy();
        }
        modeInfo.guideLine.objY = null;
        
        switch (mode) {
            case 'Select':
                break;
            case 'Brush':
                // 브러쉬 모드일때 캔버스 추가를 위한 셋팅
            	layer.find('Transformer').destroy();
            	layer.batchDraw();
            	
                var judgeTpId = dap.getJudgeTpId();
                var brushImageExists = false;
                layer.find('.' + modeInfo.brush.name).forEach(function (obj) {
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
            	layer.find('Transformer').destroy();
            	layer.batchDraw();
            	
                modeInfo.fillBrush.isPaint = true;
                break;
            case 'Rectangle':
            	layer.find('Transformer').destroy();
            	layer.batchDraw();
            	
                modeInfo.rect.step = 1;
                break;
            case 'Polygon':
            	layer.find('Transformer').destroy();
            	layer.batchDraw();
            	
                modeInfo.poly.circleCount = 0;
                modeInfo.poly.polygonCount++;
                modeInfo.poly.polygonGroup = new Konva.Group({
                	name: modeInfo.poly.groupName,
                	polygonCount: modeInfo.poly.polygonCount
                });
                modeInfo.poly.polygonGroup.on('dragstart', function (e) {
                    layer.find('Transformer').destroy();
                    if (e.target.getType() == "Group") {
                    	dap.createTransformer(e.target);
                    } else {
                    	dap.createTransformer(e.target.getParent());
                    }
                }).on('dragend', function () { dap.saveCanvasState(modeInfo.poly.groupName + ' dragend');
                }).on('transformend', function () { dap.saveCanvasState(modeInfo.poly.groupName + ' transformend');
                });
                
                break;
        }
        
        if (mode == "Select") {
            layer.find('.' + modeInfo.fillBrush.name).forEach(function (obj) { obj.draggable(true); });
            layer.find('.' + modeInfo.rect.groupName).forEach(function (obj) { obj.draggable(true); });
            layer.find('.' + modeInfo.poly.circleName).forEach(function (obj) { obj.draggable(true); });
            layer.find('.' + modeInfo.poly.groupName).forEach(function (obj) { obj.draggable(true); });
            stage.draggable(true);
        } else {
            layer.find('.' + modeInfo.fillBrush.name).forEach(function (obj) { obj.draggable(false); });
            layer.find('.' + modeInfo.rect.groupName).forEach(function (obj) { obj.draggable(false); });
            layer.find('.' + modeInfo.poly.circleName).forEach(function (obj) { obj.draggable(false); });
            layer.find('.' + modeInfo.poly.groupName).forEach(function (obj) { obj.draggable(false); });
            stage.draggable(false);
        }
        stage.batchDraw();
    },
    // 쓸모없는 오브젝트 삭제
    destroyTrashObjects: function () {
        // 사각형모드 첫번째 동그라미 삭제
    	layer.find('.' + modeInfo.rect.circleName).forEach(function (obj) { obj.destroy(); });
    	
        // 폴리곤모드 라인이 그려지지 않은 동그라미, 그룹 삭제
    	layer.find('.' + modeInfo.poly.circleName).forEach(function (obj) {
            var exists = false;
            layer.find('Line').forEach(function (lineObj) {
                if (obj.getAttr('polygonCount') == lineObj.getAttr('polygonCount')) {
                    exists = true;
                }
            });
            if (!exists) obj.destroy();
        });
    	layer.find('.' + modeInfo.poly.groupName).forEach(function (obj) {
    		var exists = false;
    		layer.find('Line').forEach(function (lineObj) {
    			if (obj.getAttr('polygonCount') == lineObj.getAttr('polygonCount')) {
    				exists = true;
    			}
    		});
    		if (!exists) obj.destroy();
    	});
    	
        stage.batchDraw();
    },
    // 현재 마우스 커서의 위치값 반환
    getPointer: function () {
        return dap.getRealPosition(stage.getPointerPosition());
    },
    // 실제 위치를 반환
    getRealPosition: function(position) {
    	var transform = stage.getAbsoluteTransform().copy();
        transform.invert();
        return transform.point(position);
    },
    // 캔버스 줌
    zoomCanvas: function (delta, evt) {
        var oldScale = Math.round(stage.scaleX() * 1000) / 1000;
        var newScale = 1;
        if (delta) {
            newScale = Math.round((delta > 0 ? oldScale - 0.1 : oldScale + 0.1) * 1000) / 1000;
        }
        if (newScale > 10 || newScale < 0.1) {
        	// 줌인,아웃이 너무 크거나 작아지면 확대 축소를 안함
            return;
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

        layer.find('Transformer').forceUpdate();

        $('#zoom-info').text(Math.round(newScale * 100) + '%');
        
        return [(Math.round((newScale - 0.1) * 1000) / 1000 <= 0.1 ? false : true), (Math.round((newScale + 0.1) * 1000) / 1000 >= 10 ? false : true)]
    },
    // 캔버스의 모든 상태를 저장
    saveCanvasState: function (triggerName) {
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
        
        // 사이즈 조절 관련 문제 때문에 임시로 처리
        tr.borderDash([10,5]);
        /*
        tr.resizeEnabled(false);
        */
        
        layer.add(tr);
        return tr;
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
            judgeTpId: dap.getJudgeTpId(),
            judgeTpCd: dap.getJudgeTpCd()
        });

        return newObj;
    },
    // 사각형 모드에서 시작점 생성
    createRectangleStartPoint: function (pointer) {
        var newObj = new Konva.Circle({
            name: modeInfo.rect.circleName,
        	x: pointer.x,
            y: pointer.y,
            radius: modeInfo.rect.strokeWidth / 4,
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
            stroke: modeInfo.rect.strokeColor,
            strokeWidth: modeInfo.rect.strokeWidth,
            rectCount: modeInfo.rect.rectCount,
            judgeTpId: dap.getJudgeTpId(),
            judgeTpCd: dap.getJudgeTpCd(),
            originalStroke: modeInfo.rect.strokeColor
        });

        var originalStrokeColor = newObj.getAttr('stroke');

        newObj.on('mouseover', function (e) { dap.setMouserover(e) }
        ).on('mouseout', function (e) { dap.setMouserout(e, originalStrokeColor) });
        
        return newObj;
    },
    // 사각형 모드에서 사각형에 대한 레이블 생성
    createRectangleLabel: function (pointer) {
    	var newObj = new Konva.Label({
    		name: modeInfo.rect.labelName,
    		x: pointer.x,
    		y: pointer.y,
    		rectCount: modeInfo.rect.rectCount
    	});
    	newObj.add(new Konva.Tag({
    		fill: modeInfo.rect.fillColor
    	}));
    	newObj.add(
    		new Konva.Text({
    			fontFamily: ['LGSmHaR', 'Malgun Gothic', 'Segoe UI', 'Open Sans', 'sans-serif', 'serif'],
    			fontSize: modeInfo.rect.labelFontSize,
    			fontStyle: 'bold',
    			text: dap.getJudgeTpCd(),
    			padding: modeInfo.rect.labelPadding,
    			fill: 'black'
    		})
    	);
    	newObj.y(newObj.y() - newObj.height());
    	newObj.transformsEnabled('position');;
    	
    	return newObj;
    },
    // 폴리곤 모드에서 점을 생성
    createPolygonPoint: function (pointer) {
        var newObj = new Konva.Circle({
            name: modeInfo.poly.circleName,
            x: pointer.x,
            y: pointer.y,
            radius: modeInfo.poly.strokeWidth / 4,
            fill: modeInfo.poly.strokeColor,
            stroke: modeInfo.poly.strokeColor,
            strokeWidth: modeInfo.poly.strokeWidth,
            polygonCount: modeInfo.poly.polygonCount,
            judgeTpId: dap.getJudgeTpId(),
            judgeTpCd: dap.getJudgeTpCd()
        });

        var originalPolygonCoount = newObj.getAttr('polygonCount');
        var originalStrokeColor = newObj.getAttr('stroke');

        newObj.on('dragmove', function (e) {
            var points = [];
            layer.find('Circle').filter(function (obj) {
                return obj.getAttr('polygonCount') == originalPolygonCoount;
            }).forEach(function (obj) {
                points.push(obj.x());
                points.push(obj.y());
            });

            layer.find('Line').forEach(function (obj) {
                if (obj.getAttr('polygonCount') == originalPolygonCoount) {
                    obj.points(points);
                }
            });

            layer.find('Transformer').forceUpdate();
        }).on('dragend', function () { dap.saveCanvasState(modeInfo.poly.circleName + ' dragend');
        }).on('mouseover', function (e) { dap.setMouserover(e);
        }).on('mouseout', function (e) { dap.setMouserout(e, originalStrokeColor);
        });
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
            judgeTpId: dap.getJudgeTpId(),
            judgeTpCd: dap.getJudgeTpCd()
        });

        var originalStrokeColor = newObj.getAttr('stroke');

        newObj.on('mouseover', function (e) { dap.setMouserover(e) }
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
        var trs = layer.find('Transformer');
        trs.each(function (tr) {
        	if (tr._node && tr._node.getType() == "Group") {
        		tr._node.getChildren().forEach(function(obj){obj.destroy();});
        	}
        	tr._node.destroy();
            tr.destroy();
        });
        layer.batchDraw();
        
        dap.saveCanvasState('deleteObject');
    },
    // 캔버스 초기화
    clearCanvas: function () {
        stage.getChildren(function (obj) {
            return obj.getName() != backgroundLayerName;
        }).destroyChildren().batchDraw();
    },
    // 저장 버튼 (JSON 형태로 반환)
    saveToJSON: function () {
    	var clonedLayer = layer.clone();
    	
        dap.destroyTrashObjects();

        var konvaJSON = new Object();
        
        konvaJSON[modeInfo.brush.name] = [];
        clonedLayer.find('.' + modeInfo.brush.name).forEach(function (obj) {
        	//var fromScaleX = obj.scaleX();
            //var fromScaleY = obj.scaleY();
            //var toScaleX = fromScaleX / stage.scaleX();
            //var toScaleY = fromScaleY / stage.scaleX();
            //obj.scale({ x: toScaleX, y: toScaleY });
            var dataURL = obj.toDataURL();
            //obj.scale({ x: fromScaleX, y: fromScaleY });
            konvaJSON[modeInfo.brush.name].push({ ...obj.getAttrs(), dataURL: dataURL });
        });

        konvaJSON[modeInfo.fillBrush.name] = [];
        clonedLayer.find('.' + modeInfo.fillBrush.name).forEach(function (obj) {
            konvaJSON[modeInfo.fillBrush.name].push(obj.getAttrs());
        });

        konvaJSON[modeInfo.rect.groupName] = [];
        clonedLayer.find('.' + modeInfo.rect.groupName).forEach(function (obj) {
            konvaJSON[modeInfo.rect.groupName].push(obj.getAttrs());
        });
        konvaJSON[modeInfo.rect.labelName] = [];
        clonedLayer.find('.' + modeInfo.rect.labelName).forEach(function (obj) {
        	konvaJSON[modeInfo.rect.labelName].push({
        		attrs: obj.getAttrs(),
        		tag: obj.getTag().getAttrs(),
        		text: obj.getText().getAttrs()
        	});
        });
        konvaJSON[modeInfo.rect.name] = [];
        clonedLayer.find('.' + modeInfo.rect.name).forEach(function (obj) {
        	konvaJSON[modeInfo.rect.name].push(obj.getAttrs());
        });
        konvaJSON[modeInfo.poly.groupName] = [];
        clonedLayer.find('.' + modeInfo.poly.groupName).forEach(function (obj) {
        	konvaJSON[modeInfo.poly.groupName].push(obj.getAttrs());
        });
        konvaJSON[modeInfo.poly.circleName] = [];
        clonedLayer.find('.' + modeInfo.poly.circleName).forEach(function (obj) {
            konvaJSON[modeInfo.poly.circleName].push(obj.getAttrs());
        });
        konvaJSON[modeInfo.poly.name] = [];
        clonedLayer.find('.' + modeInfo.poly.name).forEach(function (obj) {
            konvaJSON[modeInfo.poly.name].push(obj.getAttrs());
        });
        
        clonedLayer.destroy();

        return konvaJSON;
    },
    // 로드 버튼
    loadFromJSON: function (konvaJSON, saveFlag) {
    	if (konvaJSON) {
            dap.clearCanvas();

            var imageLoaded = false;
            if (konvaJSON[modeInfo.brush.name] && konvaJSON[modeInfo.brush.name].length > 0) {
            	imageLoaded = 0;
                konvaJSON[modeInfo.brush.name].forEach(function (newObj) {
                	var judgeTpId = newObj.judgeTpId;
                	
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
                        
                        imageLoaded++;
                        if (imageLoaded == konvaJSON[modeInfo.brush.name].length) {
                        	if (saveFlag) dap.saveCanvasState('imageLoaded');
                        }
                    };
                    imageObj.src = newObj.dataURL;
                });
            }

            if (konvaJSON[modeInfo.fillBrush.name] && konvaJSON[modeInfo.fillBrush.name].length > 0) {
                konvaJSON[modeInfo.fillBrush.name].forEach(function (newObj) {
                    layer.add(
                        new Konva.Line(newObj).on('dragstart', function (e) {
                            layer.find('Transformer').destroy();
                            dap.createTransformer(e.target);
                        }).on('dragend', function () { dap.saveCanvasState(modeInfo.fillBrush.name + ' dragend');
                        }).on('transformend', function () { dap.saveCanvasState(modeInfo.fillBrush.name + ' transformend');
                        }).on('mouseover', function (e) { dap.setMouserover(e);
                        }).on('mouseout', function (e) { dap.setMouserout(e, newObj.stroke);
                        })
                    );
                });
            }
            if (konvaJSON[modeInfo.rect.name] && konvaJSON[modeInfo.rect.name].length > 0) {
            	modeInfo.rect.rectCount = 1;
                konvaJSON[modeInfo.rect.name].forEach(function (newObj) {
                	var newRectCount = modeInfo.rect.rectCount++;
                	
                	var newRectGroup = null;
                	if (konvaJSON[modeInfo.rect.groupName]) {
                		konvaJSON[modeInfo.rect.groupName].filter(function (newGroupObj) {
                			return newGroupObj.rectCount == newObj.rectCount;
                		}).forEach(function (newGroupObj) {
                			newRectGroup = new Konva.Group({
                    			name: modeInfo.rect.groupName,
                    			x: newGroupObj.x,
                    			y: newGroupObj.y,
                    			scaleX: newGroupObj.scaleX,
                    			scaleY: newGroupObj.scaleY,
                    			rectCount: newRectCount
                    		});
                        });
                    }
                	if (!newRectGroup) {
                		newRectGroup = new Konva.Group({
                			name: modeInfo.rect.groupName,
                			rectCount: newRectCount
                		});
                    }
                	newRectGroup.on('dragstart', function (e) {
                        layer.find('Transformer').destroy();
                        if (e.target.getType() == "Group") {
                        	dap.createTransformer(e.target);
                        } else {
                        	dap.createTransformer(e.target.getParent());
                        }
                    }).on('dragend', function () { dap.saveCanvasState(modeInfo.rect.groupName + ' dragend');
                    }).on('transformend', function () { dap.saveCanvasState(modeInfo.rect.groupName + ' transformend');
                    });
                	
                	if (konvaJSON[modeInfo.rect.labelName]) {
                		konvaJSON[modeInfo.rect.labelName].filter(function (newLabelObj) {
                			return newLabelObj.attrs.rectCount == newObj.rectCount;
                		}).forEach(function (newLabelObj) {
                			var labelObj = new Konva.Label({
                	    		name: modeInfo.rect.labelName,
                	    		x: newLabelObj.attrs.x,
                	    		y: newLabelObj.attrs.y,
                	    		rectCount: newRectCount
                	    	});
                			labelObj.add(new Konva.Tag(newLabelObj.tag).transformsEnabled('position'));
                			labelObj.add(new Konva.Text(newLabelObj.text).transformsEnabled('position'));
                			labelObj.transformsEnabled('position');
                			
                			newRectGroup.add(labelObj);
                        });
                    }
                	
                	var originalStrokeColor = newObj.stroke;
                	
                	newRectGroup.add(
                        new Konva.Rect({
                        	name: modeInfo.rect.name,
                        	x: newObj.x,
                        	y: newObj.y,
                        	width: newObj.width,
                        	height: newObj.height,
                        	stroke: newObj.stroke,
                        	strokeWidth: newObj.strokeWidth,
                        	rectCount: newRectCount,
                        	judgeTpId: newObj.judgeTpId,
                        	judgeTpCd: newObj.judgeTpCd,
                        	originalStroke: newObj.originalStroke
                        }).on('mouseover', function (e) { dap.setMouserover(e);
                        }).on('mouseout', function (e) { dap.setMouserout(e, originalStrokeColor) })
                    );
                	
                	layer.add(newRectGroup);
                });
                modeInfo.rect.rectCount++;
            }
            if (konvaJSON[modeInfo.poly.name] && konvaJSON[modeInfo.poly.name].length > 0) {
                modeInfo.poly.polygonCount = 0;
                konvaJSON[modeInfo.poly.name].forEach(function (newObj) {
                    var newPolygonCount = modeInfo.poly.polygonCount++;
                    
                    var newPolygonGroup = null;
                    if (konvaJSON[modeInfo.poly.groupName]) {
                    	konvaJSON[modeInfo.poly.groupName].filter(function (newGroupObj) {
                    		return newGroupObj.polygonCount == newObj.polygonCount
                    	}).forEach(function (newGroupObj) {
                    		newPolygonGroup = new Konva.Group({
                    			name: modeInfo.poly.groupName,
                    			x: newGroupObj.x,
                    			y: newGroupObj.y,
                    			scaleX: newGroupObj.scaleX,
                    			scaleY: newGroupObj.scaleY,
                    			polygonCount: newPolygonCount
                    		});
                        });
                    }
                    
                    if (!newPolygonGroup) {
                    	newPolygonGroup = new Konva.Group({
                			name: modeInfo.poly.groupName,
                			polygonCount: newPolygonCount
                		});
                    }
                    newPolygonGroup.on('dragstart', function (e) {
                        layer.find('Transformer').destroy();
                        if (e.target.getType() == "Group") {
                        	dap.createTransformer(e.target);
                        } else {
                        	dap.createTransformer(e.target.getParent());
                        }
                    }).on('dragend', function () { dap.saveCanvasState(modeInfo.poly.groupName + ' dragend');
                    }).on('transformend', function () { dap.saveCanvasState(modeInfo.poly.groupName + ' transformend');
                    });
                    
                    var originalStrokeColor = newObj.stroke;

                    if (konvaJSON[modeInfo.poly.circleName]) {
                        konvaJSON[modeInfo.poly.circleName].filter(function (newCircleObj) {
                            return newCircleObj.polygonCount == newObj.polygonCount;
                        }).forEach(function (newCircleObj) {
                            var originalCircleStrokeColor = newCircleObj.stroke;

                            newPolygonGroup.add(
                                new Konva.Circle({
                                    name: newCircleObj.name,
                                    x: newCircleObj.x,
                                    y: newCircleObj.y,
                                    radius: newCircleObj.strokeWidth / 4,
                                    fill: newCircleObj.fill,
                                    stroke: newCircleObj.stroke,
                                    strokeWidth: newCircleObj.strokeWidth,
                                    polygonCount: newPolygonCount,
                                    judgeTpId: newCircleObj.judgeTpId,
                                    judgeTpCd: newCircleObj.judgeTpCd
                                }).on('dragmove', function (e) {
                                    var points = [];
                                    layer.find('Circle').filter(function (obj) {
                                        return obj.getAttr('polygonCount') == newPolygonCount;
                                    }).forEach(function (obj) {
                                    	var realPosition = obj.position();
                                        points.push(realPosition.x);
                                        points.push(realPosition.y);
                                    });

                                    layer.find('Line').forEach(function (obj) {
                                        if (obj.getAttr('polygonCount') == newPolygonCount) {
                                            obj.points(points);
                                        }
                                    });

                                    layer.find('Transformer').forceUpdate();
                                }).on('dragend', function (e) { dap.saveCanvasState(modeInfo.poly.circleName + ' dragend');
                                }).on('mouseover', function (e) { dap.setMouserover(e);
                                }).on('mouseout', function (e) { dap.setMouserout(e, originalStrokeColor);
                                })
                            );
                        });
                    }

                    var newPolygon = new Konva.Line({
                        name: newObj.name,
                        points: newObj.points,
                        fill: newObj.fill,
                        stroke: newObj.stroke,
                        strokeWidth: newObj.strokeWidth,
                        closed: true,
                        polygonCount: newPolygonCount,
                        judgeTpId: newObj.judgeTpId,
                        judgeTpCd: newObj.judgeTpCd
                    }).on('mouseover', function (e) { dap.setMouserover(e);
                    }).on('mouseout', function (e) { dap.setMouserout(e, originalStrokeColor) });
                    newPolygonGroup.add(newPolygon);
                    newPolygon.setZIndex(0);
                    layer.add(newPolygonGroup);
                });
                modeInfo.poly.polygonCount++;
            }
            
            if (modeInfo.mode == "Select") {
                layer.find('.' + modeInfo.fillBrush.name).forEach(function (obj) { obj.draggable(true); });
                layer.find('.' + modeInfo.rect.groupName).forEach(function (obj) { obj.draggable(true); });
                layer.find('.' + modeInfo.poly.circleName).forEach(function (obj) { obj.draggable(true); });
                layer.find('.' + modeInfo.poly.groupName).forEach(function (obj) { obj.draggable(true); });
                stage.draggable(true);
            } else {
                layer.find('.' + modeInfo.fillBrush.name).forEach(function (obj) { obj.draggable(false); });
                layer.find('.' + modeInfo.rect.groupName).forEach(function (obj) { obj.draggable(false); });
                layer.find('.' + modeInfo.poly.circleName).forEach(function (obj) { obj.draggable(false); });
                layer.find('.' + modeInfo.poly.groupName).forEach(function (obj) { obj.draggable(false); });
                stage.draggable(false);
            }

            stage.batchDraw();
            
            if (imageLoaded === false) {
	            if (saveFlag) dap.saveCanvasState('loadFromJson');
            }
        }
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
    	// 트랜스포머, 가이드라인 없앰
    	layer.find('Transformer').destroy();
    	guideLayer.find('.' + modeInfo.guideLine.name).forEach(function (obj) {
    		obj.destroy();
    	});
    	guideLayer.find('.' + modeInfo.guideCircle.name).forEach(function (obj) {
    		obj.destroy();
    	});
    	
        var formData = new FormData();
        formData.append('labelTp', labelTp);
        
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
        
        // 판정값 정보
        var judgeTpJSON = dap.getCanvasJudgeTpJSON();
        var judgeTpIdArr = judgeTpJSON.judgeTpIdArr;
        var judgeTpCdArr = judgeTpJSON.judgeTpCdArr;
        
        formData.append('judgeTpIdArr', judgeTpIdArr);
        formData.append('judgeTpCdArr', judgeTpCdArr);

        if (labelTp == "SGMT") {
        	// 배경검은색이미지
        	if (bgImage) {
        		bgImage.image(null);
        		bgImage.fill('black');
        	}

            if (judgeTpIdArr.length < 1) {
            	judgeTpIdArr.push($("#imageLabel_judgeTpId").val());
            	judgeTpCdArr.push($("#imageLabel_judgeTpId option:selected").data("judge_tp_cd"));
            }
            
            for (var i = 0; i < judgeTpIdArr.length; i++) {
                var judgeTpId = judgeTpIdArr[i];
                var judgeTpCd = judgeTpCdArr[i];

                // judgeTpId 가 동일한 객체만 보이게 한다
                layer.find('.' + modeInfo.brush.name).forEach(function (obj) {
                    if (obj.getAttr("judgeTpId") == judgeTpId && obj.getAttr('isDrawn')) {
                    	obj.show();
                    } else {
                        obj.hide();
                    }
                });
                layer.find('.' + modeInfo.fillBrush.name).forEach(function (obj) {
                    if (obj.getAttr("judgeTpId") == judgeTpId) {
                    	var originalFill = obj.fill();
                    	obj.setAttr('originalFill', dap.changeRgbAlpha(originalFill, 0.4));
                    	obj.setAttr('originalStroke', dap.changeRgbAlpha(originalFill, 1));
                    	obj.fill(dap.changeRgbAlpha(originalFill, 1));
                    	obj.stroke(dap.changeRgbAlpha(originalFill, 1));
                        obj.show();
                    } else {
                        obj.hide();
                    }
                });
                layer.find('.' + modeInfo.poly.circleName).forEach(function (obj) { obj.hide(); });
                layer.find('.' + modeInfo.poly.name).forEach(function (obj) {
                    if (obj.getAttr("judgeTpId") == judgeTpId) {
                    	var originalFill = obj.fill();
                    	obj.setAttr('originalFill', dap.changeRgbAlpha(originalFill, 0.4));
                    	obj.setAttr('originalStroke', dap.changeRgbAlpha(originalFill, 1));
                    	obj.fill(dap.changeRgbAlpha(originalFill, 1));
                    	obj.stroke(dap.changeRgbAlpha(originalFill, 1));
                        obj.show();
                    } else {
                        obj.hide();
                    }
                });

                var blackBgBlob = dap.dataURItoBlob(stage.toDataURL());
                formData.append('blackBgBlobArr', blackBgBlob, 'blackBgBlob.png');
            }
        } else if (labelTp == "DETC") {
        	// 디텍션일 경우는 사각형 위치 관련 정보를 따로 담는다
        	var detcLabelDetailList = new Array();
    		layer.find('.' + modeInfo.rect.name).forEach(function (obj) {
    			var originalStroke = obj.getAttr('originalStroke');
    			obj.stroke(originalStroke);
    			
    			var detcLabelDetail = new Object();
        		detcLabelDetail.judgeTpId = obj.getAttr("judgeTpId");
        		detcLabelDetail.xMin = obj.x() + (obj.width() < 0 ? obj.width() : 0);
        		detcLabelDetail.yMin = obj.y() + (obj.height() < 0 ? obj.height() : 0);
        		detcLabelDetail.xMax = obj.x() + (obj.width() > 0 ? obj.width() : 0);
        		detcLabelDetail.yMax = obj.y() + (obj.height() > 0 ? obj.height() : 0);
        		detcLabelDetailList.push(detcLabelDetail);
            });
    		if (detcLabelDetailList.length > 0) {
    			formData.append('detcLabelDetailListJSONStr', JSON.stringify(detcLabelDetailList));
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

        if (labelTp == "SGMT") {
	        // judgeTpId 별로 숨긴 객체를 모두 보이게 한다.
	        layer.find('.' + modeInfo.brush.name).forEach(function (obj) { obj.show(); });
	        layer.find('.' + modeInfo.fillBrush.name).forEach(function (obj) {
	        	obj.fill(obj.getAttr('originalFill'));
	        	obj.stroke(obj.getAttr('originalStroke'));
	        	obj.show();
	        });
	        layer.find('.' + modeInfo.poly.circleName).forEach(function (obj) { obj.show(); });
	        layer.find('.' + modeInfo.poly.name).forEach(function (obj) {
	        	obj.fill(obj.getAttr('originalFill'));
	        	obj.stroke(obj.getAttr('originalStroke'));
	        	obj.show();
	        });
        }
        
        stage.batchDraw();

        return formData;
    },
    // 넘오온 RGBA 스트링에서 해당 알파값으로 변경
    changeRgbAlpha: function (rgbaStr, alpha) {
    	var rgbaStrArr = rgbaStr.replace("rgba(", "").replace(")", "").split(",");
    	var returnRgbaStr = "rgba(" + rgbaStrArr[0].trim() + "," + rgbaStrArr[1].trim() + "," + rgbaStrArr[2].trim() + "," + alpha + ")";
    	return returnRgbaStr;
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
    },
    // 가이드 원형 표시
    createOrUpdateGuideCircle: function() {
    	if (document.body.style.cursor == 'not-allowed') {
    		if (modeInfo.guideCircle.obj) {
    			modeInfo.guideCircle.obj.destroy();
    			modeInfo.guideCircle.obj = null;
    		}
		} else {
			var pointer = dap.getPointer();
			if (!modeInfo.guideCircle.obj) {
				modeInfo.guideCircle.obj = new Konva.Circle({
					name: modeInfo.guideCircle.name,
					x: pointer.x,
					y: pointer.y,
					radius: modeInfo.fillBrush.strokeWidth / 2,
					fill: modeInfo.fillBrush.fillColor
				});
				guideLayer.add(modeInfo.guideCircle.obj);
			} else {
				modeInfo.guideCircle.obj.radius(modeInfo.fillBrush.strokeWidth / 2);
				modeInfo.guideCircle.obj.position({ x: pointer.x, y:pointer.y });
			}
		}
    	guideLayer.draw();
	},
	// 가이드 선 표시
	createOrUpdateGuideLine: function() {
		if (document.body.style.cursor == 'not-allowed') {
			if (modeInfo.guideLine.objX) {
				modeInfo.guideLine.objX.destroy();
				modeInfo.guideLine.objX = null;
			}
			if (modeInfo.guideLine.objY) {
				modeInfo.guideLine.objY.destroy();
				modeInfo.guideLine.objY = null;
			}
		} else {
			var pointer = dap.getPointer();
			if (!modeInfo.guideLine.objX || !modeInfo.guideLine.objY) {
				modeInfo.guideLine.objX = new Konva.Line({
					name: modeInfo.guideLine.name,
					points: [0, pointer.y, bgImageWidth, pointer.y],
					stroke: modeInfo.rect.strokeColor,
					strokeWidth: modeInfo.rect.strokeWidth / 7,
					lineJoin: 'round'/*,
					dash: [modeInfo.rect.strokeWidth * 4, modeInfo.rect.strokeWidth / 4]*/
				});
				guideLayer.add(modeInfo.guideLine.objX);
				
				modeInfo.guideLine.objY = new Konva.Line({
					name: modeInfo.guideLine.name,
					points: [pointer.x, 0, pointer.x, bgImageHeight],
					stroke: modeInfo.rect.strokeColor,
					strokeWidth: modeInfo.rect.strokeWidth / 7,
					lineJoin: 'round'/*,
					dash: [modeInfo.rect.strokeWidth * 4, modeInfo.rect.strokeWidth / 4]*/
				});
				guideLayer.add(modeInfo.guideLine.objY);
			} else {
				modeInfo.guideLine.objX.strokeWidth(modeInfo.rect.strokeWidth / 7);
				modeInfo.guideLine.objX.points([0, pointer.y, bgImageWidth, pointer.y]);
				modeInfo.guideLine.objY.strokeWidth(modeInfo.rect.strokeWidth / 7);
				modeInfo.guideLine.objY.points([pointer.x, 0, pointer.x, bgImageHeight]);
			}
		}
		guideLayer.draw();
	}
};

dap.initCanvas();