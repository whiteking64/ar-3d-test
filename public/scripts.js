let camera, scene, renderer;
let cube;
let isDragging = false;
let previousMousePosition = {
    x: 0,
    y: 0
};

// より正確なデバイス/ブラウザ検出
const isIOS = () => {
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
    // iPadOS 13以降のデバイス検出
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
};

// デバッグ情報の表示
const deviceInfo = document.getElementById('deviceInfo');
deviceInfo.innerHTML = `
    Platform: ${navigator.platform}<br>
    UserAgent: ${navigator.userAgent}<br>
    isIOS: ${isIOS()}<br>
    hasXR: ${!!navigator.xr}
`;

init();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x0088ff });
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('touchstart', onTouchStart);
    renderer.domElement.addEventListener('touchmove', onTouchMove);
    renderer.domElement.addEventListener('touchend', onTouchEnd);
    window.addEventListener('resize', onWindowResize);

    document.getElementById('startAR').addEventListener('click', startAR);

    animate();
}

function startAR() {
    if (isIOS()) {
        // iOSデバイスの場合、Quick Lookを使用
        const anchor = document.createElement('a');
        anchor.setAttribute('rel', 'ar');
        anchor.setAttribute('href', 'https://developer.apple.com/augmented-reality/quick-look/models/teapot/teapot.usdz');
        // iOS 13.3以降のChrome対応
        anchor.appendChild(document.createElement('img'));
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    } else if (navigator.xr) {
        // WebXRが利用可能な場合（Android等）
        document.getElementById('loading').style.display = 'block';
        
        navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
            if (supported) {
                navigator.xr.requestSession('immersive-ar').then((session) => {
                    document.getElementById('loading').style.display = 'none';
                    // ARセッションのセットアップ
                }).catch(error => {
                    console.error('AR session request failed:', error);
                    alert('Failed to start AR session');
                    document.getElementById('loading').style.display = 'none';
                });
            } else {
                alert('AR is not supported on this device');
                document.getElementById('loading').style.display = 'none';
            }
        });
    } else {
        alert('AR is not available on this device/browser');
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
