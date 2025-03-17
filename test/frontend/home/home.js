const app = document.getElementById("app");

function displayHome() {
    app.innerHTML = `
    <section class="home">
    <!-- HEADER CONTAINER -->
    <header class="header"></header>    
    <!-- MAIN CONTAINER WITH SIDEBAR AND CONTENT -->
        <div class="main-container">

            <!-- 2. LEFT SIDEBAR -->
            <div class="left-sidebar"></div>

            <!-- 3. MAIN CONTENT AREA -->
            <div class="content">
                home page
            </div>

        </div>

    </section>
    `;
    document.title = 'Home';
    // Move the event handlers here, AFTER the HTML has been added to the DOM
}


export default displayHome;
