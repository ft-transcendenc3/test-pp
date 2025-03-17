import * as THREE from './node_modules/three/build/three.module.js';
import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FontLoader } from './node_modules/three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from './node_modules/three/examples/jsm/geometries/TextGeometry.js';


const API_URL = 'http://localhost:8000/game';
        
async function fetchData() {
    try {
        const response = await fetch(`${API_URL}/startGame/`, {
            method: 'GET',
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

export class Game {
    constructor(mode, user_id) {
        this.user_id = user_id;
        // console.log(this.user_id)
        this.ready = false;
        this.mode = mode;
        this.gameRunning = true;
        this.init().then( gameData => {this.gameData = gameData
            this.players = gameData.players;
            this.ballData = gameData.ball;
            this.loader = new THREE.TextureLoader();
            this.fontloader = new FontLoader();
            this.font = 0;
            this.scene = new THREE.Scene();
            this.initial = false;
            this.textMesh;
            this.fontloader.load('./gameFront/fonts/Neue_Qophins_Regular.json', (loadedFont) => {
                this.font = loadedFont;
                // this.createText("0 : 0"); 
            })
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.parentDev = document.getElementById('game-container')
            this.parentDev.appendChild(this.renderer.domElement);
            this.setupScene();
            this.setupControls();
            this.setupLights();
            this.setupGameObjects();
            this.setupEventListeners();
            this.createScoreDisplay();
            this.keys = {
                player1: { left: false, right: false },
                player2: { left: false, right: false }
            };
            if( this.mode == 'local' || this.mode == 'Ai')
            {
                this.startLocalGame();
                this.ready = true;
            }
            if(this.mode == 'online')
            {
                this.startOnlineGame();
                this.ready = true;
            }
            if(this.mode == 'Tournement')
            {
                this.startTournementGame();
                this.ready = true;
            }
            this.closeWebSocketOnButtonClick()
        });
    } 
    setupScene() {
        const partGeo = new THREE.BufferGeometry;
        const posArray = new Float32Array(1500 * 3);
        for(let i = 0; i < 1500 * 3; i++)
            posArray[i] = ( Math.random() - 0.5 ) * 30
        const fallSpeeds = new Float32Array(1500);
        for (let i = 0; i < 1500; i++) {
            fallSpeeds[i] = Math.random() * 0.05 + 0.01; // Random fall speed
        }
        const angles = new Float32Array( 1500 * 3);
        for (let i = 0; i <  1500 * 3; i++) {
            angles[i] = Math.random() * Math.PI / 2; // Random rotation angle
        }
        partGeo.setAttribute('fallSpeed', new THREE.BufferAttribute(fallSpeeds, 1));
        partGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        partGeo.setAttribute('angle', new THREE.BufferAttribute(angles, 3));

        const sakura = this.loader.load('./gameFront/static/sakura2.png')
        this.partMat = new THREE.ShaderMaterial({
            uniforms: {
                pointTexture: { value: sakura },
                time: { value: 0 }
            },
            vertexShader: `
                attribute float angle;
                attribute float fallSpeed; // New attribute for individual falling speed
                uniform float time;
                varying float vAngle;

                void main() {
                    vAngle = angle + (sin(time * 0.5) * 2.5) * 0.08;  // Rotate over time

                    vec3 newPosition = position; 
                    newPosition.y -= fallSpeed * time; // Move down over time

                    // Reset when it falls below a threshold
                    if (newPosition.y < -10.0) {
                        newPosition.y += 20.0; // Reset back to the top
                    }

                    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
                    gl_PointSize = 0.4 * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                varying float vAngle;
        
                void main() {
                    vec2 uv = gl_PointCoord - vec2(0.5); // Center the texture
                    float s = sin(vAngle), c = cos(vAngle);
                    uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y) + vec2(0.5); // Rotate texture
                    gl_FragColor = texture2D(pointTexture, uv);
                    if (gl_FragColor.a < 0.2) discard; // Remove transparent pixels
                }
            `,
            transparent: true
        })
        this.particles = new THREE.Points(partGeo, this.partMat);
        this.scene.add(this.particles);
        this.camera.position.set(0, 7, 0);
        this.camera.lookAt(0, 0, 0);
        this.field =  new THREE.Mesh(
            new THREE.PlaneGeometry(5, 10),
            new THREE.MeshPhysicalMaterial({ color: 0x4287f5,clearcoat:0.2, clearcoatRoughness:0.4, metalness:0.9, roughness:0.5 , side: THREE.DoubleSide })
        );
        this.field.rotation.x = Math.PI / 2;
        this.field.receiveShadow = true;
        this.scene.add(this.field);
        const centerLine = new THREE.Mesh(
            new THREE.PlaneGeometry(5, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
        );
        centerLine.rotation.x = Math.PI / 2;
        this.scene.add(centerLine);
        const wallGeometry = new THREE.BoxGeometry(0.5, 0.3, 10);
        const wallMaterial = new THREE.MeshPhysicalMaterial({ color: 0x4287f5,clearcoat:0.2, clearcoatRoughness:0.4, metalness:0.9, roughness:0.5 , side: THREE.DoubleSide });
        
        this.wallLeft = new THREE.Mesh(wallGeometry, wallMaterial);
        this.wallRight = new THREE.Mesh(wallGeometry, wallMaterial);
        
        this.wallLeft.position.set(-2.75, 0.15, 0);
        this.wallRight.position.set(2.75, 0.15, 0);
        
        this.scene.add(this.wallLeft, this.wallRight);
    }
    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 15;
        this.controls.maxPolarAngle = Math.PI / 2;
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(-5, 10, -2);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        this.renderer.shadowMap.enabled = true;
    }
    setupGameObjects() {
        // this.text = 
        this.ball = new THREE.Mesh(
            new THREE.SphereGeometry(this.ballData.redius),
            new THREE.MeshPhysicalMaterial({
                color: 0xae0f22,
                clearcoat:1, clearcoatRoughness:0.2, metalness:0.7, roughness:0.1 
            })
        );
        
        // Add point light to follow ball
        this.ballDirLight = new THREE.DirectionalLight(0xff4400 , 8);
        this.ballLight = new THREE.PointLight(0xff4400 , 8);
        // this.ballLight.position.set(-5, 10, 0);
        this.ball.add(this.ballLight)
        this.ball.add(this.ballDirLight )

        // this.ball = new THREE.Mesh(new THREE.SphereGeometry(this.ballData.redius), new THREE.MeshBasicMaterial({color: 0xae0f22}));
        this.scene.add(this.ball);

        const paddleGeometry = new THREE.CapsuleGeometry(this.players.player1.paddleSizeY, this.players.player1.paddleSizeX, 15, 25)

        this.paddle1 = new THREE.Mesh(
            paddleGeometry,
            new THREE.MeshPhongMaterial({ color: 0xff0000 })
        );
        this.paddle2 = new THREE.Mesh(
            paddleGeometry,
            new THREE.MeshPhongMaterial({ color: 0x0000ff })
        );

        this.paddle1.rotation.x = Math.PI / 2;
        this.paddle1.rotation.z = Math.PI / 2;
        this.paddle2.rotation.x = Math.PI / 2;
        this.paddle2.rotation.z = Math.PI / 2;

        this.scene.add(this.paddle1, this.paddle2);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        if (this.mode === 'local' || this.mode === 'Tournement') {
            document.addEventListener('keydown', (e) => this.handleLocalKeyDown(e));
            document.addEventListener('keyup', (e) => this.handleLocalKeyUp(e));
        } else {
            document.addEventListener('keydown', (e) => this.handleOnlineKeyDown(e));
            document.addEventListener('keyup', (e) => this.handleOnlineKeyUp(e));
        }
    }

    handleLocalKeyDown(event) {
        switch(event.code) {
            case 'KeyA': this.keys.player1.left = true; break;
            case 'KeyD': this.keys.player1.right = true; break;
            case 'ArrowLeft': this.keys.player2.left = true; break;
            case 'ArrowRight': this.keys.player2.right = true; break;
        }
    }

    handleLocalKeyUp(event) {
        switch(event.code) {
            case 'KeyA': this.keys.player1.left = false; break;
            case 'KeyD': this.keys.player1.right = false; break;
            case 'ArrowLeft': this.keys.player2.left = false; break;
            case 'ArrowRight': this.keys.player2.right = false; break;
        }
    }

    handleOnlineKeyDown(event) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            this.keys.player1[event.key === 'ArrowLeft' ? 'left' : 'right'] = true;
        }
    }

    handleOnlineKeyUp(event) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            this.keys.player1[event.key === 'ArrowLeft' ? 'left' : 'right'] = false;
        }
    }
    closeWebSocketOnButtonClick() {
        document.querySelectorAll("button").forEach((button) => {
            button.addEventListener("click", () => {
                console.log("WebSocket closed.");
                if (this.ws && this.ws.readyState === WebSocket.OPEN)
                    this.ws.close();
                // }
            }, { once: true }); // Ensures the event listener runs only once per button
        });
    }
    startLocalGame(){
        this.ws = new WebSocket(`ws://${window.location.hostname}:8000/ws/pongLocal/`);
        
        this.ws.onopen = () => {
            console.log('Connected to game server');
            document.getElementById('waiting-screen').style.display = 'flex';
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'waiting') {
                // Already showing waiting screen
            }
            else if (data.type === 'match_found') {
                document.getElementById('waiting-screen').style.display = 'none';
                this.camera.position.z = 0;
                this.camera.position.x = 4;
                this.camera.position.y = 5;
                this.camera.lookAt(0, 0, 0);
                if(this.initial == false )
                {
                    // console.log(this.initial);
                    this.initialCameraPosition = this.camera.position.clone();
                    this.initial = true;
                }
                    
                this.sendInput()
        }
        else {
            if (data.ball) {
                this.ballData.x = data.ball.x;
                this.ballData.y = data.ball.y;
                this.ballData.z = data.ball.z;
            }
            
            if (data.players) {
                    if (data.players.player1) {
                        this.players.player1.x = data.players.player1.x;
                    }
                    if (data.players.player2) {

                        this.players.player2.x = data.players.player2.x;
                    }
                    // this.updateText(`${data.players.player1.score} : ${data.players.player2.score}`, -3, 0.8, 1.5, true)
                    this.updateScoreDisplay(data.players.player1.score, data.players.player2.score, "Player 1", "Player 2", true);
                }
            }
        };

        this.ws.onclose = () => {
            console.log('Disconnected from game server');
            document.getElementById('waiting-screen').style.display = 'none';
            this.gameRunning = false;
        };
    }
    startOnlineGame(){
        // console.log(this.user_id);
        this.ws = new WebSocket(`ws://${window.location.hostname}:8000/ws/pongOnline/${this.user_id}`);

        this.ws.onopen = () => {
            console.log('Connected to game server');
            document.getElementById('waiting-screen').style.display = 'flex';
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'waiting') {
                // Already showing waiting screen
            }
            else if (data.type === 'match_found') {
                document.getElementById('waiting-screen').style.display = 'none';
                this.playerId = data.player;
                
                if (this.playerId === 'player2') {
                    this.camera.position.z = -7;
                    this.camera.position.y = 5;

                    this.camera.lookAt(0, 0, 0);
                } else {
                    this.camera.position.z = 7;
                    this.camera.position.y = 5;
                    this.camera.lookAt(0, 0, 0);
                }
            }
            else {
                // console.log(data.players)
                if (data.ball) {
                    this.ballData.x = data.ball.x;
                    this.ballData.y = data.ball.y;
                    this.ballData.z = data.ball.z;
                }

                if (data.players) {
                    if (data.players.player1) {
                        this.players.player1.x = data.players.player1.x;
                    }
                    if (data.players.player2) {
                        this.players.player2.x = data.players.player2.x;
                    }
                    this.updateScoreDisplay(data.players.player1.score, data.players.player2.score, data.players.player1.name , data.players.player2.name, false);
                }
            }
        };

        this.ws.onclose = () => {
            console.log('Disconnected from game server');
            document.getElementById('waiting-screen').style.display = 'none';
            this.gameRunning = false;
        };
    }
    startTournementGame(){
        this.ws = new WebSocket(`ws://${window.location.hostname}:8000/ws/pongTournement/`);
        // const tournament = createTournamentDisplay();
        // tournament.show();
        this.ws.onopen = () => {
            const nickname1 = prompt("Enter your nickname:");
            const nickname2 = prompt("Enter your nickname:");
            const nickname3 = prompt("Enter your nickname:");
            const nickname4 = prompt("Enter your nickname:");
            this.ws.send(JSON.stringify({ type: "set_nickname", nickname1: nickname1, nickname2: nickname2, nickname3: nickname3, nickname4: nickname4 }));
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log(data)
            if (data.type === 'waiting') {
                // Already showing waiting screen
            }
            else if (data.type === 'match_found') {
                document.getElementById('waiting-screen').style.display = 'none';
                this.camera.position.z = 0;
                this.camera.position.x = 4;
                this.camera.position.y = 9.5;
                this.camera.lookAt(0, 0, 0);
                this.sendInput()
            }
            else {
            if (data.ball) {
                this.ballData.x = data.ball.x;
                this.ballData.y = data.ball.y;
                this.ballData.z = data.ball.z;
            }
            
            if (data.players) {
                    const playerKeys = Object.keys(data.players);
                    if (playerKeys.length >= 2) {
                        this.players.player1.x = data.players[playerKeys[0]].x;
                        this.players.player2.x = data.players[playerKeys[1]].x;
                    }
                }
            
            }
        };

        this.ws.onclose = () => {
            console.log('Disconnected from game server');
            document.getElementById('waiting-screen').style.display = 'none';
            this.gameRunning = false;

        };
    }
    sendInput() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            if (this.mode === 'online' || this.mode == 'Ai')
                this.ws.send(JSON.stringify({
                    mode: this.mode,
                    upKey: this.keys.player1.right,
                    downKey: this.keys.player1.left
                }));
            else if (this.mode === 'local' || this.mode == 'Tournement')
                this.ws.send(JSON.stringify({
                    upKey1: this.keys.player1.right,
                    downKey1: this.keys.player1.left,
                    upKey2: this.keys.player2.right,
                    downKey2: this.keys.player2.left,
                    
                }));
        }
    }
    createScoreDisplay() {
        // Create container for score display
        this.boardLight = new THREE.DirectionalLight(0xff4400 , 2);

        // boardLight.rotation.set(0, 0, 10);
        this.scoreBoard = new THREE.Group();
        this.scoreBoard.position.set(0, 3.5, 0);
        if(this.mode === 'online')
        {
                console.log(this.mode)
            this.boardLight.position.set(0, 5, 10);
            this.boardclone = this.scoreBoard.clone().rotateZ(Math.PI);
        }
        else
        {
            this.boardLight.position.set(10, 20, 0);
            this.boardclone = this.scoreBoard.clone().rotateZ(-Math.PI / 2);
        }
        // this.boardLight.lookAt(this.scoreBoard.position)
        this.boardclone.add(this.boardLight);
        this.scene.add(this.boardclone)
        this.scene.add(this.scoreBoard);
        
        // Create scoreboard base with enhanced lighting
        const baseGeometry = new THREE.BoxGeometry(3, 0.8, 0.1);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.9,
            roughness: 0.2,
            envMap: this.scene.environment,
            emissive: 0x222222,
            emissiveIntensity: 0.5
        });
        
        const scoreBase = new THREE.Mesh(baseGeometry, baseMaterial);
        this.scoreBoard.add(scoreBase);
        
        // Add dedicated lighting for the scoreboard
        const scoreboardLight = new THREE.SpotLight(0xffffff, 2);
        scoreboardLight.position.set(0, 1, 2);
        scoreboardLight.target = scoreBase;
        scoreboardLight.angle = Math.PI / 4;
        scoreboardLight.penumbra = 0.3;
        this.scoreBoard.add(scoreboardLight);
        
        // Add ambient light specifically for scoreboard
        const scoreboardAmbient = new THREE.AmbientLight(0xffffff, 1);
        this.scoreBoard.add(scoreboardAmbient);
        
        // Create divider
        const dividerGeometry = new THREE.PlaneGeometry(0.05, 0.6);
        const dividerMaterial = new THREE.MeshBasicMaterial({
            color: 0x555555,
            transparent: true,
            opacity: 0.8
        });
        
        const divider = new THREE.Mesh(dividerGeometry, dividerMaterial);
        divider.position.set(0, 0, 0.051);
        this.scoreBoard.add(divider);
        
        // Create player indicators
        this.player1ScoreText = new THREE.Group();
        this.player2ScoreText = new THREE.Group();
        
        this.player1ScoreText.position.set(-0.7, 0, 0.051);
        this.player2ScoreText.position.set(0.7, 0, 0.051);
        
        this.scoreBoard.add(this.player1ScoreText);
        this.scoreBoard.add(this.player2ScoreText);
        
        // Initialize with 0-0 score
        this.updateScoreDisplay(0, 0, "rayan", "Player 2");
        
        // Add team color indicators
        const team1Color = new THREE.Mesh(
            new THREE.PlaneGeometry(1.45, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xff3333 })
        );
        
        const team2Color = new THREE.Mesh(
            new THREE.PlaneGeometry(1.45, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x3333ff })
        );
        
        team1Color.position.set(-0.75, 0.35, 0.051);
        team2Color.position.set(0.75, 0.35, 0.051);
        
        this.scoreBoard.add(team1Color);
        this.scoreBoard.add(team2Color);
        
        // Make scoreboard softly rotate to face camera
        // this.scoreBoard.lookAt(this.camera.position);
    }
    updateScoreDisplay(score1, score2, player1Name = "Player 1", player2Name = "Player 2", isLocal) {
        if (!this.font) return;
        
        // Clear existing score displays
        while (this.player1ScoreText.children.length > 0) {
            this.player1ScoreText.remove(this.player1ScoreText.children[0]);
        }
        
        while (this.player2ScoreText.children.length > 0) {
            this.player2ScoreText.remove(this.player2ScoreText.children[0]);
        }
        
        // Create new score text for player 1
        const score1Material = new THREE.MeshStandardMaterial({
            color: 0xff3333,
            metalness: 0.5,
            roughness: 0.2,
            emissive: 0x330000,
            emissiveIntensity: 0.5
        });
        
        const score1Geometry = new TextGeometry(score1.toString(), {
            font: this.font,
            size: 0.4,
            depth: 0.05
        });
        
        score1Geometry.computeBoundingBox();
        const score1Width = score1Geometry.boundingBox.max.x - score1Geometry.boundingBox.min.x;
        
        const score1Mesh = new THREE.Mesh(score1Geometry, score1Material);
        score1Mesh.position.set(-score1Width/2, 0, 0);
        this.player1ScoreText.add(score1Mesh);
        
        // Create player 1 name
        const name1Geometry = new TextGeometry(player1Name, {
            font: this.font,
            size: 0.1,
            depth: 0.02
        });
        
        name1Geometry.computeBoundingBox();
        const name1Width = name1Geometry.boundingBox.max.x - name1Geometry.boundingBox.min.x;
        
        const name1Mesh = new THREE.Mesh(name1Geometry, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        name1Mesh.position.set(-name1Width/2, -0.25, 0);
        this.player1ScoreText.add(name1Mesh);
        
        // Create new score text for player 2
        const score2Material = new THREE.MeshStandardMaterial({
            color: 0x3333ff,
            metalness: 0.5,
            roughness: 0.2,
            emissive: 0x000033,
            emissiveIntensity: 0.5
        });
        
        const score2Geometry = new TextGeometry(score2.toString(), {
            font: this.font,
            size: 0.4,
            depth: 0.05
        });
        
        score2Geometry.computeBoundingBox();
        const score2Width = score2Geometry.boundingBox.max.x - score2Geometry.boundingBox.min.x;
        
        const score2Mesh = new THREE.Mesh(score2Geometry, score2Material);
        score2Mesh.position.set(-score2Width/2, 0, 0);
        this.player2ScoreText.add(score2Mesh);
        
        // Create player 2 name
        const name2Geometry = new TextGeometry(player2Name, {
            font: this.font,
            size: 0.1,
            depth: 0.02
        });
        
        name2Geometry.computeBoundingBox();
        const name2Width = name2Geometry.boundingBox.max.x - name2Geometry.boundingBox.min.x;
        
        const name2Mesh = new THREE.Mesh(name2Geometry, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        name2Mesh.position.set(-name2Width/2, -0.25, 0);
        this.player2ScoreText.add(name2Mesh);
        if (isLocal)
        {
            this.scoreBoard.rotation.y = Math.PI / 2;
            // this.boardLight.rotation.y = Math.PI / 2; 
        }
        if(this.playerId === 'player2' && !isLocal)
            this.scoreBoard.rotation.y = Math.PI
        // this.scoreBoard.position.x = Math.PI / 9

        // Animate scoreboard on update
    }
    // Make the scoreboard rotate to face the camera
    resize(width, height) {
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
    async init() {
        console.log("Fetching ball data...");
        const gameData = await fetchData();
        return gameData
    }
    render() {
        if (!this.ready) return;
        this.renderer.render(this.scene, this.camera);
    }

    update() {
        if (!this.ready) return;
        this.partMat.uniforms.time.value += 0.1;
        this.ball.position.set(
            this.ballData.x,
            this.ballData.y,
            this.ballData.z
        );

        this.paddle1.position.set(
            this.players.player1.x,
            this.players.player1.y,
            this.players.player1.z
        );

        this.paddle2.position.set(
            this.players.player2.x,
            this.players.player2.y,
            this.players.player2.z
        );
        this.sendInput();
        this.controls.update();

    }
    cleanup() {
        if (this.ws) {
            this.ws.close();
        }
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        if (this.renderer) {
            this.renderer.dispose();
            this.parentDev.removeChild(this.renderer.domElement);
        }
    }
}