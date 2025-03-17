const app = document.getElementById("app");

function displayGame2() {
    app.innerHTML = `
    <section class="game-2">
        <!-- HEADER CONTAINER -->
        <header class="header"></header>
        <!-- MAIN CONTAINER WITH SIDEBAR AND CONTENT -->
        <div class="main-container">

            <!-- 2. LEFT SIDEBAR -->
            <div class="left-sidebar"></div>

            <!-- 3. MAIN CONTENT AREA -->
            <div class="content">
                <!-- Navigation Buttons -->
                game 2 page
            </div>

        </div>
    </section>
    `;
    document.title = 'Game 2';
    // Move the event handlers here, AFTER the HTML has been added to the DOM
}


export default displayGame2;
