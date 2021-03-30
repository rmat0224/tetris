enchant();
window.onload = preloadAssets;

// 基礎データ
var game;
var scene;
var gameCount;
var gameSpeed = 20;
var scoreText;
var score = 0;
var scoreBase = '00000000';

// ブロック生成フラグ
var createFlag = true;
// キー押下可能フラグ
var inputKeyFlag = true;

// ブロック全体
var frameBlock;

// ステージの大きさ
var stageWidth    = 10;
var stageHeight   = 20;

// ステージブロック
var stageBlock;
var stageBlockStatus;

// 次のブロック
var nextBlock;
var nextBlockStatus;

// ブロックの大きさ
var blockWidth  = 20;
var blockHeight = 20;

// ステージ(ブロック)の座標調整用
var stageAdjustX = 50;
var stageAdjustY = 200;

// ブロックの状態(空欄, 固定, 移動中)
var blockStatus = {
    space: 0, 
    lock:  1, 
    move:  2, 
};

// 回転前のパターン取得用
var rotateValues = [3, 0, 1, 2];

// 同時消しライン数によるボーナス取得用
var clearLineBonusList = [100, 250, 750, 3000];


// 移動ブロック
var movingBlock = [];
// 移動ブロックパターン
var blockType = [];
// 移動ブロック回転数(max=3)
var blockRotateCount = 0;
// ブロックの押し上げるタイミング
var addLineCount = 10;

// ブロックのパターン
var blockSet = [{
    // I ... 1, 5, 9, 13
    ptn:    [0, 1, 0, 0, 
             0, 1, 0, 0, 
             0, 1, 0, 0, 
             0, 1, 0, 0],
    color: 1,
},{
    // O ... 5, 6, 9, 10
    ptn:    [0, 0, 0, 0, 
             0, 1, 1, 0, 
             0, 1, 1, 0, 
             0, 0, 0, 0],
    color: 2,
},{
    // Z ... 5, 6, 10, 11
    ptn:    [0, 0, 0, 0, 
             0, 1, 1, 0, 
             0, 0, 1, 1, 
             0, 0, 0, 0],
    color: 3,
},{
    // S ... 6, 7, 9, 10
    ptn:    [0, 0, 0, 0, 
             0, 0, 1, 1, 
             0, 1, 1, 0, 
             0, 0, 0, 0],
    color: 4,
},{
    // L ... 5, 9, 13, 14
    ptn:    [0, 0, 0, 0, 
             0, 1, 0, 0, 
             0, 1, 0, 0, 
             0, 1, 1, 0],
    color: 5,
},{
    // J ... 6, 10, 13, 14
    ptn:    [0, 0, 0, 0, 
             0, 0, 1, 0, 
             0, 0, 1, 0, 
             0, 1, 1, 0],
    color: 6,
},{
    // T ... 5, 8, 9, 10
    ptn:    [0, 0, 0, 0, 
             0, 1, 0, 0, 
             1, 1, 1, 0, 
             0, 0, 0, 0],
    color: 7,
}];


/**
 * アセット類のロード
 */
function preloadAssets() {
    game = new Game(480,750);
    game.preload('./png/block01.png');
    game.onload = init;
    game.start();
}

/**
 * ステージの初期化
 */
function init() {
    game.scale = 1;
    game.fps   = 30;
    gameCount  = 0;
    scene = new Scene();
    scene.backgroundColor = "#000";
    game.pushScene(scene);

    // 表示するブロックの生成とステータスの決定
    stageBlock          = new Array(stageWidth*stageHeight);
    stageBlockStatus    = new Array(stageWidth*stageHeight);

    for ( var i = 0; i < stageWidth*stageHeight; i++ ) {
        stageBlockStatus[i] = blockStatus.space;
        stageBlock[i]       = new Sprite(blockWidth, blockHeight);
        stageBlock[i].image = game.assets['./png/block01.png'];
        stageBlock[i].x     = stageAdjustX + (i%stageWidth)*blockWidth;
        stageBlock[i].y     = stageAdjustY + Math.trunc(i/stageWidth)*blockHeight;
        stageBlock[i].frame = 8;
        scene.addChild(stageBlock[i]);
    }


    nextBlock            = new Array(stageWidth*stageHeight);
    nextBlockStatus      = new Array(stageWidth*stageHeight);
    var blockAreaAdjustX = stageAdjustX + (stageWidth+2)*blockWidth;

    for ( var j = 0; j < 16; j++ ) {
        nextBlockStatus[j] = blockStatus.space;
        nextBlock[j]       = new Sprite(blockWidth, blockHeight);
        nextBlock[j].image = game.assets['./png/block01.png'];
        nextBlock[j].x     = blockAreaAdjustX + (j%4)*blockWidth;
        nextBlock[j].y     = stageAdjustY + Math.trunc(j/4)*blockHeight;
        nextBlock[j].frame = 8;
        scene.addChild(nextBlock[j]);

    }

    // スコアの表示
    scoreText = new Label();
    scoreText.x = 50;
    scoreText.y = 180;
    scoreText.color = 'WHITE';
    scoreText.font  = '14px Arial';
    scoreText.text  = (scoreBase+score).slice(-8);
    scene.addChild(scoreText);

    main();
}

