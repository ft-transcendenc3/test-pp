import { getCookieValue, isAuthenticated } from "../auth.js";
import {Game }from "../gameFront/game.js"; // Import the Game class from your second file

const app = document.getElementById("app");

function displayGame1() {
    document.title = 'Game 1';

    app.innerHTML = `
    <section class="game-1">
    <!-- HEADER CONTAINER -->
    <header class="header"></header> 
        <!-- MAIN CONTAINER WITH SIDEBAR AND CONTENT -->
        <div class="main-container">

            <!-- 2. LEFT SIDEBAR -->
            <div class="left-sidebar"></div>

            <!-- 3. MAIN CONTENT AREA -->
            <div class="content">
                <!-- Welcome Section -->
                <div class="welcome-section">
                    <h1 class="welcome-title">Welcome back, Rogue</h1>
                    <p class="welcome-subtitle">Choose a game to play or continue where you left off</p>
                </div>

                <!-- Game Boxes -->
                <div class="game-boxes">
                    <!-- Game 1: Dungeon Crawler (AI Mode) -->
                    <div class="game-box" data-game="ai">
                        <div class="game-badge">Popular</div>
                        <div class="game-image" style="background-image: url('./resources/adadoun.png')"></div>
                        <div class="game-info">
                            <h3 class="game-title">AI Mode</h3>
                            <p class="game-description">Play against an AI opponent in this challenging match.</p>
                            <button class="play-button"><i class="fas fa-play"></i> Play Now</button>
                        </div>
                    </div>

                    <!-- Game 2: Arena Battle (Local Mode) -->
                    <div class="game-box" data-game="local">
                        <div class="game-badge">New Season</div>
                        <div class="game-image" style="background-image: url('./resources/adadoun.png')"></div>
                        <div class="game-info">
                            <h3 class="game-title">Local Mode</h3>
                            <p class="game-description">Play with a friend on the same device in fast-paced, tactical combat.</p>
                            <button class="play-button"><i class="fas fa-play"></i> Play Now</button>
                        </div>
                    </div>

                    <!-- Game 3: Puzzle Quest (Online Mode) -->
                    <div class="game-box" data-game="online">
                        <div class="game-badge">Multiplayer</div>
                        <div class="game-image" style="background-image: url('./resources/adadoun.png')"></div>
                        <div class="game-info">
                            <h3 class="game-title">Online Mode</h3>
                            <p class="game-description">Challenge players from around the world in online matches.</p>
                            <button class="play-button"><i class="fas fa-play"></i> Play Now</button>
                        </div>
                    </div>

                    <!-- Game 4: Space Explorer (Tournament Mode) -->
                    <div class="game-box" data-game="tournament">
                        <div class="game-badge">Beta</div>
                        <div class="game-image" style="background-image: url('./resources/adadoun.png')"></div>
                        <div class="game-info">
                            <h3 class="game-title">Tournament Mode</h3>
                            <p class="game-description">Compete in a tournament with multiple participants to crown a champion.</p>
                            <button class="play-button"><i class="fas fa-play"></i> Play Now</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </section>
    <div id="waiting-screen" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.8); justify-content: center; align-items: center; z-index: 1000;">
        <div style="color: white; text-align: center;">
            <h2>Waiting for opponent...</h2>
            <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 50px; height: 50px; animation: spin 2s linear infinite; margin: 20px auto;"></div>
        </div>
    </div>
    <style>
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
    `;

    let currentGame = null;

    // Add event listeners to game boxes
    document.querySelectorAll('.game-box').forEach(box => {
        // document.getElementsById('').style.display = 'none';
        box.addEventListener('click', async function() {
            try {
                const token = getCookieValue('access_token');
                console.log(token);

                if (!token) {
                    console.error('No authentication token found');
                    return;
                }

                const response = await fetch('http://127.0.0.1:8000/api/user', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log("Response:", response);

                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }

                const userData = await response.json();
                console.log(userData);

                // Start the game based on the data-game attribute
                const gameMode = this.getAttribute('data-game');
                startGame(gameMode, userData);

            } catch (error) {
                console.error('Error fetching user data:', error);
                alert('Failed to load user data. Please try again later.');
            }
        });
    });

    function startGame(mode, userData) {
        // First, clear the content area
        const contentArea = document.querySelector('.content');
        const savedHTML = contentArea.innerHTML;

        // Create a game container
        contentArea.innerHTML = '<div id="game-container" style="width: 100%; overflow: hidden; height: 80vh;"></div>';
        const gameContainer = document.getElementById('game-container');

        // If there's an existing game, clean it up
        if (currentGame) {
            currentGame.cleanup();
        }

        // Create a back button
        const backButton = document.createElement('button');
        backButton.textContent = 'Back to Menu';
        backButton.style.position = 'absolute';
        backButton.style.top = '10px';
        backButton.style.left = '10px';
        backButton.style.zIndex = '100';
        backButton.addEventListener('click', () => {
            if (currentGame) {
                currentGame.cleanup();
                currentGame = null;
            }
            contentArea.innerHTML = savedHTML;
            
            // Re-add event listeners to the game boxes
            document.querySelectorAll('.game-box').forEach(box => {
                box.addEventListener('click', function() {
                    const gameMode = this.getAttribute('data-game');
                    startGame(gameMode);
                });
            });
        });
        
        gameContainer.appendChild(backButton);

        // Map data-game attributes to actual game modes
        const modeMap = {
            'ai': 'Ai',
            'local': 'local',
            'online': 'online',
            'tournament': 'Tournement'  // Note: maintain the spelling used in your second file
        };

        // Start the game with the selected mode
        const gameModeFormatted = modeMap[mode];
        currentGame = new Game(gameModeFormatted, userData.user.id);
        // Set up the animation loop
        function animation() {
            if (currentGame) {
                currentGame.update();
                currentGame.render();
                // console.log('gameRunning == ' + currentGame.gameRunning);
                requestAnimationFrame(animation);
            }
        }
        animation();
    }
}

