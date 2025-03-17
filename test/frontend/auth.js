export function isAuthenticated() {
    const token = getCookieValue('access_token');
    return !!token;
}

export function getToken() {
    return localStorage.getItem('accessToken');
}

export function setToken(token) {
    localStorage.setItem('accessToken', token);
}

export function clearToken() {
    localStorage.removeItem('accessToken');
}

export function logoutUser() {
    clearToken();

    window.location.hash = 'login';
}

export function getCookieValue(name) {
    const cookies = document.cookie.split(";");
    
    for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.split('=');
        
        if (cookieName.trim() === name) {
            console.log('cookie Found');
            return cookieValue;
        }
    }
    return null;
}