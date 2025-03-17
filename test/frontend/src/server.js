const express = require("express");
const path = require("path");
const app = express();
const port = 80;


app.use("/static",express.static(path.join(__dirname, "static")));

// react router acts the same updating ui with 404 on client side while the req.status is still 200 OK
// I handled when requesting static file directly resuling in 404 status
//	but when switching tabs it will render 200 with 404 content
// this will do for now
app.get("*", (req, res) => {
	if (req.url.startsWith("/static"))
		res.status(404)
	res.sendFile(path.join(__dirname, "/", "static/index.html"));
});

app.listen(port, () => {
	console.log(`Server running on port this ${port}`);
});