// Run the function when the DOM is ready
document.addEventListener('DOMContentLoaded', displayGame1);

// Export the function
export default displayGame1;

// import { getCookieValue, isAuthenticated } from "../auth.js";
// import Game from "../../front/game.js";

// const app = document.getElementById("app");

// function displayGame1() {
//     document.title = 'Game 1';

//     app.innerHTML = `
//     <section class="game-1">
//     <!-- HEADER CONTAINER -->
//     <header class="header"></header> 
//         <!-- MAIN CONTAINER WITH SIDEBAR AND CONTENT -->
//         <div class="main-container">

//             <!-- 2. LEFT SIDEBAR -->
//             <div class="left-sidebar"></div>

//             <!-- 3. MAIN CONTENT AREA -->
//             <div class="content">
//                 <!-- Welcome Section -->
//                 <div class="welcome-section">
//                     <h1 class="welcome-title">Welcome back, Rogue</h1>
//                     <p class="welcome-subtitle">Choose a game to play or continue where you left off</p>
//                 </div>

//                 <!-- Game Boxes -->
//                 <div class="game-boxes">
//                     <!-- Game 1: Dungeon Crawler -->
//                     <div class="game-box" data-game="dungeon">
//                         <div class="game-badge">Popular</div>
//                         <div class="game-image" style="background-image: url('./resources/adadoun.png')"></div>
//                         <div class="game-info">
//                             <h3 class="game-title">Dungeon Crawler</h3>
//                             <p class="game-description">Explore mysterious dungeons, battle enemies, and collect treasures in this rogue-like adventure.</p>
//                             <button class="play-button"><i class="fas fa-play"></i> Play Now</button>
//                         </div>
//                     </div>

//                     <!-- Game 2: Arena Battle -->
//                     <div class="game-box" data-game="arena">
//                         <div class="game-badge">New Season</div>
//                         <div class="game-image" style="background-image: url('./resources/adadoun.png')"></div>
//                         <div class="game-info">
//                             <h3 class="game-title">Arena Battle</h3>
//                             <p class="game-description">Compete against other players in fast-paced, tactical arena combat.</p>
//                             <button class="play-button"><i class="fas fa-play"></i> Play Now</button>
//                         </div>
//                     </div>

//                     <!-- Game 3: Puzzle Quest -->
//                     <div class="game-box" data-game="puzzle">
//                         <div class="game-image" style="background-image: url('./resources/adadoun.png')"></div>
//                         <div class="game-info">
//                             <h3 class="game-title">Puzzle Quest</h3>
//                             <p class="game-description">Train your brain with challenging puzzles and riddles.</p>
//                             <button class="play-button"><i class="fas fa-play"></i> Play Now</button>
//                         </div>
//                     </div>

//                     <!-- Game 4: Space Explorer -->
//                     <div class="game-box" data-game="space">
//                         <div class="game-badge">Beta</div>
//                         <div class="game-image" style="background-image: url('./resources/adadoun.png')"></div>
//                         <div class="game-info">
//                             <h3 class="game-title">Space Explorer</h3>
//                             <p class="game-description">Navigate through the cosmos, discover new planets, and build your galactic empire.</p>
//                             <button class="play-button"><i class="fas fa-play"></i> Play Now</button>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//         </div>
//     </section>
//     `;

//     // Add event listeners to game boxes
//     document.querySelectorAll('.game-box').forEach(box => {
//         box.addEventListener('click', async function() {
//             try {
//                 const token = getCookieValue('access_token');
//                 console.log(token);

//                 if (!token) {
//                     console.error('No authentication token found');
//                     return;
//                 }

//                 const response = await fetch('http://127.0.0.1:8000/api/user', {
//                     method: 'GET',
//                     headers: {
//                         'Authorization': `Bearer ${token}`,
//                         'Content-Type': 'application/json'
//                     }
//                 });

//                 console.log("Response:", response);

//                 if (!response.ok) {
//                     throw new Error('Failed to fetch user data');
//                 }

//                 const userData = await response.json();
//                 console.log(userData);

//             } catch (error) {
//                 console.error('Error fetching user data:', error);
//                 alert('Failed to load user data. Please try again later.');
//             }
//         });
//     });
// }

// // Run the function when the DOM is ready
// document.addEventListener('DOMContentLoaded', displayGame1);

// // Export the function
// export default displayGame1;
