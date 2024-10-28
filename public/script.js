let camera, scene, renderer;
let cube;
let isDragging = false;
let previousMousePosition = {
    x: 0,
    y: 0
};

init();

function init() {
    // シーンの作成
    scene = new THREE.Scene();

    // カメラの設定
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // レンダラーの設定
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    // 立方体の作成
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x0088ff });
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // イベントリスナーの設定
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('touchstart', onTouchStart);
    renderer.domElement.addEventListener('touchmove', onTouchMove);
    renderer.domElement.addEventListener('touchend', onTouchEnd);
    window.addEventListener('resize', onWindowResize);

    // AR機能の初期化
    document.getElementById('startAR').addEventListener('click', startAR);

    animate();
}

function startAR() {
    if (navigator.xr) {
        document.getElementById('loading').style.display = 'block';
        
        navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
            if (supported) {
                navigator.xr.requestSession('immersive-ar').then((session) => {
                    // AR セッションの開始処理
                    document.getElementById('loading').style.display = 'none';
                    // ここにARセッションのセットアップコードを追加
                });
            } else {
                alert('AR is not supported on this device');
                document.getElementById('loading').style.display = 'none';
            }
        });
    } else {
        alert('WebXR is not available');
    }
}

function onMouseDown(event) {
    isDragging = true;
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseMove(event) {
    if (!isDragging) return;

    const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
    };

    cube.rotation.y += deltaMove.x * 0.01;
    cube.rotation.x += deltaMove.y * 0.01;

    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseUp() {
    isDragging = false;
}

function onTouchStart(event) {
    if (event.touches.length === 1) {
        isDragging = true;
        previousMousePosition = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
    }
}

function onTouchMove(event) {
    if (!isDragging || event.touches.length !== 1) return;

    const deltaMove = {
        x: event.touches[0].clientX - previousMousePosition.x,
        y: event.touches[0].clientY - previousMousePosition.y
    };

    cube.rotation.y += deltaMove.x * 0.01;
    cube.rotation.x += deltaMove.y * 0.01;

    previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
    };
}

function onTouchEnd() {
    isDragging = false;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
