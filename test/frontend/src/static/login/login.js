const app = document.getElementById("app");

const template = `
<div class="auth-container">
<div class="signup-side">
    <h2>Hello Pixel</h2>
    <p>Create an account and start your game</p>
    <button class="signup-btn">Sign Up</button>
</div>
<div class="signin-side">
    <form id="signin-form" class="form-container">
        <input type="email" id="signin-email" placeholder="Email" required>
        <input type="password" id="signin-password" placeholder="Password" required>
        <button type="submit" class="submit-btn" disabled>Sign In</button>
        <div class="error-message">User not found!</div>
        <div class="alternative-signup">
            <button type="button" class="alternative-btn google-btn">Google</button>
            <button type="button" class="alternative-btn intra-btn">42 Intra</button>
        </div>
    </form>
    <form id="signup-form" class="form-container hidden">
        <input type="text" id="fullname" placeholder="Full Name" required>
        <input type="text" id="username" placeholder="Username" required>
        <input type="email" id="email" placeholder="Email" required>
        <input type="password" id="password" placeholder="Password" required>
        <button type="submit" class="submit-btn" disabled>Create Account</button>
        <div class="alternative-signup">
            <button type="button" class="alternative-btn google-btn">Google</button>
            <button type="button" class="alternative-btn intra-btn">42 Intra</button>
        </div>
    </form>
</div>
</div>
`;

function setupLogin() {
    const container = document.querySelector('.auth-container');
    const signupBtn = document.querySelector('.signup-btn');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const errorMessage = document.querySelector('.error-message');

    // Toggle between sign in and sign up
    signupBtn.addEventListener('click', () => {
        container.classList.toggle('swap');
        signinForm.classList.toggle('hidden');
        signupForm.classList.toggle('hidden');
        // Change button text
        signupBtn.textContent = signupBtn.textContent === 'Sign Up' ? 'Sign In' : 'Sign Up';
    });
    
    // Form validation for signin
    const signinEmail = document.getElementById('signin-email');
    const signinPassword = document.getElementById('signin-password');
    const signinSubmitBtn = signinForm.querySelector('.submit-btn');
    
    function validateSigninForm() {
        const isValid = signinEmail.value.trim() !== '' && signinPassword.value.trim() !== '';
        signinSubmitBtn.disabled = !isValid;
    }
    
    [signinEmail, signinPassword].forEach(input => {
        input.addEventListener('input', validateSigninForm);
    });
    // Form validation for signup
    const signupInputs = signupForm.querySelectorAll('input');
    const signupSubmitBtn = signupForm.querySelector('.submit-btn');
    
    function validateSignupForm() {
        const isValid = Array.from(signupInputs).every(input => input.value.trim() !== '');
        signupSubmitBtn.disabled = !isValid;
    }
    
    signupInputs.forEach(input => {
        input.addEventListener('input', validateSignupForm);
    });
    
    // Function to send data



    function getCookieValue(name) {
        const cookies = document.cookie.split(";");
        console.log("Cookies after split:", cookies);
        
        for (const cookie of cookies) {
            const [cookieName, cookieValue] = cookie.split('=');
            console.log("cookieValue", cookieValue);
            
            if (cookieName.trim() === name) {
                console.log("Found cookie value:", cookieValue);
                return cookieValue;
            }
        }
        return null; // Return null if the cookie is not found
    }

    async function sendData(url, data) {
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/${url}/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            console.log(data);
            
            const result = await response.json();
            if (!response.ok) {
                throw new Error('Ensure that you\'ve entered the correct username or email address.');
            }
            return { ok: response.ok, ...result };
        } catch (error) {
            // console.error('Error:', error);
            return { ok: false, detail: '' };
        }
    }
    
    // Form submission handlers
    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userData = {
            email: signinEmail.value.trim(),
            password: signinPassword.value.trim()
        };
        
        const result = await sendData('login', userData);
        console.log("signin response:", result);
        // if (result.ok) {
        //     setTimeout(() => {
        //         window.location.hash = 'home';
        //     }, 100);
        if (result.ok) {
            setTimeout(() => {
                console.log("Before navigation, access_token exists:", getCookieValue('access_token') !== null);
                window.location.hash = 'home';
            }, 250);
            // window.location.hash = 'home';
            // alert('Login successful!');
        } else {
            errorMessage.textContent = result.detail || 'Invalid credentials!';
            errorMessage.style.display = 'block';
        }
    });
    
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userData = {
            full_name: document.getElementById('fullname').value.trim(),
            username: document.getElementById('username').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value.trim(),
        };
        
        const result = await sendData('signup', userData);
        console.log("signup response:", result);
        if (result.ok) {
            errorMessage.style.display = 'none';
            window.location.hash = 'home';
            // alert('Account created successfully!');
        } else {
            errorMessage.textContent = result.detail || 'Invalid credentials!';
            errorMessage.style.display = 'block';
        }
    });
    
    // 42 intra
    async function handleIntraAuth() {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/oauth2/authorize');
            
            // if (!response.ok) {
            //     throw new Error('Failed to get authorization URL');
            // }
            
            const data = await response.json();
            console.log('Authorization URL:', data.url);
            
            window.location.href = data.url;
            
            
        } catch (error) {
            console.error('Intra authentication error:', error);
            errorMessage.textContent = 'Failed to connect to 42 Intra. Please try again later.';
            errorMessage.style.display = 'block';
        }
    }
    const authIntra = document.querySelector('.alternative-btn.intra-btn');

    authIntra.addEventListener('click', (e) => {
        e.preventDefault();
        handleIntraAuth();
    });
}

function displayAuth() {
    // document.getElementById("header").style.visibility = "hidden";
    app.innerHTML = template;
    document.title = 'Login';
    setupLogin();
}

export default displayAuth;