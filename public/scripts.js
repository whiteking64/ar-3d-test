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

async function startAR() {
    if (isIOS()) {
        // iOS handling remains unchanged
        const anchor = document.createElement('a');
        anchor.setAttribute('rel', 'ar');
        anchor.setAttribute('href', 'https://developer.apple.com/augmented-reality/quick-look/models/teapot/teapot.usdz');
        anchor.appendChild(document.createElement('img'));
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    } else if (navigator.xr) {
        document.getElementById('loading').style.display = 'block';

        try {
            // Check if AR session is supported
            const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
            if (!isSupported) {
                throw new Error('AR not supported');
            }

            // Request AR session with required features
            const session = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['local', 'hit-test'],
                optionalFeatures: ['dom-overlay'],
                domOverlay: { root: document.body }
            });

            // Make WebGL context XR compatible
            const gl = renderer.getContext();
            await gl.makeXRCompatible();

            // Connect renderer to XR session
            const xrLayer = new XRWebGLLayer(session, gl);
            session.updateRenderState({ baseLayer: xrLayer });

            // Get reference space
            const referenceSpace = await session.requestReferenceSpace('local');

            // Cleanup on session end
            session.addEventListener('end', () => {
                console.log('AR session ended');
                document.getElementById('loading').style.display = 'none';
            });

            // Start rendering loop
            session.requestAnimationFrame((time, frame) => {
                // AR rendering loop
                const pose = frame.getViewerPose(referenceSpace);
                if (pose) {
                    // Update AR view
                    const view = pose.views[0];
                    const viewport = xrLayer.getViewport(view);
                    renderer.setSize(viewport.width, viewport.height);
                    camera.matrix.fromArray(view.transform.matrix);
                    camera.updateMatrixWorld(true);
                }
            });

            document.getElementById('loading').style.display = 'none';
            console.log('AR session started successfully');

        } catch (error) {
            console.error('AR session error:', error);
            document.getElementById('loading').style.display = 'none';
            
            // Display detailed error message
            let errorMessage = 'AR session failed: ';
            if (error.name === 'SecurityError') {
                errorMessage += 'Camera permission is required.';
            } else if (error.name === 'NotAllowedError') {
                errorMessage += 'Camera access is not allowed.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage += 'AR is not supported on your device or browser.';
            } else {
                errorMessage += error.message || 'Unknown error occurred.';
            }
            alert(errorMessage);

            // Update debug info
            const deviceInfo = document.getElementById('deviceInfo');
            deviceInfo.innerHTML += `<br>Error: ${errorMessage}`;
        }
    } else {
        alert('WebXR is not available on this device/browser');
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
