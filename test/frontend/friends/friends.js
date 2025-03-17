const app = document.getElementById("app");

function displayFriends() {
    app.innerHTML = `
    <section class="friends">
        <!-- HEADER CONTAINER -->
        <header class="header"></header>      
        <!-- MAIN CONTAINER WITH SIDEBAR AND CONTENT -->
        <div class="main-container">

            <!-- 2. LEFT SIDEBAR -->
            <div class="left-sidebar"></div>

            <!-- 3. MAIN CONTENT AREA -->
            <div class="content">
                <!-- Navigation Buttons -->
                friends page
            </div>

        </div>
    </section>
    `;
    document.title = 'Friends';
    // Move the event handlers here, AFTER the HTML has been added to the DOM
}


export default displayFriends;
