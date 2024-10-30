let camera, scene, renderer;
let model;  // Changed from cube to model
let isDragging = false;
let previousMousePosition = {
    x: 0,
    y: 0
};

// AR Session Status Tracking
const arStatus = {
    isModelLoaded: false,
    isSessionSupported: false,
    isSessionCreated: false,
    isWebGLCompatible: false,
    isReferenceSpaceCreated: false,
    lastErrorMessage: null,
    lastErrorStack: null,
    sessionInitSteps: []
};

// Log status helper function
function logARStatus(message) {
    const timestamp = new Date().toISOString();
    arStatus.sessionInitSteps.push(`${timestamp}: ${message}`);
}

const isIOS = () => {
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
};

const deviceInfo = document.getElementById('deviceInfo');
const debugInfo = {
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    isIOS: isIOS(),
    hasXR: !!navigator.xr,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio
};
// deviceInfo.innerHTML = `
//     Platform: ${navigator.platform}<br>
//     UserAgent: ${navigator.userAgent}<br>
//     isIOS: ${isIOS()}<br>
//     hasXR: ${!!navigator.xr}
// `;
deviceInfo.innerHTML = Object.entries(debugInfo)
    .map(([key, value]) => `${key}: ${value}<br>`)
    .join('');

init();

async function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    // Load GLB model
    const loader = new THREE.GLTFLoader();
    try {
        const gltf = await loader.loadAsync('/models/teapot.glb');
        model = gltf.scene;
        
        model.scale.set(1, 1, 1);
        model.position.set(0, 0, -2);
        scene.add(model);

        // Add lights for better model visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 1, 1);
        scene.add(directionalLight);

        arStatus.isModelLoaded = true;
        logARStatus('3D model loaded successfully');
    } catch (error) {
        // Fallback to cube if model loading fails
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x0088ff });
        model = new THREE.Mesh(geometry, material);
        scene.add(model);
    }

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
        logARStatus('Starting iOS AR session');
        try {
            const anchor = document.createElement('a');
            anchor.setAttribute('rel', 'ar');
            anchor.setAttribute('href', '/models/teapot.usdz');
            anchor.appendChild(document.createElement('img'));
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
        } catch (error) {
            logARStatus(`iOS AR failed: ${error.message}`);
            const errorMessage = `Failed to launch AR view: ${error.message}\nPlease make sure you're using Safari on iOS 12 or later.`;
            alert(errorMessage);
        }
    } else if (navigator.xr) {
        logARStatus('Starting Android AR session');
        try {
            // Check AR support
            logARStatus('Checking AR support');
            const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
            if (!isSupported) {
                throw new Error('AR not supported');
            }
            arStatus.isSessionSupported = true;
            logARStatus('AR is supported');

            // Request AR session
            logARStatus('Requesting AR session');
            const session = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['local'],
                optionalFeatures: ['dom-overlay'],
                domOverlay: { root: document.body }
            });
            arStatus.isSessionCreated = true;
            logARStatus('AR session created');

            // Setup WebGL
            logARStatus('Setting up WebGL');
            const gl = renderer.getContext();
            await gl.makeXRCompatible();
            arStatus.isWebGLCompatible = true;
            logARStatus('WebGL setup complete');

            // Setup XR layer
            const xrLayer = new XRWebGLLayer(session, gl);
            session.updateRenderState({
                baseLayer: xrLayer
            });
            logARStatus('XR layer setup complete');

            // Get reference space
            logARStatus('Requesting reference space');
            const referenceSpace = await session.requestReferenceSpace('local');
            arStatus.isReferenceSpaceCreated = true;
            logARStatus('Reference space created');

            session.addEventListener('end', () => {
                logARStatus('AR session ended');
                session.removeEventListener('requestAnimationFrame', onXRFrame);
            });

            function onXRFrame(time, frame) {
                session.requestAnimationFrame(onXRFrame);
                const pose = frame.getViewerPose(referenceSpace);
                if (!pose) return;

                const view = pose.views[0];
                const viewport = xrLayer.getViewport(view);
                renderer.setSize(viewport.width, viewport.height);
                camera.matrix.fromArray(view.transform.matrix);
                camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
                renderer.render(scene, camera);
            }

            session.requestAnimationFrame(onXRFrame);
            logARStatus('AR session running');

        } catch (error) {
            arStatus.lastErrorMessage = error.message;
            arStatus.lastErrorStack = error.stack;
            logARStatus(`AR session failed: ${error.message}`);

            // Display detailed status when error occurs
            const statusMessage = `AR Session Status:\n
                Model Loaded: ${arStatus.isModelLoaded}
                Session Supported: ${arStatus.isSessionSupported}
                Session Created: ${arStatus.isSessionCreated}
                WebGL Compatible: ${arStatus.isWebGLCompatible}
                Reference Space Created: ${arStatus.isReferenceSpaceCreated}
                Last Error: ${arStatus.lastErrorMessage}

                Initialization Steps:
                ${arStatus.sessionInitSteps.join('\n')}`;

            alert(`Could not start AR. ${statusMessage}`);
        }
    } else {
        logARStatus('WebXR not available');
        alert('AR is not supported on this device/browser');
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

    if (model) {
        model.rotation.y += deltaMove.x * 0.01;
        model.rotation.x += deltaMove.y * 0.01;
    }

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

    if (model) {
        model.rotation.y += deltaMove.x * 0.01;
        model.rotation.x += deltaMove.y * 0.01;
    }

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