/**
 * メイン処理
 */
function main() {
    blockType.push(Math.floor(Math.random()*7));
    pullNextBlock();
    game.addEventListener(Event.ENTER_FRAME, enterFrame);
}

/**
 * フレーム処理
 */
function enterFrame() {
    if ( createFlag ) {
        // 右,左,上キーが押下されていない場合,入力可能フラグを立てる.
        if ( !game.input.right && !game.input.left && !game.input.up ) {
            inputKeyFlag = true;
        }
        // 上キーが押下されていて,入力可能フラグが立っている場合,ブロック回転処理を実行する.
        if ( game.input.up && inputKeyFlag ) {
            inputKeyFlag = false;
            rotateBlock();
            return;
        } else 
        // 右キーが押下されていて,入力可能フラグが立っている場合,右向きにブロック移動処理を実行する.
        if ( game.input.right && inputKeyFlag ) {
            inputKeyFlag = false;
            moveBlock(1);
            return;
        } else 
        // 左キーが押下されていて,入力可能フラグが立っている場合,左向きにブロック移動処理を実行する.
        if ( game.input.left && inputKeyFlag ) {
            inputKeyFlag = false;
            moveBlock(-1);
            return;
        } else 
        // 下キーが押下されている場合,点数を加算し,ブロック落下処理を行う
        if ( game.input.down ) {
            score += 1;
            scoreText.text  = (scoreBase+score).slice(-8);
            dropBlock();
        }
        // 一定時間ごとにブロックを落下させる.
        if ( game.frame % (game.fps - gameSpeed) === 0 ) {
            dropBlock();
        }
    }
}

/**
 * ブロックを生成する
 */
function createBlock() {
    rotate = 0;
    blockType.push(Math.floor(Math.random()*7));
    var ptn   = blockSet[blockType[1]].ptn;
    var color = blockSet[blockType[1]].color;
    ptn.forEach( function(fill, index) {
        var j = Math.trunc(index/4)*4 + index%4;
        if ( fill ) {
            nextBlockStatus[j] = blockStatus.lock;
            nextBlock[j].frame = color;
        } else {
            nextBlockStatus[j] = blockStatus.space;
            nextBlock[j].frame = 8;
        }
    });
}

/**
 * ブロックの取り出し
 */
function pullNextBlock() {
    var getBlockType = blockType[0];
    var ptn   = blockSet[getBlockType].ptn;
    var color = blockSet[getBlockType].color;
    ptn.forEach( function(fill, index) {
        if ( fill ) {
            var i = Math.trunc(index/4)*stageWidth + index%4;
            if ( blockStatus.lock === stageBlockStatus[i] ) {
                createFlag = false;
            }
        }
    });
    if ( createFlag ) {
        ptn.forEach( function(fill, index) {
            if ( fill ) {
                // ステージ上
                var i = Math.trunc(index/4)*stageWidth + index%4;
                stageBlockStatus[i] = blockStatus.move;
                stageBlock[i].frame = color;
            }
        });
    } else {
        scoreText.color = 'RED';
        console.log('gameover.');
    }
    createBlock();
}

/**
 * ブロックの移動
 */
