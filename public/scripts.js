let camera, scene, renderer;
let model;  // Changed from cube to model
let isDragging = false;
let previousMousePosition = {
    x: 0,
    y: 0
};

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
deviceInfo.innerHTML = `
    Platform: ${navigator.platform}<br>
    UserAgent: ${navigator.userAgent}<br>
    isIOS: ${isIOS()}<br>
    hasXR: ${!!navigator.xr}
`;

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
        const gltf = await loader.loadAsync('/models/model.glb');
        model = gltf.scene;
        
        // Adjust model
        model.scale.set(1, 1, 1);  // Adjust scale as needed
        model.position.set(0, 0, -2);
        scene.add(model);

        // Add lights for better model visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 1, 1);
        scene.add(directionalLight);

    } catch (error) {
        console.error('Error loading 3D model:', error);
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
        const anchor = document.createElement('a');
        anchor.setAttribute('rel', 'ar');
        anchor.setAttribute('href', '/models/model.usdz');
        anchor.appendChild(document.createElement('img'));
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    } else if (navigator.xr) {
        try {
            const session = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['local'],
                optionalFeatures: ['dom-overlay'],
                domOverlay: { root: document.body }
            });

            const gl = renderer.getContext();
            await gl.makeXRCompatible();

            const referenceSpace = await session.requestReferenceSpace('local');
            const xrLayer = new XRWebGLLayer(session, gl);
            session.updateRenderState({ baseLayer: xrLayer });

            function onXRFrame(time, frame) {
                const pose = frame.getViewerPose(referenceSpace);
                if (pose) {
                    const view = pose.views[0];
                    const viewport = xrLayer.getViewport(view);
                    renderer.setSize(viewport.width, viewport.height);
                    camera.matrix.fromArray(view.transform.matrix);
                    camera.updateMatrixWorld(true);
                    renderer.render(scene, camera);
                }
                session.requestAnimationFrame(onXRFrame);
            }

            session.requestAnimationFrame(onXRFrame);

        } catch (error) {
            console.error('AR error:', error);
            alert('Could not start AR: ' + (error.message || 'Unknown error'));
        }
    } else {
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
