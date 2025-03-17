// auth.js utilities
// export function getCookieValue(name) {
//     const cookies = document.cookie.split(';');

//     for (let cookie of cookies) {
//         const [cookieName, cookieValue] = cookie.trim().split('=');
//         if (cookieName === name) {
//             return cookieValue;
//         }
//         console.log("COKIES AFTEEEER :" + document.cookie);
//     }
//     return null;
// }
export function getCookieValue(name) {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split('=');
        if (cookieName.trim() === name) {
            return cookieValue;
        }
    }
    return null;
}

export function isAuthenticated() {
    const token = getCookieValue('access_token');
    console.log("Checking authentication, token:", token ? 'exists' : 'missing');
    return token !== null;
    // return getCookieValue('access_token') !== null;
}

// CSS loader function
function loadCSS(filename) {
    // Check if the CSS is already loaded
    const existingLinks = document.querySelectorAll('link[rel="stylesheet"]');
    for (let link of existingLinks) {
        if (link.href.includes(filename)) {
            return; // CSS already loaded
        }
    }
    
    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = filename;
    document.head.appendChild(cssLink);
}

// Load base CSS that should always be available
loadCSS("./styles.css");

// Define route configurations for better scalability
const routes = {
    'home': {
        loadModule: () => import("./home/home.js").then(module => {
            loadCSS("./home/home.css");
            return module.default;
        }),
        requiresAuth: true
    },
    'login': {
        loadModule: () => import("./login/login.js").then(module => {
            loadCSS("./login/login.css");
            return module.default;
        }),
        requiresAuth: false
    },
    'profile': {
        loadModule: () => import("./profile/profile.js").then(module => {
            loadCSS("./profile/profile.css");
            return module.default;
        }),
        requiresAuth: true
    },
    'game-1': {
        loadModule: () => import("./game-1/game.js").then(module => {
            loadCSS("./game-1/game.css");
            return module.default;
        }),
        requiresAuth: true
    },
    'game-2': {
        loadModule: () => import("./game-2/game.js").then(module => {
            loadCSS("./game-2/game.css");
            return module.default;
        }),
        requiresAuth: true
    },
    'friends': {
        loadModule: () => import("./friends/friends.js").then(module => {
            loadCSS("./friends/friends.css");
            return module.default;
        }),
        requiresAuth: true
    },
    '404': {
        loadModule: () => import("./404/404.js").then(module => {
            loadCSS("./404/404.css");
            return module.default;
        }),
        requiresAuth: false
    }
};

// Default routes
const DEFAULT_AUTH_ROUTE = 'home';
const DEFAULT_UNAUTH_ROUTE = 'login';