function moveBlock( direction ) {
    var movingBlock = [];
    var nextFlag  = true;
    var color;
    for ( var index = 0; index < stageWidth*stageHeight; index++ ) {
        if ( stageBlockStatus[index] === blockStatus.move ) {
            movingBlock.push(index);
            stageBlockStatus[index] = blockStatus.space;
            color = stageBlock[index].frame;
            stageBlock[index].frame = 8;
            if ( undefined === stageBlock[index+direction]  ) {
                nextFlag = false;
                break;
            }
            var tmpx = Math.floor(index%stageWidth);
            var tmpy = Math.floor(index/stageWidth);
            // 右方向の移動制限
            //var isRightOver = index%stageWidth > (index+direction)%stageWidth;
            //var isRightOver = stageWidth <= (index%stageWidth+direction);
            var isRightOver = stageWidth <= tmpx+direction;
            // 左方向の移動制限
            //var isLeftOver  = index%stageWidth < (index+direction)%stageWidth;
            //var isLeftOver  = 0 > (index%stageWidth+direction);
            var isLeftOver  = 0 > tmpx+direction;
            // 移動先のブロックが固定されているか
            // 右移動時の固定ブロック確認がうまくできていない説
            var nextIsLock  = stageBlockStatus[index+direction] === blockStatus.lock;
            if ( (direction > 0 ? isRightOver : isLeftOver) || nextIsLock ) {
                nextFlag = false;
                break;
            }
        }
    }
    movingBlock.forEach( function(index) {
        if ( !nextFlag ) {
            stageBlockStatus[index] = blockStatus.move;
            stageBlock[index].frame = color;
        } else {
            stageBlockStatus[index+direction] = blockStatus.move;
            stageBlock[index+direction].frame = color;
        }
    });
}

/**
 * ブロックの回転
 */
function rotateBlock() {
    ++rotate;
    if ( rotate > 3 ) {
        rotate = 0;
    }
    var color = blockSet[blockType[0]].color;
    var movingBlockIndex = [];
    for ( var index = 0; index < stageWidth*stageHeight; index++ ) {
        if ( blockStatus.move === stageBlockStatus[index] ) {
            movingBlockIndex.push(index);
        }
    }

    // ブロックの回転パターンを取得する関数
    var getPatternIndex = function( key ) {
        var ptnIndex;
        var basePtn = blockSet[blockType[0]].ptn;
        var getPtn = [];
        switch ( key ) {
            case 1: // パターンを右に90度回転
                for ( var i = 0; i < 16; i++ ) {
                    ptnIndex = 16 - 4*(Math.trunc(i%4)+1)+Math.trunc(i/4);
                    if ( 1 === basePtn[ptnIndex] ) {
                        getPtn.push(i);
                    }
                }
                break;
            case 2: // パターンを右に180度回転
                for ( var j = 0; j < 16; j++ ) {
                    ptnIndex = 16 - (j+1);
                    if ( 1 === basePtn[ptnIndex] ) {
                        getPtn.push(j);
                    }
                }
                break;
            case 3: // パターンを右に270度回転
                for ( var k = 0; k < 16; k++) {
                    ptnIndex = 4*(Math.trunc(k%4)+1)-(Math.trunc(k/4)+1);
                    if ( 1 === basePtn[ptnIndex] ) {
                        getPtn.push(k);
                    }
                }
                break;
            case 0: // パターンを右に360度回転(デフォルト)
                basePtn.forEach( function(fill, index) {
                    if ( 1 === fill ) {
                        getPtn.push(index);
                    }
                });
                break;
        }
        return getPtn;
    };

    nowPtnIndexList  = getPatternIndex(rotateValues[rotate]);
    nextPtnIndexList = getPatternIndex(rotate);

    swapIndexList = [];
    for ( var i = 0; i < 4; i++ ) {
        var nowIndex = nowPtnIndexList[i];
        var nextIndex  = nextPtnIndexList[i];
        // 縦列の移動先
        var dVertical  = (Math.trunc(nowIndex/4)-Math.trunc(nextIndex/4))*stageWidth;
        // 横列の移動先
        var dHorizon   = (Math.trunc(nowIndex%4)-Math.trunc(nextIndex%4));
        var difference = dVertical+dHorizon;
        var newIndex   = movingBlockIndex[i] - difference;
        // フラグの管理
        var lockFlag  = blockStatus.lock === stageBlockStatus[newIndex];
        var indexFlag = newIndex >= 200;
        if ( lockFlag || indexFlag ) {
            break;
        } else {
            swapIndexList.push(newIndex);
        }
    }

    /**
     * 壁を超えないか判定
     */
    var checkSideOver = function(array) {
        var sum  = 0;
        var includeFlag = false;
        array.forEach( function(num) {
            sum+=num%stageWidth;
        });
        var center = Math.trunc(sum/4);
        array.forEach( function(num) {
            if ( center === num%stageWidth ) {
                includeFlag = true;
            }
        });
        return includeFlag;
    };

    if ( 4 === swapIndexList.length && checkSideOver(swapIndexList) ) {
        movingBlockIndex.forEach( function(oldIndex) {
            stageBlockStatus[oldIndex] = blockStatus.space;
            stageBlock[oldIndex].frame = 8;
        });
        swapIndexList.forEach( function(newIndex) {
            stageBlockStatus[newIndex] = blockStatus.move;
            stageBlock[newIndex].frame = color;
        });
    } else {
    // 回転しない場合は回転タイプを元に戻す
        --rotate;
    }
}