function appendSideBar() {
    const sidebar = document.getElementsByClassName("left-sidebar")[0];
    
    if (sidebar) {
        sidebar.innerHTML = `
            <nav class="side-nav">
                <a href="#home" data-tooltip="Home"><i class="fas fa-home"></i></a>
                <a href="#game-1" data-tooltip="Ping Pong Game"><i class="fas fa-table-tennis"></i></a>
                <a href="#game-2" data-tooltip="Tic Tac Toe Game"><i class="fas fa-th"></i></a>
                <a href="#profile" data-tooltip="Profile & Settings"><i class="fas fa-user-cog"></i></a>
                <a href="#friends" data-tooltip="Friends"><i class="fas fa-users"></i></a>
            </nav>
            <!-- Logout container at the bottom -->
            <div class="logout-container">
                <a href="#" data-tooltip="Logout" class="logout" id="logout-btn"><i class="fas fa-sign-out-alt"></i></a>
            </div>
        `;

        // Add logout functionality
        document.getElementById('logout-btn').addEventListener('click', async (e) => {
            e.preventDefault();

            try {
                // Get the token to include in authorization header
                const token = getCookieValue('access_token');
                
                // Call the backend logout endpoint
                const response = await fetch('http://127.0.0.1:8000/api/logout/', {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    console.log('Successfully logged out on server');
                    window.location.hash = DEFAULT_UNAUTH_ROUTE;
                } else {
                    console.error('Server logout failed:', await response.text());
                }
            } catch (error) {
                console.error('Error during logout:', error);
                // If server logout fails, redirect to login anyway
                window.location.hash = DEFAULT_UNAUTH_ROUTE;
            }
        });
    }
}

function appendHeader() {
    const header = document.getElementsByClassName("header")[0];
    
    if (header) {
        header.innerHTML = `
            <div class="logo">ROGUE</div>
            <div class="search-bar">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" placeholder="Search...">
            </div>
            <div class="user-controls">
                <div class="notification">
                    <i class="fa-solid fa-bell"></i>
                    <div class="indicator"></div>
                </div>
                <div class="profile">
                    <img src="./resources/adadoun.png" alt="Player Avatar">
                </div>
            </div>
        `;
    }
}

// Main navigation function
export async function navigate(route) {
    // Show loading indicator (optional)
    console.log("Navigating to:", route);
    console.log("Authentication status:", isAuthenticated());
    console.log("Route=" + route);
    document.body.classList.add('loading');
    
    try {
        // If no route is provided, check authentication status and redirect accordingly
        if (!route) {
            route = isAuthenticated() ? DEFAULT_AUTH_ROUTE : DEFAULT_UNAUTH_ROUTE;

            console.log("Route2=" + route);

        }
        
        // Get the route configuration
        const routeConfig = routes[route];
        
        // If route doesn't exist, show 404 page
        if (!routeConfig) {
            const display404 = await routes['404'].loadModule();
            display404();
            return;
        }
        
        // Authentication check
        if (routeConfig.requiresAuth && !isAuthenticated()) {
            console.log('Access denied. Redirecting to login...');
            window.location.hash = DEFAULT_UNAUTH_ROUTE;
            return;
        }
        
        // If user is already authenticated and tries to access a non-auth route (like login)
        if (!routeConfig.requiresAuth && isAuthenticated() && route === DEFAULT_UNAUTH_ROUTE) {
            console.log('Already logged in. Redirecting to home...');
            window.location.hash = DEFAULT_AUTH_ROUTE;
            return;
        }
        
        // Dynamically load the module and display the page
        const displayFunction = await routeConfig.loadModule();
        displayFunction();
        
        // Only append header and sidebar for authenticated routes that aren't 404
        if (isAuthenticated() && route !== '404') {
            appendHeader();
            appendSideBar();
        }
    } catch (error) {
        console.error('Navigation error:', error);
        // Handle navigation errors
    } finally {
        // Hide loading indicator
        document.body.classList.remove('loading');
    }
}

async function loadPage() {
    await navigate(location.hash.substring(1));
}

// Add event listeners
window.addEventListener("hashchange", loadPage);
window.addEventListener("DOMContentLoaded", loadPage);
// import displayHome from "./home/home.js";
// import displayLogin from "./login/login.js";
// import displayProfile from "./profile/profile.js";
// import displayGame1 from "./game-1/game.js";
// import displayGame2 from "./game-2/game.js";
// import displayFriends from "./friends/friends.js";
// import display404 from "./404/404.js"; // Uncomment this
// import { getCookieValue, isAuthenticated } from "./auth.js";

// // CSS loader function
// function loadCSS(filename) {
//     const cssLink = document.createElement("link");
//     cssLink.rel = "stylesheet";
//     cssLink.href = filename;
//     document.head.appendChild(cssLink);
// }

// // Load all CSS files
// function loadAllCSS() {
//     const cssFiles = [
//         "./friends/friends.css",
//         "./game-1/game.css",
//         "./game-2/game.css",
//         "./home/home.css",
//         "./login/login.css",
//         "./profile/profile.css",
//         "./404/404.css",
//         "./styles.css"
//     ];
    
//     cssFiles.forEach(file => loadCSS(file));
// }

// // Load CSS on initial load
// loadAllCSS();

// // Define route configurations for better scalability
// const routes = {
//     'home': {
//         display: displayHome,
//         requiresAuth: true
//     },
//     'login': {
//         display: displayLogin,
//         requiresAuth: false
//     },
//     'profile': {
//         display: displayProfile,
//         requiresAuth: true
//     },
//     'game-1': {
//         display: displayGame1,
//         requiresAuth: true
//     },
//     'game-2': {
//         display: displayGame2,
//         requiresAuth: true
//     },
//     'friends': {
//         display: displayFriends,
//         requiresAuth: true
//     },
//     '404': {
//         display: display404,
//         requiresAuth: false
//     }
// };

// // Default routes
// const DEFAULT_AUTH_ROUTE = 'home';
// const DEFAULT_UNAUTH_ROUTE = 'login';

// function appendSideBar() {
//     const sidebar = document.getElementsByClassName("left-sidebar")[0];
    
//     if (sidebar) {
//         sidebar.innerHTML = `
//             <nav class="side-nav">
//                 <a href="#home" data-tooltip="Home"><i class="fas fa-home"></i></a>
//                 <a href="#game-1" data-tooltip="Ping Pong Game"><i class="fas fa-table-tennis"></i></a>
//                 <a href="#game-2" data-tooltip="Tic Tac Toe Game"><i class="fas fa-th"></i></a>
//                 <a href="#profile" data-tooltip="Profile & Settings"><i class="fas fa-user-cog"></i></a>
//                 <a href="#friends" data-tooltip="Friends"><i class="fas fa-users"></i></a>
//             </nav>
//             <!-- Logout container at the bottom -->
//             <div class="logout-container">
//                 <a href="#" data-tooltip="Logout" class="logout" id="logout-btn"><i class="fas fa-sign-out-alt"></i></a>
//             </div>
//         `;

//         // Add logout functionality
//         document.getElementById('logout-btn').addEventListener('click', async (e) => {
//             e.preventDefault();

//             try {
//                 // Get the token to include in authorization header
//                 const token = getCookieValue('access_token');
                
//                 // Call the backend logout endpoint
//                 const response = await fetch('http://127.0.0.1:8000/api/logout/', {
//                     method: 'GET',
//                     credentials: 'include',
//                     headers: {
//                         'Authorization': `Bearer ${token}`,
//                         'Content-Type': 'application/json'
//                     }
//                 });
                
//                 if (response.ok) {
//                     console.log('Successfully logged out on server');
//                     window.location.hash = DEFAULT_UNAUTH_ROUTE;
//                 } else {
//                     console.error('Server logout failed:', await response.text());
//                 }
//             } catch (error) {
//                 console.error('Error during logout:', error);
//                 // If server logout fails, redirect to login anyway
//                 window.location.hash = DEFAULT_UNAUTH_ROUTE;
//             }
//         });
//     }
// }

// function appendHeader() {
//     const header = document.getElementsByClassName("header")[0];
    
//     if (header) {
//         header.innerHTML = `
//             <div class="logo">ROGUE</div>
//             <div class="search-bar">
//                 <i class="fa-solid fa-magnifying-glass"></i>
//                 <input type="text" placeholder="Search...">
//             </div>
//             <div class="user-controls">
//                 <div class="notification">
//                     <i class="fa-solid fa-bell"></i>
//                     <div class="indicator"></div>
//                 </div>
//                 <div class="profile">
//                     <img src="./resources/adadoun.png" alt="Player Avatar">
//                 </div>
//             </div>
//         `;
//     }
// }

// // Main navigation function
// export function navigate(route) {
//     // If no route is provided, check authentication status and redirect accordingly
//     if (!route) {
//         route = isAuthenticated() ? DEFAULT_AUTH_ROUTE : DEFAULT_UNAUTH_ROUTE;
//     }
    
//     // Get the route configuration
//     const routeConfig = routes[route];
    
//     // If route doesn't exist, show 404 page
//     if (!routeConfig) {
//         routes['404'].display();
//         return;
//     }
    
//     // Authentication check
//     if (routeConfig.requiresAuth && !isAuthenticated()) {
//         console.log('Access denied. Redirecting to login...');
//         window.location.hash = DEFAULT_UNAUTH_ROUTE;
//         return;
//     }
    
//     // If user is already authenticated and tries to access a non-auth route (like login)
//     if (!routeConfig.requiresAuth && isAuthenticated() && route === DEFAULT_UNAUTH_ROUTE) {
//         console.log('Already logged in. Redirecting to home...');
//         window.location.hash = DEFAULT_AUTH_ROUTE;
//         return;
//     }
    
//     // Display the requested page
//     routeConfig.display();
    
//     // Only append header and sidebar for authenticated routes
//     if (routeConfig.requiresAuth) {
//         appendHeader();
//         appendSideBar();
//     }
// }

// function loadPage() {
//     navigate(location.hash.substring(1));
// }

// // Add event listeners
// window.addEventListener("hashchange", loadPage);
// window.addEventListener("DOMContentLoaded", loadPage);



// import { getCookieValue, isAuthenticated } from "./auth.js";

// // Only import the modules when needed
// let homeModule, loginModule, profileModule, game1Module, game2Module, friendsModule;

// // Function to dynamically load CSS only when needed
// function loadCSS(filename) {
//     // Check if this CSS is already loaded
//     const existingLinks = document.querySelectorAll('link[rel="stylesheet"]');
//     for (let link of existingLinks) {
//         if (link.getAttribute('href') === filename) {
//             return; // Already loaded
//         }
//     }
    
//     const cssLink = document.createElement("link");
//     cssLink.rel = "stylesheet";
//     document.head.appendChild(cssLink);
//     cssLink.href = filename;
// }

// // Only load common CSS files at the beginning
// loadCSS("./styles.css");

// function appendSideBar() {
//     let side = document.getElementsByClassName("left-sidebar");
//     if (side && side.length > 0) {
//         side[0].innerHTML = `
//             <nav class="side-nav">
//                 <a href="#home" data-tooltip="Home"><i class="fas fa-home"></i></a>
//                 <a href="#game-1" data-tooltip="Ping Pong Game"><i class="fas fa-table-tennis"></i></a>
//                 <a href="#game-2" data-tooltip="Tic Tac Toe Game"><i class="fas fa-th"></i></a>
//                 <a href="#profile" data-tooltip="Profile & Settings"><i class="fas fa-user-cog"></i></a>
//                 <a href="#friends" data-tooltip="Friends"><i class="fas fa-users"></i></a>
//             </nav>
//             <!-- Logout container at the bottom -->
//             <div class="logout-container">
//                 <a href="#" data-tooltip="Logout" class="logout" id="logout-btn"><i class="fas fa-sign-out-alt"></i></a>
//             </div>
//         `;

//         // Add logout functionality
//         document.getElementById('logout-btn').addEventListener('click', async (e) => {
//             e.preventDefault();

//             try {
//                 // Get the token to include in authorization header
//                 const token = getCookieValue('access_token');
                
//                 // Call the backend logout endpoint
//                 const response = await fetch('http://127.0.0.1:8000/api/logout/', {
//                     method: 'GET',
//                     credentials: 'include',
//                     headers: {
//                         'Authorization': `Bearer ${token}`,
//                         'Content-Type': 'application/json'
//                     }
//                 });
                
//                 if (response.ok) {
//                     console.log('Successfully logged out on server');
//                     // Clear cookies or local storage
//                     document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
//                     window.location.hash = 'login';
//                 } else {
//                     console.error('Server logout failed:', await response.text());
//                 }
//             } catch (error) {
//                 console.error('Error during logout:', error);
//                 // document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
//                 window.location.hash = 'login';
//             }
//         });
//     }
// }

// function appendHeader() {
//     let side = document.getElementsByClassName("header");
//     if (side && side.length > 0) {
//         side[0].innerHTML = `
//             <div class="logo">ROGUE</div>
//             <div class="search-bar">
//                 <i class="fa-solid fa-magnifying-glass"></i>
//                 <input type="text" placeholder="Search...">
//             </div>
//             <div class="user-controls">
//                 <div class="notification">
//                     <i class="fa-solid fa-bell"></i>
//                     <div class="indicator"></div>
//                 </div>
//                 <div class="profile">
//                     <img src="./resources/adadoun.png" alt="Player Avatar">
//                 </div>
//             </div>
//         `;
//     }
// }

// // Define which routes require authentication
// const protectedRoutes = ['home', 'game-1', 'game-2', 'friends', 'profile'];
// const publicRoutes = ['login'];

// // Dynamically import modules when needed
// async function loadModules(route) {
//     if (route === 'login' || !route) {
//         if (!loginModule) {
//             loadCSS("./login/login.css");
//             loginModule = await import("./login/login.js");
//         }
//         return;
//     }
    
//     // Only load protected modules if authenticated
//     if (isAuthenticated()) {
//         switch (route) {
//             case "home":
//                 if (!homeModule) {
//                     loadCSS("./home/home.css");
//                     homeModule = await import("./home/home.js");
//                 }
//                 break;
//             case "profile":
//                 if (!profileModule) {
//                     loadCSS("./profile/profile.css");
//                     profileModule = await import("./profile/profile.js");
//                 }
//                 break;
//             case "game-1":
//                 if (!game1Module) {
//                     loadCSS("./game-1/game.css");
//                     game1Module = await import("./game-1/game.js");
//                 }
//                 break;
//             case "game-2":
//                 if (!game2Module) {
//                     loadCSS("./game-2/game.css");
//                     game2Module = await import("./game-2/game.js");
//                 }
//                 break;
//             case "friends":
//                 if (!friendsModule) {
//                     loadCSS("./friends/friends.css");
//                     friendsModule = await import("./friends/friends.js");
//                 }
//                 break;
//         }
//     }
// }

// export async function navigate(route) {
//     // Default to login if no route is provided
//     if (!route) route = "login";
    
//     // Check if the requested route requires authentication
//     const requiresAuth = protectedRoutes.includes(route);
//     const isPublic = publicRoutes.includes(route);
    
//     // If route requires auth and user is not authenticated, redirect to login
//     if (requiresAuth && !isAuthenticated()) {
//         console.log('Access denied. Redirecting to login...');
//         window.location.hash = 'login';
//         return;
//     }
    
//     // If user is already authenticated and tries to access login, redirect to home
//     if (isPublic && isAuthenticated()) {
//         console.log('Already logged in. Redirecting to home...');
//         window.location.hash = 'home';
//         return;
//     }
    
//     // Dynamically load necessary modules
//     await loadModules(route);
    
//     // If we've passed the auth checks, proceed with rendering the requested route
//     switch (route) {
//         case "home":
//             homeModule.default();
//             break;
//         case "login":
//             loginModule.default();
//             break;
//         case "profile":
//             profileModule.default();
//             break;
//         case "game-1":
//             game1Module.default();
//             break;
//         case "game-2":
//             game2Module.default();
//             break;
//         case "friends":
//             friendsModule.default();
//             break;
//         default:
//             if (isAuthenticated()) {
//                 await loadModules("home");
//                 homeModule.default();
//             } else {
//                 loginModule.default();
//             }
//             break;
//     }
    
//     // Only append header and sidebar for authenticated routes
//     if (route !== "login" && isAuthenticated()) {
//         appendHeader();
//         appendSideBar();
//     }
// }

// async function loadPage() {
//     await navigate(location.hash.substring(1));
// }

// // Add event listeners
// window.addEventListener("hashchange", loadPage);
// window.addEventListener("DOMContentLoaded", loadPage);
// // import displayHome from "./home/home.js";
// // import displayLogin from "./login/login.js";
// // import displayProfile from "./profile/profile.js";
// // import displayGame1 from "./game-1/game.js";
// // import displayGame2 from "./game-2/game.js";
// // import displayFriends from "./friends/friends.js";
// // // import display404 from "./404/404.js";
// // import { getCookieValue, isAuthenticated } from "./auth.js";

// // function loadCSS(filename) {
// //     const cssLink = document.createElement("link");
// //     cssLink.rel = "stylesheet";
// //     document.head.appendChild(cssLink);
// //     cssLink.href = filename;
// // }

// // // load all css files
// // loadCSS("./friends/friends.css");
// // loadCSS("./game-1/game.css");
// // loadCSS("./game-2/game.css");
// // loadCSS("./home/home.css");
// // loadCSS("./login/login.css");
// // loadCSS("./profile/profile.css");
// // loadCSS("./404/404.css");
// // loadCSS("./styles.css");

// // function appendSideBar() {
// //     let side = document.getElementsByClassName("left-sidebar");
// //     if (side) {
// //         side[0].innerHTML = `
// //             <nav class="side-nav">
// //                 <a href="#home" data-tooltip="Home"><i class="fas fa-home"></i></a>
// //                 <a href="#game-1" data-tooltip="Ping Pong Game"><i class="fas fa-table-tennis"></i></a>
// //                 <a href="#game-2" data-tooltip="Tic Tac Toe Game"><i class="fas fa-th"></i></a>
// //                 <a href="#profile" data-tooltip="Profile & Settings"><i class="fas fa-user-cog"></i></a>
// //                 <a href="#friends" data-tooltip="Friends"><i class="fas fa-users"></i></a>
// //             </nav>
// //             <!-- Logout container at the bottom -->
// //             <div class="logout-container">
// //                 <a href="#" data-tooltip="Logout" class="logout" id="logout-btn"><i class="fas fa-sign-out-alt"></i></a>
// //             </div>
// //                 `

// //         // Add logout functionality
// //         document.getElementById('logout-btn').addEventListener('click', async (e) => {
// //             e.preventDefault();

// //             try {
// //                 // Get the token to include in authorization header
// //                 const token = getCookieValue('access_token');
                
// //                 // Call the backend logout endpoint
                
// //                 const response = await fetch('http://127.0.0.1:8000/api/logout/', {
// //                     method: 'GET',
// //                     credentials: 'include',
// //                     // case "profile":
// //                     //     displayProfile();
// //                     //     break;
// //                     headers: {
// //                         'Authorization': `Bearer ${token}`,
// //                         'Content-Type': 'application/json'
// //                     }
// //                 });
// //                 if (response.ok) {
// //                     console.log('Successfully logged out on server');
// //                     window.location.hash = 'login';
// //                 } else {
// //                     console.error('Server logout failed:', await response.text());
// //                 }
// //             } catch (error) {
// //                 console.error('Error during logout:', error);
// //                 // document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
// //             const token = getCookieValue('access_token');
            
// //             }
// //     }
// //      );
// //     }
// // }

// // function appendHeader() {
// //     let side = document.getElementsByClassName("header");
// //     if (side) {
// //             side[0].innerHTML = `
// //                 <div class="logo">ROGUE</div>
// //                 <div class="search-bar">
// //                     <i class="fa-solid fa-magnifying-glass"></i>
// //                     <input type="text" placeholder="Search...">
// //                 </div>
// //                 <div class="user-controls">
// //                     <div class="notification">
// //                         <i class="fa-solid fa-bell"></i>
// //                         <div class="indicator"></div>
// //                     </div>
// //                     <div class="profile">
// //                         <img src="./resources/adadoun.png" alt="Player Avatar">
// //                     </div>
// //                 </div>
// //             `
// //     }
// // }

// // // Check if user is authenticated

// // // Define which routes require authentication
// // const protectedRoutes = ['home', 'game-1', 'game-2', 'friends', 'profile'];
// // const publicRoutes = ['login'];

// // export function navigate(route) {
// //     // Default to login if no route is provided
// //     if (!route) route = "login";
    
// //     // Check if the requested route requires authentication
// //     const requiresAuth = protectedRoutes.includes(route);
// //     const isPublic = publicRoutes.includes(route);
    
// //     // If route requires auth and user is not authenticated, redirect to login
// //     if (requiresAuth && !isAuthenticated()) {
// //         console.log('Access denied. Redirecting to login...');
// //         window.location.hash = 'login';
// //         return;
// //     }
    
// //     // If user is already authenticated and tries to access login, redirect to home
// //     if (isPublic && isAuthenticated()) {
// //         console.log('Already logged in. Redirecting to home...');
// //         window.location.hash = 'home';
// //         return;
// //     }
    
// //     // If we've passed the auth checks, proceed with rendering the requested route
// //     switch (route) {
// //         case "home":
// //             displayHome();
// //             break;
// //         case "login":
// //             displayLogin();
// //             break;
// //         case "profile":
// //             displayProfile();
// //             break;
// //         case "game-1":
// //             displayGame1();
// //             break;
// //         case "game-2":
// //             displayGame2();
// //             break;
// //         case "friends":
// //             displayFriends();
// //             break;
// //         // case "404":
// //         //     display404();
// //         //         break;
// //         default:
// //             if (isAuthenticated()) {
// //                 displayHome();
// //             } else {
// //                 displayLogin();
// //             }
// //             break;
// //     }
    
// //     // Only append header and sidebar for authenticated routes
// //     if (route !== "login") {
// //         appendHeader();
// //         appendSideBar();
// //     }
// // }

// // function loadPage() {
// //     navigate(location.hash.substring(1));
// // }

// // // Add event listeners
// // window.addEventListener("hashchange", loadPage);
// // window.addEventListener("DOMContentLoaded", loadPage);

// // import displayHome from "./home/home.js";
// // import displayLogin from "./login/login.js";
// // // import displayProfile from "./profile/profile.js";
// // import displayGame1 from "./game-1/game.js";
// // import displayGame2 from "./game-2/game.js";
// // import displayFriends from "./friends/friends.js";

// // function loadCSS(filename) {
// //     const cssLink = document.createElement("link");
// //     cssLink.rel = "stylesheet";
// //     document.head.appendChild(cssLink);
// //     cssLink.href = filename;
// // }

// // // load all css files
// // loadCSS("./friends/friends.css");
// // loadCSS("./game-1/game.css");
// // loadCSS("./game-2/game.css");
// // loadCSS("./home/home.css");
// // loadCSS("./login/login.css");
// // // loadCSS("./profile/profile.css");
// // loadCSS("./styles.css");

// // function appendSideBar() {
// //     let side = document.getElementsByClassName("left-sidebar");
// //     if (side) {
// //         side[0].innerHTML = `
// //             <nav class="side-nav">
// //                 <a href="#home" data-tooltip="Home"><i class="fas fa-home"></i></a>
// //                 <a href="#game-1" data-tooltip="Ping Pong Game"><i class="fas fa-table-tennis"></i></a>
// //                 <a href="#game-2" data-tooltip="Tic Tac Toe Game"><i class="fas fa-th"></i></a>
// //                 <a href="#profile" data-tooltip="Profile & Settings"><i class="fas fa-user-cog"></i></a>
// //                 <a href="#friends" data-tooltip="Friends"><i class="fas fa-users"></i></a>
// //             </nav>
// //             <!-- Logout container at the bottom -->
// //             <div class="logout-container">
// //                 <a href="#" data-tooltip="Logout" class="logout"><i class="fas fa-sign-out-alt"></i></a>
// //             </div>
// //                 `
// //          // Add logout functionality
// //         document.getElementById('logout-btn').addEventListener('click', (e) => {
// //             e.preventDefault();
// //             localStorage.removeItem('access_token');
// //             console.log("Logout");
// //             window.location.hash = 'login';
// //         });
// //     }
// // }

// // function appendHeader() {
// //     let side = document.getElementsByClassName("header");
// //     if (side) {
// //         side[0].innerHTML = `
// //                 <div class="logo">ROGUE</div>
// //                 <div class="search-bar">
// //                     <i class="fa-solid fa-magnifying-glass"></i>
// //                     <input type="text" placeholder="Search...">
// //                 </div>
// //                 <div class="user-controls">
// //                     <div class="notification">
// //                         <i class="fa-solid fa-bell"></i>
// //                         <div class="indicator"></div>
// //                     </div>
// //                     <div class="profile">
// //                         <img src="./resources/adadoun.png" alt="Player Avatar">
// //                     </div>
// //                 </div>
// //             `
// //     }
// // }

// // function isAuthenticated() {
// //     return localStorage.getItem('access_token') !== null;
// // }

// // export function navigate(route) {
// //     if (!route) route = "login";
// //     switch (route) {
// //         case "home":
// //             displayHome();
// //             break;
// //         case "contact":
// //             displayContact();
// //             break;
// //         case "login":
// //             displayLogin();
// //             break;
// //         // case "profile":
// //         //     displayProfile();
// //             // break;
// //         case "game-1":
// //             displayGame1();
// //             break;
// //         case "game-2":
// //             displayGame2();
// //             break;
// //         case "friends":
// //             displayFriends();
// //             break;
// //         default:
// //             displayLogin();
// //             break;
// //     }
// //     if (route !== "login"){
// //     appendHeader();
// //     appendSideBar();
// //     }
// // }

// // function loadPage() {
// //     navigate(location.hash.substring(1));
// // }

// // window.addEventListener("hashchange", loadPage);
// // window.addEventListener("DOMContentLoaded", loadPage);