/**
 * ブロック落下
 */
function dropBlock() {
    var nextBlock = [];
    var nextFlag  = true;
    var color;
    for ( var index = 0; index < stageWidth*stageHeight; index++ ) {
        if ( stageBlockStatus[index] === blockStatus.move ) {
            nextBlock.push(index);
            stageBlockStatus[index] = blockStatus.space;
            color = stageBlock[index].frame;
            stageBlock[index].frame = 8;
            if ( undefined === stageBlock[index+stageWidth] || blockStatus.lock === stageBlockStatus[index+stageWidth] ) {
                nextFlag = false;
            }
        }
    }
    nextBlock.forEach( function(index) {
        if ( !nextFlag ) {
            stageBlockStatus[index] = blockStatus.lock;
            stageBlock[index].frame = color;
        } else {
            stageBlockStatus[index+stageWidth] = blockStatus.move;
            stageBlock[index+stageWidth].frame = color;
        }
    });
    if ( !nextFlag ) {
        clearLine();
        pullNextBlock();
    }
}

/**
 * ラインを消す
 */
function clearLine() {
    blockType.shift();
    var clearLineBonus = -1;

    score += 10;

    // 削除可能なラインが存在するかチェック
    for ( var vertical = 0; vertical < stageHeight; vertical++ ) {
        var lineIndex = [];
        for ( var horizon = 0; horizon < stageWidth; horizon++ ) {
            var index = vertical*stageWidth + horizon;
            if ( blockStatus.lock === stageBlockStatus[index] ) {
                lineIndex.push(index);
            }
        }
        // 削除可能なラインがある場合,ラインを削除し,ラインボーナスのカウントを+1する
        if ( 10 === lineIndex.length ) {
            for ( var i = lineIndex[9]; i >= 0; i-- ) {
                if ( i < stageWidth ) {
                    stageBlockStatus[i] = blockStatus.space;
                    stageBlock[i].frame = 8;
                } else {
                    stageBlockStatus[i] = stageBlockStatus[i-stageWidth];
                    stageBlock[i].frame = stageBlock[i-stageWidth].frame;
                }
            }
            ++clearLineBonus;
        }
    }

    // 同時に消したライン数によってボーナスポイントを加算
    if ( clearLineBonus >= 0 ) {
        score += clearLineBonusList[clearLineBonus];
    }

    // 全消しした際のボーナスポイント
    if ( !stageBlockStatus.includes(blockStatus.lock) ) {
        score += 10000;
    }
    scoreText.text  = (scoreBase+score).slice(-8);
    ++gameCount;
    if ( gameCount > addLineCount ) {
        gameCount = 0;
        addLine();
    }
}

/**
 * ブロックを1ライン押し上げる
 */
function addLine() {
    var random = Math.floor(Math.random()*9);
    var endLine     = stageWidth*(stageHeight-1);
    for ( var i = 0; i < stageWidth*stageHeight; i++ ) {
        if ( i >= endLine ) {
            if ( random === i%stageWidth ) {
                stageBlockStatus[i] = blockStatus.space;
                stageBlock[i].frame = 8;
            } else {
                stageBlockStatus[i] = blockStatus.lock;
                stageBlock[i].frame = 0;
            }
        } else {
            stageBlockStatus[i] = stageBlockStatus[i+stageWidth];
            stageBlock[i].frame = stageBlock[i+stageWidth].frame;
        }
    }

}